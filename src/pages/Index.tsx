import React, { useState } from 'react';
import { Subject, Chapter, Topic } from '@/data/syllabus';
import { SyllabusExplorer } from '@/components/SyllabusExplorer';
import { ContentViewer } from '@/components/ContentViewer';
import { FeatureRequestForm } from '@/components/ui/FeatureRequestForm';

const Index = ({ user, onLogout }) => {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

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
          <ContentViewer
            topic={selectedTopic}
            chapter={selectedChapter}
            subject={selectedSubject}
          />
          {/* Feature Request Form at bottom */}
          <FeatureRequestForm userEmail={user.email} />
        </div>
      </div>
    </div>
  );
};

export default Index;
