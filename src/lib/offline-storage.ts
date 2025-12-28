"use client"

// Offline storage utility for caching data locally
export class OfflineStorage {
  private dbName = "todo-app-offline"
  private version = 1
  private db: IDBDatabase | null = null

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores for different entity types
        if (!db.objectStoreNames.contains("tasks")) {
          const taskStore = db.createObjectStore("tasks", { keyPath: "id" })
          taskStore.createIndex("userId", "userId", { unique: false })
          taskStore.createIndex("status", "status", { unique: false })
          taskStore.createIndex("updatedAt", "updatedAt", { unique: false })
        }

        if (!db.objectStoreNames.contains("projects")) {
          const projectStore = db.createObjectStore("projects", { keyPath: "id" })
          projectStore.createIndex("userId", "userId", { unique: false })
          projectStore.createIndex("status", "status", { unique: false })
          projectStore.createIndex("updatedAt", "updatedAt", { unique: false })
        }

        if (!db.objectStoreNames.contains("contexts")) {
          const contextStore = db.createObjectStore("contexts", { keyPath: "id" })
          contextStore.createIndex("userId", "userId", { unique: false })
        }

        if (!db.objectStoreNames.contains("areas")) {
          const areaStore = db.createObjectStore("areas", { keyPath: "id" })
          areaStore.createIndex("userId", "userId", { unique: false })
        }

        if (!db.objectStoreNames.contains("inboxItems")) {
          const inboxStore = db.createObjectStore("inboxItems", { keyPath: "id" })
          inboxStore.createIndex("userId", "userId", { unique: false })
          inboxStore.createIndex("processed", "processed", { unique: false })
        }

        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" })
        }
      }
    })
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }
  }

  // Generic CRUD operations
  async store<T>(storeName: string, data: T): Promise<void> {
    await this.ensureInitialized()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async get<T>(storeName: string, id: string): Promise<T | null> {
    await this.ensureInitialized()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly")
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async getAll<T>(storeName: string, userId?: string): Promise<T[]> {
    await this.ensureInitialized()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly")
      const store = transaction.objectStore(storeName)
      
      let request: IDBRequest
      if (userId && store.indexNames.contains("userId")) {
        const index = store.index("userId")
        request = index.getAll(userId)
      } else {
        request = store.getAll()
      }

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  async delete(storeName: string, id: string): Promise<void> {
    await this.ensureInitialized()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clear(storeName: string): Promise<void> {
    await this.ensureInitialized()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Metadata operations
  async setMetadata(key: string, value: any): Promise<void> {
    await this.store("metadata", { key, value, timestamp: Date.now() })
  }

  async getMetadata(key: string): Promise<any> {
    const result = await this.get<{ key: string; value: any; timestamp: number }>("metadata", key)
    return result?.value || null
  }

  // Entity-specific operations
  async storeTasks(tasks: any[], userId: string): Promise<void> {
    const userTasks = tasks.filter(task => task.userId === userId)
    for (const task of userTasks) {
      await this.store("tasks", task)
    }
    await this.setMetadata(`tasks_last_sync_${userId}`, Date.now())
  }

  async getTasks(userId: string): Promise<any[]> {
    return this.getAll("tasks", userId)
  }

  async storeProjects(projects: any[], userId: string): Promise<void> {
    const userProjects = projects.filter(project => project.userId === userId)
    for (const project of userProjects) {
      await this.store("projects", project)
    }
    await this.setMetadata(`projects_last_sync_${userId}`, Date.now())
  }

  async getProjects(userId: string): Promise<any[]> {
    return this.getAll("projects", userId)
  }

  async storeContexts(contexts: any[], userId: string): Promise<void> {
    const userContexts = contexts.filter(context => context.userId === userId)
    for (const context of userContexts) {
      await this.store("contexts", context)
    }
    await this.setMetadata(`contexts_last_sync_${userId}`, Date.now())
  }

  async getContexts(userId: string): Promise<any[]> {
    return this.getAll("contexts", userId)
  }

  async storeAreas(areas: any[], userId: string): Promise<void> {
    const userAreas = areas.filter(area => area.userId === userId)
    for (const area of userAreas) {
      await this.store("areas", area)
    }
    await this.setMetadata(`areas_last_sync_${userId}`, Date.now())
  }

  async getAreas(userId: string): Promise<any[]> {
    return this.getAll("areas", userId)
  }

  async storeInboxItems(inboxItems: any[], userId: string): Promise<void> {
    const userInboxItems = inboxItems.filter(item => item.userId === userId)
    for (const item of userInboxItems) {
      await this.store("inboxItems", item)
    }
    await this.setMetadata(`inbox_last_sync_${userId}`, Date.now())
  }

  async getInboxItems(userId: string): Promise<any[]> {
    return this.getAll("inboxItems", userId)
  }

  // Sync helpers
  async getLastSyncTimestamp(entity: string, userId: string): Promise<number> {
    return (await this.getMetadata(`${entity}_last_sync_${userId}`)) || 0
  }

  async setLastSyncTimestamp(entity: string, userId: string, timestamp: number): Promise<void> {
    await this.setMetadata(`${entity}_last_sync_${userId}`, timestamp)
  }

  // Cleanup old data
  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - maxAge
    const stores = ["tasks", "projects", "contexts", "areas", "inboxItems"]

    for (const storeName of stores) {
      await this.ensureInitialized()
      
      const transaction = this.db!.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      
      if (store.indexNames.contains("updatedAt")) {
        const index = store.index("updatedAt")
        const range = IDBKeyRange.upperBound(new Date(cutoff))
        
        const request = index.openCursor(range)
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          }
        }
      }
    }
  }
}

export const offlineStorage = new OfflineStorage()