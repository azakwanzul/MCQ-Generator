import { Deck, DeckProgress, StudySession } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const DECKS_KEY = 'mcqdeck_decks';
const PROGRESS_KEY = 'mcqdeck_progress';

export const storage = {
  async syncFromRemote(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    const { data: decksData } = await supabase
      .from('decks')
      .select('*')
      .or(userId ? `user_id.eq.${userId}` : 'user_id.is.null')
      .order('created_at', { ascending: true });
    const { data: progressData } = await supabase
      .from('deck_progress')
      .select('*')
      .or(userId ? `user_id.eq.${userId}` : 'user_id.is.null');

    if (decksData) {
      const decks: Deck[] = decksData.map((d: any) => ({
        id: d.id,
        name: d.name,
        questions: d.questions,
        createdAt: new Date(d.created_at),
        lastStudied: d.last_studied ? new Date(d.last_studied) : undefined,
      }));
      localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
    }
    if (progressData) {
      const progress: DeckProgress[] = progressData.map((p: any) => ({
        deckId: p.deck_id,
        totalAttempts: p.total_attempts,
        correctAnswers: p.correct_answers,
        accuracy: p.accuracy,
        lastSession: p.last_session ? {
          ...p.last_session,
          startTime: p.last_session.startTime ? new Date(p.last_session.startTime) : undefined,
          endTime: p.last_session.endTime ? new Date(p.last_session.endTime) : undefined,
        } : undefined,
      }));
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    }
  },

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
    // Fire-and-forget remote upsert
    if (isSupabaseConfigured && supabase) {
      const payload = {
        id: deck.id,
        name: deck.name,
        questions: deck.questions,
        created_at: deck.createdAt.toISOString(),
        last_studied: deck.lastStudied ? deck.lastStudied.toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      supabase.auth.getUser().then(({ data }) => {
        const uid = data.user?.id ?? null;
        const row = uid ? { ...payload, user_id: uid } : payload;
        supabase.from('decks').upsert(row, { onConflict: 'id' }).then(() => {});
      });
    }
  },

  deleteDeck(deckId: string): void {
    const decks = this.getDecks().filter(d => d.id !== deckId);
    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
    
    // Also remove progress for this deck
    const progress = this.getAllProgress();
    const filteredProgress = progress.filter(p => p.deckId !== deckId);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(filteredProgress));
    if (isSupabaseConfigured && supabase) {
      supabase.from('decks').delete().eq('id', deckId).then(() => {});
      supabase.from('deck_progress').delete().eq('deck_id', deckId).then(() => {});
    }
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
    if (isSupabaseConfigured && supabase) {
      const payload = {
        deck_id: progress.deckId,
        total_attempts: progress.totalAttempts,
        correct_answers: progress.correctAnswers,
        accuracy: progress.accuracy,
        last_session: progress.lastSession ? {
          ...progress.lastSession,
          startTime: progress.lastSession.startTime?.toISOString(),
          endTime: progress.lastSession.endTime?.toISOString(),
        } : null,
        updated_at: new Date().toISOString(),
      };
      supabase.auth.getUser().then(({ data }) => {
        const uid = data.user?.id ?? null;
        const row = uid ? { ...payload, user_id: uid } : payload;
        supabase.from('deck_progress').upsert(row, { onConflict: 'deck_id' }).then(() => {});
      });
    }
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