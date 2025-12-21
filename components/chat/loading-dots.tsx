import { useState, useEffect } from 'react'

export function LoadingDots() {
  const [message, setMessage] = useState('Pensando')

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessage('Buscando tesis relevantes')
    }, 1000) // Switch after 1 second

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex gap-3">
      <div className="bg-muted rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {message}
          </span>
          <span className="flex gap-1">
            <span className="animate-bounce-dot animation-delay-0">.</span>
            <span className="animate-bounce-dot animation-delay-200">.</span>
            <span className="animate-bounce-dot animation-delay-400">.</span>
          </span>
        </div>
      </div>
    </div>
  )
}
