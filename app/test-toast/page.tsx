'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function TestToastPage() {
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Loading States & Toasts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Toast Notifications */}
          <div className="space-y-2">
            <p className="font-semibold">Toast Notifications:</p>
            <div className="flex gap-2">
              <Button onClick={() => toast.success('Success toast!')}>
                Success
              </Button>
              <Button onClick={() => toast.error('Error toast!')}>
                Error
              </Button>
              <Button onClick={() => toast('Info toast!')}>
                Info
              </Button>
            </div>
          </div>

          {/* Test Loading State */}
          <div className="space-y-2">
            <p className="font-semibold">Loading State:</p>
            <Button
              onClick={() => {
                console.log('Button clicked, setting loading to true')
                setLoading(true)
                setTimeout(() => {
                  console.log('Setting loading to false')
                  setLoading(false)
                  toast.success('Loading complete!')
                }, 2000)
              }}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading...</span>
                </span>
              ) : (
                'Click to Test Loading'
              )}
            </Button>
          </div>

          {/* Debug Info */}
          <div className="text-xs text-muted-foreground border-t pt-4">
            <p>Loading state: {loading ? 'TRUE' : 'FALSE'}</p>
            <p>Open browser console (F12) to see debug logs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
