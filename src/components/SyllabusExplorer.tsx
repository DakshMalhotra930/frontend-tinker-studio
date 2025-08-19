import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Subject, Chapter, Topic } from '@/data/syllabus'; // We still need the types

interface SyllabusExplorerProps {
  onTopicSelect: (topic: Topic, chapter: Chapter, subject: Subject) => void;
}

export function SyllabusExplorer({ onTopicSelect }: SyllabusExplorerProps) {
  // --- NEW: State for live syllabus data, loading, and errors ---
  const [syllabus, setSyllabus] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // --- NEW: useEffect to fetch data from your backend ---
  useEffect(() => {
    const fetchSyllabus = async () => {
      try {
        setIsLoading(true);
        // Use environment variable for backend URL
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/syllabus`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data: Subject[] = await response.json();
        setSyllabus(data);
        // Automatically select the first subject once loaded
        if (data && data.length > 0) {
          setSelectedSubject(data[0]);
        }
      } catch (err: any) {
        setError(err.message);
        console.error("Failed to fetch syllabus:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSyllabus();
  }, []); // The empty array [] ensures this runs only once when the component mounts.

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedChapter(null);
    setSelectedTopic(null);
  };

  const handleChapterClick = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setSelectedTopic(null);
  };

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);
    if (selectedChapter && selectedSubject) {
      onTopicSelect(topic, selectedChapter, selectedSubject);
    }
  };

  const groupedChapters = selectedSubject ?
    selectedSubject.chapters.reduce((acc, chapter) => {
      // Use the correct property name from your backend: class_level
      const classKey = `Class ${chapter.class_level}`;
      if (!acc[classKey]) acc[classKey] = [];
      acc[classKey].push(chapter);
      return acc;
    }, {} as Record<string, Chapter[]>) : {};

  
  // --- NEW: Render loading and error states ---
  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading syllabus...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Subjects Pane */}
      <div className="flex-1 border-b border-border">
        <div className="p-4 border-b border-border bg-card">
          <h2 className="font-semibold text-lg">Subjects</h2>
        </div>
        <ScrollArea className="h-[calc(33.33vh-50px)]">
          <div className="p-2">
            {/* --- Use the 'syllabus' state variable --- */}
            {syllabus.map((subject) => (
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
        <ScrollArea className="h-[calc(33.33vh-50px)]">
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
                      Ch. {chapter.number}: {chapter.name}
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
        <ScrollArea className="h-[calc(33.33vh-50px)]">
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
                  {topic.number} {topic.name}
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
