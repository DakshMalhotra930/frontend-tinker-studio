import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Calendar, Target, BookOpen, Lightbulb, ArrowRight } from 'lucide-react';
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
      console.log('Sending study plan request:', userMessage);
      console.log('Current date/time context:', new Date().toISOString());
      
      const response = await studyPlanAPI.generateFromChat({
        message: userMessage,
        currentDateTime: new Date().toISOString(),
      });

      console.log('Study plan response:', response);

      if (!response || !response.plan) {
        throw new Error('Invalid response from API - no plan content');
      }

      // Add AI response
      const aiMsg: StudyPlanMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.plan,
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

**Examples:**
• "My JEE exam is on December 15th, need to study Physics Mechanics"
• "I have an exam in 2 months, focusing on Math Calculus and Chemistry"
• "Need study plan for JEE, exam on 20th December"
• "My coaching test is on 23rd September, studying Mechanics"

**💡 Tip:** You can use relative dates like "next month" or "in 2 weeks" - I'll automatically calculate the correct dates! 📚✨`,
      timestamp: new Date(),
    };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">AI Study Plan Generator</h2>
            <p className="text-sm text-muted-foreground">
              Chat naturally to create personalized study plans • AI knows current date: {format(new Date(), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-destructive">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError('')}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Let's Create Your Study Plan!</h3>
                <p className="text-muted-foreground">
                  Describe your exam goals naturally and I'll help you succeed
                </p>
              </div>
              
              {/* Welcome Message */}
              <Card className="max-w-2xl mx-auto text-left">
                <CardContent className="p-4">
                  <MarkdownRenderer content={getWelcomeMessage().content} />
                </CardContent>
              </Card>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}>
                <MarkdownRenderer content={message.content} />
                
                {/* Plan Data Display */}
                {message.planData && message.role === 'assistant' && (
                  <div className="mt-4 space-y-3">
                    {message.planData.subjects && (
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Subjects:</span>
                        <div className="flex flex-wrap gap-1">
                          {message.planData.subjects.map((subject: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {message.planData.duration_days && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Duration:</span>
                        <span className="text-sm">{message.planData.duration_days} days</span>
                      </div>
                    )}
                    
                    {message.planData.goals && message.planData.goals.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Goals:</span>
                        </div>
                        <ul className="text-sm space-y-1 ml-6">
                          {message.planData.goals.map((goal: string, index: number) => (
                            <li key={index} className="flex items-start space-x-2">
                              <ArrowRight className="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                              <span>{goal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'opacity-70' : 'text-muted-foreground'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI is creating your study plan...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell me about your exam and what you want to study..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Clear Messages Button */}
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearMessages}
            className="w-full mt-2"
          >
            Clear Chat
          </Button>
        )}
      </div>
    </div>
  );
}
