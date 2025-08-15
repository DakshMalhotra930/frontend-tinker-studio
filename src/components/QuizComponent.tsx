import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getQuestionBank } from '@/data/syllabus';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizComponentProps {
  topicId: string;
}

export function QuizComponent({ topicId }: QuizComponentProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [questionBank, setQuestionBank] = useState<Question[]>([]);

  useEffect(() => {
    const bank = getQuestionBank();
    const topicQuestions = bank.find(item => item.topicId === topicId)?.questions || [];
    setQuestionBank(topicQuestions);
    
    if (topicQuestions.length > 0) {
      setCurrentQuestion(topicQuestions[0]);
    }
  }, [topicId]);

  const handleOptionSelect = (optionIndex: number) => {
    if (!showAnswer) {
      setSelectedOption(optionIndex);
    }
  };

  const handleCheckAnswer = () => {
    if (selectedOption !== null) {
      setShowAnswer(true);
    }
  };

  const handleNextQuestion = () => {
    if (questionBank.length > 0) {
      const currentIndex = questionBank.findIndex(q => q.id === currentQuestion?.id);
      const nextIndex = (currentIndex + 1) % questionBank.length;
      setCurrentQuestion(questionBank[nextIndex]);
      setSelectedOption(null);
      setShowAnswer(false);
    }
  };

  if (questionBank.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Practice Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No practice questions available for this topic yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const getOptionButtonVariant = (optionIndex: number) => {
    if (!showAnswer) {
      return selectedOption === optionIndex ? 'default' : 'outline';
    }
    
    if (optionIndex === currentQuestion.correctAnswer) {
      return 'default';
    }
    
    if (selectedOption === optionIndex && optionIndex !== currentQuestion.correctAnswer) {
      return 'destructive';
    }
    
    return 'outline';
  };

  const getOptionButtonClass = (optionIndex: number) => {
    if (!showAnswer) {
      return selectedOption === optionIndex ? 'bg-primary text-primary-foreground' : '';
    }
    
    if (optionIndex === currentQuestion.correctAnswer) {
      return 'bg-success text-success-foreground hover:bg-success';
    }
    
    if (selectedOption === optionIndex && optionIndex !== currentQuestion.correctAnswer) {
      return 'bg-destructive text-destructive-foreground hover:bg-destructive';
    }
    
    return '';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Practice Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question */}
          <div className="text-lg font-medium">
            <MarkdownRenderer content={currentQuestion.question} />
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, index) => (
              <Button
                key={index}
                variant={getOptionButtonVariant(index)}
                className={`justify-start h-auto p-4 text-left whitespace-normal ${getOptionButtonClass(index)}`}
                onClick={() => handleOptionSelect(index)}
                disabled={showAnswer}
              >
                <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                {option}
              </Button>
            ))}
          </div>

          {/* Check Answer Button */}
          {!showAnswer && (
            <Button
              onClick={handleCheckAnswer}
              disabled={selectedOption === null}
              className="w-full"
            >
              Check Answer
            </Button>
          )}

          {/* Explanation */}
          {showAnswer && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Explanation</CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownRenderer content={currentQuestion.explanation} />
              </CardContent>
            </Card>
          )}

          {/* Next Question Button */}
          {showAnswer && (
            <Button
              onClick={handleNextQuestion}
              className="w-full"
              variant="outline"
            >
              Next Question
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}