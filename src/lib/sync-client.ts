"use client"

import { io, Socket } from "socket.io-client"
import { SyncEvent } from "./websocket"

export interface SyncState {
  isConnected: boolean
  isOnline: boolean
  lastSyncTimestamp: number
  pendingChanges: PendingChange[]
  isSyncing: boolean
}

export interface PendingChange {
  id: string
  type: "create" | "update" | "delete"
  entity: "task" | "project" | "context" | "area" | "inbox"
  entityId: string
  data: any
  timestamp: number
  retryCount: number
}

class SyncClient {
  private socket: Socket | null = null
  private state: SyncState = {
    isConnected: false,
    isOnline: navigator.onLine,
    lastSyncTimestamp: 0,
    pendingChanges: [],
    isSyncing: false
  }
  private listeners: ((state: SyncState) => void)[] = []
  private eventListeners: ((event: SyncEvent) => void)[] = []
  private sessionToken: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    // Load state from localStorage
    this.loadState()

    // Listen for online/offline events
    window.addEventListener("online", this.handleOnline.bind(this))
    window.addEventListener("offline", this.handleOffline.bind(this))

    // Auto-save state periodically
    setInterval(() => {
      this.saveState()
    }, 5000)
  }

  initialize(sessionToken: string) {
    this.sessionToken = sessionToken
    this.connect()
  }

  private connect() {
    if (this.socket?.connected) return

    this.socket = io({
      path: "/api/socket",
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000
    })

    this.socket.on("connect", () => {
      console.log("WebSocket connected")
      this.reconnectAttempts = 0
      
      if (this.sessionToken) {
        this.socket?.emit("authenticate", this.sessionToken)
      }
    })

    this.socket.on("authenticated", (data) => {
      console.log("WebSocket authenticated:", data)
      this.updateState({ isConnected: true })
      this.startHeartbeat()
      this.requestSync()
      this.processPendingChanges()
    })

    this.socket.on("auth_error", (error) => {
      console.error("WebSocket auth error:", error)
      this.updateState({ isConnected: false })
    })

    this.socket.on("sync_data", (data) => {
      console.log("Received sync data:", data)
      this.handleSyncData(data)
    })

    this.socket.on("sync_event", (event: SyncEvent) => {
      console.log("Received sync event:", event)
      this.handleSyncEvent(event)
    })

    this.socket.on("sync_error", (error) => {
      console.error("Sync error:", error)
      this.updateState({ isSyncing: false })
    })

    this.socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason)
      this.updateState({ isConnected: false })
      this.stopHeartbeat()

      if (reason === "io server disconnect") {
        // Server initiated disconnect, try to reconnect
        setTimeout(() => this.connect(), 1000)
      }
    })

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log("Max reconnection attempts reached")
        this.updateState({ isConnected: false })
      }
    })

    this.socket.connect()
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("heartbeat")
      }
    }, 30000) // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private handleOnline() {
    console.log("Device came online")
    this.updateState({ isOnline: true })
    
    if (!this.socket?.connected) {
      this.connect()
    } else {
      this.requestSync()
      this.processPendingChanges()
    }
  }

  private handleOffline() {
    console.log("Device went offline")
    this.updateState({ isOnline: false })
  }

  private requestSync() {
    if (!this.socket?.connected || this.state.isSyncing) return

    this.updateState({ isSyncing: true })
    this.socket.emit("sync_request", this.state.lastSyncTimestamp)
  }

  private handleSyncData(data: any) {
    console.log("Processing sync data:", data)
    
    // Update last sync timestamp
    this.updateState({ 
      lastSyncTimestamp: data.timestamp,
      isSyncing: false 
    })

    // Notify listeners about the sync data
    this.eventListeners.forEach(listener => {
      if (data.changes.tasks?.length > 0) {
        data.changes.tasks.forEach((task: any) => {
          listener({
            type: "task_updated",
            entityId: task.id,
            tenantId: task.tenantId,
            userId: task.userId,
            data: task,
            timestamp: data.timestamp
          })
        })
      }

      if (data.changes.projects?.length > 0) {
        data.changes.projects.forEach((project: any) => {
          listener({
            type: "project_updated",
            entityId: project.id,
            tenantId: project.tenantId,
            userId: project.userId,
            data: project,
            timestamp: data.timestamp
          })
        })
      }

      // Handle other entity types...
    })
  }

  private handleSyncEvent(event: SyncEvent) {
    // Notify all event listeners
    this.eventListeners.forEach(listener => listener(event))
  }

  addPendingChange(change: Omit<PendingChange, "id" | "timestamp" | "retryCount">) {
    const pendingChange: PendingChange = {
      ...change,
      id: `${change.entity}_${change.entityId}_${Date.now()}`,
      timestamp: Date.now(),
      retryCount: 0
    }

    this.state.pendingChanges.push(pendingChange)
    this.saveState()

    // Try to process immediately if online and connected
    if (this.state.isOnline && this.state.isConnected) {
      this.processPendingChanges()
    }
  }

  private async processPendingChanges() {
    if (!this.state.isOnline || !this.state.isConnected || this.state.pendingChanges.length === 0) {
      return
    }

    console.log(`Processing ${this.state.pendingChanges.length} pending changes`)

    const changesToProcess = [...this.state.pendingChanges]
    const processedChanges: string[] = []

    for (const change of changesToProcess) {
      try {
        await this.syncChange(change)
        processedChanges.push(change.id)
      } catch (error) {
        console.error("Failed to sync change:", error)
        change.retryCount++
        
        // Remove changes that have failed too many times
        if (change.retryCount >= 3) {
          processedChanges.push(change.id)
          console.log("Removing failed change after 3 attempts:", change)
        }
      }
    }

    // Remove processed changes
    this.state.pendingChanges = this.state.pendingChanges.filter(
      change => !processedChanges.includes(change.id)
    )

    this.saveState()
  }

  private async syncChange(change: PendingChange): Promise<void> {
    const endpoint = this.getEndpointForChange(change)
    const method = this.getMethodForChange(change)

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: change.type === "delete" ? undefined : JSON.stringify(change.data)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    console.log(`Successfully synced change: ${change.type} ${change.entity} ${change.entityId}`)
  }

  private getEndpointForChange(change: PendingChange): string {
    const baseUrl = `/api/${change.entity}s`
    
    switch (change.type) {
      case "create":
        return baseUrl
      case "update":
      case "delete":
        return `${baseUrl}/${change.entityId}`
      default:
        throw new Error(`Unknown change type: ${change.type}`)
    }
  }

  private getMethodForChange(change: PendingChange): string {
    switch (change.type) {
      case "create":
        return "POST"
      case "update":
        return "PUT"
      case "delete":
        return "DELETE"
      default:
        throw new Error(`Unknown change type: ${change.type}`)
    }
  }

  private updateState(updates: Partial<SyncState>) {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }

  private saveState() {
    try {
      localStorage.setItem("sync_state", JSON.stringify({
        lastSyncTimestamp: this.state.lastSyncTimestamp,
        pendingChanges: this.state.pendingChanges
      }))
    } catch (error) {
      console.error("Failed to save sync state:", error)
    }
  }

  private loadState() {
    try {
      const saved = localStorage.getItem("sync_state")
      if (saved) {
        const parsed = JSON.parse(saved)
        this.state.lastSyncTimestamp = parsed.lastSyncTimestamp || 0
        this.state.pendingChanges = parsed.pendingChanges || []
      }
    } catch (error) {
      console.error("Failed to load sync state:", error)
    }
  }

  // Public API
  getState(): SyncState {
    return { ...this.state }
  }

  onStateChange(listener: (state: SyncState) => void) {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  onSyncEvent(listener: (event: SyncEvent) => void) {
    this.eventListeners.push(listener)
    return () => {
      const index = this.eventListeners.indexOf(listener)
      if (index > -1) {
        this.eventListeners.splice(index, 1)
      }
    }
  }

  disconnect() {
    this.stopHeartbeat()
    this.socket?.disconnect()
    this.socket = null
    this.updateState({ isConnected: false })
  }

  forceSync() {
    this.requestSync()
  }
}

export const syncClient = new SyncClient()