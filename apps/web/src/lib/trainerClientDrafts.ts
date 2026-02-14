export type TrainerNoteDraft = {
  id: string;
  content: string;
  createdAt: string;
};

export type TrainerAdjustmentDraft = {
  id: string;
  content: string;
  createdAt: string;
  status: "pending_local";
};

type NotesByClient = Record<string, TrainerNoteDraft[]>;
type AdjustmentsByClient = Record<string, TrainerAdjustmentDraft[]>;

const NOTES_STORAGE_KEY = "fs_trainer_note_drafts_v1";
const ADJUSTMENTS_STORAGE_KEY = "fs_trainer_adjustment_drafts_v1";
const MAX_DRAFTS_PER_CLIENT = 20;

const isBrowser = () => typeof window !== "undefined";

const parseRecord = <T>(value: unknown): Record<string, T[]> => {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return Object.entries(record).reduce<Record<string, T[]>>((acc, [key, entries]) => {
    if (!Array.isArray(entries)) return acc;
    acc[key] = entries as T[];
    return acc;
  }, {});
};

const readFromStorage = <T>(key: string): Record<string, T[]> => {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    return parseRecord<T>(JSON.parse(raw));
  } catch {
    return {};
  }
};

const writeToStorage = <T>(key: string, value: Record<string, T[]>) => {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const createDraftId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getTrainerNoteDrafts = (clientId: string): TrainerNoteDraft[] => {
  const data = readFromStorage<TrainerNoteDraft>(NOTES_STORAGE_KEY) as NotesByClient;
  return Array.isArray(data[clientId]) ? data[clientId] : [];
};

export const getTrainerAdjustmentDrafts = (clientId: string): TrainerAdjustmentDraft[] => {
  const data = readFromStorage<TrainerAdjustmentDraft>(ADJUSTMENTS_STORAGE_KEY) as AdjustmentsByClient;
  return Array.isArray(data[clientId]) ? data[clientId] : [];
};

export const saveTrainerNoteDraft = (clientId: string, content: string) => {
  const data = readFromStorage<TrainerNoteDraft>(NOTES_STORAGE_KEY) as NotesByClient;
  const current = Array.isArray(data[clientId]) ? data[clientId] : [];
  const nextDraft: TrainerNoteDraft = {
    id: createDraftId(),
    content,
    createdAt: new Date().toISOString(),
  };

  const next = {
    ...data,
    [clientId]: [nextDraft, ...current].slice(0, MAX_DRAFTS_PER_CLIENT),
  };

  return writeToStorage(NOTES_STORAGE_KEY, next) ? next[clientId] : null;
};

export const saveTrainerAdjustmentDraft = (clientId: string, content: string) => {
  const data = readFromStorage<TrainerAdjustmentDraft>(ADJUSTMENTS_STORAGE_KEY) as AdjustmentsByClient;
  const current = Array.isArray(data[clientId]) ? data[clientId] : [];
  const nextDraft: TrainerAdjustmentDraft = {
    id: createDraftId(),
    content,
    createdAt: new Date().toISOString(),
    status: "pending_local",
  };

  const next = {
    ...data,
    [clientId]: [nextDraft, ...current].slice(0, MAX_DRAFTS_PER_CLIENT),
  };

  return writeToStorage(ADJUSTMENTS_STORAGE_KEY, next) ? next[clientId] : null;
};
