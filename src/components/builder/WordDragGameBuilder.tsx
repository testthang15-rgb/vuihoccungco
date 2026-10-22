import React, { useState, useRef } from 'react';
import { Game, Question } from '../../types/game';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Copy,
  Upload,
  Image as ImageIcon,
  Volume2,
  Clock,
  Sparkles,
  MoveUp,
  MoveDown,
  CheckCircle2,
  HelpCircle,
  Eye,
  X,
  Award,
  Type,
  Sliders,
  ZoomIn,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { saveGame } from '../../services/gameStorage';
import { isSpeechSupported, speakText } from '../../utils/speechVoice';
import { PlayerWordDragQuestion } from '../player/PlayerWordDragQuestion';

interface WordDragGameBuilderProps {
  initialGame?: Game | null;
  onSaveAndExit: (game: Game) => void;
  onCancel: () => void;
}

// Sample starter template
const createDefaultWordQuestion = (index: number): Question => {
  const samples = [
    {
      title: 'Bé hãy kéo chữ cái còn thiếu vào chỗ trống để tạo thành từ "miệng" nhé!',
      targetWord: 'miệng',
      wordTemplate: '...iệng',
      missingLetters: ['m'],
      distractorLetters: ['n', 'b', 'p'],
      letterPool: ['m', 'n', 'b', 'p'],
      imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
      answerImageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80',
      answerTitle: 'Cái miệng xinh',
      explanation: 'Chữ "m" ghép với vần "iệng" tạo thành từ "miệng"!',
    },
    {
      title: 'Bé hãy kéo chữ cái còn thiếu vào chỗ trống để tạo thành từ "con mèo" nhé!',
      targetWord: 'con mèo',
      wordTemplate: 'con ...èo',
      missingLetters: ['m'],
      distractorLetters: ['n', 'đ', 'c'],
      letterPool: ['m', 'n', 'đ', 'c'],
      imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
      answerImageUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&auto=format&fit=crop&q=80',
      answerTitle: 'Con mèo con',
      explanation: 'Chữ "m" ghép với vần "èo" tạo thành từ "mèo"!',
    },
    {
      title: 'Bé hãy kéo chữ cái còn thiếu vào chỗ trống để tạo thành từ "quả dừa" nhé!',
      targetWord: 'quả dừa',
      wordTemplate: 'quả ...ừa',
      missingLetters: ['d'],
      distractorLetters: ['đ', 'b', 'g'],
      letterPool: ['d', 'đ', 'b', 'g'],
      imageUrl: 'https://images.unsplash.com/photo-1544378730-8b5104b18790?w=600&auto=format&fit=crop&q=80',
      answerImageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
      answerTitle: 'Quả dừa ngọt mát',
      explanation: 'Chữ "d" ghép với vần "ừa" tạo thành từ "dừa"!',
    },
  ];

  const sample = samples[index % samples.length];

  return {
    id: 'q_word_' + Math.random().toString(36).substring(2, 9),
    type: 'word_drag_drop',
    title: sample.title,
    targetWord: sample.targetWord,
    wordTemplate: sample.wordTemplate,
    missingLetters: sample.missingLetters,
    distractorLetters: sample.distractorLetters,
    letterPool: sample.letterPool,
    imageUrl: sample.imageUrl,
    answerImageUrl: sample.answerImageUrl,
    answerTitle: sample.answerTitle,
    explanation: sample.explanation,
    timeLimit: 0,
    noTimeLimit: true,
    points: 10,
    readQuestionAudio: true,
    options: [
      { id: 'opt_correct', text: sample.missingLetters[0], isCorrect: true },
      ...sample.distractorLetters.map((d, i) => ({
        id: `opt_dist_${i}`,
        text: d,
        isCorrect: false,
      })),
    ],
  };
};

