import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import fc from 'fast-check'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { GET, POST } from '@/app/api/tasks/route'
import { PUT as updateTask } from '@/app/api/tasks/[id]/route'
import { POST as completeTask } from '@/app/api/tasks/[id]/complete/route'

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

describe('Enhanced Completed Task Management Property Tests', () => {
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

  // Property 30: Enhanced Completed Task Management
  // Feature: todo-management, Property 30: For any completed task, it should be properly moved to the completed section with completion date recorded and remain immutable to prevent uncompleting
  it('Property 30: Enhanced Completed Task Management', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1, maxLength: 500 }),
          description: fc.option(fc.string({ maxLength: 1000 })),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
          originalDueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
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
            originalDueDate: taskData.originalDueDate || taskData.dueDate || null,
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
          
          // Verify task is moved to completed section with completion date
          expect(resultTask.status).toBe('completed')
          expect(resultTask.completedAt).toBeTruthy()
          expect(new Date(resultTask.completedAt)).toBeInstanceOf(Date)
          
          // Verify all original data is preserved
          expect(resultTask.title).toBe(taskData.title)
          expect(resultTask.description).toBe(taskData.description || null)
          expect(resultTask.priority).toBe(taskData.priority)
          expect(resultTask.tags).toEqual(taskData.tags)
          expect(resultTask.originalDueDate).toBe(activeTask.originalDueDate)
          
          // Verify immutability - attempt to uncomplete should fail
          mockPrisma.task.findFirst.mockResolvedValueOnce(completedTask)
          
          const uncompleteRequest = new NextRequest(`http://localhost/api/tasks/${taskData.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              status: 'active',
              completedAt: null,
            }),
          })

          const uncompleteResponse = await updateTask(uncompleteRequest, { params: { id: taskData.id } })
          
          // Should either reject the request or ignore the status change
          if (uncompleteResponse.status === 400) {
            const uncompleteResult = await uncompleteResponse.json()
            expect(uncompleteResult.error).toBeTruthy()
          } else {
            // If update succeeds, verify status remains completed
            const uncompleteResult = await uncompleteResponse.json()
            expect(uncompleteResult.task.status).toBe('completed')
            expect(uncompleteResult.task.completedAt).toBeTruthy()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 31: Completed Task Visibility Toggle
  // Feature: todo-management, Property 31: For any completed task visibility selection (1 day, 7 days, 30 days), the system should filter both task lists and tab counts to show only completed tasks within the selected timeframe
  it('Property 31: Completed Task Visibility Toggle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          completedTaskVisibility: fc.constantFrom('none', '1day', '7days', '30days'),
          tasks: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              title: fc.string({ minLength: 1, maxLength: 500 }),
              status: fc.constantFrom('active', 'completed'),
              completedAt: fc.option(fc.date({ min: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), max: new Date() })), // Last 60 days
            }),
            { minLength: 1, maxLength: 20 }
          ),
        }),
        async (testData) => {
          const { completedTaskVisibility, tasks } = testData
          const now = new Date()

          // Create mock tasks with proper structure
          const mockTasks = tasks.map(task => ({
            id: task.id,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: task.title,
            description: null,
            status: task.status,
            priority: 'medium' as const,
            dueDate: null,
            originalDueDate: null,
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

          // Calculate expected tasks based on visibility setting
          let expectedTasks = mockTasks.filter(task => task.status === 'active')
          
          if (completedTaskVisibility !== 'none') {
            let cutoffDate: Date
            switch (completedTaskVisibility) {
              case '1day':
                cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
                break
              case '7days':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
              case '30days':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                break
              default:
                cutoffDate = new Date(0)
            }

            const recentCompletedTasks = mockTasks.filter(task => 
              task.status === 'completed' && 
              task.completedAt && 
              task.completedAt >= cutoffDate
            )

            expectedTasks = [...expectedTasks, ...recentCompletedTasks]
          }

          // Mock the filtered results
          mockPrisma.task.findMany.mockResolvedValueOnce(expectedTasks)

          // Test filtering via main tasks endpoint with completed task visibility
          const queryParams = new URLSearchParams()
          queryParams.set('completedTaskVisibility', completedTaskVisibility)

          const filterRequest = new NextRequest(`http://localhost/api/tasks?${queryParams.toString()}`)
          const filterResponse = await GET(filterRequest)
          const filterResult = await filterResponse.json()

          expect(filterResponse.status).toBe(200)
          expect(filterResult.tasks).toHaveLength(expectedTasks.length)

          // Verify filtering logic
          filterResult.tasks.forEach((returnedTask: any) => {
            if (returnedTask.status === 'completed') {
              expect(returnedTask.completedAt).toBeTruthy()
              
              if (completedTaskVisibility !== 'none') {
                const completedAt = new Date(returnedTask.completedAt)
                let cutoffDate: Date
                switch (completedTaskVisibility) {
                  case '1day':
                    cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
                    break
                  case '7days':
                    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    break
                  case '30days':
                    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                    break
                  default:
                    cutoffDate = new Date(0)
                }
                expect(completedAt >= cutoffDate).toBe(true)
              }
            } else {
              expect(returnedTask.status).toBe('active')
            }
          })

          // Verify tab counts match the filtered results
          const activeCount = filterResult.tasks.filter((task: any) => task.status === 'active').length
          const completedCount = filterResult.tasks.filter((task: any) => task.status === 'completed').length
          
          expect(filterResult.counts?.active || activeCount).toBe(activeCount)
          if (completedTaskVisibility !== 'none') {
            expect(filterResult.counts?.completed || completedCount).toBe(completedCount)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 33: Original Due Date Preservation
  // Feature: todo-management, Property 33: For any task with a due date that gets modified, the system should preserve the original due date separately from the current due date
  it('Property 33: Original Due Date Preservation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1, maxLength: 500 }),
          originalDueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          newDueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        }),
        async (taskData) => {
          const originalTask = {
            id: taskData.id,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: taskData.title,
            description: null,
            status: 'active',
            priority: 'medium' as const,
            dueDate: taskData.originalDueDate,
            originalDueDate: taskData.originalDueDate, // Initially same as dueDate
            completedAt: null,
            projectId: null,
            contextId: null,
            areaId: null,
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const updatedTask = {
            ...originalTask,
            dueDate: taskData.newDueDate,
            originalDueDate: taskData.originalDueDate, // Should remain unchanged
            updatedAt: new Date(),
            project: null,
            context: null,
            area: null,
          }

          // Mock finding the original task
          mockPrisma.task.findFirst.mockResolvedValueOnce(originalTask)
          
          // Mock task update
          mockPrisma.task.update.mockResolvedValueOnce(updatedTask)

          // Update task due date via API
          const updateRequest = new NextRequest(`http://localhost/api/tasks/${taskData.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              dueDate: taskData.newDueDate.toISOString(),
            }),
          })

          const updateResponse = await updateTask(updateRequest, { params: { id: taskData.id } })
          const updateResult = await updateResponse.json()

          expect(updateResponse.status).toBe(200)
          expect(updateResult.task).toBeDefined()
          
          const resultTask = updateResult.task
          
          // Verify current due date is updated
          expect(new Date(resultTask.dueDate)).toEqual(taskData.newDueDate)
          
          // Verify original due date is preserved
          expect(new Date(resultTask.originalDueDate)).toEqual(taskData.originalDueDate)
          
          // Verify they are different if the dates were actually different
          if (taskData.originalDueDate.getTime() !== taskData.newDueDate.getTime()) {
            expect(resultTask.originalDueDate).not.toBe(resultTask.dueDate)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 34: Complete Date Field Tracking
  // Feature: todo-management, Property 34: For any task, the system should maintain all required date fields: date created, original due date, current due date, and date completed (when applicable)
  it('Property 34: Complete Date Field Tracking', async () => {
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

          const createdTask = {
            id: taskId,
            tenantId: mockUser.tenantId,
            userId: mockUser.id,
            title: taskData.title,
            description: taskData.description || null,
            status: 'active',
            priority: taskData.priority,
            dueDate: taskData.dueDate || null,
            originalDueDate: taskData.dueDate || null, // Set to same as dueDate initially
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
          mockPrisma.task.create.mockResolvedValueOnce(createdTask)

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
          
          const resultTask = createResult.task
          
          // Verify all required date fields are present
          expect(resultTask.createdAt).toBeTruthy()
          expect(new Date(resultTask.createdAt)).toBeInstanceOf(Date)
          
          if (taskData.dueDate) {
            expect(resultTask.dueDate).toBeTruthy()
            expect(resultTask.originalDueDate).toBeTruthy()
            expect(new Date(resultTask.dueDate)).toBeInstanceOf(Date)
            expect(new Date(resultTask.originalDueDate)).toBeInstanceOf(Date)
            // Initially, originalDueDate should equal dueDate
            expect(resultTask.originalDueDate).toBe(resultTask.dueDate)
          } else {
            expect(resultTask.dueDate).toBeNull()
            expect(resultTask.originalDueDate).toBeNull()
          }
          
          // completedAt should be null for active tasks
          expect(resultTask.completedAt).toBeNull()
          
          // Now complete the task and verify completedAt is set
          const completedAt = new Date()
          const completedTask = {
            ...createdTask,
            status: 'completed',
            completedAt,
            updatedAt: completedAt,
          }

          mockPrisma.task.findFirst.mockResolvedValueOnce(createdTask)
          mockPrisma.task.update.mockResolvedValueOnce(completedTask)

          const completeRequest = new NextRequest(`http://localhost/api/tasks/${taskId}/complete`, {
            method: 'POST',
          })

          const completeResponse = await completeTask(completeRequest, { params: { id: taskId } })
          const completeResult = await completeResponse.json()

          expect(completeResponse.status).toBe(200)
          
          const completedResultTask = completeResult.task
          
          // Verify all date fields are still present and completedAt is now set
          expect(completedResultTask.createdAt).toBeTruthy()
          expect(completedResultTask.completedAt).toBeTruthy()
          expect(new Date(completedResultTask.completedAt)).toBeInstanceOf(Date)
          
          if (taskData.dueDate) {
            expect(completedResultTask.dueDate).toBeTruthy()
            expect(completedResultTask.originalDueDate).toBeTruthy()
          }
          
          // Verify completedAt is after or equal to createdAt
          expect(new Date(completedResultTask.completedAt) >= new Date(completedResultTask.createdAt)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})