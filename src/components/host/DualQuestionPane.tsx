import React from 'react';
import { Question, ConnectedTeam, TeamAnswer } from '../../types/game';
import { TEAM_PRESETS } from '../../data/teamPresets';
import {
  CheckCircle2,
  Hourglass,
  WifiOff,
  Sparkles,
  HelpCircle,
  BookOpen,
  Layers,
  Check,
} from 'lucide-react';

interface DualQuestionPaneProps {
  label: string; // e.g. "BỘ CÂU HỎI 1 (ĐỀ A)"
  badgeColor: 'indigo' | 'pink';
  gameTitle: string;
  gameCategory?: string;
  question?: Question;
  questionIndex: number;
  totalQuestions: number;
  teams: ConnectedTeam[];
  answers: Record<string, TeamAnswer>;
  drafts?: Record<string, { textAnswer?: string; drawingDataUrl?: string; hasDrawn?: boolean; updatedAt?: number }>;
}

export const DualQuestionPane: React.FC<DualQuestionPaneProps> = ({
  label,
  badgeColor,
  gameTitle,
  gameCategory,
  question,
  questionIndex,
  totalQuestions,
  teams,
  answers,
  drafts,
}) => {
  const isIndigo = badgeColor === 'indigo';
  const answeredCount = teams.filter(t => Boolean(answers[t.teamId])).length;

  if (!question) {
    return (
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-md flex flex-col justify-center items-center text-center min-h-[400px]">
        <span className="text-4xl mb-3">🏁</span>
        <h3 className="font-black text-slate-700 text-lg">
          {label}: Đã hoàn thành tất cả câu hỏi!
        </h3>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Bộ câu hỏi này có ít câu hơn hoặc đã hết câu hỏi.
        </p>
      </div>
    );
  }

  const isOpenEnded = question.type === 'open_ended';
  const isDragDrop = question.type === 'drag_drop' && Boolean(question.canvasConfig);
  const isHtml = question.type === 'html_game' || Boolean(question.htmlContent);
  const isWordDrag = question.type === 'word_drag_drop';
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className={`bg-white rounded-3xl border-2 shadow-xl flex flex-col justify-between overflow-hidden transition ${
      isIndigo ? 'border-indigo-200' : 'border-pink-200'
    }`}>
      {/* Top Header Strip */}
      <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${
        isIndigo ? 'bg-indigo-50/80 border-indigo-100' : 'bg-pink-50/80 border-pink-100'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white shrink-0 shadow-2xs ${
            isIndigo ? 'bg-indigo-600' : 'bg-pink-600'
          }`}>
            {label}
          </span>
          <h4 className="font-black text-sm text-slate-900 truncate" title={gameTitle}>
            {gameTitle}
          </h4>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-black text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
            Câu {questionIndex + 1}/{totalQuestions}
          </span>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Title without speech button (Teacher does not read aloud in dual mode, only reads on child device) */}
        <div className="mb-3">
          <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
            {question.title}
          </h3>
        </div>

        {/* Illustration Images: Question illustration AND open-ended answer template image */}
        {(question.imageUrl || question.openEndedBgImage) && (
          <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
            {/* 1. Question illustration image */}
            {question.imageUrl && (
              <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50 border-2 border-indigo-100 shadow-xs max-h-48 overflow-hidden flex-1 min-w-[140px]">
                {isOpenEnded && question.openEndedBgImage && question.openEndedBgImage !== question.imageUrl && (
                  <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 mb-1.5 shadow-2xs">
                    🖼️ Hình minh họa câu hỏi
                  </span>
                )}
                <img
                  src={question.imageUrl}
                  alt="Hình minh họa câu hỏi"
                  className="max-h-36 max-w-full object-contain rounded-xl"
                />
              </div>
            )}

            {/* 2. Open-ended child's answer template image (Hình minh họa trong ô trả lời của bé) */}
            {isOpenEnded && question.openEndedBgImage && question.openEndedBgImage !== question.imageUrl && (
              <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-purple-50/70 border-2 border-purple-200 shadow-xs max-h-48 overflow-hidden flex-1 min-w-[140px]">
                <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300 mb-1.5 shadow-2xs">
                  🎨 Hình trong ô trả lời của bé
                </span>
                <img
                  src={question.openEndedBgImage}
                  alt="Hình trong ô trả lời của bé"
                  className="max-h-36 max-w-full object-contain rounded-xl"
                />
              </div>
            )}

            {/* 3. If openEndedBgImage is present and NO separate imageUrl was provided */}
            {!question.imageUrl && question.openEndedBgImage && (
              <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-purple-50/70 border-2 border-purple-200 shadow-xs max-h-48 overflow-hidden w-full">
                <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300 mb-1.5 shadow-2xs">
                  🎨 Hình trong ô trả lời của bé (Khung vẽ bài làm)
                </span>
                <img
                  src={question.openEndedBgImage}
                  alt="Hình trong ô trả lời của bé"
                  className="max-h-36 max-w-full object-contain rounded-xl"
                />
              </div>
            )}
          </div>
        )}

        {/* Options Display (Neutral: Does NOT reveal the correct answer on teacher's screen) */}
        {isDragDrop ? (
          <div className="mb-4 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-200">
            <span className="text-xs font-black text-indigo-800 uppercase block mb-2">
              🎯 Ô đích yêu cầu kéo vào:
            </span>
            <div className="flex flex-wrap gap-2">
              {question.canvasConfig?.elements.filter(e => e.isDropZone).map((zone) => (
                <div
                  key={zone.id}
                  className="px-3 py-1.5 rounded-xl bg-white border border-indigo-300 font-extrabold text-xs text-indigo-950 flex items-center gap-1.5 shadow-2xs"
                >
                  <span>🎯</span>
                  <span>{zone.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : isWordDrag ? (
          <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200 flex flex-col items-center justify-center space-y-2">
            <span className="text-xs font-black text-indigo-700 uppercase">
              TỪ CẦN HOÀN THIỆN:
            </span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-950 font-mono tracking-widest bg-white px-5 py-2.5 rounded-xl border border-indigo-200 lowercase shadow-xs">
              {(question.wordTemplate || `${question.targetWord || '...'}`).toLowerCase()}
            </div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-bold text-slate-400">Các chữ lựa chọn:</span>
              {(question.letterPool || question.options?.map(o => o.text) || []).map((letter, i) => (
                <span
                  key={`${letter}_${i}`}
                  className="w-8 h-9 rounded-lg bg-white border border-indigo-200 font-black text-base text-indigo-800 flex items-center justify-center lowercase shadow-2xs"
                >
                  {letter.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        ) : isOpenEnded ? (
          <div className="mb-4 p-3.5 rounded-2xl bg-purple-50/70 border-2 border-purple-200 space-y-1.5">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-xs font-black text-purple-800 uppercase flex items-center gap-1.5">
                <span>🎨</span>
                <span>CÂU HỎI VẼ TRANH / TỰ LUẬN:</span>
              </span>
              {question.openEndedBgImage && (
                <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-300">
                  Có hình mẫu trong ô vẽ của bé
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-700">
              {question.openEndedPrompt || 'Bé dùng cọ vẽ hoặc gõ chữ vào ô đáp án bên dưới rồi bấm nộp bài nhé!'}
            </p>
          </div>
        ) : isHtml ? (
          <div className="mb-4 p-3 rounded-2xl bg-cyan-50/50 border border-cyan-200">
            <span className="text-xs font-black text-cyan-800 uppercase block">
              🚀 Trò chơi HTML5 / Gói ZIP tương tác
            </span>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">
              Các bé thực hiện trực tiếp trò chơi trên màn hình điện thoại.
            </p>
          </div>
        ) : (
          /* Multiple Choice Options: Display question & options without revealing the correct answer */
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                Các phương án lựa chọn:
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                {question.options.length} phương án
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {question.options.map((opt, idx) => {
                const optLetter = letters[idx] || `${idx + 1}`;
                const letterBg =
                  idx === 0
                    ? 'bg-rose-500'
                    : idx === 1
                    ? 'bg-sky-500'
                    : idx === 2
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';

                return (
                  <div
                    key={opt.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white text-slate-800 font-bold transition flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 shadow-2xs ${letterBg}`}>
                        {optLetter}
                      </span>

                      {opt.imageUrl && (
                        <img
                          src={opt.imageUrl}
                          alt={opt.text}
                          className="w-8 h-8 object-contain rounded-md bg-white border border-slate-200 shrink-0"
                        />
                      )}

                      <span className="text-xs truncate font-extrabold text-slate-800">
                        {opt.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Answered Status of Teams in this Set */}
        <div className="mt-auto pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-700">
              Đội thi đấu ({teams.length} đội):
            </span>
            <span className="text-xs font-black text-indigo-700">
              Đã nộp: {answeredCount}/{teams.length}
            </span>
          </div>

          {teams.length === 0 ? (
            <p className="text-xs text-amber-600 font-bold italic py-1">
              ⚠️ Chưa có đội nào được chỉ định bộ câu hỏi này.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {teams.map((team) => {
                const preset = TEAM_PRESETS.find(p => p.id === team.teamId);
                const ans = answers[team.teamId] || answers[team.teamId.toLowerCase()];
                const hasAnswered = Boolean(ans && (ans.answerId !== undefined || ans.answerText !== undefined || ans.actions || (ans.openEnded && !isOpenEnded)));
                const isOnline = team.online !== false;

                // Match draft flexibly by teamId, preset.id, or normalized lowercase key
                const draft = drafts?.[team.teamId] ||
                  (preset?.id ? drafts?.[preset.id] : undefined) ||
                  (drafts ? Object.entries(drafts).find(([k]) => {
                    const normK = k.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    const normT = (team.teamId || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    const normP = (preset?.id || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    return normK === normT || (normP && normK === normP);
                  })?.[1] : undefined);

                const hasDrawn = Boolean(
                  draft?.hasDrawn ||
                  (draft?.drawingDataUrl && draft.drawingDataUrl.length > 30) ||
                  (ans?.openEnded?.drawingDataUrl && ans.openEnded.drawingDataUrl.length > 30) ||
                  ans?.openEnded?.hasDrawn
                );
                const hasText = Boolean(
                  draft?.textAnswer?.trim() ||
                  ans?.openEnded?.textAnswer?.trim()
                );
                const hasWork = hasDrawn || hasText;

                return (
                  <div
                    key={team.teamId}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border transition ${
                      !isOnline
                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                        : hasAnswered
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                        : isOpenEnded && hasWork
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-2xs'
                        : isOpenEnded
                        ? 'bg-slate-50 text-slate-500 border-slate-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{team.icon || preset?.icon || '⭐'}</span>
                    <span className="truncate max-w-[100px]">{team.teamName}</span>
                    {hasAnswered ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : !isOnline ? (
                      <WifiOff className="w-3 h-3 text-rose-500" />
                    ) : isOpenEnded ? (
                      hasWork ? (
                        <span className="flex items-center gap-1 text-[11px] font-black text-indigo-700">
                          <Sparkles className="w-3 h-3 text-indigo-600 animate-pulse" />
                          <span>{hasDrawn ? 'Đã vẽ' : 'Đang làm bài'}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">
                          Chưa vẽ
                        </span>
                      )
                    ) : (
                      <Hourglass className="w-3 h-3 text-amber-500 animate-spin-slow" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
