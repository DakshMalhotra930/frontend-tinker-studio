import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Subject, Chapter, Topic, syllabusData } from '@/data/syllabus';

interface SyllabusExplorerProps {
  onTopicSelect: (topic: Topic, chapter: Chapter, subject: Subject) => void;
}

export function SyllabusExplorer({ onTopicSelect }: SyllabusExplorerProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedChapter(null);
    setSelectedTopic(null);
    
    // Smooth scroll to chapters pane
    setTimeout(() => {
      const chaptersPane = document.getElementById('chapters-pane');
      chaptersPane?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleChapterClick = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setSelectedTopic(null);
    
    // Smooth scroll to topics pane
    setTimeout(() => {
      const topicsPane = document.getElementById('topics-pane');
      topicsPane?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);
    if (selectedChapter && selectedSubject) {
      onTopicSelect(topic, selectedChapter, selectedSubject);
    }
  };

  // Group chapters by class
  const groupedChapters = selectedSubject ? 
    selectedSubject.chapters.reduce((acc, chapter) => {
      const classKey = `Class ${chapter.class}`;
      if (!acc[classKey]) acc[classKey] = [];
      acc[classKey].push(chapter);
      return acc;
    }, {} as Record<string, Chapter[]>) : {};

  return (
    <div className="h-full flex flex-col">
      {/* Subjects Pane */}
      <div className="flex-1 border-b border-border">
        <div className="p-4 border-b border-border bg-card">
          <h2 className="font-semibold text-lg">Subjects</h2>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {syllabusData.map((subject) => (
              <Button
                key={subject.id}
                variant="ghost"
                className={`w-full justify-start mb-1 h-auto p-3 ${
                  selectedSubject?.id === subject.id
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-foreground hover:bg-muted'
                }`}
                onClick={() => handleSubjectClick(subject)}
              >
                {subject.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chapters Pane */}
      <div id="chapters-pane" className="flex-1 border-b border-border">
        <div className="p-4 border-b border-border bg-card">
          <h2 className="font-semibold text-lg">Chapters</h2>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {selectedSubject ? (
              Object.entries(groupedChapters).map(([className, chapters]) => (
                <div key={className} className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 px-3">
                    {className}
                  </h3>
                  {chapters.map((chapter) => (
                    <Button
                      key={chapter.id}
                      variant="ghost"
                      className={`w-full justify-start mb-1 h-auto p-3 ${
                        selectedChapter?.id === chapter.id
                          ? 'bg-primary text-primary-foreground font-bold'
                          : 'text-foreground hover:bg-muted'
                      }`}
                      onClick={() => handleChapterClick(chapter)}
                    >
                      {chapter.name}
                    </Button>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Select a subject to view chapters
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Topics Pane */}
      <div id="topics-pane" className="flex-1">
        <div className="p-4 border-b border-border bg-card">
          <h2 className="font-semibold text-lg">Topics</h2>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {selectedChapter ? (
              selectedChapter.topics.map((topic) => (
                <Button
                  key={topic.id}
                  variant="ghost"
                  className={`w-full justify-start mb-1 h-auto p-3 ${
                    selectedTopic?.id === topic.id
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'text-foreground hover:bg-muted'
                  }`}
                  onClick={() => handleTopicClick(topic)}
                >
                  {topic.name}
                </Button>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Select a chapter to view topics
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}