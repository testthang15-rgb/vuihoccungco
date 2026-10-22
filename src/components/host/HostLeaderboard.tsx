import React from 'react';
import { Trophy, ArrowRight, Award, Home } from 'lucide-react';
import { SessionState, LeaderboardEntry } from '../../types/game';
import { TEAM_PRESETS } from '../../data/teamPresets';
import { sounds } from '../../utils/sound';

interface HostLeaderboardProps {
  session: SessionState;
  onContinue: () => void;
  onExit?: () => void;
}

export const HostLeaderboard: React.FC<HostLeaderboardProps> = ({
  session,
  onContinue,
  onExit,
}) => {
  const teamsList = Object.values(session.teams);

  // Compute leaderboards
  const entries: LeaderboardEntry[] = teamsList.map(team => {
    let correctCount = 0;
    let totalAnswered = 0;
    let totalTime = 0;

    Object.values(session.answers).forEach(qAnswers => {
      const ans = qAnswers[team.teamId];
      if (ans) {
        totalAnswered++;
        if (ans.isCorrect) correctCount++;
        totalTime += ans.responseTimeMs;
      }
    });

    return {
      teamId: team.teamId,
      teamName: team.teamName,
      icon: team.icon,
      score: team.score,
      correctCount,
      totalAnswered,
      avgResponseTimeMs: totalAnswered > 0 ? totalTime / totalAnswered : 0,
      rank: 1,
    };
  });

  // Sort by score desc, then by avg response time asc
  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.avgResponseTimeMs - b.avgResponseTimeMs;
  });

  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  const medals = ['🥇', '🥈', '🥉', '🏅'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      <div className="bg-white rounded-3xl p-6 sm:p-10 border-2 border-indigo-100 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
          🏆
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          BẢNG XẾP HẠNG TẠM THỜI
        </h2>
        <p className="text-sm font-semibold text-slate-500 mt-1 mb-8">
          Điểm số sau câu {session.currentQuestionIndex + 1} / {session.game.questions.length}
        </p>

        {/* Podium / Ranks */}
        <div className="flex flex-col gap-3.5 max-w-xl mx-auto mb-8">
          {entries.map((entry) => {
            const preset = TEAM_PRESETS.find(p => p.id === entry.teamId);
            const medal = medals[entry.rank - 1] || '⭐';

            return (
              <div
                key={entry.teamId}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-transform hover:scale-[1.01] ${
                  entry.rank === 1
                    ? 'border-amber-300 bg-amber-50/70 shadow-md ring-2 ring-amber-200'
                    : entry.rank === 2
                    ? 'border-slate-300 bg-slate-50/80 shadow-sm'
                    : entry.rank === 3
                    ? 'border-orange-300 bg-orange-50/60 shadow-sm'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="text-3xl font-black shrink-0 w-10 text-center">
                    {medal}
                  </div>
                  <div className={`w-12 h-12 rounded-2xl ${preset?.bgColor || 'bg-slate-500'} text-white flex items-center justify-center text-2xl shadow-sm`}>
                    {entry.icon}
                  </div>
                  <div className="text-left">
                    <h4 className="font-black text-base sm:text-lg text-slate-900">
                      {entry.teamName}
                    </h4>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                      <span>Đúng: {entry.correctCount} câu</span>
                      <span>·</span>
                      <span>Hạng {entry.rank}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-indigo-700 font-mono">
                    {entry.score}
                  </span>
                  <span className="text-xs font-extrabold text-slate-500 block uppercase">
                    điểm
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            onContinue();
          }}
          className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg flex items-center justify-center gap-2 mx-auto shadow-lg shadow-indigo-200 transition active:scale-95 cursor-pointer"
        >
          <span>TIẾP TỤC TRÒ CHƠI</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
