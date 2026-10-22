import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Clock, CheckCircle2, Hourglass, StopCircle, HelpCircle, Layers, FileCode, Play, Eye, Maximize2, RotateCcw, Sparkles, Volume2, VolumeX, WifiOff, Home, AlertTriangle, X } from 'lucide-react';
import { SessionState, ConnectedTeam } from '../../types/game';
import { TEAM_PRESETS } from '../../data/teamPresets';
import { sounds } from '../../utils/sound';
import { realtime } from '../../services/realtimeClient';
import { HtmlGamePreviewModal } from '../games/HtmlGamePreviewModal';
import { speakQuestionWithOptions, stopSpeaking, subscribeSpeakingState, unlockSpeechAudio } from '../../utils/speechVoice';

import { DualQuestionPane } from './DualQuestionPane';

interface HostQuestionActiveProps {
  session: SessionState;
  onEndQuestion: () => void;
  onExit?: () => void;
}

export const HostQuestionActive: React.FC<HostQuestionActiveProps> = ({
  session,
  onEndQuestion,
  onExit,
}) => {
  const isDualMode = Boolean(session.isDualMode && session.gameB);
  const currentQIndex = session.currentQuestionIndex;
  const currentQA = session.game.questions[currentQIndex];
  const currentQB = session.gameB?.questions[currentQIndex];
  const currentQ = currentQA || currentQB;
  const totalQuestions = isDualMode
    ? Math.max(session.game.questions.length, session.gameB?.questions.length || 0)
    : session.game.questions.length;

  const isOpenEnded = currentQ?.type === 'open_ended';
  const isNoTimeLimit = Boolean(currentQ?.noTimeLimit || currentQ?.timeLimit === 0 || session.questionTimeLimit === 0 || isOpenEnded);
  const timeLimit = isNoTimeLimit ? 0 : (session.questionTimeLimit || currentQ?.timeLimit || 25);
  const startTime = session.questionStartTime || realtime.getServerNow();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingSet, setSpeakingSet] = useState<'A' | 'B' | null>(null);
  const [hostSrcDocFallback, setHostSrcDocFallback] = useState<boolean>(false);
  const hostIframeRef = useRef<HTMLIFrameElement>(null);

  // Unfinished confirmation modal for open-ended questions (only checks teams that haven't drawn or typed anything)
  const [showUnfinishedModal, setShowUnfinishedModal] = useState(false);
  const [unfinishedList, setUnfinishedList] = useState<Array<{
    teamId: string;
    teamName: string;
    icon?: string;
  }>>([]);

  const effectiveHostGameUrl = !hostSrcDocFallback ? (currentQ?.gameUrl || session.game.gameUrl) : undefined;

  const handleReloadHostIframe = () => {
    sounds.playClick();
    setHostSrcDocFallback(false);
    if (hostIframeRef.current) {
      const url = currentQ?.gameUrl || session.game.gameUrl;
      if (url) {
        hostIframeRef.current.src = url;
      } else {
        hostIframeRef.current.srcdoc = currentQ?.htmlContent || '';
      }
    }
  };

  const handleHostIframeError = () => {
    if (!hostSrcDocFallback && currentQ?.htmlContent) {
      console.warn('Host iframe error loading src, switching to srcDoc fallback');
      setHostSrcDocFallback(true);
    }
  };

  const handleHostIframeLoad = () => {
    try {
      const doc = hostIframeRef.current?.contentDocument;
      if (doc) {
        const isSpa = Boolean(doc.getElementById('root')) || (doc.title && doc.title.includes('Vui Học Cùng Cô'));
        const is404 = (doc.title && doc.title.includes('404')) || (doc.body && doc.body.innerText && doc.body.innerText.includes('404: Không tìm thấy'));
        if ((isSpa || is404) && currentQ?.htmlContent && !hostSrcDocFallback) {
          console.warn('Host iframe loaded main SPA or 404, falling back to bundled srcDoc');
          setHostSrcDocFallback(true);
        }
      }
    } catch (_e) {}
  };

  useEffect(() => {
    const unsub = subscribeSpeakingState((speaking) => {
      setIsSpeaking(speaking);
      if (!speaking) setSpeakingSet(null);
    });
    return () => {
      unsub();
      stopSpeaking();
    };
  }, []);

  // Automatically read question aloud for the classroom if enabled (in single mode)
  useEffect(() => {
    if (isDualMode) return;
    const isDrag = currentQ?.type === 'drag_drop' && Boolean(currentQ.canvasConfig);
    const isHtml = currentQ?.type === 'html_game' || Boolean(currentQ?.htmlContent);
    if (currentQ && currentQ.readQuestionAudio !== false && !isDrag && !isHtml) {
      const autoTimer = setTimeout(() => {
        speakQuestionWithOptions(currentQ.title, currentQ.options);
      }, 500);
      return () => {
        clearTimeout(autoTimer);
      };
    }
  }, [currentQIndex, isDualMode]);

  const handleToggleVoice = () => {
    sounds.playClick();
    unlockSpeechAudio();
    if (isSpeaking) {
      stopSpeaking();
    } else if (currentQ) {
      speakQuestionWithOptions(currentQ.title, currentQ.options);
    }
  };

  const handleToggleVoiceA = () => {
    sounds.playClick();
    unlockSpeechAudio();
    if (isSpeaking && speakingSet === 'A') {
      stopSpeaking();
      setSpeakingSet(null);
    } else if (currentQA) {
      setSpeakingSet('A');
      speakQuestionWithOptions(currentQA.title, currentQA.options);
    }
  };

  const handleToggleVoiceB = () => {
    sounds.playClick();
    unlockSpeechAudio();
    if (isSpeaking && speakingSet === 'B') {
      stopSpeaking();
      setSpeakingSet(null);
    } else if (currentQB) {
      setSpeakingSet('B');
      speakQuestionWithOptions(currentQB.title, currentQB.options);
    }
  };

  // Server-synchronized timer
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (isNoTimeLimit) return 999;
    const now = realtime.getServerNow();
    const elapsed = Math.floor((now - startTime) / 1000);
    return Math.max(0, timeLimit - elapsed);
  });

  const onEndQuestionRef = useRef(onEndQuestion);
  onEndQuestionRef.current = onEndQuestion;
  const hasTriggeredEndRef = useRef(false);

  useEffect(() => {
    hasTriggeredEndRef.current = false;
  }, [currentQIndex]);

  useEffect(() => {
    if (isNoTimeLimit) return;

    const timer = setInterval(() => {
      const now = realtime.getServerNow();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);

      setTimeLeft(remaining);

      if (remaining <= 5 && remaining > 0) {
        sounds.playUrgentTick();
      } else if (remaining > 5) {
        sounds.playTick();
      }

      if (remaining <= 0) {
        clearInterval(timer);
        if (!hasTriggeredEndRef.current && !isOpenEnded) {
          hasTriggeredEndRef.current = true;
          onEndQuestionRef.current();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, timeLimit, isNoTimeLimit, isOpenEnded]);

  const currentAnswers = session.answers[currentQIndex] || {};
  const teamsList = Object.values(session.teams);
  const teamsA = isDualMode
    ? teamsList.filter(t => (t.assignedSet || session.teamAssignments?.[t.teamId] || 'A') === 'A')
    : teamsList;
  const teamsB = isDualMode
    ? teamsList.filter(t => (t.assignedSet || session.teamAssignments?.[t.teamId]) === 'B')
    : [];

  const onlineTeams = teamsList.filter(t => t.online !== false);
  const answeredCount = Object.keys(currentAnswers).length;
  const totalTeams = teamsList.length;

  // Auto-finish if all active online teams answered, or all teams in room answered
  const allOnlineAnswered = onlineTeams.length > 0 && onlineTeams.every(t => currentAnswers[t.teamId]);
  const allAnswered = (totalTeams > 0 && answeredCount >= totalTeams) || allOnlineAnswered;

  const isWordDrag = currentQ?.type === 'word_drag_drop';
  const isManualEnd = isOpenEnded || isWordDrag;

  // Auto-finish if all active teams answered (EXCEPT open-ended and word_drag_drop questions which only end when host explicitly clicks "Kết thúc & Thu bài")
  useEffect(() => {
    if (allAnswered && !isManualEnd) {
      const timeout = setTimeout(() => {
        onEndQuestion();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [allAnswered, isManualEnd, onEndQuestion]);

  const [liveDrafts, setLiveDrafts] = useState<Record<string, { hasDrawn?: boolean; textAnswer?: string; drawingDataUrl?: string }>>({});

  // Reset liveDrafts whenever active question index changes
  useEffect(() => {
    setLiveDrafts({});
  }, [currentQIndex]);

  useEffect(() => {
    const unsub = realtime.on('draft_updated', (data: any) => {
      if (data && data.teamId) {
        if (data.questionIndex !== undefined && Number(data.questionIndex) !== currentQIndex) {
          return;
        }
        const hasDrawn = Boolean(
          data.hasDrawn ||
          data.draft?.hasDrawn ||
          (data.drawingDataUrl && data.drawingDataUrl.length > 20) ||
          (data.draft?.drawingDataUrl && data.draft.drawingDataUrl.length > 20)
        );
        const textAnswer = data.textAnswer || data.draft?.textAnswer;
        const drawingDataUrl = data.drawingDataUrl || data.draft?.drawingDataUrl;

        const draftItem = {
          hasDrawn,
          textAnswer,
          drawingDataUrl,
        };

        setLiveDrafts((prev) => ({
          ...prev,
          [data.teamId]: draftItem,
          [data.teamId.toLowerCase()]: draftItem,
        }));
      }
    });
    return () => {
      unsub();
    };
  }, [currentQIndex]);

  const currentMergedDrafts = useMemo(() => {
    const sessionDraftsForQ = session.drafts?.[currentQIndex] || session.drafts?.[String(currentQIndex)] || {};
    return {
      ...sessionDraftsForQ,
      ...liveDrafts,
    };
  }, [session.drafts, currentQIndex, liveDrafts]);

  const handleHostClickEndQuestion = () => {
    sounds.playClick();
    const hasAnyOpenEnded = isDualMode
      ? (currentQA?.type === 'open_ended' || currentQB?.type === 'open_ended')
      : (currentQ?.type === 'open_ended');

    if (hasAnyOpenEnded) {
      let targetTeams: ConnectedTeam[] = [];
      if (isDualMode) {
        if (currentQA?.type === 'open_ended') targetTeams.push(...teamsA);
        if (currentQB?.type === 'open_ended') targetTeams.push(...teamsB);
      } else {
        targetTeams = teamsList;
      }

      const pendingList: Array<{
        teamId: string;
        teamName: string;
        icon?: string;
      }> = [];

      targetTeams.forEach((team) => {
        const ans = currentAnswers[team.teamId];
        const draft = session.drafts?.[currentQIndex]?.[team.teamId] || liveDrafts[team.teamId];

        const hasDrawn = Boolean(
          draft?.hasDrawn ||
          (draft?.drawingDataUrl && draft.drawingDataUrl.length > 50) ||
          (ans?.openEnded?.drawingDataUrl && ans.openEnded.drawingDataUrl.length > 50)
        );
        const hasText = Boolean(
          draft?.textAnswer?.trim() ||
          ans?.openEnded?.textAnswer?.trim()
        );

        // Warning trigger: Kid hasn't drawn or typed anything at all
        if (!hasDrawn && !hasText) {
          pendingList.push({
            teamId: team.teamId,
            teamName: team.teamName,
            icon: team.icon,
          });
        }
      });

      if (pendingList.length > 0) {
        sounds.playWrong();
        setUnfinishedList(pendingList);
        setShowUnfinishedModal(true);
        return;
      }
    }

    hasTriggeredEndRef.current = true;
    onEndQuestion();
  };

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100));
  const isDragDrop = currentQ?.type === 'drag_drop' && Boolean(currentQ.canvasConfig);
  const isHtmlGame = Boolean(
    currentQ?.type === 'html_game' ||
    currentQ?.htmlContent ||
    currentQ?.gameUrl ||
    session.game.gameUrl ||
    session.game.gameType === 'html_game' ||
    session.game.isZipArchive
  );
  const totalCards = currentQ?.canvasConfig?.elements.filter(e => e.isDraggable).length || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">

      {/* Top Bar: Progress and Timer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-md mb-6">
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-sm tracking-wide">
            CÂU {currentQIndex + 1} / {totalQuestions}
          </span>
          {isDualMode ? (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-black text-xs border border-indigo-200">
                📘 Bộ 1: {teamsA.filter(t => Boolean(currentAnswers[t.teamId])).length}/{teamsA.length} đã nộp
              </span>
              <span className="px-2.5 py-1 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-200">
                📙 Bộ 2: {teamsB.filter(t => Boolean(currentAnswers[t.teamId])).length}/{teamsB.length} đã nộp
              </span>
            </div>
          ) : (
            <>
              <span className="text-slate-400 font-bold hidden sm:inline">|</span>
              <span className="text-xs sm:text-sm font-bold text-slate-500 truncate max-w-xs sm:max-w-md">
                {session.game.title}
              </span>
            </>
          )}
        </div>

        {/* Large Timer with Visual Alert */}
        <div className="flex items-center gap-3">
          {isOpenEnded || isWordDrag ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 shadow-2xs">
              <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
              <div className="font-extrabold text-xs sm:text-sm">
                {isWordDrag ? 'Kéo thả ô chữ:' : 'Câu tự luận vẽ tranh:'} <span className="text-purple-700 font-black">Chỉ kết thúc khi cô bấm nút thu bài</span>
              </div>
            </div>
          ) : isNoTimeLimit ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-800">
              <Clock className="w-5 h-5 text-purple-600 animate-pulse" />
              <div className="font-extrabold text-sm sm:text-base">
                Không tính thời gian <span className="text-xs font-bold text-purple-600">(Cô chủ động kết thúc)</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Clock className={`w-6 h-6 ${timeLeft <= 5 ? 'text-rose-500 animate-bounce' : 'text-amber-500'}`} />
              <div className={`font-mono font-black text-3xl sm:text-4xl tabular-nums ${timeLeft <= 5 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
              </div>
            </div>
          )}

          <button
            onClick={handleHostClickEndQuestion}
            className="ml-2 px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer ring-2 ring-rose-300 ring-offset-1"
            title={isManualEnd ? "Bấm để kết thúc câu hỏi và thu bài làm của tất cả các bé" : "Bấm để kết thúc câu hỏi và tự động nộp bài cho tất cả các đội"}
          >
            <StopCircle className="w-4 h-4" />
            <span>{isManualEnd ? 'KẾT THÚC & THU BÀI' : 'KẾT THÚC CÂU'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar for Timer */}
      <div className="w-full bg-slate-200 rounded-full h-3 mb-6 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            isNoTimeLimit
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
              : timeLeft <= 5 ? 'bg-rose-500' : timeLeft <= 10 ? 'bg-amber-400' : 'bg-emerald-500'
          }`}
          style={{ width: isNoTimeLimit ? '100%' : `${progressPercent}%` }}
        />
      </div>

      {isDualMode ? (
        /* Split Screen Dual Mode: Display ALL questions and answers of both question sets side-by-side */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mb-8">
          <DualQuestionPane
            label="BỘ CÂU HỎI 1 (ĐỀ A)"
            badgeColor="indigo"
            gameTitle={session.game.title}
            gameCategory={session.game.category}
            question={currentQA}
            questionIndex={currentQIndex}
            totalQuestions={totalQuestions}
            teams={teamsA}
            answers={currentAnswers}
            drafts={currentMergedDrafts}
          />
          <DualQuestionPane
            label="BỘ CÂU HỎI 2 (ĐỀ B)"
            badgeColor="pink"
            gameTitle={session.gameB?.title || 'Bộ câu hỏi 2'}
            gameCategory={session.gameB?.category}
            question={currentQB}
            questionIndex={currentQIndex}
            totalQuestions={totalQuestions}
            teams={teamsB}
            answers={currentAnswers}
            drafts={currentMergedDrafts}
          />
        </div>
      ) : (
        <>
          {/* Big Question Presentation Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border-2 border-indigo-100 shadow-xl mb-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-500"></div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 font-extrabold text-xs mb-4">
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <span>
            {isHtmlGame
              ? '🚀 Trò chơi HTML5 tương tác trên thiết bị các đội'
              : isDragDrop
              ? '🎮 Trò chơi kéo thả tương tác trên điện thoại'
              : 'Bé lắng nghe và quan sát câu hỏi'}
          </span>
        </div>

        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-snug tracking-tight mb-4">
          {currentQ?.title}
        </h2>

        {(currentQ?.imageUrl || currentQ?.openEndedBgImage) && (
          <div className="my-4 flex flex-wrap items-center justify-center gap-4 max-w-4xl mx-auto">
            {/* Question Illustration Image (Hình minh họa câu hỏi) */}
            {currentQ?.imageUrl && (
              <div className="flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-slate-50 border-2 border-indigo-100 p-2.5 max-w-md shadow-sm">
                {isOpenEnded && currentQ?.openEndedBgImage && currentQ.openEndedBgImage !== currentQ.imageUrl && (
                  <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-3 py-0.5 rounded-full border border-indigo-200 mb-1.5">
                    🖼️ Hình minh họa câu hỏi
                  </span>
                )}
                <img
                  src={currentQ.imageUrl}
                  alt="Hình minh họa câu hỏi"
                  className="max-h-48 sm:max-h-56 max-w-full object-contain rounded-2xl"
                />
              </div>
            )}

            {/* Open-ended background drawing template (Hình trên khung vẽ của học sinh) */}
            {isOpenEnded && currentQ?.openEndedBgImage && currentQ.openEndedBgImage !== currentQ.imageUrl && (
              <div className="flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-purple-50/50 border-2 border-purple-200 p-2.5 max-w-md shadow-sm">
                <span className="text-[11px] font-black text-purple-700 bg-purple-50 px-3 py-0.5 rounded-full border border-purple-200 mb-1.5">
                  🎨 Hình trên khung vẽ của học sinh
                </span>
                <img
                  src={currentQ.openEndedBgImage}
                  alt="Hình trên khung vẽ của học sinh"
                  className="max-h-48 sm:max-h-56 max-w-full object-contain rounded-2xl"
                />
              </div>
            )}
          </div>
        )}

        {/* Display Options / Targets Preview for Classroom Display */}
        {isHtmlGame ? (
          <div className="mt-4 flex flex-col items-center w-full">
            <div className="w-full flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs font-black text-cyan-800 bg-cyan-50 px-3 py-1.5 rounded-xl border border-cyan-200 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span>Giao diện & nội dung trò chơi nguyên bản (File ZIP / HTML5):</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReloadHostIframe}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  title="Tải lại trò chơi"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tải lại</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setIsPreviewOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-200 transition active:scale-95 cursor-pointer"
                  title="Phóng to toàn màn hình máy chiếu hoặc TV lớp học"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Chiếu toàn màn hình TV / Máy chiếu</span>
                </button>
              </div>
            </div>

            <div className="w-full h-[520px] sm:h-[620px] rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md bg-white relative">
              <iframe
                ref={hostIframeRef}
                src={effectiveHostGameUrl || undefined}
                srcDoc={!effectiveHostGameUrl ? (currentQ?.htmlContent || '') : undefined}
                onError={handleHostIframeError}
                onLoad={handleHostIframeLoad}
                title={currentQ?.title || 'Trò chơi'}
                sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
                allow="autoplay; fullscreen"
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        ) : isDragDrop ? (
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
            {currentQ?.canvasConfig?.elements.filter(e => e.isDropZone).map((zone) => (
              <div
                key={zone.id}
                className="px-6 py-4 rounded-3xl border-3 border-indigo-300 bg-indigo-50/80 text-indigo-900 font-black text-xl shadow-sm flex items-center gap-3"
              >
                {zone.imageUrl ? (
                  <img
                    src={zone.imageUrl}
                    alt={zone.text || 'Ô đích'}
                    className="w-12 h-12 object-contain rounded-xl bg-white p-1 border border-indigo-200"
                  />
                ) : (
                  <span>🎯</span>
                )}
                <span>{zone.text}</span>
              </div>
            ))}
          </div>
        ) : currentQ?.type === 'word_drag_drop' ? (
          <div className="mt-4 flex flex-col items-center w-full max-w-3xl mx-auto">
            {/* Word Display with Missing Slot */}
            <div className="p-4 sm:p-6 rounded-3xl bg-indigo-50/70 border-2 border-indigo-200 flex flex-col items-center justify-center shadow-inner mb-4 w-full">
              <span className="text-xs font-black uppercase text-indigo-700 tracking-wider mb-2">
                TỪ CẦN HOÀN THIỆN:
              </span>
              <div className="text-3xl sm:text-5xl font-black text-indigo-950 font-mono tracking-widest bg-white px-8 py-4 rounded-2xl border-2 border-indigo-200 shadow-md lowercase">
                {(currentQ.wordTemplate || `${currentQ.targetWord || '...'}`).toLowerCase()}
              </div>
            </div>

            {/* Classroom Voice Reader Button */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-sm ${
                  isSpeaking
                    ? 'bg-rose-500 text-white animate-pulse shadow-rose-200'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-2 border-indigo-200 hover:border-indigo-300'
                }`}
                title="Bấm để phát âm thanh câu hỏi cho cả lớp"
              >
                {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-indigo-600" />}
                <span>{isSpeaking ? 'Dừng đọc' : '🔊 Phát giọng đọc câu hỏi cho cả lớp'}</span>
              </button>
            </div>

            {/* Letter Pool on Classroom Display */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="text-xs font-black uppercase text-slate-500 mr-1">Các chữ cái lựa chọn:</span>
              {(currentQ.letterPool || currentQ.options?.map(o => o.text) || []).map((letter, i) => (
                <div
                  key={`${letter}_${i}`}
                  className="w-12 h-14 sm:w-14 sm:h-16 rounded-2xl bg-white border-2 border-indigo-200 font-black text-2xl sm:text-3xl text-indigo-800 flex items-center justify-center lowercase shadow-sm"
                >
                  {letter.toLowerCase()}
                </div>
              ))}
            </div>
          </div>
        ) : isOpenEnded ? null : (
          <div className="mt-4 flex flex-col items-center">
            {/* Multiple correct answers indicator */}
            {currentQ?.allowMultipleCorrect && (
              <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-extrabold text-xs sm:text-sm">
                <span>✨ Câu hỏi có nhiều đáp án đúng</span>
              </div>
            )}

            {/* Preschool Voice Reader Button for Classroom */}
            <div className="mb-5">
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-sm ${
                  isSpeaking
                    ? 'bg-rose-500 text-white animate-pulse shadow-rose-200'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-2 border-indigo-200 hover:border-indigo-300'
                }`}
                title="Bấm để phát âm thanh câu hỏi và các đáp án cho cả lớp cùng nghe"
              >
                {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-indigo-600" />}
                <span>{isSpeaking ? 'Dừng đọc' : '🔊 Phát giọng đọc câu hỏi cho cả lớp'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl w-full mx-auto">
              {currentQ?.options.map((opt, idx) => {
                const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                const optLetter = letters[idx] || `${idx + 1}`;
                const isFullOrCustom = (opt.imageFit === 'full' || opt.imageFit === 'custom') && Boolean(opt.imageUrl);

                return (
                  <div
                    key={opt.id}
                    className={`p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-left shadow-2xs hover:border-indigo-200 transition ${
                      isFullOrCustom
                        ? 'flex flex-col items-center justify-between text-center'
                        : 'flex items-center gap-3.5'
                    }`}
                  >
                    {isFullOrCustom ? (
                      <>
                        <div className="w-full flex items-center justify-between gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 font-black flex items-center justify-center text-sm shrink-0">
                            {optLetter}
                          </div>
                          <span className="font-extrabold text-slate-800 text-base sm:text-lg flex-1 text-left truncate">
                            {opt.text}
                          </span>
                        </div>

                        <div className="w-full my-2 bg-white rounded-xl p-1.5 border border-slate-200 shadow-2xs flex items-center justify-center">
                          <img
                            src={opt.imageUrl}
                            alt={opt.text}
                            style={opt.imageFit === 'custom' ? { height: `${opt.imageHeight || 160}px` } : undefined}
                            className={`w-full object-contain rounded-lg ${
                              opt.imageFit === 'custom' ? '' : 'h-36 sm:h-48'
                            }`}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 font-black flex items-center justify-center text-sm shrink-0">
                          {optLetter}
                        </div>

                        {opt.imageUrl && (
                          <img
                            src={opt.imageUrl}
                            alt={opt.text}
                            className={`object-contain rounded-xl bg-white p-1 border border-slate-200 shrink-0 ${
                              opt.imageFit === 'large'
                                ? 'w-24 h-24 sm:w-28 sm:h-28'
                                : opt.imageFit === 'small'
                                ? 'w-12 h-12'
                                : 'w-16 h-16 sm:w-20 sm:h-20'
                            }`}
                          />
                        )}

                        <span className="font-extrabold text-slate-800 text-base sm:text-lg">
                          {opt.text}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Team Response Status & Drag Progress Monitoring */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">
              TRẠNG THÁI TIẾN ĐỘ CỦA CÁC ĐỘI
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              Theo dõi trực tiếp theo thời gian thực (không lộ nội dung câu trả lời)
            </p>
          </div>

          <div className="flex items-center gap-2 font-black text-xs sm:text-sm px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200">
            {isOpenEnded ? (
              <span className="flex items-center gap-1.5 text-purple-700">
                <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                <span>Các bé đang tự do vẽ & trả lời câu hỏi 🎨 (Cô bấm Kết thúc câu để thu bài)</span>
              </span>
            ) : (
              <>
                <span>{answeredCount}</span>
                <span>/</span>
                <span>{onlineTeams.length} đội online hoàn thành</span>
                {teamsList.length > onlineTeams.length && (
                  <span className="text-[11px] text-rose-600 font-extrabold ml-1 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                    {teamsList.length - onlineTeams.length} mất kết nối
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamsList.map((team) => {
            const ans = currentAnswers[team.teamId];
            const hasAnswered = Boolean(ans);
            const preset = TEAM_PRESETS.find(p => p.id === team.teamId);
            const isOnline = team.online !== false;

            return (
              <div
                key={team.teamId}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                  !isOnline
                    ? 'border-slate-200 bg-slate-100/80 opacity-75'
                    : hasAnswered
                    ? 'border-emerald-300 bg-emerald-50/80 shadow-sm'
                    : isOpenEnded
                    ? 'border-purple-200 bg-purple-50/50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl ${preset?.bgColor || 'bg-slate-400'} text-white flex items-center justify-center text-xl shadow-sm ${!isOnline ? 'grayscale opacity-70' : ''}`}>
                    {team.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                        {team.teamName}
                      </h4>
                      {!isOnline && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Đã ngắt kết nối"></span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">
                      Điểm: {team.score}
                    </span>
                  </div>
                </div>

                <div>
                  {hasAnswered ? (
                    <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full text-xs font-black">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isDragDrop ? 'Đã xếp xong' : 'Đã xong'}</span>
                    </span>
                  ) : !isOnline ? (
                    <span className="flex items-center gap-1 text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-black">
                      <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                      <span>Mất kết nối</span>
                    </span>
                  ) : isOpenEnded ? (
                    <span className="flex items-center gap-1 text-purple-700 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded-full text-xs font-black animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Đang vẽ / trả lời...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full text-xs font-black animate-pulse">
                      <Hourglass className="w-3.5 h-3.5" />
                      <span>Đang chơi...</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}

      {/* Classroom Big Screen Projector Preview Modal */}
      <HtmlGamePreviewModal
        isOpen={isPreviewOpen}
        game={session.game}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Confirmation Modal: Warn if teams haven't drawn or completed work before collecting submissions */}
      {showUnfinishedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-6 sm:p-7 shadow-2xl border-4 border-amber-300 space-y-5 animate-scale-in">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                ⚠️
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-lg sm:text-xl text-slate-900 leading-snug">
                  CÓ ĐỘI CHƯA LÀM BÀI!
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  Hệ thống kiểm tra thấy có <b>{unfinishedList.length} đội</b> chưa vẽ hay chưa nhập nội dung gì:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUnfinishedModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of unfinished teams */}
            <div className="space-y-2 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
              {unfinishedList.map((t) => {
                const preset = TEAM_PRESETS.find(p => p.id === t.teamId);
                return (
                  <div
                    key={t.teamId}
                    className="p-3 rounded-xl border border-rose-200 bg-rose-50/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{t.icon || preset?.icon || '⭐'}</span>
                      <span className="font-black text-sm text-slate-900 truncate">
                        {t.teamName}
                      </span>
                    </div>

                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full border shrink-0 bg-rose-100 text-rose-700 border-rose-300">
                      🔴 Chưa vẽ hay nhập nội dung gì
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Warning Note */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <p>
                Nếu cô bấm <b>"Vẫn kết thúc & Thu bài"</b>, hệ thống sẽ tự động thu những nét vẽ hiện có của các bé hoặc ghi nhận là chưa nộp bài.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowUnfinishedModal(false);
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition active:scale-95 cursor-pointer shadow-md shadow-indigo-200"
              >
                Tiếp tục cho bé làm bài
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setShowUnfinishedModal(false);
                  hasTriggeredEndRef.current = true;
                  onEndQuestion();
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-extrabold text-sm transition active:scale-95 cursor-pointer"
              >
                Vẫn kết thúc & Thu bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
