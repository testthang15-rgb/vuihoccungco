import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, AlertTriangle, Volume2, VolumeX, CheckSquare, Square, Sparkles } from 'lucide-react';
import { Question, TeamAnswer } from '../../types/game';
import { sounds } from '../../utils/sound';
import { realtime } from '../../services/realtimeClient';
import { speakQuestionWithOptions, stopSpeaking, isSpeechSupported, subscribeSpeakingState, unlockSpeechAudio } from '../../utils/speechVoice';

interface PlayerQuestionProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  startTime: number | null;
  timeLimit: number;
  existingAnswer?: TeamAnswer;
  onSubmitAnswer: (answerId: string, answerIds?: string[]) => void;
}

export const PlayerQuestion: React.FC<PlayerQuestionProps> = ({
  question,
  questionIndex,
  totalQuestions,
  startTime,
  timeLimit,
  existingAnswer,
  onSubmitAnswer,
}) => {
  const isMultiple = Boolean(question.allowMultipleCorrect);
  const [selectedOptId, setSelectedOptId] = useState<string | null>(existingAnswer ? existingAnswer.answerId : null);
  const [selectedOptIds, setSelectedOptIds] = useState<string[]>(() => {
    if (existingAnswer?.answerIds && existingAnswer.answerIds.length > 0) {
      return existingAnswer.answerIds;
    }
    if (existingAnswer?.answerId) {
      return existingAnswer.answerId.split(',');
    }
    return [];
  });
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(Boolean(existingAnswer));
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  // Theo yêu cầu: mặc định không tính giờ trả lời câu hỏi
  const isNoTimeLimit = true;
  const effectiveStart = startTime || realtime.getServerNow();

  // Untimed answering: timer is static/disabled
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const selectedOptIdRef = useRef(selectedOptId);
  selectedOptIdRef.current = selectedOptId;
  const selectedOptIdsRef = useRef(selectedOptIds);
  selectedOptIdsRef.current = selectedOptIds;
  const hasSubmittedRef = useRef(hasSubmitted);
  hasSubmittedRef.current = hasSubmitted;

  // Auto-submit selected option when unmounted if not submitted yet
  useEffect(() => {
    return () => {
      if (!hasSubmittedRef.current) {
        if (selectedOptIdsRef.current.length > 0) {
          onSubmitAnswer(selectedOptIdsRef.current.join(','), selectedOptIdsRef.current);
        } else if (selectedOptIdRef.current) {
          onSubmitAnswer(selectedOptIdRef.current, [selectedOptIdRef.current]);
        }
      }
    };
  }, [onSubmitAnswer]);

  useEffect(() => {
    if (existingAnswer) {
      setSelectedOptId(existingAnswer.answerId);
      if (existingAnswer.answerIds) {
        setSelectedOptIds(existingAnswer.answerIds);
      }
      setHasSubmitted(true);
    }
  }, [existingAnswer]);

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
    if (question && question.readQuestionAudio !== false && !existingAnswer) {
      unlockSpeechAudio();
      const autoTimer = setTimeout(() => {
        if (!hasSubmittedRef.current) {
          speakQuestionWithOptions(question.title, question.options);
        }
      }, 150);
      return () => {
        clearTimeout(autoTimer);
        stopSpeaking();
      };
    }
    return () => {
      stopSpeaking();
    };
  }, [questionIndex, question.id, existingAnswer]);

  // Read aloud automatically if question specifies or let child tap
  const handleToggleSpeak = () => {
    sounds.playClick();
    unlockSpeechAudio();
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakQuestionWithOptions(question.title, question.options);
    }
  };

  // Single choice: select and submit immediately
  const handleSelectSingleOption = (optId: string) => {
    setSelectedOptId(optId);
    setHasSubmitted(true);
    stopSpeaking();
    sounds.playClick();

    onSubmitAnswer(optId, [optId]);
  };

  // Multiple choice: toggle option selection and auto record immediately
  const handleToggleMultipleOption = (optId: string) => {
    sounds.playClick();
    stopSpeaking();
    const nextSelected = selectedOptIds.includes(optId)
      ? selectedOptIds.filter((id) => id !== optId)
      : [...selectedOptIds, optId];

    setSelectedOptIds(nextSelected);
    setHasSubmitted(nextSelected.length > 0);

    if (nextSelected.length > 0) {
      onSubmitAnswer(nextSelected.join(','), nextSelected);
    }
  };

  const isTimedOut = false;

  // Cheerful pastel color schemes for preschool buttons
  const buttonColors = [
    { bg: 'bg-rose-500 hover:bg-rose-600', text: 'text-white' },
    { bg: 'bg-sky-500 hover:bg-sky-600', text: 'text-white' },
    { bg: 'bg-emerald-500 hover:bg-emerald-600', text: 'text-white' },
    { bg: 'bg-amber-500 hover:bg-amber-600', text: 'text-white' },
  ];

  return (
    <div className="max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto w-full px-3 sm:px-6 py-2 sm:py-4 flex flex-col justify-between min-h-[85vh] sm:min-h-[88vh] touch-manipulation flex-1">
      {/* Top Header with question info */}
      <div className="flex items-center justify-between bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-slate-100 shadow-sm mb-3 sm:mb-5">
        <span className="text-xs sm:text-sm font-black text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-200">
          CÂU {questionIndex + 1} / {totalQuestions}
        </span>

        {/* Text to Speech Button for Children (chỉ hiện khi câu hỏi có bật đọc câu hỏi) */}
        {isSpeechSupported() && question.readQuestionAudio !== false && (
          <button
            type="button"
            onClick={handleToggleSpeak}
            className={`px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
              isSpeaking
                ? 'bg-rose-500 text-white animate-pulse shadow-md'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
            title="Đọc câu hỏi to rõ ràng cho các bé nghe"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isSpeaking ? 'Dừng đọc' : '🔊 Đọc câu hỏi'}</span>
          </button>
        )}

        <span className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-purple-700 bg-purple-50 border border-purple-200 px-3.5 py-1.5 rounded-xl">
          <Clock className="w-3.5 h-3.5 text-purple-500" />
          <span>Không tính giờ</span>
        </span>
      </div>

      {/* Question Content */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 md:p-8 border-2 border-indigo-100 shadow-lg text-center mb-4 sm:mb-6">
        {question.imageUrl && (() => {
          const resolvedHeight = question.imageHeight || (
            question.imageSize === 'sm' ? 140 :
            question.imageSize === 'lg' ? 280 :
            question.imageSize === 'xl' ? 360 : 210
          );
          return (
            <div
              style={{ maxHeight: `${resolvedHeight + 20}px` }}
              className="mb-3 flex items-center justify-center overflow-hidden rounded-2xl bg-slate-50 border border-slate-200 p-1.5 max-w-xl mx-auto"
            >
              <img
                src={question.imageUrl}
                alt="Minh họa câu hỏi"
                style={{ maxHeight: `${resolvedHeight}px` }}
                className="max-w-full object-contain rounded-xl transition-all"
              />
            </div>
          );
        })()}

        <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 leading-snug tracking-tight">
          {question.title}
        </h3>

        {/* Indicator & Status banner for single or multiple correct answers */}
        {isMultiple ? (
          selectedOptIds.length > 0 ? (
            <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 flex items-center justify-center gap-2 font-black text-xs sm:text-sm md:text-base animate-pulse-subtle">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
              <span>Đã chọn {selectedOptIds.length} đáp án · Bé có thể chọn thêm hoặc chạm lại để đổi trước khi hết giờ ⭐</span>
            </div>
          ) : isTimedOut ? (
            <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 flex items-center justify-center gap-2 font-black text-sm sm:text-base">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 shrink-0" />
              <span>Đã hết thời gian câu này rồi!</span>
            </div>
          ) : (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs sm:text-sm font-black">
              <span>✨ Câu hỏi nhiều đáp án đúng: Bé chạm chọn tất cả các tranh đúng nhé!</span>
            </div>
          )
        ) : hasSubmitted ? (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 flex items-center justify-center gap-2 font-black text-sm sm:text-base animate-pulse-subtle">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
            <span>Đã tự động ghi nhận câu trả lời của bé! Chờ cô công bố đáp án nhé ⭐</span>
          </div>
        ) : isTimedOut ? (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 flex items-center justify-center gap-2 font-black text-sm sm:text-base">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 shrink-0" />
            <span>Đã hết thời gian câu này rồi!</span>
          </div>
        ) : (
          <div className="mt-2.5 text-xs sm:text-sm font-bold text-slate-500">
            👉 Chạm vào 1 đáp án to bên dưới để hệ thống tự ghi nhận nhé!
          </div>
        )}
      </div>

      {/* Touch Answer Buttons - Colors are preserved at all times without color switching */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 md:gap-6 mb-4 sm:mb-6 flex-1">
        {question.options.map((opt, idx) => {
          const color = buttonColors[idx % buttonColors.length];
          const isSelected = isMultiple ? selectedOptIds.includes(opt.id) : selectedOptId === opt.id;
          const isTimeExpired = !isNoTimeLimit && timeLeft <= 0;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isTimeExpired}
              onClick={() => {
                if (isMultiple) {
                  handleToggleMultipleOption(opt.id);
                } else {
                  handleSelectSingleOption(opt.id);
                }
              }}
              className={`min-h-[90px] sm:min-h-[130px] md:min-h-[155px] lg:min-h-[175px] p-4 sm:p-6 md:p-8 rounded-3xl font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl transition-all transform flex flex-col items-center justify-center text-center shadow-lg active:scale-95 touch-manipulation relative ${color.bg} ${color.text} ${
                isSelected
                  ? 'ring-4 ring-offset-2 ring-white scale-[1.03] shadow-2xl z-10'
                  : 'hover:scale-[1.01]'
              } ${isTimeExpired ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
            >
              {/* Checkmark or checkbox indicator for selected option while keeping original color */}
              {isMultiple ? (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white">
                  {isSelected ? (
                    <div className="w-8 h-8 rounded-xl bg-white/30 backdrop-blur-sm border-2 border-white flex items-center justify-center shadow-sm">
                      <CheckSquare className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-black/10 border-2 border-white/50 flex items-center justify-center">
                      <Square className="w-5 h-5 text-white/70" />
                    </div>
                  )}
                </div>
              ) : isSelected ? (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm border-2 border-white flex items-center justify-center text-white shadow-sm">
                  <CheckCircle2 className="w-6 h-6 text-white stroke-[3]" />
                </div>
              ) : null}

              {opt.imageUrl && (
                <img
                  src={opt.imageUrl}
                  alt={opt.text}
                  style={opt.imageFit === 'custom' ? { height: `${opt.imageHeight || 150}px` } : undefined}
                  className={`object-contain rounded-xl mb-2 pointer-events-none ${
                    opt.imageFit === 'full'
                      ? 'w-full max-h-36 sm:max-h-56 md:max-h-64 bg-white/95 p-1 shadow-xs'
                      : opt.imageFit === 'custom'
                      ? 'w-full bg-white/95 p-1 shadow-xs'
                      : opt.imageFit === 'large'
                      ? 'max-h-28 sm:max-h-36 max-w-[90%] bg-white/90 p-1'
                      : opt.imageFit === 'small'
                      ? 'max-h-12 sm:max-h-16 max-w-[70%]'
                      : 'max-h-20 sm:max-h-28 max-w-[80%] bg-white/90 p-0.5'
                  }`}
                />
              )}
              <span className="line-clamp-2">{opt.text}</span>
            </button>
          );
        })}
      </div>

      <div className="text-center py-1 text-[11px] font-bold text-slate-400">
        Vui Học Cùng Cô · Đồng bộ thời gian thực
      </div>
    </div>
  );
};
