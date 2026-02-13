# Testing Guide: Notification Changes

This guide walks you through testing both notification changes before deploying to production.

## 🔧 Prerequisites

### 1. Install Dependencies

For the Hetzner deployment (Tribunal email):
```bash
cd hetzner/tribunal_scraper
npm install
cd ../..
```

For the main app (WhatsApp simplification):
```bash
npm install
```

### 2. Check Environment Variables

Make sure you have these in your `.env.local`:

```bash
# Required for both tests
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Required for Tribunal email test
RESEND_API_KEY=your_resend_api_key

# Required for WhatsApp test
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_ALERT_TEMPLATE_SID=your_template_sid
```

---

## 🧪 Test 1: Tribunal Electrónico Email Notifications

### What This Tests
- New email notification system for Tribunal documents
- Checks that emails are sent with green gradient header
- Includes AI summary in the email
- Respects user's email preferences

### Run the Test
```bash
npx tsx scripts/test-tribunal-email.ts
```

### Expected Output
```
🧪 Testing Tribunal Electrónico Email Notifications

✅ RESEND_API_KEY found
📧 Found 3 active tribunal user(s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Testing email for: user@example.com
✅ Email sent successfully!
   Status: sent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Test completed!
📧 Attempted to send emails to 3 user(s)

💡 Check your inbox for test emails with green gradient header
```

### What to Check
1. ✅ Check your inbox for test email
2. ✅ Email should have **green gradient header** (different from purple bulletin emails)
3. ✅ Subject: "📄 Nuevo documento en caso 12345/2025"
4. ✅ Body includes:
   - Expediente number
   - Juzgado name
   - Document description
   - AI summary in highlighted green box
   - Link to dashboard
5. ✅ Plain text version also present

### Troubleshooting

**"RESEND_API_KEY not configured"**
- Add `RESEND_API_KEY` to your `.env.local`
- Get key from Resend dashboard

**"No active tribunal users found"**
- This is normal if you haven't run tribunal scraper yet
- You can manually add a test user to `tribunal_credentials` table with `status='active'`

**"Usuario sin perfil" or "no_profile"**
- User needs a record in `user_profiles` table
- Make sure `user_profiles.email_notifications_enabled = true`

---

## 🧪 Test 2: Simplified WhatsApp (Boletín Judicial)

### What This Tests
- WhatsApp messages now say "por BOLETIN JUDICIAL" instead of listing juzgados
- Tests both single and multiple case alerts
- Verifies cleaner message format

### Run the Test
```bash
npx tsx scripts/test-simplified-whatsapp.ts
```

### Expected Output
```
🧪 Testing Simplified WhatsApp Juzgado List (Boletín Judicial)

📱 Testing with user: user@example.com
   Phone: +5216641234567
   Name: John Doe

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 1: Single Case Alert
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Single case alert sent successfully!
   Message ID: SM12345...
   📝 Expected template variable {{2}}: "BOLETIN JUDICIAL"
   📝 Should NOT contain: "PRIMER JUZGADO CIVIL..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 2: Multiple Cases Alert
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Multiple cases alert sent successfully!
   Message ID: SM67890...
   📝 Expected template variable {{2}}: "BOLETIN JUDICIAL"
   📝 Should NOT contain messy juzgado list
   📝 Much cleaner message format! ✨

✅ Test completed!

💡 Check your WhatsApp messages:
   - Both should say "por BOLETIN JUDICIAL"
   - Should NOT list individual juzgado names
   - Message should look much cleaner!
```

### What to Check

**Test 1 Message (Single Case):**
```
Hay una nueva actualización en tu caso 12345/2025
por BOLETIN JUDICIAL
en Tijuana
el 13/02/2026.
Puedes revisar la actualización en tu dashboard en la seccion de 'Alertas'.
```

**Test 2 Message (Multiple Cases):**
```
Hay una nueva actualización en tu 3 casos: 12345/2025, 67890/2025, 11111/2025
por BOLETIN JUDICIAL
en Tijuana, Mexicali, Tecate
el 13/02/2026.
Puedes revisar la actualización en tu dashboard en la seccion de 'Alertas'.
```

### Comparison

**❌ Old Format (Messy):**
```
por PRIMER JUZGADO CIVIL DE TIJUANA, B.C. | SEGUNDO JUZGADO CIVIL DE MEXICALI, B.C. | JUZGADO MIXTO DE TECATE, B.C.
```

**✅ New Format (Clean):**
```
por BOLETIN JUDICIAL
```

### Troubleshooting

**"No user with WhatsApp enabled found"**
- Go to your dashboard settings
- Enable WhatsApp notifications
- Add a valid phone number

**"Twilio API error"**
- Check `TWILIO_WHATSAPP_ALERT_TEMPLATE_SID` is correct
- Verify Twilio account is active
- Check WhatsApp sender number is approved

---

## 📋 Test Checklist

Before deploying, verify:

### Tribunal Email
- [ ] Test email received successfully
- [ ] Green gradient header visible
- [ ] AI summary displayed in green box
- [ ] Links to dashboard work
- [ ] Plain text version readable
- [ ] Respects `email_notifications_enabled` setting

### Simplified WhatsApp
- [ ] Single case says "por BOLETIN JUDICIAL"
- [ ] Multiple cases say "por BOLETIN JUDICIAL" (not list)
- [ ] Message looks cleaner than before
- [ ] Location info still shown correctly
- [ ] Dashboard still shows full juzgado details

---

## 🚀 Ready to Deploy

Once all tests pass:

### 1. For Main App (WhatsApp change)
```bash
git add .
git commit -m "Simplify WhatsApp juzgado list to 'BOLETIN JUDICIAL'"
git push
```

Vercel will auto-deploy.

### 2. For Hetzner (Tribunal email)
```bash
cd hetzner/tribunal_scraper
# Build and deploy to Hetzner
# (Follow your existing Hetzner deployment process)
```

Make sure to add `RESEND_API_KEY` to Hetzner environment variables!

---

## 🐛 Common Issues

### Email not sending
- Check `RESEND_API_KEY` is valid
- Verify sender email domain is verified in Resend
- Check Resend logs for delivery issues

### WhatsApp not sending
- Verify Twilio sandbox is approved (for testing)
- Check WhatsApp template is approved
- Ensure phone numbers are in E.164 format

### Wrong template variable values
- Check `lib/whatsapp.ts` lines 78-96
- Verify template SID matches approved template
- Test with Twilio console first

---

## 📞 Support

If tests fail, check:
1. Environment variables are correct
2. Database tables have required columns
3. User profiles have correct settings
4. Twilio/Resend accounts are active

Good luck! 🎉
