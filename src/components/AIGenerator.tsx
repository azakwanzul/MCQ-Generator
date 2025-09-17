import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Key } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AIService } from '@/lib/ai-service';
import { parseMCQFile, validateMCQFormat } from '@/lib/parser';
import { Deck } from '@/types';
import { storage } from '@/lib/storage';

interface AIGeneratorProps {
  onDeckCreated: () => void;
}

const AIGenerator = ({ onDeckCreated }: AIGeneratorProps) => {
  const [content, setContent] = useState('');
  const [deckName, setDeckName] = useState('');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [apiKey, setApiKey] = useState(AIService.getApiKey() || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(!AIService.getApiKey());

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an API key',
        variant: 'destructive',
      });
      return;
    }

    const isValid = await AIService.testApiKey(apiKey);
    if (!isValid) {
      toast({
        title: 'Invalid API Key',
        description: 'Please check your OpenAI API key',
        variant: 'destructive',
      });
      return;
    }

    AIService.saveApiKey(apiKey);
    setShowApiKeyInput(false);
    toast({
      title: 'API Key Saved',
      description: 'Your OpenAI API key has been saved successfully',
    });
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some content to generate questions from',
        variant: 'destructive',
      });
      return;
    }

    if (!deckName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a deck name',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const result = await AIService.generateMCQs(content, numberOfQuestions);

      if (!result.success || !result.questions) {
        toast({
          title: 'Generation failed',
          description: result.error || 'Failed to generate questions',
          variant: 'destructive',
        });
        return;
      }

      const validation = validateMCQFormat(result.questions);
      if (!validation.valid) {
        toast({
          title: 'Generation failed',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }

      const questions = parseMCQFile(result.questions);
      
      if (questions.length === 0) {
        toast({
          title: 'Generation failed',
          description: 'No valid questions were generated',
          variant: 'destructive',
        });
        return;
      }

      const newDeck: Deck = {
        id: crypto.randomUUID(),
        name: deckName,
        questions,
        createdAt: new Date(),
      };

      storage.saveDeck(newDeck);
      onDeckCreated();
      
      // Reset form
      setContent('');
      setDeckName('');
      
      toast({
        title: 'Deck created successfully!',
        description: `Generated ${questions.length} questions for "${deckName}"`,
      });
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          AI MCQ Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showApiKeyInput ? (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Key className="h-4 w-4" />
              OpenAI API Key Required
            </div>
            <p className="text-sm text-muted-foreground">
              To generate MCQs with AI, you need an OpenAI API key. Your key is stored locally and never shared.
            </p>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <Button onClick={handleSaveApiKey} className="w-full">
              Save API Key
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deck-name">Deck Name</Label>
                <Input
                  id="deck-name"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="Enter deck name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="num-questions">Number of Questions</Label>
                <Input
                  id="num-questions"
                  type="number"
                  min="1"
                  max="20"
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Content to Generate Questions From</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your study material, notes, or any text content here..."
                className="min-h-[150px]"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate MCQs'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowApiKeyInput(true)}
                size="icon"
              >
                <Key className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AIGenerator;