import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/google-calendar';

/**
 * PATCH - Update calendar event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, start_time, end_time, location } = body;

    // Get existing event
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (start_time !== undefined) {
      if (isNaN(Date.parse(start_time))) {
        return NextResponse.json(
          { error: 'Invalid start_time format' },
          { status: 400 }
        );
      }
      updateData.start_time = start_time;
    }
    if (end_time !== undefined) {
      if (isNaN(Date.parse(end_time))) {
        return NextResponse.json(
          { error: 'Invalid end_time format' },
          { status: 400 }
        );
      }
      updateData.end_time = end_time;
    }
    if (location !== undefined) updateData.location = location;

    // Update in database
    const { data: updatedEvent, error: updateError } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !updatedEvent) {
      console.error('Error updating event:', updateError);
      return NextResponse.json(
        { error: 'Failed to update event', message: updateError?.message },
        { status: 500 }
      );
    }

    // Sync to Google Calendar if event was previously synced
    if (existingEvent.google_event_id && existingEvent.google_calendar_id) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const serviceSupabase = createSupabaseClient(supabaseUrl, supabaseKey);

        // Get user's Google tokens
        const { data: tokens } = await serviceSupabase
          .from('user_google_tokens')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (tokens) {
          const result = await updateCalendarEvent(
            existingEvent.google_event_id,
            {
              title: updatedEvent.title,
              description: updatedEvent.description,
              start_time: updatedEvent.start_time,
              end_time: updatedEvent.end_time,
              location: updatedEvent.location,
            },
            tokens,
            existingEvent.google_calendar_id,
            supabaseUrl,
            supabaseKey,
            user.id
          );

          if (result.success) {
            await serviceSupabase
              .from('calendar_events')
              .update({
                google_etag: result.etag,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
                sync_error: null,
              })
              .eq('id', id);
          } else {
            await serviceSupabase
              .from('calendar_events')
              .update({
                sync_status: 'error',
                sync_error: result.error,
              })
              .eq('id', id);
          }
        }
      } catch (syncError) {
        console.error('Error syncing update to Google Calendar:', syncError);
      }
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Error in PATCH /api/calendar/events/[id]:', error);
    return NextResponse.json(
      {
        error: 'Failed to update event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete calendar event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get existing event
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Soft delete in database
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting event:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete event', message: deleteError.message },
        { status: 500 }
      );
    }

    // Delete from Google Calendar if event was synced
    if (existingEvent.google_event_id && existingEvent.google_calendar_id) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const serviceSupabase = createSupabaseClient(supabaseUrl, supabaseKey);

        // Get user's Google tokens
        const { data: tokens } = await serviceSupabase
          .from('user_google_tokens')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (tokens) {
          await deleteCalendarEvent(
            existingEvent.google_event_id,
            tokens,
            existingEvent.google_calendar_id,
            supabaseUrl,
            supabaseKey,
            user.id
          );
        }
      } catch (syncError) {
        console.error('Error deleting from Google Calendar:', syncError);
        // Don't fail the request if Google Calendar deletion fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/calendar/events/[id]:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
