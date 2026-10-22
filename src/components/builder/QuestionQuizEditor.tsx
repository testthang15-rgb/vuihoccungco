import React, { useRef, useState, useEffect } from 'react';
import { Question, QuestionOption, QuestionType, OptionImageFit } from '../../types/game';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  HelpCircle,
  Clock,
  Award,
  Sparkles,
  LayoutGrid,
  Image as ImageIcon,
  Upload,
  X,
  Play,
  Eye,
  CheckSquare,
  Square,
  Volume2,
  VolumeX,
  Maximize2,
  Sliders,
  PenTool,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { speakQuestionWithOptions, stopSpeaking, isSpeechSupported, subscribeSpeakingState } from '../../utils/speechVoice';
import { OPEN_ENDED_PRESET_TEMPLATES } from '../../data/openEndedTemplates';

interface QuestionQuizEditorProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onUpdateQuestion: (updated: Question) => void;
  onConvertToDragDrop: () => void;
}

export const QuestionQuizEditor: React.FC<QuestionQuizEditorProps> = ({
  question,
  questionIndex,
  totalQuestions,
  onUpdateQuestion,
  onConvertToDragDrop,
}) => {
  const options = question.options || [];
  const questionImageInputRef = useRef<HTMLInputElement>(null);
  const optionImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const unsub = subscribeSpeakingState((speaking) => {
      setIsSpeaking(speaking);
    });
    return () => {
      unsub();
      stopSpeaking();
    };
  }, []);

  const handleToggleVoice = () => {
    sounds.playClick();
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakQuestionWithOptions(question.title, question.options);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    onUpdateQuestion({
      ...question,
      title: newTitle,
    });
  };

  const handleQuestionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateQuestion({
          ...question,
          imageUrl: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOpenEndedBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateQuestion({
          ...question,
          openEndedBgImage: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveOpenEndedBgImage = () => {
    sounds.playClick();
    onUpdateQuestion({
      ...question,
      openEndedBgImage: undefined,
    });
  };

  const handleModelAnswerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateQuestion({
          ...question,
          modelAnswerImage: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveModelAnswerImage = () => {
    sounds.playClick();
    onUpdateQuestion({
      ...question,
      modelAnswerImage: undefined,
    });
  };

  const handleOptionImageUpload = (optId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const updatedOptions = options.map((opt) =>
          opt.id === optId
            ? {
                ...opt,
                imageUrl: dataUrl,
                imageFit: opt.imageFit || 'full', // Default to full frame so children clearly see it
              }
            : opt
        );
        onUpdateQuestion({
          ...question,
          options: updatedOptions,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOptionImageFitChange = (optId: string, fit: OptionImageFit) => {
    sounds.playClick();
    const updatedOptions = options.map((opt) =>
      opt.id === optId
        ? {
            ...opt,
            imageFit: fit,
            imageHeight: fit === 'custom' ? opt.imageHeight || 150 : opt.imageHeight,
          }
        : opt
    );
    onUpdateQuestion({
      ...question,
      options: updatedOptions,
    });
  };

  const handleOptionImageHeightChange = (optId: string, height: number) => {
    const updatedOptions = options.map((opt) =>
      opt.id === optId ? { ...opt, imageHeight: height } : opt
    );
    onUpdateQuestion({
      ...question,
      options: updatedOptions,
    });
  };

  const handleRemoveOptionImage = (optId: string) => {
    sounds.playClick();
    const updatedOptions = options.map((opt) =>
      opt.id === optId ? { ...opt, imageUrl: undefined } : opt
    );
    onUpdateQuestion({
      ...question,
      options: updatedOptions,
    });
  };

  const handleTypeChange = (newType: QuestionType) => {
    sounds.playClick();
    onUpdateQuestion({
      ...question,
      type: newType,
      timeLimit: newType === 'open_ended' && (question.timeLimit || 20) < 30 ? 45 : question.timeLimit,
    });
  };

  const handleOptionTextChange = (optId: string, newText: string) => {
    const updatedOptions = options.map((opt) =>
      opt.id === optId ? { ...opt, text: newText } : opt
    );
    onUpdateQuestion({
      ...question,
      options: updatedOptions,
    });
  };

  const handleSetCorrectOption = (optId: string) => {
    sounds.playCorrect();
    if (question.allowMultipleCorrect) {
      const updatedOptions = options.map((opt) =>
        opt.id === optId ? { ...opt, isCorrect: !opt.isCorrect } : opt
      );
      onUpdateQuestion({
        ...question,
        options: updatedOptions,
      });
    } else {
      const updatedOptions = options.map((opt) => ({
        ...opt,
        isCorrect: opt.id === optId,
      }));
      onUpdateQuestion({
        ...question,
        options: updatedOptions,
      });
    }
  };

  const handleAddOption = () => {
    sounds.playClick();
    const optLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const nextLetter = optLetters[options.length] || `Option ${options.length + 1}`;
    const newOpt: QuestionOption = {
      id: 'opt_' + Math.random().toString(36).substring(2, 7),
      text: `Đáp án ${nextLetter}`,
      isCorrect: options.length === 0,
    };
    onUpdateQuestion({
      ...question,
      options: [...options, newOpt],
    });
  };

  const handleDeleteOption = (optId: string) => {
    if (options.length <= 2) return;
    sounds.playClick();
    const remaining = options.filter((o) => o.id !== optId);
    // If deleted option was correct, make the first one correct
    if (!remaining.some((o) => o.isCorrect) && remaining.length > 0) {
      remaining[0].isCorrect = true;
    }
    onUpdateQuestion({
      ...question,
      options: remaining,
    });
  };

  const handleExplanationChange = (text: string) => {
    onUpdateQuestion({
      ...question,
      explanation: text,
    });
  };

  const handleTimeChange = (sec: number) => {
    onUpdateQuestion({
      ...question,
      timeLimit: sec,
      noTimeLimit: sec === 0,
    });
  };

  const handlePointsChange = (pts: number) => {
    onUpdateQuestion({
      ...question,
      points: pts,
    });
  };

  const optLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  if (question.type === 'html_game') {
    return (
      <div className="w-full h-full overflow-y-auto p-4 sm:p-8 bg-slate-100 flex flex-col items-center select-none">
        <div className="w-full max-w-4xl space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">
                    CÂU HỎI {questionIndex + 1} / {totalQuestions}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    🚀 TRÒ CHƠI HTML5 TƯƠNG TÁC
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-800 mt-1">
                  Trò chơi HTML5 kéo thả nghề nghiệp
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onConvertToDragDrop}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-amber-200 transition active:scale-95 cursor-pointer"
                  title="Chuyển đổi trò chơi này sang dạng kéo thả trên Canvas"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>CHUYỂN SANG CANVAS</span>
                </button>
              </div>
            </div>

            {/* Question Title */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Tiêu đề hướng dẫn trò chơi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={question.title || ''}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Nhập yêu cầu trò chơi cho bé..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:bg-white text-base font-extrabold text-slate-900 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs">

                <div>
                  <label className="block font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Điểm thưởng</span>
                  </label>
                  <select
                    value={question.points || 20}
                    onChange={(e) => handlePointsChange(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 outline-none"
                  >
                    <option value={10}>10 điểm</option>
                    <option value={20}>20 điểm</option>
                    <option value={30}>30 điểm</option>
                    <option value={50}>50 điểm</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Live Preview */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-4 h-4 text-cyan-600 fill-current" />
                  <span>Màn hình xem trước trò chơi HTML5</span>
                </h4>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Bé có thể tương tác trực tiếp kéo các thẻ nghề nghiệp vào ô U hoặc Ư trên điện thoại / máy tính bảng.
                </p>
              </div>
            </div>

            <div className="w-full h-[480px] rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner bg-slate-900">
              {question.htmlContent ? (
                <iframe
                  srcDoc={question.htmlContent}
                  title={question.title}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                  Không có mã HTML trò chơi
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-8 bg-slate-100 flex flex-col items-center select-none">
      <div className="w-full max-w-4xl space-y-6">
        {/* Banner with Type & Question Index */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                  CÂU HỎI {questionIndex + 1} / {totalQuestions}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  DẠNG TRẮC NGHIỆM
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-800 mt-1">
                Chỉnh sửa nội dung câu hỏi trắc nghiệm
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onConvertToDragDrop}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-amber-200 transition active:scale-95 cursor-pointer"
                title="Tự động tạo các ô đích và thẻ kéo trên Canvas từ câu hỏi này"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>CHUYỂN SANG DẠNG KÉO THẢ CANVAS</span>
              </button>
            </div>
          </div>

          {/* Question Title Input & Mode */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onUpdateQuestion({ ...question, allowMultipleCorrect: false });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    !question.allowMultipleCorrect
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Circle className="w-3.5 h-3.5" />
                  <span>1 đáp án đúng</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onUpdateQuestion({ ...question, allowMultipleCorrect: true });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    question.allowMultipleCorrect
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Nhiều đáp án đúng</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle question audio reading ON / OFF */}
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onUpdateQuestion({
                      ...question,
                      readQuestionAudio: question.readQuestionAudio === false ? true : false,
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer border ${
                    question.readQuestionAudio !== false
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                  }`}
                  title={
                    question.readQuestionAudio !== false
                      ? 'Đang BẬT đọc câu hỏi. Bấm để TẮT bỏ đọc câu hỏi này.'
                      : 'Đang TẮT đọc câu hỏi. Bấm để BẬT đọc câu hỏi này.'
                  }
                >
                  {question.readQuestionAudio !== false ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đọc câu hỏi: <b>BẬT</b></span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                      <span>Đọc câu hỏi: <b>TẮT</b></span>
                    </>
                  )}
                </button>

                {isSpeechSupported() && question.readQuestionAudio !== false && (
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                      isSpeaking
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>{isSpeaking ? 'Dừng đọc' : '🔊 Nghe thử'}</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
                Tiêu đề / Nội dung câu hỏi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={question.title || ''}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Nhập câu hỏi cho bé (ví dụ: Đâu là chữ Ư?)"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:bg-white text-base font-extrabold text-slate-900 outline-none transition"
              />
            </div>

            {/* Question Image Section */}
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>Ảnh minh họa cho câu hỏi (Tùy chọn)</span>
              </label>

              {question.imageUrl ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 shadow-sm">
                    <img
                      src={question.imageUrl}
                      alt="Ảnh câu hỏi"
                      className="max-h-full max-w-full object-contain rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600">
                      Đã có ảnh minh họa câu hỏi. Trẻ sẽ nhìn thấy ảnh này trên màn hình!
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => questionImageInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Đổi ảnh khác</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateQuestion({ ...question, imageUrl: undefined })}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs flex items-center gap-1.5 transition border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa ảnh</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => questionImageInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white text-slate-600 hover:text-indigo-600 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer hover:bg-indigo-50/30"
                >
                  <Upload className="w-4 h-4 text-indigo-500" />
                  <span>TẢI ẢNH CÂU HỎI TỪ MÁY TÍNH (PNG, JPG, WEBP...)</span>
                </button>
              )}

              <input
                ref={questionImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleQuestionImageUpload}
                className="hidden"
              />
            </div>

            {/* Type & Time & Points row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-black text-slate-500 uppercase tracking-wider mb-1">
                  Thể loại trắc nghiệm
                </label>
                <select
                  value={question.type}
                  onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 outline-none"
                >
                  <option value="multiple_choice">Trắc nghiệm thông thường</option>
                  <option value="open_ended">Tự luận (Bé vẽ hoặc viết vào ô trống)</option>
                  <option value="letter_recognition">Nhận biết chữ cái</option>
                  <option value="word_choice">Lựa chọn từ ngữ</option>
                  <option value="image_choice">Lựa chọn hình ảnh</option>
                  <option value="true_false">Đúng / Sai</option>
                </select>
              </div>


              <div>
                <label className="block font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Điểm thưởng</span>
                </label>
                <select
                  value={question.points || 10}
                  onChange={(e) => handlePointsChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 outline-none"
                >
                  <option value={5}>5 điểm</option>
                  <option value={10}>10 điểm</option>
                  <option value={15}>15 điểm</option>
                  <option value={20}>20 điểm</option>
                  <option value={30}>30 điểm</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Options List or Open-ended Configuration */}
        {question.type === 'open_ended' ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-purple-950 uppercase tracking-wider">
                    CẤU HÌNH CÂU HỎI TỰ LUẬN (VẼ HÌNH & VIẾT CHỮ)
                  </h4>
                  <p className="text-xs font-bold text-slate-500">
                    Trẻ sẽ có ô trống bảng vẽ và ô chữ để tự do ghi, vẽ đáp án rồi nộp bài
                  </p>
                </div>
              </div>

              <span className="text-xs font-black px-3 py-1 bg-purple-50 text-purple-700 rounded-xl border border-purple-200">
                ✏️ Cô chấm & sửa bài lúc tổng kết
              </span>
            </div>

            {/* Model Answer (Đáp án mẫu của cô: Text & Image) */}
            <div className="bg-gradient-to-br from-amber-50/80 via-emerald-50/50 to-teal-50/80 p-5 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    🎯
                  </div>
                  <div>
                    <h5 className="font-black text-xs sm:text-sm text-emerald-950 uppercase tracking-wider">
                      ĐÁP ÁN MẪU CỦA CÔ (GHI CHỮ HOẶC TẢI HÌNH ẢNH)
                    </h5>
                    <p className="text-[11px] font-bold text-emerald-800">
                      Hiển thị song song hoặc dưới ô bài làm của học sinh khi cô tổng kết để trẻ dễ dàng so sánh
                    </p>
                  </div>
                </div>

                {(question.modelAnswer || question.modelAnswerImage) && (
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ✓ Đã thiết lập đáp án mẫu
                  </span>
                )}
              </div>

              {/* 1. Ghi đáp án mẫu bằng chữ */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                  <span>📝 1. Ghi nội dung đáp án chuẩn / Lời giải mẫu (Tùy chọn):</span>
                </label>
                <textarea
                  rows={2}
                  value={question.modelAnswer || ''}
                  onChange={(e) => onUpdateQuestion({ ...question, modelAnswer: e.target.value })}
                  placeholder="Ví dụ: Chữ A gồm 2 nét xiên trái-phải và 1 nét ngang ở giữa; hoặc kết quả đúng là: Con vịt đang bơi..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-slate-400"
                />
              </div>

              {/* 2. Tải hình ảnh đáp án mẫu */}
              <div className="space-y-2 pt-1 border-t border-emerald-200/80">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>🖼️ 2. Tải hình ảnh đáp án mẫu (Chụp bài mẫu, tranh vẽ chuẩn...):</span>
                  </label>
                  {question.modelAnswerImage && (
                    <button
                      type="button"
                      onClick={handleRemoveModelAnswerImage}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa hình đáp án mẫu này</span>
                    </button>
                  )}
                </div>

                {question.modelAnswerImage ? (
                  <div className="flex items-center gap-4 bg-white p-3.5 rounded-xl border-2 border-emerald-300 shadow-xs">
                    <img
                      src={question.modelAnswerImage}
                      alt="Đáp án mẫu"
                      className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-xl border border-emerald-200 bg-slate-50 p-1 shadow-2xs shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-black text-emerald-950 block">
                        Đã có hình ảnh đáp án mẫu
                      </span>
                      <p className="text-[11px] font-bold text-emerald-700 mt-1">
                        💡 Hình ảnh này sẽ hiển thị song song ngay cạnh bài vẽ của bé ở màn hình chấm bài và màn hình chi tiết kết quả.
                      </p>
                      <label className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-black cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Thay hình ảnh khác</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleModelAnswerImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-3.5 rounded-xl border-2 border-dashed border-emerald-300 space-y-2">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                      <div>
                        <span className="text-xs font-black text-slate-700 block">
                          Tải hình chụp tranh mẫu hoặc chữ viết mẫu của cô
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          Hỗ trợ định dạng PNG, JPG, WEBP từ máy tính
                        </span>
                      </div>
                      <label className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer shrink-0">
                        <Upload className="w-4 h-4" />
                        <span>Tải ảnh đáp án mẫu</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleModelAnswerImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2 pt-1.5 border-t border-emerald-100">
                      <span className="text-xs font-bold text-slate-500 shrink-0">Hoặc dán URL ảnh:</span>
                      <input
                        type="url"
                        placeholder="https://example.com/dap-an-mau.png"
                        value={question.modelAnswerImage || ''}
                        onChange={(e) => onUpdateQuestion({ ...question, modelAnswerImage: e.target.value })}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-emerald-200 text-xs font-semibold focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Answer background image / template for child to draw and write directly on */}
            <div className="bg-purple-50/60 p-4 rounded-2xl border-2 border-purple-200 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  <span>Hình nền đáp án / Bức tranh để bé vẽ & ghi chữ đè trực tiếp lên (Không bắt buộc):</span>
                </label>
                {question.openEndedBgImage && (
                  <button
                    type="button"
                    onClick={handleRemoveOpenEndedBgImage}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa hình đáp án này</span>
                  </button>
                )}
              </div>

              {question.openEndedBgImage ? (
                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-purple-200">
                  <img
                    src={question.openEndedBgImage}
                    alt="Hình đáp án tự luận"
                    className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-lg border border-purple-200 bg-slate-50 shadow-xs shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black text-slate-800 block">
                      Đã tải hình ảnh bài tập / đáp án mẫu
                    </span>
                    <p className="text-[11px] font-bold text-purple-700 mt-1">
                      💡 Khi bé mở câu này trên điện thoại/máy tính bảng, hình ảnh này sẽ hiện sẵn trên bảng vẽ. Bé có thể dùng bút màu để khoanh tròn, nối hình, tô màu hoặc viết chữ đè trực tiếp lên tranh!
                    </p>
                    <label className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-black cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Chọn ảnh khác</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleOpenEndedBgImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-xl border-2 border-dashed border-purple-300 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div>
                      <span className="text-xs font-black text-slate-700 block">
                        Thêm hình mẫu bài tập / hình tô màu / nối nét cho bé
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        Bé sẽ vẽ & viết trực tiếp lên bức tranh này thay vì vẽ trên bảng trắng tinh.
                      </span>
                    </div>
                    <label className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer shrink-0">
                      <Upload className="w-4 h-4" />
                      <span>Tải ảnh từ máy tính</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleOpenEndedBgImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-purple-100">
                    <span className="text-xs font-bold text-slate-500 shrink-0">Hoặc dán URL ảnh:</span>
                    <input
                      type="url"
                      placeholder="https://example.com/hinh-mau.png"
                      value={question.openEndedBgImage || ''}
                      onChange={(e) => onUpdateQuestion({ ...question, openEndedBgImage: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-purple-200 text-xs font-semibold focus:outline-none focus:bg-white"
                    />
                  </div>

                  {/* Preset template sample buttons */}
                  <div className="pt-2 border-t border-purple-100">
                    <span className="text-[11px] font-black text-purple-800 uppercase block mb-2">
                      Hoặc chọn nhanh mẫu tranh mầm non có sẵn:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {OPEN_ENDED_PRESET_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            sounds.playCorrect();
                            onUpdateQuestion({ ...question, openEndedBgImage: tpl.dataUrl });
                          }}
                          className="p-2 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 hover:border-purple-300 transition text-left flex flex-col items-center text-center gap-1 cursor-pointer group"
                          title={tpl.description}
                        >
                          <span className="text-2xl group-hover:scale-110 transition">{tpl.icon}</span>
                          <span className="text-[11px] font-black text-purple-950 leading-tight">
                            {tpl.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Feature info preview card */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 rounded-2xl p-4 border border-purple-200 flex items-start gap-3">
              <span className="text-2xl shrink-0">🎨</span>
              <div className="text-xs text-purple-950 font-bold space-y-1">
                <p className="font-black text-purple-900">Tính năng hoạt động thế nào?</p>
                <p>1. <b>Học sinh:</b> Màn hình có ô trống, bảng cọ vẽ 8 màu, tẩy, xóa vẽ lại và ô nhập chữ để bé trả lời.</p>
                <p>2. <b>Giáo viên:</b> Ở màn hình kết quả câu hỏi và màn hình tổng kết, cô xem bài vẽ & chữ viết của từng bé, có nút <b>"Chấm điểm & Sửa lỗi"</b> để cho điểm và gửi lời nhận xét trực tiếp về thiết bị của trẻ!</p>
              </div>
            </div>
          </div>
        ) : (
          /* Options List */
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">
                ĐÁP ÁN ({options.length})
              </h4>

              {/* Box Size: sm, md, lg, xl */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 px-1">Cỡ ô:</span>
                {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onUpdateQuestion({ ...question, boxSize: s });
                    }}
                    className={`w-6 h-6 rounded-md text-[11px] font-black transition cursor-pointer ${
                      (question.boxSize || 'lg') === s
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Columns: 1, 2, 3, 4 */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 px-1">Lưới:</span>
                {[1, 2, 3, 4].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onUpdateQuestion({ ...question, layoutColumns: col as any });
                    }}
                    className={`w-6 h-6 rounded-md text-[11px] font-black transition cursor-pointer ${
                      (question.layoutColumns || 2) === col
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddOption}
              disabled={options.length >= 8}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm đáp án</span>
            </button>
          </div>

          <div className={`grid gap-3.5 ${
            (question.layoutColumns || 2) === 1
              ? 'grid-cols-1'
              : (question.layoutColumns || 2) === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : (question.layoutColumns || 2) === 3
              ? 'grid-cols-1 sm:grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-4'
          }`}>
            {options.map((opt, idx) => (
              <div
                key={opt.id}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
                  opt.isCorrect
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-400'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                        opt.isCorrect
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {optLetters[idx] || idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-400 truncate">
                      Đáp án {idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetCorrectOption(opt.id)}
                      className={`px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition cursor-pointer shrink-0 ${
                        opt.isCorrect
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      {opt.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ĐÚNG</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-3.5 h-3.5" />
                          <span>Chọn đúng</span>
                        </>
                      )}
                    </button>

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteOption(opt.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                        title="Xóa đáp án này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Option Image (if any) with size customizer */}
                {opt.imageUrl && (
                  <div className="mb-2.5 space-y-1.5">
                    <div
                      style={opt.imageFit === 'custom' ? { height: `${opt.imageHeight || 150}px` } : undefined}
                      className={`relative w-full rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center p-1 shadow-2xs ${
                        opt.imageFit === 'full'
                          ? 'h-44 sm:h-52'
                          : opt.imageFit === 'custom'
                          ? ''
                          : opt.imageFit === 'large'
                          ? 'h-32'
                          : opt.imageFit === 'small'
                          ? 'h-16'
                          : 'h-24'
                      }`}
                    >
                      <img
                        src={opt.imageUrl}
                        alt={opt.text}
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionImage(opt.id)}
                        className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg opacity-85 hover:opacity-100 shadow-sm transition cursor-pointer"
                        title="Xóa ảnh đáp án này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Size Selector Toolbar */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex flex-wrap items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-black text-slate-400 px-1">Cỡ:</span>
                          <button
                            type="button"
                            onClick={() => handleOptionImageFitChange(opt.id, 'small')}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                              (opt.imageFit || 'medium') === 'small'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Nhỏ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOptionImageFitChange(opt.id, 'medium')}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                              (opt.imageFit || 'medium') === 'medium'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Vừa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOptionImageFitChange(opt.id, 'large')}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                              opt.imageFit === 'large'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Lớn
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOptionImageFitChange(opt.id, 'full')}
                            className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer flex items-center gap-0.5 ${
                              opt.imageFit === 'full'
                                ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title="Hình tràn Full khung thẻ đáp án cho bé"
                          >
                            <Maximize2 className="w-2.5 h-2.5" />
                            <span>⭐ Full khung</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOptionImageFitChange(opt.id, 'custom')}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer flex items-center gap-0.5 ${
                              opt.imageFit === 'custom'
                                ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-400'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Tùy chỉnh chiều cao ảnh bằng thanh trượt"
                          >
                            <Sliders className="w-2.5 h-2.5" />
                            <span>Tùy chỉnh</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => optionImageInputRefs.current[opt.id]?.click()}
                          className="text-[10px] font-extrabold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Đổi ảnh
                        </button>
                      </div>

                      {/* Custom Height Slider when 'custom' is active */}
                      {opt.imageFit === 'custom' && (
                        <div className="flex items-center gap-2 p-1.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-950">
                          <span className="text-[10px] font-black text-purple-700 shrink-0">
                            Chiều cao:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = opt.imageHeight || 150;
                              handleOptionImageHeightChange(opt.id, Math.max(60, cur - 20));
                            }}
                            className="w-5 h-5 rounded bg-white border border-purple-200 text-purple-700 font-black text-xs flex items-center justify-center hover:bg-purple-100 cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min={60}
                            max={280}
                            step={10}
                            value={opt.imageHeight || 150}
                            onChange={(e) => handleOptionImageHeightChange(opt.id, Number(e.target.value))}
                            className="flex-1 accent-purple-600 cursor-pointer h-1.5 bg-purple-200 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const cur = opt.imageHeight || 150;
                              handleOptionImageHeightChange(opt.id, Math.min(280, cur + 20));
                            }}
                            className="w-5 h-5 rounded bg-white border border-purple-200 text-purple-700 font-black text-xs flex items-center justify-center hover:bg-purple-100 cursor-pointer"
                          >
                            +
                          </button>
                          <span className="text-[10px] font-black text-purple-800 w-11 text-right">
                            {opt.imageHeight || 150}px
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                    placeholder={`Nội dung đáp án ${optLetters[idx]}...`}
                    className={`flex-1 px-3.5 py-2.5 rounded-xl border font-bold text-sm outline-none transition ${
                      opt.isCorrect
                        ? 'border-emerald-300 bg-white text-emerald-950 font-black'
                        : 'border-slate-200 bg-slate-50 text-slate-800 focus:bg-white'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => optionImageInputRefs.current[opt.id]?.click()}
                    className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 ${
                      opt.imageUrl
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                    }`}
                    title="Tải ảnh minh họa cho đáp án này"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <input
                    ref={(el) => {
                      optionImageInputRefs.current[opt.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleOptionImageUpload(opt.id, e)}
                    className="hidden"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Explanation & Hint */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <span>Lời giải thích / Khen ngợi khi bé hoàn thành câu này</span>
          </label>
          <textarea
            value={question.explanation || ''}
            onChange={(e) => handleExplanationChange(e.target.value)}
            rows={2}
            placeholder="Ví dụ: Hoan hô bé! Sư tử có chữ Ư trong tiếng Sư đấy nhé!"
            className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:bg-white text-xs font-bold text-slate-800 outline-none transition"
          />
        </div>
      </div>
    </div>
  );
};
