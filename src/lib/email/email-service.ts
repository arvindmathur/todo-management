import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryCount?: number;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private maxRetries = 3;
  private retryDelay = 1000; // Base delay in ms

  constructor(config?: EmailConfig) {
    const emailConfig = config || {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    this.transporter = nodemailer.createTransporter({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
      // Enable TLS/SSL encryption
      tls: {
        rejectUnauthorized: false, // For development
      },
    });
  }

  /**
   * Send email with retry logic and exponential backoff
   */
  async sendEmail(
    to: string,
    template: EmailTemplate,
    options: {
      from?: string;
      retryCount?: number;
      notificationId?: string;
    } = {}
  ): Promise<EmailDeliveryResult> {
    const { from = process.env.SMTP_FROM || 'noreply@todoapp.com', retryCount = 0, notificationId } = options;

    try {
      // Verify transporter configuration on first use
      if (retryCount === 0) {
        await this.verifyConnection();
      }

      const mailOptions = {
        from,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        // Add unsubscribe header for compliance
        headers: {
          'List-Unsubscribe': `<mailto:unsubscribe@todoapp.com?subject=Unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Update notification status if provided
      if (notificationId) {
        await this.updateNotificationStatus(notificationId, 'sent', undefined, retryCount);
      }

      return {
        success: true,
        messageId: info.messageId,
        retryCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Email send attempt ${retryCount + 1} failed:`, errorMessage);

      // Update notification status with error
      if (notificationId) {
        await this.updateNotificationStatus(notificationId, 'failed', errorMessage, retryCount);
      }

      // Retry logic with exponential backoff
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        console.log(`Retrying email send in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.sendEmail(to, template, {
          ...options,
          retryCount: retryCount + 1,
        });
      }

      return {
        success: false,
        error: errorMessage,
        retryCount,
      };
    }
  }

  /**
   * Verify SMTP connection
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
    } catch (error) {
      console.error('SMTP connection verification failed:', error);
      throw new Error('Email service configuration error');
    }
  }

  /**
   * Update email notification status in database
   */
  private async updateNotificationStatus(
    notificationId: string,
    status: 'sent' | 'failed',
    errorMessage?: string,
    retryCount?: number
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        retryCount: retryCount || 0,
        updatedAt: new Date(),
      };

      if (status === 'sent') {
        updateData.sentAt = new Date();
        updateData.errorMessage = null;
      } else if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await prisma.emailNotification.update({
        where: { id: notificationId },
        data: updateData,
      });
    } catch (error) {
      console.error('Failed to update notification status:', error);
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.verifyConnection();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Close the transporter connection
   */
  async close(): Promise<void> {
    this.transporter.close();
  }
}

// Singleton instance for the application
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

// Cleanup on process exit
process.on('beforeExit', async () => {
  if (emailServiceInstance) {
    await emailServiceInstance.close();
  }
});