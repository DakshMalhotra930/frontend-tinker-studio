import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { 
  X, 
  Zap, 
  MessageCircle, 
  BookOpen, 
  Send,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Subject, Chapter, Topic } from '@/data/syllabus';
import { apiUtils } from '@/lib/api';

interface AgenticSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  topic: Topic | null;
  chapter: Chapter | null;
  subject: Subject | null;
  onOpenDeepStudy?: () => void;
}

export function AgenticSidebar({ isOpen, onClose, topic, chapter, subject, onOpenDeepStudy }: AgenticSidebarProps) {
  const [quickMessage, setQuickMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const sendQuickMessage = async () => {
    if (!quickMessage.trim()) return;
    
    setIsLoading(true);
    setError('');
    setAiResponse('');

    try {
      const response = await fetch(
        'https://praxis-ai.fly.dev/agentic/quick-help',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            subject: subject?.name,
            chapter: chapter?.name,
            topic: topic?.name,
            query: quickMessage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAiResponse(data.answer || 'No response received.');
      setQuickMessage('');
    } catch (err) {
      console.error('Quick AI Help API error:', err);
      setError(apiUtils.formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed right-0 top-0 h-full w-80 bg-card border-l border-border z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        md:relative md:transform-none md:w-80
        ${isOpen ? 'md:block' : 'md:hidden'}
      `}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-yellow-500/20">
                  <Zap className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Quick AI Help</h3>
                  <p className="text-xs text-muted-foreground">
                    Instant explanations, summaries, and quick practice—fast answers at your fingertips.
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Context Info */}
          {topic && (
            <div className="p-4 bg-muted/30 border-b border-border">
              <div className="text-xs text-muted-foreground mb-1">Currently studying:</div>
              <div className="space-y-1">
                <Badge variant="outline" className="text-xs">
                  {subject?.name}
                </Badge>
                <div className="text-sm font-medium">{chapter?.name}</div>
                <div className="text-sm text-primary font-medium">{topic.name}</div>
              </div>
            </div>
          )}

          {/* Quick Chat */}
          <div className="flex-1 flex flex-col p-4 pt-2">
            <h4 className="text-sm font-medium mb-3 flex items-center">
              <MessageCircle className="w-4 h-4 mr-2 text-primary" />
              Quick Question
            </h4>
            
            <div className="flex-1 mb-4">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ask anything!</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32 mb-4">
                    <div className="text-sm text-muted-foreground">
                      {topic ? (
                        <>
                          I'm ready to help you with <strong>{topic.name}</strong>. 
                          You can ask me to explain concepts, show examples, create practice problems, or anything else!
                        </>
                      ) : (
                        'Select a topic from the syllabus and I\'ll be ready to help with explanations, examples, and practice problems!'
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <Input
                value={quickMessage}
                onChange={(e) => setQuickMessage(e.target.value)}
                placeholder={topic ? `Ask about ${topic.name}...` : "Select a topic first..."}
                onKeyPress={(e) => e.key === 'Enter' && sendQuickMessage()}
                disabled={!topic || isLoading}
              />
              <Button 
                onClick={sendQuickMessage}
                className="w-full flex items-center space-x-2"
                disabled={!topic || !quickMessage.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Thinking...' : 'Ask AI'}</span>
              </Button>
            </div>
          </div>

          {/* AI Response Display */}
          {(aiResponse || error || isLoading) && (
            <div className="border-t border-border bg-gradient-to-b from-muted/30 to-muted/10">
              <div className="p-4">
                <h4 className="text-sm font-semibold mb-4 flex items-center">
                  <div className="p-1.5 rounded-full bg-yellow-500/10 mr-2">
                    <Zap className="w-4 h-4 text-yellow-600" />
                  </div>
                  AI Response
                </h4>
                
                <Card className="bg-card shadow-sm border border-border/60 overflow-hidden">
                  <CardContent className="p-0">
                    <ScrollArea className="h-48">
                      {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                          <div className="p-3 rounded-full bg-primary/10 mb-3">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">Generating response...</span>
                        </div>
                      )}
                      
                      {error && (
                        <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500">
                          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                        </div>
                      )}
                      
                      {aiResponse && !isLoading && (
                        <div className="p-4">
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-li:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-blockquote:border-primary/20 prose-blockquote:text-muted-foreground">
                            <MarkdownRenderer content={aiResponse} />
                          </div>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Deep Study Mode CTA */}
          <div className="p-4 border-t border-border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <Button 
              onClick={onOpenDeepStudy}
              className="w-full flex items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
              disabled={!topic}
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm font-medium">Explore in Deep Study Mode</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Structured study plans, detailed problem solving, and in-depth AI tutoring sessions.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
