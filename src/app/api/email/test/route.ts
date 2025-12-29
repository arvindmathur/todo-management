import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmailQueueProcessor } from "@/lib/email/queue-processor";
import { getEmailService } from "@/lib/email/email-service";

/**
 * Test email configuration by sending a test email
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true, email: true }
    });

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // Test email service connection first
    const emailService = getEmailService();
    const connectionTest = await emailService.testConnection();

    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: "Email service configuration error",
        details: connectionTest.error
      });
    }

    // Send test email
    const processor = getEmailQueueProcessor();
    const result = await processor.sendTestEmail(to);

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? "Test email sent successfully" 
        : "Failed to send test email",
      error: result.error
    });

  } catch (error) {
    console.error('Test email error:', error);
    
    return NextResponse.json(
      { 
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}