import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mb-6 text-foreground border-b border-border pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold mb-4 mt-8 text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mb-3 mt-6 text-foreground">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-foreground leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 ml-6 space-y-2 text-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-6 space-y-2 text-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-primary">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-secondary">
              {children}
            </em>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-2 py-1 bg-muted rounded text-sm font-mono text-primary">
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
                <code className="text-sm font-mono text-foreground">
                  {children}
                </code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-4">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-8 border-border" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}