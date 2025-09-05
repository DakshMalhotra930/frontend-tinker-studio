import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, MessageSquare, BookOpen, Calculator, AlertCircle, Target } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ImageUpload } from './ImageUpload';
import { StudyPlanChat } from './StudyPlanChat';
import { ProFeatureGate } from './ProFeatureGate';
import { useDeepStudySession } from '../hooks/useDeepStudySession';
import { useSubscription } from '../hooks/useSubscription';
import { sessionAPI, apiUtils } from '@/lib/api';

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
    isLoading,
    error,
    sendMessage,
    createStudyPlan,
    clearError,
  } = useDeepStudySession({ subject, topic });

  const { useTrialSession, hasTrialSessions } = useSubscription();

  const handleUseTrial = async () => {
    if (currentSession) {
      const success = await useTrialSession('deep_study_mode', currentSession.session_id);
      if (success) {
        // Trial session used successfully, user can now access the feature
        console.log('Trial session used for Deep Study Mode');
      }
    }
  };

  const handleUpgrade = () => {
    // Navigate to pricing page or show upgrade modal
    window.location.href = '/pricing';
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    try {
      let imageData: string | undefined;
      
      // Convert image to base64 if selected
      if (selectedImage) {
        imageData = await convertImageToBase64(selectedImage);
        console.log('Image converted to base64 for chat, size:', imageData.length);
      }
      
      await sendMessage(message, imageData);
      setMessage('');
      setSelectedImage(null); // Clear image after sending
    } catch (error) {
      console.error('Failed to process image for chat:', error);
      // Still send the message without image if conversion fails
      await sendMessage(message);
      setMessage('');
      setSelectedImage(null);
    }
  };

  const handleSolveProblem = async () => {
    if (!problem.trim() && !selectedImage) return;
    
    try {
      let imageData: string | undefined;
      
      // Convert image to base64 if selected
      if (selectedImage) {
        imageData = await convertImageToBase64(selectedImage);
        console.log('Image converted to base64, size:', imageData.length);
      }
      
      // Use the chat API for problem solving with image data
      await sendMessage(`Please help me solve this problem: ${problem}`, imageData);
      
      setProblem('');
      setSelectedImage(null);
    } catch (error) {
      console.error('Failed to process image:', error);
      // Still send the message without image if conversion fails
      await sendMessage(`Please help me solve this problem: ${problem}`);
      setProblem('');
      setSelectedImage(null);
    }
  };

  // Helper function to convert image to base64 with proper padding
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Ensure proper base64 padding
          let base64String = reader.result;
          
          // Remove data URL prefix if present
          if (base64String.startsWith('data:')) {
            base64String = base64String.split(',')[1];
          }
          
          // Add padding if needed (base64 length must be divisible by 4)
          while (base64String.length % 4 !== 0) {
            base64String += '=';
          }
          
          // Convert back to data URL format for the backend
          const mimeType = file.type || 'image/jpeg';
          const finalBase64 = `data:${mimeType};base64,${base64String}`;
          
          console.log('Base64 conversion complete:', {
            originalLength: reader.result.length,
            finalLength: finalBase64.length,
            paddingAdded: finalBase64.length - reader.result.length,
            mimeType
          });
          
          resolve(finalBase64);
        } else {
          reject(new Error('Failed to convert image to base64'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      action();
    }
  };

  if (!subject || !topic) {
    return (
      <ProFeatureGate
        feature="deep_study_mode"
        onUpgrade={handleUpgrade}
        onUseTrial={handleUseTrial}
      >
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
                    <Target className="w-4 h-4 mr-2" />
                    <span>AI Study Plans</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="flex-1 flex flex-col" style={{ height: '600px' }}>
                  <div className="flex-1 flex flex-col" style={{ height: '600px' }}>
                    {/* Chat Messages Container - Hard Fixed Height with Internal Scroll */}
                    <div 
                      className="flex-1 overflow-y-auto p-4 space-y-4"
                      style={{ 
                        height: '500px',
                        maxHeight: '500px',
                        minHeight: '500px',
                        overflowY: 'auto'
                      }}
                    >
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
                              className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] p-3 rounded-lg ${
                                  msg.isUser
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <MarkdownRenderer content={msg.text} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Input Field - Fixed at Bottom with Hard Height */}
                    <div 
                      className="p-4 border-t border-border bg-background"
                      style={{ 
                        height: '100px',
                        minHeight: '100px',
                        maxHeight: '100px',
                        flexShrink: 0
                      }}
                    >
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
                  <StudyPlanChat />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </ProFeatureGate>
    );
  }

  return (
    <ProFeatureGate
      feature="deep_study_mode"
      onUpgrade={handleUpgrade}
      onUseTrial={handleUseTrial}
    >
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
                <Target className="w-4 h-4" />
                <span>AI Study Plans</span>
              </TabsTrigger>
            </TabsList>

          {/* AI Chat Tab */}
          <TabsContent value="chat" className="flex flex-col mt-0" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="flex flex-col" style={{ height: '100%' }}>
              {/* Chat Messages Container - Fixed Height with Scroll */}
              <div 
                className="overflow-y-auto p-4" 
                style={{ 
                  height: 'calc(100vh - 300px)',
                  maxHeight: 'calc(100vh - 300px)',
                  minHeight: 'calc(100vh - 300px)',
                  overflowY: 'auto',
                  flexShrink: 0
                }}
              >
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
              </div>
              
              {/* Input Field - Fixed at Bottom */}
              <div className="p-4 border-t border-border bg-background flex-shrink-0">
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
            <StudyPlanChat />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </ProFeatureGate>
  );
}
