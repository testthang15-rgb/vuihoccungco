import React from 'react';
import { Question, ConnectedTeam, TeamAnswer } from '../../types/game';
import { TEAM_PRESETS } from '../../data/teamPresets';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Trophy,
  Check,
  Search,
  PenTool
} from 'lucide-react';

interface DualQuestionResultsPaneProps {
  label: string; // e.g. "BỘ CÂU HỎI 1 (ĐỀ A)"
  badgeColor: 'indigo' | 'pink';
  gameTitle: string;
  question?: Question;
  questionIndex: number;
  totalQuestions: number;
  teams: ConnectedTeam[];
  answers: Record<string, TeamAnswer>;
  onOpenDetail?: (teamId: string) => void;
  onOpenGrade?: (teamId: string) => void;
}

export const DualQuestionResultsPane: React.FC<DualQuestionResultsPaneProps> = ({
  label,
  badgeColor,
  gameTitle,
  question,
  questionIndex,
  totalQuestions,
  teams,
  answers,
  onOpenDetail,
  onOpenGrade,
}) => {
  const isIndigo = badgeColor === 'indigo';

  if (!question) {
    return (
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-md flex flex-col justify-center items-center text-center min-h-[360px]">
        <span className="text-4xl mb-3">🏁</span>
        <h3 className="font-black text-slate-700 text-lg">
          {label}: Đã hoàn thành tất cả câu hỏi!
        </h3>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Bộ câu hỏi này không có thêm câu hỏi ở vòng này.
        </p>
      </div>
    );
  }

  const correctOptions = question.options?.filter(opt => opt.isCorrect) || [];
  const correctOptionText = correctOptions.map(opt => opt.text).join(' & ') || '---';
  const isDragDrop = question.type === 'drag_drop' || Boolean(question.canvasConfig);
  const isOpenEnded = !isDragDrop && (question.type === 'open_ended');

  const correctCount = teams.filter(t => answers[t.teamId]?.isCorrect).length;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className={`bg-white rounded-2xl sm:rounded-3xl border-2 shadow-lg flex flex-col justify-between overflow-hidden flex-1 ${
      isIndigo ? 'border-indigo-200' : 'border-pink-200'
    }`}>
      {/* Top Header Strip */}
      <div className={`px-3.5 py-2 sm:py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
        isIndigo ? 'bg-indigo-50/80 border-indigo-100' : 'bg-pink-50/80 border-pink-100'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white shrink-0 shadow-2xs ${
            isIndigo ? 'bg-indigo-600' : 'bg-pink-600'
          }`}>
            {label}
          </span>
          <h4 className="font-black text-xs sm:text-sm text-slate-900 truncate" title={gameTitle}>
            {gameTitle}
          </h4>
        </div>

        <span className="text-[11px] sm:text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
          Đúng: {correctCount}/{teams.length}
        </span>
      </div>

      {/* Question & Correct Answer Card */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col gap-2.5">
        <div>
          <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-900 leading-snug">
            {question.title}
          </h3>

          {/* Correct Answer Box */}
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 shadow-2xs">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1 mb-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
              <span>ĐÁP ÁN ĐÚNG CỦA CÂU NÀY:</span>
            </span>

            {isDragDrop ? (
              <span className="text-xs font-black text-emerald-950">
                Kéo đúng các thẻ vào các ô đích tương ứng
              </span>
            ) : isOpenEnded ? (
              <span className="text-xs font-black text-emerald-950">
                {question.modelAnswer || 'Bé vẽ tranh và trả lời theo hướng dẫn'}
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {correctOptions.map(opt => {
                  const idx = question.options.findIndex(o => o.id === opt.id);
                  const letter = letters[idx] || '✓';
                  return (
                    <span
                      key={opt.id}
                      className="px-2.5 py-0.5 rounded-lg bg-white text-emerald-950 border border-emerald-300 text-xs font-black flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="w-4 h-4 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                        {letter}
                      </span>
                      {opt.imageUrl && (
                        <img src={opt.imageUrl} alt="" className="w-4 h-4 object-contain" />
                      )}
                      <span>{opt.text}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Teams Submissions List - Mở rộng chiều cao hiển thị cho khu vực kết quả */}
        <div className="flex-1 flex flex-col min-h-0">
          <span className="text-xs font-black text-slate-700 uppercase tracking-wide block mb-1.5 shrink-0">
            Kết quả của các đội ({teams.length} đội):
          </span>

          {teams.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Chưa có đội nào thuộc bộ câu hỏi này.
            </p>
          ) : (
            <div className="space-y-1.5 flex-1 min-h-[220px] max-h-[460px] overflow-y-auto pr-1">
              {teams.map((team) => {
                const ans = answers[team.teamId];
                const preset = TEAM_PRESETS.find(p => p.id === team.teamId);
                const isCorrect = ans?.isCorrect;
                const points = ans?.pointsAwarded || 0;

                return (
                  <div
                    key={team.teamId}
                    className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                      isCorrect
                        ? 'border-emerald-300 bg-emerald-50/70 shadow-2xs'
                        : ans
                        ? 'border-rose-200 bg-rose-50/70'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-lg shrink-0">{team.icon || preset?.icon || '⭐'}</span>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-black text-xs text-slate-900 break-words leading-tight">
                          {team.teamName}
                        </h5>
                        <div className="text-[11px] font-semibold break-words mt-0.5 leading-tight">
                          {(() => {
                            if (!ans) {
                              return <span className="text-slate-400 italic">Chưa nộp bài</span>;
                            }
                            if (ans.answerId === 'auto_submitted_end_question' && !ans.answerText) {
                              return <span className="text-rose-500 font-bold">Chưa chọn đáp án</span>;
                            }
                            if (isDragDrop) {
                              const totalReq = ans.totalItems || 1;
                              const cCount = ans.totalCorrect ?? (isCorrect ? totalReq : (ans.placedCount ?? 0));
                              const wCount = ans.totalWrong ?? 0;
                              return (
                                <span className={isCorrect ? 'text-emerald-700 font-bold' : 'text-slate-700 font-bold'}>
                                  Đã xếp: <b className="text-emerald-700">{cCount}/{totalReq} đúng</b>{wCount > 0 ? <span className="text-rose-600"> (nhầm {wCount} thẻ)</span> : null}
                                </span>
                              );
                            }
                            if (question?.type === 'word_drag_drop') {
                              const chosen = (ans.openEnded?.textAnswer || (ans.answerText ? (ans.answerText.match(/Bé ghép chữ "([^"]+)"/)?.[1] || ans.answerText) : '') || '').toLowerCase();
                              return (
                                <span className="text-indigo-800 font-bold lowercase">
                                  {chosen ? `Đã ghép chữ: "${chosen}"` : 'Chưa ghép chữ'}
                                </span>
                              );
                            }
                            if (isOpenEnded) {
                              const text = ans.openEnded?.textAnswer;
                              const hasDraw = Boolean(ans.openEnded?.drawingDataUrl);
                              return (
                                <span className="text-purple-800 font-bold">
                                  {text ? `"${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"` : (hasDraw ? 'Đã vẽ tranh trả lời' : (ans.answerText || 'Đã nộp bài'))}
                                </span>
                              );
                            }
                            // Multiple choice / Single choice: resolve chosen options
                            const chosenAnswerIds = ans.answerIds || (ans.answerId ? ans.answerId.split(',') : []);
                            const chosenOpts = question?.options?.filter(o => chosenAnswerIds.includes(o.id) || (ans.answerText && o.text === ans.answerText)) || [];
                            if (chosenOpts.length > 0) {
                              return (
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  <span className="text-slate-500 text-[10px]">Đã chọn:</span>
                                  {chosenOpts.map(opt => {
                                    const optIdx = question?.options?.findIndex(o => o.id === opt.id) ?? -1;
                                    const letter = optIdx >= 0 ? letters[optIdx] : '•';
                                    const optCorrect = Boolean(opt.isCorrect);
                                    return (
                                      <span
                                        key={opt.id}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black border ${
                                          optCorrect
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                            : 'bg-rose-100 text-rose-800 border-rose-300'
                                        }`}
                                      >
                                        <span className="w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] bg-black/10">
                                          {letter}
                                        </span>
                                        <span className="max-w-[120px] truncate">{opt.text}</span>
                                        <span>{optCorrect ? '✓' : '✗'}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              );
                            }
                            if (ans.answerText && ans.answerText !== 'Chưa chọn đáp án') {
                              return (
                                <span className={isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                                  Đã chọn: {ans.answerText} {isCorrect ? '✓' : '✗'}
                                </span>
                              );
                            }
                            return <span className="text-rose-500 font-bold">Chưa chọn đáp án</span>;
                          })()}
                        </div>
                      </div>

                      {/* Open-ended child's drawing preview thumbnail */}
                      {isOpenEnded && (ans?.openEnded?.annotatedDrawingDataUrl || ans?.openEnded?.drawingDataUrl) && (
                        <div
                          onClick={() => onOpenGrade ? onOpenGrade(team.teamId) : onOpenDetail?.(team.teamId)}
                          className="w-10 h-10 rounded-lg bg-white border border-purple-200 p-0.5 overflow-hidden shrink-0 cursor-pointer shadow-2xs hover:scale-105 transition"
                          title="Bấm để xem tranh và chấm bài cho bé"
                        >
                          <img
                            src={ans.openEnded.annotatedDrawingDataUrl || ans.openEnded.drawingDataUrl}
                            alt="Bài vẽ của bé"
                            className="w-full h-full object-contain rounded"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCorrect ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[11px] font-black flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>+{points}đ</span>
                        </span>
                      ) : points > 0 ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[11px] font-black flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>+{points}đ</span>
                        </span>
                      ) : ans ? (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white text-[11px] font-black flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>0đ</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-bold">
                          Chưa xong
                        </span>
                      )}

                      {/* Teacher Grading & Annotation Button for Open Ended questions */}
                      {isOpenEnded && onOpenGrade && ans && (
                        <button
                          type="button"
                          onClick={() => onOpenGrade(team.teamId)}
                          className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                          title="Chấm điểm & Viết lời nhận xét cho bài làm của bé"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>Chấm bài</span>
                        </button>
                      )}

                      {onOpenDetail && ans && (
                        <button
                          type="button"
                          onClick={() => onOpenDetail(team.teamId)}
                          className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                          title="Xem chi tiết câu trả lời"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
