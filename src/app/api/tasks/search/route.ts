import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const searchSchema = z.object({
  q: z.string().min(1, "Search query is required"),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
})

// Advanced search for tasks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const { q: query, limit, offset } = searchSchema.parse(Object.fromEntries(searchParams))

    // Perform full-text search across title, description, and tags
    const tasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            tags: {
              has: query
            }
          },
          {
            project: {
              name: {
                contains: query,
                mode: 'insensitive'
              }
            }
          },
          {
            context: {
              name: {
                contains: query,
                mode: 'insensitive'
              }
            }
          },
          {
            area: {
              name: {
                contains: query,
                mode: 'insensitive'
              }
            }
          }
        ]
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        context: {
          select: { id: true, name: true }
        },
        area: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
        { createdAt: "desc" }
      ],
      take: limit || 50,
      skip: offset || 0,
    })

    return NextResponse.json({ 
      tasks,
      query,
      total: tasks.length 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid search parameters", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Search tasks error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}