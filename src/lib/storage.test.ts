import { describe, it, expect } from 'vitest';

import { storage } from './storage';

describe('storage resume helpers', () => {
  it('saves and reads resume index', () => {
    storage.saveResume('deck-1', 3);
    expect(storage.getResume('deck-1')).toBe(3);
  });
});


