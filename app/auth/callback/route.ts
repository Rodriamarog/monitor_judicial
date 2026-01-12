import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // Successfully exchanged code for session
      // Redirect to the dashboard or the next URL
      return NextResponse.redirect(new URL(next, origin))
    }

    // Log error for debugging
    console.error('Auth callback error:', error)
  }

  // If there's an error or no code, redirect to login with error message
  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', 'confirmation_failed')
  return NextResponse.redirect(loginUrl)
}
