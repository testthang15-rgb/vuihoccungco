import React, { useRef, useState, useEffect } from 'react';
import { Question, TeamAnswer } from '../../types/game';
import { sounds } from '../../utils/sound';
import { realtime } from '../../services/realtimeClient';
import {
  PenTool,
  Eraser,
  RotateCcw,
  Send,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  Sparkles,
  Type,
  Palette,
  Undo2,
  ImageIcon,
} from 'lucide-react';
import { speakVietnamese, stopSpeaking, isSpeechSupported, unlockSpeechAudio } from '../../utils/speechVoice';

interface PlayerOpenEndedQuestionProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  startTime: number | null;
  timeLimit: number;
  roomCode?: string;
  teamId?: string;
  existingAnswer?: TeamAnswer;
  onSubmitOpenEnded: (textAnswer: string, drawingDataUrl: string) => void;
}

const COLORS = [
  { name: 'Đen', value: '#1e293b' },
  { name: 'Đỏ', value: '#ef4444' },
  { name: 'Cam', value: '#f97316' },
  { name: 'Vàng', value: '#eab308' },
  { name: 'Xanh lá', value: '#22c55e' },
  { name: 'Xanh dương', value: '#3b82f6' },
  { name: 'Tím', value: '#a855f7' },
  { name: 'Hồng', value: '#ec4899' },
];

