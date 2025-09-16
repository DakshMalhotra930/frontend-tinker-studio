import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Target, 
  Zap, 
  BookOpen, 
  Calculator, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Shield, 
  Clock, 
  Star, 
  CheckCircle,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Lightbulb,
  Trophy,
  Play
} from 'lucide-react';
import GoogleLogin from '@/components/GoogleLogin';
import { useAuth } from '@/hooks/useAuth';

const Landing: React.FC = () => {
  const { isAuthenticated, user, login } = useAuth();

  const handleLogin = (userData: any) => {
    login(userData);
  };

  const features = [
    {
      icon: Brain,
      title: "AI Tutoring",
      description: "Get instant help with concepts and problem-solving",
      color: "text-blue-400"
    },
    {
      icon: Target,
      title: "Personalized",
      description: "Adaptive learning paths based on your progress",
      color: "text-purple-400"
    },
    {
      icon: Zap,
      title: "Comprehensive",
      description: "Complete syllabus coverage with practice tests",
      color: "text-yellow-400"
    }
  ];

  const mainFeatures = [
    {
      icon: BookOpen,
      title: "Interactive Syllabus Explorer",
      description: "Navigate through Physics, Chemistry, and Mathematics with our comprehensive JEE syllabus explorer. Find topics, chapters, and concepts with ease.",
      color: "bg-blue-500"
    },
    {
      icon: Brain,
      title: "AI Deep Study Mode",
      description: "Immersive AI tutoring sessions with personalized explanations, step-by-step problem solving, and adaptive learning paths.",
      color: "bg-purple-500"
    },
    {
      icon: Calculator,
      title: "Advanced Problem Solver",
      description: "Upload images or describe problems to get instant step-by-step solutions with detailed explanations and alternative methods.",
      color: "bg-green-500"
    },
    {
      icon: MessageSquare,
      title: "Intelligent Q&A",
      description: "Ask any question about JEE concepts and get instant, accurate answers powered by advanced AI technology.",
      color: "bg-orange-500"
    },
    {
      icon: BarChart3,
      title: "Progress Tracking",
      description: "Monitor your learning journey with detailed analytics, performance insights, and personalized recommendations.",
      color: "bg-pink-500"
    },
    {
      icon: Users,
      title: "Community Support",
      description: "Connect with fellow JEE aspirants, share knowledge, and get support from our active learning community.",
      color: "bg-indigo-500"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Students Helped" },
    { number: "95%", label: "Success Rate" },
    { number: "24/7", label: "AI Support" },
    { number: "100%", label: "Free to Start" }
  ];

  const testimonials = [
    {
      name: "Priya Sharma",
      exam: "JEE Advanced 2024",
      score: "AIR 156",
      text: "Praxis AI helped me understand complex physics concepts that I struggled with for months. The AI explanations are so clear and easy to follow!",
      rating: 5
    },
    {
      name: "Arjun Patel",
      exam: "JEE Main 2024",
      score: "99.2%ile",
      text: "The personalized study plans and practice questions were exactly what I needed. I improved my chemistry score by 40 points!",
      rating: 5
    },
    {
      name: "Sneha Reddy",
      exam: "JEE Advanced 2024",
      score: "AIR 89",
      text: "The AI tutoring sessions are incredible. It's like having a personal tutor available 24/7. Highly recommended for JEE prep!",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-tight">
                  Praxis AI
                </h1>
                <p className="text-xl text-zinc-300 leading-relaxed">
                  Your AI-powered JEE preparation companion. Master Physics, Chemistry, and Mathematics with personalized study plans and intelligent tutoring.
                </p>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {features.map((feature, index) => (
                  <Card key={index} className="bg-zinc-800/50 border-zinc-700 backdrop-blur-sm">
                    <CardContent className="p-4 text-center">
                      <feature.icon className={`w-8 h-8 mx-auto mb-3 ${feature.color}`} />
                      <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-zinc-400">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold"
                  onClick={() => window.location.href = '/pricing'}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Free Trial
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 px-8 py-4 text-lg"
                  onClick={() => window.location.href = '/pricing'}
                >
                  View Pricing
                </Button>
              </div>
            </div>

            {/* Right Content - Welcome Back Panel */}
            <div className="flex justify-center">
              <Card className="bg-zinc-800/80 border-zinc-700 backdrop-blur-sm w-full max-w-md">
                <CardContent className="p-8 text-center">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
                      <p className="text-zinc-300">
                        Sign in to continue your JEE preparation journey
                      </p>
                    </div>
                    
                    <div className="scale-110">
                      <GoogleLogin onLogin={handleLogin} />
                    </div>
                    
                    <p className="text-sm text-zinc-400">
                      By signing in, you agree to our Terms of Service and Privacy Policy. Start your JEE preparation journey today.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-zinc-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-zinc-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Praxis AI?</h2>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
              Experience the future of JEE preparation with our comprehensive AI-powered learning platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature, index) => (
              <Card key={index} className="bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 transition-all duration-300 group">
                <CardHeader>
                  <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-zinc-400 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 bg-zinc-800/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">What Our Students Say</h2>
            <p className="text-xl text-zinc-400">
              Join thousands of successful JEE aspirants who achieved their dreams with Praxis AI
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-zinc-300 mb-4 italic">"{testimonial.text}"</p>
                  <div className="border-t border-zinc-700 pt-4">
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-sm text-zinc-400">{testimonial.exam} • {testimonial.score}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Ace Your JEE Exam?
            </h2>
            <p className="text-xl text-zinc-400 mb-8">
              Join thousands of students who are already using Praxis AI to achieve their JEE dreams. Start your free trial today!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold"
                onClick={() => window.location.href = '/pricing'}
              >
                <GraduationCap className="w-5 h-5 mr-2" />
                Start Free Trial
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 px-8 py-4 text-lg"
                onClick={() => window.location.href = '/pricing'}
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                View Pricing Plans
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-12 bg-zinc-800 border-t border-zinc-700">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Praxis AI</span>
            </div>
            <p className="text-zinc-400 mb-4">
              Your AI-powered JEE preparation companion
            </p>
            <div className="flex justify-center space-x-6 text-sm text-zinc-500">
              <a href="#" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-zinc-300 transition-colors">Contact Us</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
