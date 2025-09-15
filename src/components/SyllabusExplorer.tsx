import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Subject, Chapter, Topic } from '@/data/syllabus'; // We still need the types
import { syllabusData } from '@/data/syllabus'; // Import local data as fallback
import { BookOpen, Layers, Target, GraduationCap, ChevronRight, Sparkles } from 'lucide-react';

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
        setError(null);
        
        // Use centralized API base URL
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://praxis-ai.fly.dev'}/api/syllabus`;
        console.log('Fetching syllabus from:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data: Subject[] = await response.json();
        console.log('Syllabus data received:', data);
        
        if (data && Array.isArray(data) && data.length > 0) {
          setSyllabus(data);
          setSelectedSubject(data[0]);
        } else {
          throw new Error('Empty or invalid syllabus data received');
        }
      } catch (err: any) {
        console.warn("Failed to fetch syllabus from API, using local data:", err);
        // Fallback to local data instead of showing error
        setSyllabus(syllabusData);
        if (syllabusData && syllabusData.length > 0) {
          setSelectedSubject(syllabusData[0]);
        }
        setError(null); // Clear error since we have fallback data
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure component is mounted and add timeout
    const timeoutId = setTimeout(fetchSyllabus, 100);
    return () => clearTimeout(timeoutId);
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
      // Use the correct property name from your backend: class
      const classKey = `Class ${chapter.class}`;
      if (!acc[classKey]) acc[classKey] = [];
      acc[classKey].push(chapter);
      return acc;
    }, {} as Record<string, Chapter[]>) : {};

  
  // --- NEW: Render loading and error states ---
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-800">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600/20 to-purple-400/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <BookOpen className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-zinc-400 font-medium">Loading syllabus...</p>
        </div>
      </div>
    );
  }

  // Remove error display since we have fallback data
  // if (error) {
  //   return (
  //     <div className="h-full flex items-center justify-center">
  //       <div className="text-center space-y-4 p-6 bg-destructive/10 rounded-xl border border-destructive/20 max-w-md">
  //         <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
  //           <Target className="w-8 h-8 text-destructive" />
  //         </div>
  //         <p className="text-destructive font-medium">Error: {error}</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="h-full flex flex-col bg-zinc-800">
      {/* Enhanced Subjects Pane */}
      <div className="flex-1 border-b border-zinc-700">
        <div className="p-5 border-b border-zinc-700 bg-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600 rounded-lg shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-bold text-xl text-white">
              Subjects
            </h2>
          </div>
        </div>
        <ScrollArea className="h-[calc(33.33vh-60px)]">
          <div className="p-3">
            {/* --- Use the 'syllabus' state variable --- */}
            {syllabus.map((subject) => (
              <Button
                key={subject.id}
                variant="ghost"
                className={`w-full justify-start mb-2 h-auto p-4 rounded-xl transition-all duration-200 ease-in-out ${
                  selectedSubject?.id === subject.id
                    ? 'bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/25'
                    : 'text-zinc-300 hover:bg-zinc-700 hover:shadow-md'
                }`}
                onClick={() => handleSubjectClick(subject)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className={`w-3 h-3 rounded-full ${
                    selectedSubject?.id === subject.id ? 'bg-white' : 'bg-purple-400'
                  }`} />
                  <span className="text-left">{subject.name}</span>
                  {selectedSubject?.id === subject.id && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Enhanced Chapters Pane */}
      <div id="chapters-pane" className="flex-1 border-b border-zinc-700">
        <div className="p-5 border-b border-zinc-700 bg-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500 rounded-lg shadow-md">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-bold text-xl text-white">
              Chapters
            </h2>
          </div>
        </div>
        <ScrollArea className="h-[calc(33.33vh-60px)]">
          <div className="p-3">
            {selectedSubject ? (
              Object.entries(groupedChapters).map(([className, chapters]) => (
                <div key={className} className="mb-6">
                  <div className="flex items-center space-x-2 mb-3 px-3">
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-purple-400">
                      {className}
                    </h3>
                  </div>
                  {chapters.map((chapter) => (
                    <Button
                      key={chapter.id}
                      variant="ghost"
                      className={`w-full justify-start mb-2 h-auto p-4 rounded-xl transition-all duration-200 ease-in-out ${
                        selectedChapter?.id === chapter.id
                          ? 'bg-purple-500 text-white font-bold shadow-lg shadow-purple-500/25'
                          : 'text-zinc-300 hover:bg-zinc-700 hover:shadow-md'
                      }`}
                      onClick={() => handleChapterClick(chapter)}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div className={`w-3 h-3 rounded-full ${
                          selectedChapter?.id === chapter.id ? 'bg-white' : 'bg-purple-400'
                        }`} />
                        <div className="text-left">
                          <div className="font-medium">{chapter.name}</div>
                          <div className="text-xs opacity-70 mt-1">{chapter.topics.length} topics</div>
                        </div>
                        {selectedChapter?.id === chapter.id && (
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Layers className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-zinc-400 font-medium">Select a subject to view chapters</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Enhanced Topics Pane */}
      <div id="topics-pane" className="flex-1">
        <div className="p-5 border-b border-zinc-700 bg-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-400 rounded-lg shadow-md">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-bold text-xl text-white">
              Topics
            </h2>
          </div>
        </div>
        <ScrollArea className="h-[calc(33.33vh-60px)]">
          <div className="p-3">
            {selectedChapter ? (
              <div className="space-y-3">
                {selectedChapter.topics.map((topic) => (
                  <Button
                    key={topic.id}
                    variant="ghost"
                    className={`w-full justify-start mb-2 h-auto p-4 rounded-xl transition-all duration-200 ease-in-out ${
                      selectedTopic?.id === topic.id
                        ? 'bg-purple-400 text-white font-bold shadow-lg shadow-purple-400/25'
                        : 'text-zinc-300 hover:bg-zinc-700 hover:shadow-md'
                    }`}
                    onClick={() => handleTopicClick(topic)}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedTopic?.id === topic.id ? 'bg-white' : 'bg-purple-400'
                      }`} />
                      <div className="text-left">
                        <div className="font-medium">{topic.name}</div>
                        <div className="text-xs opacity-70 mt-1">Click to study</div>
                      </div>
                      {selectedTopic?.id === topic.id && (
                        <div className="ml-auto">
                          <Badge className="text-xs bg-purple-600 text-white">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Selected
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-zinc-400 font-medium">Select a chapter to view topics</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
