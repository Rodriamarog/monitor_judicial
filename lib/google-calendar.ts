import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET!;

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  location?: string;
}

interface SyncResult {
  success: boolean;
  error?: string;
  eventsAdded?: number;
  eventsUpdated?: number;
  eventsDeleted?: number;
}

/**
 * Create OAuth2 client with credentials
 */
function createOAuth2Client(redirectUri: string): OAuth2Client {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

/**
 * Generate OAuth URL for user authorization
 */
export function getAuthUrl(redirectUri: string, state?: string): string {
  const oauth2Client = createOAuth2Client(redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // CRITICAL: Get refresh token
    prompt: 'consent',       // CRITICAL: Force consent to get refresh token
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: state || '',
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ success: boolean; tokens?: any; error?: string }> {
  try {
    const oauth2Client = createOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return {
        success: false,
        error: 'Failed to get tokens from Google',
      };
    }

    return {
      success: true,
      tokens,
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<{ success: boolean; access_token?: string; error?: string }> {
  try {
    const oauth2Client = createOAuth2Client('');
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      return {
        success: false,
        error: 'No access token in refresh response',
      };
    }

    // Update tokens in database
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString();

    const { error } = await supabase
      .from('user_google_tokens')
      .update({
        access_token: credentials.access_token,
        expires_at: expiresAt,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating tokens in database:', error);
      return {
        success: false,
        error: 'Failed to update tokens in database',
      };
    }

    return {
      success: true,
      access_token: credentials.access_token,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get valid access token (refresh if expired)
 */
async function getValidAccessToken(
  tokenData: TokenData,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<{ success: boolean; access_token?: string; error?: string }> {
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  // Refresh if token expires in less than 5 minutes
  const fiveMinutes = 5 * 60 * 1000;
  if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
    return await refreshAccessToken(
      tokenData.refresh_token,
      supabaseUrl,
      supabaseKey,
      userId
    );
  }

  return {
    success: true,
    access_token: tokenData.access_token,
  };
}

/**
 * Get authenticated Google Calendar client
 */
async function getCalendarClient(
  tokenData: TokenData,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
) {
  const tokenResult = await getValidAccessToken(
    tokenData,
    supabaseUrl,
    supabaseKey,
    userId
  );

  if (!tokenResult.success || !tokenResult.access_token) {
    throw new Error(tokenResult.error || 'Failed to get valid access token');
  }

  const oauth2Client = createOAuth2Client('');
  oauth2Client.setCredentials({
    access_token: tokenResult.access_token,
    refresh_token: tokenData.refresh_token,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Create event in Google Calendar
 */
export async function createCalendarEvent(
  event: CalendarEvent,
  tokenData: TokenData,
  calendarId: string,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<{ success: boolean; eventId?: string; iCalUID?: string; etag?: string; error?: string }> {
  try {
    const calendar = await getCalendarClient(tokenData, supabaseUrl, supabaseKey, userId);

    const googleEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.start_time,
        // Let Google Calendar use the user's calendar timezone
      },
      end: {
        dateTime: event.end_time,
        // Let Google Calendar use the user's calendar timezone
      },
    };

    const response = await calendar.events.insert({
      calendarId: calendarId || 'primary',
      requestBody: googleEvent,
    });

    return {
      success: true,
      eventId: response.data.id || undefined,
      iCalUID: response.data.iCalUID || undefined,
      etag: response.data.etag || undefined,
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update event in Google Calendar
 */
export async function updateCalendarEvent(
  googleEventId: string,
  event: CalendarEvent,
  tokenData: TokenData,
  calendarId: string,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<{ success: boolean; etag?: string; error?: string }> {
  try {
    const calendar = await getCalendarClient(tokenData, supabaseUrl, supabaseKey, userId);

    const googleEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.start_time,
        // Let Google Calendar use the user's calendar timezone
      },
      end: {
        dateTime: event.end_time,
        // Let Google Calendar use the user's calendar timezone
      },
    };

    const response = await calendar.events.update({
      calendarId: calendarId || 'primary',
      eventId: googleEventId,
      requestBody: googleEvent,
    });

    return {
      success: true,
      etag: response.data.etag || undefined,
    };
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete event from Google Calendar
 */
export async function deleteCalendarEvent(
  googleEventId: string,
  tokenData: TokenData,
  calendarId: string,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const calendar = await getCalendarClient(tokenData, supabaseUrl, supabaseKey, userId);

    await calendar.events.delete({
      calendarId: calendarId || 'primary',
      eventId: googleEventId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync events from Google Calendar to local database
 */
export async function syncFromGoogle(
  tokenData: TokenData,
  calendarId: string,
  syncToken: string | null,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<SyncResult> {
  try {
    const calendar = await getCalendarClient(tokenData, supabaseUrl, supabaseKey, userId);
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    let eventsAdded = 0;
    let eventsUpdated = 0;
    let eventsDeleted = 0;
    let newSyncToken: string | null = null;

    // Determine time range for initial sync
    const timeMin = syncToken
      ? undefined
      : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(); // Last 6 months

    const params: any = {
      calendarId: calendarId || 'primary',
    };

    if (syncToken) {
      // When using sync token, don't use singleEvents/orderBy to get deletions
      params.syncToken = syncToken;
    } else {
      // Initial sync - use singleEvents and time range
      params.singleEvents = true;
      params.orderBy = 'startTime';
      params.timeMin = timeMin;
    }

    try {
      const response = await calendar.events.list(params);
      const events = response.data.items || [];
      newSyncToken = response.data.nextSyncToken || null;

      for (const googleEvent of events) {
        if (!googleEvent.id) continue;

        // Check if event was deleted
        if (googleEvent.status === 'cancelled') {
          // Soft delete in our database
          const { error } = await supabase
            .from('calendar_events')
            .update({ deleted_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('google_event_id', googleEvent.id);

          if (!error) eventsDeleted++;
          continue;
        }

        // Check if event exists in our database
        const { data: existingEvent } = await supabase
          .from('calendar_events')
            .select('id')
          .eq('user_id', userId)
          .eq('google_event_id', googleEvent.id)
          .is('deleted_at', null)
          .maybeSingle();

        // For all-day events, Google sends date (YYYY-MM-DD) instead of dateTime
        // We need to preserve date-only format to avoid timezone issues
        const startTime = googleEvent.start?.dateTime || googleEvent.start?.date;
        const endTime = googleEvent.end?.dateTime || googleEvent.end?.date;

        const eventData = {
          user_id: userId,
          title: googleEvent.summary || '(No title)',
          description: googleEvent.description || null,
          start_time: startTime,
          end_time: endTime,
          location: googleEvent.location || null,
          google_calendar_id: calendarId || 'primary',
          google_event_id: googleEvent.id,
          ical_uid: googleEvent.iCalUID,
          google_etag: googleEvent.etag,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
        };

        if (existingEvent) {
          // Update existing event
          const { error } = await supabase
            .from('calendar_events')
            .update(eventData)
            .eq('id', existingEvent.id);

          if (!error) eventsUpdated++;
        } else {
          // Insert new event
          const { error } = await supabase
            .from('calendar_events')
            .insert(eventData);

          if (!error) eventsAdded++;
        }
      }

      // Update sync token in user_profiles
      if (newSyncToken) {
        await supabase
          .from('user_profiles')
          .update({ google_calendar_sync_token: newSyncToken })
          .eq('id', userId);
      }

      return {
        success: true,
        eventsAdded,
        eventsUpdated,
        eventsDeleted,
      };
    } catch (listError: any) {
      // Handle sync token invalidation (410 Gone)
      if (listError.code === 410 || listError.status === 410) {
        // Clear sync token and trigger full re-sync
        await supabase
          .from('user_profiles')
          .update({ google_calendar_sync_token: null })
          .eq('id', userId);

        // Retry without sync token
        return await syncFromGoogle(
          tokenData,
          calendarId,
          null,
          supabaseUrl,
          supabaseKey,
          userId
        );
      }
      throw listError;
    }
  } catch (error) {
    console.error('Error syncing from Google Calendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user's primary calendar info
 * Note: We just use 'primary' as the calendar ID since we only need events scope
 */
export async function getUserCalendarInfo(
  tokenData: TokenData,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<{ success: boolean; email?: string; calendarId?: string; error?: string }> {
  try {
    // We don't need to call calendarList.list() since we only have events scope
    // Just use 'primary' as the calendar ID (this is the user's main calendar)
    return {
      success: true,
      calendarId: 'primary',
    };
  } catch (error) {
    console.error('Error getting calendar info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a watch channel for Google Calendar push notifications
 * Registers a webhook URL to receive notifications when calendar events change
 */
export async function createWatchChannel(
  tokenData: TokenData,
  calendarId: string,
  webhookUrl: string,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<{
  success: boolean;
  channelId?: string;
  resourceId?: string;
  expiration?: number;
  error?: string;
}> {
  try {
    const calendar = await getCalendarClient(tokenData, supabaseUrl, supabaseKey, userId);

    // Generate unique IDs
    const channelId = crypto.randomUUID();
    const channelToken = crypto.randomUUID();

    // Create watch channel with 30-day expiration (maximum allowed)
    const response = await calendar.events.watch({
      calendarId: calendarId || 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: channelToken,
        params: {
          ttl: '2592000', // 30 days in seconds
        },
      },
    });

    const expirationMs = response.data.expiration
      ? parseInt(response.data.expiration)
      : Date.now() + 30 * 24 * 60 * 60 * 1000;

    // Store channel in database
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
    const { error: dbError } = await supabase.from('calendar_watch_channels').insert({
      user_id: userId,
      calendar_id: calendarId || 'primary',
      channel_id: channelId,
      resource_id: response.data.resourceId || '',
      resource_uri: response.data.resourceUri || '',
      channel_token: channelToken,
      expires_at: new Date(expirationMs).toISOString(),
      status: 'active',
    });

    if (dbError) {
      console.error('Error storing watch channel:', dbError);
      return {
        success: false,
        error: `Failed to store channel: ${dbError.message}`,
      };
    }

    return {
      success: true,
      channelId: channelId,
      resourceId: response.data.resourceId || undefined,
      expiration: expirationMs,
    };
  } catch (error) {
    console.error('Error creating watch channel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Stop a watch channel
 * Unregisters a webhook channel from Google Calendar
 */
export async function stopWatchChannel(
  channelId: string,
  resourceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // We need OAuth credentials to stop a channel
    // Use a service client with minimal credentials
    const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId: resourceId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error stopping watch channel:', error);
    // Don't fail if stopping fails - channel will expire naturally
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Renew an expiring watch channel
 * Creates a new channel and stops the old one
 */
export async function renewWatchChannel(
  oldChannelId: string,
  oldResourceId: string,
  tokenData: TokenData,
  calendarId: string,
  webhookUrl: string,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<{ success: boolean; newChannelId?: string; error?: string }> {
  try {
    // Create new channel first
    const newChannel = await createWatchChannel(
      tokenData,
      calendarId,
      webhookUrl,
      supabaseUrl,
      supabaseKey,
      userId
    );

    if (!newChannel.success) {
      return {
        success: false,
        error: `Failed to create new channel: ${newChannel.error}`,
      };
    }

    // Update old channel status to 'stopped' in database
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
    await supabase
      .from('calendar_watch_channels')
      .update({ status: 'stopped' })
      .eq('channel_id', oldChannelId);

    // Try to stop old channel with Google (not critical if it fails)
    await stopWatchChannel(oldChannelId, oldResourceId);

    return {
      success: true,
      newChannelId: newChannel.channelId,
    };
  } catch (error) {
    console.error('Error renewing watch channel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
