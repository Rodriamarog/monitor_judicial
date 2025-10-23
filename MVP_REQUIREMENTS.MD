# PJBC Legal Case Monitoring SaaS - MVP Requirements

## Project Overview
A SaaS that monitors PJBC court bulletins and sends WhatsApp alerts to lawyers when their cases have updates.

---

## Tech Stack

```
Frontend & Backend: Next.js 14+ (App Router)
Database: Supabase (PostgreSQL)
Notifications: Twilio WhatsApp API
Deployment: Vercel
UI Components: shadcn/ui (built on Radix UI + Tailwind CSS)
Auth: Supabase Auth (Google OAuth + Email/Password)
Language: TypeScript
```

**Dependencies:**
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "@supabase/supabase-js": "^2.38.0",
    "twilio": "^4.20.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.294.0"
  }
}
```

**shadcn/ui Setup:**
```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Add components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add badge
```

---

## Database Schema

**⚠️ IMPORTANT: See the separate "Comprehensive Database Design" document for:**
- Complete schema with all tables
- Indexes and performance optimization
- Row-Level Security policies
- Data integrity constraints
- Query patterns and examples
- Scaling strategy

**Quick reference - main tables:**
- `user_profiles` - User data and subscription info
- `monitored_cases` - Cases each user is tracking
- `bulletin_entries` - Central shared database of all scraped bulletins
- `alerts` - Notifications created when matches are found
- `scrape_log` - Track scraping attempts

---

## Authentication

**Supabase Auth with Multiple Providers:**

1. **Google OAuth** (Primary - best UX)
2. **Email/Password** (Fallback)

**Setup in Supabase Dashboard:**
- Enable Google OAuth provider
- Add authorized redirect URLs
- Get Google OAuth credentials from Google Cloud Console

**Login Flow:**
```typescript
// Google OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});

// Email/Password (fallback)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

---

## Subscription Tiers (Based on Buho Legal)

```typescript
const SUBSCRIPTION_LIMITS = {
  Gratis: {
    max_cases: 5,
    price_mxn: 0
  },
  Premium_50: {
    max_cases: 50,
    price_mxn: 199
  },
  Premium_100: {
    max_cases: 100,
    price_mxn: 399
  },
  Premium_250: {
    max_cases: 250,
    price_mxn: 599
  },
  Premium_500: {
    max_cases: 500,
    price_mxn: 999
  },
  Premium_500: {
    max_cases: 1000,
    price_mxn: 1499
  },
} as const;
```

---

## Core Business Logic

### How It Works

```
1. SCRAPING (Every 30 min, 6am-2pm Tijuana time)
   ↓
   Central database stores ALL bulletins (shared by all users)
   30-day rolling window (old bulletins auto-deleted weekly)

2. USER MONITORING
   ↓
   Each user adds cases they want to track
   Stored in monitored_cases (per-user, isolated by RLS)

3. MATCHING (After each scrape)
   ↓
   New bulletin entries → Check against ALL users' monitored cases
   Create alerts for matches

4. NOTIFICATIONS
   ↓
   Send WhatsApp message immediately to user's phone
   Show in user's dashboard
```

### Data Flow Example

```
Scraper finds: 
  Date: 15/01/2024
  Juzgado: JUZGADO SEXTO CIVIL TIJUANA
  Expediente: 00520/2023
  Plaintiff: LETICIA RAMIREZ HERNANDEZ
  Defendant: SECRETO

User A monitors: case "00520/2023"
User B monitors: party name "LETICIA RAMIREZ"

→ Create 2 alerts (one for User A, one for User B)
→ Send 2 WhatsApp messages
→ Both see alert in their dashboard
```

---

## Scraping Logic - Multi-Scan Strategy

### Problem
Bulletins publish at unpredictable times (sometimes 6am, sometimes 11am, etc.)

### Solution
**Scan every 30 minutes from 6am-2pm Tijuana time until we find today's bulletin**

```typescript
// Vercel Cron: Run every 30 minutes during business hours
// 6:00 AM - 2:00 PM Tijuana time = 1:00 PM - 9:00 PM UTC

// vercel.json
{
  "crons": [
    {
      "path": "/api/scrape",
      "schedule": "0,30 13-21 * * *"
    }
  ]
}
```

### Scraping Logic Flow

