import React, { useState, useEffect, useRef } from 'react';
import { Question, TeamAnswer } from '../../types/game';
import { Clock, Volume2, VolumeX, Sparkles, CheckCircle2, RotateCcw, Image as ImageIcon, Award, ThumbsUp } from 'lucide-react';
import { sounds } from '../../utils/sound';
import { isSpeechSupported, speakVietnamese, stopSpeaking, subscribeSpeakingState, unlockSpeechAudio } from '../../utils/speechVoice';

interface PlayerWordDragQuestionProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  startTime: number | null;
  timeLimit: number;
  existingAnswer?: TeamAnswer;
  onSubmitLetter: (chosenLetter: string, isCorrect: boolean) => void;
}

export const PlayerWordDragQuestion: React.FC<PlayerWordDragQuestionProps> = ({
  question,
  questionIndex,
  totalQuestions,
  startTime,
  timeLimit,
  existingAnswer,
  onSubmitLetter,
}) => {
  const isNoTimeLimit = Boolean(question.noTimeLimit || timeLimit === 0);
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (isNoTimeLimit) return 0;
    if (!startTime) return timeLimit;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.max(0, timeLimit - elapsed);
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chosenLetter, setChosenLetter] = useState<string | null>(() => {
    if (existingAnswer?.answerText) {
      const match = existingAnswer.answerText.match(/Bé ghép chữ "([^"]+)"/);
      if (match && match[1]) return match[1];
      if (existingAnswer.openEnded?.textAnswer) return existingAnswer.openEnded.textAnswer;
    }
    return null;
  });

  // Dynamic drag tracking state
  const [activeDrag, setActiveDrag] = useState<{ letter: string; source: 'tray' | 'slot'; startX: number; startY: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragRotation, setDragRotation] = useState<number>(0);
  const [dragOverSlot, setDragOverSlot] = useState<boolean>(false);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeDragRef = useRef<{ letter: string; source: 'tray' | 'slot'; startX: number; startY: number } | null>(null);
  activeDragRef.current = activeDrag;
  const dropSlotRef = useRef<HTMLDivElement>(null);

  // Subscribe to speech engine speaking state
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
        speakVietnamese(question.title);
      }, 350);
      return () => {
        clearTimeout(autoTimer);
        stopSpeaking();
      };
    }
    return () => {
      stopSpeaking();
    };
  }, [questionIndex, question.id, existingAnswer]);

  // Speech TTS handler
  const handleToggleVoice = () => {
    sounds.playClick();
    unlockSpeechAudio();
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakVietnamese(question.title);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (isNoTimeLimit) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isNoTimeLimit]);

  // Parse word template and missing letter
  const rawTargetWord = (question.targetWord || question.title || '').trim();
  const correctLetter = (question.missingLetters?.[0] || question.options?.find(o => o.isCorrect)?.text || 'm').trim();
  
  // Build prefix and suffix of the word around the missing letter
  let prefix = '';
  let suffix = '';
  if (question.wordTemplate) {
    const parts = question.wordTemplate.split(/\.{2,}|_{1,}/);
    prefix = parts[0] || '';
    suffix = parts[1] || '';
  } else if (rawTargetWord) {
    const lowerTarget = rawTargetWord.toLowerCase();
    const lowerMissing = correctLetter.toLowerCase();
    const idx = lowerTarget.indexOf(lowerMissing);
    if (idx >= 0) {
      prefix = rawTargetWord.substring(0, idx);
      suffix = rawTargetWord.substring(idx + correctLetter.length);
    } else {
      suffix = rawTargetWord;
    }
  } else {
    suffix = 'iệng';
  }

  // Illustration custom height resolution
  const resolvedImageHeight = question.imageHeight || (
    question.imageSize === 'sm' ? 120 :
    question.imageSize === 'lg' ? 240 :
    question.imageSize === 'xl' ? 320 : 170
  );

  // Letter pool (distractors + correct letter) - luôn dùng chữ viết thường
  const [shuffledPool, setShuffledPool] = useState<string[]>([]);
  useEffect(() => {
    let pool: string[] = [];
    if (question.letterPool && question.letterPool.length > 0) {
      pool = [...question.letterPool];
    } else if (question.options && question.options.length > 0) {
      pool = question.options.map(o => o.text);
    } else {
      const distractors = question.distractorLetters || ['n', 'b', 'd', 'l'];
      pool = [correctLetter, ...distractors];
    }
    const unique = Array.from(new Set(pool.filter(Boolean).map(c => c.toLowerCase())));
    const shuffled = [...unique].sort(() => 0.5 - Math.random());
    setShuffledPool(shuffled);
  }, [question, correctLetter]);

  // Place or swap any letter chosen by child - automatically records answer immediately (chữ viết thường)
  const handlePlaceLetter = (letter: string) => {
    const lower = letter.toLowerCase();
    sounds.playCorrect();
    setChosenLetter(lower);
    onSubmitLetter(lower, false);
  };

  const handleRemoveLetter = () => {
    sounds.playClick();
    setChosenLetter(null);
    onSubmitLetter('', false);
  };

  // Pointer drag event listeners on window during active dragging
  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e: PointerEvent) => {
      const currentX = e.clientX;
      const currentY = e.clientY;
      const lastX = lastPosRef.current.x;
      const dx = currentX - lastX;
      lastPosRef.current = { x: currentX, y: currentY };

      setDragPos({ x: currentX, y: currentY });

      // Dynamic tilt following the drag direction:
      // Moving right -> tilts right (positive rotation, e.g. +14 deg)
      // Moving left -> tilts left (negative rotation, e.g. -14 deg)
      const startX = activeDragRef.current?.startX || currentX;
      const totalDx = currentX - startX;
      const targetAngle = Math.max(-20, Math.min(20, dx * 3.2 + totalDx * 0.08));
      setDragRotation(prev => Math.round(prev * 0.25 + targetAngle * 0.75));

      // Hit-test drop slot
      if (dropSlotRef.current) {
        const rect = dropSlotRef.current.getBoundingClientRect();
        const padding = 28; // Kid-friendly forgiving hit zone
        const isOver = (
          currentX >= rect.left - padding &&
          currentX <= rect.right + padding &&
          currentY >= rect.top - padding &&
          currentY <= rect.bottom + padding
        );
        setDragOverSlot(isOver);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const currentDrag = activeDragRef.current;
      if (!currentDrag) return;

      const currentX = e.clientX;
      const currentY = e.clientY;
      const dist = Math.hypot(currentX - currentDrag.startX, currentY - currentDrag.startY);

      // Check drop collision with drop slot
      let isDroppedInSlot = false;
      if (dropSlotRef.current) {
        const rect = dropSlotRef.current.getBoundingClientRect();
        const padding = 32;
        isDroppedInSlot = (
          currentX >= rect.left - padding &&
          currentX <= rect.right + padding &&
          currentY >= rect.top - padding &&
          currentY <= rect.bottom + padding
        );
      }

      if (currentDrag.source === 'tray') {
        // Dragged from tray
        if (isDroppedInSlot) {
          // Drops into slot (places or replaces any existing card in slot)
          handlePlaceLetter(currentDrag.letter);
        } else if (dist < 10) {
          // Simple tap on tray card
          if (chosenLetter?.toLowerCase() === currentDrag.letter.toLowerCase()) {
            // Tapping already selected card toggles it off
            handleRemoveLetter();
          } else {
            handlePlaceLetter(currentDrag.letter);
          }
        } else {
          // Dragged and dropped outside slot -> return to tray
          sounds.playClick();
        }
      } else if (currentDrag.source === 'slot') {
        // Dragged OUT of slot ("Trẻ giữ thẻ để kéo ra lại")
        if (isDroppedInSlot) {
          // Released back in the slot or simple tap
          if (dist < 8) {
            // Simple tap on slot card removes it
            handleRemoveLetter();
          } else {
            // Dragged slightly but dropped back onto slot -> keep placed
            sounds.playClick();
          }
        } else {
          // Dragged OUT of slot and released outside: REMOVE FROM SLOT!
          sounds.playClick();
          setChosenLetter(null);
          onSubmitLetter('', false);
        }
      }

      setActiveDrag(null);
      setDragPos(null);
      setDragOverSlot(false);
      setDragRotation(0);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeDrag, chosenLetter]);

  // Pointer down on tray card
  const handleLetterPointerDown = (e: React.PointerEvent, letter: string) => {
    e.preventDefault();
    sounds.playClick();
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setActiveDrag({
      letter,
      source: 'tray',
      startX: e.clientX,
      startY: e.clientY,
    });
    setDragPos({ x: e.clientX, y: e.clientY });
    setDragRotation(0);
    setDragOverSlot(false);
  };

  // Pointer down on placed card in slot to drag it OUT ("giữ thẻ để kéo ra lại")
  const handleSlotLetterPointerDown = (e: React.PointerEvent, letter: string) => {
    e.preventDefault();
    e.stopPropagation();
    sounds.playClick();
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setActiveDrag({
      letter,
      source: 'slot',
      startX: e.clientX,
      startY: e.clientY,
    });
    setDragPos({ x: e.clientX, y: e.clientY });
    setDragRotation(0);
    setDragOverSlot(true);
  };

  return (
    <div className="w-full h-full max-h-full flex-1 flex flex-col p-2.5 sm:p-4 min-h-0 overflow-hidden select-none bg-gradient-to-b from-indigo-50/50 via-purple-50/30 to-pink-50/40">
      {/* Top Header Card */}
      <div className="flex items-center justify-between bg-white px-3.5 py-2 sm:py-2.5 rounded-2xl border-2 border-indigo-100 shadow-2xs shrink-0 mb-2 sm:mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl uppercase tracking-wider">
            CÂU {questionIndex + 1}/{totalQuestions} · KÉO THẢ Ô CHỮ
          </span>
          {isSpeechSupported() && question.readQuestionAudio !== false && (
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
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
          <span className="flex items-center gap-1.5 text-xs font-black text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            <span>{isNoTimeLimit ? 'Cô thu bài' : `${timeLeft}s`}</span>
          </span>
        </div>
      </div>

      {/* Main Content Flow: Question on top, illustration below, and 1 unified interactive word & letter board */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-start gap-2 sm:gap-2.5 overflow-y-auto w-full pt-0.5">
        
        {/* TOP: Question Prompt & Illustration Card */}
        <div className="bg-white rounded-3xl border-2 border-indigo-100 shadow-sm p-2.5 sm:p-3 shrink-0 flex flex-col items-center text-center w-full max-w-2xl">
          <div className="flex items-center gap-1.5 mb-0.5 text-[11px] font-black uppercase text-indigo-600">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
            <span>YÊU CẦU CÂU HỎI</span>
          </div>

          <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-900 leading-snug max-w-2xl px-2">
            {question.title}
          </h3>

          {question.explanation && (
            <p className="text-xs font-semibold text-slate-500 mt-0.5 italic max-w-xl">
              💡 {question.explanation}
            </p>
          )}

          {/* Question illustration image */}
          {question.imageUrl && (
            <div
              className="w-full max-w-2xl mt-1.5 p-1 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 rounded-2xl border-2 border-indigo-100 flex items-center justify-center overflow-hidden"
              style={{ maxHeight: `${resolvedImageHeight + 16}px` }}
            >
              <img
                src={question.imageUrl}
                alt="Hình minh họa câu hỏi"
                style={{ maxHeight: `${resolvedImageHeight}px` }}
                className="w-auto max-w-full rounded-xl object-contain drop-shadow-sm select-none transition-all"
              />
            </div>
          )}
        </div>

        {/* UNIFIED INTERACTIVE WORD COMPLETION & LETTER TRAY BOARD (GỘP CHUNG 2 KHUNG TỐI ƯU DIỆN TÍCH, GỌN GÀNG, KHÔNG CÒN KHOẢNG TRỐNG THỪA) */}
        <div className="bg-white rounded-3xl border-2 border-indigo-100 shadow-sm p-2.5 sm:p-3 shrink-0 flex flex-col items-center gap-1.5 sm:gap-2 max-w-2xl mx-auto w-full">
          
          {/* TOP PART OF UNIFIED BOARD: Header & Target Word Area */}
          <div className="w-full flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[11px] sm:text-xs font-black uppercase text-indigo-700 tracking-wider">
                TỪ CẦN HOÀN THIỆN
              </span>
            </div>
            {chosenLetter ? (
              <button
                type="button"
                onClick={handleRemoveLetter}
                className="text-[11px] font-black text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                title="Gỡ chữ để chọn lại chữ khác"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Gỡ chữ</span>
              </button>
            ) : (
              <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                Kéo hoặc chạm chữ vào ô ......
              </span>
            )}
          </div>

          {/* Chunky Word Blocks Row - CHUNG 1 HÀNG NGANG (NO WRAP) - Gọn gàng không khoảng trống thừa */}
          <div className="w-full flex items-center justify-center gap-1 sm:gap-2 flex-nowrap p-1.5 sm:p-2 rounded-2xl bg-slate-50/90 border border-slate-200 shadow-inner overflow-x-auto">
            {/* Prefix Letters (if any) */}
            {prefix && prefix.split('').map((char, i) => {
              if (char === ' ') {
                return <div key={`pre_sp_${i}`} className="w-2 sm:w-3 shrink-0" />;
              }
              return (
                <div
                  key={`pre_${i}`}
                  className="w-10 h-13 sm:w-13 sm:h-16 md:w-15 md:h-18 shrink-0 rounded-2xl bg-white border-2 sm:border-3 border-indigo-200 text-indigo-900 font-black text-2xl sm:text-3xl md:text-4xl flex items-center justify-center shadow-xs select-none lowercase"
                >
                  {char.toLowerCase()}
                </div>
              );
            })}

            {/* The Missing Slot (Drop Target) - Bé có thể kéo chữ vào, hoặc giữ chữ trong ô kéo ra lại */}
            <div
              ref={dropSlotRef}
              className={`w-13 h-13 sm:w-15 sm:h-16 md:w-18 md:h-18 shrink-0 rounded-2xl border-2 sm:border-3 transition-all duration-150 flex items-center justify-center shadow-md relative select-none ${
                chosenLetter && activeDrag?.source !== 'slot'
                  ? 'border-indigo-500 bg-gradient-to-b from-indigo-50 to-purple-50 text-indigo-900 ring-4 ring-indigo-200 scale-105'
                  : dragOverSlot
                  ? 'border-purple-500 bg-purple-100 ring-4 ring-purple-400 scale-110 shadow-lg'
                  : 'border-dashed border-amber-400 bg-amber-50/90 hover:border-amber-500'
              }`}
            >
              {chosenLetter && activeDrag?.source !== 'slot' ? (
                <div
                  onPointerDown={(e) => handleSlotLetterPointerDown(e, chosenLetter)}
                  className="flex items-center justify-center relative w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
                  title="Nhấn giữ để kéo chữ này ra ngoài, hoặc bấm x để gỡ chữ"
                >
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black lowercase text-indigo-700 animate-in zoom-in-75">
                    {chosenLetter.toLowerCase()}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveLetter();
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-sm cursor-pointer"
                    title="Gỡ chữ"
                  >
                    ✕
                  </button>
                </div>
              ) : dragOverSlot ? (
                <div className="flex flex-col items-center justify-center animate-pulse">
                  <span className="text-[11px] sm:text-xs font-black text-purple-700 tracking-wider">
                    {activeDrag?.source === 'slot' ? 'THẢ LẠI' : chosenLetter ? 'ĐỔI CHỮ' : 'THẢ VÀO'}
                  </span>
                  <span className="text-xs">🎯</span>
                </div>
              ) : (
                <span className="text-base sm:text-lg md:text-xl font-black text-amber-600 tracking-widest">
                  ......
                </span>
              )}
            </div>

            {/* Suffix Letters */}
            {suffix && suffix.split('').map((char, i) => {
              if (char === ' ') {
                return <div key={`suf_sp_${i}`} className="w-2 sm:w-3 shrink-0" />;
              }
              return (
                <div
                  key={`suf_${i}`}
                  className="w-10 h-13 sm:w-13 sm:h-16 md:w-15 md:h-18 shrink-0 rounded-2xl bg-white border-2 sm:border-3 border-indigo-200 text-indigo-900 font-black text-2xl sm:text-3xl md:text-4xl flex items-center justify-center shadow-xs select-none lowercase"
                >
                  {char.toLowerCase()}
                </div>
              );
            })}
          </div>

          {/* DELICATE DIVIDER - Sát lại ngay dưới hàng chữ để tiết kiệm tối đa diện tích */}
          <div className="relative flex items-center justify-center w-full my-0.5 sm:my-1">
            <div className="w-full border-t border-dashed border-indigo-100" />
            <div className="absolute px-3 bg-white text-[10px] sm:text-[11px] font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5 rounded-full border border-indigo-100 py-0.5 shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span>KHAY CHỮ CÁI CHO BÉ CHỌN</span>
            </div>
          </div>

          {/* BOTTOM PART OF UNIFIED BOARD: Letter Pool Tray - Nằm sát ngay dưới divider */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            {shuffledPool.map((letter, idx) => {
              const lowerChar = letter.toLowerCase();
              const isChosen = chosenLetter?.toLowerCase() === lowerChar;
              const isBeingDragged = activeDrag?.letter === lowerChar;

              // Hiệu ứng "thẻ rời đi": khi trẻ kéo, thẻ tại khay sẽ để lại ô mờ viền nét đứt
              if (isBeingDragged) {
                return (
                  <div
                    key={`${lowerChar}_${idx}`}
                    className="w-11 h-13 sm:w-14 sm:h-16 rounded-2xl border-2 sm:border-3 border-dashed border-indigo-300 bg-indigo-50/50 text-indigo-300/40 font-black text-2xl sm:text-3xl flex items-center justify-center select-none scale-95 opacity-50 shadow-inner"
                    title="Thẻ đang được kéo đi"
                  >
                    <span className="italic">?</span>
                  </div>
                );
              }

              return (
                <div
                  key={`${lowerChar}_${idx}`}
                  onPointerDown={(e) => handleLetterPointerDown(e, lowerChar)}
                  className={`w-11 h-13 sm:w-14 sm:h-16 rounded-2xl font-black text-2xl sm:text-3xl flex items-center justify-center transition-transform duration-100 select-none lowercase shadow-sm touch-none cursor-grab active:cursor-grabbing ${
                    isChosen
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-300 scale-105 shadow-md'
                      : 'bg-white hover:bg-indigo-50 text-indigo-900 border-2 sm:border-3 border-indigo-200 hover:border-indigo-400 hover:scale-105 active:scale-95'
                  }`}
                  title={`Chữ cái ${lowerChar} - Nhấn giữ để kéo hoặc chạm để chọn`}
                >
                  <span>{lowerChar}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FLOATING DRAGGED CARD OVERLAY - Theo hướng trẻ kéo với độ nghiêng động & thẻ rời đi */}
      {activeDrag && dragPos && (
        <div
          style={{
            position: 'fixed',
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`,
            transform: `translate(-50%, -50%) rotate(${dragRotation}deg) scale(${dragOverSlot ? 1.25 : 1.15})`,
            pointerEvents: 'none',
            zIndex: 99999,
            transition: 'transform 0.04s ease-out',
          }}
          className="w-14 h-16 sm:w-16 sm:h-18 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-[0_20px_35px_-5px_rgba(79,70,229,0.55)] border-3 border-white ring-4 ring-indigo-300/80 select-none lowercase"
        >
          <span>{activeDrag.letter}</span>
          
          {/* Sparkle badge pointing to drag direction */}
          <div
            className={`absolute -top-2.5 ${dragRotation >= 0 ? '-right-2.5' : '-left-2.5'} text-amber-300 text-base filter drop-shadow animate-bounce`}
          >
            ✨
          </div>

          {/* Hint badge attached to dragged card */}
          {dragOverSlot ? (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap animate-bounce uppercase">
              {activeDrag.source === 'slot' ? 'Thả lại vào ô ↺' : chosenLetter ? 'Đổi chữ này ✓' : 'Thả vào ô ✓'}
            </div>
          ) : activeDrag.source === 'slot' ? (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white font-black text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full shadow-md whitespace-nowrap animate-pulse uppercase">
              Thả ra ngoài để gỡ ✕
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};


