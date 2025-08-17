import { useState } from 'react';
import { Subject, Chapter, Topic } from '@/data/syllabus';
import { SyllabusExplorer } from '@/components/SyllabusExplorer';
import { ContentViewer } from '@/components/ContentViewer';

const Index = () => {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const handleTopicSelect = (topic: Topic, chapter: Chapter, subject: Subject) => {
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
              {/* --- THIS IS THE UPDATED LINE --- */}
              <img src="/praxis-logo-transparent.png" alt="PraxisAI Logo" className="h-10" />
              <div>
                <p className="text-sm text-muted-foreground">Your Personal AI Tutor for JEE Prep</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Target: JEE Main & Advanced</p>
              <p className="text-xs text-muted-foreground">Classes 11 & 12</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Column - Syllabus Explorer */}
        <div className="w-80 border-r border-border bg-card">
          <SyllabusExplorer onTopicSelect={handleTopicSelect} />
        </div>

        {/* Right Column - Content Viewer */}
        <div className="flex-1">
          <ContentViewer 
            topic={selectedTopic}
            chapter={selectedChapter} 
            subject={selectedSubject}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;