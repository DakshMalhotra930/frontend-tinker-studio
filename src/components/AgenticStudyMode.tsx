import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, MessageSquare, BookOpen, Calculator, AlertCircle } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ImageUpload } from './ImageUpload';
import { useDeepStudySession } from '@/hooks/useDeepStudySession';
import { sessionAPI, apiUtils } from '@/lib/api';

interface AgenticStudyModeProps {
  subject: string | null;
  topic: string | null;
}

export function AgenticStudyMode({ subject, topic }: AgenticStudyModeProps) {
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const {
    currentSession,
    chatMessages,
    studyPlans,
    isLoading,
    error,
    sendMessage,
    createStudyPlan,
    clearError,
  } = useDeepStudySession({ subject, topic });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await sendMessage(message);
    setMessage('');
  };

  const handleSolveProblem = async () => {
    if (!problem.trim()) return;
    // Use the chat API for problem solving
    await sendMessage(`Please help me solve this problem: ${problem}`);
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
      <div className="h-full flex flex-col">
        {/* Header for General Mode */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Deep Study Mode</h1>
              <p className="text-sm text-muted-foreground">
                General Study Session
              </p>
            </div>
            {currentSession && (
              <Badge variant="secondary">
                Session: {currentSession.session_id.slice(0, 8)}...
              </Badge>
            )}
          </div>
        </div>

        {/* General Study Interface */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎓</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to Deep Study Mode!</h2>
              <p className="text-muted-foreground mb-4">
                I'm here to help you with any subject or topic you want to study.
              </p>
            </div>

            <Tabs defaultValue="chat" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chat">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <span>AI Chat</span>
                </TabsTrigger>
                <TabsTrigger value="problems">
                  <Calculator className="w-4 h-4 mr-2" />
                  <span>Problem Solver</span>
                </TabsTrigger>
                <TabsTrigger value="plans">
                  <BookOpen className="w-4 h-4 mr-2" />
                  <span>Study Plans</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col">
                  <ScrollArea className="flex-1 p-4">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Start Your Study Session</h3>
                        <p className="text-muted-foreground mb-4">
                          Ask me anything about any subject or topic you want to study!
                        </p>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>• Ask questions about concepts</p>
                          <p>• Request step-by-step explanations</p>
                          <p>• Get help with problem solving</p>
                          <p>• Take practice quizzes</p>
                          <p>• Generate study materials</p>
                        </div>
                        <p className="text-muted-foreground mt-4">What would you like to explore first?</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chatMessages.map((msg, index) => (
                          <div
                            key={index}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <MarkdownRenderer content={msg.content} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  
                  <div className="p-4 border-t border-border">
                    <div className="flex space-x-2">
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, handleSendMessage)}
                        placeholder="Ask me anything about any subject or topic..."
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} disabled={isLoading || !message.trim()}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="problems" className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Problem Solver</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload an image or describe any problem you need help with.
                    </p>
                    
                    <div className="space-y-4">
                      <ImageUpload
                        onImageSelect={setSelectedImage}
                        className="w-full"
                      />
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Describe your problem
                        </label>
                        <Textarea
                          value={problem}
                          onChange={(e) => setProblem(e.target.value)}
                          placeholder="Describe the problem you're facing..."
                          className="min-h-[100px]"
                        />
                      </div>
                      
                      <Button 
                        onClick={handleSolveProblem} 
                        disabled={isLoading || (!problem.trim() && !selectedImage)}
                        className="w-full"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                        Get Help with Problem
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="plans" className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Study Plans</h3>
                      <Button onClick={createStudyPlan} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
                        Generate Plan
                      </Button>
                    </div>
                    
                    {studyPlans.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <BookOpen className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h4 className="text-lg font-semibold mb-2">No Study Plans Yet</h4>
                        <p className="text-muted-foreground mb-4">
                          Generate a personalized study plan for any subject or topic you want to master.
                        </p>
                        <Button onClick={createStudyPlan} disabled={isLoading}>
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
                          Create Your First Study Plan
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {studyPlans.map((plan, index) => (
                          <Card key={index}>
                            <CardHeader>
                              <CardTitle className="text-lg">{plan.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <MarkdownRenderer content={plan.description} />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
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
      <div className="flex-1 overflow-hidden h-full">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
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
        </Tabs>
      </div>
    </div>
  );
}
