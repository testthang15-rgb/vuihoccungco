import React, { useState, useEffect, useRef } from 'react';
import { Question, TeamAnswer } from '../../types/game';
import { Clock, CheckCircle2, Sparkles, Send, RotateCcw } from 'lucide-react';
import { sounds } from '../../utils/sound';
import { realtime } from '../../services/realtimeClient';

export interface HtmlGameResultPayload {
  isCorrect: boolean;
  points: number;
  summary?: string;
  totalCorrect?: number;
  totalQuestions?: number;
  score?: number;
  history?: any[];
  dragDetails?: any[];
  answersList?: any[];
  rawResult?: any;
}

interface PlayerHtmlQuestionProps {
  question: Question;
  gameUrl?: string;
  questionIndex: number;
  totalQuestions: number;
  startTime: number | null;
  timeLimit: number;
  existingAnswer?: TeamAnswer;
  onSubmitResult: (result: HtmlGameResultPayload) => void;
}

export const PlayerHtmlQuestion: React.FC<PlayerHtmlQuestionProps> = ({
  question,
  gameUrl,
  questionIndex,
  totalQuestions,
  startTime,
  timeLimit,
  existingAnswer,
  onSubmitResult,
}) => {
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(Boolean(existingAnswer && existingAnswer.answerId));
  const [liveProgressText, setLiveProgressText] = useState<string>('');
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [useSrcDocFallback, setUseSrcDocFallback] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const latestResultRef = useRef<any>(null);

  useEffect(() => {
    if (existingAnswer && existingAnswer.answerId) {
      setHasSubmitted(true);
    }
  }, [existingAnswer]);

  const effectiveUrl = !useSrcDocFallback ? (question.gameUrl || gameUrl) : undefined;
  const isNoTimeLimit = true; // Theo yêu cầu: mặc định không tính giờ trả lời
  const effectiveStart = startTime || realtime.getServerNow();
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const hasSubmittedRef = useRef(hasSubmitted);
  hasSubmittedRef.current = hasSubmitted;

  // Auto submit progress on unmount if not submitted
  useEffect(() => {
    return () => {
      if (!hasSubmittedRef.current) {
        handleSubmitCurrentProgress();
      }
    };
  }, []);

  const handleFinish = (
    isCorrect: boolean = true,
    points: number = 0,
    summary?: string,
    extraDetails?: Partial<HtmlGameResultPayload>
  ) => {
    if (hasSubmitted) return;
    setHasSubmitted(true);
    if (points > 0 || isCorrect) {
      sounds.playFanfare();
    } else {
      sounds.playClick();
    }
    onSubmitResult({
      isCorrect,
      points,
      score: points,
      summary: summary || (points > 0 ? `Bé đã hoàn thành! (+${points} điểm)` : 'Chưa hoàn thành trò chơi'),
      ...extraDetails,
    });
  };

  const handleSubmitCurrentProgress = () => {
    if (hasSubmitted) return;

    // 1. Try reading directly from iframe if bridge exposed on window
    let liveStats: any = null;
    try {
      const win = iframeRef.current?.contentWindow as any;
      if (win && typeof win.getVuiHocGameResult === 'function') {
        liveStats = win.getVuiHocGameResult();
      }
    } catch (_e) {}

    const source = liveStats || latestResultRef.current;
    if (source) {
      const totalCorrect = source.totalCorrect !== undefined ? Number(source.totalCorrect) : undefined;
      const totalQuestions = source.totalQuestions !== undefined ? Number(source.totalQuestions) : undefined;
      const maxQPoints = question.points || 30;

      let score = 0;
      if (source.score !== undefined && typeof source.score === 'number' && !isNaN(source.score)) {
        score = Math.max(0, Math.min(maxQPoints, Math.round(source.score)));
      } else if (totalCorrect !== undefined && totalQuestions !== undefined && totalQuestions > 0) {
        score = Math.round((totalCorrect / totalQuestions) * maxQPoints);
      } else if (source.isCorrect) {
        score = maxQPoints;
      }

      const isCorrect = source.isCorrect !== undefined
        ? Boolean(source.isCorrect)
        : (totalCorrect !== undefined && totalCorrect > 0);

      const summary = source.summary || (totalCorrect !== undefined && totalQuestions !== undefined
        ? `Đúng ${totalCorrect}/${totalQuestions} câu (+${score}đ)`
        : score > 0 ? `Đạt ${score} điểm` : 'Chưa ghi điểm');

      handleFinish(isCorrect, score, summary, {
        totalCorrect,
        totalQuestions,
        score,
        history: source.history,
        answersList: source.answersList,
        dragDetails: source.dragDetails,
        rawResult: source,
      });
      return;
    }

    // 2. Child submitted without answering any questions (0 points)
    handleFinish(false, 0, 'Bé chưa trả lời câu nào trong trò chơi', {
      totalCorrect: 0,
      totalQuestions: 0,
      score: 0,
    });
  };



  // Listen to postMessage from the embedded HTML game
  useEffect(() => {
    const handleGameMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;

      const data = event.data;

      // Handle intermediate progress
      if (data.type === 'GAME_PROGRESS') {
        latestResultRef.current = data;
        if (data.placedCount !== undefined && data.totalRequired !== undefined) {
          setLiveProgressText(`${data.placedCount}/${data.totalRequired}`);
        } else if (data.totalCorrect !== undefined && data.totalQuestions !== undefined) {
          setLiveProgressText(`Đúng ${data.totalCorrect}/${data.totalQuestions} câu`);
        } else if (data.score !== undefined) {
          setLiveProgressText(`${data.score} điểm`);
        }
      }

      // Handle final game completion
      if (data.type === 'GAME_COMPLETE' || data.type === 'GAME_FINISH') {
        if (hasSubmitted) return;
        latestResultRef.current = data;

        // Try reading rich stats directly from iframe window if message lacked details
        let liveStats: any = null;
        try {
          const win = iframeRef.current?.contentWindow as any;
          if (win && typeof win.getVuiHocGameResult === 'function') {
            liveStats = win.getVuiHocGameResult();
          }
        } catch (_e) {}

        const mergedSource = { ...(liveStats || {}), ...data };
        const totalCorrect = mergedSource.totalCorrect !== undefined ? Number(mergedSource.totalCorrect) : (mergedSource.correct !== undefined ? Number(mergedSource.correct) : undefined);
        const totalQuestions = mergedSource.totalQuestions !== undefined ? Number(mergedSource.totalQuestions) : (mergedSource.total !== undefined ? Number(mergedSource.total) : undefined);
        const maxQPoints = question.points || 30;

        let awardedPoints = 0;
        if (mergedSource.score !== undefined && typeof mergedSource.score === 'number' && !isNaN(mergedSource.score)) {
          awardedPoints = Math.max(0, Math.min(maxQPoints, Math.round(mergedSource.score)));
        } else if (mergedSource.points !== undefined && typeof mergedSource.points === 'number' && !isNaN(mergedSource.points)) {
          awardedPoints = Math.max(0, Math.min(maxQPoints, Math.round(mergedSource.points)));
        } else if (totalCorrect !== undefined && totalQuestions !== undefined && totalQuestions > 0) {
          awardedPoints = Math.round((totalCorrect / totalQuestions) * maxQPoints);
        } else if (mergedSource.isCorrect !== false) {
          awardedPoints = maxQPoints;
        }

        const isCorrect = mergedSource.isCorrect !== undefined
          ? Boolean(mergedSource.isCorrect)
          : (totalCorrect !== undefined && totalQuestions !== undefined ? totalCorrect === totalQuestions : totalCorrect !== undefined && totalCorrect > 0);

        const summary = mergedSource.summary || (totalCorrect !== undefined && totalQuestions !== undefined
          ? `Đúng ${totalCorrect}/${totalQuestions} câu (+${awardedPoints}đ)`
          : awardedPoints > 0 ? `Hoàn thành trò chơi (+${awardedPoints} điểm)` : 'Chưa hoàn thành');

        handleFinish(isCorrect, awardedPoints, summary, {
          totalCorrect,
          totalQuestions,
          score: awardedPoints,
          history: mergedSource.history,
          answersList: mergedSource.answersList,
          dragDetails: mergedSource.dragDetails,
          rawResult: mergedSource,
        });
      }

      // Handle runtime errors in game
      if (data.type === 'GAME_RUNTIME_ERROR' || data.type === 'GAME_EMPTY_DOM') {
        const msg = data.type === 'GAME_RUNTIME_ERROR' ? (data.message || 'Lỗi mã nguồn trò chơi') : 'Trò chơi chưa hiển thị nội dung';
        setRuntimeError(`Lỗi trò chơi: ${msg}`);
      }
    };

    window.addEventListener('message', handleGameMessage);
    return () => window.removeEventListener('message', handleGameMessage);
  }, [hasSubmitted, question.points]);

  const handleReloadIframe = () => {
    setRuntimeError(null);
    setUseSrcDocFallback(false);
    if (iframeRef.current) {
      const url = question.gameUrl || gameUrl;
      if (url) {
        iframeRef.current.src = url;
      } else {
        iframeRef.current.srcdoc = question.htmlContent || '';
      }
      sounds.playClick();
    }
  };

  const handleIframeError = () => {
    if (!useSrcDocFallback && question.htmlContent) {
      console.warn('Iframe failed loading src, falling back to bundled HTML');
      setUseSrcDocFallback(true);
    }
  };

  const handleIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        const isSpa = Boolean(doc.getElementById('root')) || (doc.title && doc.title.includes('Vui Học Cùng Cô'));
        const is404 = (doc.title && doc.title.includes('404')) || (doc.body && doc.body.innerText && doc.body.innerText.includes('404: Không tìm thấy'));
        if ((isSpa || is404) && question.htmlContent && !useSrcDocFallback) {
          console.warn('Iframe loaded main SPA or 404, falling back to bundled HTML');
          setUseSrcDocFallback(true);
        }
      }
    } catch (_e) {
      // Cross-origin sandboxed doc
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-2 py-1.5 flex flex-col justify-between h-[92vh] select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border-2 border-slate-100 shadow-sm shrink-0 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-cyan-700 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-xl">
            CÂU {questionIndex + 1} / {totalQuestions} · HTML5 GAME
          </span>
          {liveProgressText && (
            <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
              Đã xếp: <span className="text-cyan-600 font-mono font-black">{liveProgressText}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!hasSubmitted && (
            <button
              onClick={handleSubmitCurrentProgress}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
              title="Bấm khi bé đã chơi xong để gửi điểm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ĐÃ CHƠI XONG</span>
            </button>
          )}

          <button
            onClick={handleReloadIframe}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title="Tải lại trò chơi"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <span className="flex items-center gap-1.5 text-xs font-black text-cyan-700 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            <span>Không tính giờ</span>
          </span>
        </div>
      </div>

      {/* Main HTML Game Viewport */}
      <div className="flex-1 w-full relative bg-slate-900/5 rounded-3xl border-2 border-slate-200 overflow-hidden shadow-inner flex flex-col">
        {runtimeError && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-rose-800 text-xs font-bold flex items-center justify-between shrink-0">
            <span>⚠️ {runtimeError}</span>
            <button
              onClick={handleReloadIframe}
              className="px-2.5 py-1 bg-rose-200 hover:bg-rose-300 rounded-lg text-rose-900 text-xs font-black transition cursor-pointer"
            >
              Tải lại
            </button>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={effectiveUrl || undefined}
          srcDoc={!effectiveUrl ? (question.htmlContent || '') : undefined}
          onError={handleIframeError}
          onLoad={handleIframeLoad}
          title={question.title}
          sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
          allow="autoplay; fullscreen"
          className="w-full h-full flex-1 border-0 rounded-3xl bg-white"
        />

        {/* Lock overlay when submitted */}
        {hasSubmitted && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-xs text-center shadow-2xl border-4 border-emerald-400">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-2 animate-bounce" />
              <h3 className="text-xl font-black text-slate-900">
                BÉ ĐÃ HOÀN THÀNH!
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Kết quả trò chơi đã được gửi tới máy của cô! Bé hãy hướng mắt nhìn lên màn hình lớn nhé ⭐
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Completion Action Button for Child */}
      {!hasSubmitted && (
        <div className="shrink-0 pt-2 flex items-center justify-center">
          <button
            onClick={handleSubmitCurrentProgress}
            className="w-full max-w-sm py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 active:scale-95 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-100" />
            <span>BÉ ĐÃ XẾP XONG ⭐ NỘP KẾT QUẢ</span>
          </button>
        </div>
      )}
    </div>
  );
};
