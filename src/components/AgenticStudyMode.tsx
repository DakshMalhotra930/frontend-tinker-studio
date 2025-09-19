import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { 
  GraduationCap, 
  MessageCircle, 
  BookOpen, 
  Brain, 
  Send, 
  Plus, 
  Target,
  Calendar,
  CheckCircle,
  Lightbulb,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Subject, Chapter, Topic } from '@/data/syllabus';
import { useDeepStudySession } from '@/hooks/useDeepStudySession';
import { useCredits } from '@/hooks/useCredits';
import { ImageUpload } from '@/components/ImageUpload';
import { UpgradePrompt } from '@/components/UpgradePrompt';

interface AgenticStudyModeProps {
  topic: Topic | null;
  chapter: Chapter | null;
  subject: Subject | null;
}

export function AgenticStudyMode({ topic, chapter, subject }: AgenticStudyModeProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [problemInput, setProblemInput] = useState('');
  const [studyPlanInput, setStudyPlanInput] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const {
    currentSession,
    chatMessages,
    studyPlanMessages,
    studyPlans,
    quizQuestions,
    isLoading: isTyping,
    isGeneratingQuiz,
    error,
    sendMessage,
    sendStudyPlanMessage,
    solveProblem,
    generateQuiz,
    createStudyPlan,
    clearError,
  } = useDeepStudySession({
    subject: subject?.name || null,
    topic: topic?.name || null,
  });

  const { consumeCredit, hasCredits, creditsRemaining, creditsLimit, isProUser } = useCredits();

  // Auto-initialize session when component mounts or when topic/subject changes
  useEffect(() => {
    if (subject?.name || topic?.name) {
      // Session will be auto-initialized by useDeepStudySession hook
    }
  }, [subject?.name, topic?.name]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Check credits before sending message
    if (!isProUser && !hasCredits) {
      setShowUpgradePrompt(true);
      return;
    }

    const creditConsumed = await consumeCredit('AI Chat', currentSession?.session_id);
    if (!creditConsumed && !isProUser) {
      setShowUpgradePrompt(true);
      return;
    }

    await sendMessage(inputMessage);
    setInputMessage('');
  };

  const handleSolveProblem = async () => {
    if (!problemInput.trim()) return;
    
    // Check credits before solving problem
    if (!isProUser && !hasCredits) {
      setShowUpgradePrompt(true);
      return;
    }

    const creditConsumed = await consumeCredit('Problem Solver', currentSession?.session_id);
    if (!creditConsumed && !isProUser) {
      setShowUpgradePrompt(true);
      return;
    }

    await solveProblem(problemInput);
    setProblemInput('');
  };

  const handleCreateStudyPlan = async () => {
    // Check credits before creating study plan
    if (!isProUser && !hasCredits) {
      setShowUpgradePrompt(true);
      return;
    }

    const creditConsumed = await consumeCredit('Study Plan Generator', currentSession?.session_id);
    if (!creditConsumed && !isProUser) {
      setShowUpgradePrompt(true);
      return;
    }

    await createStudyPlan();
  };

  const handleStudyPlanMessage = async () => {
    if (!studyPlanInput.trim()) return;
    
    // Check credits before sending study plan message
    if (!isProUser && !hasCredits) {
      setShowUpgradePrompt(true);
      return;
    }

    const creditConsumed = await consumeCredit('Study Plan Generator', currentSession?.session_id);
    if (!creditConsumed && !isProUser) {
      setShowUpgradePrompt(true);
      return;
    }

    // Send the message through the study plan chat system
    await sendStudyPlanMessage(studyPlanInput);
    setStudyPlanInput('');
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  const handleImageSelect = (file: File | null) => {
    setUploadedImage(file);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background to-background/80">
      <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
            <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Deep Study Mode
            </h1>
            <p className="text-sm text-muted-foreground">
              {currentSession ? `Session: ${currentSession.topic} (${currentSession.mode})` : 'Initializing session...'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <TabsList className="mx-6 mt-4 grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>AI Chat</span>
            </TabsTrigger>
            <TabsTrigger value="study-plans" className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4" />
              <span>Study Plans</span>
            </TabsTrigger>
            <TabsTrigger value="problem-solver" className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>Problem Solver</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="chat" className="h-full flex flex-col m-0 p-6">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-2xl ${
                          message.isUser
                            ? 'bg-primary text-primary-foreground ml-12'
                            : 'bg-muted mr-12'
                        }`}
                      >
                        {!message.isUser && (
                          <div className="flex items-center space-x-2 mb-2">
                            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Deep Study AI</span>
                          </div>
                        )}
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownRenderer content={message.text} />
                        </div>
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-4 rounded-2xl mr-12">
                        <div className="flex items-center space-x-2">
                          <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Deep Study AI</span>
                        </div>
                        <div className="flex space-x-1 mt-2">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="mt-4 flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={topic ? `Ask about ${topic.name}...` : "Ask me anything about your studies..."}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                  disabled={!currentSession || isTyping}
                />
                <Button onClick={handleSendMessage} size="icon" className="shrink-0" disabled={!currentSession || isTyping}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="study-plans" className="h-full flex flex-col m-0 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Study Plan Chat</h2>
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => setStudyPlanInput("Create a quick study plan for JEE preparation focusing on my weak areas")}
                    variant="outline" 
                    className="flex items-center space-x-2"
                    disabled={!currentSession}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Quick Study</span>
                  </Button>
                  <Button onClick={handleCreateStudyPlan} className="flex items-center space-x-2" disabled={!currentSession}>
                    <Plus className="w-4 h-4" />
                    <span>Auto Generate Plan</span>
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 pr-4 mb-4">
                <div className="space-y-4">
                  {studyPlanMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-2xl ${
                          message.isUser
                            ? 'bg-primary text-primary-foreground ml-12'
                            : 'bg-muted mr-12'
                        }`}
                      >
                        {!message.isUser && (
                          <div className="flex items-center space-x-2 mb-2">
                            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Study Plan AI</span>
                          </div>
                        )}
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownRenderer content={message.text} />
                        </div>
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-4 rounded-2xl mr-12">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Study Plan AI</span>
                        </div>
                        <div className="flex space-x-1 mt-2">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex space-x-2 mb-3">
                <Input
                  value={studyPlanInput}
                  onChange={(e) => setStudyPlanInput(e.target.value)}
                  placeholder="Ask about study plans, exam preparation, or learning strategies..."
                  onKeyPress={(e) => e.key === 'Enter' && handleStudyPlanMessage()}
                  className="flex-1"
                  disabled={!currentSession || isTyping}
                />
                <Button onClick={handleStudyPlanMessage} size="icon" className="shrink-0" disabled={!currentSession || isTyping}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick Study Templates */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setStudyPlanInput("I have 3 months for JEE preparation. Create a daily study schedule for me.")}
                  disabled={!currentSession}
                >
                  📅 3-Month Plan
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setStudyPlanInput("I need a weekly study plan focusing on Physics and Chemistry. I can study 4 hours daily.")}
                  disabled={!currentSession}
                >
                  📚 Weekly Focus
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setStudyPlanInput("Create a revision plan for the last month before JEE exam.")}
                  disabled={!currentSession}
                >
                  🔄 Last Month Revision
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setStudyPlanInput("I'm weak in Mathematics. Create a plan to improve my math skills.")}
                  disabled={!currentSession}
                >
                  🎯 Weak Area Focus
                </Button>
              </div>

              {/* Existing Study Plans Display */}
              {studyPlans.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Your Generated Study Plans</h3>
                  <div className="space-y-4">
                    {studyPlans.map((plan) => (
                      <Card key={plan.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{plan.title}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {plan.description}
                              </p>
                            </div>
                            <Badge 
                              variant={plan.status === 'active' ? 'default' : 'secondary'}
                              className="shrink-0"
                            >
                              {plan.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{plan.duration}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Target className="w-4 h-4" />
                              <span>{plan.topics.length} topics</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {plan.topics.slice(0, 5).map((topic, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                            {plan.topics.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{plan.topics.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="problem-solver" className="h-full m-0 p-6">
              <div className="h-full flex flex-col">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">AI Problem Solver</h2>
                  <p className="text-muted-foreground">
                    Paste your problem here and I'll solve it step by step
                  </p>
                </div>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Lightbulb className="w-5 h-5 text-primary" />
                      <span>Submit Your Problem</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={problemInput}
                      onChange={(e) => setProblemInput(e.target.value)}
                      placeholder="Enter your physics/math problem here... Include all given information and what you need to find."
                      className="min-h-[120px] mb-4"
                      disabled={!currentSession || isTyping}
                    />

                    {/* Image Upload Section */}
                    <ImageUpload
                      onImageSelect={handleImageSelect}
                      disabled={!currentSession}
                      className="mb-4"
                    />

                    <Button 
                      onClick={handleSolveProblem} 
                      className="w-full flex items-center space-x-2"
                      disabled={!currentSession || !problemInput.trim() || isTyping}
                    >
                      {isTyping ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>{isTyping ? 'Solving...' : 'Solve Problem'}</span>
                    </Button>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        onUpgrade={handleUpgrade}
        featureName="Deep Study Mode"
        creditsRemaining={creditsRemaining}
        creditsLimit={creditsLimit}
      />
    </div>
  );
}
