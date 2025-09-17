import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { Deck, MCQQuestion } from '@/types';

const EditDeck = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [deckName, setDeckName] = useState('');
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);

  useEffect(() => {
    if (!deckId) {
      navigate('/');
      return;
    }

    const decks = storage.getDecks();
    const foundDeck = decks.find(d => d.id === deckId);
    
    if (!foundDeck) {
      toast({
        title: 'Deck not found',
        description: 'The requested deck could not be found',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setDeck(foundDeck);
    setDeckName(foundDeck.name);
    setQuestions(foundDeck.questions);
  }, [deckId, navigate]);

  const addQuestion = () => {
    const newQuestion: MCQQuestion = {
      id: crypto.randomUUID(),
      question: '',
      options: ['', '', '', ''],
      answer: 'A'
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: keyof MCQQuestion, value: string | string[]) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    const newOptions = [...updatedQuestions[questionIndex].options];
    newOptions[optionIndex] = value;
    updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], options: newOptions };
    setQuestions(updatedQuestions);
  };

  const handleSave = () => {
    if (!deck) return;

    if (!deckName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a deck name',
        variant: 'destructive',
      });
      return;
    }

    const validQuestions = questions.filter(q => 
      q.question.trim() && 
      q.options.every(opt => opt.trim()) &&
      q.answer
    );

    if (validQuestions.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one complete question',
        variant: 'destructive',
      });
      return;
    }

    const updatedDeck: Deck = {
      ...deck,
      name: deckName,
      questions: validQuestions,
    };

    storage.saveDeck(updatedDeck);
    
    toast({
      title: 'Deck updated successfully!',
      description: `Updated "${deckName}" with ${validQuestions.length} questions`,
    });

    navigate('/');
  };

  if (!deck) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold mb-2">Edit Deck</h1>
          <p className="text-muted-foreground">Modify your MCQ deck</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Deck Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="deck-name">Deck Name</Label>
              <Input
                id="deck-name"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Enter deck name"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
            <Button onClick={addQuestion} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>

          {questions.map((question, questionIndex) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Question {questionIndex + 1}</CardTitle>
                  {questions.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeQuestion(questionIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Textarea
                    value={question.question}
                    onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                    placeholder="Enter your question"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="space-y-2">
                      <Label>Option {String.fromCharCode(65 + optionIndex)}</Label>
                      <Input
                        value={option}
                        onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                        placeholder={`Enter option ${String.fromCharCode(65 + optionIndex)}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  <Select
                    value={question.answer}
                    onValueChange={(value) => updateQuestion(questionIndex, 'answer', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - {question.options[0] || 'Option A'}</SelectItem>
                      <SelectItem value="B">B - {question.options[1] || 'Option B'}</SelectItem>
                      <SelectItem value="C">C - {question.options[2] || 'Option C'}</SelectItem>
                      <SelectItem value="D">D - {question.options[3] || 'Option D'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-4 pt-4">
          <Button onClick={handleSave} className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditDeck;