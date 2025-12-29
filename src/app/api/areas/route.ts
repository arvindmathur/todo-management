import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"

const createAreaSchema = z.object({
  name: z.string().min(1, "Area name is required").max(100, "Area name too long"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color").optional(),
})

const areaFiltersSchema = z.object({
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
})

// Get areas with filtering
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
    const filters = areaFiltersSchema.parse(Object.fromEntries(searchParams))

    // Build where clause
    const where: any = {
      userId: session.user.id,
      tenantId: session.user.tenantId,
    }

    // Apply filters
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const areas = await DatabaseConnection.withRetry(
      () => prisma.area.findMany({
        where,
        include: {
          _count: {
            select: {
              tasks: {
                where: {
                  status: "active" // Only count active tasks
                }
              },
              projects: {
                where: {
                  status: "active" // Only count active projects
                }
              }
            }
          }
        },
        orderBy: [
          { name: "asc" }
        ],
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      'get-areas'
    )

    return NextResponse.json({ areas })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid filters", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Get areas error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Create new area
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createAreaSchema.parse(body)

    // Check if area with same name already exists for this user
    const existingArea = await DatabaseConnection.withRetry(
      () => prisma.area.findFirst({
        where: {
          name: validatedData.name,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      }),
      'check-area-exists'
    )

    if (existingArea) {
      return NextResponse.json(
        { error: "Area with this name already exists" },
        { status: 400 }
      )
    }

    const area = await DatabaseConnection.withRetry(
      () => prisma.area.create({
        data: {
          ...validatedData,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        },
        include: {
          _count: {
            select: {
              tasks: {
                where: {
                  status: "active"
                }
              },
              projects: {
                where: {
                  status: "active"
                }
              }
            }
          }
        }
      }),
      'create-area'
    )

    return NextResponse.json(
      { 
        message: "Area created successfully",
        area 
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Create area error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}