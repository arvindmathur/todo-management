import { Server as HTTPServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export interface SyncEvent {
  type: "task_created" | "task_updated" | "task_deleted" | "project_created" | "project_updated" | "project_deleted" | "context_created" | "context_updated" | "context_deleted" | "area_created" | "area_updated" | "area_deleted" | "inbox_created" | "inbox_updated" | "inbox_deleted"
  entityId: string
  tenantId: string
  userId: string
  data?: any
  timestamp: number
}

export interface ClientState {
  userId: string
  tenantId: string
  lastSeen: number
  deviceId: string
}

class WebSocketManager {
  private io: SocketIOServer | null = null
  private connectedClients = new Map<string, ClientState>()

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      path: "/api/socket"
    })

    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id)

      socket.on("authenticate", async (token: string) => {
        try {
          // Verify the session token
          const session = await this.verifySession(token)
          if (!session?.user?.id) {
            socket.emit("auth_error", "Invalid session")
            socket.disconnect()
            return
          }

          // Store client state
          const clientState: ClientState = {
            userId: session.user.id,
            tenantId: session.user.tenantId,
            lastSeen: Date.now(),
            deviceId: socket.handshake.headers["x-device-id"] as string || socket.id
          }

          this.connectedClients.set(socket.id, clientState)

          // Join tenant room for broadcasting
          socket.join(`tenant:${session.user.tenantId}`)
          socket.join(`user:${session.user.id}`)

          socket.emit("authenticated", { 
            userId: session.user.id,
            tenantId: session.user.tenantId 
          })

          console.log(`User ${session.user.id} authenticated on socket ${socket.id}`)
        } catch (error) {
          console.error("Authentication error:", error)
          socket.emit("auth_error", "Authentication failed")
          socket.disconnect()
        }
      })

      socket.on("sync_request", async (lastSyncTimestamp: number) => {
        const clientState = this.connectedClients.get(socket.id)
        if (!clientState) {
          socket.emit("sync_error", "Not authenticated")
          return
        }

        try {
          // Get all changes since last sync
          const changes = await this.getChangesSince(
            clientState.tenantId,
            clientState.userId,
            lastSyncTimestamp
          )

          socket.emit("sync_data", {
            changes,
            timestamp: Date.now()
          })
        } catch (error) {
          console.error("Sync request error:", error)
          socket.emit("sync_error", "Failed to fetch changes")
        }
      })

      socket.on("heartbeat", () => {
        const clientState = this.connectedClients.get(socket.id)
        if (clientState) {
          clientState.lastSeen = Date.now()
        }
        socket.emit("heartbeat_ack")
      })

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id)
        this.connectedClients.delete(socket.id)
      })
    })

    // Cleanup inactive connections
    setInterval(() => {
      const now = Date.now()
      const timeout = 30000 // 30 seconds
      const clientsToRemove: string[] = []

      this.connectedClients.forEach((clientState, socketId) => {
        if (now - clientState.lastSeen > timeout) {
          console.log(`Cleaning up inactive connection: ${socketId}`)
          clientsToRemove.push(socketId)
        }
      })

      clientsToRemove.forEach(socketId => {
        this.connectedClients.delete(socketId)
        this.io?.to(socketId).disconnectSockets()
      })
    }, 60000) // Check every minute
  }

  private async verifySession(token: string) {
    // This is a simplified session verification
    // In a real implementation, you'd verify the JWT token properly
    try {
      // For now, we'll assume the token is the session token
      // and look it up in the database
      const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        include: {
          user: {
            select: {
              id: true,
              tenantId: true,
              email: true
            }
          }
        }
      })

      if (!session || session.expires < new Date()) {
        return null
      }

      return {
        user: {
          id: session.user.id,
          tenantId: session.user.tenantId,
          email: session.user.email
        }
      }
    } catch (error) {
      console.error("Session verification error:", error)
      return null
    }
  }

  private async getChangesSince(tenantId: string, userId: string, timestamp: number) {
    const since = new Date(timestamp)

    const [tasks, projects, contexts, areas, inboxItems] = await Promise.all([
      prisma.task.findMany({
        where: {
          tenantId,
          userId,
          updatedAt: { gt: since }
        },
        include: {
          project: { select: { id: true, name: true } },
          context: { select: { id: true, name: true, icon: true } },
          area: { select: { id: true, name: true, color: true } }
        }
      }),
      prisma.project.findMany({
        where: {
          tenantId,
          userId,
          updatedAt: { gt: since }
        },
        include: {
          area: { select: { id: true, name: true } },
          tasks: { select: { id: true, status: true } }
        }
      }),
      prisma.context.findMany({
        where: {
          tenantId,
          userId,
          createdAt: { gt: since }
        }
      }),
      prisma.area.findMany({
        where: {
          tenantId,
          userId,
          createdAt: { gt: since }
        }
      }),
      prisma.inboxItem.findMany({
        where: {
          tenantId,
          userId,
          createdAt: { gt: since }
        }
      })
    ])

    return {
      tasks,
      projects,
      contexts,
      areas,
      inboxItems,
      timestamp: Date.now()
    }
  }

  broadcastToTenant(tenantId: string, event: SyncEvent) {
    if (!this.io) return

    this.io.to(`tenant:${tenantId}`).emit("sync_event", event)
    console.log(`Broadcasted ${event.type} to tenant ${tenantId}`)
  }

  broadcastToUser(userId: string, event: SyncEvent) {
    if (!this.io) return

    this.io.to(`user:${userId}`).emit("sync_event", event)
    console.log(`Broadcasted ${event.type} to user ${userId}`)
  }

  getConnectedClients(tenantId?: string, userId?: string): ClientState[] {
    const clients = Array.from(this.connectedClients.values())
    
    if (tenantId && userId) {
      return clients.filter(c => c.tenantId === tenantId && c.userId === userId)
    } else if (tenantId) {
      return clients.filter(c => c.tenantId === tenantId)
    } else if (userId) {
      return clients.filter(c => c.userId === userId)
    }
    
    return clients
  }
}

export const wsManager = new WebSocketManager()

// Helper function to broadcast sync events
export function broadcastSyncEvent(event: SyncEvent) {
  wsManager.broadcastToTenant(event.tenantId, event)
}