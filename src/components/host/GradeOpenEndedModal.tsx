import React, { useState, useRef, useEffect } from 'react';
import { SessionState, TeamAnswer, Question } from '../../types/game';
import { sounds } from '../../utils/sound';
import { realtime } from '../../services/realtimeClient';
import {
  X,
  CheckCircle2,
  AlertCircle,
  PenTool,
  Save,
  MessageSquare,
  Award,
  Maximize2,
  Minimize2,
  Eraser,
  Undo2,
  RotateCcw,
  Sparkles,
  Type,
  Check,
  Star,
  Heart
} from 'lucide-react';

interface GradeOpenEndedModalProps {
  session: SessionState;
  questionIndex: number;
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
}

const TEACHER_COLORS = [
  { name: 'Đỏ chấm điểm', value: '#ef4444' },
  { name: 'Xanh lá', value: '#10b981' },
  { name: 'Vàng sao', value: '#f59e0b' },
  { name: 'Xanh dương', value: '#3b82f6' },
  { name: 'Tím', value: '#8b5cf6' },
];

export const GradeOpenEndedModal: React.FC<GradeOpenEndedModalProps> = ({
  session,
  questionIndex,
  teamId,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const team = session.teams[teamId];
  const isTeamB = session.isDualMode && (team?.assignedSet === 'B' || session.teamAssignments?.[teamId] === 'B');
  const question: Question | undefined = isTeamB
    ? (session.gameB?.questions[questionIndex] || session.game.questions[questionIndex])
    : session.game.questions[questionIndex];
  const answer: TeamAnswer | undefined = session.answers[questionIndex]?.[teamId];
  const openEnded = answer?.openEnded;

  const maxPoints = question?.points || 10;
  const isPending = !openEnded?.teacherGrade || openEnded?.teacherGrade === 'pending';
  const currentPoints = isPending ? maxPoints : (answer?.pointsAwarded !== undefined ? answer.pointsAwarded : maxPoints);
  const currentFeedback = isPending ? '' : (openEnded?.teacherFeedback || '');
  const currentIsCorrect = isPending ? true : Boolean(answer ? answer.isCorrect : true);

  const [points, setPoints] = useState<number>(currentPoints);
  const [isCorrect, setIsCorrect] = useState<boolean>(currentIsCorrect);
  const [feedback, setFeedback] = useState<string>(currentFeedback);
  const [isSaving, setIsSaving] = useState(false);
  const [zoomImage, setZoomImage] = useState(false);

  // Direct Teacher Drawing & Annotation Studio
  const [isEditingCanvas, setIsEditingCanvas] = useState(false);
  const [annotatedImage, setAnnotatedImage] = useState<string>(
    openEnded?.annotatedDrawingDataUrl || openEnded?.drawingDataUrl || ''
  );
  const [activeColor, setActiveColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(5);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [textNoteInput, setTextNoteInput] = useState('');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Close zoom modal with ESC key
  useEffect(() => {
    if (!zoomImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomImage(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomImage]);

  // Initialize Canvas when entering edit mode
  useEffect(() => {
    if (!isEditingCanvas) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseSource = annotatedImage || openEnded?.drawingDataUrl || '';

    if (baseSource) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Match canvas dimensions to image or standard 640x400
        canvas.width = 640;
        canvas.height = 400;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Save initial state
        const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([initial]);
      };
      img.src = baseSource;
    } else {
      canvas.width = 640;
      canvas.height = 400;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initial]);
    }
  }, [isEditingCanvas]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), current]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    sounds.playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updated = [...history];
    updated.pop(); // Remove current
    const previous = updated[updated.length - 1];
    ctx.putImageData(previous, 0, 0);
    setHistory(updated);
  };

  const handleResetOriginal = () => {
    sounds.playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const originalSrc = openEnded?.drawingDataUrl || '';
    if (originalSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const init = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([init]);
      };
      img.src = originalSrc;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const init = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([init]);
    }
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : activeColor;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveCanvasState();
  };

  // Add text directly onto drawing
  const handleAddTextToCanvas = () => {
    if (!textNoteInput.trim()) return;
    sounds.playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const text = textNoteInput.trim();
    ctx.font = 'bold 24px Arial, sans-serif';

    // Position at top-left or bottom
    const x = 30;
    const y = 60;

    // Draw background pill for text readability
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 2;
    ctx.fillRect(x - 10, y - 28, textWidth + 20, 38);
    ctx.strokeRect(x - 10, y - 28, textWidth + 20, 38);

    ctx.fillStyle = activeColor;
    ctx.fillText(text, x, y);

    saveCanvasState();
    setTextNoteInput('');
  };

  // Add teacher quick stamps (10đ, checkmark, star)
  const handleAddStamp = (stampType: '10p' | 'check' | 'star' | 'heart') => {
    sounds.playCorrect();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = canvas.width - 80;
    const y = 80;

    if (stampType === '10p') {
      // 10đ red circle stamp
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#fee2e2';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 30px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('10đ', x, y);
    } else if (stampType === 'check') {
      // Green checkmark
      ctx.beginPath();
      ctx.arc(x, y, 36, 0, Math.PI * 2);
      ctx.fillStyle = '#dcfce7';
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#047857';
      ctx.font = 'bold 38px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', x, y + 2);
    } else if (stampType === 'star') {
      // Gold Star
      ctx.font = '50px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', x, y);
    } else if (stampType === 'heart') {
      // Heart
      ctx.font = '50px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❤️', x, y);
    }

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    saveCanvasState();
  };

  const handleApplyCanvasEdits = () => {
    sounds.playFanfare();
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setAnnotatedImage(dataUrl);
    }
    setIsEditingCanvas(false);
  };

  // Verdict buttons: only "Đúng" and "Chưa đúng" (Bỏ "Đúng 1 phần" theo yêu cầu)
  // Tự động cập nhật lời nhận xét & sửa bài tương ứng khi đổi giữa Đúng và Chưa đúng
  const handleQuickGrade = (type: 'correct' | 'wrong') => {
    sounds.playClick();
    if (type === 'correct') {
      setIsCorrect(true);
      setPoints(maxPoints);
      setFeedback('Bé làm bài rất tốt và chính xác! ⭐');
    } else {
      setIsCorrect(false);
      setPoints(0);
      setFeedback('Chưa chính xác, bé xem lại hướng dẫn của cô nhé! ❤️');
    }
  };

  const handleSave = async () => {
    sounds.playFanfare();
    setIsSaving(true);

    const finalAnnotated = annotatedImage || openEnded?.drawingDataUrl || '';

    // Optimistic local update
    if (session.answers[questionIndex]?.[teamId]) {
      const a = session.answers[questionIndex][teamId];
      const oldPts = a.pointsAwarded || 0;
      a.pointsAwarded = points;
      a.isCorrect = isCorrect;
      if (!a.openEnded) a.openEnded = {};
      a.openEnded.teacherPoints = points;
      a.openEnded.teacherGrade = isCorrect ? 'correct' : 'wrong';
      a.openEnded.teacherFeedback = feedback;
      if (finalAnnotated) {
        a.openEnded.annotatedDrawingDataUrl = finalAnnotated;
      }
      a.openEnded.gradedAt = Date.now();
      if (session.teams[teamId]) {
        session.teams[teamId].score = Math.max(0, (session.teams[teamId].score || 0) + (points - oldPts));
      }
    }

    try {
      // Send via realtime WebSocket
      realtime.gradeOpenEndedAnswer(
        session.roomCode,
        questionIndex,
        teamId,
        points,
        isCorrect,
        feedback,
        finalAnnotated
      );

      // Also trigger HTTP POST for guaranteed redundancy
      await fetch(`/api/session/${encodeURIComponent(session.roomCode)}/grade-open-ended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIndex,
          teamId,
          points,
          isCorrect,
          feedback,
          annotatedDrawingDataUrl: finalAnnotated,
        }),
      }).catch(() => {});
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl border-2 border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl">
              ✏️
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-200 bg-white/10 px-2 py-0.5 rounded-lg border border-white/20">
                CHẤM ĐIỂM & SỬA LỖI TỰ LUẬN
              </span>
              <h3 className="text-base sm:text-lg font-black mt-0.5">
                Bài Làm Của {team?.teamName || 'Học sinh'} (Câu {questionIndex + 1})
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {/* Question title & prompt */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-black text-slate-400 uppercase block mb-1">
              ĐỀ BÀI CÂU HỎI:
            </span>
            <p className="font-extrabold text-sm sm:text-base text-slate-800">
              {question?.title}
            </p>

            {/* Model Answer (Đáp án mẫu của cô nếu có) */}
            {(question?.modelAnswer || question?.modelAnswerImage) && (
              <div className="mt-3 pt-3 border-t border-emerald-100 flex flex-col sm:flex-row items-start gap-3 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                {question.modelAnswerImage && (
                  <img
                    src={question.modelAnswerImage}
                    alt="Đáp án mẫu của cô"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg bg-white border border-emerald-300 p-1 shadow-2xs shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <span>🎯</span>
                    <span>ĐÁP ÁN MẪU CỦA CÔ ĐỂ ĐỐI CHIẾU:</span>
                  </span>
                  {question.modelAnswer && (
                    <p className="text-xs sm:text-sm font-extrabold text-emerald-950 mt-1 leading-relaxed">
                      "{question.modelAnswer}"
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Child's submitted work & Teacher Correction Area (Hình 1) */}
          <div className="bg-white p-4 rounded-2xl border-2 border-purple-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-purple-800 uppercase flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-purple-600" />
                <span>BÀI LÀM TRẺ ĐÃ NỘP:</span>
              </span>

              {/* Action buttons on child's work: Chỉnh sửa trực tiếp & Phóng to */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setIsEditingCanvas(!isEditingCanvas);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs ${
                    isEditingCanvas
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                  title="Cô có thể vẽ, tẩy xóa và ghi nhận xét trực tiếp lên bài làm của bé"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{isEditingCanvas ? 'Đóng chế độ sửa' : '✏️ Chỉnh sửa bài của bé'}</span>
                </button>

                {!isEditingCanvas && (annotatedImage || openEnded?.drawingDataUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setZoomImage(true);
                    }}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
                    title="Bấm để mở phóng to toàn màn hình dạng popup"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Xem phóng to</span>
                  </button>
                )}
              </div>
            </div>

            {/* DIRECT DRAWING & EDITING STUDIO FOR TEACHER */}
            {isEditingCanvas ? (
              <div className="bg-purple-50/70 p-3.5 rounded-2xl border-2 border-purple-300 space-y-3 animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-purple-200 flex-wrap gap-2">
                  <span className="text-xs font-black text-purple-900 uppercase flex items-center gap-1">
                    <span>🎨 KHÔNG GIAN CÔ SỬA BÀI & GHI CHÚ TRỰC TIẾP</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Nét vẽ & chữ viết của cô sẽ hiển thị trên thiết bị của bé!
                  </span>
                </div>

                {/* Toolbar: Color picker, stroke width, eraser, stickers */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black text-slate-500">Màu bút:</span>
                    <div className="flex items-center gap-1.5">
                      {TEACHER_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => {
                            setActiveColor(c.value);
                            setActiveTool('pen');
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                            activeColor === c.value && activeTool === 'pen'
                              ? 'scale-125 border-slate-900 shadow-md ring-2 ring-purple-300'
                              : 'border-white'
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>

                    <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

                    {/* Stroke width */}
                    <div className="flex items-center gap-1">
                      {[3, 6, 10].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setLineWidth(sz)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                            lineWidth === sz
                              ? 'bg-purple-600 text-white border-purple-700'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {sz === 3 ? 'Nét nhỏ' : sz === 6 ? 'Vừa' : 'Đậm'}
                        </button>
                      ))}
                    </div>

                    <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

                    {/* Eraser */}
                    <button
                      type="button"
                      onClick={() => setActiveTool(activeTool === 'eraser' ? 'pen' : 'eraser')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                        activeTool === 'eraser'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Cục tẩy xóa nét cô vừa vẽ"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Tẩy</span>
                    </button>
                  </div>

                  {/* Undo & Reset actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={history.length <= 1}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
                      title="Hoàn tác nét vừa vẽ"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Hoàn tác</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetOriginal}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-bold flex items-center gap-1 transition"
                      title="Khôi phục lại hình vẽ gốc của trẻ"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Vẽ lại</span>
                    </button>
                  </div>
                </div>

                {/* Quick Teacher Stamps & Text Insertion */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-purple-200">
                  {/* Insert Text directly into canvas */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-[240px]">
                    <Type className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <input
                      type="text"
                      value={textNoteInput}
                      onChange={(e) => setTextNoteInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTextToCanvas()}
                      placeholder="Ghi nhận xét trực tiếp lên bài (VD: Chữ M viết đẹp!)..."
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-400 font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleAddTextToCanvas}
                      disabled={!textNoteInput.trim()}
                      className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-black rounded-lg transition"
                    >
                      + Chèn chữ
                    </button>
                  </div>

                  {/* Stamp stamps */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-slate-400">Dấu khen:</span>
                    <button
                      type="button"
                      onClick={() => handleAddStamp('10p')}
                      className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-black"
                      title="Đóng dấu 10 điểm đỏ"
                    >
                      10đ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddStamp('check')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 text-xs font-black"
                      title="Đóng dấu tick đúng xanh"
                    >
                      ✓ Đúng
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddStamp('star')}
                      className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 text-xs font-black"
                      title="Tặng ngôi sao khen"
                    >
                      ⭐
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddStamp('heart')}
                      className="px-2 py-0.5 rounded-lg bg-pink-50 hover:bg-pink-100 border border-pink-300 text-pink-700 text-xs font-black"
                      title="Tặng trái tim"
                    >
                      ❤️
                    </button>
                  </div>
                </div>

                {/* Interactive Drawing Canvas */}
                <div className="flex justify-center bg-slate-100 p-2 rounded-xl border border-purple-200 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="max-w-full h-auto bg-white rounded-lg shadow-sm cursor-crosshair touch-none border border-slate-300"
                    style={{ maxHeight: '280px', width: '640px' }}
                  />
                </div>

                {/* Confirm Canvas Edits Button */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingCanvas(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
                  >
                    Hủy sửa
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCanvasEdits}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Áp dụng hình sửa</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Normal Preview (Annotated or Original) */
              annotatedImage || openEnded?.drawingDataUrl ? (
                <div
                  onClick={() => {
                    sounds.playClick();
                    setZoomImage(true);
                  }}
                  className="relative group rounded-xl border-2 border-dashed border-purple-300 p-2.5 bg-slate-50 hover:bg-purple-50/40 hover:border-purple-500 flex flex-col items-center cursor-zoom-in transition shadow-2xs"
                  title="Bấm trực tiếp vào hình để phóng to xem rõ nét toàn màn hình"
                >
                  <img
                    src={annotatedImage || openEnded?.drawingDataUrl}
                    alt="Hình vẽ của bé"
                    className="max-h-52 rounded-lg object-contain bg-white shadow-2xs group-hover:scale-[1.01] transition"
                  />
                  {annotatedImage && annotatedImage !== openEnded?.drawingDataUrl && (
                    <span className="mt-2 text-[11px] font-black text-purple-700 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span>Đã có nét sửa & ghi chú của cô giáo</span>
                    </span>
                  )}

                  {/* Hover hint badge */}
                  <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center pointer-events-none">
                    <span className="bg-purple-800/90 text-white text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Bấm vào hình để phóng to toàn màn hình</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-400 text-center">
                  (Bé không vẽ lên bảng vẽ)
                </div>
              )
            )}

            {/* Written text answer by child */}
            {openEnded?.textAnswer ? (
              <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-200">
                <span className="text-[11px] font-black uppercase text-purple-700 block mb-0.5">
                  Chữ viết / Nội dung bé đã gõ:
                </span>
                <p className="text-sm font-extrabold text-slate-800 break-words">
                  "{openEnded.textAnswer}"
                </p>
              </div>
            ) : null}
          </div>

          {/* Teacher Grading Controls (Hình 2: Bỏ đúng 1 phần) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-4">
            <span className="text-xs font-black text-indigo-900 uppercase flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>PHẦN CHẤM ĐIỂM & SỬA LỖI CỦA CÔ:</span>
            </span>

            {/* 2 Verdict Buttons: Đúng vs Chưa đúng (Hình 2: Bỏ phần Đúng 1 phần) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickGrade('correct')}
                className={`py-3 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 border-2 transition cursor-pointer active:scale-95 ${
                  isCorrect && points > 0
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>ĐÚNG (+{maxPoints}đ)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickGrade('wrong')}
                className={`py-3 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 border-2 transition cursor-pointer active:scale-95 ${
                  !isCorrect || points === 0
                    ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
                <span>CHƯA ĐÚNG (0đ)</span>
              </button>
            </div>

            {/* Point Slider / Input */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black text-slate-700 block">
                  Số điểm trao cho đội:
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  (Tối đa: {maxPoints} điểm)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={maxPoints}
                  value={points}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(maxPoints, Number(e.target.value)));
                    setPoints(val);
                    setIsCorrect(val > 0);
                  }}
                  className="w-18 px-3 py-1.5 text-center font-mono font-black text-lg bg-white border-2 border-indigo-300 rounded-xl text-indigo-700"
                />
                <span className="font-extrabold text-sm text-slate-600">điểm</span>
              </div>
            </div>

            {/* Feedback & Correction Textarea */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Lời cô sửa bài & nhận xét (gửi về máy của bé):</span>
                </span>
                <span className="text-[10px] font-bold text-indigo-500">Tự cập nhật khi bấm Đúng/Chưa đúng</span>
              </label>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ví dụ: Bé viết chữ O rất tròn và đẹp! Chú ý nét móc chữ A cần cong nhẹ hơn chút nhé..."
                className="w-full p-3 rounded-2xl bg-slate-50 border-2 border-slate-200 font-bold text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
              />

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <span className="text-[11px] font-black text-slate-400">Chọn nhanh nhận xét:</span>
                {(isCorrect ? [
                  'Bé làm bài rất tốt và chính xác! ⭐',
                  'Hình vẽ rất sáng tạo và đẹp mắt! 🎨',
                  'Chữ viết nắn nót, chuẩn xác! 👏',
                  'Bé rất thông minh và chăm chỉ! 🌟',
                ] : [
                  'Chưa chính xác, bé xem lại hướng dẫn của cô nhé! ❤️',
                  'Bé cần chú ý nét vẽ cẩn thận hơn chút nhé! ✏️',
                  'Lần sau chú ý yêu cầu đề bài hơn nha bé yêu! 🌸',
                  'Cố gắng lên nào bé yêu! 💪',
                ]).map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setFeedback(sug);
                    }}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition cursor-pointer active:scale-95 ${
                      feedback === sug
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU CHẤM ĐIỂM & SỬA BÀI'}</span>
          </button>
        </div>
      </div>

      {/* POPUP PHÓNG TO HÌNH ĐÁP ÁN (Bấm ra ngoài để thoát chế độ phóng to) */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setZoomImage(false)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col p-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-black text-slate-800 uppercase">
                  Hình vẽ bài làm của {team?.teamName || 'Bé'} (Phóng to)
                </span>
                {annotatedImage && annotatedImage !== openEnded?.drawingDataUrl && (
                  <span className="text-[11px] font-black text-purple-700 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded-full">
                    Đã có nét sửa của cô
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setZoomImage(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 transition flex items-center gap-1.5 text-xs font-black cursor-pointer active:scale-95"
                title="Bấm để đóng phóng to"
              >
                <X className="w-4 h-4" />
                <span>Đóng (bấm ra ngoài để thoát)</span>
              </button>
            </div>

            {/* Image viewer */}
            <div className="overflow-auto max-h-[75vh] flex items-center justify-center bg-slate-100 rounded-xl p-3">
              <img
                src={annotatedImage || openEnded?.drawingDataUrl}
                alt="Hình vẽ phóng to"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-sm bg-white"
              />
            </div>

            {/* Hint */}
            <div className="mt-2 text-center text-xs font-bold text-slate-400">
              💡 Bấm vào khoảng trống bên ngoài hình hoặc bấm nút Đóng để thoát chế độ phóng to
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