export const PlayerOpenEndedQuestion: React.FC<PlayerOpenEndedQuestionProps> = ({
  question,
  questionIndex,
  totalQuestions,
  startTime,
  timeLimit,
  roomCode,
  teamId,
  existingAnswer,
  onSubmitOpenEnded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [hasDrawnSomething, setHasDrawnSomething] = useState(false);
  const latestDrawingDataUrlRef = useRef<string>(existingAnswer?.openEnded?.drawingDataUrl || '');
  const lastSyncedDrawingRef = useRef<string>('');

  const [activeColor, setActiveColor] = useState('#1e293b');
  const [lineWidth, setLineWidth] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [textAnswer, setTextAnswer] = useState(existingAnswer?.openEnded?.textAnswer || '');
  const textAnswerRef = useRef(textAnswer);
  textAnswerRef.current = textAnswer;

  const [history, setHistory] = useState<ImageData[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isNoTimeLimit = Boolean(question.noTimeLimit || question.timeLimit === 0 || timeLimit === 0);
  const effectiveStart = startTime || realtime.getServerNow();
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (isNoTimeLimit) return 999;
    const now = realtime.getServerNow();
    const elapsed = Math.floor((now - effectiveStart) / 1000);
    return Math.max(0, timeLimit - elapsed);
  });

  // Open-ended questions remain active and editable until the teacher ends the question
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  const hasSubmittedRef = useRef(hasSubmitted);
  hasSubmittedRef.current = hasSubmitted;

  const bgTemplateUrl = question.openEndedBgImage;
  const bgImageObjRef = useRef<HTMLImageElement | null>(null);

  // Synchronously capture canvas into data URL and cache it in ref
  const captureCanvas = (): string => {
    // If student hasn't made any strokes, return empty string so it is properly recognized as "chưa vẽ"
    if (!hasDrawnRef.current) {
      latestDrawingDataUrlRef.current = '';
      return '';
    }

    const canvas = canvasRef.current;
    if (!canvas) return latestDrawingDataUrlRef.current || '';
    try {
      if (bgTemplateUrl && bgImageObjRef.current) {
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const octx = offscreen.getContext('2d');
        if (octx) {
          octx.fillStyle = '#ffffff';
          octx.fillRect(0, 0, offscreen.width, offscreen.height);

          const img = bgImageObjRef.current;
          if (img.width && img.height) {
            const dpr = window.devicePixelRatio || 1;
            const pad = 12 * dpr;
            const availW = Math.max(10, offscreen.width - pad * 2);
            const availH = Math.max(10, offscreen.height - pad * 2);
            const scale = Math.min(availW / img.width, availH / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const drawX = (offscreen.width - drawW) / 2;
            const drawY = (offscreen.height - drawH) / 2;
            octx.drawImage(img, drawX, drawY, drawW, drawH);
          }

          // Composite student's drawing on top
          octx.drawImage(canvas, 0, 0);
          const data = offscreen.toDataURL('image/png');
          if (data && data.length > 50) {
            latestDrawingDataUrlRef.current = data;
            return data;
          }
        }
      } else {
        const data = canvas.toDataURL('image/png');
        if (data && data.length > 50) {
          latestDrawingDataUrlRef.current = data;
          return data;
        }
      }
    } catch (err) {
      console.warn('[Canvas] toDataURL warning:', err);
    }
    return latestDrawingDataUrlRef.current || '';
  };

  // Auto-sync draft whenever kid draws or types so server has it authoritatively at any millisecond
  const syncDraftToServer = (explicitDataUrl?: string) => {
    if (hasSubmittedRef.current) return;
    const currentDrawing = explicitDataUrl !== undefined ? explicitDataUrl : captureCanvas();
    const currentText = textAnswerRef.current.trim();
    const effectiveRoom = (roomCode || realtime.getCurrentRoomCode() || (typeof window !== 'undefined' ? localStorage.getItem('vuihoc_player_room') : '') || '').trim().toUpperCase();
    const effectiveTeam = (teamId || realtime.getCurrentTeamId() || (typeof window !== 'undefined' ? localStorage.getItem('vuihoc_player_team_id') : '') || '').trim();

    if (effectiveRoom && effectiveTeam) {
      realtime.saveOpenEndedDraft(effectiveRoom, effectiveTeam, questionIndex, currentText, currentDrawing, Boolean(hasDrawnRef.current));
      lastSyncedDrawingRef.current = currentDrawing;
    }
  };

  // Immediate flush & submit helper (used ONLY when teacher clicks "Kết thúc câu" or on unmount)
  const flushAndSubmit = () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setHasSubmitted(true);
    const finalDrawing = captureCanvas();
    const finalText = textAnswerRef.current.trim();
    const effectiveRoom = (roomCode || realtime.getCurrentRoomCode() || (typeof window !== 'undefined' ? localStorage.getItem('vuihoc_player_room') : '') || '').trim().toUpperCase();
    const effectiveTeam = (teamId || realtime.getCurrentTeamId() || (typeof window !== 'undefined' ? localStorage.getItem('vuihoc_player_team_id') : '') || '').trim();

    if (effectiveRoom && effectiveTeam) {
      realtime.saveOpenEndedDraft(effectiveRoom, effectiveTeam, questionIndex, finalText, finalDrawing, Boolean(hasDrawnRef.current));
    }
    onSubmitOpenEnded(finalText, finalDrawing);
  };

  // Listen to authoritative session updates: if teacher clicked "Kết thúc câu", flush and submit immediately
  useEffect(() => {
    const unsub = realtime.on('session_updated', (data: any) => {
      const sess = data?.session;
      if (sess && sess.questionStatus !== 'active' && sess.questionStatus !== 'waiting') {
        if (!hasSubmittedRef.current) {
          flushAndSubmit();
        }
      }
    });
    return () => unsub();
  }, [roomCode, teamId, questionIndex, onSubmitOpenEnded]);

  // Unmount cleanup: in case session_updated was handled before unmount, or component unmounted
  useEffect(() => {
    return () => {
      if (!hasSubmittedRef.current) {
        flushAndSubmit();
      }
    };
  }, [onSubmitOpenEnded, roomCode, teamId, questionIndex]);

  // Periodic continuous draft syncing every 1.5 seconds while drawing / typing
  useEffect(() => {
    if (hasSubmitted) return;
    const interval = setInterval(() => {
      if (hasDrawnRef.current || textAnswerRef.current.trim()) {
        const currentData = captureCanvas();
        if (currentData !== lastSyncedDrawingRef.current || textAnswerRef.current !== textAnswer) {
          syncDraftToServer(currentData);
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [hasSubmitted, roomCode, teamId, questionIndex, textAnswer]);

  // Debounced draft sync when text answer changes (DO NOT auto-submit answer!)
  useEffect(() => {
    const t = setTimeout(() => {
      const data = captureCanvas();
      syncDraftToServer(data);
    }, 500);
    return () => clearTimeout(t);
  }, [textAnswer]);



  // Preload background template image for composite capture
  useEffect(() => {
    if (bgTemplateUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        bgImageObjRef.current = img;
      };
      img.src = bgTemplateUrl;
    } else {
      bgImageObjRef.current = null;
    }
  }, [bgTemplateUrl]);

  // Setup Canvas with dynamic ResizeObserver to guarantee full-height drawing on all screens
  const initOrResizeCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    // If dimensions already match, do not redraw
    if (canvas.width === targetW && canvas.height === targetH) {
      return;
    }

    // Save existing user drawing strokes if canvas already has content
    let prevDataUrl = '';
    if (canvas.width > 0 && canvas.height > 0 && hasDrawnRef.current) {
      try {
        prevDataUrl = canvas.toDataURL('image/png');
      } catch {}
    } else if (hasDrawnRef.current && latestDrawingDataUrlRef.current && latestDrawingDataUrlRef.current.length > 50 && !bgTemplateUrl) {
      prevDataUrl = latestDrawingDataUrlRef.current;
    }

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // If no background template image, fill clean white. If template exists, canvas is transparent overlay.
    if (!bgTemplateUrl) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
    }

    if (prevDataUrl && prevDataUrl.length > 50 && hasDrawnRef.current) {
      const draftImg = new Image();
      draftImg.onload = () => {
        ctx.drawImage(draftImg, 0, 0, rect.width, rect.height);
        setHasDrawnSomething(true);
        try {
          const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setHistory([snap]);
        } catch {}
      };
      draftImg.src = prevDataUrl;
    } else {
      try {
        const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([initial]);
      } catch {}
    }
  };

  useEffect(() => {
    initOrResizeCanvas();

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      initOrResizeCanvas();
    });
    ro.observe(container);

    const handleWindowResize = () => {
      initOrResizeCanvas();
    };
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [bgTemplateUrl]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory(prev => [...prev.slice(-15), snap]);
    } catch {}
  };

  const undo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    sounds.playClick();
    const nextHist = [...history];
    nextHist.pop(); // remove current
    const previous = nextHist[nextHist.length - 1];
    if (previous) {
      ctx.putImageData(previous, 0, 0);
      setHistory(nextHist);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    sounds.playClick();
    const rect = canvas.getBoundingClientRect();
    if (bgTemplateUrl) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
    saveState();
    setHasDrawnSomething(false);
    hasDrawnRef.current = false;
    latestDrawingDataUrlRef.current = '';
    syncDraftToServer('');
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && (e as any).changedTouches.length > 0) {
      clientX = (e as any).changedTouches[0].clientX;
      clientY = (e as any).changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isNoTimeLimit && timeLeft <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if ('cancelable' in e && (e as any).cancelable) {
      e.preventDefault();
    }

    isDrawingRef.current = true;
    const wasDrawn = hasDrawnRef.current;
    hasDrawnRef.current = true;
    if (!hasDrawnSomething) {
      setHasDrawnSomething(true);
    }
    if (!wasDrawn) {
      syncDraftToServer();
    }
    const { x, y } = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (isEraser) {
      ctx.lineWidth = 24;
      ctx.globalCompositeOperation = bgTemplateUrl ? 'destination-out' : 'source-over';
      ctx.strokeStyle = bgTemplateUrl ? 'rgba(0,0,0,1)' : '#ffffff';
    } else {
      ctx.lineWidth = lineWidth;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = activeColor;
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || (!isNoTimeLimit && timeLeft <= 0)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if ('cancelable' in e && (e as any).cancelable) {
      e.preventDefault();
    }

    hasDrawnRef.current = true;
    if (!hasDrawnSomething) setHasDrawnSomething(true);

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    saveState();
    const data = captureCanvas();
    syncDraftToServer(data);
    // Lưu ý: Không tự động nộp bài khi vẽ xong nét vẽ. Bài tự luận chỉ kết thúc khi cô bấm Kết thúc câu!
  };

  // Automatically read question aloud on student device if readQuestionAudio is enabled
  useEffect(() => {
    if (question && question.readQuestionAudio !== false && !existingAnswer) {
      unlockSpeechAudio();
      const autoTimer = setTimeout(() => {
        if (!hasSubmittedRef.current) {
          setIsSpeaking(true);
          speakVietnamese(question.title, {
            onEnd: () => setIsSpeaking(false),
          });
        }
      }, 400);
      return () => {
        clearTimeout(autoTimer);
        stopSpeaking();
        setIsSpeaking(false);
      };
    }
    return () => {
      stopSpeaking();
      setIsSpeaking(false);
    };
  }, [questionIndex, question.id, existingAnswer]);

  const handleToggleVoice = () => {
    sounds.playClick();
    unlockSpeechAudio();
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakVietnamese(question.title, {
        onEnd: () => setIsSpeaking(false),
      });
    }
  };

  const handleAutoSubmit = () => {
    if (hasSubmittedRef.current) return;
    submitAnswer();
  };

  const submitAnswer = () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setHasSubmitted(true);
    stopSpeaking();
    setIsSpeaking(false);
    sounds.playFanfare();

    const dataUrl = captureCanvas();
    const text = textAnswerRef.current.trim();
    if (roomCode && teamId) {
      realtime.saveOpenEndedDraft(roomCode, teamId, questionIndex, text, dataUrl);
    }
    onSubmitOpenEnded(text, dataUrl);
  };

  return (
    <div className="w-full h-full max-h-full flex-1 flex flex-col md:flex-row gap-2.5 sm:gap-3 p-2 sm:p-3 md:p-3.5 min-h-0 overflow-hidden select-none">
      {/* LEFT COLUMN (Laptop & Tablet): Question info, prompt, text answer input, and auto-sync status */}
      <div className="w-full md:w-[350px] lg:w-[400px] xl:w-[440px] shrink-0 flex flex-col gap-2 min-h-0 h-auto md:h-full overflow-hidden">
        {/* Top Header info */}
        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-2xl border-2 border-slate-100 shadow-2xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl uppercase">
              CÂU {questionIndex + 1}/{totalQuestions} · TỰ LUẬN
            </span>
            {isSpeechSupported() && question.readQuestionAudio !== false && (
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-1 rounded-xl border transition cursor-pointer ${
                  isSpeaking
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                }`}
                title="Nghe cô đọc câu hỏi"
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>Không tính giờ</span>
            </span>
          </div>
        </div>

        {/* Question Prompt Card (Expands cleanly to fit image & title) */}
        <div className="flex-1 min-h-[90px] md:min-h-0 flex flex-col bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-pink-500/10 p-3 sm:p-3.5 rounded-2xl border-2 border-purple-200 overflow-hidden shadow-2xs">
          <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 leading-snug shrink-0">
            {question.title}
          </h3>
          {question.imageUrl && (
            <div className="flex-1 min-h-0 flex items-center justify-center p-1 mt-1.5 overflow-hidden">
              <img
                src={question.imageUrl}
                alt="Hình minh họa câu hỏi"
                className="max-h-full max-w-full rounded-xl object-contain border border-purple-200 bg-white shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Text Input Row: Gõ thêm đáp án / lời giải */}
        <div className="shrink-0 p-2 sm:p-2.5 rounded-2xl bg-white border-2 border-slate-200 shadow-2xs flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase text-slate-600">
            <Type className="w-3.5 h-3.5 text-purple-600" />
            <span>Gõ đáp án hoặc ghi chú (nếu có):</span>
          </div>
          <input
            type="text"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Bé có thể gõ câu trả lời vào đây..."
            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-400 focus:bg-white transition"
          />
        </div>

        {/* Live Auto-Recording Status Bar */}
        <div className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border border-purple-200 text-center shadow-2xs flex items-center justify-center gap-1.5 text-[11px] font-black text-purple-900">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 animate-pulse" />
          <span className="truncate">Hệ thống tự động lưu nét vẽ & chữ viết theo thời gian thực</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Drawing Canvas & Tools (Fills 100% of remaining screen) */}
      <div className="flex-1 min-h-0 h-full flex flex-col bg-white rounded-2xl border-2 border-slate-200 shadow-md p-2.5 sm:p-3 overflow-hidden">
        {/* Drawing Toolbar */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-purple-900 flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">BẢNG VẼ & VIẾT CỦA BÉ</span>
              <span className="sm:hidden">BẢNG VẼ</span>
            </span>
            {(bgTemplateUrl || bgImageObjRef.current) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                <ImageIcon className="w-3 h-3" />
                <span>Có hình mẫu</span>
              </span>
            )}
          </div>

          {(isNoTimeLimit || timeLeft > 0) && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Color picker */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setActiveColor(c.value);
                      setIsEraser(false);
                    }}
                    style={{ backgroundColor: c.value }}
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition active:scale-90 cursor-pointer ${
                      activeColor === c.value && !isEraser
                        ? 'border-white ring-2 ring-indigo-500 scale-110'
                        : 'border-transparent'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>

              {/* Line width options */}
              <div className="hidden lg:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                {[
                  { label: 'Mảnh', val: 4, dot: 'w-1.5 h-1.5' },
                  { label: 'Vừa', val: 8, dot: 'w-2.5 h-2.5' },
                  { label: 'Đậm', val: 14, dot: 'w-3.5 h-3.5' },
                ].map(sz => (
                  <button
                    key={sz.val}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setLineWidth(sz.val);
                      setIsEraser(false);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition cursor-pointer ${
                      lineWidth === sz.val && !isEraser
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title={`Nét bút ${sz.label}`}
                  >
                    <span className={`rounded-full bg-current ${sz.dot}`} />
                    <span>{sz.label}</span>
                  </button>
                ))}
              </div>

              {/* Eraser */}
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setIsEraser(!isEraser);
                }}
                className={`p-1.5 rounded-xl border text-xs font-black flex items-center gap-1 transition cursor-pointer ${
                  isEraser
                    ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-inner'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                }`}
                title="Tẩy nét vẽ"
              >
                <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Tẩy</span>
              </button>

              {/* Undo */}
              <button
                type="button"
                onClick={undo}
                disabled={history.length <= 1}
                className="p-1.5 rounded-xl border bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Hoàn tác nét vẽ"
              >
                <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={clearCanvas}
                className="p-1.5 rounded-xl border bg-slate-50 hover:bg-slate-100 border-slate-200 text-rose-600 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                title="Xóa vẽ lại từ đầu"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Vẽ lại</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawing Canvas Area (Takes 100% of remaining height) */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 w-full rounded-xl border-2 border-dashed border-purple-300 relative bg-white overflow-hidden shadow-inner touch-none select-none mt-2"
          style={{ touchAction: 'none' }}
        >
          {bgTemplateUrl && (
            <img
              src={bgTemplateUrl}
              alt="Hình mẫu"
              loading="eager"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none p-2 select-none"
            />
          )}

          <canvas
            ref={canvasRef}
            style={{ touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none block z-10"
          />
          {!hasDrawnSomething && !bgTemplateUrl && !hasSubmitted && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300 p-4 text-center z-10">
              <Sparkles className="w-8 h-8 mb-1 animate-pulse" />
              <p className="font-extrabold text-xs sm:text-sm md:text-base">
                Bé dùng ngón tay hoặc chuột để viết chữ, số hoặc vẽ vào đây nhé!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
