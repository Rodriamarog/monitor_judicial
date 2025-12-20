import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'

interface MarkdownMessageProps {
  content: string
  role: 'user' | 'assistant'
}

export function MarkdownMessage({ content, role }: MarkdownMessageProps) {
  if (role === 'user') {
    return <div className="whitespace-pre-wrap">{content}</div>
  }

  return (
    <ReactMarkdown
      className="prose prose-sm dark:prose-invert max-w-none"
      rehypePlugins={[rehypeHighlight]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        code: ({ inline, children }) =>
          inline ? (
            <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>
          ) : (
            <code className="block bg-muted p-2 rounded text-sm overflow-x-auto">{children}</code>
          ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
