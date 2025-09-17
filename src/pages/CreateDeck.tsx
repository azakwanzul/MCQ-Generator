import { useState } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { parseMCQFile, validateMCQFormat } from '@/lib/parser';
import { Deck, MCQQuestion } from '@/types';
import { useNavigate } from 'react-router-dom';
import TextImporter from '@/components/TextImporter';

const CreateDeck = () => {
  const [deckName, setDeckName] = useState('');
  const [questions, setQuestions] = useState<Omit<MCQQuestion, 'id'>[]>([
    { question: '', options: ['', '', '', ''], answer: 'A' }
  ]);
  const navigate = useNavigate();

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], answer: 'A' }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: string, value: string | string[]) => {
    const updatedQuestions = [...questions];
    if (field === 'options' && Array.isArray(value)) {
      updatedQuestions[index] = { ...updatedQuestions[index], options: value };
    } else if (typeof value === 'string') {
      updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    }
    setQuestions(updatedQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    const newOptions = [...updatedQuestions[questionIndex].options];
    newOptions[optionIndex] = value;
    updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], options: newOptions };
    setQuestions(updatedQuestions);
  };

  const handleCreateDeck = () => {
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

    const mcqQuestions: MCQQuestion[] = validQuestions.map(q => ({
      ...q,
      id: crypto.randomUUID(),
    }));

    const newDeck: Deck = {
      id: crypto.randomUUID(),
      name: deckName,
      questions: mcqQuestions,
      createdAt: new Date(),
    };

    storage.saveDeck(newDeck);
    
    toast({
      title: 'Deck created successfully!',
      description: `Created "${deckName}" with ${mcqQuestions.length} questions`,
    });

    navigate('/');
  };

  const onDeckCreated = () => {
    navigate('/');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Deck</h1>
        <p className="text-muted-foreground">Create MCQ decks manually or import from text</p>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Creation</TabsTrigger>
          <TabsTrigger value="import">Text Import</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Deck Information
              </CardTitle>
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
              <h2 className="text-xl font-semibold">Questions</h2>
              <Button onClick={addQuestion} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            {questions.map((question, questionIndex) => (
              <Card key={questionIndex}>
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
            <Button onClick={handleCreateDeck} className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90">
              Create Deck
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Cancel
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="import">
          <TextImporter onDeckCreated={onDeckCreated} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreateDeck;