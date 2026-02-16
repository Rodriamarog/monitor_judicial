# Collaborator Feature Testing Guide

Complete guide to test the new collaborator authentication and read-only access feature.

## Prerequisites

### 1. Apply Database Migrations

First, apply all the new migrations to your Supabase project:

```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Manual application via Supabase Dashboard
# Go to: SQL Editor in Supabase Dashboard
# Copy/paste each migration file in order:
# 1. 20260216000000_create_collaborators_table.sql
# 2. 20260216000001_add_role_to_user_profiles.sql
# 3. 20260216000002_add_collaborator_rls_policies.sql
# 4. 20260216000003_collaborator_helper_functions.sql
```

### 2. Set Environment Variable

Add the service role key to your `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find it**: Supabase Dashboard → Project Settings → API → `service_role` key (secret)

⚠️ **IMPORTANT**: Never commit this key to version control!

### 3. Verify Email Configuration

Ensure your Resend API key is configured:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

## Testing Phases

---

## Phase 1: Database Verification (5 minutes)

### 1.1 Verify Tables Created

Run in Supabase SQL Editor:

```sql
-- Check collaborators table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'collaborators';

-- Expected columns: id, master_user_id, collaborator_user_id, collaborator_email, status, created_at, updated_at
```

### 1.2 Verify Role Column Added

```sql
-- Check user_profiles has role column
SELECT id, email, role
FROM user_profiles
LIMIT 5;

-- All existing users should have role = 'master'
```

### 1.3 Verify RLS Policies

```sql
-- List all policies on monitored_cases
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('monitored_cases', 'monitored_names', 'alerts', 'case_files', 'collaborators')
ORDER BY tablename, policyname;

-- Should see new "Collaborators can view..." policies
```

### 1.4 Verify Helper Function

```sql
-- Check function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'remove_collaborator_from_assignments';

-- Should return one row
```

---

## Phase 2: End-to-End Invitation Flow (15 minutes)

### 2.1 Master Account Setup

1. **Log in as master account** (your existing account)
2. Navigate to **Settings** or **Colaboradores** section
3. Verify you see the "Invite Collaborator" option

### 2.2 Create Test Case

1. Create a new monitored case:
   - Case number: `TEST-001/2026`
   - Juzgado: `Test Juzgado`
   - Name: `Test Client`

### 2.3 Send Invitation

1. **Invite a collaborator**:
   - Use a real email you can access (e.g., your secondary email or temp email service)
   - Example: `collaborator-test@yourdomain.com`

2. **Verify invitation email sent**:
   - Check inbox for invitation email
   - Verify email has Accept/Reject buttons
   - Note the invitation token in the URL

### 2.4 Assign Collaborator to Case

1. Edit the test case `TEST-001/2026`
2. **Assign the invited collaborator** email to this case
3. Save changes

### 2.5 Accept Invitation

1. **Click "Accept" in invitation email**
2. Should redirect to acceptance confirmation page
3. **Check for credentials email** (CRITICAL TEST):
   - Subject: "Bienvenido a Monitor Judicial - Credenciales de Acceso"
   - Contains: Email and temporary password
   - Contains: "Iniciar Sesión" button

**Expected Database State After Acceptance:**

```sql
-- Verify collaborator record created
SELECT * FROM collaborators
WHERE collaborator_email = 'collaborator-test@yourdomain.com';

-- Verify auth.users account created
SELECT id, email, created_at
FROM auth.users
WHERE email = 'collaborator-test@yourdomain.com';

-- Verify role set correctly
SELECT id, email, role
FROM user_profiles
WHERE email = 'collaborator-test@yourdomain.com';
-- Should show role = 'collaborator'
```

---

## Phase 3: Collaborator Login & Access (15 minutes)

### 3.1 First Login

1. **Log out** from master account
2. **Log in** using credentials from email:
   - Email: `collaborator-test@yourdomain.com`
   - Password: (from credentials email)
3. Login should succeed

### 3.2 Verify Read-Only Banner

1. Navigate to **Dashboard** (Overview page)
2. **EXPECT**: Blue banner at top: "Estás en modo de solo lectura..."
3. Navigate to **Alerts** page
4. **EXPECT**: Same blue banner

### 3.3 Verify Case Visibility

1. Navigate to **Dashboard → Cases** (Overview page showing cases)
2. **EXPECT**:
   - ✅ See `TEST-001/2026` (assigned case)
   - ❌ Do NOT see other master's cases (not assigned)

**Database Verification:**

```sql
-- Run as service role in Supabase Dashboard
-- Set auth.uid() to collaborator's user ID for testing

SELECT * FROM monitored_cases
WHERE user_id = '<master_user_id>';

