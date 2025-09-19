import React, { useState } from 'react';
import { Subject, Chapter, Topic } from '@/data/syllabus';
import { SyllabusExplorer } from '@/components/SyllabusExplorer';
import { ContentViewer } from '@/components/ContentViewer';
import { FeatureRequestForm } from '@/components/ui/FeatureRequestForm';
import { AgenticSidebar } from '@/components/AgenticSidebar';
import { AgenticStudyMode } from '@/components/AgenticStudyMode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Settings, GraduationCap, Brain, BookOpen, MessageSquare, Calculator, Star, ChevronDown, User } from 'lucide-react';
import { UsageProgressDisplay } from '@/components/UsageProgressDisplay';
import { CreditDisplay } from '@/components/CreditDisplay';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useUserType } from '@/hooks/useUserType';
import { useCredits } from '@/hooks/useCredits';

interface IndexProps {
  user: {
    user_id: string;
    email: string;
    name: string;
  };
  onLogout: () => void;
}

const Index = ({ user, onLogout }: IndexProps) => {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeTab, setActiveTab] = useState('syllabus');
  
  const { usageStatus } = useUsageTracking();
  const { isPremium } = useUserType();
  const { creditStatus, isProUser } = useCredits();

  const handleTopicSelect = (topic, chapter, subject) => {
    setSelectedTopic(topic);
    setSelectedChapter(chapter);
    setSelectedSubject(subject);
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-zinc-800 border-r border-zinc-700 flex flex-col">
        {/* Logo and Branding */}
        <div className="p-6 border-b border-zinc-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Praxis AI</h1>
              <p className="text-sm text-zinc-400">JEE Prep Tutor</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-6 border-b border-zinc-700">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Navigation</h3>
          <nav className="space-y-2">
            <button className="w-full flex items-center space-x-3 px-3 py-2 text-white bg-purple-600 rounded-lg">
              <Settings className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => window.location.href = '/pricing'}
              className="w-full flex items-center space-x-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Pricing</span>
            </button>
          </nav>
        </div>

        {/* Credit Status */}
        <div className="p-6 border-b border-zinc-700">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            {isProUser ? 'Pro Status' : 'Daily Credits'}
          </h3>
          <CreditDisplay 
            compact={true}
            onUpgrade={() => window.location.href = '/pricing'}
          />
        </div>

        {/* User Profile */}
        <div className="mt-auto p-6 border-t border-zinc-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-zinc-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Praxis AI Dashboard</h1>
              <p className="text-zinc-400 mt-1">Your personal AI tutor for JEE preparation. Log in to get started.</p>
            </div>
            <Button 
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">

          {/* Study Mode Selection */}
          <div className="mb-8">
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('syllabus')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'syllabus'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                Syllabus Study
              </button>
              <button
                onClick={() => setActiveTab('deep-study')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'deep-study'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                AI Deep Study
              </button>
            </div>

            {activeTab === 'syllabus' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Syllabus Explorer */}
                <div className="bg-zinc-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Syllabus Explorer</h3>
                  <SyllabusExplorer onTopicSelect={handleTopicSelect} />
                </div>

                {/* Select Topic Card */}
                <div className="bg-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                  <BookOpen className="w-16 h-16 text-zinc-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Select a Topic to Study</h3>
                  <p className="text-zinc-400">Choose a subject, chapter, and topic from the syllabus explorer to start learning.</p>
                </div>
              </div>
            )}

            {activeTab === 'deep-study' && (
              <div className="bg-zinc-800 rounded-lg">
                <AgenticStudyMode
                  topic={selectedTopic}
                  chapter={selectedChapter}
                  subject={selectedSubject}
                />
              </div>
            )}
          </div>

          {/* Content Viewer for Syllabus Mode */}
          {activeTab === 'syllabus' && (selectedTopic || selectedChapter || selectedSubject) && (
            <div className="bg-zinc-800 rounded-lg p-6">
              <ContentViewer
                topic={selectedTopic}
                chapter={selectedChapter}
                subject={selectedSubject}
              />
            </div>
          )}

        </div>
      </div>

      {/* Quick AI Help Sidebar */}
      <AgenticSidebar 
        isOpen={false}
        onClose={() => {}}
        topic={selectedTopic}
        chapter={selectedChapter}
        subject={selectedSubject}
      />
    </div>
  );
};

export default Index;
