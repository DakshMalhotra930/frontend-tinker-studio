import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Calendar, Target, BookOpen, Lightbulb, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { studyPlanAPI, apiUtils } from '@/lib/api';
import { format } from 'date-fns';

interface StudyPlanMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  planData?: any;
}

export function StudyPlanChat() {
  const [messages, setMessages] = useState<StudyPlanMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setError('');

    // Add user message
    const userMsg: StudyPlanMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await studyPlanAPI.generateFromChat({
        message: userMessage,
        currentDateTime: new Date().toISOString(),
      });

      console.log('Study plan response received:', {
        hasResponse: !!response.response,
        responseLength: response.response?.length,
        hasPlan: !!response.plan
      });

      if (!response) {
        throw new Error('Invalid response from API - no response received');
      }

      // Handle different response structures
      let contentToDisplay = '';
      if (response.response) {
        contentToDisplay = response.response;
      } else if (response.plan && typeof response.plan === 'string') {
        contentToDisplay = response.plan;
      } else if (response.plan && typeof response.plan === 'object') {
        contentToDisplay = JSON.stringify(response.plan, null, 2);
      } else {
        console.error('No readable content found in response:', response);
        throw new Error('Invalid response from API - no readable content found');
      }

      // Add AI response
      const aiMsg: StudyPlanMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: contentToDisplay,
        timestamp: new Date(),
        planData: response,
      };
      
      setMessages(prev => [...prev, aiMsg]);
      setError('');

    } catch (err) {
      console.error('Failed to generate study plan:', err);
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      
      // Add error message
      const errorMsg: StudyPlanMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I couldn't generate a study plan right now. Error: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError('');
  };

  const getWelcomeMessage = () => {
    return {
      id: 'welcome',
      role: 'assistant' as const,
      content: `🎯 **Welcome to AI Study Plan Generator!**

Tell me about your exam and what you want to study in natural language. I'll create a personalized study plan for you!

**Examples of what you can ask:**
• "My JEE exam is on December 15th, need to study Physics Mechanics"
• "I have an exam in 2 months, focusing on Math Calculus and Chemistry"
• "Need study plan for JEE, exam on 20th December"
• "My coaching test is on 23rd September, studying Mechanics"

**💡 Tip:** You can use relative dates like "next month" or "in 2 weeks" - I'll automatically calculate the correct dates! 📚✨`,
      timestamp: new Date(),
    };
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-card/20">
      {/* Enhanced Header */}
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-card to-card/80 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Study Plan Generator
            </h2>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-secondary" />
              Chat naturally to create personalized study plans • AI knows current date: {format(new Date(), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Error Display */}
      {error && (
        <div className="p-4 bg-gradient-to-r from-destructive/10 to-destructive/5 border-b border-destructive/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-destructive font-medium">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError('')}
              className="h-8 w-8 p-0 hover:bg-destructive/10"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Messages */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Lightbulb className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Let's Create Your Study Plan!
                </h3>
                <p className="text-muted-foreground text-lg">
                  Describe your exam goals naturally and I'll help you succeed
                </p>
              </div>
              
              {/* Enhanced Welcome Message */}
              <Card className="max-w-3xl mx-auto text-left shadow-xl border-primary/20">
                <CardContent className="p-6">
                  <MarkdownRenderer content={getWelcomeMessage().content} />
                </CardContent>
              </Card>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-lg transition-all duration-200 ease-in-out ${
                message.role === 'user' 
                  ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-primary/25' 
                  : 'bg-gradient-to-r from-card to-card/80 border border-border/50 shadow-card/25'
              }`}>

                {/* Main content display */}
                {message.content ? (
                  <div className="academic-content">
                    <MarkdownRenderer content={message.content} />
                  </div>
                ) : (
                  <div className="text-red-500 text-sm">❌ No content to display</div>
                )}
                
                {/* Enhanced Plan Data Display */}
                {message.planData && message.role === 'assistant' && (
                  <div className="mt-6 space-y-4 p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border border-border/30">
                    {message.planData.plan?.subjects && (
                      <div className="flex items-center space-x-3">
                        <BookOpen className="w-5 h-5 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Subjects:</span>
                        <div className="flex flex-wrap gap-2">
                          {message.planData.plan.subjects.map((subject: string, index: number) => (
                            <Badge key={index} variant="subject" className="text-xs px-3 py-1">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {message.planData.plan?.duration_days && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Duration:</span>
                        <Badge variant="academic" className="text-xs px-3 py-1">
                          {message.planData.plan.duration_days} days
                        </Badge>
                      </div>
                    )}
                    
                    {message.planData.plan?.goals && message.planData.plan.goals.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Target className="w-5 h-5 text-primary" />
                          <span className="text-sm font-semibold text-foreground">Goals:</span>
                        </div>
                        <ul className="text-sm space-y-2 ml-8">
                          {message.planData.plan.goals.map((goal: string, index: number) => (
                            <li key={index} className="flex items-start space-x-3">
                              <ArrowRight className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                              <span className="text-foreground">{goal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Enhanced motivation display */}
                    {message.planData.motivation && (
                      <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-secondary/10 to-secondary/5 rounded-lg border border-secondary/20">
                        <Lightbulb className="w-5 h-5 text-secondary" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">Motivation:</span>
                          <p className="text-sm text-foreground mt-1">{message.planData.motivation}</p>
                        </div>
                      </div>
                    )}

                    {/* Enhanced info needed display */}
                    {message.planData.needs_more_info && (
                      <div className="p-4 bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-xl">
                        <p className="text-sm text-warning-foreground font-medium">
                          💡 I need a bit more information to create the perfect study plan. Please provide more details about your exam goals.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <p className={`text-xs mt-3 ${
                  message.role === 'user' ? 'opacity-70' : 'text-muted-foreground'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {/* Enhanced Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-2xl p-4 border border-border/30 shadow-lg">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm font-medium text-foreground">AI is creating your study plan...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Enhanced Input Area */}
      <div className="p-6 border-t border-border/50 bg-gradient-to-r from-card to-card/80 backdrop-blur-sm">
        <div className="flex space-x-3 max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell me about your exam and what you want to study..."
            disabled={isLoading}
            className="flex-1 h-12 text-base"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            size="lg"
            className="h-12 px-6 shadow-lg hover:shadow-xl"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Enhanced Clear Messages Button */}
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearMessages}
            className="w-full mt-3 h-10 border-border/50 hover:bg-muted/50"
          >
            Clear Chat
          </Button>
        )}
      </div>
    </div>
  );
}
