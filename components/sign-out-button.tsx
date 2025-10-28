'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function SignOutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setLoading(true)
    console.log('Signing out...')

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Sesión cerrada')
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Error al cerrar sesión')
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleSignOut}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Saliendo...</span>
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </>
      )}
    </Button>
  )
}