-- From collaborator's session, should only return assigned cases
```

### 3.4 Verify Alerts Visibility

1. Navigate to **Alerts** page
2. **EXPECT**:
   - ✅ See alerts for `TEST-001/2026`
   - ❌ Do NOT see alerts for unassigned cases

### 3.5 Verify UI Restrictions

#### Cases Table:
- **EXPECT**: No "Agregar Caso" button
- **EXPECT**: No Edit (pencil) icon on rows
- **EXPECT**: No Delete (trash) icon on rows
- **EXPECT**: "Acciones" column header is hidden

#### Monitored Names Table:
- **EXPECT**: No Edit icon
- **EXPECT**: No Delete icon
- **EXPECT**: "Acciones" column header is hidden

#### Alerts Table:
- **EXPECT**: Can expand/collapse alerts (view only)
- **EXPECT**: No delete or edit options

### 3.6 Verify Full Access to Other Features

Navigate to each and verify collaborator CAN access:

- ✅ **Machotes** - Full access
- ✅ **Proyectos** (Kanban) - Full access
- ✅ **Calendario** - Full access
- ✅ **Buscador de Tesis** - Full access
- ✅ **Asistente Legal IA** - Full access
- ✅ **Configuración** - Full access
- ✅ **Ayuda** - Full access
- ✅ **Dashboard** - View assigned data

---

## Phase 4: RLS Policy Testing (10 minutes)

### 4.1 Test Case Isolation

**Setup:**
1. Log back in as **master account**
2. Create second case: `TEST-002/2026`
3. **Do NOT assign** collaborator to this case

**Test:**
1. Log in as **collaborator**
2. Navigate to cases
3. **EXPECT**: See `TEST-001/2026` only
4. **EXPECT**: Do NOT see `TEST-002/2026`

### 4.2 Test Direct API Access (Advanced)

Open browser DevTools → Console and run:

```javascript
// Attempt to fetch all cases (should be filtered by RLS)
const response = await fetch('/api/monitored-cases');
const data = await response.json();
console.log(data);

// EXPECT: Only assigned cases returned, not all master's cases
```

### 4.3 Test Write Operations Blocked

**Attempt to create a case:**

```javascript
// Should fail or be ignored by RLS
const response = await fetch('/api/monitored-cases', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    case_number: 'HACK-001/2026',
    juzgado: 'Test'
  })
});

// EXPECT: 403 Forbidden or empty success (RLS blocks INSERT)
```

---

## Phase 5: Remove Collaborator (5 minutes)

### 5.1 Remove Collaborator

1. Log in as **master account**
2. Navigate to **Colaboradores** settings
3. **Remove** the test collaborator
4. Confirm removal

**Expected Database State:**

```sql
-- Verify collaborator record deleted
SELECT * FROM collaborators
WHERE collaborator_email = 'collaborator-test@yourdomain.com';
-- Should return 0 rows

-- Verify removed from assigned_collaborators
SELECT assigned_collaborators FROM monitored_cases
WHERE case_number = 'TEST-001/2026';
-- Should NOT contain 'collaborator-test@yourdomain.com'
```

### 5.2 Verify Access Revoked

1. Log in as **collaborator** (credentials still work)
2. Navigate to cases
3. **EXPECT**: See ZERO cases (all access revoked)
4. **EXPECT**: Still see read-only banner

---

## Phase 6: Edge Cases & Error Handling (10 minutes)

### 6.1 Existing User Invitation

1. As master, invite an email that already has an account
2. Accept invitation
3. **EXPECT**:
   - No duplicate account created
   - No credentials email sent
   - Existing user added as collaborator
   - Role updated to 'collaborator'

### 6.2 Expired Invitation

1. **Manually expire an invitation** in database:

```sql
UPDATE collaborator_invitations
SET expires_at = now() - interval '1 day'
WHERE collaborator_email = 'test@example.com';
```

2. Click accept link
3. **EXPECT**: "Invitation expired" message

### 6.3 Multiple Master Accounts

**Setup:**
1. Create second master account (Master B)
2. Master B invites same collaborator email
3. Collaborator accepts

**Test:**
1. Log in as collaborator
2. **EXPECT**: See cases from BOTH Master A and Master B
3. Verify isolation: Master A's unassigned cases still hidden

### 6.4 Self-Invitation Prevention

**Test in SQL:**

```sql
-- Attempt to create self-collaboration (should fail)
INSERT INTO collaborators (master_user_id, collaborator_user_id, collaborator_email)
VALUES ('<your_user_id>', '<your_user_id>', 'your@email.com');

