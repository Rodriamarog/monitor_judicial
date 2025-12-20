import { useEffect, useRef, useState } from 'react'

export function useMessageAnimation(messageCount: number) {
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null)
  const prevCountRef = useRef(messageCount)

  useEffect(() => {
    if (messageCount > prevCountRef.current) {
      // New message added - animate the last one
      setAnimatingIndex(messageCount - 1)

      // Remove animation class after animation completes
      const timeout = setTimeout(() => {
        setAnimatingIndex(null)
      }, 500) // Match animation duration

      prevCountRef.current = messageCount

      return () => clearTimeout(timeout)
    }
    prevCountRef.current = messageCount
  }, [messageCount])

  return animatingIndex
}
