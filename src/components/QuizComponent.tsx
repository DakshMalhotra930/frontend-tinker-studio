import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ProFeatureGate } from './ProFeatureGate';
import { useSubscription } from '@/hooks/useSubscription';

interface QuizData {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizComponentProps {
  quizData: QuizData;
  onNext?: () => void;
}

export function QuizComponent({ quizData, onNext }: QuizComponentProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const { useTrialSession } = useSubscription();

  const handleUseTrial = async () => {
    const success = await useTrialSession('advanced_quiz', quizData.id);
    if (success) {
      console.log('Trial session used for Advanced Quiz');
    }
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

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
    setSelectedOption(null);
    setShowAnswer(false);
    if (onNext) {
      onNext();
    }
  };

  return (
    <ProFeatureGate
      feature="advanced_quiz"
      onUpgrade={handleUpgrade}
      onUseTrial={handleUseTrial}
    >
      <div className="max-w-4xl mx-auto">
        <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Practice Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question */}
          <div className="text-lg font-medium">
            <MarkdownRenderer content={quizData.question} />
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {quizData.options.map((option, index) => (
              <Button
                key={index}
                variant={
                  showAnswer
                    ? index === quizData.correctAnswer
                      ? 'default'
                      : selectedOption === index
                        ? 'destructive'
                        : 'outline'
                    : selectedOption === index
                      ? 'default'
                      : 'outline'
                }
                className={`justify-start h-auto p-4 text-left whitespace-normal ${
                  showAnswer
                    ? index === quizData.correctAnswer
                      ? 'bg-success text-success-foreground hover:bg-success'
                      : selectedOption === index
                        ? 'bg-destructive text-destructive-foreground hover:bg-destructive'
                        : ''
                    : selectedOption === index
                      ? 'bg-primary text-primary-foreground'
                      : ''
                }`}
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
                <MarkdownRenderer content={quizData.explanation} />
              </CardContent>
            </Card>
          )}

          {/* Next Question Button */}
          {showAnswer && onNext && (
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
    </ProFeatureGate>
  );
}