```typescript
// /api/scrape logic

const today = new Date().toISOString().split('T')[0];
const sources = ['tijuana', 'mexicali', 'ensenada'];

for (const source of sources) {
  // Check if already scraped today
  const alreadyScraped = await checkScrapeLog(today, source);
  
  if (alreadyScraped.found) {
    continue; // Skip, we already have today's data for this source
  }
  
  // Try to fetch today's bulletin for this source
  const bulletin = await fetchBulletin(today, source);
  
  if (bulletin === 404) {
    // Bulletin not published yet
    logScrapeAttempt(today, source, found: false);
    continue;
  }
  
  // Bulletin found! Parse and store
  const entries = parseBulletin(bulletin, source, today);
  storeEntries(entries);
  logScrapeAttempt(today, source, found: true, entries.length);
  
  // Match and notify
  matchAndSendWhatsApp(entries);
}
```

**Key points:**
- Only scrape **today's date** (not historical data for MVP)
- Track what we've scraped in `scrape_log` table
- If bulletin already found today, skip that source
- Run every 30 min until we find it, then stop checking that source for the day

---

## Bulletin Parsing Logic

**Target URL Pattern:**
```
https://www.pjbc.gob.mx/boletinj/{YEAR}/my_html/{SOURCE_CODE}{YY}{MM}{DD}.htm

Examples:
- ti251014.htm = Tijuana, October 14, 2025
- mx251014.htm = Mexicali, October 14, 2025
- en251014.htm = Ensenada, October 14, 2025
```

**Sources:**
```typescript
const BULLETIN_SOURCES = [
  // Cities (Primera Instancia)
  { code: 'ti', name: 'tijuana', type: 'city' },
  { code: 'mx', name: 'mexicali', type: 'city' },
  { code: 'en', name: 'ensenada', type: 'city' },
  { code: 'te', name: 'tecate', type: 'city' },
  
  // Special Courts
  { code: 'j2', name: 'segunda_instancia', type: 'special' },
  { code: 'jm', name: 'juzgados_mixtos', type: 'special' },
] as const;
```

**Sample Data Structure:**
```
TRIBUNAL LABORAL DE TIJUANA, B.C. 17 DE OCTUBRE DE 2025
INSTR. A (JOSE)    
Acuerdos              
1  00550/2022  SAUL SANTANA YEPIS VS TANIA MARLEN VARGAS GARCIA. ORDINARIO
2  04299/2024  ADRIANAN PALOMARES GOCHE VS SECRETO. EJECUCIÓN
```

**Parsing with Cheerio:**
```typescript
function parseBulletin(html: string, source: string, date: string) {
  const $ = cheerio.load(html);
  const entries = [];
  
  const text = $('body').text();
  const lines = text.split('\n').filter(line => line.trim());

  let currentJuzgado = ''; // "TRIBUNAL LABORAL DE TIJUANA, B.C."

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect juzgado (court name)
    if (trimmed.includes('TRIBUNAL') || trimmed.includes('JUZGADO')) {
      currentJuzgado = trimmed;
      continue;
    }

    // Parse case: "1  00550/2022  PLAINTIFF VS DEFENDANT. TYPE"
    const match = trimmed.match(/^(\d+)\s+(\d+\/\d+)\s+(.+?)\s+VS\s+(.+?)\.\s*(.*)$/i);

    if (match) {
      const [_, entryNum, caseNumber, plaintiff, defendant] = match;

      entries.push({
        bulletin_date: date,
        juzgado: currentJuzgado,
        case_number: caseNumber.trim(),
        plaintiff_name: plaintiff.trim(),
        defendant_name: defendant.trim(), // May be "SECRETO"
        source,
        raw_text: trimmed,
        bulletin_url: buildBulletinURL(date, source)
      });
    }
  }

  return entries;
}

function buildBulletinURL(date: string, source: string): string {
  // date format: "2025-10-17"
  const [year, month, day] = date.split('-');
  const sourceCode = CITIES.find(c => c.name === source)?.code;
  
  return `https://www.pjbc.gob.mx/boletinj/${year}/my_html/${sourceCode}${year.slice(2)}${month}${day}.htm`;
}
```

---

## Matching Logic

**Case Number Matching (Exact):**
```typescript
if (bulletin.case_number === monitored.case_number) {
  await createAlert({
    user_id: monitored.user_id,
    monitored_case_id: monitored.id,
    bulletin_entry_id: bulletin.id,
    matched_on: 'case_number',
    matched_value: bulletin.case_number
  });
}
```

**Party Name Matching (Fuzzy):**
```typescript
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z\s]/g, '') // Remove non-letters
    .trim();
}

// Match against plaintiff
const normalizedMonitored = normalizeName(monitored.party_name);
const normalizedPlaintiff = normalizeName(bulletin.plaintiff_name);

if (normalizedPlaintiff.includes(normalizedMonitored)) {
  await createAlert({
    user_id: monitored.user_id,
    monitored_case_id: monitored.id,
    bulletin_entry_id: bulletin.id,
    matched_on: 'party_name',
    matched_value: bulletin.plaintiff_name
  });
}

