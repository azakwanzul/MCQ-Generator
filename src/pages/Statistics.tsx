import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Target, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { storage } from '@/lib/storage';
import { Deck, DeckProgress } from '@/types';

const Statistics = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [progress, setProgress] = useState<DeckProgress[]>([]);

  useEffect(() => {
    setDecks(storage.getDecks());
    setProgress(storage.getAllProgress());
  }, []);

  const totalQuestions = decks.reduce((sum, deck) => sum + deck.questions.length, 0);
  const totalAttempts = progress.reduce((sum, p) => sum + p.totalAttempts, 0);
  const totalCorrect = progress.reduce((sum, p) => sum + p.correctAnswers, 0);
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-success';
    if (accuracy >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Statistics</h1>
        <p className="text-muted-foreground">Track your learning progress across all decks</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Decks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{decks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuestions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttempts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getAccuracyColor(overallAccuracy)}`}>
              {overallAccuracy}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deck Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Deck Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {progress.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No study sessions yet</p>
              <p className="text-sm">Start studying to see your progress here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {progress.map((deckProgress) => {
                const deck = decks.find(d => d.id === deckProgress.deckId);
                if (!deck) return null;

                const accuracy = Math.round(deckProgress.accuracy * 100);
                
                return (
                  <div key={deckProgress.deckId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{deck.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {deck.questions.length} questions • {deckProgress.totalAttempts} attempts
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${getAccuracyColor(accuracy)}`}>
                        {accuracy}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {deckProgress.correctAnswers}/{deckProgress.totalAttempts} correct
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistics;