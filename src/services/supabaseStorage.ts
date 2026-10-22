import { getSupabase } from './supabaseClient';
import type { Game } from '../types/game';
import type { GameHistoryRecord } from './gameStorage';

/**
 * Supabase Database Service
 * Enforces RLS: Guests (unauthenticated) cannot write to Supabase tables.
 * Only authenticated teachers can query or mutate their own games and history.
 */

export async function fetchUserGamesFromSupabase(userId: string): Promise<Game[]> {
  const supabase = getSupabase();
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Storage] fetchUserGames error:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      theme: row.theme || 'candy',
      category: row.category || 'chu_cai',
      gameType: row.game_type || 'multiple_choice',
      targetAge: row.target_age || '5-6 tuổi',
      coverImage: row.cover_image,
      thumbnailUrl: row.thumbnail_url,
      questions: row.questions || [],
      settings: row.settings || { timePerQuestion: 25, speedBonus: true, maxTeams: 8, soundEffects: true },
      playCount: row.play_count || 0,
      createdAt: Number(row.created_at) || Date.now(),
      updatedAt: row.updated_at ? Number(row.updated_at) : undefined,
      deletedAt: row.deleted_at ? Number(row.deleted_at) : undefined,
    }));
  } catch (err) {
    console.warn('[Supabase Storage] Exception fetching games:', err);
    return [];
  }
}

export async function saveGameToSupabase(
  game: Game,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Chưa cấu hình Supabase Client.' };
  }

  // Strict constraint check: Unauthenticated guests are not allowed to write
  if (!userId) {
    return {
      success: false,
      error: 'Vui lòng đăng nhập tài khoản giáo viên để lưu trò chơi lên máy chủ Supabase.',
    };
  }

  try {
    const payload = {
      id: game.id,
      user_id: userId,
      title: game.title,
      description: game.description || '',
      theme: game.theme || 'candy',
      category: game.category || 'chu_cai',
      game_type: game.gameType || 'multiple_choice',
      target_age: game.targetAge || '5-6 tuổi',
      cover_image: game.coverImage || null,
      thumbnail_url: game.thumbnailUrl || null,
      questions: game.questions || [],
      settings: game.settings || {},
      play_count: game.playCount || 0,
      created_at: game.createdAt || Date.now(),
      updated_at: Date.now(),
      deleted_at: game.deletedAt || null,
    };

    const { error } = await supabase.from('games').upsert(payload, {
      onConflict: 'id',
    });

    if (error) {
      console.error('[Supabase Storage] Error upserting game:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Storage] Exception upserting game:', err);
    return { success: false, error: err?.message || 'Lỗi lưu trữ Supabase' };
  }
}

export async function deleteGameFromSupabase(
  gameId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase || !userId) {
    return { success: false, error: 'Chưa đăng nhập' };
  }

  try {
    const { error } = await supabase
      .from('games')
      .update({ deleted_at: Date.now() })
      .eq('id', gameId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi xóa trò chơi trên Supabase' };
  }
}

export async function saveHistoryToSupabase(
  record: GameHistoryRecord,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase || !userId) {
    return { success: false, error: 'Chưa xác thực' };
  }

  try {
    const payload = {
      id: record.id,
      user_id: userId,
      game_title: record.gameTitle,
      room_code: record.roomCode,
      played_at: record.date || Date.now(),
      teams_count: record.teamsCount || 0,
      questions_count: record.questionsCount || 0,
      winner_team_name: record.winnerTeamName || '',
      winner_score: record.winnerScore || 0,
    };

    const { error } = await supabase.from('game_history').upsert(payload);
    if (error) {
      console.warn('[Supabase Storage] saveHistory error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi lưu lịch sử' };
  }
}

export async function fetchHistoryFromSupabase(userId: string): Promise<GameHistoryRecord[]> {
  const supabase = getSupabase();
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('game_history')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      gameTitle: row.game_title,
      roomCode: row.room_code,
      date: Number(row.played_at),
      teamsCount: row.teams_count,
      questionsCount: row.questions_count,
      winnerTeamName: row.winner_team_name,
      winnerScore: row.winner_score,
    }));
  } catch {
    return [];
  }
}
