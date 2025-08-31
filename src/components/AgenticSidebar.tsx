import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Zap, X, MessageSquare } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { quickHelpAPI, apiUtils } from '@/lib/api';

interface QuickHelpMessage {
  id: string;
  query: string;
  response: string;
  timestamp: Date;
}

export function AgenticSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<QuickHelpMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendQuery = async () => {
    if (!query.trim()) return;

    const userQuery = query;
    setQuery('');
    setIsLoading(true);
    setError('');

    try {
      console.log('Sending quick help query:', userQuery);
      
      const data = await quickHelpAPI.getHelp({
        query: userQuery,
        context: 'quick-help',
      });

      console.log('Quick help response:', data);
      console.log('Response type:', typeof data);
      console.log('Response keys:', Object.keys(data || {}));

      if (!data || !data.response) {
        console.error('Invalid response structure:', data);
        throw new Error(`Invalid response from API - expected 'response' field, got: ${JSON.stringify(data)}`);
      }

      const newMessage: QuickHelpMessage = {
        id: Date.now().toString(),
        query: userQuery,
        response: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, newMessage]);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Failed to get quick help:', err);
      const errorMessage = apiUtils.formatError(err);
      setError(errorMessage);
      
      // Add a fallback message to show the user something
      const fallbackMessage: QuickHelpMessage = {
        id: Date.now().toString(),
        query: userQuery,
        response: `Sorry, I couldn't get a response right now. Error: ${errorMessage}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError('');
  };

  return (
    <>
      {/* Quick Help Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg"
        size="lg"
      >
        <Zap className="w-6 h-6" />
      </Button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-background border-l border-border z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Quick AI Help</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Get instant help with any question
            </p>
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
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Ask me anything! I'm here to help with your studies.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Type your question below and press Enter or click Send
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  {/* User Query */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-primary text-primary-foreground rounded-lg p-3">
                      <p className="text-sm">{message.query}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-muted rounded-lg p-3">
                      <MarkdownRenderer content={message.response} />
                      <p className="text-xs text-muted-foreground mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
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

              {/* API Status Info */}
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                    <p>API Status: {apiUtils.getApiBaseUrl()}</p>
                    <p className="mt-1">Make sure your backend is running and accessible</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex space-x-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendQuery}
                disabled={isLoading || !query.trim()}
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
                Clear History
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
