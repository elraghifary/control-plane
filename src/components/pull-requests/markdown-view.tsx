import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="text-sm text-muted-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mb-2 text-base font-medium text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 text-sm font-medium text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1.5 text-sm font-medium text-foreground">{children}</h3>,
          p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="cursor-pointer text-instrument underline hover:no-underline">
              {children}
            </a>
          ),
          code: ({ className, children }) =>
            className ? (
              <code className="block overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-foreground">{children}</code>
            ) : (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">{children}</code>
            ),
          pre: ({ children }) => <pre className="mb-2 whitespace-pre-wrap">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="relative mb-2 border-l-2 border-border pl-3 italic">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
