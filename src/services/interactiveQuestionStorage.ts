import { Question, InteractiveCanvasConfig } from '../types/game';
import { getAllGames } from './gameStorage';

export interface SavedInteractiveQuestion {
  id: string;
  title: string;
  gameTitle?: string;
  category?: string;
  canvasConfig: InteractiveCanvasConfig;
  points: number;
  explanation?: string;
  createdAt: number;
  timeLimit?: number;
  readQuestionAudio?: boolean;
}

const STORAGE_KEY = 'vuihoc_saved_interactive_questions';
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch {}
  });
}

export function subscribeInteractiveQuestions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Retrieves all interactive drag & drop questions created by the user,
 * combining direct saved interactive questions and questions from user's custom games.
 */
export function getSavedInteractiveQuestions(): SavedInteractiveQuestion[] {
  const result: SavedInteractiveQuestion[] = [];
  const seenIds = new Set<string>();

  // 1. Load from explicit interactive question storage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: SavedInteractiveQuestion) => {
            if (item && item.id && item.canvasConfig) {
              result.push(item);
              seenIds.add(item.id);
            }
          });
        }
      }
    } catch (err) {
      console.warn('Error reading saved interactive questions:', err);
    }
  }

  // 2. Scan all games in library for drag & drop questions created by the user
  try {
    const allGames = getAllGames();
    allGames.forEach(game => {
      if (Array.isArray(game.questions)) {
        game.questions.forEach(q => {
          if ((q.type === 'drag_drop' || Boolean(q.canvasConfig)) && q.canvasConfig) {
            // Deduplicate by ID or canvas structure
            const signature = q.id || `${game.id}_${q.title}`;
            if (!seenIds.has(signature) && !seenIds.has(q.id)) {
              seenIds.add(signature);
              seenIds.add(q.id);
              result.push({
                id: q.id || `iq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                title: q.title || 'Câu hỏi kéo thả tương tác',
                gameTitle: game.title,
                category: game.category || 'Chữ cái',
                canvasConfig: q.canvasConfig,
                points: q.points || 10,
                explanation: q.explanation,
                createdAt: game.updatedAt || game.createdAt || Date.now(),
                timeLimit: q.timeLimit,
                readQuestionAudio: q.readQuestionAudio,
              });
            }
          }
        });
      }
    });
  } catch (err) {
    console.warn('Error extracting drag & drop questions from games:', err);
  }

  // Sort newest first
  return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Saves or updates an interactive question into the user's interactive question bank
 */
export function saveInteractiveQuestion(question: Question, gameTitle?: string): void {
  if (!question || !question.canvasConfig) return;
  if (typeof window === 'undefined') return;

  try {
    const currentList = getDirectSavedQuestions();
    const existingIdx = currentList.findIndex(item => item.id === question.id);

    const record: SavedInteractiveQuestion = {
      id: question.id || 'iq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: question.title || 'Câu hỏi kéo thả mới',
      gameTitle: gameTitle || 'Bảng tương tác',
      category: 'Tương tác',
      canvasConfig: JSON.parse(JSON.stringify(question.canvasConfig)),
      points: question.points || 10,
      explanation: question.explanation,
      createdAt: Date.now(),
      timeLimit: question.timeLimit,
      readQuestionAudio: question.readQuestionAudio,
    };

    if (existingIdx >= 0) {
      currentList[existingIdx] = record;
    } else {
      currentList.unshift(record);
    }

    // Keep up to 50 questions
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList.slice(0, 50)));
    notifyListeners();
  } catch (err) {
    console.warn('Failed to save interactive question:', err);
  }
}

/**
 * Deletes an interactive question from the dedicated storage
 */
export function deleteInteractiveQuestion(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const currentList = getDirectSavedQuestions().filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
    notifyListeners();
  } catch (err) {
    console.warn('Failed to delete interactive question:', err);
  }
}

function getDirectSavedQuestions(): SavedInteractiveQuestion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
