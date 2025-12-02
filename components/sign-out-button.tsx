'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, Loader2 } from 'lucide-react'

interface SignOutButtonProps {
  isCollapsed?: boolean
}

export function SignOutButton({ isCollapsed = false }: SignOutButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setLoading(true)

    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Button
      variant="outline"
      size={isCollapsed ? "icon" : "sm"}
      className={isCollapsed ? "" : "gap-2 cursor-pointer"}
      onClick={handleSignOut}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {!isCollapsed && <span className="hidden sm:inline">Saliendo...</span>}
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="hidden sm:inline">Salir</span>}
        </>
      )}
    </Button>
  )
}
