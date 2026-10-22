import React, { useState, useRef, useEffect } from 'react';
import { Question } from '../../types/game';
import { GameEngine } from '../../services/gameEngine';
import {
  X,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Clock,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  PenTool,
  Type,
} from 'lucide-react';
import { PlayerWordDragQuestion } from '../player/PlayerWordDragQuestion';
import { sounds } from '../../utils/sound';
import { speakQuestionWithOptions, stopSpeaking, subscribeSpeakingState, unlockSpeechAudio } from '../../utils/speechVoice';

const THEME_CLASSES: Record<string, string> = {
  nature: 'bg-gradient-to-b from-emerald-100 via-teal-50 to-green-100 text-emerald-950',
  ocean: 'bg-gradient-to-b from-sky-200 via-cyan-100 to-blue-200 text-sky-950',
  space: 'bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 text-white',
  classroom: 'bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-100 text-amber-950',
  pastel: 'bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 text-purple-950',
  none: 'bg-slate-100 text-slate-800',
};

interface PreviewModalProps {
  isOpen: boolean;
  question: Question;
  theme?: string;
  customBgImage?: string | null;
  allQuestions?: Question[];
  currentQuestionIndex?: number;
  onSelectQuestionIndex?: (idx: number) => void;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  question,
  theme = 'pastel',
  customBgImage,
  allQuestions,
  currentQuestionIndex = 0,
  onSelectQuestionIndex,
  onClose,
}) => {
  // Local placement state: itemId -> targetId (for drag & drop)
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragCurrentPos, setDragCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [shakeItemId, setShakeItemId] = useState<string | null>(null);
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ correct: number; total: number; points: number } | null>(null);

  // Local selection state (for multiple choice quiz preview)
  const [chosenOptionIds, setChosenOptionIds] = useState<string[]>([]);
  const [isQuizAnswered, setIsQuizAnswered] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);

  const CANVAS_WIDTH = 1280;
  const CANVAS_HEIGHT = 720;
  const config = question?.canvasConfig;
  const isDragDrop = question?.type === 'drag_drop' && Boolean(config && config.elements && config.elements.length > 0);

  useEffect(() => {
    const unsub = subscribeSpeakingState((sp) => setIsSpeaking(sp));
    return () => {
      unsub();
      stopSpeaking();
    };
  }, []);

  // Reset local state whenever question changes
  useEffect(() => {
    setPlacements({});
    setCompleted(false);
    setScoreResult(null);
    setChosenOptionIds([]);
    setIsQuizAnswered(false);
    stopSpeaking();
  }, [question?.id]);

  // Scale to fit phone/modal window for canvas
  useEffect(() => {
    if (!containerRef.current || !isDragDrop) return;

    const handleResize = () => {
      if (containerRef.current) {
        const parentW = containerRef.current.clientWidth - 24;
        const parentH = containerRef.current.clientHeight - 24;
        const sX = parentW / CANVAS_WIDTH;
        const sY = parentH / CANVAS_HEIGHT;
        setScale(Math.max(0.18, Math.min(1.0, Math.min(sX, sY))));
      }
    };

    handleResize();
    const ro = new ResizeObserver(() => {
      handleResize();
    });
    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [isOpen, question, isDragDrop]);

  if (!isOpen || !question) return null;

  const handlePointerDown = (e: React.PointerEvent, elemId: string) => {
    e.stopPropagation();
    sounds.playClick();

    const elem = config?.elements.find(el => el.id === elemId);
    if (!elem || elem.isLocked || elem.cardRole === 'static' || elem.isDraggable === false) return;

    setActiveDragId(elemId);
    setDragOffset({
      x: elem.width / 2,
      y: elem.height / 2,
    });
    setDragCurrentPos({ x: elem.x, y: elem.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDragId || !canvasWrapperRef.current) return;
    const rect = canvasWrapperRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale - dragOffset.x;
    const y = (e.clientY - rect.top) / scale - dragOffset.y;

    setDragCurrentPos({ x, y });
  };

  const handlePointerUp = () => {
    if (!activeDragId || !dragCurrentPos || !config) {
      setActiveDragId(null);
      setDragCurrentPos(null);
      return;
    }

    const draggedItem = config.elements.find(e => e.id === activeDragId);
    if (!draggedItem) return;

    // Detect if dropped inside any Drop Zone
    const dropZones = config.elements.filter(e => e.isDropZone || e.type === 'drop_zone');
    let matchedZoneId: string | null = null;

    const itemCenterX = dragCurrentPos.x + draggedItem.width / 2;
    const itemCenterY = dragCurrentPos.y + draggedItem.height / 2;

    for (const zone of dropZones) {
      if (
        itemCenterX >= zone.x &&
        itemCenterX <= zone.x + zone.width &&
        itemCenterY >= zone.y &&
        itemCenterY <= zone.y + zone.height
      ) {
        matchedZoneId = zone.id;
        break;
      }
    }

    if (matchedZoneId) {
      const targetZone = config.elements.find(e => e.id === matchedZoneId);
      const itemsInZone = Object.entries(placements).filter(
        ([id, zId]) => zId === matchedZoneId && id !== activeDragId
      );
      const maxAllowed = targetZone?.maxItems !== undefined && targetZone?.maxItems !== null ? Number(targetZone.maxItems) : 0;
      if (maxAllowed > 0 && itemsInZone.length >= maxAllowed) {
        // Drop zone is full! Reject placement
        sounds.playWrong();
        setShakeItemId(activeDragId);
        setTimeout(() => setShakeItemId(null), 400);
        const zoneName = targetZone?.text || (targetZone?.acceptsCategory ? `Ô ${targetZone.acceptsCategory}` : 'Vùng chứa');
        setCapacityWarning(`⚠️ ${zoneName} chỉ chứa tối đa ${maxAllowed} thẻ! Bạn hãy kéo bớt thẻ cũ ra ngoài trước nhé.`);
        setTimeout(() => setCapacityWarning(null), 3500);
        setActiveDragId(null);
        setDragCurrentPos(null);
        return;
      }

      sounds.playCorrect();
      const nextPlacements = {
        ...placements,
        [activeDragId]: matchedZoneId,
      };
      setPlacements(nextPlacements);

      // Check if all draggable items are placed
      const allDraggables = config.elements.filter(e => e.isDraggable && !e.isLocked && e.cardRole !== 'static');
      if (Object.keys(nextPlacements).length >= allDraggables.length && allDraggables.length > 0) {
        const evalRes = GameEngine.evaluateDragDrop(question, nextPlacements, false, 5000);
        setCompleted(true);
        setScoreResult({
          correct: evalRes.totalCorrect,
          total: evalRes.totalRequired,
          points: evalRes.pointsAwarded,
        });
        sounds.playFanfare();
      }
    } else {
      // Released outside any drop zone! If previously placed, pull out of zone
      if (placements[activeDragId]) {
        sounds.playClick();
        const nextPlacements = { ...placements };
        delete nextPlacements[activeDragId];
        setPlacements(nextPlacements);
      } else {
        // Invalid drop: snap back with slight shake
        sounds.playWrong();
        setShakeItemId(activeDragId);
        setTimeout(() => setShakeItemId(null), 400);
      }
    }

    setActiveDragId(null);
    setDragCurrentPos(null);
  };

  const handleReset = () => {
    sounds.playClick();
    setPlacements({});
    setCompleted(false);
    setScoreResult(null);
    setChosenOptionIds([]);
    setIsQuizAnswered(false);
    stopSpeaking();
  };

  const handleToggleVoice = () => {
    sounds.playClick();
    unlockSpeechAudio();
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakQuestionWithOptions(question.title || '', question.options || []);
    }
  };

  // Choose option in Quiz Preview
  const handlePickOption = (optId: string) => {
    if (isQuizAnswered) return;
    sounds.playClick();
    const opts = question.options || [];

    if (question.allowMultipleCorrect) {
      if (chosenOptionIds.includes(optId)) {
        setChosenOptionIds(chosenOptionIds.filter(id => id !== optId));
      } else {
        setChosenOptionIds([...chosenOptionIds, optId]);
      }
    } else {
      // Single choice: instant evaluate
      setChosenOptionIds([optId]);
      setIsQuizAnswered(true);
      const isCorrect = opts.find(o => o.id === optId)?.isCorrect;
      if (isCorrect) {
        sounds.playCorrect();
        sounds.playFanfare();
      } else {
        sounds.playWrong();
      }
    }
  };

  const handleSubmitMultipleChoice = () => {
    const opts = question.options || [];
    setIsQuizAnswered(true);
    const correctIds = opts.filter(o => o.isCorrect).map(o => o.id);
    const isAllCorrect =
      chosenOptionIds.length === correctIds.length &&
      chosenOptionIds.every(id => correctIds.includes(id));

    if (isAllCorrect) {
      sounds.playCorrect();
      sounds.playFanfare();
    } else {
      sounds.playWrong();
    }
  };

  const options = question.options || [];
  const columns = question.layoutColumns || 2;
  const boxSize = question.boxSize || 'lg';
  const themeClass = THEME_CLASSES[theme] || THEME_CLASSES['pastel'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-slate-900 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700">
        {/* Top bar */}
        <div className="px-4 sm:px-5 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800 shrink-0">
              CHẾ ĐỘ XEM TRƯỚC
            </span>
            {allQuestions && allQuestions.length > 1 && (
              <span className="text-xs font-black text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded-lg border border-indigo-800 shrink-0">
                Câu {currentQuestionIndex + 1}/{allQuestions.length}
              </span>
            )}
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-100 truncate hidden md:block">
              {question.title || 'Câu hỏi'}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {question.readQuestionAudio !== false && (
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition cursor-pointer ${
                  isSpeaking
                    ? 'bg-rose-500 border-rose-400 text-white animate-pulse'
                    : 'bg-indigo-600/70 border-indigo-500 text-white hover:bg-indigo-600'
                }`}
                title="Nghe giọng đọc câu hỏi"
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isSpeaking ? 'Dừng đọc' : 'Đọc câu hỏi'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                onClose();
              }}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <X className="w-4 h-4" />
              <span>ĐÓNG</span>
            </button>
          </div>
        </div>

        {/* Content Area - Styled with preschool wallpaper theme */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`flex-1 w-full overflow-y-auto flex flex-col items-center justify-start p-4 sm:p-6 pb-20 relative transition-all duration-300 ${themeClass}`}
          style={
            customBgImage
              ? {
                  backgroundImage: `url(${customBgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {}
          }
        >
          {capacityWarning && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-[90%] bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-amber-300 z-50 animate-bounce flex items-center gap-2 pointer-events-none text-center">
              <span>{capacityWarning}</span>
            </div>
          )}

          {isDragDrop && config ? (
            /* 1. Drag and drop canvas preview */
            <div
              ref={canvasWrapperRef}
              style={{
                width: `${Math.round(CANVAS_WIDTH * scale)}px`,
                height: `${Math.round(CANVAS_HEIGHT * scale)}px`,
                minWidth: `${Math.round(CANVAS_WIDTH * scale)}px`,
                minHeight: `${Math.round(CANVAS_HEIGHT * scale)}px`,
                position: 'relative',
              }}
              className="transition-[width,height] duration-75 ease-out shadow-2xl rounded-3xl my-auto"
            >
              <div
                style={{
                  width: `${CANVAS_WIDTH}px`,
                  height: `${CANVAS_HEIGHT}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
                className="bg-slate-50 rounded-3xl shadow-2xl overflow-hidden border-4 border-slate-700 select-none"
              >
                {/* Drop Zones and Static Elements (including cards locked from dragging) */}
                {config.elements.map((elem) => {
                  const isTrulyDraggable = elem.isDraggable && !elem.isLocked && elem.cardRole !== 'static';
                  if (isTrulyDraggable) return null;

                  return (
                    <div
                      key={elem.id}
                      style={{
                        position: 'absolute',
                        left: `${elem.x}px`,
                        top: `${elem.y}px`,
                        width: `${elem.width}px`,
                        height: `${elem.height}px`,
                        backgroundColor: elem.bgColor || 'transparent',
                        borderColor: elem.borderColor || 'transparent',
                        borderWidth: elem.borderWidth ? `${elem.borderWidth}px` : undefined,
                        borderRadius: elem.borderRadius ? `${elem.borderRadius}px` : undefined,
                        color: elem.textColor || '#1e293b',
                        fontSize: elem.fontSize ? `${elem.fontSize}px` : undefined,
                        fontWeight: elem.fontWeight || 'bold',
                        boxShadow: elem.shadow ? '0 10px 25px -5px rgba(0, 0, 0, 0.1)' : undefined,
                      }}
                      className="flex flex-col items-center justify-center text-center p-2 overflow-hidden pointer-events-none select-none relative"
                    >
                      {/* Capacity badge for drop zone */}
                      {(elem.isDropZone || elem.type === 'drop_zone') && elem.maxItems && elem.maxItems > 0 && (
                        <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs">
                          {Object.values(placements).filter(zId => zId === elem.id).length}/{elem.maxItems} thẻ
                        </div>
                      )}
                      {elem.imageUrl && (
                        <img
                          src={elem.imageUrl}
                          alt={elem.text || ''}
                          className="max-h-[60%] max-w-[85%] object-contain rounded-xl mb-1 pointer-events-none"
                          draggable={false}
                        />
                      )}
                      {elem.icon && <span className="text-4xl mb-1">{elem.icon}</span>}
                      {elem.text && <span className="leading-tight px-2">{elem.text}</span>}
                      {elem.subText && <span className="text-xs opacity-75 mt-0.5 px-2">{elem.subText}</span>}
                    </div>
                  );
                })}

                {/* Draggable items */}
                {config.elements.map((elem) => {
                  const isTrulyDraggable = elem.isDraggable && !elem.isLocked && elem.cardRole !== 'static';
                  if (!isTrulyDraggable) return null;

                  const isDraggingThis = activeDragId === elem.id;
                  const isPlaced = Boolean(placements[elem.id]);
                  const placedZoneId = placements[elem.id];
                  const placedZone = config.elements.find(e => e.id === placedZoneId);

                  let curX = elem.x;
                  let curY = elem.y;

                  if (isDraggingThis && dragCurrentPos) {
                    curX = dragCurrentPos.x;
                    curY = dragCurrentPos.y;
                  } else if (isPlaced && placedZone) {
                    const placedInZone = Object.entries(placements).filter(([_, zId]) => zId === placedZone.id);
                    const indexInZone = placedInZone.findIndex(([id]) => id === elem.id);
                    curX = placedZone.x + 25 + (indexInZone % 3) * (elem.width * 0.85 + 10);
                    curY = placedZone.y + 65 + Math.floor(indexInZone / 3) * (elem.height * 0.85 + 10);
                  }

                  return (
                    <div
                      key={elem.id}
                      onPointerDown={(e) => handlePointerDown(e, elem.id)}
                      style={{
                        position: 'absolute',
                        left: `${curX}px`,
                        top: `${curY}px`,
                        width: `${elem.width * (isPlaced ? 0.85 : 1)}px`,
                        height: `${elem.height * (isPlaced ? 0.85 : 1)}px`,
                        backgroundColor: elem.bgColor || '#ffffff',
                        borderColor: isPlaced ? '#10b981' : elem.borderColor || '#cbd5e1',
                        borderWidth: elem.borderWidth ? `${elem.borderWidth}px` : 2,
                        borderRadius: elem.borderRadius ? `${elem.borderRadius}px` : 16,
                        color: elem.textColor || '#1e293b',
                        fontSize: elem.fontSize ? `${elem.fontSize * (isPlaced ? 0.85 : 1)}px` : 28,
                        fontWeight: elem.fontWeight || '900',
                        zIndex: isDraggingThis ? 100 : isPlaced ? 20 : 30,
                        touchAction: 'none',
                      }}
                      className={`flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-lg transition-transform p-1 overflow-hidden ${
                        shakeItemId === elem.id ? 'animate-bounce' : ''
                      } ${isPlaced ? 'ring-2 ring-emerald-400 opacity-95' : 'hover:scale-105 active:scale-110'}`}
                    >
                      {elem.imageUrl && (
                        <img
                          src={elem.imageUrl}
                          alt=""
                          className={`max-w-[88%] object-contain rounded-lg pointer-events-none transition-all ${
                            elem.text ? 'max-h-[55%] mb-1' : 'max-h-[85%] w-auto'
                          }`}
                          draggable={false}
                        />
                      )}
                      {elem.text && <span className="leading-tight px-1 truncate max-w-full">{elem.text}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : question.type === 'word_drag_drop' ? (
            /* Word Drag & Drop Question Preview */
            <div className="w-full max-w-3xl bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-2xl border border-teal-200 my-auto animate-in zoom-in-95">
              <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-teal-100">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-teal-50 text-teal-700 font-black text-xs border border-teal-200 flex items-center gap-1">
                    <Type className="w-3.5 h-3.5" />
                    <span>TRÒ CHƠI KÉO THẢ Ô CHỮ (BẢN XEM TRƯỚC)</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs flex items-center gap-1 border border-amber-200">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>+{question.points || 10}đ</span>
                  </span>
                </div>
                {allQuestions && allQuestions.length > 1 && onSelectQuestionIndex && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => onSelectQuestionIndex(currentQuestionIndex - 1)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none text-slate-700 transition"
                      title="Câu trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentQuestionIndex === allQuestions.length - 1}
                      onClick={() => onSelectQuestionIndex(currentQuestionIndex + 1)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none text-slate-700 transition"
                      title="Câu sau"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <PlayerWordDragQuestion
                question={question}
                questionIndex={currentQuestionIndex}
                totalQuestions={allQuestions?.length || 1}
                startTime={null}
                timeLimit={0}
                onSubmitLetter={() => {
                  sounds.playCorrect();
                }}
              />
            </div>
          ) : question.type === 'open_ended' ? (
            /* 2. Interactive Open-Ended / Essay & Drawing Question Preview */
            <div className="w-full max-w-3xl bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-2xl border border-purple-200 my-auto animate-in zoom-in-95">
              {/* Question Metadata Strip */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 font-black text-xs border border-purple-200 flex items-center gap-1">
                    <PenTool className="w-3.5 h-3.5" />
                    <span>CÂU HỎI TỰ LUẬN (VẼ & VIẾT)</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{question.noTimeLimit || question.timeLimit === 0 ? 'Không tính giờ' : `${question.timeLimit || 45}s`}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs flex items-center gap-1 border border-purple-200">
                    <Award className="w-3.5 h-3.5 text-purple-600" />
                    <span>+{question.points || 10}đ</span>
                  </span>
                </div>

                {allQuestions && allQuestions.length > 1 && onSelectQuestionIndex && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => onSelectQuestionIndex(currentQuestionIndex - 1)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none text-slate-700 transition"
                      title="Câu trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentQuestionIndex === allQuestions.length - 1}
                      onClick={() => onSelectQuestionIndex(currentQuestionIndex + 1)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none text-slate-700 transition"
                      title="Câu sau"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Title */}
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-snug mb-2">
                {question.title || 'Câu hỏi tự luận'}
              </h2>



              {question.imageUrl && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={question.imageUrl}
                    alt={question.title}
                    style={{
                      maxHeight: `${question.imageHeight || (question.imageSize === 'sm' ? 120 : question.imageSize === 'lg' ? 250 : question.imageSize === 'xl' ? 340 : 180)}px`,
                    }}
                    className="max-w-full rounded-2xl border-2 border-slate-200 object-contain shadow-xs bg-slate-50 p-2 transition-all"
                  />
                </div>
              )}

              {/* Interactive Open-Ended Canvas Mock Area */}
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-purple-200 mb-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-black text-slate-700">
                  <span>🎨 Ô TRỐNG ĐÁP ÁN (BÉ VẼ HOẶC VIẾT CHỮ)</span>
                  <span className="text-[11px] text-purple-700">Bảng màu 8 sắc · Tẩy · Hoàn tác</span>
                </div>

                <div className="bg-white rounded-xl h-44 border-2 border-dashed border-purple-300 flex flex-col items-center justify-center p-4 text-center">
                  <span className="text-3xl mb-1">🖌️</span>
                  <p className="text-xs font-black text-purple-900">
                    Khu vực bảng vẽ tự do trên màn hình của trẻ
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    Trẻ chạm tay hoặc dùng chuột để vẽ nét chữ/hình ảnh và gõ chữ vào ô đáp án
                  </p>
                </div>

                <input
                  type="text"
                  readOnly
                  placeholder="Ô gõ chữ trả lời của bé..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none cursor-default"
                />
              </div>

              {/* Teacher grading notice */}
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 font-bold flex items-center justify-between">
                <span>✏️ Cô có thể xem bài làm & sửa bài trực tiếp tại màn hình kết quả và tổng kết</span>
                <span className="font-mono text-purple-700">+{question.points || 10}đ</span>
              </div>
            </div>
          ) : (
            /* 3. Interactive Multiple Choice Question Preview */
            <div className="w-full max-w-3xl bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/60 my-auto animate-in zoom-in-95">
              {/* Question Metadata Strip */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-black text-xs border border-indigo-200">
                    {question.allowMultipleCorrect ? 'CHỌN NHIỀU ĐÁP ÁN' : 'CÂU HỎI TRẮC NGHIỆM'}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{question.noTimeLimit || question.timeLimit === 0 ? 'Không tính giờ' : `${question.timeLimit || 20}s`}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs flex items-center gap-1 border border-amber-200">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>+{question.points || 10}đ</span>
                  </span>
                </div>

                {allQuestions && allQuestions.length > 1 && onSelectQuestionIndex && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentQuestionIndex === 0}
                      onClick={() => onSelectQuestionIndex(currentQuestionIndex - 1)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none text-slate-700 transition"
                      title="Câu trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentQuestionIndex === allQuestions.length - 1}
                      onClick={() => onSelectQuestionIndex(currentQuestionIndex + 1)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none text-slate-700 transition"
                      title="Câu sau"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Question Title & Image */}
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-snug mb-3">
                {question.title || 'Câu hỏi chưa đặt tiêu đề'}
              </h2>

              {question.imageUrl && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={question.imageUrl}
                    alt={question.title}
                    style={{
                      maxHeight: `${question.imageHeight || (question.imageSize === 'sm' ? 120 : question.imageSize === 'lg' ? 250 : question.imageSize === 'xl' ? 340 : 180)}px`,
                    }}
                    className="max-w-full rounded-2xl border-2 border-slate-200 object-contain shadow-xs bg-slate-50 p-2 transition-all"
                  />
                </div>
              )}

              {/* Options Interactive Grid */}
              <div
                className={`grid gap-3 mb-5 ${
                  columns === 1
                    ? 'grid-cols-1'
                    : columns === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : columns === 3
                    ? 'grid-cols-1 sm:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-4'
                }`}
              >
                {options.map((opt, idx) => {
                  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                  const letter = letters[idx] || `${idx + 1}`;
                  const isSelected = chosenOptionIds.includes(opt.id);

                  let cardStyle = 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-sm';
                  if (isQuizAnswered) {
                    if (opt.isCorrect) {
                      cardStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-300';
                    } else if (isSelected && !opt.isCorrect) {
                      cardStyle = 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-300';
                    } else {
                      cardStyle = 'border-slate-200 bg-slate-50 opacity-60';
                    }
                  } else if (isSelected) {
                    cardStyle = 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-300';
                  }

                  const paddingClass =
                    boxSize === 'sm' ? 'p-2.5' : boxSize === 'md' ? 'p-3' : boxSize === 'lg' ? 'p-3.5' : 'p-4';

                  const isFullOrCustom = (opt.imageFit === 'full' || opt.imageFit === 'custom') && Boolean(opt.imageUrl);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handlePickOption(opt.id)}
                      className={`text-left rounded-2xl border-2 transition-all cursor-pointer ${cardStyle} ${paddingClass} ${
                        isFullOrCustom
                          ? 'flex flex-col items-center justify-between text-center'
                          : 'flex items-center gap-2.5'
                      }`}
                    >
                      {isFullOrCustom ? (
                        <>
                          <div className="w-full flex items-center justify-between gap-2">
                            <span
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                                isQuizAnswered && opt.isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : isQuizAnswered && isSelected && !opt.isCorrect
                                  ? 'bg-rose-600 text-white'
                                  : isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isQuizAnswered && opt.isCorrect ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                letter
                              )}
                            </span>
                            <span className="font-extrabold text-xs sm:text-sm text-slate-800 flex-1 truncate text-left">
                              {opt.text}
                            </span>
                          </div>

                          <div className="w-full my-2 bg-slate-50/80 rounded-xl p-1 border border-slate-200/60 flex items-center justify-center">
                            <img
                              src={opt.imageUrl}
                              alt=""
                              style={opt.imageFit === 'custom' ? { height: `${opt.imageHeight || 140}px` } : undefined}
                              className={`w-full object-contain rounded-lg ${
                                opt.imageFit === 'custom' ? '' : 'h-32 sm:h-40'
                              }`}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <span
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                              isQuizAnswered && opt.isCorrect
                                ? 'bg-emerald-600 text-white'
                                : isQuizAnswered && isSelected && !opt.isCorrect
                                ? 'bg-rose-600 text-white'
                                : isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isQuizAnswered && opt.isCorrect ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              letter
                            )}
                          </span>

                          {opt.imageUrl && (
                            <img
                              src={opt.imageUrl}
                              alt=""
                              className={`rounded-lg object-contain bg-slate-50 border border-slate-200 shrink-0 ${
                                opt.imageFit === 'large'
                                  ? 'w-20 h-20 sm:w-24 sm:h-24'
                                  : opt.imageFit === 'small'
                                  ? 'w-10 h-10'
                                  : 'w-14 h-14 sm:w-16 sm:h-16'
                              }`}
                            />
                          )}

                          <span className="font-extrabold text-xs sm:text-sm text-slate-800 flex-1 truncate">
                            {opt.text}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Multiple Choice Submit Button */}
              {question.allowMultipleCorrect && !isQuizAnswered && (
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    onClick={handleSubmitMultipleChoice}
                    disabled={chosenOptionIds.length === 0}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs sm:text-sm rounded-xl transition cursor-pointer"
                  >
                    Xác nhận đáp án ({chosenOptionIds.length})
                  </button>
                </div>
              )}

              {/* Feedback and Explanation */}
              {isQuizAnswered && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 animate-in fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Kết quả câu trả lời:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Thử bấm đáp án khác
                    </button>
                  </div>
                  {question.explanation && (
                    <p className="text-xs font-semibold text-slate-600">
                      <b>Giải thích cho bé:</b> {question.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Victory celebratory overlay in preview */}
          {completed && scoreResult && (
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in z-50">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm text-center shadow-2xl border-4 border-amber-300">
                <span className="text-5xl sm:text-6xl inline-block animate-bounce mb-3">🌟</span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  HOÀN THÀNH XUẤT SẮC!
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-600 mt-1 mb-4">
                  Bé đã xếp đúng {scoreResult.correct} / {scoreResult.total} thẻ
                </p>

                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 mb-5">
                  <span className="text-xs font-black uppercase text-amber-800">Điểm đạt được</span>
                  <div className="text-3xl font-black text-amber-600 font-mono">
                    +{scoreResult.points} điểm
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow transition cursor-pointer"
                >
                  Thử lại một lần nữa
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
