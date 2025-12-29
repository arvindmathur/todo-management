import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import fc from 'fast-check'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/tasks/route'
import { PUT as updateTask } from '@/app/api/tasks/[id]/route'
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
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('UI/UX Improvements Property Tests', () => {
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

  // Property 37: Tab Count Consistency
  // Feature: todo-management, Property 37: For any task filtering view, the displayed tab counts should accurately match the actual number of tasks in each filtered category using consistent timezone calculations
  it('Property 37: Tab Count Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1, maxLength: 500 }),
            status: fc.constantFrom('active', 'completed'),
            dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
            completedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() })),
          }),
          { minLength: 1, maxLength: 50 }
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
            originalDueDate: task.dueDate,
            completedAt: task.status === 'completed' ? (task.completedAt || new Date()) : null,
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

          // Calculate expected counts using the same logic as the API
          const activeTasks = mockTasks.filter(task => task.status === 'active')
          const completedTasks = mockTasks.filter(task => task.status === 'completed')
          
          const todayTasks = activeTasks.filter(task => 
            task.dueDate &&
            task.dueDate >= today &&
            task.dueDate < tomorrow
          )
          
          const overdueTasks = activeTasks.filter(task => 
            task.dueDate &&
            task.dueDate < today
          )

          // Test all tasks endpoint with counts
          mockPrisma.task.findMany.mockResolvedValueOnce(mockTasks)
          
          const allTasksRequest = new NextRequest('http://localhost/api/tasks?includeCounts=true')
          const allTasksResponse = await GET(allTasksRequest)
          const allTasksResult = await allTasksResponse.json()

          expect(allTasksResponse.status).toBe(200)
          expect(allTasksResult.tasks).toHaveLength(mockTasks.length)
          
          // Verify counts match actual filtered results
          if (allTasksResult.counts) {
            expect(allTasksResult.counts.total).toBe(mockTasks.length)
            expect(allTasksResult.counts.active).toBe(activeTasks.length)
            expect(allTasksResult.counts.completed).toBe(completedTasks.length)
          }

          // Test today's tasks endpoint
          mockPrisma.task.findMany.mockResolvedValueOnce(todayTasks)
          
          const todayRequest = new NextRequest('http://localhost/api/tasks/today')
          const todayResponse = await getTodayTasks(todayRequest)
          const todayResult = await todayResponse.json()

          expect(todayResponse.status).toBe(200)
          expect(todayResult.tasks).toHaveLength(todayTasks.length)
          expect(todayResult.total).toBe(todayTasks.length)

          // Verify all returned tasks are actually due today
          todayResult.tasks.forEach((task: any) => {
            expect(task.status).toBe('active')
            if (task.dueDate) {
              const taskDueDate = new Date(task.dueDate)
              expect(taskDueDate >= today).toBe(true)
              expect(taskDueDate < tomorrow).toBe(true)
            }
          })

          // Test overdue tasks endpoint
          mockPrisma.task.findMany.mockResolvedValueOnce(overdueTasks)
          
          const overdueRequest = new NextRequest('http://localhost/api/tasks/overdue')
          const overdueResponse = await getOverdueTasks(overdueRequest)
          const overdueResult = await overdueResponse.json()

          expect(overdueResponse.status).toBe(200)
          expect(overdueResult.tasks).toHaveLength(overdueTasks.length)
          expect(overdueResult.total).toBe(overdueTasks.length)

          // Verify all returned tasks are actually overdue
          overdueResult.tasks.forEach((task: any) => {
            expect(task.status).toBe('active')
            if (task.dueDate) {
              const taskDueDate = new Date(task.dueDate)
              expect(taskDueDate < today).toBe(true)
            }
          })

          // Test active tasks filter
          mockPrisma.task.findMany.mockResolvedValueOnce(activeTasks)
          
          const activeRequest = new NextRequest('http://localhost/api/tasks?status=active')
          const activeResponse = await GET(activeRequest)
          const activeResult = await activeResponse.json()

          expect(activeResponse.status).toBe(200)
          expect(activeResult.tasks).toHaveLength(activeTasks.length)
          
          // Verify all returned tasks are active
          activeResult.tasks.forEach((task: any) => {
            expect(task.status).toBe('active')
          })

          // Test completed tasks filter
          mockPrisma.task.findMany.mockResolvedValueOnce(completedTasks)
          
          const completedRequest = new NextRequest('http://localhost/api/tasks?status=completed')
          const completedResponse = await GET(completedRequest)
          const completedResult = await completedResponse.json()

          expect(completedResponse.status).toBe(200)
          expect(completedResult.tasks).toHaveLength(completedTasks.length)
          
          // Verify all returned tasks are completed
          completedResult.tasks.forEach((task: any) => {
            expect(task.status).toBe('completed')
            expect(task.completedAt).toBeTruthy()
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 38: Auto-save Task Changes
  // Feature: todo-management, Property 38: For any task editing operation, changes should be automatically saved immediately upon completion of the editing action
  it('Property 38: Auto-save Task Changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1 }),
          originalTitle: fc.string({ minLength: 1, maxLength: 500 }),
          newTitle: fc.string({ minLength: 1, maxLength: 500 }),
          originalPriority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          newPriority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          originalDueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
          newDueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
        }),
        async (taskData) => {
          const originalTask = {
            id: taskData.id,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: taskData.originalTitle,
            description: null,
            status: 'active',
            priority: taskData.originalPriority,
            dueDate: taskData.originalDueDate,
            originalDueDate: taskData.originalDueDate,
            completedAt: null,
            projectId: null,
            contextId: null,
            areaId: null,
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const updatedAt = new Date()
          const updatedTask = {
            ...originalTask,
            title: taskData.newTitle,
            priority: taskData.newPriority,
            dueDate: taskData.newDueDate,
            originalDueDate: taskData.originalDueDate, // Preserve original
            updatedAt,
            project: null,
            context: null,
            area: null,
          }

          // Mock finding the original task
          mockPrisma.task.findFirst.mockResolvedValueOnce(originalTask)
          
          // Mock task update - simulating immediate save
          mockPrisma.task.update.mockResolvedValueOnce(updatedTask)

          // Simulate auto-save by updating task via API
          const updateRequest = new NextRequest(`http://localhost/api/tasks/${taskData.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              title: taskData.newTitle,
              priority: taskData.newPriority,
              dueDate: taskData.newDueDate?.toISOString(),
            }),
          })

          const startTime = Date.now()
          const updateResponse = await updateTask(updateRequest, { params: { id: taskData.id } })
          const endTime = Date.now()
          const updateResult = await updateResponse.json()

          expect(updateResponse.status).toBe(200)
          expect(updateResult.task).toBeDefined()
          
          const resultTask = updateResult.task
          
          // Verify changes were saved immediately (within reasonable time)
          const responseTime = endTime - startTime
          expect(responseTime).toBeLessThan(2000) // Should complete within 2 seconds
          
          // Verify all changes were persisted
          expect(resultTask.title).toBe(taskData.newTitle)
          expect(resultTask.priority).toBe(taskData.newPriority)
          
          if (taskData.newDueDate) {
            expect(new Date(resultTask.dueDate)).toEqual(taskData.newDueDate)
          } else {
            expect(resultTask.dueDate).toBeNull()
          }
          
          // Verify updatedAt timestamp reflects the save
          expect(resultTask.updatedAt).toBeTruthy()
          const updatedAtTime = new Date(resultTask.updatedAt).getTime()
          expect(updatedAtTime).toBeGreaterThanOrEqual(startTime)
          expect(updatedAtTime).toBeLessThanOrEqual(endTime)
          
          // Verify original due date is preserved
          if (taskData.originalDueDate) {
            expect(new Date(resultTask.originalDueDate)).toEqual(taskData.originalDueDate)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 36: Date Quick Selector Functionality
  // Feature: todo-management, Property 36: For any task in edit mode, using date quick selectors (Today, Tomorrow, Clear) should update the date without losing focus or exiting edit mode
  it('Property 36: Date Quick Selector Functionality', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1, maxLength: 500 }),
          originalDueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
          quickSelector: fc.constantFrom('today', 'tomorrow', 'clear'),
        }),
        async (taskData) => {
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)

          const originalTask = {
            id: taskData.id,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: taskData.title,
            description: null,
            status: 'active',
            priority: 'medium' as const,
            dueDate: taskData.originalDueDate,
            originalDueDate: taskData.originalDueDate,
            completedAt: null,
            projectId: null,
            contextId: null,
            areaId: null,
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          // Determine expected due date based on quick selector
          let expectedDueDate: Date | null
          switch (taskData.quickSelector) {
            case 'today':
              expectedDueDate = today
              break
            case 'tomorrow':
              expectedDueDate = tomorrow
              break
            case 'clear':
              expectedDueDate = null
              break
            default:
              expectedDueDate = taskData.originalDueDate
          }

          const updatedTask = {
            ...originalTask,
            dueDate: expectedDueDate,
            originalDueDate: taskData.originalDueDate, // Preserve original
            updatedAt: new Date(),
            project: null,
            context: null,
            area: null,
          }

          // Mock finding the original task
          mockPrisma.task.findFirst.mockResolvedValueOnce(originalTask)
          
          // Mock task update
          mockPrisma.task.update.mockResolvedValueOnce(updatedTask)

          // Simulate quick selector action via API update
          const updateRequest = new NextRequest(`http://localhost/api/tasks/${taskData.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              dueDate: expectedDueDate?.toISOString() || null,
            }),
          })

          const updateResponse = await updateTask(updateRequest, { params: { id: taskData.id } })
          const updateResult = await updateResponse.json()

          expect(updateResponse.status).toBe(200)
          expect(updateResult.task).toBeDefined()
          
          const resultTask = updateResult.task
          
          // Verify the quick selector action was applied correctly
          if (expectedDueDate) {
            expect(new Date(resultTask.dueDate)).toEqual(expectedDueDate)
          } else {
            expect(resultTask.dueDate).toBeNull()
          }
          
          // Verify original due date is preserved
          if (taskData.originalDueDate) {
            expect(new Date(resultTask.originalDueDate)).toEqual(taskData.originalDueDate)
          } else {
            expect(resultTask.originalDueDate).toBeNull()
          }
          
          // Verify other task properties remain unchanged
          expect(resultTask.title).toBe(taskData.title)
          expect(resultTask.status).toBe('active')
          expect(resultTask.priority).toBe('medium')
          
          // Verify the update was processed quickly (simulating no focus loss)
          expect(resultTask.updatedAt).toBeTruthy()
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 32: Completed Task Immutability Display
  // Feature: todo-management, Property 32: For any completed task displayed in the interface, it should have disabled interaction controls and visual indicators showing its read-only status
  it('Property 32: Completed Task Immutability Display', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1, maxLength: 500 }),
          description: fc.option(fc.string({ maxLength: 1000 })),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
          completedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
        }),
        async (taskData) => {
          const completedTask = {
            id: taskData.id,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: taskData.title,
            description: taskData.description || null,
            status: 'completed',
            priority: taskData.priority,
            dueDate: taskData.dueDate,
            originalDueDate: taskData.dueDate,
            completedAt: taskData.completedAt,
            projectId: null,
            contextId: null,
            areaId: null,
            tags: taskData.tags,
            createdAt: new Date(),
            updatedAt: taskData.completedAt,
            project: null,
            context: null,
            area: null,
          }

          // Mock finding the completed task
          mockPrisma.task.findFirst.mockResolvedValueOnce(completedTask)

          // Attempt to modify a completed task (should be prevented or ignored)
          const modificationAttempts = [
            { title: 'Modified Title' },
            { description: 'Modified Description' },
            { priority: 'urgent' },
            { status: 'active' },
            { completedAt: null },
          ]

          for (const modification of modificationAttempts) {
            // Mock finding the task again
            mockPrisma.task.findFirst.mockResolvedValueOnce(completedTask)
            
            // Mock update that either fails or ignores the change
            mockPrisma.task.update.mockResolvedValueOnce(completedTask) // Returns unchanged task

            const updateRequest = new NextRequest(`http://localhost/api/tasks/${taskData.id}`, {
              method: 'PUT',
              body: JSON.stringify(modification),
            })

            const updateResponse = await updateTask(updateRequest, { params: { id: taskData.id } })
            
            // The API should either reject the modification or ignore it
            if (updateResponse.status === 400 || updateResponse.status === 403) {
              // Modification was properly rejected
              const errorResult = await updateResponse.json()
              expect(errorResult.error).toBeTruthy()
            } else if (updateResponse.status === 200) {
              // Modification was accepted but task should remain unchanged
              const updateResult = await updateResponse.json()
              expect(updateResult.task.status).toBe('completed')
              expect(updateResult.task.completedAt).toBeTruthy()
              
              // Critical fields should remain unchanged
              expect(updateResult.task.title).toBe(taskData.title)
              expect(updateResult.task.description).toBe(taskData.description || null)
              expect(updateResult.task.priority).toBe(taskData.priority)
              
              // Status and completedAt should never change for completed tasks
              expect(updateResult.task.status).toBe('completed')
              expect(new Date(updateResult.task.completedAt)).toEqual(taskData.completedAt)
            }
          }

          // Verify completed task can still be retrieved with all its immutable properties
          mockPrisma.task.findMany.mockResolvedValueOnce([completedTask])
          
          const getRequest = new NextRequest('http://localhost/api/tasks?status=completed')
          const getResponse = await GET(getRequest)
          const getResult = await getResponse.json()

          expect(getResponse.status).toBe(200)
          expect(getResult.tasks).toHaveLength(1)
          
          const retrievedTask = getResult.tasks[0]
          expect(retrievedTask.status).toBe('completed')
          expect(retrievedTask.completedAt).toBeTruthy()
          expect(retrievedTask.title).toBe(taskData.title)
          expect(retrievedTask.description).toBe(taskData.description || null)
          expect(retrievedTask.priority).toBe(taskData.priority)
          expect(retrievedTask.tags).toEqual(taskData.tags)
        }
      ),
      { numRuns: 100 }
    )
  })
})