-- EXPECT: ERROR: new row violates check constraint
```

---

## Phase 7: Email Testing (5 minutes)

### 7.1 Verify Invitation Email

Check that invitation email contains:
- ✅ Master account name/email
- ✅ Accept button (working link)
- ✅ Reject button (working link)
- ✅ Expiration date
- ✅ Description of Monitor Judicial

### 7.2 Verify Credentials Email

Check that credentials email contains:
- ✅ Collaborator email
- ✅ Temporary password (visible, copiable)
- ✅ "Iniciar Sesión" button (working link)
- ✅ Security warnings
- ✅ Description of read-only access
- ✅ Professional formatting

---

## Troubleshooting

### Issue: Credentials email not sent

**Check:**
```bash
# Verify Resend API key
echo $RESEND_API_KEY

# Check server logs
npm run dev
# Look for: "[Email] Collaborator credentials sent to..."
```

### Issue: RLS not filtering correctly

**Check:**
```sql
-- Verify RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('monitored_cases', 'collaborators');
-- rowsecurity should be TRUE

-- Test policy directly
SET ROLE authenticated;
SET request.jwt.claim.sub = '<collaborator_user_id>';
SELECT * FROM monitored_cases;
```

### Issue: Collaborator sees all cases

**Check:**
```sql
-- Verify role is set correctly
SELECT email, role FROM user_profiles
WHERE email = 'collaborator@example.com';
-- Should be 'collaborator', not 'master'

-- Verify collaborators table entry exists
SELECT * FROM collaborators
WHERE collaborator_email = 'collaborator@example.com';
```

### Issue: Service role key error

**Check:**
```bash
# Verify environment variable loaded
node -e "console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)"

# Restart dev server after adding .env.local
npm run dev
```

---

## Success Criteria Checklist

After completing all tests, verify:

- [✓] Database migrations applied successfully
- [✓] Collaborator account auto-created on invitation acceptance
- [✓] Credentials email delivered and formatted correctly
- [✓] Collaborator can log in with provided credentials
- [✓] Read-only banner displays on dashboard pages
- [✓] Edit/Delete buttons hidden in tables
- [✓] Collaborator sees ONLY assigned cases
- [✓] Collaborator sees ONLY alerts from assigned cases
- [✓] Collaborator CANNOT create/edit/delete cases via UI
- [✓] Collaborator CANNOT create/edit/delete via API (RLS blocks)
- [✓] Collaborator has full access to Machotes, Proyectos, etc.
- [✓] Remove collaborator revokes all access
- [✓] Multiple masters can share same collaborator
- [✓] Existing user invitation doesn't duplicate account

---

## Cleanup After Testing

```sql
-- Remove test collaborator
DELETE FROM collaborators
WHERE collaborator_email LIKE '%test%';

-- Remove test cases
DELETE FROM monitored_cases
WHERE case_number LIKE 'TEST-%';

-- Remove test invitations
DELETE FROM collaborator_invitations
WHERE collaborator_email LIKE '%test%';

-- Optionally remove test auth user
-- (Use Supabase Dashboard → Authentication → Users → Delete)
```

---

## Performance Testing (Optional)

### Test RLS Performance with Many Cases

```sql
-- Create 100 test cases
INSERT INTO monitored_cases (user_id, case_number, juzgado)
SELECT
  '<master_user_id>',
  'PERF-' || generate_series || '/2026',
  'Test Juzgado'
FROM generate_series(1, 100);

-- Assign collaborator to 50 cases
UPDATE monitored_cases
SET assigned_collaborators = '["collaborator@example.com"]'::jsonb
WHERE case_number LIKE 'PERF-%'
AND (random() * 100)::int < 50;

-- Test query performance as collaborator
EXPLAIN ANALYZE
SELECT * FROM monitored_cases;
-- Check if GIN index is used: "Bitmap Index Scan on idx_monitored_cases_assigned_gin"
```

---

## Next Steps

Once all tests pass:

1. **Document the feature** for end users
2. **Train master users** on inviting collaborators
3. **Monitor logs** for errors in production
4. **Set up alerts** for failed credential emails
5. **Consider adding**:
   - Password reset flow documentation
   - Collaborator onboarding email
   - Usage analytics (collaborator login frequency)

---

## Quick Test Script

For rapid testing, use this checklist:

```bash
# 1. Apply migrations
supabase db push

# 2. Set env var
echo "SUPABASE_SERVICE_ROLE_KEY=..." >> .env.local

# 3. Restart dev server
npm run dev

# 4. Test flow (5 minutes):
# - Invite collaborator
# - Check credentials email
# - Login as collaborator
# - Verify read-only banner
# - Verify only assigned cases visible
# - Verify buttons hidden
# - Remove collaborator
# - Verify access revoked
```

That's it! This comprehensive guide should help you test every aspect of the collaborator feature. Start with Phase 1-3 for basic validation, then move to advanced testing in Phases 4-7.
