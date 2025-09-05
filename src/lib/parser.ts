import { MCQQuestion } from '@/types';

export function parseMCQFile(content: string): MCQQuestion[] {
  const questions: MCQQuestion[] = [];
  const lines = content.split('\n').map(line => line.trim());
  
  let currentQuestion: Partial<MCQQuestion> = {};
  let options: string[] = [];
  let collectingOptions = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('Question:')) {
      // Start new question
      if (currentQuestion.question && currentQuestion.answer && options.length > 0) {
        questions.push({
          id: crypto.randomUUID(),
          question: currentQuestion.question,
          options: [...options],
          answer: currentQuestion.answer,
        });
      }
      
      currentQuestion = { question: line.replace('Question:', '').trim() };
      options = [];
      collectingOptions = false;
    } else if (line.startsWith('Options:')) {
      collectingOptions = true;
    } else if (line.startsWith('Answer:')) {
      currentQuestion.answer = line.replace('Answer:', '').trim();
      collectingOptions = false;
    } else if (collectingOptions && line.match(/^[A-D]\./)) {
      // Extract option text (everything after "A. ", "B. ", etc.)
      const optionText = line.substring(3).trim();
      options.push(optionText);
    }
  }
  
  // Add the last question if it exists
  if (currentQuestion.question && currentQuestion.answer && options.length > 0) {
    questions.push({
      id: crypto.randomUUID(),
      question: currentQuestion.question,
      options: [...options],
      answer: currentQuestion.answer,
    });
  }
  
  return questions;
}

export function validateMCQFormat(content: string): { valid: boolean; error?: string } {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  if (!lines.some(line => line.startsWith('Question:'))) {
    return { valid: false, error: 'No questions found. Make sure questions start with "Question:"' };
  }
  
  if (!lines.some(line => line.startsWith('Options:'))) {
    return { valid: false, error: 'No options found. Make sure options sections start with "Options:"' };
  }
  
  if (!lines.some(line => line.startsWith('Answer:'))) {
    return { valid: false, error: 'No answers found. Make sure answers start with "Answer:"' };
  }
  
  return { valid: true };
}