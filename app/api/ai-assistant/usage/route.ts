import { createClient } from '@/lib/supabase/server'
import { resolveMasterUserId } from '@/lib/ai/resolve-master-user'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const masterUserId = await resolveMasterUserId(supabase, user.id)

    const { data } = await supabase
      .from('ai_daily_usage')
      .select('message_count')
      .eq('master_user_id', masterUserId)
      .eq('usage_date', new Date().toISOString().split('T')[0])
      .maybeSingle()

    const used = data?.message_count ?? 0
    const limit = 50

    return Response.json({ used, limit, remaining: limit - used })
  } catch (error) {
    console.error('AI usage GET error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
