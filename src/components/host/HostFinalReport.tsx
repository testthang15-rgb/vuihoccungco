import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Download, RotateCcw, Home, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, BarChart3, Printer, Search, Eye, PenTool, CheckCircle2 } from 'lucide-react';
import { SessionState, LeaderboardEntry } from '../../types/game';
import { TEAM_PRESETS } from '../../data/teamPresets';
import { sounds } from '../../utils/sound';
import { saveGameHistory } from '../../services/gameStorage';
import { Modal } from '../common/Modal';
import { TeamAnswersDetailModal } from './TeamAnswersDetailModal';
import { GradeOpenEndedModal } from './GradeOpenEndedModal';

interface HostFinalReportProps {
  session: SessionState;
  onReplay: () => void;
  onHome: () => void;
}

export const HostFinalReport: React.FC<HostFinalReportProps> = ({
  session,
  onReplay,
  onHome,
}) => {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'byQuestion' | 'overview'>('matrix');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailTeamId, setSelectedDetailTeamId] = useState<string | undefined>(undefined);
  const [selectedDetailQuestionIndex, setSelectedDetailQuestionIndex] = useState<number | undefined>(undefined);
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [gradeModalTarget, setGradeModalTarget] = useState<{ questionIndex: number; teamId: string } | null>(null);

  const questions = session.game.questions;
  const teamsList = Object.values(session.teams);

  // Compute standings
  const standings: LeaderboardEntry[] = teamsList.map(team => {
    let correctCount = 0;
    let totalAnswered = 0;
    let totalTime = 0;

    questions.forEach((_, qIdx) => {
      const ans = session.answers[qIdx]?.[team.teamId];
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

  standings.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.avgResponseTimeMs - b.avgResponseTimeMs;
  });

  standings.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  const winner = standings[0];

  useEffect(() => {
    // Fanfare sound
    sounds.playFanfare();

    // Trigger fireworks / confetti
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 350);
    } catch {
      // Ignore
    }

    // Save to local game history
    if (winner) {
      saveGameHistory({
        id: session.sessionId,
        gameTitle: session.game.title,
        roomCode: session.roomCode,
        date: Date.now(),
        teamsCount: teamsList.length,
        questionsCount: questions.length,
        winnerTeamName: winner.teamName,
        winnerScore: winner.score,
      });
    }
  }, []);

  // CSV Export function
  const handleExportCSV = () => {
    sounds.playClick();
    let csv = `BÁO CÁO TỔNG KẾT TRÒ CHƠI: ${session.game.title}\n`;
    csv += `Mã phòng: ${session.roomCode}, Ngày: ${new Date().toLocaleDateString('vi-VN')}\n\n`;

    // Table 1: Rankings
    csv += 'Hạng,Tên Đội,Điểm Số,Số Câu Đúng,Tổng Số Câu,Thời Gian TB (s)\n';
    standings.forEach(s => {
      csv += `${s.rank},"${s.teamName}",${s.score},${s.correctCount},${questions.length},${(s.avgResponseTimeMs / 1000).toFixed(1)}\n`;
    });

    csv += '\nCHI TIẾT TỪNG CÂU HỎI:\n';
    csv += 'Câu,Nội Dung,Đội,Đáp Án Chọn,Kết Quả,Điểm,Thời Gian (s)\n';
    questions.forEach((q, qIdx) => {
      teamsList.forEach(t => {
        const ans = session.answers[qIdx]?.[t.teamId];
        csv += `${qIdx + 1},"${q.title.replace(/"/g, '""')}","${t.teamName}","${ans ? ans.answerText.replace(/"/g, '""') : 'Không'}",${ans?.isCorrect ? 'ĐÚNG' : 'SAI'},${ans?.pointsAwarded || 0},${ans ? (ans.responseTimeMs / 1000).toFixed(1) : 0}\n`;
      });
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Ket-Qua-${session.game.title}-${session.roomCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    sounds.playClick();
    window.print();
  };

  // Overall statistics
  const totalAnswersPossible = questions.length * teamsList.length;
  let totalCorrect = 0;
  let totalSubmitted = 0;
  questions.forEach((_, qIdx) => {
    teamsList.forEach(t => {
      const ans = session.answers[qIdx]?.[t.teamId];
      if (ans) {
        totalSubmitted++;
        if (ans.isCorrect) totalCorrect++;
      }
    });
  });

  const accuracyRate = totalSubmitted > 0 ? Math.round((totalCorrect / totalSubmitted) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 print:p-0">
      {/* Grand Victory Header */}
      <div className="bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-600 p-1.5 rounded-3xl shadow-2xl mb-8 print:border-none print:shadow-none">
        <div className="bg-white rounded-[22px] px-6 py-8 sm:px-10 text-center">
          <span className="text-4xl sm:text-5xl animate-bounce inline-block">🎉</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2">
            HOÀN THÀNH TRÒ CHƠI!
          </h2>
          <p className="text-base font-bold text-slate-600 mt-1">
            {session.game.title} · Phòng {session.roomCode}
          </p>

          {/* Winner Showcase */}
          {winner && (
            <div className="mt-6 inline-flex items-center gap-4 px-6 py-4 rounded-3xl bg-amber-50 border-2 border-amber-300 shadow-md">
              <span className="text-4xl">👑</span>
              <div className="text-left">
                <span className="text-xs font-black uppercase text-amber-800 tracking-widest">
                  ĐỘI QUÁN QUÂN
                </span>
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <span>{winner.icon}</span>
                  <span>{winner.teamName}</span>
                </h3>
              </div>
              <div className="pl-4 border-l-2 border-amber-200">
                <span className="text-3xl font-black text-amber-600 font-mono">
                  {winner.score}
                </span>
                <span className="text-xs font-bold text-amber-800 block">
                  điểm
                </span>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 print:hidden">
            <button
              onClick={() => {
                sounds.playClick();
                setSelectedDetailTeamId(undefined);
                setDetailModalOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer ring-2 ring-amber-300 ring-offset-1"
            >
              <Search className="w-4 h-4" />
              <span>BẢNG CHI TIẾT BÀI LÀM (TOÀN MÀN HÌNH)</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onReplay();
              }}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>CHƠI LẠI TRÒ CHƠI</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-5 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-sm flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>XUẤT BÁO CÁO (CSV)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm flex items-center gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>IN KẾT QUẢ</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setShowExitConfirm(true);
              }}
              className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm flex items-center gap-2 transition cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>VỀ TRANG CHỦ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm text-center">
          <span className="text-xs font-black uppercase text-slate-400">TỔNG SỐ CÂU</span>
          <div className="text-3xl font-black text-slate-800 mt-1">{questions.length}</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm text-center">
          <span className="text-xs font-black uppercase text-slate-400">SỐ ĐỘI THAM GIA</span>
          <div className="text-3xl font-black text-indigo-600 mt-1">{teamsList.length}</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm text-center">
          <span className="text-xs font-black uppercase text-slate-400">TỶ LỆ TRẢ LỜI ĐÚNG</span>
          <div className="text-3xl font-black text-emerald-600 mt-1">{accuracyRate}%</div>
        </div>
        <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm text-center">
          <span className="text-xs font-black uppercase text-slate-400">LƯỢT TRẢ LỜI</span>
          <div className="text-3xl font-black text-amber-600 mt-1">{totalSubmitted}/{totalAnswersPossible}</div>
        </div>
      </div>

      {/* Tabs for View Switcher */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl mb-6 max-w-md print:hidden">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'matrix' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Ma trận câu hỏi
        </button>
        <button
          onClick={() => setActiveTab('byQuestion')}
          className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'byQuestion' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Thống kê từng câu
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Chi tiết từng đội
        </button>
      </div>

      {/* VIEW 1: Matrix Table */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-xl overflow-x-auto">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h3 className="font-black text-lg text-slate-900">
                BẢNG TỔNG HỢP TOÀN DIỆN CÁC ĐỘI
              </h3>
              <p className="text-xs font-bold text-slate-500">
                Bấm vào từng ô để xem chi tiết bài làm hoặc bấm mở toàn màn hình
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setSelectedDetailTeamId(undefined);
                setDetailModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Mở bảng chi tiết toàn màn hình</span>
            </button>
          </div>
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b-2 border-slate-100 text-xs font-black text-slate-400 uppercase">
                <th className="py-3 px-4">Hạng & Đội</th>
                {questions.map((_, idx) => (
                  <th key={idx} className="py-3 px-3 text-center">
                    Câu {idx + 1}
                  </th>
                ))}
                <th className="py-3 px-4 text-right">Tổng điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {standings.map((team) => {
                const preset = TEAM_PRESETS.find(p => p.id === team.teamId);
                return (
                  <tr key={team.teamId} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-4 font-extrabold text-slate-900">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-slate-400 w-5">
                          #{team.rank}
                        </span>
                        <div className={`w-8 h-8 rounded-xl ${preset?.bgColor || 'bg-slate-400'} text-white flex items-center justify-center text-base`}>
                          {team.icon}
                        </div>
                        <span>{team.teamName}</span>
                      </div>
                    </td>

                    {questions.map((_, qIdx) => {
                      const ans = session.answers[qIdx]?.[team.teamId];
                      const isTeamB = session.isDualMode && (team.assignedSet === 'B' || session.teamAssignments?.[team.teamId] === 'B');
                      const teamQuestion = (ans?.questionId && (session.gameB?.questions.find(item => item.id === ans.questionId) || session.game.questions.find(item => item.id === ans.questionId)))
                        || (isTeamB && session.gameB?.questions[qIdx])
                        || session.game.questions[qIdx];
                      const q = teamQuestion || questions[qIdx];
                      const isDrag = q.type === 'drag_drop' || Boolean(q.canvasConfig) || Boolean(ans?.actions?.length);
                      const isHtml = !isDrag && Boolean(
                        q.type === 'html_game' ||
                        q.htmlContent ||
                        q.gameUrl ||
                        session.game.gameUrl ||
                        session.game.gameType === 'html_game' ||
                        session.game.isZipArchive ||
                        ans?.htmlDetails
                      );
                      const isOpenEnded = !isDrag && !isHtml && q.type === 'open_ended';

                      if (!ans) {
                        return (
                          <td key={qIdx} className="py-3 px-2 text-center">
                            <span className="text-slate-300 text-xs font-bold">-</span>
                          </td>
                        );
                      }

                      if (isOpenEnded) {
                        const oe = ans.openEnded;
                        return (
                          <td key={qIdx} className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                setGradeModalTarget({ questionIndex: qIdx, teamId: team.teamId });
                                setGradeModalOpen(true);
                              }}
                              className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 mx-auto max-w-[120px] transition hover:scale-105 cursor-pointer shadow-2xs ${
                                ans.isCorrect
                                  ? 'bg-purple-50/80 border-purple-200 hover:border-purple-300'
                                  : 'bg-rose-50/80 border-rose-200 hover:border-rose-300'
                              }`}
                              title="Bấm để xem bài vẽ, chữ viết và sửa lỗi cho bé"
                            >
                              {oe?.drawingDataUrl ? (
                                <img
                                  src={oe.drawingDataUrl}
                                  alt="Hình vẽ"
                                  className="w-10 h-10 object-contain rounded-md border border-purple-200 bg-white"
                                />
                              ) : (
                                <PenTool className="w-4 h-4 text-purple-600" />
                              )}
                              <span className="text-[10px] font-black text-purple-900 truncate max-w-[100px] block">
                                {oe?.textAnswer || 'Bài vẽ tự luận'}
                              </span>
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-200 text-purple-800">
                                +{ans.pointsAwarded}đ · Sửa bài
                              </span>
                            </button>
                          </td>
                        );
                      }

                      const htmlDet = ans.htmlDetails;
                      const dragCards: any[] = Array.isArray(htmlDet?.dragDetails)
                        ? htmlDet.dragDetails
                        : (Array.isArray(htmlDet?.rawResult?.dragDetails) ? htmlDet.rawResult.dragDetails : []);

                      return (
                        <td key={qIdx} className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              setSelectedDetailTeamId(team.teamId);
                              setSelectedDetailQuestionIndex(qIdx);
                              setDetailModalOpen(true);
                            }}
                            className={`p-1.5 rounded-xl border flex flex-col items-center gap-0.5 mx-auto max-w-[120px] transition hover:scale-105 cursor-pointer shadow-2xs ${
                              ans.isCorrect
                                ? 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-300'
                                : 'bg-rose-50/80 border-rose-200 hover:border-rose-300'
                            }`}
                            title={`Bấm để xem chi tiết bài làm: ${ans.answerText}`}
                          >
                            <div className="flex items-center gap-1 font-black text-[11px]">
                              <span className={ans.isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                                {ans.isCorrect ? '✓' : '✗'} +{ans.pointsAwarded}đ
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold text-slate-700 truncate max-w-[100px] block">
                              {htmlDet?.totalCorrect !== undefined && htmlDet?.totalQuestions !== undefined
                                ? `Đúng ${htmlDet.totalCorrect}/${htmlDet.totalQuestions}`
                                : dragCards.length > 0
                                ? `Đúng ${dragCards.filter((c: any) => c.isCorrect).length}/${dragCards.length} thẻ`
                                : ans.answerText || 'Đã nộp'}
                            </span>
                          </button>
                        </td>
                      );
                    })}

                    <td className="py-4 px-4 text-right font-black font-mono text-lg text-indigo-700">
                      {team.score}đ
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: By Question Breakdown */}
      {activeTab === 'byQuestion' && (
        <div className="flex flex-col gap-4">
          {questions.map((q, qIdx) => {
            const answers = session.answers[qIdx] || {};
            const correctOptions = q.options?.filter(o => o.isCorrect) || [];
            const correctOptionText = correctOptions.length > 0
              ? correctOptions.map(o => o.text).join(' • ')
              : '---';
            const isHtml = Boolean(
              q.type === 'html_game' ||
              q.htmlContent ||
              q.gameUrl ||
              session.game.gameUrl ||
              session.game.gameType === 'html_game' ||
              session.game.isZipArchive
            );
            const isDrag = q.type === 'drag_drop' && Boolean(q.canvasConfig);
            const isOpenEnded = q.type === 'open_ended';

            return (
              <div key={q.id} className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase ${
                      isOpenEnded
                        ? 'text-purple-700 bg-purple-50'
                        : isHtml
                        ? 'text-indigo-600 bg-indigo-50'
                        : isDrag
                        ? 'text-cyan-700 bg-cyan-50'
                        : 'text-amber-700 bg-amber-50'
                    }`}>
                      Câu {qIdx + 1} · {isOpenEnded ? 'Câu hỏi tự luận (Bé vẽ & viết)' : isHtml ? 'Trò chơi Gói ZIP / HTML5' : isDrag ? 'Trò chơi kéo thả' : 'Trắc nghiệm'}
                    </span>
                    <h4 className="text-lg font-black text-slate-900 mt-1">
                      {q.title}
                    </h4>
                  </div>
                  <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    {isOpenEnded
                      ? 'Nhiệm vụ: Bé vẽ hình hoặc viết nội dung vào ô đáp án'
                      : isHtml
                      ? 'Nhiệm vụ: Hoàn thành trò chơi tương tác'
                      : isDrag
                      ? 'Phân loại thẻ chính xác'
                      : <span>Đáp án đúng: <span className="font-extrabold">{correctOptionText}</span></span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {teamsList.map(t => {
                    const ans = answers[t.teamId];
                    const isAnsCorrect = Boolean(ans?.isCorrect);
                    const htmlDet = ans?.htmlDetails;
                    const openEnded = ans?.openEnded;

                    return (
                      <div
                        key={t.teamId}
                        className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2 text-xs ${
                          isAnsCorrect
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : ans
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span>{t.icon}</span>
                            <span className="font-bold">{t.teamName}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                            isAnsCorrect ? 'bg-emerald-200/80 text-emerald-800' : ans ? 'bg-rose-200/80 text-rose-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            +{ans?.pointsAwarded || 0}đ
                          </span>
                        </div>

                        <div className="font-extrabold text-slate-800 bg-white/70 p-2.5 rounded-xl border border-black/5 space-y-1.5">
                          {ans ? (
                            isAnsCorrect
                              ? `✓ ${isOpenEnded ? (openEnded?.textAnswer ? `"${openEnded.textAnswer}"` : 'Đã nộp bài tự luận') : (htmlDet?.summary || ans.answerText || 'Đã hoàn thành')}`
                              : `✗ ${ans.answerText || 'Chưa hoàn thành'}`
                          ) : 'Không tham gia'}

                          {/* Open-ended Submission Details */}
                          {isOpenEnded && ans && (
                            <div className="pt-1.5 border-t border-slate-200/80 space-y-1.5">
                              {openEnded?.drawingDataUrl && (
                                <div className="rounded-lg border border-purple-200 bg-white p-1 text-center">
                                  <img
                                    src={openEnded.annotatedDrawingDataUrl || openEnded.drawingDataUrl}
                                    alt="Hình vẽ của bé"
                                    className="max-h-24 mx-auto object-contain rounded"
                                  />
                                </div>
                              )}
                              {openEnded?.teacherFeedback?.trim() && openEnded?.teacherGrade && openEnded.teacherGrade !== 'pending' && (
                                <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-900">
                                  <b>💌 Cô sửa bài:</b> "{openEnded.teacherFeedback}"
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  setGradeModalTarget({ questionIndex: qIdx, teamId: t.teamId });
                                  setGradeModalOpen(true);
                                }}
                                className="w-full py-1 px-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                              >
                                <PenTool className="w-3 h-3" />
                                <span>✏️ Sửa lỗi & Chấm điểm</span>
                              </button>
                            </div>
                          )}

                          {htmlDet?.totalCorrect !== undefined && htmlDet?.totalQuestions !== undefined && (
                            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                              Đúng: {htmlDet.totalCorrect}/{htmlDet.totalQuestions} ({Math.round((htmlDet.totalCorrect / htmlDet.totalQuestions) * 100)}%)
                            </div>
                          )}
                          {ans && ans.responseTimeMs > 0 && (
                            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                              Thời gian: {(ans.responseTimeMs / 1000).toFixed(1)}s
                            </div>
                          )}

                          {/* Dragged letter cards for ZIP drag games */}
                          {(() => {
                            if (isOpenEnded) return null;
                            const dragCards: any[] = Array.isArray(htmlDet?.dragDetails)
                              ? htmlDet.dragDetails
                              : (Array.isArray(htmlDet?.rawResult?.dragDetails) ? htmlDet.rawResult.dragDetails : []);
                            
                            if (dragCards.length > 0) {
                              return (
                                <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] space-y-1">
                                  <div className="font-extrabold text-indigo-700 uppercase flex items-center gap-1">
                                    <span>🏷️ Các chữ đã kéo:</span>
                                  </div>
                                  {dragCards.slice(0, 6).map((c: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between gap-1 p-1 rounded-md bg-white border border-slate-200">
                                      <span className="truncate font-semibold">
                                        {c.letter ? `[${c.letter}] ` : ''}{c.subtext || c.cardText}
                                      </span>
                                      <span className={`shrink-0 font-extrabold ${c.isCorrect ? 'text-emerald-700' : 'text-rose-600'}`}>
                                        {c.isCorrect ? '✓ Đúng' : c.status === 'wrong' ? '✗ Sai ô' : '⏳ Chưa kéo'}
                                      </span>
                                    </div>
                                  ))}
                                  {dragCards.length > 6 && (
                                    <div className="text-slate-400 text-[9px] text-center italic">
                                      + còn {dragCards.length - 6} thẻ khác...
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            const historyList: any[] = Array.isArray(htmlDet?.answersList)
                              ? htmlDet.answersList
                              : (Array.isArray(htmlDet?.history) ? htmlDet.history : (Array.isArray(htmlDet?.rawResult?.history) ? htmlDet.rawResult.history : []));

                            if (historyList.length > 0) {
                              return (
                                <div className="mt-2 pt-1.5 border-t border-slate-200 text-[10px] space-y-0.5">
                                  <div className="font-bold text-slate-500 uppercase">Lịch sử lượt chơi:</div>
                                  {historyList.slice(0, 4).map((h: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between">
                                      <span className="truncate">{i + 1}. {h.question || h.chosenAnswer || h.choiceText || `Lượt ${i+1}`}</span>
                                      <span className={h.isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                                        {h.isCorrect ? '✓ Đúng' : '✗ Sai'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }

                            return null;
                          })()}

                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              setSelectedDetailTeamId(t.teamId);
                              setSelectedDetailQuestionIndex(qIdx);
                              setDetailModalOpen(true);
                            }}
                            className="mt-2 w-full py-1.5 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] flex items-center justify-center gap-1 border border-indigo-200 transition cursor-pointer active:scale-95"
                          >
                            <Eye className="w-3 h-3 text-indigo-600" />
                            <span>Xem chi tiết bài làm</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: Expanded Detail Per Team */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4">
          {standings.map((team) => {
            const isExpanded = expandedTeamId === team.teamId;
            const preset = TEAM_PRESETS.find(p => p.id === team.teamId);

            return (
              <div key={team.teamId} className="bg-white rounded-3xl border-2 border-slate-100 shadow-md overflow-hidden">
                <button
                  onClick={() => setExpandedTeamId(isExpanded ? null : team.teamId)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-black text-slate-400 font-mono w-6">
                      #{team.rank}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl ${preset?.bgColor || 'bg-slate-500'} text-white flex items-center justify-center text-2xl shadow-sm`}>
                      {team.icon}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-slate-900">
                        {team.teamName}
                      </h4>
                      <p className="text-xs font-bold text-slate-500">
                        Đúng: {team.correctCount}/{questions.length} câu · TB {(team.avgResponseTimeMs / 1000).toFixed(1)}s/câu
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playClick();
                        setSelectedDetailTeamId(team.teamId);
                        setDetailModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center gap-1.5 border border-indigo-200 transition cursor-pointer active:scale-95 shadow-2xs"
                      title="Xem toàn bộ chi tiết bài làm của đội"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Xem bài làm</span>
                    </button>

                    <div className="text-right">
                      <span className="text-2xl font-black text-indigo-700 font-mono">
                        {team.score}
                      </span>
                      <span className="text-xs font-bold text-slate-400 block uppercase">
                        điểm
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      {questions.map((_, qIdx) => {
                        const ans = session.answers[qIdx]?.[team.teamId];
                        const htmlDet = ans?.htmlDetails;
                        const isTeamB = session.isDualMode && (team.assignedSet === 'B' || session.teamAssignments?.[team.teamId] === 'B');
                        const realQ = (ans?.questionId && (session.gameB?.questions.find(item => item.id === ans.questionId) || session.game.questions.find(item => item.id === ans.questionId)))
                          || (isTeamB && session.gameB?.questions[qIdx])
                          || session.game.questions[qIdx];
                        const q = realQ || questions[qIdx];
                        const isDrag = q.type === 'drag_drop' || Boolean(q.canvasConfig) || Boolean(ans?.actions?.length);
                        const isHtml = !isDrag && Boolean(
                          q.type === 'html_game' ||
                          q.htmlContent ||
                          q.gameUrl ||
                          session.game.gameUrl ||
                          session.game.gameType === 'html_game' ||
                          session.game.isZipArchive ||
                          ans?.htmlDetails
                        );
                        const isOpenEnded = !isDrag && !isHtml && q.type === 'open_ended';
                        const openEnded = ans?.openEnded;
                        const dragCards: any[] = Array.isArray(htmlDet?.dragDetails)
                          ? htmlDet.dragDetails
                          : (Array.isArray(htmlDet?.rawResult?.dragDetails) ? htmlDet.rawResult.dragDetails : []);

                        return (
                          <div
                            key={q.id || qIdx}
                            className={`p-3.5 rounded-2xl border-2 bg-white flex flex-col justify-between text-xs gap-2 ${
                              ans?.isCorrect ? 'border-emerald-200' : ans ? 'border-rose-200' : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 pr-2">
                                <span className="font-black text-slate-400 block text-[11px]">
                                  CÂU {qIdx + 1}: {q.title}
                                </span>
                                <span className="font-extrabold text-slate-800 text-sm mt-0.5 block truncate">
                                  {isOpenEnded
                                    ? (openEnded?.textAnswer ? `"${openEnded.textAnswer}"` : 'Bài làm tự luận')
                                    : (htmlDet?.summary || (ans ? `Kết quả: ${ans.answerText}` : 'Không trả lời'))}
                                </span>
                                {htmlDet?.totalCorrect !== undefined && htmlDet?.totalQuestions !== undefined && (
                                  <span className="text-[11px] font-bold text-slate-500 block mt-0.5">
                                    Đúng: <b>{htmlDet.totalCorrect}/{htmlDet.totalQuestions}</b> câu ({Math.round((htmlDet.totalCorrect / htmlDet.totalQuestions) * 100)}%)
                                  </span>
                                )}
                                {ans && ans.responseTimeMs > 0 && (
                                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                    Thời gian: {(ans.responseTimeMs / 1000).toFixed(1)}s
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 font-black">
                                {ans?.isCorrect ? (
                                  <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                    ✓ +{ans.pointsAwarded}đ
                                  </span>
                                ) : (
                                  <span className="text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                                    ✗ 0đ
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Open-ended work preview & grading button */}
                            {isOpenEnded && ans && (
                              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                {openEnded?.drawingDataUrl && (
                                  <div className="rounded-lg border border-purple-200 bg-white p-1 text-center">
                                    <img
                                      src={openEnded.annotatedDrawingDataUrl || openEnded.drawingDataUrl}
                                      alt="Hình vẽ"
                                      className="max-h-24 mx-auto object-contain rounded"
                                    />
                                  </div>
                                )}
                                {openEnded?.teacherFeedback?.trim() && openEnded?.teacherGrade && openEnded.teacherGrade !== 'pending' && (
                                  <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-900 font-bold">
                                    <b>💌 Cô sửa bài:</b> "{openEnded.teacherFeedback}"
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    sounds.playClick();
                                    setGradeModalTarget({ questionIndex: qIdx, teamId: team.teamId });
                                    setGradeModalOpen(true);
                                  }}
                                  className="w-full py-1 px-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                                >
                                  <PenTool className="w-3 h-3" />
                                  <span>✏️ Sửa lỗi & Chấm điểm</span>
                                </button>
                              </div>
                            )}

                            {/* Show dragged cards if available */}
                            {dragCards.length > 0 && (
                              <div className="pt-2 border-t border-slate-100 text-[10px] space-y-1">
                                <div className="font-extrabold text-indigo-700 uppercase">Các chữ đã kéo:</div>
                                {dragCards.slice(0, 4).map((c: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between gap-1 p-1 rounded bg-slate-50 border border-slate-200">
                                    <span className="truncate font-semibold">{c.letter ? `[${c.letter}] ` : ''}{c.subtext || c.cardText}</span>
                                    <span className={c.isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                                      {c.isCorrect ? '✓ Đúng' : '✗ Sai'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Show game history if available */}
                            {Array.isArray(htmlDet?.rawResult?.history) && htmlDet.rawResult.history.length > 0 && (
                              <div className="pt-2 border-t border-slate-100 text-[10px] space-y-0.5">
                                <div className="font-bold text-slate-500 uppercase">Chi tiết các lượt:</div>
                                {htmlDet.rawResult.history.slice(0, 4).map((h: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between">
                                    <span className="truncate">{i + 1}. {h.question || h.choiceText || `Lượt ${i+1}`}</span>
                                    <span className={h.isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                                      {h.isCorrect ? '✓ Đúng' : '✗ Sai'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal before terminating classroom session */}
      <Modal
        isOpen={showExitConfirm}
        title="Kết thúc phiên học?"
        message="Cô có muốn kết thúc phiên học không? Xác nhận sẽ kết thúc phiên và chấm dứt phòng chơi tại đây."
        confirmText="Kết thúc phiên & Chấm dứt phòng"
        cancelText="Ở lại xem kết quả"
        confirmVariant="danger"
        onConfirm={() => {
          setShowExitConfirm(false);
          sounds.playClick();
          onHome();
        }}
        onCancel={() => {
          sounds.playClick();
          setShowExitConfirm(false);
        }}
      />

      {/* Detail Answers Modal */}
      <TeamAnswersDetailModal
        session={session}
        initialTeamId={selectedDetailTeamId}
        initialQuestionIndex={selectedDetailQuestionIndex}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />

      {/* Grade Open Ended Modal */}
      {gradeModalTarget && (
        <GradeOpenEndedModal
          session={session}
          questionIndex={gradeModalTarget.questionIndex}
          teamId={gradeModalTarget.teamId}
          isOpen={gradeModalOpen}
          onClose={() => setGradeModalOpen(false)}
        />
      )}
    </div>
  );
};