export const WordDragGameBuilder: React.FC<WordDragGameBuilderProps> = ({
  initialGame,
  onSaveAndExit,
  onCancel,
}) => {
  // Game metadata
  const [gameTitle, setGameTitle] = useState<string>(
    initialGame?.title || 'TRÒ CHƠI KÉO THẢ Ô CHỮ: BÉ GHÉP TỪ ĐÚNG'
  );
  const [description, setDescription] = useState<string>(
    initialGame?.description || 'Bé kéo chữ cái còn thiếu vào ô trống để hoàn thành từ đúng'
  );
  const [category, setCategory] = useState<string>(initialGame?.category || 'Chữ cái');

  // Questions state
  const [questions, setQuestions] = useState<Question[]>(() => {
    if (initialGame && initialGame.questions.length > 0) {
      return JSON.parse(JSON.stringify(initialGame.questions)).map((q: Question) => ({
        ...q,
        type: 'word_drag_drop',
        missingLetters: q.missingLetters || ['m'],
        distractorLetters: q.distractorLetters || ['n', 'b', 'p'],
        letterPool: q.letterPool || [q.missingLetters?.[0] || 'm', ...(q.distractorLetters || ['n', 'b', 'p'])],
      }));
    }
    return [createDefaultWordQuestion(0), createDefaultWordQuestion(1), createDefaultWordQuestion(2)];
  });

  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const currentQ = questions[currentQIndex] || questions[0];

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Hidden File Inputs
  const questionImgInputRef = useRef<HTMLInputElement>(null);
  const answerImgInputRef = useRef<HTMLInputElement>(null);

  // Custom distractor input
  const [newDistractorInput, setNewDistractorInput] = useState('');

  // Update current question
  const updateCurrentQuestion = (updates: Partial<Question>) => {
    setQuestions((prev) => {
      const cloned = [...prev];
      if (cloned[currentQIndex]) {
        const updated = { ...cloned[currentQIndex], ...updates };

        // Synchronize options if missingLetters or distractorLetters changed
        if (updates.missingLetters || updates.distractorLetters || updates.letterPool) {
          const correct = (updated.missingLetters?.[0] || 'm').trim();
          const distractors = updated.distractorLetters || [];
          updated.options = [
            { id: 'opt_correct', text: correct, isCorrect: true },
            ...distractors.map((d, i) => ({
              id: `opt_dist_${i}`,
              text: d,
              isCorrect: false,
            })),
          ];
          if (!updated.letterPool || updated.letterPool.length === 0) {
            updated.letterPool = Array.from(new Set([correct, ...distractors]));
          }
        }

        cloned[currentQIndex] = updated;
      }
      return cloned;
    });
  };

  // Add question
  const handleAddQuestion = () => {
    sounds.playClick();
    const newQ = createDefaultWordQuestion(questions.length);
    setQuestions((prev) => [...prev, newQ]);
    setCurrentQIndex(questions.length);
  };

  // Duplicate question
  const handleDuplicateQuestion = () => {
    sounds.playClick();
    if (!currentQ) return;
    const clonedQ: Question = {
      ...JSON.parse(JSON.stringify(currentQ)),
      id: 'q_word_' + Math.random().toString(36).substring(2, 9),
      title: `${currentQ.title} (Bản sao)`,
    };
    setQuestions((prev) => {
      const next = [...prev];
      next.splice(currentQIndex + 1, 0, clonedQ);
      return next;
    });
    setCurrentQIndex(currentQIndex + 1);
  };

  // Delete question
  const handleDeleteQuestion = () => {
    if (questions.length <= 1) {
      alert('Trò chơi cần ít nhất 1 câu hỏi kéo thả ô chữ!');
      return;
    }
    sounds.playClick();
    setQuestions((prev) => prev.filter((_, idx) => idx !== currentQIndex));
    setCurrentQIndex((prev) => Math.max(0, prev - 1));
  };

  // Move up/down
  const handleMoveQuestion = (dir: 'up' | 'down') => {
    sounds.playClick();
    const targetIdx = dir === 'up' ? currentQIndex - 1 : currentQIndex + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      const temp = next[currentQIndex];
      next[currentQIndex] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
    setCurrentQIndex(targetIdx);
  };

  // Handle Question Image Upload
  const handleUploadQuestionImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateCurrentQuestion({ imageUrl: base64 });
      sounds.playCorrect();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Answer Image Upload
  const handleUploadAnswerImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateCurrentQuestion({ answerImageUrl: base64 });
      sounds.playCorrect();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Quick add distractor letter
  const handleAddDistractor = (letter: string) => {
    const clean = letter.trim().toLowerCase();
    if (!clean) return;
    sounds.playClick();
    const currentDist = currentQ.distractorLetters || [];
    if (!currentDist.includes(clean)) {
      const nextDist = [...currentDist, clean];
      const correct = currentQ.missingLetters?.[0] || 'm';
      updateCurrentQuestion({
        distractorLetters: nextDist,
        letterPool: Array.from(new Set([correct, ...nextDist])),
      });
    }
    setNewDistractorInput('');
  };

  const handleRemoveDistractor = (letter: string) => {
    sounds.playClick();
    const currentDist = (currentQ.distractorLetters || []).filter((l) => l !== letter);
    const correct = currentQ.missingLetters?.[0] || 'm';
    updateCurrentQuestion({
      distractorLetters: currentDist,
      letterPool: Array.from(new Set([correct, ...currentDist])),
    });
  };

  // Select which letter in target word is missing
  const handleSelectBlankChar = (char: string, indexInWord: number) => {
    sounds.playClick();
    const word = currentQ.targetWord || '';
    if (!word) return;
    const prefix = word.substring(0, indexInWord);
    const suffix = word.substring(indexInWord + 1);
    const template = `${prefix}...${suffix}`;

    const newDist = (currentQ.distractorLetters || []).filter((l) => l !== char);
    updateCurrentQuestion({
      missingLetters: [char],
      wordTemplate: template,
      distractorLetters: newDist,
      letterPool: Array.from(new Set([char, ...newDist])),
    });
  };

  // Save game
  const handleSave = () => {
    sounds.playCorrect();
    const finalGame: Game = {
      id: initialGame?.id || 'game_word_drag_' + Math.random().toString(36).substring(2, 9),
      title: gameTitle.trim() || 'TRÒ CHƠI KÉO THẢ Ô CHỮ',
      description: description.trim() || 'Bé kéo chữ cái còn thiếu vào ô trống để hoàn thành từ đúng',
      category: category || 'Chữ cái',
      theme: 'purple',
      gameType: 'word_drag_drop',
      createdAt: initialGame?.createdAt || Date.now(),
      updatedAt: Date.now(),
      playCount: initialGame?.playCount || 0,
      questions: questions,
      settings: initialGame?.settings || {
        timePerQuestion: 0,
        speedBonus: true,
        maxTeams: 6,
        soundEffects: true,
      },
    };

    saveGame(finalGame);
    onSaveAndExit(finalGame);
  };

  // Vietnamese alphabet suggestions
  const VIETNAMESE_ALPHABET = ['a', 'ă', 'â', 'b', 'c', 'd', 'đ', 'e', 'ê', 'g', 'h', 'i', 'k', 'l', 'm', 'n', 'o', 'ô', 'ơ', 'p', 'q', 'r', 's', 't', 'u', 'ư', 'v', 'x', 'y'];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 select-none overflow-hidden">
      {/* Hidden File Inputs */}
      <input
        ref={questionImgInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadQuestionImage}
        className="hidden"
      />
      <input
        ref={answerImgInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadAnswerImage}
        className="hidden"
      />

      {/* Top Navigation Bar */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-pink-600 text-white flex items-center justify-between gap-3 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onCancel();
            }}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition cursor-pointer flex items-center gap-1.5 text-xs font-black"
            title="Quay lại danh sách trò chơi"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-400 text-purple-950">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-purple-200">
                TRÌNH SOẠN THẢO TRÒ CHƠI
              </div>
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                placeholder="Nhập tên trò chơi kéo thả ô chữ..."
                className="font-black text-sm sm:text-base bg-transparent border-b border-transparent hover:border-white/40 focus:border-white focus:outline-none transition w-64 sm:w-80 md:w-96 text-white truncate"
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setIsPreviewOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
            title="Xem trước giao diện học sinh chơi"
          >
            <Eye className="w-4 h-4 text-amber-300" />
            <span className="hidden md:inline">Xem trước</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>LƯU TRÒ CHƠI</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout: Questions Sidebar + Question Editor */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Question List */}
        <div className="w-64 sm:w-72 bg-white border-r-2 border-slate-200 flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-black uppercase text-slate-700">
              DANH SÁCH CÂU HỎI ({questions.length})
            </span>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm câu</span>
            </button>
          </div>

          {/* Question cards list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {questions.map((q, idx) => {
              const isSelected = idx === currentQIndex;
              const correct = q.missingLetters?.[0] || 'm';

              return (
                <div
                  key={q.id || idx}
                  onClick={() => {
                    sounds.playClick();
                    setCurrentQIndex(idx);
                  }}
                  className={`p-2.5 rounded-2xl border-2 transition cursor-pointer relative group ${
                    isSelected
                      ? 'bg-purple-50/80 border-purple-500 shadow-md ring-2 ring-purple-200'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      CÂU {idx + 1}
                    </span>
                    <span className="text-[11px] font-black text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                      Chữ: <b>{correct.toUpperCase()}</b>
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-800 line-clamp-1 mb-1">
                    {q.title}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <span>Từ: <b>{q.wordTemplate || q.targetWord}</b></span>
                    {q.answerImageUrl && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        Có ảnh đáp án
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Question control buttons at bottom of sidebar */}
          <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => handleMoveQuestion('up')}
              disabled={currentQIndex === 0}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Di chuyển lên"
            >
              <MoveUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleMoveQuestion('down')}
              disabled={currentQIndex === questions.length - 1}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Di chuyển xuống"
            >
              <MoveDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDuplicateQuestion}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Nhân bản câu này"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDeleteQuestion}
              className="p-1.5 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Xóa câu hỏi này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT AREA: Full Question Editor */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/70">
          <div className="max-w-4xl mx-auto space-y-4">
            
            {/* Header info */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-black text-xs uppercase">
                  CÂU HỎI {currentQIndex + 1}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  KÉO THẢ Ô CHỮ VÀO TỪ CÒN THIẾU
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>Thời gian:</span>
                  <select
                    value={currentQ.noTimeLimit ? 0 : currentQ.timeLimit}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateCurrentQuestion({
                        noTimeLimit: val === 0,
                        timeLimit: val,
                      });
                    }}
                    className="px-2 py-1 rounded-xl bg-slate-100 border border-slate-300 font-bold text-xs text-slate-800"
                  >
                    <option value={0}>Không tính giờ (cô bấm kết thúc)</option>
                    <option value={15}>15 giây</option>
                    <option value={20}>20 giây</option>
                    <option value={30}>30 giây</option>
                    <option value={45}>45 giây</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 1: NỘI DUNG CÂU HỎI BÊN TRÊN & HÌNH ẢNH MINH HỌA */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-indigo-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-indigo-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>1. NỘI DUNG CÂU HỎI BÊN TRÊN (KÈM HÌNH ẢNH MINH HỌA)</span>
                </label>
                {isSpeechSupported() && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      speakText(currentQ.title);
                    }}
                    className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Nghe cô đọc thử câu hỏi"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Nghe thử</span>
                  </button>
                )}
              </div>

              {/* Title input */}
              <input
                type="text"
                value={currentQ.title}
                onChange={(e) => updateCurrentQuestion({ title: e.target.value })}
                placeholder="Nhập yêu cầu câu hỏi cho trẻ (VD: Bé hãy kéo chữ cái còn thiếu vào chỗ trống...)"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border-2 border-slate-200 font-bold text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />

              {/* Question Illustration Image Upload */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {currentQ.imageUrl ? (
                    <div
                      className="relative rounded-2xl bg-white border-2 border-indigo-200 overflow-hidden shadow-xs shrink-0 flex items-center justify-center p-1 transition-all"
                      style={{
                        height: `${Math.min(140, Math.max(90, (currentQ.imageHeight || (currentQ.imageSize === 'sm' ? 120 : currentQ.imageSize === 'lg' ? 250 : currentQ.imageSize === 'xl' ? 340 : 180)) * 0.6))}px`,
                        width: `${Math.min(180, Math.max(100, (currentQ.imageHeight || (currentQ.imageSize === 'sm' ? 120 : currentQ.imageSize === 'lg' ? 250 : currentQ.imageSize === 'xl' ? 340 : 180)) * 0.8))}px`,
                      }}
                    >
                      <img
                        src={currentQ.imageUrl}
                        alt="Ảnh câu hỏi"
                        className="max-h-full max-w-full object-contain rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => updateCurrentQuestion({ imageUrl: undefined })}
                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white shadow hover:bg-rose-600 transition"
                        title="Xóa hình ảnh"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-2xl bg-white border-2 border-dashed border-indigo-300 flex flex-col items-center justify-center text-slate-400 p-2 text-center shrink-0">
                      <ImageIcon className="w-6 h-6 mb-1 text-indigo-400" />
                      <span className="text-[10px] font-bold">Chưa có ảnh câu hỏi</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => questionImgInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tải ảnh câu hỏi từ máy tính</span>
                      </button>

                      {currentQ.imageUrl && (
                        <button
                          type="button"
                          onClick={() => updateCurrentQuestion({ imageUrl: undefined })}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-600 font-bold text-xs transition cursor-pointer"
                        >
                          Xóa ảnh
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={currentQ.imageUrl || ''}
                      onChange={(e) => updateCurrentQuestion({ imageUrl: e.target.value })}
                      placeholder="Hoặc dán đường link ảnh (URL) tại đây..."
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                    />
                    <p className="text-[11px] font-semibold text-slate-500">
                      Hình ảnh minh họa câu hỏi sẽ hiển thị ở ngay dưới câu hỏi giúp trẻ quan sát và ghép từ chính xác.
                    </p>
                  </div>
                </div>

                {/* Chỉnh kích cỡ hình minh họa */}
                {currentQ.imageUrl && (
                  <div className="pt-2.5 border-t border-indigo-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white/70 p-2.5 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-black text-indigo-900">
                      <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Kích cỡ hình minh họa:</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { key: 'sm', label: 'Nhỏ', height: 120 },
                        { key: 'md', label: 'Vừa', height: 180 },
                        { key: 'lg', label: 'Lớn', height: 250 },
                        { key: 'xl', label: 'Rất lớn', height: 340 },
                      ].map((sz) => {
                        const currentH = currentQ.imageHeight || (currentQ.imageSize === 'sm' ? 120 : currentQ.imageSize === 'lg' ? 250 : currentQ.imageSize === 'xl' ? 340 : 180);
                        const active = (currentQ.imageHeight === sz.height) || (!currentQ.imageHeight && (currentQ.imageSize === sz.key || (sz.key === 'md' && !currentQ.imageSize)));
                        return (
                          <button
                            key={sz.key}
                            type="button"
                            onClick={() => updateCurrentQuestion({ imageSize: sz.key as any, imageHeight: sz.height })}
                            className={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                              active
                                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                                : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200'
                            }`}
                          >
                            {sz.label} ({sz.height}px)
                          </button>
                        );
                      })}

                      {/* Range slider for fine tuning */}
                      <div className="flex items-center gap-1.5 ml-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                        <input
                          type="range"
                          min={80}
                          max={400}
                          step={10}
                          value={currentQ.imageHeight || (currentQ.imageSize === 'sm' ? 120 : currentQ.imageSize === 'lg' ? 250 : currentQ.imageSize === 'xl' ? 340 : 180)}
                          onChange={(e) => updateCurrentQuestion({ imageHeight: Number(e.target.value) })}
                          className="w-20 sm:w-24 accent-indigo-600 cursor-pointer"
                          title="Kéo thanh trượt để tinh chỉnh chiều cao ảnh"
                        />
                        <span className="text-[11px] font-black text-indigo-700 min-w-[42px] text-right">
                          {currentQ.imageHeight || (currentQ.imageSize === 'sm' ? 120 : currentQ.imageSize === 'lg' ? 250 : currentQ.imageSize === 'xl' ? 340 : 180)}px
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: CẤU HÌNH TỪ CÒN THIẾU & CHỌN CHỮ KÉO THẢ */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-indigo-100 shadow-sm space-y-4">
              <label className="text-xs font-black uppercase text-indigo-700 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-purple-600" />
                <span>2. TỪ CẦN HOÀN THIỆN & CÁC CHỮ CÁI CHO TRẺ KÉO</span>
              </label>

              {/* Target Word Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Từ hoàn chỉnh (đầy đủ):
                  </label>
                  <input
                    type="text"
                    value={currentQ.targetWord || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateCurrentQuestion({ targetWord: val });
                    }}
                    placeholder="VD: miệng, con mèo, quả dừa..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border-2 border-slate-200 font-black text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Mẫu từ hiển thị (dùng <code className="bg-purple-100 text-purple-800 px-1 rounded">...</code> cho chỗ trống):
                  </label>
                  <input
                    type="text"
                    value={currentQ.wordTemplate || ''}
                    onChange={(e) => updateCurrentQuestion({ wordTemplate: e.target.value })}
                    placeholder="VD: ...iệng hoặc con ...èo hoặc quả ...ừa"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border-2 border-slate-200 font-black text-sm text-purple-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Visual Letter Picker: Click any letter in the target word to make it the blank slot! */}
              {currentQ.targetWord && currentQ.targetWord.trim().length > 0 && (
                <div className="p-3.5 rounded-2xl bg-purple-50/70 border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-purple-900">
                      👉 BẤM VÀO CHỮ CÁI DƯỚI ĐÂY ĐỂ ĐẶT LÀM Ô TRỐNG [ ? ]:
                    </span>
                    <span className="text-[11px] font-bold text-purple-600 bg-white px-2 py-0.5 rounded-lg border border-purple-200">
                      Chữ đúng hiện tại: <b>{(currentQ.missingLetters?.[0] || 'm').toUpperCase()}</b>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentQ.targetWord.split('').map((char, charIdx) => {
                      if (char === ' ') {
                        return <span key={charIdx} className="w-4 text-center font-bold text-slate-400">·</span>;
                      }
                      const isCurrentMissing = currentQ.missingLetters?.[0]?.toLowerCase() === char.toLowerCase();

                      return (
                        <button
                          key={charIdx}
                          type="button"
                          onClick={() => handleSelectBlankChar(char, charIdx)}
                          className={`w-11 h-12 rounded-xl font-black text-lg transition active:scale-95 cursor-pointer flex flex-col items-center justify-center uppercase shadow-2xs ${
                            isCurrentMissing
                              ? 'bg-purple-600 text-white ring-4 ring-purple-300 scale-105'
                              : 'bg-white hover:bg-purple-100 text-slate-800 border-2 border-purple-200'
                          }`}
                          title={`Bấm để chọn chữ "${char}" làm ô trống`}
                        >
                          <span>{char}</span>
                          <span className="text-[8px] font-extrabold opacity-75">
                            {isCurrentMissing ? 'Ô TRỐNG' : 'CHỌN'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Letter Pool Configuration */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700">
                    CÁC CHỮ CÁI CHO BÉ KÉO VÀO Ô:
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Bao gồm 1 chữ đúng và các chữ gây nhiễu
                  </span>
                </div>

                {/* Display letters in the tray */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Correct Letter */}
                  <div className="px-3.5 py-2 rounded-2xl bg-emerald-100 border-2 border-emerald-400 text-emerald-900 font-black text-sm flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Chữ đúng: <b>{(currentQ.missingLetters?.[0] || 'm').toUpperCase()}</b></span>
                  </div>

                  {/* Distractor Letters */}
                  {(currentQ.distractorLetters || []).map((letter) => (
                    <div
                      key={letter}
                      className="px-3 py-1.5 rounded-2xl bg-white border-2 border-slate-300 text-slate-800 font-black text-sm flex items-center gap-1.5 shadow-2xs group"
                    >
                      <span className="uppercase">{letter}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDistractor(letter)}
                        className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-0.5"
                        title="Xóa chữ này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Quick Add Letter from Vietnamese Alphabet */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">
                    Bấm nhanh để thêm chữ cái gây nhiễu:
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {VIETNAMESE_ALPHABET.map((char) => {
                      const isAlreadyIn = (currentQ.distractorLetters || []).includes(char) || currentQ.missingLetters?.[0] === char;
                      return (
                        <button
                          key={char}
                          type="button"
                          onClick={() => handleAddDistractor(char)}
                          disabled={isAlreadyIn}
                          className={`w-7 h-7 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                            isAlreadyIn
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                              : 'bg-white hover:bg-indigo-600 hover:text-white text-slate-700 border border-slate-300 active:scale-95 shadow-2xs'
                          }`}
                        >
                          {char}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: PHẦN ĐÁP ÁN CHO THÊM HÌNH ẢNH UPLOAD LÊN */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-emerald-200 shadow-sm space-y-3">
              <label className="text-xs font-black uppercase text-emerald-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>3. PHẦN ĐÁP ÁN: THÊM HÌNH ẢNH UPLOAD LÊN (HIỂN THỊ KHI TRẺ HOÀN THÀNH ĐÚNG) ⭐</span>
              </label>

              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col sm:flex-row items-center gap-4">
                {currentQ.answerImageUrl ? (
                  <div className="relative w-32 h-32 rounded-2xl bg-white border-2 border-emerald-300 overflow-hidden shadow-xs shrink-0 flex items-center justify-center p-1">
                    <img
                      src={currentQ.answerImageUrl}
                      alt="Ảnh đáp án"
                      className="max-h-full max-w-full object-contain rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => updateCurrentQuestion({ answerImageUrl: undefined })}
                      className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white shadow hover:bg-rose-600 transition"
                      title="Xóa ảnh đáp án"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-white border-2 border-dashed border-emerald-300 flex flex-col items-center justify-center text-slate-400 p-2 text-center shrink-0">
                    <Award className="w-8 h-8 mb-1 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-700">Chưa có ảnh đáp án</span>
                  </div>
                )}

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => answerImgInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh đáp án từ máy tính lên</span>
                    </button>

                    {currentQ.answerImageUrl && (
                      <button
                        type="button"
                        onClick={() => updateCurrentQuestion({ answerImageUrl: undefined })}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-600 font-bold text-xs transition cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={currentQ.answerImageUrl || ''}
                    onChange={(e) => updateCurrentQuestion({ answerImageUrl: e.target.value })}
                    placeholder="Hoặc dán đường link ảnh đáp án (URL) tại đây..."
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
                  />

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                      Tên / Chú thích đáp án (VD: Cái miệng xinh, Con mèo ngoan...):
                    </label>
                    <input
                      type="text"
                      value={currentQ.answerTitle || ''}
                      onChange={(e) => updateCurrentQuestion({ answerTitle: e.target.value })}
                      placeholder="VD: Cái miệng xinh xắn"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Explanation field */}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Lời khen / Giải thích thêm cho bé khi ghép đúng:
                </label>
                <input
                  type="text"
                  value={currentQ.explanation || ''}
                  onChange={(e) => updateCurrentQuestion({ explanation: e.target.value })}
                  placeholder="VD: Chữ m ghép với vần iệng tạo thành từ miệng. Bé rất giỏi!"
                  className="w-full px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 font-medium text-xs text-slate-800 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* STUDENT PLAY PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden border-4 border-indigo-200">
            <div className="px-5 py-3 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-300" />
                <span className="font-black text-sm uppercase">
                  XEM TRƯỚC MÀN HÌNH HỌC SINH CHƠI
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white font-black text-xs transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="flex-1 min-h-0 bg-slate-100 p-2 sm:p-4 overflow-hidden flex flex-col">
              <PlayerWordDragQuestion
                question={currentQ}
                questionIndex={currentQIndex}
                totalQuestions={questions.length}
                startTime={Date.now()}
                timeLimit={currentQ.timeLimit || 0}
                onSubmitLetter={(letter, isCorrect) => {
                  console.log('Preview answer:', letter, isCorrect);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
