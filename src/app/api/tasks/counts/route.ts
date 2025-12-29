import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DatabaseConnection } from "@/lib/db-connection"
import { withErrorHandling, requireAuth } from "@/lib/api-error-handler"

// Optimized task counts endpoint - single query for all counts
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  // Ensure healthy database connection
  await DatabaseConnection.ensureHealthyConnection()

  try {
    // Get all counts in a single optimized query using raw SQL for maximum performance
    const result = await DatabaseConnection.withRetry(
      async () => {
        const { prisma } = await import("@/lib/prisma")
        
        // Use raw SQL for maximum performance - single query for all counts
        const counts = await prisma.$queryRaw<Array<{
          count_type: string
          count_value: bigint
        }>>`
          SELECT 
            'all' as count_type, 
            COUNT(*) as count_value
          FROM "Task" 
          WHERE "tenantId" = ${session.user.tenantId} 
            AND "userId" = ${session.user.id} 
            AND "status" = 'active'
          
          UNION ALL
          
          SELECT 
            'today' as count_type, 
            COUNT(*) as count_value
          FROM "Task" 
          WHERE "tenantId" = ${session.user.tenantId} 
            AND "userId" = ${session.user.id} 
            AND "status" = 'active'
            AND "dueDate"::date = CURRENT_DATE
          
          UNION ALL
          
          SELECT 
            'overdue' as count_type, 
            COUNT(*) as count_value
          FROM "Task" 
          WHERE "tenantId" = ${session.user.tenantId} 
            AND "userId" = ${session.user.id} 
            AND "status" = 'active'
            AND "dueDate"::date < CURRENT_DATE
          
          UNION ALL
          
          SELECT 
            'upcoming' as count_type, 
            COUNT(*) as count_value
          FROM "Task" 
          WHERE "tenantId" = ${session.user.tenantId} 
            AND "userId" = ${session.user.id} 
            AND "status" = 'active'
            AND "dueDate"::date > CURRENT_DATE 
            AND "dueDate"::date <= CURRENT_DATE + INTERVAL '7 days'
          
          UNION ALL
          
          SELECT 
            'noDueDate' as count_type, 
            COUNT(*) as count_value
          FROM "Task" 
          WHERE "tenantId" = ${session.user.tenantId} 
            AND "userId" = ${session.user.id} 
            AND "status" = 'active'
            AND "dueDate" IS NULL
        `

        // Transform the result into a more usable format
        const taskCounts = {
          all: 0,
          today: 0,
          overdue: 0,
          upcoming: 0,
          noDueDate: 0,
          focus: 0,
        }

        counts.forEach(row => {
          const count = Number(row.count_value)
          switch (row.count_type) {
            case 'all':
              taskCounts.all = count
              break
            case 'today':
              taskCounts.today = count
              break
            case 'overdue':
              taskCounts.overdue = count
              break
            case 'upcoming':
              taskCounts.upcoming = count
              break
            case 'noDueDate':
              taskCounts.noDueDate = count
              break
          }
        })

        // Calculate focus count (overdue + today)
        taskCounts.focus = taskCounts.overdue + taskCounts.today

        return taskCounts
      },
      'get-task-counts'
    )

    return NextResponse.json({
      success: true,
      counts: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching task counts:', error)
    
    // Return zero counts on error to prevent UI breaking
    return NextResponse.json({
      success: false,
      counts: {
        all: 0,
        today: 0,
        overdue: 0,
        upcoming: 0,
        noDueDate: 0,
        focus: 0,
      },
      error: 'Failed to fetch task counts',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}, "getTaskCounts")