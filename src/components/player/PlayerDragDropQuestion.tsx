import React, { useState, useRef, useEffect } from 'react';
import { Question, TeamAnswer, CanvasElement } from '../../types/game';
import { Clock, CheckCircle2, RotateCcw, Sparkles, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { sounds } from '../../utils/sound';
import { realtime } from '../../services/realtimeClient';
import { speakVietnamese, stopSpeaking, isSpeechSupported, subscribeSpeakingState, unlockSpeechAudio } from '../../utils/speechVoice';

export const isCardLocked = (e: CanvasElement): boolean => {
  if (!e) return true;
  if (e.isDropZone || e.type === 'drop_zone') return true;
  if (e.isIllustration === true || e.cardRole === 'illustration' || e.type === 'illustration_card') return true;
  if (e.isLocked === true || (e.isLocked as any) === 'true' || (e.isLocked as any) === 1) return true;
  if (e.cardRole === 'static') return true;
  if (e.isDraggable === false || (e.isDraggable as any) === 'false') return true;
  return false;
};

export const isCardDraggable = (e: CanvasElement): boolean => {
  if (!e) return false;
  if (e.isDropZone || e.type === 'drop_zone') return false;
  if (isCardLocked(e)) return false;
  return Boolean(e.isDraggable === true || (e.isDraggable as any) === 'true' || e.type === 'drag_item');
};

interface PlayerDragDropQuestionProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  startTime: number | null;
  timeLimit: number;
  existingAnswer?: TeamAnswer;
  onSubmitPlacements: (placements: Record<string, string>, isFinal: boolean) => void;
}

