import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

interface CalendarResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

function createOAuth2Client(): OAuth2Client | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || clientId === 'placeholder-client-id') {
    logger.warn('Google Calendar credentials not configured - calendar features will be unavailable');
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export const calendarService = {
  getAuthUrl(userId: string): string {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
      return '';
    }
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: userId,
      prompt: 'consent',
    });
  },

  async handleCallback(userId: string, code: string): Promise<CalendarResult> {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) return { success: false, error: 'Calendar not configured' };

    try {
      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.refresh_token) {
        return { success: false, error: 'No refresh token received. Please revoke access and try again.' };
      }

      await prisma.calendarIntegration.upsert({
        where: { userId },
        create: {
          userId,
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token ?? undefined,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          isConnected: true,
          lastSyncAt: new Date(),
        },
        update: {
          refreshToken: tokens.refresh_token,
          accessToken: tokens.access_token ?? undefined,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          isConnected: true,
          lastSyncAt: new Date(),
        },
      });

      logger.info(`Calendar connected for user ${userId}`);
      return { success: true };
    } catch (err: any) {
      logger.error(`Calendar OAuth callback failed for user ${userId}`, { error: err.message });
      return { success: false, error: err.message };
    }
  },

  async getConnectionStatus(userId: string) {
    const integration = await prisma.calendarIntegration.findUnique({ where: { userId } });
    return {
      connected: integration?.isConnected ?? false,
      lastSyncAt: integration?.lastSyncAt ?? null,
    };
  },

  async disconnect(userId: string): Promise<void> {
    await prisma.calendarIntegration.updateMany({
      where: { userId },
      data: { isConnected: false, accessToken: null },
    });
    logger.info(`Calendar disconnected for user ${userId}`);
  },

  async getAuthorizedClient(userId: string): Promise<OAuth2Client | null> {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) return null;

    const integration = await prisma.calendarIntegration.findUnique({ where: { userId } });
    if (!integration || !integration.isConnected || !integration.refreshToken) {
      return null;
    }

    oauth2Client.setCredentials({
      refresh_token: integration.refreshToken,
      access_token: integration.accessToken ?? undefined,
      expiry_date: integration.tokenExpiry?.getTime(),
    });

    // Refresh token if needed
    try {
      if (!integration.tokenExpiry || integration.tokenExpiry < new Date()) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        await prisma.calendarIntegration.update({
          where: { userId },
          data: {
            accessToken: credentials.access_token ?? undefined,
            tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
          },
        });
      }
    } catch (err: any) {
      logger.error(`Token refresh failed for user ${userId}`, { error: err.message });
      // Mark as disconnected if refresh fails (revoked)
      await prisma.calendarIntegration.update({
        where: { userId },
        data: { isConnected: false },
      });
      return null;
    }

    return oauth2Client;
  },

  async createEvent(userId: string, appointmentData: {
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
  }): Promise<CalendarResult> {
    try {
      const authClient = await this.getAuthorizedClient(userId);
      if (!authClient) {
        logger.info(`Calendar not connected for user ${userId} - skipping event creation`);
        return { success: false, error: 'Calendar not connected' };
      }

      const calendar = google.calendar({ version: 'v3', auth: authClient });
      const [year, month, day] = appointmentData.date.split('-').map(Number);
      const [startH, startM] = appointmentData.startTime.split(':').map(Number);
      const [endH, endM] = appointmentData.endTime.split(':').map(Number);

      const startDateTime = new Date(year, month - 1, day, startH, startM).toISOString();
      const endDateTime = new Date(year, month - 1, day, endH, endM).toISOString();

      const event = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: appointmentData.title,
          description: appointmentData.description,
          location: appointmentData.location || 'HealthCare App Clinic',
          start: { dateTime: startDateTime, timeZone: 'Asia/Kolkata' },
          end: { dateTime: endDateTime, timeZone: 'Asia/Kolkata' },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 60 },
            ],
          },
        },
      });

      logger.info(`Calendar event created for user ${userId}: ${event.data.id}`);
      return { success: true, eventId: event.data.id ?? undefined };
    } catch (err: any) {
      logger.error(`Calendar event creation failed for user ${userId}`, { error: err.message });
      return { success: false, error: err.message };
    }
  },

  async updateEvent(userId: string, eventId: string, appointmentData: {
    title?: string;
    description?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
  }): Promise<CalendarResult> {
    try {
      const authClient = await this.getAuthorizedClient(userId);
      if (!authClient) return { success: false, error: 'Calendar not connected' };

      const calendar = google.calendar({ version: 'v3', auth: authClient });
      const updateData: any = {};

      if (appointmentData.title) updateData.summary = appointmentData.title;
      if (appointmentData.description) updateData.description = appointmentData.description;

      if (appointmentData.date && appointmentData.startTime && appointmentData.endTime) {
        const [year, month, day] = appointmentData.date.split('-').map(Number);
        const [startH, startM] = appointmentData.startTime.split(':').map(Number);
        const [endH, endM] = appointmentData.endTime.split(':').map(Number);
        updateData.start = { dateTime: new Date(year, month - 1, day, startH, startM).toISOString(), timeZone: 'Asia/Kolkata' };
        updateData.end = { dateTime: new Date(year, month - 1, day, endH, endM).toISOString(), timeZone: 'Asia/Kolkata' };
      }

      await calendar.events.patch({ calendarId: 'primary', eventId, requestBody: updateData });
      logger.info(`Calendar event ${eventId} updated for user ${userId}`);
      return { success: true, eventId };
    } catch (err: any) {
      logger.error(`Calendar event update failed`, { error: err.message, userId, eventId });
      return { success: false, error: err.message };
    }
  },

  async deleteEvent(userId: string, eventId: string): Promise<CalendarResult> {
    try {
      const authClient = await this.getAuthorizedClient(userId);
      if (!authClient) return { success: false, error: 'Calendar not connected' };

      const calendar = google.calendar({ version: 'v3', auth: authClient });
      await calendar.events.delete({ calendarId: 'primary', eventId });
      logger.info(`Calendar event ${eventId} deleted for user ${userId}`);
      return { success: true };
    } catch (err: any) {
      // Ignore 404 (already deleted)
      if (err.code === 404 || err.status === 404) {
        return { success: true };
      }
      logger.error(`Calendar event deletion failed`, { error: err.message, userId, eventId });
      return { success: false, error: err.message };
    }
  },
};