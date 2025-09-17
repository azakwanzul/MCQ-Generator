import { useState, useRef } from 'react';
import { Plus, BookOpen, Upload, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { parseMCQFile, validateMCQFormat } from '@/lib/parser';
import { Deck, DeckProgress } from '@/types';
import { useNavigate } from 'react-router-dom';
import AIGenerator from '@/components/AIGenerator';
import TextImporter from '@/components/TextImporter';

const Dashboard = () => {
  const [decks, setDecks] = useState<Deck[]>(storage.getDecks());
  const [progress, setProgress] = useState<DeckProgress[]>(storage.getAllProgress());
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    
    try {
      const content = await file.text();
      const validation = validateMCQFormat(content);
      
      if (!validation.valid) {
        toast({
          title: 'Import failed',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }

      const questions = parseMCQFile(content);
      
      if (questions.length === 0) {
        toast({
          title: 'Import failed',
          description: 'No valid questions found in the file.',
          variant: 'destructive',
        });
        return;
      }

      const deckName = file.name.replace('.txt', '');
      const newDeck: Deck = {
        id: crypto.randomUUID(),
        name: deckName,
        questions,
        createdAt: new Date(),
      };

      storage.saveDeck(newDeck);
      refreshDecks();
      
      toast({
        title: 'Deck imported successfully!',
        description: `${questions.length} questions imported from ${deckName}`,
      });
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Failed to read the file. Please check the format.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const refreshDecks = () => {
    setDecks(storage.getDecks());
    setProgress(storage.getAllProgress());
  };

  const deleteDeck = (deckId: string) => {
    storage.deleteDeck(deckId);
    refreshDecks();
    toast({
      title: 'Deck deleted',
      description: 'The deck has been removed successfully.',
    });
  };

  const getDeckProgress = (deckId: string) => {
    return progress.find(p => p.deckId === deckId);
  };

  const startStudy = (deckId: string) => {
    navigate(`/study/${deckId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">MCQDeck</h1>
            <p className="text-lg opacity-90">Your personal MCQ study companion</p>
          </div>
        </div>

        {/* Import Section */}
        <div className="mb-8">
          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ai">AI Generator</TabsTrigger>
              <TabsTrigger value="text">Direct Input</TabsTrigger>
              <TabsTrigger value="file">File Upload</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ai">
              <AIGenerator onDeckCreated={refreshDecks} />
            </TabsContent>
            
            <TabsContent value="text">
              <TextImporter onDeckCreated={refreshDecks} />
            </TabsContent>
            
            <TabsContent value="file">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload File
                  </CardTitle>
                  <CardDescription>
                    Upload a .txt file with your MCQ questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="file-upload">Choose File</Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".txt"
                        ref={fileInputRef}
                        onChange={handleFileImport}
                        disabled={isImporting}
                        className="mt-1"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Supported formats:</p>
                      <div className="bg-muted p-3 rounded mt-2 text-xs space-y-2">
                        <div>
                          <strong>Original format:</strong>
                          <pre>{`Question: What is 2+2?
Options:
A. 3
B. 4
C. 5
D. 6
Answer: B`}</pre>
                        </div>
                        <div>
                          <strong>Pipe format:</strong>
                          <pre>What is 2+2? | 3 | 4 | 5 | 6 | B</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Decks Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Your Decks</h2>
            <div className="text-sm text-muted-foreground">
              {decks.length} deck{decks.length !== 1 ? 's' : ''}
            </div>
          </div>

          {decks.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No decks yet</h3>
              <p className="text-muted-foreground mb-4">
                Import your first .txt file to get started with studying
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Import First Deck
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => {
                const deckProgress = getDeckProgress(deck.id);
                const accuracy = deckProgress ? Math.round(deckProgress.accuracy * 100) : 0;
                
                return (
                  <Card key={deck.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{deck.name}</CardTitle>
                      <CardDescription>
                        {deck.questions.length} question{deck.questions.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {deckProgress && (
                          <div className="flex justify-between text-sm">
                            <span>Accuracy:</span>
                            <span className={`font-medium ${accuracy >= 70 ? 'text-success' : 'text-warning'}`}>
                              {accuracy}%
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Created:</span>
                          <span>{deck.createdAt.toLocaleDateString()}</span>
                        </div>
                        {deck.lastStudied && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Last studied:</span>
                            <span>{deck.lastStudied.toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button 
                        onClick={() => startStudy(deck.id)}
                        className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Study
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => deleteDeck(deck.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;