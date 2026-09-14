import type { Position } from './types';

export interface JournalEntry {
  id: string;
  timestamp: number;
  formattedDate: string;
  sectorId: string;
  playerPos?: { x: number; y: number };
  content: string;
}

export const JOURNAL_STORAGE_KEY = 'metropolis_2400_journal';

export const memoryJournalBackup: JournalEntry[] = [];

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function generateJournalId(timestamp: number): string {
  return `journal_${timestamp}_${Math.random().toString(36).slice(2, 10)}`;
}

function persistToLocalStorage(entries: JournalEntry[]): void {
  if (!hasLocalStorage()) {
    return;
  }
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Silently fail if localStorage is unavailable or quota exceeded
  }
}

export function loadJournalEntries(): JournalEntry[] {
  if (hasLocalStorage()) {
    try {
      const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed as JournalEntry[];
        }
      }
    } catch {
      // Fall through to memory backup
    }
  }
  return [...memoryJournalBackup];
}

export function saveJournalEntry(
  content: string,
  sectorId: string,
  playerPos?: { x: number; y: number }
): JournalEntry {
  const timestamp = Date.now();
  const entry: JournalEntry = {
    id: generateJournalId(timestamp),
    timestamp,
    formattedDate: formatTimestamp(timestamp),
    sectorId,
    playerPos,
    content,
  };

  const entries = loadJournalEntries();
  entries.unshift(entry);

  persistToLocalStorage(entries);
  memoryJournalBackup.length = 0;
  memoryJournalBackup.push(...entries);

  return entry;
}

export function deleteJournalEntry(id: string): boolean {
  const entries = loadJournalEntries();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return false;
  }

  entries.splice(index, 1);
  persistToLocalStorage(entries);
  memoryJournalBackup.length = 0;
  memoryJournalBackup.push(...entries);

  return true;
}

export function clearJournalEntries(): void {
  persistToLocalStorage([]);
  memoryJournalBackup.length = 0;
}
