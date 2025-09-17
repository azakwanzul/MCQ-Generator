import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, RotateCcw, Trophy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { storage } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';
import { Deck, MCQQuestion, StudySession, DeckProgress, SrsCardState } from '@/types';

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
  // SRS state
  const [srsByQuestionId, setSrsByQuestionId] = useState<Record<string, SrsCardState>>({});
  const [dueQueue, setDueQueue] = useState<number[]>([]);
  const [queuePos, setQueuePos] = useState(0);

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

    // Initialize SRS map and due queue
    const progress = storage.getDeckProgress(deckId);
    const now = new Date();
    const initialMap: Record<string, SrsCardState> = {};
    for (const q of foundDeck.questions) {
      const prev = progress?.srsByQuestionId?.[q.id];
      initialMap[q.id] = prev ? {
        ...prev,
        dueAt: new Date(prev.dueAt),
        intervalDays: prev.intervalDays ?? 0,
        ease: prev.ease ?? 2.5,
        reps: prev.reps ?? 0,
      } : {
        dueAt: now,
        intervalDays: 0,
        ease: 2.5,
        reps: 0,
      };
    }
    setSrsByQuestionId(initialMap);
    // Build due list: questions whose dueAt <= now first, then others
    const indices = foundDeck.questions
      .map((q, i) => ({ i, due: initialMap[q.id].dueAt }))
      .sort((a, b) => a.due.getTime() - b.due.getTime())
      .map(x => x.i);
    setDueQueue(indices);
    // If there was a saved index, start the queue at that position
    if (savedIndex !== null) {
      const pos = indices.indexOf(savedIndex);
      setQueuePos(pos >= 0 ? pos : 0);
    } else {
      setQueuePos(0);
    }
  }, [deckId, navigate]);

  const effectiveIndex = dueQueue.length > 0 ? dueQueue[Math.min(queuePos, Math.max(0, dueQueue.length - 1))] : currentQuestionIndex;
  // Persist resume position using the effective index from due queue
  useEffect(() => {
    if (!deckId || !deck || dueQueue.length === 0) return;
    storage.saveResume(deckId, effectiveIndex);
  }, [deckId, deck, effectiveIndex, dueQueue.length]);

  const currentQuestion = deck?.questions[effectiveIndex];
  const isLastQuestion = queuePos >= Math.max(0, dueQueue.length - 1);

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
        currentIndex: effectiveIndex,
      } : null);
    }
  };

  const scheduleNext = (qid: string, rating: 'again' | 'hard' | 'good' | 'easy') => {
    setSrsByQuestionId(prev => {
      const curr = prev[qid] || { dueAt: new Date(), intervalDays: 0, ease: 2.5, reps: 0 };
      let ease = curr.ease;
      let interval = curr.intervalDays;
      const now = new Date();
      if (rating === 'again') {
        ease = Math.max(1.3, ease - 0.2);
        interval = 0;
      } else if (rating === 'hard') {
        ease = Math.max(1.3, ease - 0.05);
        interval = Math.max(1, Math.floor(Math.max(1, interval) * 1.2));
      } else if (rating === 'good') {
        interval = interval <= 0 ? 1 : Math.floor(interval * ease);
      } else if (rating === 'easy') {
        ease = Math.min(3.0, ease + 0.15);
        interval = interval <= 0 ? 2 : Math.floor(interval * ease * 1.5);
      }
      const dueAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
      return {
        ...prev,
        [qid]: { dueAt, intervalDays: interval, ease, reps: rating === 'again' ? curr.reps : curr.reps + 1 },
      };
    });
  };

  const handleRateAndNext = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!deck || !currentQuestion) return;
    // Update SRS schedule
    scheduleNext(currentQuestion.id, rating);
    // Advance queue
    if (isLastQuestion) {
      completeSession();
    } else {
      const nextPos = queuePos + 1;
      setQueuePos(nextPos);
      setSelectedAnswer(null);
      setShowResult(false);
      if (deckId) storage.saveResume(deckId, dueQueue[nextPos] ?? effectiveIndex);
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
      srsByQuestionId,
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
    setQueuePos(0);
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
                onClick={() => {
                  setAskedResume(true);
                  const pos = dueQueue.indexOf(resumeAvailable);
                  setQueuePos(pos >= 0 ? pos : 0);
                }}
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

  const progressPercentage = ((queuePos + (showResult ? 1 : 0)) / Math.max(1, dueQueue.length)) * 100;

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
              Question {Math.min(queuePos + 1 + (showResult ? 0 : 0), dueQueue.length)} of {dueQueue.length}
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

        {/* Rating Buttons (SRS) */}
        {showResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button onClick={() => handleRateAndNext('again')} variant="outline">Again</Button>
            <Button onClick={() => handleRateAndNext('hard')} variant="outline">Hard</Button>
            <Button onClick={() => handleRateAndNext('good')} className="bg-primary/80">Good</Button>
            <Button onClick={() => handleRateAndNext('easy')} className="bg-accent/80">Easy</Button>
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