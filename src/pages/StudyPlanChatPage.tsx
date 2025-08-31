import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudyPlanChat } from '@/components/StudyPlanChat';
import { BookOpen, Target, Calendar, TrendingUp, Zap, MessageSquare } from 'lucide-react';

export default function StudyPlanChatPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Target className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">AI Study Plan Generator</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Transform your exam preparation with AI-powered personalized study plans. 
          Just chat naturally about your goals and let AI create the perfect roadmap to success.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">Natural Conversation</h3>
            <p className="text-sm text-muted-foreground">
              No more rigid forms - just chat naturally about your exam goals
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Smart Extraction</h3>
            <p className="text-sm text-muted-foreground">
              AI automatically extracts exam dates, subjects, and study preferences
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Personalized Plans</h3>
            <p className="text-sm text-muted-foreground">
              Get study plans tailored to your specific exam and learning style
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold mb-2">Progress Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Monitor your progress and stay motivated throughout your journey
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Example Messages */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Example Conversations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center">JEE Preparation</Badge>
              <p className="text-sm text-muted-foreground">
                "My JEE exam is on December 15th, need to study Physics Mechanics and Chemistry Organic"
              </p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center">Board Exams</Badge>
              <p className="text-sm text-muted-foreground">
                "I have board exams in 2 months, focusing on Math Calculus and Physics"
              </p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center">Competitive Exams</Badge>
              <p className="text-sm text-muted-foreground">
                "Need study plan for NEET, exam on 20th December, weak in Biology"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chat Interface */}
      <Card className="h-[600px]">
        <StudyPlanChat />
      </Card>

      {/* Footer Info */}
      <div className="text-center mt-8 text-sm text-muted-foreground">
        <p>
          Powered by advanced AI technology • Your study success is our priority • 
          <span className="text-primary"> Start your journey today!</span>
        </p>
      </div>
    </div>
  );
}
