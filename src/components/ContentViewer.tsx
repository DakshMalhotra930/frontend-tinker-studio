import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Sparkles, FileText, Loader2, AlertTriangle, Info } from 'lucide-react';
import { Subject, Chapter, Topic } from '@/data/syllabus';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuizComponent } from './QuizComponent';

interface ContentViewerProps {
  topic: Topic | null;
  chapter: Chapter | null;
  subject: Subject | null;
}

type Mode = 'learn' | 'revise' | 'practice';

export function ContentViewer({ topic, chapter, subject }: ContentViewerProps) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [content, setContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState({ name: '', level: '' });

  useEffect(() => {
    setMode(null);
    setContent(null);
    setError(null);
    setIsLoading(false);
  }, [topic]);

  const fetchContent = async (selectedMode: Mode) => {
    if (!topic) return;
    setMode(selectedMode);
    setIsLoading(true);
    setError(null);
    setContent(null);

    try {
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/generate-content`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.name, mode: selectedMode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setContent(data);
      setSourceInfo({ name: data.source_name, level: data.source_level });

    } catch (err: any) {
      setError(err.message);
      console.error(`Failed to fetch ${selectedMode} content:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!topic || !chapter || !subject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4 text-muted-foreground">
            Select a topic to get started
          </h2>
          <p className="text-muted-foreground">
            Choose a subject, chapter, and topic from the left panel to begin studying
          </p>
        </div>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="h-full p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">{topic.name}</h1>
          <p className="text-muted-foreground mb-6">{subject.name} → {chapter.name}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => fetchContent('learn')}>
              <CardHeader className="text-center">
                <Brain className="w-12 h-12 mx-auto mb-4 text-primary" />
                <CardTitle className="text-xl">🧠 Learn</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Comprehensive explanation of concepts with detailed examples
                </p>
              </CardContent>
            </Card>

            <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => fetchContent('revise')}>
              <CardHeader className="text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                <CardTitle className="text-xl">✨ Revise</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Quick summary with key formulas and important points
                </p>
              </CardContent>
            </Card>

            <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => fetchContent('practice')}>
              <CardHeader className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-primary" />
                <CardTitle className="text-xl">📝 Practice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Interactive quiz questions to test your understanding
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{topic.name}</h1>
          <p className="text-sm text-muted-foreground">
            {subject.name} → {chapter.name}
          </p>
        </div>
        <Button variant="outline" onClick={() => setMode(null)}>
          Back to Topic
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Generating content...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
             <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
             <h3 className="text-xl font-semibold text-destructive">Failed to fetch content</h3>
             <p className="text-muted-foreground mt-2">{error}</p>
          </div>
        )}

        {content && !isLoading && (
          <>
            {mode === 'learn' && <MarkdownRenderer content={content.content} />}
            {mode === 'revise' && <MarkdownRenderer content={content.content} />}
            {mode === 'practice' && (
                content.error ? 
                (<div className="flex flex-col items-center justify-center h-full text-center"><Info className="w-12 h-12 text-primary mb-4" /><h3 className="text-xl font-semibold">Theoretical Concept</h3><p className="text-muted-foreground mt-2">{content.error}</p></div>) : 
                content.question ? 
                <QuizComponent quizData={content} onNext={() => fetchContent('practice')} /> :
                <div className="text-center text-muted-foreground">No practice questions available for this topic, yet.</div>
            )}
            
            <div className="mt-8 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground italic text-center">
                Source: {sourceInfo.name} ({sourceInfo.level} Context)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}