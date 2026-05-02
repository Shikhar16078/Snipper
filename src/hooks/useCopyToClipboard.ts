import { useState, useCallback, useRef, useEffect } from 'react'
import { writeToClipboard } from '../utils/clipboard'

export function useCopyToClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(
    async (text: string) => {
      try {
        await writeToClipboard(text)
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        
        setCopied(true)
        timeoutRef.current = setTimeout(() => {
          setCopied(false)
          timeoutRef.current = null
        }, resetMs)
      } catch {
        // clipboard write failed silently
      }
    },
    [resetMs],
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { copy, copied }
}
