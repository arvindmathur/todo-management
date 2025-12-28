import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import fc from 'fast-check'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { GET, POST } from '@/app/api/tasks/route'
import { GET as getTask, PUT as updateTask, DELETE as deleteTask } from '@/app/api/tasks/[id]/route'
import { POST as completeTask } from '@/app/api/tasks/[id]/complete/route'
import { GET as searchTasks } from '@/app/api/tasks/search/route'
import { GET as getTodayTasks } from '@/app/api/tasks/today/route'
import { GET as getOverdueTasks } from '@/app/api/tasks/overdue/route'

// Mock NextAuth
jest.mock('next-auth/next')
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
    },
    context: {
      findFirst: jest.fn(),
    },
    area: {
      findFirst: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Task Management Property Tests', () => {
  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    name: 'Test User',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue({
      user: mockUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // Property 1: Task Creation Persistence
  // Feature: todo-management, Property 1: For any valid task description and user, creating a task should result in that task appearing in the user's task list with the correct data preserved
  it('Property 1: Task Creation Persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 500 }),
          description: fc.option(fc.string({ maxLength: 1000 })),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
        }),
        async (taskData) => {
          const taskId = `task-${Math.random().toString(36).substr(2, 9)}`
          const createdAt = new Date()
          const updatedAt = new Date()

          const expectedTask = {
            id: taskId,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: taskData.title,
            description: taskData.description || null,
            status: 'active',
            priority: taskData.priority,
            dueDate: taskData.dueDate || null,
            completedAt: null,
            projectId: null,
            contextId: null,
            areaId: null,
            tags: taskData.tags,
            createdAt,
            updatedAt,
            project: null,
            context: null,
            area: null,
          }

          // Mock task creation
          mockPrisma.task.create.mockResolvedValueOnce(expectedTask)

          // Create task via API
          const createRequest = new NextRequest('http://localhost/api/tasks', {
            method: 'POST',
            body: JSON.stringify({
              title: taskData.title,
              description: taskData.description,
              priority: taskData.priority,
              dueDate: taskData.dueDate?.toISOString(),
              tags: taskData.tags,
            }),
          })

          const createResponse = await POST(createRequest)
          const createResult = await createResponse.json()

          expect(createResponse.status).toBe(201)
          expect(createResult.task).toBeDefined()

          // Mock task retrieval to verify persistence
          mockPrisma.task.findMany.mockResolvedValueOnce([expectedTask])

          // Retrieve tasks to verify the task was persisted
          const getRequest = new NextRequest('http://localhost/api/tasks')
          const getResponse = await GET(getRequest)
          const getResult = await getResponse.json()

          expect(getResponse.status).toBe(200)
          expect(getResult.tasks).toHaveLength(1)
          
          const retrievedTask = getResult.tasks[0]
          expect(retrievedTask.title).toBe(taskData.title)
          expect(retrievedTask.description).toBe(taskData.description || null)
          expect(retrievedTask.priority).toBe(taskData.priority)
          expect(retrievedTask.tags).toEqual(taskData.tags)
          expect(retrievedTask.status).toBe('active')
          expect(retrievedTask.userId).toBe(mockUser.id)
          expect(retrievedTask.tenantId).toBe(mockUser.tenantId)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 2: Task Completion State Transition
  // Feature: todo-management, Property 2: For any active task, marking it as complete should update its status to completed and move it to the completed tasks section while preserving all task data
  it('Property 2: Task Completion State Transition', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1, maxLength: 500 }),
          description: fc.option(fc.string({ maxLength: 1000 })),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
        }),
        async (taskData) => {
          const activeTask = {
            id: taskData.id,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: taskData.title,
            description: taskData.description || null,
            status: 'active',
            priority: taskData.priority,
            dueDate: taskData.dueDate || null,
            completedAt: null,
            projectId: null,
            contextId: null,
            areaId: null,
            tags: taskData.tags,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const completedAt = new Date()
          const completedTask = {
            ...activeTask,
            status: 'completed',
            completedAt,
            updatedAt: completedAt,
            project: null,
            context: null,
            area: null,
          }

          // Mock finding the active task
          mockPrisma.task.findFirst.mockResolvedValueOnce(activeTask)
          
          // Mock task completion
          mockPrisma.task.update.mockResolvedValueOnce(completedTask)

          // Complete task via API
          const completeRequest = new NextRequest(`http://localhost/api/tasks/${taskData.id}/complete`, {
            method: 'POST',
          })

          const completeResponse = await completeTask(completeRequest, { params: { id: taskData.id } })
          const completeResult = await completeResponse.json()

          expect(completeResponse.status).toBe(200)
          expect(completeResult.task).toBeDefined()
          
          const resultTask = completeResult.task
          
          // Verify status transition
          expect(resultTask.status).toBe('completed')
          expect(resultTask.completedAt).toBeTruthy()
          
          // Verify all original data is preserved
          expect(resultTask.title).toBe(taskData.title)
          expect(resultTask.description).toBe(taskData.description || null)
          expect(resultTask.priority).toBe(taskData.priority)
          expect(resultTask.tags).toEqual(taskData.tags)
          expect(resultTask.userId).toBe(mockUser.id)
          expect(resultTask.tenantId).toBe(mockUser.tenantId)
          
          // Verify the task would appear in completed tasks section
          mockPrisma.task.findMany.mockResolvedValueOnce([completedTask])
          
          const getCompletedRequest = new NextRequest('http://localhost/api/tasks?status=completed')
          const getCompletedResponse = await GET(getCompletedRequest)
          const getCompletedResult = await getCompletedResponse.json()
          
          expect(getCompletedResponse.status).toBe(200)
          expect(getCompletedResult.tasks).toHaveLength(1)
          expect(getCompletedResult.tasks[0].status).toBe('completed')
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 3: Task Update Persistence
  // Feature: todo-management, Property 3: For any existing task and valid update data, modifying the task should result in the changes being saved and reflected in subsequent retrievals
  it('Property 3: Task Update Persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1 }),
          originalTitle: fc.string({ minLength: 1, maxLength: 500 }),
          newTitle: fc.string({ minLength: 1, maxLength: 500 }),
          originalDescription: fc.option(fc.string({ maxLength: 1000 })),
          newDescription: fc.option(fc.string({ maxLength: 1000 })),
          originalPriority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          newPriority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          originalTags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
          newTags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
        }),
        async (taskData) => {
          const originalTask = {
            id: taskData.id,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: taskData.originalTitle,
            description: taskData.originalDescription || null,
            status: 'active',
            priority: taskData.originalPriority,
            dueDate: null,
            completedAt: null,
            projectId: null,
            contextId: null,
            areaId: null,
            tags: taskData.originalTags,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const updatedAt = new Date()
          const updatedTask = {
            ...originalTask,
            title: taskData.newTitle,
            description: taskData.newDescription || null,
            priority: taskData.newPriority,
            tags: taskData.newTags,
            updatedAt,
            project: null,
            context: null,
            area: null,
          }

          // Mock finding the original task
          mockPrisma.task.findFirst.mockResolvedValueOnce(originalTask)
          
          // Mock task update
          mockPrisma.task.update.mockResolvedValueOnce(updatedTask)

          // Update task via API
          const updateRequest = new NextRequest(`http://localhost/api/tasks/${taskData.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              title: taskData.newTitle,
              description: taskData.newDescription,
              priority: taskData.newPriority,
              tags: taskData.newTags,
            }),
          })

          const updateResponse = await updateTask(updateRequest, { params: { id: taskData.id } })
          const updateResult = await updateResponse.json()

          expect(updateResponse.status).toBe(200)
          expect(updateResult.task).toBeDefined()
          
          const resultTask = updateResult.task
          
          // Verify all updates were applied
          expect(resultTask.title).toBe(taskData.newTitle)
          expect(resultTask.description).toBe(taskData.newDescription || null)
          expect(resultTask.priority).toBe(taskData.newPriority)
          expect(resultTask.tags).toEqual(taskData.newTags)
          
          // Verify unchanged fields remain the same
          expect(resultTask.id).toBe(taskData.id)
          expect(resultTask.userId).toBe(mockUser.id)
          expect(resultTask.tenantId).toBe(mockUser.tenantId)
          expect(resultTask.status).toBe('active')
          
          // Verify the changes persist in subsequent retrieval
          mockPrisma.task.findFirst.mockResolvedValueOnce(updatedTask)
          
          const getRequest = new NextRequest(`http://localhost/api/tasks/${taskData.id}`)
          const getResponse = await getTask(getRequest, { params: { id: taskData.id } })
          const getResult = await getResponse.json()
          
          expect(getResponse.status).toBe(200)
          expect(getResult.task.title).toBe(taskData.newTitle)
          expect(getResult.task.description).toBe(taskData.newDescription || null)
          expect(getResult.task.priority).toBe(taskData.newPriority)
          expect(getResult.task.tags).toEqual(taskData.newTags)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 4: Task Deletion Removal
  // Feature: todo-management, Property 4: For any existing task, deleting it should result in the task no longer appearing in any task lists or views
  it('Property 4: Task Deletion Removal', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1, maxLength: 500 }),
          description: fc.option(fc.string({ maxLength: 1000 })),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
        }),
        async (taskData) => {
          const existingTask = {
            id: taskData.id,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: taskData.title,
            description: taskData.description || null,
            status: 'active',
            priority: taskData.priority,
            dueDate: null,
            completedAt: null,
            projectId: null,
            contextId: null,
            areaId: null,
            tags: taskData.tags,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          // Mock finding the task for deletion
          mockPrisma.task.findFirst.mockResolvedValueOnce(existingTask)
          
          // Mock successful deletion
          mockPrisma.task.delete.mockResolvedValueOnce(existingTask)

          // Delete task via API
          const deleteRequest = new NextRequest(`http://localhost/api/tasks/${taskData.id}`, {
            method: 'DELETE',
          })

          const deleteResponse = await deleteTask(deleteRequest, { params: { id: taskData.id } })
          const deleteResult = await deleteResponse.json()

          expect(deleteResponse.status).toBe(200)
          expect(deleteResult.message).toBe('Task deleted successfully')
          
          // Verify the task no longer appears in task lists
          mockPrisma.task.findMany.mockResolvedValueOnce([]) // Empty list after deletion
          
          const getTasksRequest = new NextRequest('http://localhost/api/tasks')
          const getTasksResponse = await GET(getTasksRequest)
          const getTasksResult = await getTasksResponse.json()
          
          expect(getTasksResponse.status).toBe(200)
          expect(getTasksResult.tasks).toHaveLength(0)
          
          // Verify the task cannot be retrieved individually
          mockPrisma.task.findFirst.mockResolvedValueOnce(null) // Task not found
          
          const getTaskRequest = new NextRequest(`http://localhost/api/tasks/${taskData.id}`)
          const getTaskResponse = await getTask(getTaskRequest, { params: { id: taskData.id } })
          
          expect(getTaskResponse.status).toBe(404)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 7: Filtering and Search Consistency
  // Feature: todo-management, Property 7: For any search query or filter criteria, the system should return only tasks that match the specified criteria (priority, status, search terms, context, area)
  it('Property 7: Filtering and Search Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          searchQuery: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          priority: fc.option(fc.constantFrom('low', 'medium', 'high', 'urgent')),
          status: fc.option(fc.constantFrom('active', 'completed', 'archived')),
          contextId: fc.option(fc.string({ minLength: 1 })),
          areaId: fc.option(fc.string({ minLength: 1 })),
          projectId: fc.option(fc.string({ minLength: 1 })),
          tasks: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              title: fc.string({ minLength: 1, maxLength: 500 }),
              description: fc.option(fc.string({ maxLength: 1000 })),
              priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
              status: fc.constantFrom('active', 'completed', 'archived'),
              contextId: fc.option(fc.string({ minLength: 1 })),
              areaId: fc.option(fc.string({ minLength: 1 })),
              projectId: fc.option(fc.string({ minLength: 1 })),
              tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
        }),
        async (testData) => {
          const { searchQuery, priority, status, contextId, areaId, projectId, tasks } = testData

          // Create mock tasks with proper structure
          const mockTasks = tasks.map(task => ({
            id: task.id,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: task.title,
            description: task.description || null,
            status: task.status,
            priority: task.priority,
            dueDate: null,
            completedAt: null,
            projectId: task.projectId || null,
            contextId: task.contextId || null,
            areaId: task.areaId || null,
            tags: task.tags,
            createdAt: new Date(),
            updatedAt: new Date(),
            project: task.projectId ? { id: task.projectId, name: `Project ${task.projectId}` } : null,
            context: task.contextId ? { id: task.contextId, name: `Context ${task.contextId}` } : null,
            area: task.areaId ? { id: task.areaId, name: `Area ${task.areaId}` } : null,
          }))

          // Filter tasks based on criteria to determine expected results
          const expectedTasks = mockTasks.filter(task => {
            // Apply search filter
            if (searchQuery) {
              const matchesSearch = 
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
              if (!matchesSearch) return false
            }

            // Apply priority filter
            if (priority && task.priority !== priority) return false

            // Apply status filter
            if (status && task.status !== status) return false

            // Apply context filter
            if (contextId && task.contextId !== contextId) return false

            // Apply area filter
            if (areaId && task.areaId !== areaId) return false

            // Apply project filter
            if (projectId && task.projectId !== projectId) return false

            return true
          })

          // Mock the filtered results
          mockPrisma.task.findMany.mockResolvedValueOnce(expectedTasks)

          // Build query parameters
          const queryParams = new URLSearchParams()
          if (searchQuery) queryParams.set('search', searchQuery)
          if (priority) queryParams.set('priority', priority)
          if (status) queryParams.set('status', status)
          if (contextId) queryParams.set('contextId', contextId)
          if (areaId) queryParams.set('areaId', areaId)
          if (projectId) queryParams.set('projectId', projectId)

          // Test filtering via main tasks endpoint
          const filterRequest = new NextRequest(`http://localhost/api/tasks?${queryParams.toString()}`)
          const filterResponse = await GET(filterRequest)
          const filterResult = await filterResponse.json()

          expect(filterResponse.status).toBe(200)
          expect(filterResult.tasks).toHaveLength(expectedTasks.length)

          // Verify each returned task matches the filter criteria
          filterResult.tasks.forEach((returnedTask: any) => {
            if (searchQuery) {
              const matchesSearch = 
                returnedTask.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (returnedTask.description && returnedTask.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                returnedTask.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
              expect(matchesSearch).toBe(true)
            }

            if (priority) expect(returnedTask.priority).toBe(priority)
            if (status) expect(returnedTask.status).toBe(status)
            if (contextId) expect(returnedTask.contextId).toBe(contextId)
            if (areaId) expect(returnedTask.areaId).toBe(areaId)
            if (projectId) expect(returnedTask.projectId).toBe(projectId)
          })

          // Test search endpoint if search query is provided
          if (searchQuery) {
            mockPrisma.task.findMany.mockResolvedValueOnce(expectedTasks)
            
            const searchRequest = new NextRequest(`http://localhost/api/tasks/search?q=${encodeURIComponent(searchQuery)}`)
            const searchResponse = await searchTasks(searchRequest)
            const searchResult = await searchResponse.json()

            expect(searchResponse.status).toBe(200)
            expect(searchResult.tasks).toHaveLength(expectedTasks.length)
            expect(searchResult.query).toBe(searchQuery)

            // Verify search results match the query
            searchResult.tasks.forEach((returnedTask: any) => {
              const matchesSearch = 
                returnedTask.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (returnedTask.description && returnedTask.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                returnedTask.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
              expect(matchesSearch).toBe(true)
            })
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 8: Today and Overdue Views
  // Feature: todo-management, Property 8: For any collection of tasks with various due dates, the "today" view should show only tasks due today, and the "overdue" view should show only tasks past their due date
  it('Property 8: Today and Overdue Views', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1, maxLength: 500 }),
            dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
            status: fc.constantFrom('active', 'completed'),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (tasks) => {
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)

          // Create mock tasks with proper structure
          const mockTasks = tasks.map(task => ({
            id: task.id,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: task.title,
            description: null,
            status: task.status,
            priority: 'medium' as const,
            dueDate: task.dueDate,
            completedAt: null,
            projectId: null,
            contextId: null,
            areaId: null,
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            project: null,
            context: null,
            area: null,
          }))

          // Filter for today's tasks (active tasks due today)
          const expectedTodayTasks = mockTasks.filter(task => 
            task.status === 'active' &&
            task.dueDate &&
            task.dueDate >= today &&
            task.dueDate < tomorrow
          )

          // Filter for overdue tasks (active tasks due before today)
          const expectedOverdueTasks = mockTasks.filter(task => 
            task.status === 'active' &&
            task.dueDate &&
            task.dueDate < today
          )

          // Test today's tasks endpoint
          mockPrisma.task.findMany.mockResolvedValueOnce(expectedTodayTasks)
          
          const todayRequest = new NextRequest('http://localhost/api/tasks/today')
          const todayResponse = await getTodayTasks(todayRequest)
          const todayResult = await todayResponse.json()

          expect(todayResponse.status).toBe(200)
          expect(todayResult.tasks).toHaveLength(expectedTodayTasks.length)
          expect(todayResult.total).toBe(expectedTodayTasks.length)

          // Verify all returned tasks are due today and active
          todayResult.tasks.forEach((returnedTask: any) => {
            expect(returnedTask.status).toBe('active')
            expect(returnedTask.dueDate).toBeTruthy()
            
            const taskDueDate = new Date(returnedTask.dueDate)
            expect(taskDueDate >= today).toBe(true)
            expect(taskDueDate < tomorrow).toBe(true)
          })

          // Test overdue tasks endpoint
          mockPrisma.task.findMany.mockResolvedValueOnce(expectedOverdueTasks)
          
          const overdueRequest = new NextRequest('http://localhost/api/tasks/overdue')
          const overdueResponse = await getOverdueTasks(overdueRequest)
          const overdueResult = await overdueResponse.json()

          expect(overdueResponse.status).toBe(200)
          expect(overdueResult.tasks).toHaveLength(expectedOverdueTasks.length)
          expect(overdueResult.total).toBe(expectedOverdueTasks.length)

          // Verify all returned tasks are overdue and active
          overdueResult.tasks.forEach((returnedTask: any) => {
            expect(returnedTask.status).toBe('active')
            expect(returnedTask.dueDate).toBeTruthy()
            
            const taskDueDate = new Date(returnedTask.dueDate)
            expect(taskDueDate < today).toBe(true)
          })

          // Test date filtering via main endpoint
          mockPrisma.task.findMany.mockResolvedValueOnce(expectedTodayTasks)
          
          const todayFilterRequest = new NextRequest('http://localhost/api/tasks?dueDate=today')
          const todayFilterResponse = await GET(todayFilterRequest)
          const todayFilterResult = await todayFilterResponse.json()

          expect(todayFilterResponse.status).toBe(200)
          expect(todayFilterResult.tasks).toHaveLength(expectedTodayTasks.length)

          mockPrisma.task.findMany.mockResolvedValueOnce(expectedOverdueTasks)
          
          const overdueFilterRequest = new NextRequest('http://localhost/api/tasks?dueDate=overdue')
          const overdueFilterResponse = await GET(overdueFilterRequest)
          const overdueFilterResult = await overdueFilterResponse.json()

          expect(overdueFilterResponse.status).toBe(200)
          expect(overdueFilterResult.tasks).toHaveLength(expectedOverdueTasks.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})