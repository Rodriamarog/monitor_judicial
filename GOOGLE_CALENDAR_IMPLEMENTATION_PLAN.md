Google Calendar Real-Time Two-Way Sync Implementation Plan

 Overview

 Implement Google Calendar integration with real-time two-way sync using webhooks for instant updates when users make changes in either Monitor Judicial or Google Calendar.

 Key Technical Decisions

 Sync Architecture

 - Two-way sync: Changes in Monitor Judicial → Google Calendar AND Google Calendar → Monitor Judicial
 - Real-time updates: Google Calendar Push Notifications (webhooks) + fallback polling every 15 minutes
 - Conflict resolution: Last-write-wins with user notification
 - Event identification: Use Google's iCalUID for cross-platform deduplication

 Important Limitations to Understand

 1. Webhook payload contains NO data - only signals that something changed, we must fetch details via API
 2. Webhook channels expire after ~1 week - need auto-renewal cron job
 3. Webhooks are ~98% reliable - need periodic polling as backup
 4. Access tokens expire after 1 hour - need refresh token management
 5. Sync tokens can be invalidated - must handle 410 errors with full re-sync

 Implementation Phases

 Phase 1: OAuth & Token Management (Week 1)

 Goal: Get users connected to Google Calendar and manage tokens securely

 Files to create/modify:
 - app/auth/google-callback/route.ts - OAuth callback handler
 - lib/google/auth.ts - Token refresh and management utilities
 - supabase/migrations/YYYYMMDD_add_calendar_sync.sql - Database schema

 Database tables:
 - user_google_tokens - Store access/refresh tokens (encrypted)
 - calendar_synchronizations - Track sync state per user
 - calendar_events - Store events with Google mapping

 Tasks:
 1. Configure Google Cloud Project OAuth credentials
 2. Update Supabase Google OAuth with access_type: 'offline' and prompt: 'consent'
 3. Extract and store tokens from OAuth callback
 4. Implement token refresh logic (auto-refresh when <5 min until expiry)
 5. Handle refresh token invalidation (user must re-auth)

 Key code patterns:
 // OAuth flow MUST include these params to get refresh token
 await supabase.auth.signInWithOAuth({
   provider: 'google',
   options: {
     scopes: 'https://www.googleapis.com/auth/calendar.events',
     queryParams: {
       access_type: 'offline',  // CRITICAL
       prompt: 'consent',        // CRITICAL
     },
   },
 });

 ---
 Phase 2: Basic One-Way Sync (Monitor Judicial → Google) (Week 2)

 Goal: Users can create events in Monitor Judicial and they sync to Google Calendar

 Files to create/modify:
 - app/api/calendar/events/route.ts - CRUD API for events
 - app/api/calendar/events/[id]/route.ts - Individual event operations
 - lib/google/calendar-client.ts - Google Calendar API wrapper
 - lib/google/sync-manager.ts - Sync orchestration logic

 Tasks:
 1. Create calendar events table migration
 2. Build CRUD API endpoints for events
 3. Implement Google Calendar API client with auto-token-refresh
 4. When user creates event in Monitor Judicial → create in Google Calendar
 5. Store Google's event ID and iCalUID for future reference
 6. Handle API rate limits with exponential backoff

 Key sync flow:
 // User creates event in Monitor Judicial
 POST /api/calendar/events
 → Insert into calendar_events table (status: 'pending')
 → Call Google Calendar API to create event
 → Store google_event_id and ical_uid
 → Update status to 'synced'

 ---
 Phase 3: Google Calendar Webhooks (Week 3)

 Goal: Receive real-time notifications when users change events in Google Calendar

 Files to create/modify:
 - app/api/google-calendar/webhook/route.ts - Webhook receiver endpoint
 - app/api/google-calendar/connect/route.ts - Initial sync + webhook setup
 - app/api/cron/renew-webhook-channels/route.ts - Auto-renew expiring channels

 Tasks:
 1. Create publicly accessible HTTPS webhook endpoint (must use valid SSL)
 2. Implement webhook channel creation (watch Google Calendar for changes)
 3. Handle webhook POST requests (validate headers, trigger sync)
 4. Implement channel renewal cron job (run daily, renew channels expiring in <2 days)
 5. Store channel metadata (channel_id, resource_id, expiry) in database

 Critical webhook requirements:
 - HTTPS with valid SSL certificate (use ngrok for local dev)
 - Must return 200-level status code
 - Webhook payload is EMPTY - only headers contain metadata
 - Must trigger incremental sync when webhook received

 Webhook headers received:
 X-Goog-Channel-ID: your-channel-uuid
 X-Goog-Resource-State: sync | exists | not_exists
 X-Goog-Resource-ID: google-resource-id

 ---
 Phase 4: Two-Way Incremental Sync (Week 4)

 Goal: Efficiently sync changes from Google Calendar back to Monitor Judicial

 Files to create/modify:
 - Update lib/google/sync-manager.ts - Add incremental sync logic
 - app/api/cron/sync-calendars/route.ts - Fallback polling (every 15 min)

 Tasks:
 1. Implement full sync (initial connection, fetches all events from last 6 months)
 2. Implement incremental sync using Google's sync tokens
 3. Handle sync token invalidation (410 error → trigger full re-sync)
 4. Process Google event changes: detect new/updated/deleted events
 5. Conflict detection: if user edited in both places since last sync
 6. Update local database from Google changes
 7. Set up fallback cron job (catches missed webhooks, runs every 15 min)

 Sync token flow:
 // First sync
 → Fetch all events with calendar.events.list()
 → Store nextSyncToken in database

 // Subsequent syncs
 → Fetch changes with calendar.events.list({ syncToken })
 → Process only changed events
 → Store new syncToken

 // If 410 error (token invalidated)
 → Clear sync token
 → Perform full sync again

 ---
 Phase 5: Conflict Resolution & Polish (Week 5)

 Goal: Handle edge cases, conflicts, and production hardening

 Files to create/modify:
 - components/calendar/conflict-dialog.tsx - UI for resolving conflicts
 - app/api/calendar/resolve-conflict/route.ts - Conflict resolution endpoint

 Tasks:
 1. Detect conflicts (event modified in both places since last sync)
 2. Store conflict data in database (both versions)
 3. Show conflict resolution UI to user
 4. Implement last-write-wins default with manual override option
 5. Add comprehensive error logging
 6. Implement retry logic for failed syncs
 7. Add user settings (enable/disable sync, choose primary calendar)

 Conflict detection logic:
 // Local event was updated after last sync
 const localModified = event.updated_at > event.last_synced_at;

 // Google event has newer timestamp
 const googleModified = googleEvent.updated > event.last_synced_at;

 if (localModified && googleModified) {
   // CONFLICT - both changed since last sync
   await handleConflict(event, googleEvent);
 }

 ---
 Database Schema

 user_google_tokens

 CREATE TABLE user_google_tokens (
   user_id UUID PRIMARY KEY REFERENCES auth.users(id),
   access_token TEXT NOT NULL,
   refresh_token TEXT NOT NULL,
   expires_at TIMESTAMPTZ NOT NULL,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );

 calendar_synchronizations

 CREATE TABLE calendar_synchronizations (
   id UUID PRIMARY KEY,
   user_id UUID REFERENCES auth.users(id),
   calendar_id TEXT NOT NULL, -- Google calendar ID
   sync_token TEXT, -- For incremental sync

   -- Webhook channel
   channel_id UUID, -- Our UUID
   resource_id TEXT, -- Google's resource ID
   channel_expires_at TIMESTAMPTZ,

   sync_status TEXT DEFAULT 'active',
   last_synced_at TIMESTAMPTZ,

   UNIQUE(user_id, calendar_id)
 );

 calendar_events

 CREATE TABLE calendar_events (
   id UUID PRIMARY KEY,
   user_id UUID REFERENCES auth.users(id),

   -- Event data
   title TEXT NOT NULL,
   description TEXT,
   start_time TIMESTAMPTZ NOT NULL,
   end_time TIMESTAMPTZ NOT NULL,

   -- Google mapping
   google_calendar_id TEXT,
   google_event_id TEXT,
   ical_uid TEXT, -- For deduplication
   google_etag TEXT, -- For optimistic locking

   -- Sync state
   sync_status TEXT DEFAULT 'pending',
   last_synced_at TIMESTAMPTZ,
   has_conflict BOOLEAN DEFAULT FALSE,

   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW(),

   UNIQUE(google_calendar_id, google_event_id)
 );

 ---
 API Endpoints (for AI Agent Future Use)

 // List events
 GET /api/calendar/events?start_date=2025-01-01&end_date=2025-01-31

 // Create event (syncs to Google automatically)
 POST /api/calendar/events
 {
   "title": "Audiencia - Caso 00342/2025",
   "start_time": "2025-01-15T10:00:00-07:00",
   "end_time": "2025-01-15T11:00:00-07:00",
   "case_id": "uuid-optional"
 }

 // Update event
 PATCH /api/calendar/events/:id

 // Delete event (soft delete → syncs to Google)
 DELETE /api/calendar/events/:id

 // Trigger manual sync
 POST /api/calendar/sync

 // Check sync status
 GET /api/calendar/sync-status

 ---
 Environment Variables Needed

 # Add to .env.local
 GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
 GOOGLE_CLIENT_SECRET=your-client-secret
 GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google-callback

 # For production
 NEXT_PUBLIC_APP_URL=https://monitor-judicial.vercel.app

 ---
 Cron Jobs Required

 1. Renew webhook channels - Daily at 2am
   - Find channels expiring in <2 days
   - Stop old channel, create new one
   - Update database with new channel info
 2. Fallback sync - Every 15 minutes
   - Find calendars not synced in last 20 min
   - Perform incremental sync
   - Catches missed webhooks
 3. Cleanup stale data - Weekly
   - Delete soft-deleted events >30 days old
   - Clean up orphaned sync records

 ---
 Testing Plan

 Local Development

 - Use ngrok for HTTPS webhook endpoint
 - Separate Google OAuth client for testing
 - Test database for development data

 Test Cases

 - OAuth flow and token storage
 - Token auto-refresh
 - Create event in Monitor Judicial → appears in Google Calendar
 - Create event in Google Calendar → appears in Monitor Judicial
 - Edit event in Monitor Judicial → updates Google Calendar
 - Edit event in Google Calendar → updates Monitor Judicial
 - Delete event → syncs deletion
 - Conflict detection and resolution
 - Webhook channel creation and renewal
 - 410 error handling (sync token invalidation)
 - Rate limit handling
 - Pagination during sync

 ---
 Risks & Mitigations

 Risk 1: Webhook Delivery Failures

 - Impact: Events don't sync in real-time
 - Mitigation: Fallback polling every 15 minutes

 Risk 2: Sync Token Invalidation

 - Impact: Incremental sync fails
 - Mitigation: Catch 410 errors, trigger full re-sync

 Risk 3: Rate Limits

 - Impact: Sync operations fail
 - Mitigation: Exponential backoff, batch operations

 Risk 4: Token Refresh Failures

 - Impact: User disconnected, sync stops
 - Mitigation: Show "reconnect" UI, email notification

 Risk 5: Concurrent Modifications

 - Impact: Data loss or conflicts
 - Mitigation: Optimistic locking with ETags, conflict resolution UI

 ---
 Success Criteria

 - ✅ User can connect Google Calendar with one click
 - ✅ Events created in Monitor Judicial appear in Google Calendar within 2 seconds
 - ✅ Events created in Google Calendar appear in Monitor Judicial within 15 seconds (webhook) or 15 minutes (fallback)
 - ✅ Sync success rate >99%
 - ✅ Conflicts detected and user notified
 - ✅ Webhook channels auto-renew before expiry
 - ✅ Clean error messages for failures

 ---
 Timeline

 - Week 1: OAuth & tokens ✓
 - Week 2: One-way sync (Monitor Judicial → Google) ✓
 - Week 3: Webhooks & real-time notifications ✓
 - Week 4: Two-way incremental sync ✓
 - Week 5: Conflict resolution & production hardening ✓

 Total: 5 weeks to production-ready Google Calendar integration

 ---
 Notes for Future AI Agent Integration

 All calendar APIs are designed to be AI-friendly:
 - Simple REST endpoints
 - Clear function signatures
 - Structured event data
 - No complex state management needed

 AI agent will be able to:
 // "Agregar audiencia el 15 de enero a las 10am"
 await fetch('/api/calendar/events', {
   method: 'POST',
   body: JSON.stringify({
     title: 'Audiencia',
     start_time: '2025-01-15T10:00:00-07:00',
     end_time: '2025-01-15T11:00:00-07:00',
   })
 });
 // Event created in Monitor Judicial + synced to Google Calendar automatically
