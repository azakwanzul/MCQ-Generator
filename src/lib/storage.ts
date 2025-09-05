import { Deck, DeckProgress, StudySession } from '@/types';

const DECKS_KEY = 'mcqdeck_decks';
const PROGRESS_KEY = 'mcqdeck_progress';

export const storage = {
  getDecks(): Deck[] {
    const stored = localStorage.getItem(DECKS_KEY);
    if (!stored) return [];
    
    return JSON.parse(stored).map((deck: any) => ({
      ...deck,
      createdAt: new Date(deck.createdAt),
      lastStudied: deck.lastStudied ? new Date(deck.lastStudied) : undefined,
    }));
  },

  saveDeck(deck: Deck): void {
    const decks = this.getDecks();
    const existingIndex = decks.findIndex(d => d.id === deck.id);
    
    if (existingIndex >= 0) {
      decks[existingIndex] = deck;
    } else {
      decks.push(deck);
    }
    
    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
  },

  deleteDeck(deckId: string): void {
    const decks = this.getDecks().filter(d => d.id !== deckId);
    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
    
    // Also remove progress for this deck
    const progress = this.getAllProgress();
    const filteredProgress = progress.filter(p => p.deckId !== deckId);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(filteredProgress));
  },

  getDeckProgress(deckId: string): DeckProgress | null {
    const progress = this.getAllProgress();
    return progress.find(p => p.deckId === deckId) || null;
  },

  saveProgress(progress: DeckProgress): void {
    const allProgress = this.getAllProgress();
    const existingIndex = allProgress.findIndex(p => p.deckId === progress.deckId);
    
    if (existingIndex >= 0) {
      allProgress[existingIndex] = progress;
    } else {
      allProgress.push(progress);
    }
    
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
  },

  getAllProgress(): DeckProgress[] {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (!stored) return [];
    
    return JSON.parse(stored).map((progress: any) => ({
      ...progress,
      lastSession: progress.lastSession ? {
        ...progress.lastSession,
        startTime: new Date(progress.lastSession.startTime),
        endTime: progress.lastSession.endTime ? new Date(progress.lastSession.endTime) : undefined,
      } : undefined,
    }));
  },
};