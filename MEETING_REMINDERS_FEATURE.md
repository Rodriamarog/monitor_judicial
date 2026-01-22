# WhatsApp Meeting Reminders Feature

## Overview

The WhatsApp bot can now create calendar meetings and send SMS/WhatsApp reminders 24 hours before the meeting to both the lawyer and their client.

## Features

### 1. Meeting Creation via WhatsApp
Users can schedule meetings by sending natural language commands like:
- "Agrega a mi agenda para el 10 de febrero reunion con la cliente Laura Gomez a las 5pm"
- "Agendar reunion con Juan Perez mañana a las 3pm"
- "Programa una junta el viernes 14 a las 10am con Maria Lopez"

### 2. Smart Client Detection
- Bot searches for the client in your cases using fuzzy matching
- Shows case details (expediente, balance) when found
- Handles typos and partial names

### 3. Phone Number Validation
- Checks if client has phone number registered
- Warns if client won't receive reminder
- Still creates reminder for lawyer if lawyer has phone

### 4. Automated SMS Reminders
- Sent 24 hours before meeting
- Goes to both lawyer and client (if phone available)
- Message format:
  - **Lawyer:** "Recordatorio de reunión mañana a las 5:00pm con Laura Gomez"
  - **Client:** "Recordatorio de reunión mañana a las 5:00pm con {Lawyer Name}"

---

## Technical Implementation

### Database Schema

**`meeting_reminders` Table:**
```sql
- id: UUID
- calendar_event_id: References calendar_events
- case_id: References monitored_cases (optional)
- user_id: References auth.users
- lawyer_name: TEXT (from user_profiles.full_name)
- lawyer_phone: TEXT (from user_profiles.phone)
- client_name: TEXT (from case.nombre)
- client_phone: TEXT (from case.telefono)
- meeting_time: TIMESTAMPTZ
- reminder_message: TEXT
- scheduled_for: TIMESTAMPTZ (24h before meeting)
- status: 'pending' | 'sent' | 'failed' | 'cancelled'
- lawyer_sent_at: TIMESTAMPTZ
- client_sent_at: TIMESTAMPTZ
- error_message: TEXT
```

### WhatsApp Functions

**New Functions:**
1. `create_meeting` - Creates calendar event + optional reminder
2. `check_client_phone` - Validates client has phone number

**Parameters for `create_meeting`:**
```typescript
{
  title: string,              // "Reunión con Laura Gomez"
  client_case_id?: string,    // UUID of case (optional)
  start_time: string,         // ISO 8601: "2026-02-10T17:00:00"
  duration_minutes: number,   // 60 (default)
  create_reminder: boolean    // true/false
}
```

### Gemini AI Enhancements

**Updated SYSTEM_PROMPT:**
- Added meeting management capabilities
- Natural date parsing (e.g., "mañana", "10 de febrero")
- Smart confirmation flow for phone number validation

**Conversation Flow:**
1. User: "Agrega a mi agenda reunion con Laura Gomez el 10 de febrero a las 5pm"
2. Bot: Searches for "Laura Gomez" case
3. Bot: "Encontré el caso de LAURA GOMEZ PEREZ (Expediente: 00123/2024). ¿Quieres que te enviemos un recordatorio 24 horas antes?"
4. User: "Sí"
5. Bot: Checks if Laura has phone number
6. Bot (if no phone): "⚠️ Laura Gomez no tiene teléfono registrado. Para enviar recordatorios, agrega el teléfono en la plataforma."
7. Bot: Creates meeting + reminder for lawyer only

---

## Cron Job Setup

### API Route
`/api/cron/send-meeting-reminders`

**What it does:**
1. Finds all pending reminders where `scheduled_for <=  now()`
2. Sends WhatsApp message to lawyer (if phone available)
3. Sends WhatsApp message to client (if phone available)
4. Updates status to 'sent' or 'failed'
5. Logs errors

### Vercel Cron Limitation
You're on **Vercel Free Tier** (1 cron job only), already used for `check-new-juzgados`.

### Solution Options:

**Option A: GitHub Actions (Recommended)**
Create `.github/workflows/send-reminders.yml`:
```yaml
name: Send Meeting Reminders

on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call reminder API
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://monitorjudicial.com/api/cron/send-meeting-reminders
```

