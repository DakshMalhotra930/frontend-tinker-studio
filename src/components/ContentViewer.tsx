import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Sparkles, FileText } from 'lucide-react';
import { Subject, Chapter, Topic } from '@/data/syllabus';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuizComponent } from './QuizComponent';

interface ContentViewerProps {
  topic: Topic | null;
  chapter: Chapter | null;
  subject: Subject | null;
}

type Mode = 'learn' | 'revise' | 'practice' | null;

export function ContentViewer({ topic, chapter, subject }: ContentViewerProps) {
  const [mode, setMode] = useState<Mode>(null);

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
          <h1 className="text-4xl font-bold mb-6">{topic.name}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setMode('learn')}>
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

            <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setMode('revise')}>
              <CardHeader className="text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-secondary" />
                <CardTitle className="text-xl">✨ Revise</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Quick summary with key formulas and important points
                </p>
              </CardContent>
            </Card>

            <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setMode('practice')}>
              <CardHeader className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-success" />
                <CardTitle className="text-xl">📝 Practice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Interactive quiz questions to test your understanding
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground italic">
              Source: {chapter.name} (Chapter Context)
            </p>
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

      <div className="flex-1 overflow-auto">
        {mode === 'learn' && (
          <div className="p-8">
            <MarkdownRenderer content={topic.content.learn} />
          </div>
        )}
        
        {mode === 'revise' && (
          <div className="p-8">
            <MarkdownRenderer content={topic.content.revise} />
          </div>
        )}
        
        {mode === 'practice' && (
          <div className="p-8">
            <QuizComponent topicId={topic.id} />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-card">
        <p className="text-sm text-muted-foreground italic text-center">
          Source: {chapter.name} (Chapter Context)
        </p>
      </div>
    </div>
  );
}