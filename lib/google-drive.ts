import { google } from 'googleapis';
import { createOAuth2Client, getValidAccessToken, TokenData } from './google-oauth';

/**
 * Upload DOCX file to Google Drive and convert to Google Docs
 */
export async function uploadToGoogleDocs(
  fileBuffer: Buffer,
  fileName: string,
  tokenData: TokenData,
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): Promise<{ success: boolean; docsUrl?: string; error?: string }> {
  try {
    // Get valid access token (auto-refreshes if needed)
    const tokenResult = await getValidAccessToken(
      tokenData,
      supabaseUrl,
      supabaseKey,
      userId
    );

    if (!tokenResult.success || !tokenResult.access_token) {
      throw new Error(tokenResult.error || 'Failed to get valid access token');
    }

    // Create OAuth2 client
    const oauth2Client = createOAuth2Client('');
    oauth2Client.setCredentials({
      access_token: tokenResult.access_token,
      refresh_token: tokenData.refresh_token,
    });

    // Initialize Drive API
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Upload file to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: 'application/vnd.google-apps.document', // Convert to Google Docs
      },
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        body: require('stream').Readable.from(fileBuffer),
      },
      fields: 'id, webViewLink',
    });

    const docsUrl = response.data.webViewLink;

    if (!docsUrl) {
      return {
        success: false,
        error: 'Failed to get Google Docs URL',
      };
    }

    return {
      success: true,
      docsUrl,
    };
  } catch (error) {
    console.error('Error uploading to Google Docs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
