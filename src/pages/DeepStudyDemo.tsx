import React, { useState } from 'react';
import { AgenticStudyMode } from '@/components/AgenticStudyMode';
import { AgenticSidebar } from '@/components/AgenticSidebar';

// Mock data for demonstration
const mockSubjects = [
  { id: 'chemistry', name: 'Chemistry' },
  { id: 'physics', name: 'Physics' },
  { id: 'mathematics', name: 'Mathematics' }
];

const mockTopics = [
  { id: 'atomic-structure', name: 'Atomic Structure' },
  { id: 'kinematics', name: 'Kinematics' },
  { id: 'calculus', name: 'Calculus' }
];

export default function DeepStudyDemo() {
  const [selectedSubject, setSelectedSubject] = useState(mockSubjects[0]);
  const [selectedTopic, setSelectedTopic] = useState(mockTopics[0]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">PraxisAI Deep Study Mode Demo</h1>
              <p className="text-sm text-muted-foreground">AI-powered study session integration</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Demo Mode</p>
                <p className="text-xs text-muted-foreground">Backend: agentic.py</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Mock Navigation */}
        <div className="w-80 border-r border-border bg-card p-4">
          <div className="space-y-6">
            {/* Subject Selection */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Subjects</h3>
              <div className="space-y-2">
                {mockSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => setSelectedSubject(subject)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedSubject.id === subject.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Selection */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Topics</h3>
              <div className="space-y-2">
                {mockTopics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedTopic.id === topic.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {topic.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Selection Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Current Selection</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Subject:</strong> {selectedSubject.name}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Topic:</strong> {selectedTopic.name}
              </p>
            </div>

            {/* API Endpoints Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">API Endpoints</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• /session/start - Initialize study session</p>
                <p>• /session/chat - AI chat responses</p>
                <p>• /session/solve - Problem solving</p>
                <p>• /plan/generate - Study plans</p>
                <p>• /session/quiz - Quiz generation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area - Deep Study Mode */}
        <div className="flex-1">
          <AgenticStudyMode 
            subject={selectedSubject.name} 
            topic={selectedTopic.name} 
          />
        </div>
      </div>

      {/* Quick AI Help Sidebar */}
      <AgenticSidebar />
    </div>
  );
}
