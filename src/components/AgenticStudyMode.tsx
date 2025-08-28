import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, MessageSquare, BookOpen, Calculator, Zap, AlertCircle } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ImageUpload } from './ImageUpload';
import { useDeepStudySession } from '@/hooks/useDeepStudySession';

interface AgenticStudyModeProps {
  subject: string | null;
  topic: string | null;
}

export function AgenticStudyMode({ subject, topic }: AgenticStudyModeProps) {
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const {
    currentSession,
    chatMessages,
    studyPlans,
    quizQuestions,
    isLoading,
    isGeneratingQuiz,
    error,
    sendMessage,
    solveProblem,
    generateQuiz,
    createStudyPlan,
    clearError,
    resetQuiz,
  } = useDeepStudySession({ subject, topic });

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await sendMessage(message);
    setMessage('');
  };

  const handleSolveProblem = async () => {
    if (!problem.trim()) return;
    await solveProblem(problem);
    setProblem('');
    setSelectedImage(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      action();
    }
  };

  if (!subject || !topic) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4 text-muted-foreground">
            Select a topic to start Deep Study Mode
          </h2>
          <p className="text-muted-foreground">
            Choose a subject and topic from the sidebar to begin your AI-powered study session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Deep Study Mode</h1>
            <p className="text-sm text-muted-foreground">
              {subject} → {topic}
            </p>
          </div>
          {currentSession && (
            <Badge variant="secondary">
              Session: {currentSession.session_id.slice(0, 8)}...
            </Badge>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>AI Chat</span>
            </TabsTrigger>
            <TabsTrigger value="problems" className="flex items-center space-x-2">
              <Calculator className="w-4 h-4" />
              <span>Problem Solver</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4" />
              <span>Study Plans</span>
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Quiz</span>
            </TabsTrigger>
          </TabsList>

          {/* AI Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <MarkdownRenderer content={msg.text} />
                        <p className="text-xs opacity-70 mt-2">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleSendMessage)}
                    placeholder="Ask me anything about this topic..."
                    disabled={isLoading}
                  />
                  <Button onClick={handleSendMessage} disabled={isLoading || !message.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Problem Solver Tab */}
          <TabsContent value="problems" className="flex-1 flex flex-col mt-0">
            <div className="flex-1 flex flex-col p-4">
              <div className="space-y-4">
                <ImageUpload
                  onImageSelect={setSelectedImage}
                  disabled={isLoading}
                />
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Problem Description</label>
                  <Textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="Describe the problem you need help with..."
                    rows={4}
                    disabled={isLoading}
                  />
                </div>

                <Button
                  onClick={handleSolveProblem}
                  disabled={isLoading || (!problem.trim() && !selectedImage)}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Solving...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Solve Problem
                    </>
                  )}
                </Button>
              </div>

              {/* Problem Solution Display */}
              <ScrollArea className="flex-1 mt-6">
                <div className="space-y-4">
                  {chatMessages
                    .filter(msg => msg.text.includes('Please help me solve this problem:'))
                    .map((msg, index) => {
                      const solutionMsg = chatMessages[index + 1];
                      if (solutionMsg && !solutionMsg.isUser) {
                        return (
                          <Card key={msg.id}>
                            <CardHeader>
                              <CardTitle className="text-lg">Problem Solution</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <MarkdownRenderer content={solutionMsg.text} />
                            </CardContent>
                          </Card>
                        );
                      }
                      return null;
                    })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Study Plans Tab */}
          <TabsContent value="plans" className="flex-1 mt-0">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Study Plans</h3>
                <Button onClick={createStudyPlan} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Create New Plan
                    </>
                  )}
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-4">
                  {studyPlans.map((plan) => (
                    <Card key={plan.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{plan.title}</CardTitle>
                          <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                            {plan.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm">
                            <strong>Duration:</strong> {plan.duration}
                          </p>
                          <p className="text-sm">
                            <strong>Topics:</strong> {plan.topics.slice(0, 3).join(', ')}
                            {plan.topics.length > 3 && ` +${plan.topics.length - 3} more`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {plan.created.toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {studyPlans.length === 0 && (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No study plans yet. Create your first one!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz" className="flex-1 mt-0">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Interactive Quiz</h3>
                <div className="space-x-2">
                  <Button onClick={resetQuiz} variant="outline">
                    Reset
                  </Button>
                  <Button onClick={generateQuiz} disabled={isGeneratingQuiz}>
                    {isGeneratingQuiz ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Generate Quiz
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-4">
                  {quizQuestions.map((question, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Question {index + 1}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-4">{question.question}</p>
                        <div className="space-y-2">
                          {Object.entries(question.options).map(([key, option]) => (
                            <div
                              key={key}
                              className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                            >
                              <strong>{key}.</strong> {option}
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            <strong>Correct Answer:</strong> {question.correct_answer}
                          </p>
                          <p className="text-sm mt-2">
                            <strong>Explanation:</strong> {question.explanation}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {quizQuestions.length === 0 && (
                    <div className="text-center py-8">
                      <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No quiz questions yet. Generate a quiz to test your knowledge!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
