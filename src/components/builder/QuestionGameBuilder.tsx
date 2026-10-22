import React, { useState, useRef, useEffect } from 'react';
import { Game, Question, QuestionOption } from '../../types/game';
import { saveGame } from '../../services/gameStorage';
import { sounds } from '../../utils/sound';
import { ASSET_LIBRARY } from '../../data/assetLibrary';
import { OPEN_ENDED_PRESET_TEMPLATES } from '../../data/openEndedTemplates';
import { speakQuestionWithOptions, stopSpeaking, isSpeechSupported, subscribeSpeakingState } from '../../utils/speechVoice';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Copy,
  HelpCircle,
  Clock,
  Award,
  Image as ImageIcon,
  Upload,
  X,
  Eye,
  CheckCircle2,
  CheckSquare,
  Square,
  Circle,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  FolderOpen,
  Info,
  Maximize2,
  Sliders,
  PenTool,
  ChevronUp,
  ChevronDown,
  MoveUp,
  MoveDown,
} from 'lucide-react';

interface QuestionGameBuilderProps {
  initialGame?: Game | null;
  onSaveAndExit: (game: Game) => void;
  onCancel: () => void;
}

export const QuestionGameBuilder: React.FC<QuestionGameBuilderProps> = ({
  initialGame,
  onSaveAndExit,
  onCancel,
}) => {
  // Game metadata
  const [gameTitle, setGameTitle] = useState<string>(initialGame?.title || 'BỘ CÂU HỎI ĐỐ VUI CHO BÉ');
  const [description, setDescription] = useState<string>(
    initialGame?.description || 'Bộ câu hỏi trắc nghiệm hình ảnh và giọng đọc dành cho các bé'
  );
  const [category, setCategory] = useState<string>(initialGame?.category || 'Chữ cái');
  const [targetAge, setTargetAge] = useState<string>(initialGame?.targetAge || '5-6 tuổi');
  const [maxTeams, setMaxTeams] = useState<number>(initialGame?.settings?.maxTeams || 8);

  // Questions stack
  const [questions, setQuestions] = useState<Question[]>(() => {
    if (initialGame && initialGame.questions.length > 0) {
      return JSON.parse(JSON.stringify(initialGame.questions));
    }
    // Default preschool starter questions
    return [
      {
        id: 'q_' + Date.now() + '_1',
        title: 'Bé hãy tìm con vật nào dưới đây biết bơi dưới nước?',
        type: 'multiple_choice',
        allowMultipleCorrect: true,
        readQuestionAudio: true,
        timeLimit: 25,
        points: 10,
        explanation: 'Hoan hô bé! Con vịt và con cá đều biết bơi dưới nước rất giỏi đấy!',
        options: [
          { id: 'opt_1', text: 'Con vịt', isCorrect: true },
          { id: 'opt_2', text: 'Con mèo', isCorrect: false },
          { id: 'opt_3', text: 'Con cá', isCorrect: true },
          { id: 'opt_4', text: 'Con gà', isCorrect: false },
        ],
      },
      {
        id: 'q_' + Date.now() + '_2',
        title: 'Quả nào có màu đỏ khi chín?',
        type: 'multiple_choice',
        allowMultipleCorrect: false,
        readQuestionAudio: true,
        timeLimit: 0,
        noTimeLimit: true,
        points: 10,
        explanation: 'Đúng rồi, quả táo khi chín có màu đỏ tươi ngon tuyệt!',
        options: [
          { id: 'opt_21', text: 'Quả táo', isCorrect: true },
          { id: 'opt_22', text: 'Quả chuối', isCorrect: false },
          { id: 'opt_23', text: 'Quả chanh', isCorrect: false },
        ],
      },
    ];
  });

  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const currentQuestion = questions[currentQIndex] || questions[0];

  // Speech test state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Asset library picker modal state
  const [assetModalTarget, setAssetModalTarget] = useState<'question' | string | null>(null);

  // Preview modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const questionImageInputRef = useRef<HTMLInputElement>(null);
  const optionImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const handleUpdateCurrentQuestion = (updated: Partial<Question>) => {
    setQuestions((prev) => {
      const cloned = [...prev];
      if (cloned[currentQIndex]) {
        cloned[currentQIndex] = { ...cloned[currentQIndex], ...updated };
      }
      return cloned;
    });
  };

  // Add a new multiple choice question
  const handleAddQuestion = () => {
    sounds.playClick();
    const newQ: Question = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: `Câu hỏi số ${questions.length + 1}`,
      type: 'multiple_choice',
      allowMultipleCorrect: false,
      readQuestionAudio: true,
      timeLimit: 0,
      noTimeLimit: true,
      points: 10,
      explanation: 'Bé đã trả lời rất xuất sắc!',
      options: [
        { id: 'opt_' + Date.now() + '_1', text: 'Đáp án A', isCorrect: true },
        { id: 'opt_' + Date.now() + '_2', text: 'Đáp án B', isCorrect: false },
        { id: 'opt_' + Date.now() + '_3', text: 'Đáp án C', isCorrect: false },
      ],
    };

    setQuestions((prev) => [...prev, newQ]);
    setCurrentQIndex(questions.length);
  };

  // Add a new open-ended essay question (bé vẽ hình & viết chữ)
  const handleAddOpenEndedQuestion = () => {
    sounds.playClick();
    const newQ: Question = {
      id: 'q_oe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: `Bé hãy vẽ hình hoặc viết chữ vào ô trống nhé!`,
      type: 'open_ended',
      allowMultipleCorrect: false,
      readQuestionAudio: true,
      timeLimit: 0,
      noTimeLimit: true,
      points: 10,
      options: [],
    };

    setQuestions((prev) => [...prev, newQ]);
    setCurrentQIndex(questions.length);
  };

  // Duplicate current question
  const handleDuplicateQuestion = () => {
    sounds.playClick();
    if (!currentQuestion) return;
    const duplicated: Question = {
      ...JSON.parse(JSON.stringify(currentQuestion)),
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: `${currentQuestion.title} (Bản sao)`,
    };
    setQuestions((prev) => [...prev, duplicated]);
    setCurrentQIndex(questions.length);
  };

  // Delete current question
  const handleDeleteQuestion = (indexToDelete: number) => {
    if (questions.length <= 1) {
      alert('Bộ trò chơi cần có ít nhất 1 câu hỏi.');
      return;
    }
    sounds.playClick();
    const updated = questions.filter((_, idx) => idx !== indexToDelete);
    setQuestions(updated);
    if (currentQIndex >= updated.length) {
      setCurrentQIndex(updated.length - 1);
    }
  };

  // Move question position up or down
  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    sounds.playClick();
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const nextList = [...questions];
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setQuestions(nextList);
    setCurrentQIndex(targetIdx);
  };

  // Listen to speech preview
  const handleTestSpeech = () => {
    sounds.playClick();
    if (isSpeaking) {
      stopSpeaking();
    } else if (currentQuestion) {
      if (currentQuestion.type === 'open_ended') {
        speakQuestionWithOptions(currentQuestion.title, []);
      } else {
        speakQuestionWithOptions(currentQuestion.title, currentQuestion.options);
      }
    }
  };

  // Handle uploading image for question
  const handleQuestionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleUpdateCurrentQuestion({ imageUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle uploading background template image for open-ended drawing question
  const handleOpenEndedBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleUpdateCurrentQuestion({ openEndedBgImage: dataUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectPresetBgImage = (dataUrl: string) => {
    sounds.playCorrect();
    handleUpdateCurrentQuestion({ openEndedBgImage: dataUrl });
  };

  const handleRemoveOpenEndedBgImage = () => {
    sounds.playClick();
    handleUpdateCurrentQuestion({ openEndedBgImage: undefined });
  };

  // Handle uploading image for a specific option
  const handleOptionImageUpload = (optId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl && currentQuestion) {
        const updatedOptions = currentQuestion.options.map((opt) =>
          opt.id === optId
            ? {
                ...opt,
                imageUrl: dataUrl,
                imageFit: opt.imageFit || 'full', // Default to full frame so children clearly see it!
              }
            : opt
        );
        handleUpdateCurrentQuestion({ options: updatedOptions });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Select icon/emoji from preschool asset library
  const handleSelectAsset = (item: { name: string; icon: string }) => {
    sounds.playClick();
    // Convert emoji or text to SVG Data URL so it renders crisp as an image
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="24" fill="#f8fafc" />
      <text x="50%" y="54%" font-size="64" text-anchor="middle" dominant-baseline="central">${item.icon}</text>
    </svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    if (assetModalTarget === 'question') {
      handleUpdateCurrentQuestion({ imageUrl: dataUrl });
    } else if (assetModalTarget && currentQuestion) {
      const updatedOptions = currentQuestion.options.map((opt) =>
        opt.id === assetModalTarget
          ? {
              ...opt,
              imageUrl: dataUrl,
              imageFit: opt.imageFit || 'full',
            }
          : opt
      );
      handleUpdateCurrentQuestion({ options: updatedOptions });
    }
    setAssetModalTarget(null);
  };

  // Toggle or set correct answer
  const handleToggleCorrectOption = (optId: string) => {
    if (!currentQuestion) return;
    sounds.playCorrect();

    if (currentQuestion.allowMultipleCorrect) {
      // Multiple choice mode: toggle isCorrect on clicked option
      const updatedOptions = currentQuestion.options.map((opt) =>
        opt.id === optId ? { ...opt, isCorrect: !opt.isCorrect } : opt
      );
      handleUpdateCurrentQuestion({ options: updatedOptions });
    } else {
      // Single choice mode: only this option is correct
      const updatedOptions = currentQuestion.options.map((opt) => ({
        ...opt,
        isCorrect: opt.id === optId,
      }));
      handleUpdateCurrentQuestion({ options: updatedOptions });
    }
  };

  // Add new option
  const handleAddOption = () => {
    if (!currentQuestion) return;
    if (currentQuestion.options.length >= 6) {
      alert('Tối đa 6 đáp án cho mỗi câu hỏi mầm non.');
      return;
    }
    sounds.playClick();
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const nextLetter = letters[currentQuestion.options.length] || `${currentQuestion.options.length + 1}`;
    const newOpt: QuestionOption = {
      id: 'opt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text: `Đáp án ${nextLetter}`,
      isCorrect: false,
    };
    handleUpdateCurrentQuestion({ options: [...currentQuestion.options, newOpt] });
  };

  // Remove option
  const handleRemoveOption = (optId: string) => {
    if (!currentQuestion) return;
    if (currentQuestion.options.length <= 2) {
      alert('Câu hỏi cần có ít nhất 2 đáp án để bé lựa chọn.');
      return;
    }
    sounds.playClick();
    const updatedOptions = currentQuestion.options.filter((opt) => opt.id !== optId);
    handleUpdateCurrentQuestion({ options: updatedOptions });
  };

  // Validate and save game
  const handleSaveGame = () => {
    setErrorBanner(null);

    if (!gameTitle.trim()) {
      setErrorBanner('Vui lòng nhập tên trò chơi trước khi lưu.');
      sounds.playWrong();
      return;
    }

    // Validate each question has content and valid answers
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title.trim()) {
        setErrorBanner(`Câu hỏi số ${i + 1} chưa có tiêu đề nội dung.`);
        setCurrentQIndex(i);
        sounds.playWrong();
        return;
      }
      if (q.type !== 'open_ended') {
        const hasCorrect = q.options.some((o) => o.isCorrect);
        if (!hasCorrect) {
          setErrorBanner(`Câu hỏi số ${i + 1} chưa được đánh dấu đáp án đúng nào.`);
          setCurrentQIndex(i);
          sounds.playWrong();
          return;
        }
      }
    }

    sounds.playFanfare();
    const gameId = initialGame?.id || 'game_quiz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const savedGame: Game = {
      id: gameId,
      title: gameTitle.trim(),
      description: description.trim(),
      theme: 'indigo',
      category,
      targetAge,
      gameType: 'multiple_choice',
      status: 'published',
      createdAt: initialGame?.createdAt || Date.now(),
      updatedAt: Date.now(),
      playCount: initialGame?.playCount || 0,
      settings: {
        timePerQuestion: 0,
        speedBonus: true,
        maxTeams,
        soundEffects: true,
      },
      questions,
    };

    saveGame(savedGame);
    onSaveAndExit(savedGame);
  };

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans select-none">
      {/* Hidden file inputs */}
      <input
        ref={questionImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleQuestionImageUpload}
      />

      {/* Top Main Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playClick();
              onCancel();
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 font-bold text-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <HelpCircle className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block">
                Soạn trò chơi câu hỏi
              </span>
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                placeholder="Nhập tên bộ trò chơi..."
                className="font-black text-sm sm:text-base text-slate-900 bg-transparent border-0 outline-none hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-300 rounded px-1 transition"
              />
            </div>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Xem trước</span>
          </button>

          <button
            type="button"
            onClick={handleSaveGame}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-200 transition active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>LƯU TRÒ CHƠI</span>
          </button>
        </div>
      </header>

      {/* Validation warning banner */}
      {errorBanner && (
        <div className="bg-rose-500 text-white px-6 py-2.5 text-xs font-black flex items-center justify-between animate-in fade-in">
          <span>⚠️ {errorBanner}</span>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-white hover:text-rose-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: Question Stack */}
        <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Câu hỏi ({questions.length})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer border border-indigo-200"
                title="Thêm câu hỏi trắc nghiệm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Trắc nghiệm</span>
              </button>

              <button
                type="button"
                onClick={handleAddOpenEndedQuestion}
                className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer border border-purple-200"
                title="Thêm câu hỏi tự luận bé vẽ & viết"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Tự luận</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {questions.map((q, idx) => {
              const isSelected = idx === currentQIndex;

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    sounds.playClick();
                    stopSpeaking();
                    setCurrentQIndex(idx);
                  }}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? q.type === 'open_ended'
                        ? 'border-purple-600 bg-purple-50/70 shadow-sm'
                        : 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                      : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelected
                          ? q.type === 'open_ended'
                            ? 'bg-purple-600 text-white'
                            : 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-slate-800 truncate leading-tight">
                        {q.title || `Câu hỏi ${idx + 1}`}
                      </p>
                      <span className={`text-[10px] font-bold ${q.type === 'open_ended' ? 'text-purple-700 font-black' : 'text-slate-400'}`}>
                        {q.type === 'open_ended'
                          ? '✏️ Tự luận (Vẽ/Viết)'
                          : q.allowMultipleCorrect
                          ? '☑️ Nhiều đáp án'
                          : '🔘 1 đáp án'}
                      </span>
                    </div>
                  </div>

                  {/* Reorder and Delete actions */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveQuestion(idx, 'up');
                      }}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                      title="Chuyển câu hỏi lên trước"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveQuestion(idx, 'down');
                      }}
                      disabled={idx === questions.length - 1}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                      title="Chuyển câu hỏi xuống sau"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(idx);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer ml-0.5"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick reorder footer */}
          <div className="p-2 border-t border-slate-200 flex items-center justify-between bg-slate-50/80 px-3">
            <span className="text-[11px] font-bold text-slate-500">
              Vị trí câu {currentQIndex + 1}/{questions.length}:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleMoveQuestion(currentQIndex, 'up')}
                disabled={currentQIndex === 0}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-black flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
                title="Chuyển câu hỏi này lên trước"
              >
                <MoveUp className="w-3.5 h-3.5" />
                <span>Lên</span>
              </button>
              <button
                type="button"
                onClick={() => handleMoveQuestion(currentQIndex, 'down')}
                disabled={currentQIndex === questions.length - 1}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-black flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
                title="Chuyển câu hỏi này xuống sau"
              >
                <MoveDown className="w-3.5 h-3.5" />
                <span>Xuống</span>
              </button>
            </div>
          </div>

          {/* Quick game settings */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/60 space-y-3">
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Chủ đề trò chơi:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs font-extrabold p-2 rounded-xl bg-white border border-slate-200 text-slate-800 outline-none"
              >
                <option value="Chữ cái">Chữ cái tiếng Việt</option>
                <option value="Làm quen với toán">Làm quen với toán</option>
                <option value="Động vật">Thế giới động vật</option>
                <option value="Môi trường xung quanh">Môi trường xung quanh</option>
                <option value="Kỹ năng xã hội">Kỹ năng xã hội</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Lứa tuổi phù hợp:
              </label>
              <select
                value={targetAge}
                onChange={(e) => setTargetAge(e.target.value)}
                className="w-full text-xs font-extrabold p-2 rounded-xl bg-white border border-slate-200 text-slate-800 outline-none"
              >
                <option value="3-4 tuổi">3 - 4 tuổi (Mầm)</option>
                <option value="4-5 tuổi">4 - 5 tuổi (Chồi)</option>
                <option value="5-6 tuổi">5 - 6 tuổi (Lá)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Số đội chơi hỗ trợ:
              </label>
              <select
                value={maxTeams}
                onChange={(e) => setMaxTeams(Number(e.target.value))}
                className="w-full text-xs font-extrabold p-2 rounded-xl bg-white border border-slate-200 text-slate-800 outline-none"
              >
                <option value={2}>2 đội</option>
                <option value={3}>3 đội</option>
                <option value={4}>4 đội</option>
                <option value={5}>5 đội</option>
                <option value={6}>6 đội</option>
                <option value={8}>8 đội</option>
                <option value={10}>10 đội</option>
                <option value={12}>12 đội (Tối đa 12 đội)</option>
              </select>
            </div>

            {/* Bulk / Game-wide Voice Reading Setting */}
            <div className="pt-2 border-t border-slate-200/80">
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                Giọng đọc câu hỏi toàn bộ game:
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setQuestions((prev) => prev.map((q) => ({ ...q, readQuestionAudio: true })));
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                    questions.every((q) => q.readQuestionAudio !== false)
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-white/60'
                  }`}
                  title="Bật giọng đọc câu hỏi cho tất cả các câu trong trò chơi"
                >
                  <Volume2 className="w-3 h-3 shrink-0" />
                  <span>Bật tất cả</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setQuestions((prev) => prev.map((q) => ({ ...q, readQuestionAudio: false })));
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                    questions.every((q) => q.readQuestionAudio === false)
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-white/60'
                  }`}
                  title="Tắt bỏ giọng đọc câu hỏi cho tất cả các câu trong trò chơi"
                >
                  <VolumeX className="w-3 h-3 shrink-0" />
                  <span>Tắt tất cả</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Center / Main Content: Active Question Detailed Editor */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Question Card Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-sm relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs">
                    CÂU {currentQIndex + 1} / {questions.length}
                  </span>

                  {/* Question Type Switcher: Trắc nghiệm vs Tự luận */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        handleUpdateCurrentQuestion({
                          type: 'multiple_choice',
                          options: currentQuestion.options && currentQuestion.options.length > 0 ? currentQuestion.options : [
                            { id: 'opt_' + Date.now() + '_1', text: 'Đáp án A', isCorrect: true },
                            { id: 'opt_' + Date.now() + '_2', text: 'Đáp án B', isCorrect: false },
                            { id: 'opt_' + Date.now() + '_3', text: 'Đáp án C', isCorrect: false },
                          ]
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                        currentQuestion.type !== 'open_ended'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Circle className="w-3.5 h-3.5" />
                      <span>Trắc nghiệm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        handleUpdateCurrentQuestion({
                          type: 'open_ended',
                          timeLimit: Math.max(currentQuestion.timeLimit || 25, 45),
                          modelAnswer: currentQuestion.modelAnswer || 'Trẻ vẽ hoặc viết rõ nét, đúng theo tiêu chí của cô.',
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                        currentQuestion.type === 'open_ended'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Tự luận (Vẽ/Viết)</span>
                    </button>
                  </div>

                  {/* Mode badge: 1 or multiple correct for multiple choice */}
                  {currentQuestion.type !== 'open_ended' && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          handleUpdateCurrentQuestion({ allowMultipleCorrect: false });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                          !currentQuestion.allowMultipleCorrect
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Circle className="w-3 h-3" />
                        <span>1 đáp án</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          handleUpdateCurrentQuestion({ allowMultipleCorrect: true });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                          currentQuestion.allowMultipleCorrect
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span>Nhiều đáp án</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Duplicate question button */}
                  <button
                    type="button"
                    onClick={handleDuplicateQuestion}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Nhân bản câu hỏi này"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Nhân bản</span>
                  </button>

                  {/* Points select */}
                  <div className="flex items-center gap-1 text-xs font-extrabold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                    <Award className="w-3.5 h-3.5 text-indigo-500" />
                    <select
                      value={currentQuestion.points || 10}
                      onChange={(e) =>
                        handleUpdateCurrentQuestion({ points: Number(e.target.value) })
                      }
                      className="bg-transparent border-0 outline-none font-mono cursor-pointer"
                    >
                      <option value="10">10 điểm</option>
                      <option value="20">20 điểm</option>
                      <option value="30">30 điểm</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Question Text Title Area */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <span>NỘI DUNG CÂU HỎI</span>
                    <span className="text-rose-500">*</span>
                  </label>

                  {/* Voice reading controls (Bật/Tắt đọc câu hỏi & Nghe thử) */}
                  <div className="flex items-center gap-2">
                    {/* Toggle question audio reading ON / OFF */}
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        handleUpdateCurrentQuestion({
                          readQuestionAudio: currentQuestion.readQuestionAudio === false ? true : false,
                        });
                      }}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer border ${
                        currentQuestion.readQuestionAudio !== false
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                      }`}
                      title={
                        currentQuestion.readQuestionAudio !== false
                          ? 'Đang BẬT đọc câu hỏi. Bấm để TẮT bỏ đọc câu hỏi này.'
                          : 'Đang TẮT đọc câu hỏi. Bấm để BẬT đọc câu hỏi này.'
                      }
                    >
                      {currentQuestion.readQuestionAudio !== false ? (
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

                    {/* Voice reading test button */}
                    {isSpeechSupported() && currentQuestion.readQuestionAudio !== false && (
                      <button
                        type="button"
                        onClick={handleTestSpeech}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                          isSpeaking
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                        title="Nghe thử âm thanh câu hỏi đọc bằng giọng tiếng Việt"
                      >
                        {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isSpeaking ? 'Dừng đọc' : '🔊 Nghe thử'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={currentQuestion.title}
                  onChange={(e) => handleUpdateCurrentQuestion({ title: e.target.value })}
                  placeholder="Nhập câu hỏi... (VD: Bé hãy tìm con vật nào dưới đây biết bơi?)"
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-black text-base sm:text-lg text-slate-900 transition leading-snug"
                />
              </div>

              {/* Question Image (Optional) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Hình ảnh minh họa câu hỏi (không bắt buộc)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAssetModalTarget('question')}
                      className="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-extrabold text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Chọn từ thư viện mầm non</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => questionImageInputRef.current?.click()}
                      className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh từ máy</span>
                    </button>
                  </div>
                </div>

                {currentQuestion.imageUrl ? (
                  <div className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-3 shadow-2xs space-y-3">
                    <div className="relative inline-block bg-white rounded-xl p-1 border border-slate-200">
                      <img
                        src={currentQuestion.imageUrl}
                        alt="Ảnh câu hỏi"
                        style={{
                          maxHeight: `${currentQuestion.imageHeight || (currentQuestion.imageSize === 'sm' ? 120 : currentQuestion.imageSize === 'lg' ? 250 : currentQuestion.imageSize === 'xl' ? 340 : 180)}px`,
                        }}
                        className="rounded-lg object-contain transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentQuestion({ imageUrl: undefined })}
                        className="absolute -top-2 -right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Image Size Selector Toolbar */}
                    <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
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
                          const active = (currentQuestion.imageHeight === sz.height) || (!currentQuestion.imageHeight && (currentQuestion.imageSize === sz.key || (sz.key === 'md' && !currentQuestion.imageSize)));
                          return (
                            <button
                              key={sz.key}
                              type="button"
                              onClick={() => handleUpdateCurrentQuestion({ imageSize: sz.key as any, imageHeight: sz.height })}
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

                        {/* Fine-tuning range slider */}
                        <div className="flex items-center gap-1.5 ml-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                          <input
                            type="range"
                            min={80}
                            max={400}
                            step={10}
                            value={currentQuestion.imageHeight || (currentQuestion.imageSize === 'sm' ? 120 : currentQuestion.imageSize === 'lg' ? 250 : currentQuestion.imageSize === 'xl' ? 340 : 180)}
                            onChange={(e) => handleUpdateCurrentQuestion({ imageHeight: Number(e.target.value) })}
                            className="w-20 sm:w-24 accent-indigo-600 cursor-pointer"
                            title="Kéo để tinh chỉnh chiều cao ảnh"
                          />
                          <span className="text-[11px] font-black text-indigo-700 min-w-[42px] text-right">
                            {currentQuestion.imageHeight || (currentQuestion.imageSize === 'sm' ? 120 : currentQuestion.imageSize === 'lg' ? 250 : currentQuestion.imageSize === 'xl' ? 340 : 180)}px
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setAssetModalTarget('question')}
                    className="p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 bg-slate-50 hover:bg-indigo-50/30 transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">
                      Bấm vào đây để chọn hình ảnh minh họa cho câu hỏi
                    </span>
                  </div>
                )}
              </div>

              {/* Answers & Options Area OR Open-Ended Essay Area */}
              {currentQuestion.type === 'open_ended' ? (
                /* OPEN-ENDED ESSAY & DRAWING QUESTION CONFIGURATION */
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50/40 to-pink-50/40 rounded-3xl p-5 sm:p-6 border-2 border-purple-200 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-purple-200/60 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs">
                        <PenTool className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-purple-950 uppercase tracking-wide">
                          CẤU HÌNH CÂU HỎI TỰ LUẬN (VẼ HÌNH & VIẾT CHỮ)
                        </h4>
                        <p className="text-xs font-bold text-slate-500">
                          Trẻ sẽ có ô trống bảng vẽ và ô chữ để tự do ghi, vẽ đáp án rồi nộp bài
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-black px-3 py-1 bg-purple-100 text-purple-800 rounded-xl border border-purple-300">
                      ✏️ Cô chấm & sửa bài lúc tổng kết
                    </span>
                  </div>



                  {/* Image template inside student drawing canvas */}
                  <div className="bg-purple-50/70 p-4 rounded-2xl border-2 border-purple-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-purple-600" />
                        <span>Hình ảnh trong khung vẽ của học sinh (để bé vẽ / tô màu / nối nét lên):</span>
                      </label>
                      {currentQuestion.openEndedBgImage && (
                        <button
                          type="button"
                          onClick={handleRemoveOpenEndedBgImage}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa hình này</span>
                        </button>
                      )}
                    </div>

                    {currentQuestion.openEndedBgImage ? (
                      <div className="flex items-center gap-4 bg-white p-3.5 rounded-2xl border border-purple-200 shadow-2xs">
                        <img
                          src={currentQuestion.openEndedBgImage}
                          alt="Hình nền khung vẽ"
                          className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-xl border border-purple-200 bg-slate-50 shadow-xs shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-black text-slate-800 block">
                            Đã tải hình ảnh vào khung vẽ của học sinh
                          </span>
                          <p className="text-[11px] font-bold text-purple-700 mt-1">
                            💡 Khi học sinh mở câu này, hình ảnh này sẽ hiện sẵn bên trong khung vẽ. Bé có thể dùng bút màu để vẽ, tô màu, khoanh tròn, hoặc nối nét trực tiếp lên tranh!
                          </p>
                          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-black cursor-pointer transition">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Chọn ảnh khác từ máy</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleOpenEndedBgImageUpload}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={handleRemoveOpenEndedBgImage}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer"
                            >
                              Xóa ảnh
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-purple-300 space-y-3">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                          <div>
                            <span className="text-xs font-black text-slate-800 block">
                              Thêm hình ảnh vào khung vẽ của bé (tô màu / nối nét / khoanh tròn)
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">
                              Tải lên hình ảnh từ máy tính (PNG, JPG, SVG) hoặc chọn mẫu tranh có sẵn bên dưới
                            </span>
                          </div>
                          <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0">
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
                                onClick={() => handleSelectPresetBgImage(tpl.dataUrl)}
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
                  <div className="bg-white rounded-2xl p-4 border border-purple-200 flex items-start gap-3">
                    <span className="text-2xl shrink-0">🎨</span>
                    <div className="text-xs text-purple-950 font-bold space-y-1">
                      <p className="font-black text-purple-900">Tính năng hoạt động thế nào?</p>
                      <p>1. <b>Học sinh:</b> Màn hình có ô trống, bảng cọ vẽ 8 màu sắc, tẩy, xóa vẽ lại và ô nhập chữ để bé làm bài.</p>
                      <p>2. <b>Giáo viên:</b> Ở màn hình kết quả câu hỏi và màn hình tổng kết, cô xem bài vẽ & chữ viết của từng bé, có nút <b>"Chấm điểm & Sửa bài"</b> để cho điểm và gửi lời nhận xét trực tiếp về thiết bị của trẻ!</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Answers & Options Area */
                <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs font-black uppercase text-slate-700 tracking-wider block">
                      CÁC ĐÁP ÁN ({currentQuestion.options.length})
                    </label>

                    {/* Sizing & Columns Quick Controls */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 px-1">Cỡ:</span>
                      {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            handleUpdateCurrentQuestion({ boxSize: s });
                          }}
                          className={`w-6 h-6 rounded-md text-[11px] font-black transition cursor-pointer ${
                            (currentQuestion.boxSize || 'lg') === s
                              ? 'bg-white text-indigo-700 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 px-1">Lưới:</span>
                      {[1, 2, 3, 4].map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            handleUpdateCurrentQuestion({ layoutColumns: col as any });
                          }}
                          className={`w-6 h-6 rounded-md text-[11px] font-black transition cursor-pointer ${
                            (currentQuestion.layoutColumns || 1) === col
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
                    type="button"
                    onClick={handleAddOption}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm đáp án</span>
                  </button>
                </div>

                <div className={`grid gap-3 ${
                  (currentQuestion.layoutColumns || 1) === 1
                    ? 'grid-cols-1'
                    : (currentQuestion.layoutColumns || 1) === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : (currentQuestion.layoutColumns || 1) === 3
                    ? 'grid-cols-1 sm:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-4'
                }`}>
                  {currentQuestion.options.map((opt, optIdx) => {
                    const letter = letters[optIdx] || `${optIdx + 1}`;
                    const isCorrect = Boolean(opt.isCorrect);

                    return (
                      <div
                        key={opt.id}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {/* Hidden input for this option */}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => {
                            optionImageInputRefs.current[opt.id] = el;
                          }}
                          onChange={(e) => handleOptionImageUpload(opt.id, e)}
                        />

                        {/* Top: letter tag, option text, correct toggle & delete */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <span
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {letter}
                            </span>

                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const updated = currentQuestion.options.map((o) =>
                                  o.id === opt.id ? { ...o, text: e.target.value } : o
                                );
                                handleUpdateCurrentQuestion({ options: updated });
                              }}
                              placeholder={`Nội dung đáp án ${letter}...`}
                              className="flex-1 p-2 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none font-extrabold text-sm text-slate-800 bg-white"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleCorrectOption(opt.id)}
                              className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200'
                              }`}
                            >
                              {isCorrect ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>ĐÁP ÁN ĐÚNG</span>
                                </>
                              ) : (
                                <>
                                  <Circle className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Chọn là đúng</span>
                                </>
                              )}
                            </button>

                            {currentQuestion.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(opt.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                title="Xóa đáp án này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Bottom: Image with Size Customization */}
                        <div className="pt-2 border-t border-slate-200/60">
                          {opt.imageUrl ? (
                            <div className="space-y-2">
                              {/* Image Display according to selected size */}
                              <div className={`relative ${opt.imageFit === 'full' || opt.imageFit === 'custom' ? 'w-full' : 'inline-block'}`}>
                                <img
                                  src={opt.imageUrl}
                                  alt={opt.text}
                                  style={opt.imageFit === 'custom' ? { height: `${opt.imageHeight || 150}px` } : undefined}
                                  className={`rounded-xl border border-slate-200 bg-slate-50/50 shadow-2xs ${
                                    opt.imageFit === 'full'
                                      ? 'w-full h-36 sm:h-48 object-contain p-1.5'
                                      : opt.imageFit === 'custom'
                                      ? 'w-full object-contain p-1.5'
                                      : opt.imageFit === 'large'
                                      ? 'w-28 h-28 object-contain p-1'
                                      : opt.imageFit === 'small'
                                      ? 'w-14 h-14 object-contain p-0.5'
                                      : 'w-20 h-20 object-contain p-1'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    sounds.playClick();
                                    const updated = currentQuestion.options.map((o) =>
                                      o.id === opt.id ? { ...o, imageUrl: undefined } : o
                                    );
                                    handleUpdateCurrentQuestion({ options: updated });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs hover:bg-rose-600 shadow-sm cursor-pointer"
                                  title="Xóa ảnh này"
                                >
                                  ×
                                </button>
                              </div>

                              {/* Size Selector Toolbar */}
                              <div className="space-y-1.5 pt-0.5">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <div className="flex flex-wrap items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                                    <span className="text-[10px] font-black text-slate-400 px-1">Cỡ ảnh:</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        sounds.playClick();
                                        const updated = currentQuestion.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageFit: 'small' as const } : o
                                        );
                                        handleUpdateCurrentQuestion({ options: updated });
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                                        (opt.imageFit || 'medium') === 'small'
                                          ? 'bg-indigo-600 text-white shadow-xs'
                                          : 'text-slate-600 hover:bg-slate-100'
                                      }`}
                                      title="Ảnh nhỏ gọn (thumbnail)"
                                    >
                                      Nhỏ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        sounds.playClick();
                                        const updated = currentQuestion.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageFit: 'medium' as const } : o
                                        );
                                        handleUpdateCurrentQuestion({ options: updated });
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                                        (opt.imageFit || 'medium') === 'medium'
                                          ? 'bg-indigo-600 text-white shadow-xs'
                                          : 'text-slate-600 hover:bg-slate-100'
                                      }`}
                                      title="Ảnh kích thước vừa vặn"
                                    >
                                      Vừa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        sounds.playClick();
                                        const updated = currentQuestion.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageFit: 'large' as const } : o
                                        );
                                        handleUpdateCurrentQuestion({ options: updated });
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                                        opt.imageFit === 'large'
                                          ? 'bg-indigo-600 text-white shadow-xs'
                                          : 'text-slate-600 hover:bg-slate-100'
                                      }`}
                                      title="Ảnh kích thước lớn"
                                    >
                                      Lớn
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        sounds.playCorrect();
                                        const updated = currentQuestion.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageFit: 'full' as const } : o
                                        );
                                        handleUpdateCurrentQuestion({ options: updated });
                                      }}
                                      className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer flex items-center gap-0.5 ${
                                        opt.imageFit === 'full'
                                          ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400'
                                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                      }`}
                                      title="Ảnh tràn Full khung đáp án cho trẻ dễ nhìn"
                                    >
                                      <Maximize2 className="w-2.5 h-2.5" />
                                      <span>⭐ Full khung</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        sounds.playClick();
                                        const updated = currentQuestion.options.map((o) =>
                                          o.id === opt.id
                                            ? { ...o, imageFit: 'custom' as const, imageHeight: o.imageHeight || 150 }
                                            : o
                                        );
                                        handleUpdateCurrentQuestion({ options: updated });
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-black transition cursor-pointer flex items-center gap-0.5 ${
                                        opt.imageFit === 'custom'
                                          ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-400'
                                          : 'text-slate-600 hover:bg-slate-100'
                                      }`}
                                      title="Tùy chỉnh độ lớn / chiều cao ảnh bằng thanh trượt"
                                    >
                                      <Sliders className="w-2.5 h-2.5" />
                                      <span>Tùy chỉnh</span>
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => optionImageInputRefs.current[opt.id]?.click()}
                                      className="text-[10px] font-extrabold text-indigo-600 hover:underline cursor-pointer"
                                    >
                                      Đổi ảnh
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAssetModalTarget(opt.id)}
                                      className="text-[10px] font-extrabold text-amber-600 hover:underline cursor-pointer"
                                    >
                                      Ảnh mầm non
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        sounds.playClick();
                                        const updated = currentQuestion.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageUrl: undefined } : o
                                        );
                                        handleUpdateCurrentQuestion({ options: updated });
                                      }}
                                      className="text-[10px] font-extrabold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                                    >
                                      Xóa ảnh
                                    </button>
                                  </div>
                                </div>

                                {/* Custom height slider when 'custom' is active */}
                                {opt.imageFit === 'custom' && (
                                  <div className="flex items-center gap-2 p-1.5 bg-purple-50/80 rounded-xl border border-purple-200 text-purple-950">
                                    <span className="text-[10px] font-black text-purple-700 shrink-0">
                                      Chiều cao:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentH = opt.imageHeight || 150;
                                        const nextH = Math.max(60, currentH - 20);
                                        const updated = currentQuestion.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageHeight: nextH } : o
                                        );
                                        handleUpdateCurrentQuestion({ options: updated });
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
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        const updated = currentQuestion.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageHeight: val } : o
                                        );
                                        handleUpdateCurrentQuestion({ options: updated });
                                      }}
                                      className="flex-1 accent-purple-600 cursor-pointer h-1.5 bg-purple-200 rounded-lg"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentH = opt.imageHeight || 150;
                                        const nextH = Math.min(280, currentH + 20);
                                        const updated = currentQuestion.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageHeight: nextH } : o
                                        );
                                        handleUpdateCurrentQuestion({ options: updated });
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
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => optionImageInputRefs.current[opt.id]?.click()}
                                className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 py-1.5 px-3 rounded-xl hover:bg-indigo-50 border border-dashed border-slate-300 transition cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5 text-indigo-500" />
                                <span>+ Tải ảnh từ máy</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setAssetModalTarget(opt.id)}
                                className="text-xs font-bold text-slate-600 hover:text-amber-600 flex items-center gap-1.5 py-1.5 px-3 rounded-xl hover:bg-amber-50 border border-dashed border-slate-300 transition cursor-pointer"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                                <span>+ Chọn ảnh mầm non</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Explanation / Praise message for kids */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 mb-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Lời khen ngợi & Giải thích cho bé (hiển thị khi công bố kết quả)</span>
                </label>
                <input
                  type="text"
                  value={currentQuestion.explanation || ''}
                  onChange={(e) => handleUpdateCurrentQuestion({ explanation: e.target.value })}
                  placeholder="VD: Bé giỏi lắm, con vịt và con cá đều biết bơi đấy!"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-xs sm:text-sm font-bold text-slate-800"
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Preschool Asset Library Picker Modal */}
      {assetModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border-4 border-amber-100">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-400 to-rose-400 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">THƯ VIỆN HÌNH ẢNH MẦM NON</h3>
                <p className="text-xs text-amber-100 font-bold">
                  Chọn nhanh các con vật, hoa quả, chữ cái sinh động cho câu hỏi và đáp án
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssetModalTarget(null)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {ASSET_LIBRARY.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-2.5 pb-1 border-b border-slate-100">
                    <span className="text-xl">{cat.icon}</span>
                    <h4 className="font-black text-sm text-slate-800">{cat.name}</h4>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                    {cat.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectAsset(item)}
                        className="p-2.5 rounded-2xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/70 transition flex flex-col items-center justify-center gap-1 group active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <span className="text-3xl group-hover:scale-110 transition">{item.icon}</span>
                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-full">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setAssetModalTarget(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal for Questions */}
      {isPreviewOpen && currentQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm select-none animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border-4 border-indigo-200 flex flex-col">
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h3 className="font-black text-base">Xem trước câu hỏi của bé</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsPreviewOpen(false);
                }}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">
                  CÂU {currentQIndex + 1} · {currentQuestion.allowMultipleCorrect ? '☑️ Nhiều đáp án đúng' : '🔘 1 đáp án đúng'}
                </span>

                {isSpeechSupported() && (
                  <button
                    type="button"
                    onClick={handleTestSpeech}
                    className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-black text-xs flex items-center gap-1"
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>{isSpeaking ? 'Dừng đọc' : '🔊 Nghe thử'}</span>
                  </button>
                )}
              </div>

              {currentQuestion.imageUrl && (
                <div className="max-h-48 flex items-center justify-center p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Minh họa"
                    className="max-h-44 object-contain rounded-xl"
                  />
                </div>
              )}

              <h4 className="font-black text-xl text-slate-900 text-center">
                {currentQuestion.title}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentQuestion.options.map((opt, idx) => {
                  const isFull = opt.imageFit === 'full';
                  const isCustom = opt.imageFit === 'custom';

                  return (
                    <div
                      key={opt.id}
                      className={`p-3.5 rounded-2xl border-2 font-black text-base flex flex-col items-center justify-center text-center gap-2 ${
                        opt.isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {opt.imageUrl && (
                        <div className={`flex items-center justify-center w-full ${isFull || isCustom ? 'my-1' : ''}`}>
                          <img
                            src={opt.imageUrl}
                            alt={opt.text}
                            style={isCustom ? { height: `${opt.imageHeight || 140}px` } : undefined}
                            className={`object-contain rounded-xl bg-white border border-slate-200 shadow-2xs ${
                              isFull
                                ? 'w-full h-32 sm:h-36 p-1'
                                : isCustom
                                ? 'w-full p-1'
                                : opt.imageFit === 'large'
                                ? 'w-24 h-24 p-1'
                                : opt.imageFit === 'small'
                                ? 'w-12 h-12 p-0.5'
                                : 'w-16 h-16 p-1'
                            }`}
                          />
                        </div>
                      )}
                      <span className="leading-snug">{opt.text}</span>
                      {opt.isCorrect && (
                        <span className="text-[10px] font-black text-emerald-600 uppercase">
                          ✓ Đáp án đúng
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsPreviewOpen(false);
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition"
              >
                ĐÓNG XEM TRƯỚC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
