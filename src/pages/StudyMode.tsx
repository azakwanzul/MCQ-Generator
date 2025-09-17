import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, RotateCcw, Trophy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { storage } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';
import { Deck, MCQQuestion, StudySession, DeckProgress } from '@/types';

const StudyMode = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [session, setSession] = useState<StudySession | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState<number | null>(null);
  const [askedResume, setAskedResume] = useState(false);

  useEffect(() => {
    if (!deckId) {
      navigate('/');
      return;
    }

    const foundDeck = storage.getDecks().find(d => d.id === deckId);
    if (!foundDeck) {
      toast({
        title: 'Deck not found',
        description: 'The requested deck could not be found.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setDeck(foundDeck);

    const savedIndex = storage.getResume(deckId);
    setResumeAvailable(savedIndex !== null ? savedIndex : null);

    setSession({
      deckId,
      totalQuestions: foundDeck.questions.length,
      correctAnswers: 0,
      incorrectAnswers: 0,
      startTime: new Date(),
      currentIndex: savedIndex ?? 0,
    });

    if (savedIndex !== null) {
      setCurrentQuestionIndex(savedIndex);
    }
  }, [deckId, navigate]);

  useEffect(() => {
    if (!deckId) return;
    storage.saveResume(deckId, currentQuestionIndex);
  }, [deckId, currentQuestionIndex]);

  const currentQuestion = deck?.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === (deck?.questions.length ?? 0) - 1;

  const handleAnswerSelect = (option: string) => {
    if (showResult) return;
    setSelectedAnswer(option);
    setShowResult(true);

    const isCorrect = option === currentQuestion?.answer;
    
    if (session) {
      setSession(prev => prev ? {
        ...prev,
        correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
        incorrectAnswers: prev.incorrectAnswers + (isCorrect ? 0 : 1),
        currentIndex: currentQuestionIndex,
      } : null);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      completeSession();
    } else {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
      setShowResult(false);
      if (deckId) storage.saveResume(deckId, nextIndex);
    }
  };

  const completeSession = () => {
    if (!session || !deck) return;

    const completedSession: StudySession = {
      ...session,
      endTime: new Date(),
      currentIndex: deck.questions.length - 1,
    };

    // Update deck last studied
    const updatedDeck = { ...deck, lastStudied: new Date() };
    storage.saveDeck(updatedDeck);

    // Update progress
    const existingProgress = storage.getDeckProgress(deckId!);
    const newAccuracy = completedSession.correctAnswers / completedSession.totalQuestions;
    
    const updatedProgress: DeckProgress = {
      deckId: deckId!,
      totalAttempts: (existingProgress?.totalAttempts || 0) + 1,
      correctAnswers: (existingProgress?.correctAnswers || 0) + completedSession.correctAnswers,
      accuracy: existingProgress 
        ? ((existingProgress.correctAnswers + completedSession.correctAnswers) / 
           ((existingProgress.totalAttempts * completedSession.totalQuestions) + completedSession.totalQuestions))
        : newAccuracy,
      lastSession: completedSession,
    };

    storage.saveProgress(updatedProgress);
    // Clear resume state on complete
    if (deckId) storage.saveResume(deckId, 0);

    setIsCompleted(true);

    toast({
      title: 'Study session completed!',
      description: `You got ${completedSession.correctAnswers}/${completedSession.totalQuestions} correct (${Math.round(newAccuracy * 100)}%)`,
    });
  };

  const restartSession = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCompleted(false);
    setSession({
      deckId: deckId!,
      totalQuestions: deck!.questions.length,
      correctAnswers: 0,
      incorrectAnswers: 0,
      startTime: new Date(),
      currentIndex: 0,
    });
    if (deckId) storage.saveResume(deckId, 0);
  };

  const getOptionLetter = (index: number) => String.fromCharCode(65 + index); // A, B, C, D

  if (!deck || !currentQuestion || !session) {
    return <div>Loading...</div>;
  }

  // Resume prompt
  if (resumeAvailable !== null && !askedResume) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Resume your session?</CardTitle>
            <CardDescription>
              Continue from question {resumeAvailable + 1} or start over.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={() => { setAskedResume(true); setCurrentQuestionIndex(resumeAvailable); }}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <Button 
                variant="outline"
                onClick={() => { setAskedResume(true); restartSession(); }}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restart
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercentage = ((currentQuestionIndex + (showResult ? 1 : 0)) / deck.questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {deck.questions.length}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{deck.name}</span>
              <span>{Math.round(progressPercentage)}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const optionLetter = getOptionLetter(index);
                const isSelected = selectedAnswer === optionLetter;
                const isCorrect = optionLetter === currentQuestion.answer;
                
                let buttonClass = "w-full text-left p-4 h-auto justify-start text-wrap";
                
                if (showResult) {
                  if (isCorrect) {
                    buttonClass += " bg-success/10 border-success text-success";
                  } else if (isSelected && !isCorrect) {
                    buttonClass += " bg-destructive/10 border-destructive text-destructive";
                  } else {
                    buttonClass += " opacity-50";
                  }
                } else if (isSelected) {
                  buttonClass += " bg-primary/10 border-primary";
                }

                return (
                  <Button
                    key={index}
                    variant="outline"
                    className={buttonClass}
                    onClick={() => handleAnswerSelect(optionLetter)}
                    disabled={showResult}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <span className="font-bold text-sm mt-0.5">
                        {optionLetter}.
                      </span>
                      <span className="flex-1">{option}</span>
                      {showResult && isCorrect && (
                        <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <X className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Next Button */}
        {showResult && (
          <div className="text-center">
            <Button 
              onClick={handleNext}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {isLastQuestion ? 'Complete Session' : 'Next Question'}
            </Button>
          </div>
        )}

        {/* Score Display */}
        <div className="mt-8 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded-full"></div>
            <span>Correct: {session.correctAnswers}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded-full"></div>
            <span>Incorrect: {session.incorrectAnswers}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyMode;