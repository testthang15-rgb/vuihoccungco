import React, { useEffect, useState } from 'react';
import { ArrowRight, Trophy, CheckCircle2, XCircle, Clock, Sparkles, BookOpen, Layers, Check, HelpCircle, Target, Award, Play, Home, Zap, Search, Eye, PenTool, Type } from 'lucide-react';
import { SessionState, QuestionOption } from '../../types/game';
import { TEAM_PRESETS } from '../../data/teamPresets';
import { sounds } from '../../utils/sound';
import { TeamAnswersDetailModal } from './TeamAnswersDetailModal';
import { GradeOpenEndedModal } from './GradeOpenEndedModal';
import { DualQuestionResultsPane } from './DualQuestionResultsPane';
import { realtime } from '../../services/realtimeClient';

interface HostQuestionResultsProps {
  session: SessionState;
  onNextQuestion: () => void;
  onShowLeaderboard: () => void;
  onExit?: () => void;
}

export const HostQuestionResults: React.FC<HostQuestionResultsProps> = ({
  session,
  onNextQuestion,
  onShowLeaderboard,
  onExit,
}) => {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTeamId, setDetailTeamId] = useState<string | undefined>(undefined);
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [gradeModalTeamId, setGradeModalTeamId] = useState<string | undefined>(undefined);

  const isDualMode = Boolean(session.isDualMode && session.gameB);
  const currentQIndex = session.currentQuestionIndex;
  const currentQA = session.game.questions[currentQIndex];
  const currentQB = session.gameB?.questions[currentQIndex];
  const currentQ = currentQA || currentQB;
  const totalQuestions = isDualMode
    ? Math.max(session.game.questions.length, session.gameB?.questions?.length || 0)
    : session.game.questions.length;
  const isLastQuestion = currentQIndex >= totalQuestions - 1;
  const isWordDrag = currentQ?.type === 'word_drag_drop';
  const isDragDrop = !isWordDrag && (currentQ?.type === 'drag_drop' || Boolean(currentQ?.canvasConfig));
  const isOpenEnded = !isDragDrop && !isWordDrag && (currentQ?.type === 'open_ended');
  const isHtmlGame = Boolean(
    currentQ?.type === 'html_game' ||
    currentQ?.htmlContent ||
    currentQ?.gameUrl ||
    session.game.gameUrl ||
    session.game.gameType === 'html_game' ||
    session.game.isZipArchive
  );

  const currentAnswers = session.answers[currentQIndex] || {};
  const teamsList = Object.values(session.teams);
  const teamsA = isDualMode
    ? teamsList.filter(t => (t.assignedSet || session.teamAssignments?.[t.teamId] || 'A') === 'A')
    : teamsList;
  const teamsB = isDualMode
    ? teamsList.filter(t => (t.assignedSet || session.teamAssignments?.[t.teamId]) === 'B')
    : [];

  // Correct options for multiple choice
  const correctOptions = currentQ?.options?.filter(opt => opt.isCorrect) || [];
  const correctOptionText = correctOptions.map(opt => opt.text).join(' & ') || '---';

  // Total draggable cards in drag & drop question
  const totalCardsInConfig = currentQ?.canvasConfig?.elements?.filter(e => e.isDraggable)?.length || 0;

  // Fastest team among those who responded
  const answeredTeamsWithTime = teamsList
    .map(t => ({ teamId: t.teamId, time: currentAnswers[t.teamId]?.responseTimeMs || 0 }))
    .filter(t => t.time > 0)
    .sort((a, b) => a.time - b.time);
  const fastestTeamId = answeredTeamsWithTime[0]?.teamId;

  let correctCount = 0;
  let wrongCount = 0;

  teamsList.forEach(t => {
    const ans = currentAnswers[t.teamId];
    if (ans?.isCorrect || (ans?.pointsAwarded && ans.pointsAwarded > 0)) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const handleGradeSingleWordDrag = (teamId: string, isCorrect: boolean) => {
    sounds.playCorrect();
    const maxPts = currentQ?.points || 10;
    const pts = isCorrect ? maxPts : 0;
    const feedback = isCorrect ? 'Bé đã ghép chữ rất chính xác!' : 'Bé chú ý xem đáp án đúng của cô nhé!';

    realtime.gradeOpenEndedAnswer(
      session.roomCode,
      currentQIndex,
      teamId,
      pts,
      isCorrect,
      feedback
    );

    fetch(`/api/session/${session.roomCode}/grade-open-ended`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionIndex: currentQIndex,
        teamId,
        points: pts,
        isCorrect,
        feedback,
      }),
    }).catch(err => console.warn('grade word drag error', err));
  };

  const handleAutoGradeAllWordDrag = () => {
    sounds.playFanfare();
    const correctLetter = (currentQ?.missingLetters?.[0] || 'm').trim().toLowerCase();
    const maxPts = currentQ?.points || 10;

    teamsList.forEach(t => {
      const ans = currentAnswers[t.teamId];
      let placed = '';
      if (ans?.openEnded?.textAnswer) {
        placed = ans.openEnded.textAnswer;
      } else if (ans?.answerText) {
        const match = ans.answerText.match(/Bé ghép chữ "([^"]+)"/);
        if (match && match[1]) placed = match[1];
      }
      placed = placed.trim().toLowerCase();
      const isMatch = placed === correctLetter;
      const pts = isMatch ? maxPts : 0;
      const feedback = isMatch ? 'Bé đã ghép chữ rất chính xác!' : 'Bé chú ý xem đáp án đúng của cô nhé!';

      realtime.gradeOpenEndedAnswer(
        session.roomCode,
        currentQIndex,
        t.teamId,
        pts,
        isMatch,
        feedback
      );

      fetch(`/api/session/${session.roomCode}/grade-open-ended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIndex: currentQIndex,
          teamId: t.teamId,
          points: pts,
          isCorrect: isMatch,
          feedback,
        }),
      }).catch(err => console.warn('auto grade error', err));
    });
  };

  useEffect(() => {
    if (correctCount > 0) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }
  }, [correctCount]);

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2 sm:py-3">

      {/* Top Banner with Header & Action Buttons - Làm nhỏ lại để ưu tiên diện tích cho phần kết quả */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white px-4 py-2.5 sm:py-3 rounded-2xl border-2 border-slate-100 shadow-sm mb-3">
        <div>
          <span className="px-3 py-0.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-black text-[11px] sm:text-xs tracking-wide inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>KẾT QUẢ CÂU {currentQIndex + 1} / {totalQuestions} {isDualMode ? '· PHÒNG KẾT HỢP 2 BỘ CÂU HỎI' : (isHtmlGame ? '· TRÒ CHƠI GÓI ZIP / HTML5' : isWordDrag ? '· TRÒ CHƠI KÉO THẢ Ô CHỮ' : isDragDrop ? '· TRÒ CHƠI KÉO THẢ' : '· CÂU HỎI TRẮC NGHIỆM')}</span>
          </span>
          <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 mt-0.5">
            {isDualMode ? 'KẾT QUẢ 2 BỘ CÂU HỎI CỦA CÁC ĐỘI' : currentQ?.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setDetailTeamId(undefined);
              setDetailModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 border border-amber-300 transition cursor-pointer active:scale-95 shadow-2xs"
            title="Xem chi tiết từng câu trả lời và lựa chọn của từng đội"
          >
            <Search className="w-4 h-4 text-amber-600" />
            <span>CHI TIẾT BÀI LÀM</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onShowLeaderboard();
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 border border-indigo-200 transition cursor-pointer active:scale-95 shadow-2xs"
            title="Xem bảng xếp hạng điểm hiện tại của các đội"
          >
            <Trophy className="w-4 h-4 text-indigo-600" />
            <span>BẢNG XẾP HẠNG</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onNextQuestion();
            }}
            className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-200 transition active:scale-95 cursor-pointer ring-2 ring-emerald-300 ring-offset-1 animate-pulse-subtle"
            title="Bấm để cho toàn bộ học sinh bắt đầu câu hỏi tiếp theo"
          >
            <span>{isLastQuestion ? 'XEM TỔNG KẾT' : 'CÂU TIẾP THEO'}</span>
            {isLastQuestion ? <Sparkles className="w-4 h-4" /> : <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
          </button>
        </div>
      </div>

      {isDualMode ? (
        /* Split Screen Dual Mode: Results of both question sets side by side */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mb-6">
          <DualQuestionResultsPane
            label="BỘ CÂU HỎI 1 (ĐỀ A)"
            badgeColor="indigo"
            gameTitle={session.game.title}
            question={currentQA}
            questionIndex={currentQIndex}
            totalQuestions={totalQuestions}
            teams={teamsA}
            answers={currentAnswers}
            onOpenDetail={(teamId) => {
              setDetailTeamId(teamId);
              setDetailModalOpen(true);
            }}
            onOpenGrade={(teamId) => {
              setGradeModalTeamId(teamId);
              setGradeModalOpen(true);
            }}
          />
          <DualQuestionResultsPane
            label="BỘ CÂU HỎI 2 (ĐỀ B)"
            badgeColor="pink"
            gameTitle={session.gameB?.title || 'Bộ câu hỏi 2'}
            question={currentQB}
            questionIndex={currentQIndex}
            totalQuestions={totalQuestions}
            teams={teamsB}
            answers={currentAnswers}
            onOpenDetail={(teamId) => {
              setDetailTeamId(teamId);
              setDetailModalOpen(true);
            }}
            onOpenGrade={(teamId) => {
              setGradeModalTeamId(teamId);
              setGradeModalOpen(true);
            }}
          />
        </div>
      ) : (
        <>
      {/* Answer Showcase Box */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left flex-1">
            <span className="text-xs uppercase tracking-widest font-black text-emerald-200 block mb-1">
              {isHtmlGame ? 'Nhiệm vụ & Trò chơi đã hoàn thành:' : isDragDrop ? 'Quy tắc phân loại & xếp thẻ chính xác:' : 'Đáp án chính xác:'}
            </span>

            {isHtmlGame ? (
              <div className="mt-2 flex flex-wrap gap-2.5 justify-center sm:justify-start">
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/25 flex items-center gap-2 text-base font-black">
                  <span>🎮 {currentQ?.title || session.game.title}</span>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/25 flex items-center gap-2 text-xs font-extrabold text-cyan-100">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Trò chơi tương tác thực hành theo đội</span>
                </div>
              </div>
            ) : isDragDrop ? (
              <div className="mt-2 flex flex-wrap gap-2.5 justify-center sm:justify-start">
                {currentQ?.canvasConfig?.elements?.filter(e => e.isDropZone).map((zone) => (
                  <div key={zone.id} className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/25 flex items-center gap-2 text-sm font-black">
                    {zone.imageUrl ? (
                      <img src={zone.imageUrl} alt="" className="w-6 h-6 object-contain rounded bg-white p-0.5" />
                    ) : (
                      <span>🎯</span>
                    )}
                    <span>{zone.text}</span>
                  </div>
                ))}
              </div>
            ) : currentQ?.type === 'word_drag_drop' ? (
              <div className="mt-2 flex flex-col sm:flex-row items-center gap-4">
                {currentQ.answerImageUrl && (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 border-2 border-white/50 overflow-hidden shadow-md shrink-0 flex items-center justify-center">
                    <img
                      src={currentQ.answerImageUrl}
                      alt={currentQ.answerTitle || 'Hình ảnh đáp án'}
                      className="max-h-full max-w-full object-contain rounded-xl"
                    />
                  </div>
                )}
                <div>
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/30 text-white shadow-xs text-xl sm:text-2xl font-black mb-1">
                    <span>Chữ cần ghép: <b>{(currentQ.missingLetters?.[0] || 'm').toUpperCase()}</b></span>
                    <span className="text-emerald-200">➔</span>
                    <span className="text-amber-300">{(currentQ.targetWord || 'Từ đúng').toUpperCase()}</span>
                  </div>
                  {currentQ.answerTitle && (
                    <div className="text-sm font-extrabold text-emerald-100">
                      ⭐ {currentQ.answerTitle}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xl sm:text-2xl font-black mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {correctOptions.map((opt) => {
                  const idx = currentQ?.options?.findIndex(o => o.id === opt.id) ?? -1;
                  const letter = idx >= 0 ? letters[idx] : '✓';
                  return (
                    <span key={opt.id} className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/30 text-white shadow-xs">
                      <span className="w-7 h-7 rounded-xl bg-white text-emerald-700 flex items-center justify-center text-sm font-black shadow-xs">
                        {letter}
                      </span>
                      <span>{opt.text}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {currentQ?.explanation && (
              <p className="text-xs sm:text-sm font-semibold text-emerald-100 mt-3 flex items-start gap-2 bg-black/10 px-3.5 py-2 rounded-xl">
                <BookOpen className="w-4 h-4 shrink-0 mt-0.5" />
                <span><b>Giải thích cho bé:</b> {currentQ.explanation}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl px-5 py-3 text-center border border-white/20 min-w-[100px]">
              <span className="text-xs font-black text-emerald-100 block">XUẤT SẮC</span>
              <span className="text-2xl font-black">{correctCount} đội</span>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl px-5 py-3 text-center border border-white/20 min-w-[100px]">
              <span className="text-xs font-black text-rose-200 block">CẦN CỐ GẮNG</span>
              <span className="text-2xl font-black">{wrongCount} đội</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Team Breakdown & Statistics */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-6 gap-3">
          <div>
            <h4 className="font-black text-lg sm:text-xl text-slate-900">
              CHI TIẾT KẾT QUẢ & ĐIỂM SỐ TỪNG ĐỘI
            </h4>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Thống kê số điểm câu này, tổng điểm tích lũy và câu trả lời cụ thể của từng đội
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setDetailTeamId(undefined);
                setDetailModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Bảng chi tiết toàn màn hình</span>
            </button>
            <span className="text-xs font-extrabold text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
              {teamsList.length} đội
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {teamsList.map((team) => {
            const preset = TEAM_PRESETS.find(p => p.id === team.teamId);
            const ans = currentAnswers[team.teamId];
            const hasAnswered = Boolean(ans);
            const isCorrect = Boolean(ans?.isCorrect);
            const pointsThisQuestion = ans?.pointsAwarded ?? 0;

            // Multiple choice answer info
            const chosenAnswerIds = ans?.answerIds || (ans?.answerId ? ans.answerId.split(',') : []);
            const chosenOptions = currentQ?.options?.filter(o => chosenAnswerIds.includes(o.id)) || [];

            // Drag and drop card count info
            const totalRequired = ans?.totalItems || totalCardsInConfig || 1;
            const totalCorrectCards = ans?.totalCorrect ?? (isCorrect ? totalRequired : (ans?.placedCount ?? 0));
            const totalWrongCards = ans?.totalWrong ?? 0;
            const dragPercentage = Math.min(100, Math.round((totalCorrectCards / totalRequired) * 100));

            return (
              <div
                key={team.teamId}
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${
                  !hasAnswered
                    ? 'border-slate-200 bg-slate-50/70'
                    : isCorrect
                    ? 'border-emerald-300 bg-emerald-50/60 shadow-sm'
                    : pointsThisQuestion > 0
                    ? 'border-amber-300 bg-amber-50/60 shadow-sm'
                    : 'border-rose-200 bg-rose-50/50 shadow-sm'
                }`}
              >
                {/* Left: Team Identity & Scores */}
                <div className="flex items-center gap-3.5 min-w-[200px] max-w-[280px]">
                  <div className={`w-13 h-13 rounded-2xl ${preset?.bgColor || 'bg-slate-400'} text-white flex items-center justify-center text-2xl shadow-sm shrink-0`}>
                    {team.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-black text-base text-slate-900 break-words leading-tight">
                        {team.teamName}
                      </h5>
                      <span className="text-[11px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                        Mã {team.teamId.toUpperCase()}
                      </span>
                    </div>

                    {/* Accumulated Total Score Badge */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black text-amber-700 bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-600" />
                        <span>Tổng điểm: <b>{team.score}</b> đ</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center: Detailed Answers / Cards dragged */}
                <div className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                  {isDragDrop ? (
                    /* Detailed drag & drop statistics */
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-extrabold text-slate-600 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Chi tiết thẻ kéo được:</span>
                        </span>

                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                          dragPercentage === 100
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : dragPercentage > 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          Đúng {totalCorrectCards} / {totalRequired} thẻ ({dragPercentage}%)
                        </span>
                      </div>

                      {/* Progress bar of cards placed */}
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-1.5 border border-slate-200">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            dragPercentage === 100
                              ? 'bg-emerald-500'
                              : dragPercentage >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-400'
                          }`}
                          style={{ width: `${dragPercentage}%` }}
                        />
                      </div>

                      <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between mb-2">
                        <span>
                          {hasAnswered ? (
                            dragPercentage === 100 ? (
                              <span className="text-emerald-700 font-black">🌟 Hoàn thành xuất sắc toàn bộ thẻ!</span>
                            ) : totalWrongCards > 0 ? (
                              <span className="text-rose-600 font-bold">Xếp đúng {totalCorrectCards} thẻ, nhầm {totalWrongCards} thẻ</span>
                            ) : (
                              <span>Đã xếp đúng {totalCorrectCards}/{totalRequired} thẻ</span>
                            )
                          ) : (
                            <span className="text-slate-400">Chưa hoàn thành kéo thẻ</span>
                          )}
                        </span>

                        {ans && ans.responseTimeMs > 0 && (
                          <span className="text-slate-400 flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3" />
                            {(ans.responseTimeMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>

                      {/* Detailed Drag-and-Drop Card Breakdown for Each Team */}
                      {(() => {
                        const draggables = currentQ?.canvasConfig?.elements?.filter(e => !e.isDropZone && e.type !== 'drop_zone' && !e.isLocked && e.cardRole !== 'static' && e.isDraggable !== false && Boolean(e.isDraggable || e.type === 'drag_item')) || [];
                        const dropZones = currentQ?.canvasConfig?.elements?.filter(e => e.isDropZone || e.type === 'drop_zone') || [];
                        const actions = ans?.actions || [];

                        if (draggables.length === 0) return null;

                        return (
                          <div className="pt-2 border-t border-slate-100">
                            <div className="text-[10px] font-black uppercase text-slate-500 mb-1.5 flex items-center justify-between">
                              <span>Danh sách thẻ kéo chi tiết ({draggables.length} thẻ):</span>
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  setDetailTeamId(team.teamId);
                                  setDetailModalOpen(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 hover:underline font-extrabold cursor-pointer normal-case"
                              >
                                🔍 Xem phóng to bài làm
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                              {draggables.map(dragEl => {
                                const act = actions.find(a => a.itemId === dragEl.id);
                                const placedTarget = act ? dropZones.find(dz => dz.id === act.targetId) : null;
                                const isItemCorrect = Boolean(act && act.isCorrect);
                                const isWrong = Boolean(act && !act.isCorrect);
                                const isUnplaced = !act;

                                return (
                                  <div
                                    key={dragEl.id}
                                    className={`p-1.5 rounded-xl border flex items-center justify-between gap-1.5 text-[11px] ${
                                      isItemCorrect
                                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                        : isWrong
                                        ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                                        : 'bg-slate-50 border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      {dragEl.imageUrl ? (
                                        <img
                                          src={dragEl.imageUrl}
                                          alt=""
                                          className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 shrink-0 p-0.5 shadow-2xs"
                                        />
                                      ) : null}
                                      <div className="min-w-0 flex-1">
                                        <div className="font-extrabold truncate">
                                          {dragEl.text || dragEl.subText || 'Thẻ'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                          {placedTarget ? (
                                            <>
                                              <span>➔</span>
                                              {placedTarget.imageUrl && (
                                                <img src={placedTarget.imageUrl} alt="" className="w-3.5 h-3.5 object-contain rounded bg-white inline-block" />
                                              )}
                                              <span>{placedTarget.text || 'Ô đích'}</span>
                                            </>
                                          ) : (
                                            'Chưa kéo vào ô'
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <span className={`shrink-0 font-black text-[10px] px-1.5 py-0.5 rounded-md ${
                                      isItemCorrect
                                        ? 'bg-emerald-200 text-emerald-800'
                                        : isWrong
                                        ? 'bg-rose-200 text-rose-800'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}>
                                      {isItemCorrect ? '✅ Đúng' : isWrong ? '❌ Nhầm' : '⏳ Chưa kéo'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : isHtmlGame ? (
                    /* Detailed HTML5 / ZIP Game result breakdown */
                    <div>
                      {(() => {
                        const htmlTotalQ = ans?.htmlDetails?.totalQuestions || ans?.totalItems || (ans?.htmlDetails?.totalCorrect !== undefined ? Math.max(ans.htmlDetails.totalCorrect, 1) : 1);
                        const htmlCorrect = ans?.htmlDetails?.totalCorrect ?? (isCorrect ? htmlTotalQ : (ans?.totalCorrect ?? 0));
                        const htmlPercent = ans?.htmlDetails?.totalQuestions ? Math.min(100, Math.round((htmlCorrect / htmlTotalQ) * 100)) : (isCorrect ? 100 : (hasAnswered ? 75 : 0));
                        const isFastest = team.teamId === fastestTeamId && hasAnswered;
                        const dragCards: any[] = Array.isArray(ans?.htmlDetails?.dragDetails)
                          ? ans?.htmlDetails?.dragDetails
                          : (Array.isArray(ans?.htmlDetails?.rawResult?.dragDetails) ? ans?.htmlDetails?.rawResult?.dragDetails : []);
                        const historyItems: any[] = Array.isArray(ans?.htmlDetails?.history)
                          ? ans?.htmlDetails?.history
                          : (Array.isArray(ans?.htmlDetails?.rawResult?.history) ? ans?.htmlDetails?.rawResult?.history : []);
                        const answersList: any[] = Array.isArray(ans?.htmlDetails?.answersList)
                          ? ans?.htmlDetails?.answersList
                          : (Array.isArray(ans?.htmlDetails?.rawResult?.answersList) ? ans?.htmlDetails?.rawResult?.answersList : []);

                        return (
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                              <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                                <span>Thống kê trò chơi ZIP / HTML5:</span>
                              </span>

                              <div className="flex items-center gap-1.5">
                                {isFastest && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-amber-600" />
                                    <span>Nhanh nhất</span>
                                  </span>
                                )}

                                <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                                  isCorrect || htmlPercent === 100
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : hasAnswered
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {hasAnswered
                                    ? (ans?.htmlDetails?.totalCorrect !== undefined && ans?.htmlDetails?.totalQuestions !== undefined
                                        ? `Đúng ${ans.htmlDetails.totalCorrect}/${ans.htmlDetails.totalQuestions} (${htmlPercent}%)`
                                        : isCorrect ? '🌟 Đạt điểm tuyệt đối' : 'Đã nộp bài')
                                    : 'Hết giờ'}
                                </span>
                              </div>
                            </div>

                            {/* Accuracy progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2 border border-slate-200">
                              <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                  htmlPercent === 100
                                    ? 'bg-emerald-500'
                                    : htmlPercent >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-400'
                                }`}
                                style={{ width: `${hasAnswered ? htmlPercent : 0}%` }}
                              />
                            </div>

                            {/* Summary text */}
                            <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/80 mb-2">
                              <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{ans?.htmlDetails?.summary || ans?.answerText || (hasAnswered ? 'Đã hoàn thành nội dung trò chơi' : 'Chưa nộp kết quả')}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mt-1 flex-wrap gap-2">
                                <span>
                                  Điểm ghi nhận: <b className="text-emerald-700">+{pointsThisQuestion} điểm</b>
                                  {ans?.htmlDetails?.totalCorrect !== undefined && ans?.htmlDetails?.totalQuestions !== undefined && (
                                    <span> · Tỷ lệ đạt: <b className="text-slate-800">{htmlPercent}%</b></span>
                                  )}
                                </span>
                                {ans && ans.responseTimeMs > 0 && (
                                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    Thời gian: <b>{(ans.responseTimeMs / 1000).toFixed(1)}s</b>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Dedicated list of dragged letter cards (Game kéo chữ ZIP) */}
                            {dragCards.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200/70">
                                <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
                                  <span>🏷️ Chi tiết các chữ kéo đúng / sai:</span>
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                  {dragCards.map((card: any, cIdx: number) => (
                                    <div
                                      key={cIdx}
                                      className={`text-[11px] p-2 rounded-xl border flex items-center justify-between gap-1.5 ${
                                        card.isCorrect
                                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs'
                                          : card.status === 'wrong'
                                          ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs'
                                          : 'bg-amber-50/80 border-amber-200 text-amber-900'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        {card.letter && (
                                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-xs shrink-0 ${
                                            card.letter === 'U' ? 'bg-sky-500 text-white' : 'bg-emerald-500 text-white'
                                          }`}>
                                            {card.letter}
                                          </span>
                                        )}
                                        <div className="truncate">
                                          <span className="font-extrabold">{card.subtext || card.cardText}</span>
                                          <span className="text-[10px] text-slate-500 block">
                                            {card.targetZone ? `➔ ${card.targetZone}` : 'Chưa xếp ô'}
                                          </span>
                                        </div>
                                      </div>
                                      <span className={`shrink-0 font-black text-[11px] px-1.5 py-0.5 rounded-md ${
                                        card.isCorrect
                                          ? 'bg-emerald-200/80 text-emerald-800'
                                          : card.status === 'wrong'
                                          ? 'bg-rose-200/80 text-rose-800'
                                          : 'bg-amber-200/80 text-amber-800'
                                      }`}>
                                        {card.isCorrect ? '✅ Đúng' : card.status === 'wrong' ? '❌ Thả sai ô' : '⏳ Chưa kéo'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Detailed answers list or history items from racing game if no drag cards */}
                            {dragCards.length === 0 && (answersList.length > 0 || historyItems.length > 0) && (
                              <div className="mt-2 pt-2 border-t border-slate-200/70">
                                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block mb-1">
                                  Lịch sử các câu trong trò chơi:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                                  {(answersList.length > 0 ? answersList : historyItems).map((h: any, hIdx: number) => (
                                    <div
                                      key={hIdx}
                                      className={`text-[11px] p-2 rounded-lg border flex items-center justify-between gap-1.5 ${
                                        h.isCorrect ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50/80 border-rose-200 text-rose-900'
                                      }`}
                                    >
                                      <span className="truncate font-semibold">
                                        <b>{hIdx + 1}.</b> {h.question || 'Lượt ' + (hIdx + 1)}: {h.chosenAnswer || h.choiceText || h.text || ''}
                                      </span>
                                      <span className="shrink-0 font-black">{h.isCorrect ? '✅ Đúng' : '❌ Sai'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Status label with View Details Modal Button */}
                            <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                              <span className={hasAnswered ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}>
                                {hasAnswered ? '✓ Hoàn thành phần chơi' : 'Chưa hoàn thành'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  setDetailTeamId(team.teamId);
                                  setDetailModalOpen(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 hover:underline font-extrabold flex items-center gap-1 text-[11px] cursor-pointer"
                              >
                                <span>🔍 Xem chi tiết bài làm</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : isOpenEnded ? (
                    /* Open-ended drawing and writing result breakdown */
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-extrabold text-purple-800 flex items-center gap-1.5">
                          <PenTool className="w-3.5 h-3.5 text-purple-600" />
                          <span>Bài làm tự luận (Vẽ & Viết):</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {(() => {
                            const teacherGrade = ans?.openEnded?.teacherGrade;
                            const isPending = !teacherGrade || teacherGrade === 'pending';
                            const isCorrectGrade = teacherGrade === 'correct';
                            const pts = ans?.pointsAwarded !== undefined ? ans.pointsAwarded : (currentQ?.points || 10);

                            if (isPending) {
                              return (
                                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg border bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1 shadow-2xs">
                                  <span>⏳</span>
                                  <span>Chờ cô chấm</span>
                                </span>
                              );
                            }

                            if (isCorrectGrade) {
                              return (
                                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
                                  <span>✅</span>
                                  <span>+{pts}đ (Đúng)</span>
                                </span>
                              );
                            }

                            return (
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg border bg-rose-100 text-rose-800 border-rose-300 flex items-center gap-1">
                                <span>❌</span>
                                <span>+0đ (Chưa đúng)</span>
                              </span>
                            );
                          })()}

                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              setGradeModalTeamId(team.teamId);
                              setGradeModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-extrabold flex items-center gap-1 transition cursor-pointer active:scale-95"
                          >
                            <PenTool className="w-3 h-3" />
                            <span>Chấm & Sửa bài</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        {ans?.openEnded?.annotatedDrawingDataUrl || ans?.openEnded?.drawingDataUrl ? (
                          <div className="shrink-0 relative group">
                            <img
                              src={ans.openEnded.annotatedDrawingDataUrl || ans.openEnded.drawingDataUrl}
                              alt="Hình vẽ"
                              className="w-24 h-24 object-contain rounded-lg border border-purple-200 bg-white shadow-2xs cursor-pointer hover:opacity-90"
                              onClick={() => {
                                setGradeModalTeamId(team.teamId);
                                setGradeModalOpen(true);
                              }}
                              title="Bấm để xem phóng to và chấm điểm"
                            />
                            {ans.openEnded.annotatedDrawingDataUrl && (
                              <span className="absolute bottom-1 right-1 bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                                Đã sửa
                              </span>
                            )}
                          </div>
                        ) : null}

                        <div className="flex-1 min-w-0">
                          {ans?.openEnded?.textAnswer ? (
                            <p className="font-extrabold text-xs text-slate-800 break-words mb-1">
                              "{ans.openEnded.textAnswer}"
                            </p>
                          ) : !ans?.openEnded?.drawingDataUrl ? (
                            <span className="text-slate-400 text-xs font-bold italic">
                              {hasAnswered ? 'Đã nộp bài (không có hình/chữ)' : 'Chưa nộp bài'}
                            </span>
                          ) : null}

                          {ans?.openEnded?.teacherFeedback?.trim() && ans?.openEnded?.teacherGrade && ans.openEnded.teacherGrade !== 'pending' ? (
                            <div className="mt-1 text-[11px] font-bold text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                              💌 Nhận xét của cô: "{ans.openEnded.teacherFeedback}"
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : isWordDrag ? (
                    /* Word Drag & Drop question breakdown */
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-extrabold text-teal-800 flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5 text-teal-600" />
                          <span>Chữ bé đã kéo vào ô trống:</span>
                        </span>

                        <div className="flex items-center gap-2">
                          {(() => {
                            const teacherGrade = ans?.openEnded?.teacherGrade;
                            const isPending = !teacherGrade || teacherGrade === 'pending';
                            const isCorrectGrade = teacherGrade === 'correct';
                            const pts = ans?.pointsAwarded !== undefined ? ans.pointsAwarded : (ans?.openEnded?.teacherPoints ?? 0);

                            if (isPending) {
                              return (
                                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg border bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1 shadow-2xs">
                                  <span>⏳</span>
                                  <span>Chờ cô chấm</span>
                                </span>
                              );
                            }

                            if (isCorrectGrade) {
                              return (
                                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
                                  <span>✅</span>
                                  <span>+{pts}đ (Đúng)</span>
                                </span>
                              );
                            }

                            return (
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg border bg-rose-100 text-rose-800 border-rose-300 flex items-center gap-1">
                                <span>❌</span>
                                <span>+0đ (Chưa đúng)</span>
                              </span>
                            );
                          })()}

                          {/* Quick Teacher Grade Buttons */}
                          <button
                            type="button"
                            onClick={() => handleGradeSingleWordDrag(team.teamId, true)}
                            className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black flex items-center gap-1 transition cursor-pointer active:scale-95"
                            title="Chấm đúng cho bé (+10đ)"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Đúng</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleGradeSingleWordDrag(team.teamId, false)}
                            className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-black flex items-center gap-1 transition cursor-pointer active:scale-95"
                            title="Chấm chưa đúng (0đ)"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Chưa đúng</span>
                          </button>
                        </div>
                      </div>

                      {/* Word formed & Letter display */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        {(() => {
                          const correctLetter = (currentQ?.missingLetters?.[0] || 'm').toLowerCase();
                          let placedLetter = '';
                          if (ans?.openEnded?.textAnswer) {
                            placedLetter = ans.openEnded.textAnswer;
                          } else if (ans?.answerText) {
                            const match = ans.answerText.match(/Bé ghép chữ "([^"]+)"/);
                            if (match && match[1]) placedLetter = match[1];
                          }
                          placedLetter = (placedLetter || '').trim().toLowerCase();

                          const template = currentQ?.wordTemplate || '...iệng';
                          const parts = template.split(/\.{2,}|_{1,}/);
                          const prefix = (parts[0] || '').toLowerCase();
                          const suffix = (parts[1] || '').toLowerCase();

                          const isAutoMatch = placedLetter && placedLetter.toLowerCase() === correctLetter.toLowerCase();

                          return (
                            <div className="flex items-center gap-3 flex-wrap">
                              {placedLetter ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-500">Bé đã kéo chữ:</span>
                                  <span className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center lowercase shadow-2xs ${
                                    isAutoMatch ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                                  }`}>
                                    {placedLetter.toLowerCase()}
                                  </span>

                                  <span className="text-slate-400">➔ Ghép thành:</span>
                                  <span className="text-base font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 lowercase">
                                    {prefix}<b className={isAutoMatch ? 'text-emerald-700' : 'text-amber-700'}>{placedLetter.toLowerCase()}</b>{suffix}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-slate-400 italic">
                                  {hasAnswered ? 'Bé chưa kéo chữ nào vào ô' : 'Chưa nộp bài'}
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setDetailTeamId(team.teamId);
                            setDetailModalOpen(true);
                          }}
                          className="text-xs font-extrabold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                          title="Xem đáp án của bé song song với đáp án cô"
                        >
                          <span>🔍 So sánh song song đáp án</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Multiple choice answer options breakdown */
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-extrabold text-slate-600">
                          Đáp án đội đã chọn:
                        </span>
                        {ans && ans.responseTimeMs > 0 && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3" />
                            {(ans.responseTimeMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>

                      {hasAnswered && chosenOptions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {chosenOptions.map((opt) => {
                            const idx = currentQ?.options?.findIndex(o => o.id === opt.id) ?? -1;
                            const letter = idx >= 0 ? letters[idx] : '•';
                            const isOptCorrect = Boolean(opt.isCorrect);

                            return (
                              <span
                                key={opt.id}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold border shadow-2xs ${
                                  isOptCorrect
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${
                                  isOptCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}>
                                  {letter}
                                </span>
                                <span>{opt.text}</span>
                                {isOptCorrect ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                )}
                              </span>
                            );
                          })}
                        </div>
                      ) : hasAnswered && ans.answerText ? (
                        <div className="text-xs font-black text-slate-800">
                          {ans.answerText}
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-slate-400 italic">
                          Chưa kịp nộp câu trả lời (Hết thời gian)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Score Awarded for THIS Question */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 min-w-[120px]">
                  {(isOpenEnded || isWordDrag) && (!ans?.openEnded?.teacherGrade || ans?.openEnded?.teacherGrade === 'pending') ? (
                    <span className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border-2 border-amber-300 px-3.5 py-1.5 rounded-2xl text-xs font-black shadow-xs">
                      <span>⏳ 0 điểm</span>
                    </span>
                  ) : hasAnswered ? (
                    isCorrect ? (
                      <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-100 border-2 border-emerald-300 px-3.5 py-1.5 rounded-2xl text-sm font-black shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>+{pointsThisQuestion} điểm</span>
                      </span>
                    ) : pointsThisQuestion > 0 ? (
                      <span className="flex items-center gap-1.5 text-amber-800 bg-amber-100 border-2 border-amber-300 px-3.5 py-1.5 rounded-2xl text-sm font-black shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                        <span>+{pointsThisQuestion} điểm</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-rose-800 bg-rose-100 border-2 border-rose-300 px-3.5 py-1.5 rounded-2xl text-sm font-black shadow-xs">
                        <span>+0 điểm</span>
                      </span>
                    )
                  ) : (
                    <span className="text-slate-500 bg-slate-200 px-3 py-1.5 rounded-2xl text-xs font-bold">
                      +0 điểm (Hết giờ)
                    </span>
                  )}

                  <span className={`text-[11px] font-black uppercase tracking-wider ${
                    (isOpenEnded || isWordDrag) && (!ans?.openEnded?.teacherGrade || ans?.openEnded?.teacherGrade === 'pending')
                      ? 'text-amber-700'
                      : isCorrect
                      ? 'text-emerald-700'
                      : pointsThisQuestion > 0
                      ? 'text-amber-700'
                      : 'text-slate-500'
                  }`}>
                    {(isOpenEnded || isWordDrag)
                      ? (!ans?.openEnded?.teacherGrade || ans?.openEnded?.teacherGrade === 'pending'
                          ? '⏳ Chờ cô chấm'
                          : ans?.openEnded?.teacherGrade === 'correct' || isCorrect
                          ? '✓ Câu trả lời đúng'
                          : '✗ Chưa đúng')
                      : isCorrect ? '✓ Câu trả lời đúng' : pointsThisQuestion > 0 ? '✓ Đúng 1 phần' : hasAnswered ? '✗ Chưa chính xác' : 'Hết giờ'}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setDetailTeamId(team.teamId);
                      setDetailModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] border border-indigo-200 transition cursor-pointer active:scale-95 shadow-2xs mt-1"
                    title="Bấm để xem chi tiết câu trả lời và lựa chọn của đội này"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Xem chi tiết</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}

      {/* Compact Bottom Navigation Bar to Advance Classroom */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl px-4 py-2.5 sm:py-3 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-2.5 mt-3">
        <div>
          <h4 className="text-xs sm:text-sm font-black flex items-center gap-1.5">
            <Play className="w-4 h-4 text-emerald-400 fill-current" />
            <span>Cô đã sẵn sàng cho câu tiếp theo chưa?</span>
          </h4>
          <p className="text-[11px] font-semibold text-slate-300 mt-0.5">
            Học sinh trên điện thoại đang ở màn hình chờ. Bấm nút bên cạnh để tất cả thiết bị cùng chuyển sang câu mới!
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onNextQuestion();
          }}
          className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/30 transition active:scale-95 cursor-pointer ring-2 ring-emerald-400/40 shrink-0"
        >
          <span>{isLastQuestion ? 'XEM BÁO CÁO TỔNG KẾT' : 'BẮT ĐẦU CÂU TIẾP THEO'}</span>
          {isLastQuestion ? <Trophy className="w-4 h-4 text-amber-300" /> : <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
        </button>
      </div>

      {/* Detail Answers Modal */}
      <TeamAnswersDetailModal
        session={session}
        initialTeamId={detailTeamId}
        initialQuestionIndex={currentQIndex}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />

      {/* Grade Open Ended Modal */}
      {gradeModalTeamId && (
        <GradeOpenEndedModal
          session={session}
          questionIndex={currentQIndex}
          teamId={gradeModalTeamId}
          isOpen={gradeModalOpen}
          onClose={() => setGradeModalOpen(false)}
        />
      )}
    </div>
  );
};
