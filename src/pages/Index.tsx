import React, { useState } from 'react';
import { Subject, Chapter, Topic } from '@/data/syllabus';
import { SyllabusExplorer } from '@/components/SyllabusExplorer';
import { ContentViewer } from '@/components/ContentViewer';
import { FeatureRequestForm } from '@/components/ui/FeatureRequestForm';
import { AgenticSidebar } from '@/components/AgenticSidebar';
import { AgenticStudyMode } from '@/components/AgenticStudyMode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = ({ user, onLogout }) => {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeTab, setActiveTab] = useState('syllabus');

  const handleTopicSelect = (topic, chapter, subject) => {
    setSelectedTopic(topic);
    setSelectedChapter(chapter);
    setSelectedSubject(subject);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/praxis-logo-transparent.png" alt="PraxisAI Logo" className="h-10" />
              <div>
                <p className="text-sm text-muted-foreground">Your Personal AI Tutor for JEE Prep</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-sm text-muted-foreground">
                Logged in as: {user?.email}
              </p>
              <button
                className="mt-2 px-6 py-2 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all"
                onClick={onLogout}
              >
                Logout
              </button>
              <p className="text-sm text-muted-foreground mt-2">Target: JEE Main & Advanced</p>
              <p className="text-xs text-muted-foreground">Classes 11 & 12</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        <div className="w-80 border-r border-border bg-card">
          <SyllabusExplorer onTopicSelect={handleTopicSelect} />
        </div>
        <div className="flex-1 flex flex-col">
          {/* Top Level Tabs */}
          <div className="border-b border-border bg-card">
            <div className="container mx-auto px-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
                  <TabsTrigger value="deep-study">Deep Study</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Tab Content */}
          <TabsContent value="syllabus" className="flex-1 flex flex-col">
            <ContentViewer
              topic={selectedTopic}
              chapter={selectedChapter}
              subject={selectedSubject}
            />
            {/* Feature Request Form at bottom */}
            <FeatureRequestForm userEmail={user.email} />

            {/* What's Next Section */}
            <section className="mt-8 p-6 bg-card rounded-lg shadow-md text-foreground max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">What's Next?</h2>
              <p className="mb-3">
                We are actively improving PraxisAI! Here are some exciting features coming soon:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Expanded syllabus coverage across all JEE subjects</li>
                <li>Personalized study plans based on your progress</li>
                <li>Advanced AI tutor with natural language Q&A support</li>
                <li>Interactive quizzes and practice tests</li>
                <li>Mobile app for on-the-go learning</li>
              </ul>
              <p className="mt-4">
                We'd love your feedback and feature requests—keep them coming!
              </p>
            </section>
          </TabsContent>

          <TabsContent value="deep-study" className="flex-1 flex flex-col">
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎓</span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Deep Study Mode</h1>
                    <p className="text-muted-foreground">
                      Structured study plans, detailed problem solving, and in-depth AI tutoring sessions.
                    </p>
                  </div>
                </div>
                
                {selectedTopic && selectedChapter && selectedSubject ? (
                  <AgenticStudyMode subject={selectedSubject.name} topic={selectedTopic.name} />
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📚</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Select a Topic to Begin</h3>
                    <p className="text-muted-foreground">
                      Choose a subject, chapter, and topic from the left panel to start your deep study session.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </div>

      {/* Quick AI Help Sidebar */}
      <AgenticSidebar />
    </div>
  );
};

export default Index;
