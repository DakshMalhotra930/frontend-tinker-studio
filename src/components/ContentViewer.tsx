import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Sparkles, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { Subject, Chapter, Topic } from '@/data/syllabus';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuizComponent } from './QuizComponent';
import { contentAPI } from '@/lib/api';
import { FeatureUsageTracker } from './FeatureUsageTracker';

interface ContentViewerProps {
  topic: Topic | null;
  chapter: Chapter | null;
  subject: Subject | null;
}

type Mode = 'learn' | 'revise' | 'practice';

interface BackendPracticeQuestion {
  question: string;
  options: { [key: string]: string };
  correct_answer: string | number;
  explanation?: string;
  source_name?: string;
  source_level?: string;
}

interface QuizData {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

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
    console.log("Topic changed. mode/content/error/isLoading reset.");
  }, [topic]);

  const fetchContent = async (selectedMode: Mode) => {
    if (!topic) return;
    setMode(selectedMode);
    setIsLoading(true);
    setError(null);
    setContent(null);
    console.log(`Fetching content for mode: ${selectedMode}`);

    try {
      // Use the new contentAPI from the updated api.ts
      const data = await contentAPI.generateContent({
        topic: topic.name,
        mode: selectedMode
      });

      console.log("Backend data received:", data);
      setContent(data);
      setSourceInfo({ 
        name: data.source_name || 'AI Tutor', 
        level: data.source_level || 'Generated' 
      });
    } catch (err: any) {
      setError(err.message);
      console.error(`Failed to fetch ${selectedMode} content:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  function mapToQuizData(content: BackendPracticeQuestion): QuizData | null {
    console.log("Mapping backend content to quizData:", content);
    if (!content || !content.question || !content.options) {
      console.log("Missing required question data.");
      return null;
    }
    const optionKeys = Object.keys(content.options);
    const optionsArr = optionKeys.map(key => content.options[key]);
    let correctIdx = 0;
    if (typeof content.correct_answer === 'string') {
      correctIdx = optionKeys.indexOf(content.correct_answer);
    } else if (typeof content.correct_answer === 'number') {
      correctIdx = content.correct_answer;
    }
    const quizData: QuizData = {
      id: "q1",
      question: content.question,
      options: optionsArr,
      correctAnswer: correctIdx,
      explanation: content.explanation || ""
    };
    console.log("quizData prepared for QuizComponent:", quizData);
    return quizData;
  }

  if (!topic || !chapter || !subject) {
    console.log("No topic/chapter/subject selected.");
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
    console.log("No mode selected yet, showing mode options.");
    return (
      <div className="h-full p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">{topic.name}</h1>
          <p className="text-muted-foreground mb-6">{subject.name} → {chapter.name}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

  // --- MAIN CONTENT RENDER ---
  let quizData: QuizData | null = null;
  if (mode === 'practice') {
    quizData = mapToQuizData(content);
    console.log("Final quizData in practice mode render:", quizData);
  }

  return (
    <FeatureUsageTracker featureName="content_generation">
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
            <h3 className="text-xl font-semibold text-destructive">Failed to generate content</h3>
            <p className="text-muted-foreground mt-2">{error}</p>
          </div>
        )}

        {content && !isLoading && (
          <>
            {mode === 'learn' && <MarkdownRenderer content={content.content} />}
            {mode === 'revise' && <MarkdownRenderer content={content.content} />}
            {mode === 'practice' && (
              quizData
                ? (
                  <QuizComponent
                    quizData={quizData}
                    onNext={() => fetchContent('practice')}
                  />
                )
                : (
                  <div className="text-center text-muted-foreground">
                    This is a Theoretical Concept no Practice Questions available.
                  </div>
                )
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
    </FeatureUsageTracker>
  );
}
