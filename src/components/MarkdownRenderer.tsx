import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert max-w-none academic-content">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mb-6 text-foreground border-b-2 border-primary/30 pb-3 bg-gradient-to-r from-primary/10 to-transparent px-4 py-2 rounded-lg">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold mb-4 mt-8 text-foreground bg-gradient-to-r from-secondary/10 to-transparent px-3 py-2 rounded-lg border-l-4 border-secondary/30">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mb-3 mt-6 text-foreground bg-gradient-to-r from-accent/10 to-transparent px-3 py-1 rounded-md">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-foreground leading-relaxed text-base">
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
            <li className="text-foreground flex items-start space-x-2">
              <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-primary bg-primary/10 px-1 py-0.5 rounded">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-secondary bg-secondary/10 px-1 py-0.5 rounded">
              {children}
            </em>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-2 py-1 bg-muted/50 rounded-md text-sm font-mono text-primary border border-primary/20">
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-gradient-to-r from-muted/50 to-muted/30 p-4 rounded-xl overflow-x-auto mb-4 border border-border/30 shadow-lg">
                <code className="text-sm font-mono text-foreground">
                  {children}
                </code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground mb-4 bg-gradient-to-r from-primary/5 to-transparent py-2 rounded-r-lg">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-8 border-border/50 bg-gradient-to-r from-transparent via-border to-transparent h-px" />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse border border-border/30 rounded-lg overflow-hidden shadow-lg">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-primary/10 text-primary-foreground font-semibold px-4 py-3 text-left border border-border/30">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 border border-border/30 bg-card/50">
              {children}
            </td>
          ),
          a: ({ children, href }) => (
            <a 
              href={href} 
              className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary transition-all duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}