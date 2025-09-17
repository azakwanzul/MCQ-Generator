export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string; // The correct option letter (A, B, C, D)
}

export interface Deck {
  id: string;
  name: string;
  questions: MCQQuestion[];
  createdAt: Date;
  lastStudied?: Date;
}

export interface StudySession {
  deckId: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  startTime: Date;
  endTime?: Date;
  currentIndex?: number; // for resume
}

export interface DeckProgress {
  deckId: string;
  totalAttempts: number;
  correctAnswers: number;
  accuracy: number;
  lastSession?: StudySession;
}