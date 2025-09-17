import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { parseMCQFile, validateMCQFormat } from '@/lib/parser';
import { Deck } from '@/types';
import { storage } from '@/lib/storage';

interface TextImporterProps {
  onDeckCreated: () => void;
}

const TextImporter = ({ onDeckCreated }: TextImporterProps) => {
  const [content, setContent] = useState('');
  const [deckName, setDeckName] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!content.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some content',
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

    setIsImporting(true);

    try {
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
          description: 'No valid questions found in the content.',
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
        title: 'Deck imported successfully!',
        description: `${questions.length} questions imported to "${deckName}"`,
      });
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Failed to parse the content. Please check the format.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Direct Text Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deck-name-text">Deck Name</Label>
          <Input
            id="deck-name-text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Enter deck name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="content-text">MCQ Content</Label>
          <Textarea
            id="content-text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your MCQs here in either format:

Original format:
Question: What is 2+2?
Options:
A. 3
B. 4
C. 5
D. 6
Answer: B

Pipe format:
What is 2+2? | 3 | 4 | 5 | 6 | B"
            className="min-h-[200px] font-mono text-sm"
          />
        </div>

        <Button 
          onClick={handleImport} 
          disabled={isImporting}
          className="w-full"
        >
          <FileText className="h-4 w-4 mr-2" />
          {isImporting ? 'Importing...' : 'Import MCQs'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TextImporter;