**Option B: External Cron Service**
Use a free service like:
- cron-job.org
- EasyCron
- Uptime Robot (monitoring with webhook)

Set it to call: `https://monitorjudicial.com/api/cron/send-meeting-reminders`
With header: `Authorization: Bearer YOUR_CRON_SECRET`

**Option C: Supabase Edge Functions (Future)**
Create Supabase Edge Function with pg_cron trigger.

---

## Setup Instructions

### 1. Add Lawyer Full Name to User Profiles

Users need to add their full name during signup or in settings.

**Migration (already applied):**
- `user_profiles.full_name` column exists
- Used in reminder messages to clients

**TODO for you:**
- Add a profile settings page where users can update `full_name`
- OR add it to the signup flow
- Validate: required field, min 3 characters

### 2. Configure Cron Job

Choose one of the options above and set up the cron job to run every **30 minutes** or **hourly**.

**Environment Variable Needed:**
```bash
CRON_SECRET=your-secret-here  # Already exists
```

### 3. Test the Feature

**Test Meeting Creation:**
```
Send to WhatsApp bot:
"Agrega a mi agenda reunion con [CLIENT NAME] el 25 de enero a las 3pm"
```

**Expected Response:**
```
✅ Reunión agendada exitosamente

*Reunión con [CLIENT NAME]*
Cliente: [FULL CLIENT NAME]
Expediente: 00123/2024
Fecha: sábado, 25 de enero de 2026
Hora: 15:00 - 16:00

📱 Recordatorio programado para ti un día antes.

⚠️ [CLIENT NAME] no tiene teléfono registrado, no recibirá recordatorio.
```

**Verify in Database:**
```sql
SELECT * FROM calendar_events WHERE user_id = 'your-user-id' ORDER BY created_at DESC LIMIT 1;
SELECT * FROM meeting_reminders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1;
```

**Test Reminder Sending:**
```bash
# Manually trigger the cron job
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://monitorjudicial.com/api/cron/send-meeting-reminders
```

---

## Usage Examples

### Example 1: Meeting with Client (Has Phone)
```
User: "Agenda reunion con Maria Lopez el lunes 27 a las 10am"

Bot: *Caso encontrado:*
MARIA GUADALUPE LOPEZ SANCHEZ
Expediente: 00456/2024
Balance actual: $2,500.00 USD

¿Quieres que te enviemos un recordatorio 24 horas antes?

User: "Si"

Bot: ✅ Reunión agendada exitosamente

*Reunión con Maria Lopez*
Cliente: MARIA GUADALUPE LOPEZ SANCHEZ
Expediente: 00456/2024
Fecha: lunes, 27 de enero de 2026
Hora: 10:00 - 11:00

📱 Recordatorios programados para ti y Maria Guadalupe Lopez Sanchez (+52 664 123 4567) un día antes.
```

### Example 2: Meeting without Client
```
User: "Agendar junta interna el martes 28 a las 2pm"

Bot: ✅ Reunión agendada exitosamente

*Junta interna*
Fecha: martes, 28 de enero de 2026
Hora: 14:00 - 15:00

📱 Recordatorio programado para ti un día antes.
```

### Example 3: Client without Phone
```
User: "Reunion con Juan Perez el 30 de enero a las 4pm"

Bot: *Caso encontrado:*
JUAN CARLOS PEREZ RODRIGUEZ
Expediente: 00789/2024
Balance actual: $1,200.00 MXN

¿Quieres que te enviemos un recordatorio 24 horas antes?

User: "Si"

Bot: ✅ Reunión agendada exitosamente

*Reunión con Juan Perez*
Cliente: JUAN CARLOS PEREZ RODRIGUEZ
Expediente: 00789/2024
Fecha: jueves, 30 de enero de 2026
Hora: 16:00 - 17:00

📱 Recordatorio programado para ti un día antes.

⚠️ Juan Carlos Perez Rodriguez no tiene teléfono registrado, no recibirá recordatorio.
```

---

## Files Modified

### New Files:
1. `/app/api/cron/send-meeting-reminders/route.ts` - Cron job API endpoint
2. `MEETING_REMINDERS_FEATURE.md` - This documentation

