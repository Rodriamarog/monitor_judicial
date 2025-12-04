import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET!;

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope?: string;
}

/**
 * Create OAuth2 client with credentials
 */
export function createOAuth2Client(redirectUri: string): OAuth2Client {
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
      'https://www.googleapis.com/auth/calendar', // Full calendar access (read/write)
      'https://www.googleapis.com/auth/drive.file', // Create and access own files in Drive
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
export async function getValidAccessToken(
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
 * Verify if token has required scopes
 */
export function hasRequiredScopes(
  tokenScope: string,
  requiredScopes: string[]
): boolean {
  if (!tokenScope) return false;
  const scopes = tokenScope.split(' ');
  return requiredScopes.every(required => scopes.includes(required));
}

/**
 * Check if user has Calendar scope
 */
export async function hasCalendarScope(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<boolean> {
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .from('user_google_tokens')
    .select('scope')
    .eq('user_id', userId)
    .maybeSingle();

  return hasRequiredScopes(data?.scope || '', [
    'https://www.googleapis.com/auth/calendar'
  ]);
}

/**
 * Check if user has Drive scope
 */
export async function hasDriveScope(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<boolean> {
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .from('user_google_tokens')
    .select('scope')
    .eq('user_id', userId)
    .maybeSingle();

  return hasRequiredScopes(data?.scope || '', [
    'https://www.googleapis.com/auth/drive.file'
  ]);
}