// Match against defendant (skip if SECRETO)
if (bulletin.defendant_name !== 'SECRETO') {
  const normalizedDefendant = normalizeName(bulletin.defendant_name);
  
  if (normalizedDefendant.includes(normalizedMonitored)) {
    await createAlert({
      user_id: monitored.user_id,
      monitored_case_id: monitored.id,
      bulletin_entry_id: bulletin.id,
      matched_on: 'party_name',
      matched_value: bulletin.defendant_name
    });
  }
}
```

**Complete Matching Function:**
```typescript
async function matchAndNotify(bulletinEntries: BulletinEntry[]) {
  // Get ALL active monitored cases from ALL users
  const { data: monitoredCases } = await supabase
    .from('monitored_cases')
    .select('*, user_profiles(phone)');

  for (const bulletin of bulletinEntries) {
    for (const monitored of monitoredCases) {
      let matched = false;
      let matchType = '';
      let matchValue = '';

      // Check case number match
      if (monitored.monitor_type === 'case_number' && 
          bulletin.case_number === monitored.case_number) {
        matched = true;
        matchType = 'case_number';
        matchValue = bulletin.case_number;
      }

      // Check party name match
      if (monitored.monitor_type === 'party_name') {
        const normalizedMonitored = normalizeName(monitored.party_name);
        const normalizedPlaintiff = normalizeName(bulletin.plaintiff_name);

        if (normalizedPlaintiff.includes(normalizedMonitored)) {
          matched = true;
          matchType = 'party_name';
          matchValue = bulletin.plaintiff_name;
        } else if (bulletin.defendant_name !== 'SECRETO') {
          const normalizedDefendant = normalizeName(bulletin.defendant_name);
          if (normalizedDefendant.includes(normalizedMonitored)) {
            matched = true;
            matchType = 'party_name';
            matchValue = bulletin.defendant_name;
          }
        }
      }

      if (matched) {
        // Create alert
        const { data: alert } = await supabase
          .from('alerts')
          .insert({
            user_id: monitored.user_id,
            monitored_case_id: monitored.id,
            bulletin_entry_id: bulletin.id,
            matched_on: matchType,
            matched_value: matchValue
          })
          .select()
          .single();

        // Send WhatsApp
        if (alert && monitored.user_profiles?.phone) {
          await sendWhatsAppAlert(monitored.user_profiles.phone, {
            fecha: bulletin.bulletin_date,
            juzgado: bulletin.juzgado,
            expediente: bulletin.case_number,
            alerta: `${bulletin.plaintiff_name} VS ${bulletin.defendant_name}`,
            bulletin_url: bulletin.bulletin_url
          });

          // Mark as sent
          await supabase
            .from('alerts')
            .update({ 
              whatsapp_sent: true,
              sent_at: new Date().toISOString()
            })
            .eq('id', alert.id);
        }
      }
    }
  }
}
```

---

## WhatsApp Notifications (Twilio)

### Setup
1. Sign up for Twilio account
2. Enable WhatsApp sandbox or get approved WhatsApp Business number
3. Get credentials: Account SID, Auth Token, WhatsApp number

### Send WhatsApp Message

```typescript
// lib/notifier.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendWhatsAppAlert(
  toPhone: string,
  alert: {
    fecha: string;
    juzgado: string;
    expediente: string;
    alerta: string;
    bulletin_url: string;
  }
) {
  try {
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${toPhone}`,
      body: `
🔔 *Actualización en tu caso*

📅 Fecha: ${alert.fecha}
⚖️ Juzgado: ${alert.juzgado}
📋 Expediente: ${alert.expediente}
👤 Parte: ${alert.alerta}

Ver boletín completo:
${alert.bulletin_url}
      `.trim()
    });
    
    return { success: true };
  } catch (error) {
    console.error('WhatsApp send failed:', error);
    return { success: false, error: error.message };
  }
}
```

**Important:** Users must have WhatsApp installed and their number must be opted-in to receive messages from your Twilio WhatsApp number (sandbox requirement).

---

## API Routes (MVP Only)

### 1. `/api/scrape` (Cron - Every 30 min)

```typescript
// pages/api/scrape.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Security: Only cron can trigger
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = new Date().toISOString().split('T')[0];
  const sources = ['tijuana', 'mexicali', 'ensenada'];
  let totalEntries = 0;

  for (const source of sources) {
    // Check if already scraped today
    const { data: log } = await supabase
      .from('scrape_log')
      .select('*')
      .eq('bulletin_date', today)
      .eq('source', source)
      .eq('found', true)
      .single();
    
    if (log) continue; // Already scraped today for this source
    
    // Try to scrape
    const url = buildBulletinURL(today, source);
    const response = await axios.get(url, { 
      validateStatus: s => s === 200 || s === 404 
    });
    
    if (response.status === 404) {
      await supabase.from('scrape_log').insert({
        bulletin_date: today,
        source,
        found: false
      });
      continue;
    }
    
    // Parse and store
    const entries = parseBulletin(response.data, source, today);
    
    for (const entry of entries) {
      await supabase.from('bulletin_entries').upsert(entry);
    }
    
    await supabase.from('scrape_log').insert({
      bulletin_date: today,
      source,
      found: true,
      entries_count: entries.length
    });
    
    totalEntries += entries.length;
    
    // Match and notify
    await matchAndNotify(entries);
  }

  return res.json({ success: true, totalEntries });
}
```

### 2. `/api/cases` (Add/List/Delete cases)

**GET** - List user's cases
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data } = await supabase
      .from('monitored_cases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return res.json(data);
  }

  if (req.method === 'POST') {
    // Check subscription limit
    const { count } = await supabase
      .from('monitored_cases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const limit = SUBSCRIPTION_LIMITS[user.subscription_tier].max_cases;
    
    if (count >= limit) {
      return res.status(403).json({ error: 'Case limit reached' });
    }

    const { data } = await supabase
      .from('monitored_cases')
      .insert({
        user_id: user.id,
        case_number: req.body.case_number || null,
        party_name: req.body.party_name || null,
        monitor_type: req.body.case_number ? 'case_number' : 'party_name',
        notes: req.body.notes
      })
      .select()
      .single();

    return res.json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

**DELETE** `/api/cases/[id]`
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;

  await supabase
    .from('monitored_cases')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // Security: ensure user owns this case

  return res.json({ success: true });
}
```

### 3. `/api/alerts` (View alerts)

**GET**
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data } = await supabase
    .from('alerts')
    .select(`
      *,
      monitored_cases(case_number, party_name),
      bulletin_entries(bulletin_date, juzgado, case_number, plaintiff_name, defendant_name, bulletin_url)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return res.json(data);
}
```

---

## Frontend Pages (MVP) - Using shadcn/ui

### 1. Landing `/`

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <h1 className="text-5xl font-bold mb-4">
          Monitorea tus casos del PJBC automáticamente
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Recibe alertas por WhatsApp cuando hay actualizaciones en tus casos
        </p>
        <Button size="lg">Empezar con Google</Button>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Básico</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">$275 MXN</span> / mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>✓ 10 casos monitoreados</li>
                <li>✓ Alertas por WhatsApp</li>
                <li>✓ Dashboard web</li>
              </ul>
              <Button className="w-full mt-4">Empezar</Button>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <Badge className="w-fit">Popular</Badge>
              <CardTitle>Profesional</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">$495 MXN</span> / mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>✓ 100 casos monitoreados</li>
                <li>✓ Alertas por WhatsApp</li>
                <li>✓ Dashboard web</li>
                <li>✓ Soporte prioritario</li>
              </ul>
              <Button className="w-full mt-4">Empezar</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Corporativo</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">$795 MXN</span> / mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>✓ 500 casos monitoreados</li>
                <li>✓ Alertas por WhatsApp</li>
                <li>✓ Dashboard web</li>
                <li>✓ Soporte prioritario</li>
                <li>✓ API access</li>
              </ul>
              <Button className="w-full mt-4">Empezar</Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
```

### 2. `/login`

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>
            Accede a tu cuenta para monitorear tus casos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google OAuth - Primary */}
          <Button className="w-full" variant="outline" size="lg">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              {/* Google icon */}
            </svg>
            Continuar con Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              o
            </span>
          </div>

          {/* Email/Password - Fallback */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="tu@email.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" />
          </div>

          <Button className="w-full">Iniciar sesión</Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <a href="/signup" className="underline">
              Regístrate
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 3. `/signup`

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>
            Empieza a monitorear tus casos hoy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google OAuth - Primary */}
          <Button className="w-full" variant="outline" size="lg">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              {/* Google icon */}
            </svg>
            Registrarse con Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              o
            </span>
          </div>

          {/* Email/Password Form */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="tu@email.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (WhatsApp)</Label>
            <Input id="phone" type="tel" placeholder="+52 664 123 4567" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tier">Plan</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basico">Básico - $275/mes</SelectItem>
                <SelectItem value="profesional">Profesional - $495/mes</SelectItem>
                <SelectItem value="corporativo">Corporativo - $795/mes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full">Crear cuenta</Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <a href="/login" className="underline">
              Inicia sesión
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 4. `/dashboard`

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/