### Modified Files:
1. `/lib/whatsapp-functions.ts`
   - Added `handleCreateMeeting()`
   - Added `handleCheckClientPhone()`
   - Updated function dispatcher

2. `/lib/gemini.ts`
   - Added `create_meeting` tool to geminiTools
   - Added `check_client_phone` tool to geminiTools
   - Added tools to openaiTools (fallback)
   - Updated SYSTEM_PROMPT with meeting management instructions

3. `/app/api/calendar/events/[id]/route.ts`
   - Removed Google Calendar integration
   - Removed `@/lib/google-calendar` import
   - Simplified PATCH and DELETE handlers

### Database Migrations:
1. `create_meeting_reminders_table` - Reminders table with RLS
2. `create_send_meeting_reminders_function` - Cleanup function
3. `remove_google_calendar_integration` - Removed Google Calendar columns

---

## Monitoring & Debugging

### Check Pending Reminders
```sql
SELECT
  mr.*,
  ce.title,
  ce.start_time,
  up.full_name as lawyer_name,
  mc.nombre as client_name
FROM meeting_reminders mr
JOIN calendar_events ce ON ce.id = mr.calendar_event_id
JOIN user_profiles up ON up.id = mr.user_id
LEFT JOIN monitored_cases mc ON mc.id = mr.case_id
WHERE mr.status = 'pending'
ORDER BY mr.scheduled_for ASC;
```

### Check Failed Reminders
```sql
SELECT * FROM meeting_reminders
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Recent Sent Reminders
```sql
SELECT * FROM meeting_reminders
WHERE status = 'sent'
ORDER BY lawyer_sent_at DESC
LIMIT 10;
```

### API Logs
Check Vercel logs for:
- "Found X reminders to send"
- "Sent lawyer reminder for meeting X"
- "Sent client reminder for meeting X"
- Errors from Twilio API

---

## Next Steps

1. **Add User Profile Settings Page**
   - Allow users to update `full_name`
   - Validate phone number format
   - Show WhatsApp opt-in status

2. **Setup Cron Job**
   - Choose GitHub Actions, external service, or Supabase Edge Functions
   - Test it sends reminders correctly

3. **Add Reminder Management**
   - View upcoming reminders in dashboard
   - Cancel/edit reminders
   - Resend failed reminders

4. **Analytics**
   - Track reminder delivery rates
   - Monitor which clients have missing phones
   - Show calendar in dashboard with reminder status

5. **Enhanced Features (Future)**
   - Multiple reminders (24h, 1h before)
   - Custom reminder times
   - Email reminders as fallback
   - Recurring meetings
   - Meeting notes/outcomes

---

## Testing Checklist

- [ ] Create meeting with existing client (has phone)
- [ ] Create meeting with existing client (no phone)
- [ ] Create meeting without client
- [ ] Verify reminder created in DB with correct `scheduled_for`
- [ ] Manually trigger cron job
- [ ] Verify lawyer receives WhatsApp reminder
- [ ] Verify client receives WhatsApp reminder (if phone)
- [ ] Check reminder status updated to 'sent'
- [ ] Test typo tolerance: "Mria Lopez" → finds "Maria Lopez"
- [ ] Test natural dates: "mañana", "próximo lunes", "15 de febrero"
- [ ] Test without lawyer phone number
- [ ] Check failed reminders logging

---

## Summary

✅ **WhatsApp bot can now:**
- Create calendar meetings via natural language
- Associate meetings with client cases
- Check if client has phone for reminders
- Schedule SMS/WhatsApp reminders 24h before

✅ **Database ready:**
- `meeting_reminders` table created
- Indexes for performance
- RLS policies configured

✅ **API ready:**
- `/api/cron/send-meeting-reminders` endpoint
- Twilio integration for SMS
- Error handling and logging

✅ **Removed:**
- All Google Calendar integration code
- Google Calendar columns from database
- @/lib/google-calendar imports

⚠️ **Still needed:**
1. User profile settings to add/update `full_name`
2. Cron job setup (GitHub Actions or external service)
3. Testing with real meetings

The feature is fully implemented and ready to use once the cron job is configured!
