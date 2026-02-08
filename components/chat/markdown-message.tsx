import { memo, useMemo } from 'react'
import { Streamdown } from 'streamdown'

interface MarkdownMessageProps {
  content: string
  role: 'user' | 'assistant'
  onTesisClick?: (tesisId: number) => void
  lazy?: boolean // For lazy loading with virtual scrolling
  isStreaming?: boolean // Whether this message is currently being streamed
}

export const MarkdownMessage = memo(function MarkdownMessage({
  content,
  role,
  onTesisClick,
  lazy = false,
  isStreaming = false
}: MarkdownMessageProps) {
  if (role === 'user') {
    return <div className="whitespace-pre-wrap">{content}</div>
  }

  // Lazy loading optimization: render simple placeholder for off-screen items
  // Note: With virtual scrolling, this component won't even mount for far off-screen items
  if (lazy && content.length > 1000) {
    return <div className="h-20 bg-muted/20 rounded animate-pulse" />
  }

  // Memoize regex processing to avoid recomputation on every render
  const processedContent = useMemo(() =>
    onTesisClick
      ? content.replace(/\[ID:\s*(\d+)\]/g, '[$1](#tesis-$1)')
      : content,
    [content, onTesisClick]
  )

  return (
    <Streamdown
      className="prose prose-sm dark:prose-invert max-w-none"
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        a: ({ href, children }) => {
          // Handle tesis ID links
          if (href?.startsWith('#tesis-') && onTesisClick) {
            const tesisId = parseInt(href.replace('#tesis-', ''))
            return (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onTesisClick(tesisId)
                }}
                className="text-primary hover:underline cursor-pointer font-medium"
              >
                [ID: {children}]
              </button>
            )
          }
          // Regular links
          return <a href={href} className="text-primary hover:underline">{children}</a>
        },
        code: ({ node, ...props }: any) =>
          props.inline ? (
            <code className="bg-muted px-1 py-0.5 rounded text-sm">{props.children}</code>
          ) : (
            <code className="block bg-muted p-2 rounded text-sm overflow-x-auto">{props.children}</code>
          ),
      }}
    >
      {processedContent}
    </Streamdown>
  )
})