export const PlayerDragDropQuestion: React.FC<PlayerDragDropQuestionProps> = ({
  question,
  questionIndex,
  totalQuestions,
  startTime,
  timeLimit,
  existingAnswer,
  onSubmitPlacements,
}) => {
  const config = question.canvasConfig;
  const CANVAS_WIDTH = 1280;
  const CANVAS_HEIGHT = 720;

  const [placements, setPlacements] = useState<Record<string, string>>(() => {
    if (existingAnswer?.actions) {
      const init: Record<string, string> = {};
      existingAnswer.actions.forEach(a => {
        init[a.itemId] = a.targetId;
      });
      return init;
    }
    return {};
  });

  const [hasSubmitted, setHasSubmitted] = useState<boolean>(Boolean(existingAnswer));
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragCurrentPos, setDragCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [dragTilt, setDragTilt] = useState<number>(0);
  const lastPointerXRef = useRef<number>(0);
  const [shakeItemId, setShakeItemId] = useState<string | null>(null);
  const [zoneNotice, setZoneNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  const placementsRef = useRef(placements);
  placementsRef.current = placements;
  const hasSubmittedRef = useRef(hasSubmitted);
  hasSubmittedRef.current = hasSubmitted;

  const [isSpeaking, setIsSpeaking] = useState(false);

  // Subscribe to speech state
  useEffect(() => {
    const unsub = subscribeSpeakingState((speaking) => {
      setIsSpeaking(speaking);
    });
    return () => {
      unsub();
      stopSpeaking();
    };
  }, []);

  // Automatically read question aloud on student device if readQuestionAudio is enabled
  useEffect(() => {
    if (question && question.readQuestionAudio !== false && question.title && !existingAnswer) {
      unlockSpeechAudio();
      const autoTimer = setTimeout(() => {
        if (!hasSubmittedRef.current) {
          speakVietnamese(question.title);
        }
      }, 400);
      return () => {
        clearTimeout(autoTimer);
        stopSpeaking();
      };
    }
    return () => {
      stopSpeaking();
    };
  }, [questionIndex, question.id, existingAnswer]);

  const handleToggleSpeak = () => {
    sounds.playClick();
    unlockSpeechAudio();
    if (isSpeaking) {
      stopSpeaking();
    } else if (question.title) {
      speakVietnamese(question.title);
    }
  };

  // Auto-submit placements when unmounted if not submitted yet
  useEffect(() => {
    return () => {
      if (!hasSubmittedRef.current) {
        onSubmitPlacements(placementsRef.current, true);
      }
    };
  }, [onSubmitPlacements]);

  // Calculate scaled dimension to fit mobile screen perfectly without distortion
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (containerRef.current) {
        const pWidth = containerRef.current.clientWidth - 12;
        const pHeight = containerRef.current.clientHeight - 12;
        const sx = pWidth / CANVAS_WIDTH;
        const sy = pHeight / CANVAS_HEIGHT;
        setScale(Math.max(0.18, Math.min(1.0, Math.min(sx, sy))));
      }
    };

    handleResize();

    const ro = new ResizeObserver(() => {
      handleResize();
    });
    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, []);

  // Theo yêu cầu: mặc định không tính giờ trả lời
  const isNoTimeLimit = true;
  const effectiveStart = startTime || realtime.getServerNow();
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Truly draggable cards exclude locked / static cards
  const allDraggables = config?.elements.filter(isCardDraggable) || [];

  // Required correct cards (for progress and auto-completion)
  const requiredDraggables = allDraggables.filter((e) => e.cardRole !== 'wrong');
  const targetRequiredCount = requiredDraggables.length > 0 ? requiredDraggables.length : allDraggables.length;

  const placedCount = Object.keys(placements).length;
  const isAllPlaced = placedCount >= targetRequiredCount && targetRequiredCount > 0;

  // Touch / Pointer Dragging Logic for kids
  const handlePointerDown = (e: React.PointerEvent, elemId: string) => {
    if (hasSubmitted) return;
    const targetEl = config?.elements.find((el) => el.id === elemId);
    if (!targetEl || !isCardDraggable(targetEl)) return;

    e.preventDefault();
    e.stopPropagation();

    sounds.playClick();
    stopSpeaking();
    setActiveDragId(elemId);
    lastPointerXRef.current = e.clientX;
    setDragTilt(0);

    setDragOffset({
      x: targetEl.width / 2,
      y: targetEl.height / 2,
    });
    setDragCurrentPos({ x: targetEl.x, y: targetEl.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDragId || !canvasWrapperRef.current) return;
    e.preventDefault();

    const dx = e.clientX - lastPointerXRef.current;
    lastPointerXRef.current = e.clientX;
    const targetTilt = Math.max(-18, Math.min(18, dx * 3));
    setDragTilt(prev => Math.round(prev * 0.3 + targetTilt * 0.7));

    const rect = canvasWrapperRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale - dragOffset.x;
    const y = (e.clientY - rect.top) / scale - dragOffset.y;

    setDragCurrentPos({ x, y });
  };

  const handlePointerUp = () => {
    setDragTilt(0);
    if (!activeDragId || !dragCurrentPos || !config) {
      setActiveDragId(null);
      setDragCurrentPos(null);
      return;
    }

    const draggedItem = config.elements.find(e => e.id === activeDragId);
    if (!draggedItem || !isCardDraggable(draggedItem)) {
      setActiveDragId(null);
      setDragCurrentPos(null);
      return;
    }

    // Detect if dropped inside any Drop Zone (checked by isDropZone OR type === 'drop_zone')
    const dropZones = config.elements.filter(e => e.isDropZone || e.type === 'drop_zone');
    let matchedZoneId: string | null = null;

    const itemCenterX = dragCurrentPos.x + draggedItem.width / 2;
    const itemCenterY = dragCurrentPos.y + draggedItem.height / 2;

    for (const zone of dropZones) {
      if (
        itemCenterX >= zone.x - 20 &&
        itemCenterX <= zone.x + zone.width + 20 &&
        itemCenterY >= zone.y - 20 &&
        itemCenterY <= zone.y + zone.height + 20
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

      // Check capacity limit
      if (maxAllowed > 0 && itemsInZone.length >= maxAllowed) {
        // Drop zone is full! Reject placement
        sounds.playWrong();
        setShakeItemId(activeDragId);
        setTimeout(() => setShakeItemId(null), 400);
        const zoneName = targetZone?.text || (targetZone?.acceptsCategory ? `Ô ${targetZone.acceptsCategory}` : 'Vùng chứa');
        setZoneNotice(`⚠️ ${zoneName} chỉ chứa tối đa ${maxAllowed} thẻ! Trẻ muốn cho thẻ khác vào phải kéo thẻ cũ ra trước.`);
        setTimeout(() => setZoneNotice(null), 4000);
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

      // Send live intermediate progress to Host
      onSubmitPlacements(nextPlacements, false);

      // Calculate total capacity across all drop zones
      const totalZoneCapacity = dropZones.reduce((sum, z) => {
        const cap = Number(z.maxItems);
        return sum + (cap > 0 ? cap : 999);
      }, 0);
      const effectiveCompletionCount = Math.min(allDraggables.length, totalZoneCapacity);

      // Auto-submit if all slots are filled or all cards are placed
      if (
        (Object.keys(nextPlacements).length >= allDraggables.length && allDraggables.length > 0) ||
        (effectiveCompletionCount > 0 && Object.keys(nextPlacements).length >= effectiveCompletionCount && Object.keys(nextPlacements).length >= targetRequiredCount)
      ) {
        setHasSubmitted(true);
        sounds.playFanfare();
        onSubmitPlacements(nextPlacements, true); // Final submission
      }
    } else {
      // Released outside any drop zone!
      // If the card was previously placed in a zone, pulling it out removes it from the zone!
      if (placements[activeDragId]) {
        sounds.playClick();
        const nextPlacements = { ...placements };
        delete nextPlacements[activeDragId];
        setPlacements(nextPlacements);
        onSubmitPlacements(nextPlacements, false);
      } else {
        // Snap back with shake
        sounds.playWrong();
        setShakeItemId(activeDragId);
        setTimeout(() => setShakeItemId(null), 350);
      }
    }

    setActiveDragId(null);
    setDragCurrentPos(null);
  };

  const handleManualSubmit = () => {
    if (hasSubmitted) return;
    setHasSubmitted(true);
    sounds.playFanfare();
    onSubmitPlacements(placements, true);
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-2 py-2 flex flex-col justify-between h-[88vh] select-none touch-manipulation">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border-2 border-slate-100 shadow-sm shrink-0 mb-2">
        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">
          CÂU {questionIndex + 1} / {totalQuestions} · KÉO THẢ
        </span>

        {/* Text to Speech Button for Children */}
        {isSpeechSupported() && question.readQuestionAudio !== false && question.title && (
          <button
            type="button"
            onClick={handleToggleSpeak}
            className={`px-3 py-1 rounded-xl font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
              isSpeaking
                ? 'bg-rose-500 text-white animate-pulse shadow-md'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
            title="Đọc câu hỏi cho các bé nghe"
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isSpeaking ? 'Dừng đọc' : '🔊 Đọc câu hỏi'}</span>
          </button>
        )}

        {/* Progress badge */}
        <div className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
          Đã xếp: <span className="text-indigo-600 font-mono text-sm">{placedCount}</span>/{allDraggables.length} thẻ
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Không tính giờ</span>
          </span>

          {!hasSubmitted && placedCount > 0 && (
            <button
              type="button"
              onClick={handleManualSubmit}
              className="px-3.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <span>Nộp bài ✓</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex-1 w-full flex items-center justify-center overflow-hidden bg-slate-900/5 rounded-3xl border-2 border-slate-200 relative p-1"
      >
        {/* Floating warning notice for students if drop zone is full */}
        {zoneNotice && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 max-w-[92%] bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-amber-300 z-50 animate-bounce flex items-center gap-2 pointer-events-none text-center">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-200" />
            <span>{zoneNotice}</span>
          </div>
        )}

        {config && (
          <div
            ref={canvasWrapperRef}
            style={{
              width: `${Math.round(CANVAS_WIDTH * scale)}px`,
              height: `${Math.round(CANVAS_HEIGHT * scale)}px`,
              minWidth: `${Math.round(CANVAS_WIDTH * scale)}px`,
              minHeight: `${Math.round(CANVAS_HEIGHT * scale)}px`,
              position: 'relative',
            }}
            className="transition-[width,height] duration-75 ease-out shadow-xl rounded-3xl"
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
              className="bg-white rounded-3xl shadow-xl overflow-hidden select-none"
            >
              {/* Drop Zones & Static Elements (including cards locked from dragging; illustration answer cards hidden during play) */}
              {config.elements.filter(e => !isCardDraggable(e) && !e.isIllustration && e.cardRole !== 'illustration' && e.type !== 'illustration_card').map((elem) => {
                const isDropZone = elem.isDropZone || elem.type === 'drop_zone';
                const isLockedCard = isCardLocked(elem) && !isDropZone;
                const maxAllowed = elem.maxItems !== undefined && elem.maxItems !== null ? Number(elem.maxItems) : 0;
                const currentCount = Object.values(placements).filter(zId => zId === elem.id).length;
                const isFull = maxAllowed > 0 && currentCount >= maxAllowed;

                return (
                  <div
                    key={elem.id}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    style={{
                      position: 'absolute',
                      left: `${elem.x}px`,
                      top: `${elem.y}px`,
                      width: `${elem.width}px`,
                      height: `${elem.height}px`,
                      backgroundColor: elem.bgColor || 'transparent',
                      borderColor: isDropZone && isFull ? '#ef4444' : (elem.borderColor || 'transparent'),
                      borderWidth: elem.borderWidth ? `${elem.borderWidth}px` : undefined,
                      borderRadius: elem.borderRadius ? `${elem.borderRadius}px` : undefined,
                      color: elem.textColor || '#1e293b',
                      fontSize: elem.fontSize ? `${elem.fontSize}px` : undefined,
                      fontWeight: elem.fontWeight || 'bold',
                      fontFamily: elem.isHandwriting ? "'Playpen Sans', 'Mali', cursive" : (elem.fontFamily || undefined),
                      boxShadow: elem.shadow ? '0 10px 25px -5px rgba(0, 0, 0, 0.1)' : undefined,
                      touchAction: 'none',
                    }}
                    className={`flex flex-col items-center justify-center text-center pointer-events-none p-1 overflow-hidden relative select-none ${
                      isLockedCard ? 'ring-2 ring-slate-300/80 bg-slate-50/60' : ''
                    } ${isDropZone && isFull ? 'ring-2 ring-rose-400 bg-rose-50/20' : ''}`}
                  >
                    {/* Capacity badge for drop zone */}
                    {isDropZone && maxAllowed > 0 && (
                      <div className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black border shadow-2xs z-10 ${
                        isFull
                          ? 'bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-400'
                          : 'bg-sky-100 text-sky-800 border-sky-300'
                      }`}>
                        {currentCount}/{maxAllowed} thẻ {isFull ? '(Đã đầy)' : ''}
                      </div>
                    )}

                    {/* Locked card indicator so children and teachers clearly see it's a fixed card */}
                    {isLockedCard && (
                      <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-900/80 text-amber-300 border border-amber-400/40 shadow-xs z-10 flex items-center gap-1">
                        <span>🔒</span>
                        <span>ĐÃ KHÓA</span>
                      </div>
                    )}

                    {elem.imageUrl && (
                      <img
                        src={elem.imageUrl}
                        alt={elem.text || 'Minh họa'}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        className="max-h-[60%] max-w-[85%] object-contain rounded-xl mb-1 pointer-events-none select-none"
                      />
                    )}
                    {elem.icon && <span className="text-4xl mb-1 pointer-events-none select-none">{elem.icon}</span>}
                    {elem.text && (
                      <span className={`leading-tight px-3 pointer-events-none select-none ${elem.isHandwriting ? 'font-handwriting lowercase' : ''}`}>
                        {elem.text}
                      </span>
                    )}
                    {elem.subText && (
                      <span className="text-sm opacity-75 font-semibold mt-1 px-3 pointer-events-none select-none">
                        {elem.subText}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Draggable Cards */}
              {config.elements.filter(isCardDraggable).map((elem) => {
                const isPlaced = Boolean(placements[elem.id]);
                const targetZoneId = placements[elem.id];
                const targetZone = config.elements.find(e => e.id === targetZoneId);

                let posX = elem.x;
                let posY = elem.y;

                if (isPlaced && targetZone) {
                  const placedInZone = Object.entries(placements).filter(([_, zId]) => zId === targetZone.id);
                  const indexInZone = placedInZone.findIndex(([id]) => id === elem.id);
                  const isSingleItemZone = Number(targetZone.maxItems) === 1;

                  if (isSingleItemZone) {
                    // Center the single card perfectly inside the drop zone
                    posX = targetZone.x + Math.max(0, (targetZone.width - elem.width * 0.85) / 2);
                    posY = targetZone.y + Math.max(0, (targetZone.height - elem.height * 0.85) / 2);
                  } else {
                    posX = targetZone.x + 25 + (indexInZone % 3) * (elem.width * 0.85 + 10);
                    posY = targetZone.y + 65 + Math.floor(indexInZone / 3) * (elem.height * 0.85 + 10);
                  }
                }

                if (activeDragId === elem.id && dragCurrentPos) {
                  posX = dragCurrentPos.x;
                  posY = dragCurrentPos.y;
                }

                return (
                  <React.Fragment key={elem.id}>
                    {/* Placeholder at original spot when card is being dragged */}
                    {activeDragId === elem.id && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${elem.x}px`,
                          top: `${elem.y}px`,
                          width: `${elem.width}px`,
                          height: `${elem.height}px`,
                          borderRadius: elem.borderRadius ? `${elem.borderRadius}px` : undefined,
                        }}
                        className="border-2 border-dashed border-indigo-300 bg-indigo-50/40 opacity-40 pointer-events-none"
                      />
                    )}

                    <div
                      onPointerDown={(e) => handlePointerDown(e, elem.id)}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      style={{
                        position: 'absolute',
                        left: `${posX}px`,
                        top: `${posY}px`,
                        width: `${elem.width * (isPlaced ? 0.85 : 1)}px`,
                        height: `${elem.height * (isPlaced ? 0.85 : 1)}px`,
                        backgroundColor: elem.bgColor || '#0284c7',
                        borderColor: elem.borderColor || 'transparent',
                        borderWidth: elem.borderWidth ? `${elem.borderWidth}px` : undefined,
                        borderRadius: elem.borderRadius ? `${elem.borderRadius}px` : undefined,
                        color: elem.textColor || '#ffffff',
                        fontSize: elem.fontSize ? `${elem.fontSize * (isPlaced ? 0.85 : 1)}px` : undefined,
                        fontWeight: elem.fontWeight || '900',
                        fontFamily: elem.isHandwriting ? "'Playpen Sans', 'Mali', cursive" : (elem.fontFamily || undefined),
                        boxShadow: activeDragId === elem.id ? '0 25px 35px rgba(0,0,0,0.35)' : '0 10px 20px rgba(0,0,0,0.1)',
                        zIndex: activeDragId === elem.id ? 999 : (isPlaced ? 30 : 20),
                        transform: activeDragId === elem.id ? `rotate(${dragTilt}deg) scale(1.12)` : undefined,
                        touchAction: 'none',
                      }}
                      className={`flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing touch-none select-none transition-transform p-1 overflow-hidden ${
                        shakeItemId === elem.id ? 'animate-bounce text-rose-500' : ''
                      } ${isPlaced ? 'ring-2 ring-emerald-400 opacity-95' : 'hover:scale-105 active:scale-110'}`}
                    >
                    {elem.imageUrl && (
                      <img
                        key={elem.imageUrl}
                        src={elem.imageUrl}
                        alt={elem.text || 'Thẻ ảnh'}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        className={`max-w-[88%] object-contain rounded-lg pointer-events-none select-none transition-all ${
                          elem.text ? 'max-h-[55%] mb-1' : 'max-h-[85%] w-auto'
                        }`}
                      />
                    )}
                    {elem.icon && <span className="text-3xl mb-1 pointer-events-none select-none">{elem.icon}</span>}
                    {elem.text && (
                      <span className={`pointer-events-none select-none ${elem.isHandwriting ? 'font-handwriting lowercase' : ''}`}>
                        {elem.text}
                      </span>
                    )}
                    {elem.subText && <span className="text-xs font-semibold pointer-events-none select-none">{elem.subText}</span>}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Lock overlay when submitted */}
        {hasSubmitted && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 pointer-events-auto">
            <div className="bg-white rounded-3xl p-6 max-w-xs text-center shadow-2xl border-4 border-emerald-400 animate-in fade-in">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-2 animate-bounce" />
              <h3 className="text-xl font-black text-slate-900">
                BÉ ĐÃ XẾP XONG!
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-1">
                Kết quả đã được gửi lên máy cô. Bé hãy chú ý nhìn lên màn hình của cô nhé! ⭐
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="text-center py-1 text-[11px] font-bold text-slate-400 shrink-0">
        👉 Chạm giữ và kéo thẻ chữ vào ô phía trên
      </div>
    </div>
  );
};
