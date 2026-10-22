import React, { useState, useRef, useEffect } from 'react';
import { Game, Question, QuestionOption, QuestionType } from '../../types/game';
import { saveGame } from '../../services/gameStorage';
import { sounds } from '../../utils/sound';
import { speakQuestionWithOptions, stopSpeaking, unlockSpeechAudio, subscribeSpeakingState } from '../../utils/speechVoice';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Copy,
  Clock,
  Award,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Circle,
  Eye,
  LayoutGrid,
  Columns2,
  Columns3,
  Columns4,
  Maximize2,
  Sliders,
  Sparkles,
  HelpCircle,
  MoveUp,
  MoveDown,
  Palette,
  X,
  Layers,
  Check,
  PenTool,
  ChevronUp,
  ChevronDown,
  Type,
} from 'lucide-react';
import { PreviewModal } from './PreviewModal';

const VIETNAMESE_ALPHABET = [
  'a', 'ă', 'â', 'b', 'c', 'd', 'đ', 'e', 'ê', 'g', 'h', 'i', 'k', 'l', 'm', 'n',
  'o', 'ô', 'ơ', 'p', 'q', 'r', 's', 't', 'u', 'ư', 'v', 'x', 'y'
];
import { BUILDER_TEMPLATES } from '../../data/builderTemplates';
import { OPEN_ENDED_PRESET_TEMPLATES } from '../../data/openEndedTemplates';
import {
  getSavedInteractiveQuestions,
  subscribeInteractiveQuestions,
  SavedInteractiveQuestion,
  saveInteractiveQuestion,
} from '../../services/interactiveQuestionStorage';
import { InteractiveGameBuilder } from './InteractiveGameBuilder';

// High quality preschool background wallpapers
const PRESET_WALLPAPERS = [
  {
    id: 'none',
    name: 'Mặc định (Sáng)',
    bgClass: 'bg-slate-50',
    previewColor: '#f8fafc',
    textColor: 'text-slate-800',
  },
  {
    id: 'nature',
    name: 'Rừng xanh cổ tích',
    bgClass: 'bg-gradient-to-b from-emerald-100 via-teal-50 to-green-100',
    previewColor: '#d1fae5',
    textColor: 'text-emerald-950',
  },
  {
    id: 'ocean',
    name: 'Đại dương kỳ thú',
    bgClass: 'bg-gradient-to-b from-sky-200 via-cyan-100 to-blue-200',
    previewColor: '#bae6fd',
    textColor: 'text-sky-950',
  },
  {
    id: 'space',
    name: 'Vũ trụ vui nhộn',
    bgClass: 'bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900',
    previewColor: '#312e81',
    textColor: 'text-white',
    dark: true,
  },
  {
    id: 'classroom',
    name: 'Lớp học rực rỡ',
    bgClass: 'bg-gradient-to-b from-amber-100 via-orange-50 to-yellow-100',
    previewColor: '#fef3c7',
    textColor: 'text-amber-950',
  },
  {
    id: 'pastel',
    name: 'Cầu vồng kẹo ngọt',
    bgClass: 'bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100',
    previewColor: '#fce7f3',
    textColor: 'text-purple-950',
  },
];

interface CustomGameBuilderProps {
  initialGame?: Game | null;
  onSaveAndExit: (game: Game) => void;
  onCancel: () => void;
}

export const CustomGameBuilder: React.FC<CustomGameBuilderProps> = ({
  initialGame,
  onSaveAndExit,
  onCancel,
}) => {
  // Game metadata
  const [gameTitle, setGameTitle] = useState<string>(
    initialGame?.title || 'TRÒ CHƠI TÙY CHỌN CHO BÉ'
  );
  const [category, setCategory] = useState<string>(initialGame?.category || 'Chữ cái');
  const [targetAge, setTargetAge] = useState<string>(initialGame?.targetAge || '5-6 tuổi');
  const [maxTeams, setMaxTeams] = useState<number>(initialGame?.settings?.maxTeams || 8);

  // Background Theme
  const [selectedBgId, setSelectedBgId] = useState<string>(
    initialGame?.theme || 'pastel'
  );
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);

  // Questions stack
  const [questions, setQuestions] = useState<Question[]>(() => {
    if (initialGame && initialGame.questions.length > 0) {
      return JSON.parse(JSON.stringify(initialGame.questions));
    }
    return [
      {
        id: 'cq_' + Date.now() + '_1',
        title: 'Bé hãy chọn hình có chứa chữ cái "A" nhé!',
        type: 'multiple_choice',
        allowMultipleCorrect: false,
        readQuestionAudio: true,
        timeLimit: 0,
        noTimeLimit: true,
        points: 10,
        boxSize: 'lg',
        layoutColumns: 2,
        options: [
          { id: 'opt_1', text: 'Quả táo', isCorrect: true },
          { id: 'opt_2', text: 'Con cá', isCorrect: true },
          { id: 'opt_3', text: 'Cây nấm', isCorrect: false },
          { id: 'opt_4', text: 'Bông hoa', isCorrect: false },
        ],
      },
    ];
  });

  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const currentQ = questions[currentQIndex] || questions[0];

  // Speech test state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Saved interactive questions (drag-and-drop questions created by the user)
  const [savedInteractiveQuestions, setSavedInteractiveQuestions] = useState<SavedInteractiveQuestion[]>(() =>
    getSavedInteractiveQuestions()
  );
  const [isInteractiveCreatorOpen, setIsInteractiveCreatorOpen] = useState(false);
  const [previewingInteractiveQ, setPreviewingInteractiveQ] = useState<Question | null>(null);

  const questionImageInputRef = useRef<HTMLInputElement>(null);
  const answerImageInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const optionImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [newDistractorInput, setNewDistractorInput] = useState('');

  useEffect(() => {
    setSavedInteractiveQuestions(getSavedInteractiveQuestions());
    const unsub = subscribeInteractiveQuestions(() => {
      setSavedInteractiveQuestions(getSavedInteractiveQuestions());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeSpeakingState((speaking) => {
      setIsSpeaking(speaking);
    });
    return () => {
      unsub();
      stopSpeaking();
    };
  }, []);

  const handleUpdateCurrentQ = (patch: Partial<Question>) => {
    setQuestions((prev) => {
      const cloned = [...prev];
      if (cloned[currentQIndex]) {
        cloned[currentQIndex] = {
          ...cloned[currentQIndex],
          ...patch,
        };
      }
      return cloned;
    });
  };

  // Add multiple choice question
  const handleAddQuestion = () => {
    sounds.playCorrect();
    const newQ: Question = {
      id: 'cq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: 'Câu hỏi mới cho bé',
      type: 'multiple_choice',
      allowMultipleCorrect: false,
      readQuestionAudio: true,
      timeLimit: 0,
      noTimeLimit: true,
      points: currentQ?.points || 10,
      boxSize: currentQ?.boxSize || 'lg',
      layoutColumns: currentQ?.layoutColumns || 2,
      options: [
        { id: 'opt_1', text: 'Đáp án 1', isCorrect: true },
        { id: 'opt_2', text: 'Đáp án 2', isCorrect: false },
        { id: 'opt_3', text: 'Đáp án 3', isCorrect: false },
        { id: 'opt_4', text: 'Đáp án 4', isCorrect: false },
      ],
    };
    setQuestions((prev) => [...prev, newQ]);
    setCurrentQIndex(questions.length);
  };

  // Add new open-ended / essay question
  const handleAddOpenEndedQuestion = () => {
    sounds.playClick();
    const newQ: Question = {
      id: 'cq_oe_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: 'Bé hãy vẽ hình hoặc viết đáp án vào ô trống nhé!',
      type: 'open_ended',
      points: 10,
      timeLimit: 0,
      noTimeLimit: true,
      readQuestionAudio: true,
      options: [],
    };
    setQuestions((prev) => [...prev, newQ]);
    setCurrentQIndex(questions.length);
  };

  // Add new word drag & drop question
  const handleAddWordDragQuestion = () => {
    sounds.playCorrect();
    const newQ: Question = {
      id: 'cq_wd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: 'Bé hãy kéo chữ cái còn thiếu vào ô trống để tạo thành từ nhé!',
      type: 'word_drag_drop',
      targetWord: 'miệng',
      wordTemplate: '...iệng',
      missingLetters: ['m'],
      distractorLetters: ['n', 'b', 'p'],
      letterPool: ['m', 'n', 'b', 'p'],
      imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
      answerImageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80',
      answerTitle: 'Cái miệng xinh',
      explanation: 'Chữ "m" ghép với vần "iệng" tạo thành từ "miệng"!',
      timeLimit: 0,
      noTimeLimit: true,
      points: 10,
      readQuestionAudio: true,
      options: [
        { id: 'opt_c', text: 'm', isCorrect: true },
        { id: 'opt_d0', text: 'n', isCorrect: false },
        { id: 'opt_d1', text: 'b', isCorrect: false },
        { id: 'opt_d2', text: 'p', isCorrect: false },
      ],
    };
    setQuestions((prev) => [...prev, newQ]);
    setCurrentQIndex(questions.length);
  };

  // Select which letter in target word is missing (turns it into blank slot [ ? ])
  const handleSelectBlankChar = (char: string, indexInWord: number) => {
    sounds.playClick();
    const word = currentQ?.targetWord || '';
    if (!word) return;
    const prefix = word.substring(0, indexInWord);
    const suffix = word.substring(indexInWord + 1);
    const template = `${prefix}...${suffix}`;

    const newDist = (currentQ?.distractorLetters || []).filter((l) => l.toLowerCase() !== char.toLowerCase());
    const correct = char.toLowerCase();
    handleUpdateCurrentQ({
      missingLetters: [correct],
      wordTemplate: template,
      distractorLetters: newDist,
      letterPool: Array.from(new Set([correct, ...newDist])),
      options: [
        { id: 'opt_c', text: correct, isCorrect: true },
        ...newDist.map((d, i) => ({ id: `opt_d_${i}`, text: d, isCorrect: false })),
      ],
    });
  };

  const handleAddDistractor = (letter: string) => {
    const clean = letter.trim().toLowerCase();
    if (!clean) return;
    sounds.playClick();
    const currentDist = currentQ?.distractorLetters || [];
    if (!currentDist.includes(clean)) {
      const nextDist = [...currentDist, clean];
      const correct = currentQ?.missingLetters?.[0] || 'm';
      handleUpdateCurrentQ({
        distractorLetters: nextDist,
        letterPool: Array.from(new Set([correct, ...nextDist])),
        options: [
          { id: 'opt_c', text: correct, isCorrect: true },
          ...nextDist.map((d, i) => ({ id: `opt_d_${i}`, text: d, isCorrect: false })),
        ],
      });
    }
    setNewDistractorInput('');
  };

  const handleRemoveDistractor = (letter: string) => {
    sounds.playClick();
    const currentDist = (currentQ?.distractorLetters || []).filter((l) => l !== letter);
    const correct = currentQ?.missingLetters?.[0] || 'm';
    handleUpdateCurrentQ({
      distractorLetters: currentDist,
      letterPool: Array.from(new Set([correct, ...currentDist])),
      options: [
        { id: 'opt_c', text: correct, isCorrect: true },
        ...currentDist.map((d, i) => ({ id: `opt_d_${i}`, text: d, isCorrect: false })),
      ],
    });
  };

  const handleAnswerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleUpdateCurrentQ({ answerImageUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add new drag & drop question
  const handleAddDragDropQuestion = () => {
    sounds.playCorrect();
    const latestCreated = savedInteractiveQuestions[0];
    let newQ: Question;
    if (latestCreated) {
      newQ = {
        id: 'cq_dd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: latestCreated.title,
        type: 'drag_drop',
        timeLimit: 0,
        noTimeLimit: true,
        points: latestCreated.points || 10,
        explanation: latestCreated.explanation || '',
        readQuestionAudio: true,
        options: [],
        canvasConfig: JSON.parse(JSON.stringify(latestCreated.canvasConfig)),
      };
    } else {
      const baseQ = BUILDER_TEMPLATES[0].createQuestion();
      newQ = {
        ...baseQ,
        id: 'cq_dd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        title: 'Bé hãy kéo các thẻ vào đúng ô nhé!',
        type: 'drag_drop',
        timeLimit: 0,
        noTimeLimit: true,
        points: 10,
        readQuestionAudio: true,
      };
    }
    setQuestions((prev) => [...prev, newQ]);
    setCurrentQIndex(questions.length);
  };

  // Add specific saved interactive question as new question in current game
  const handleIntegrateInteractiveAsNew = (savedQ: SavedInteractiveQuestion) => {
    sounds.playCorrect();
    const newQ: Question = {
      id: 'cq_dd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: savedQ.title,
      type: 'drag_drop',
      timeLimit: 0,
      noTimeLimit: true,
      points: savedQ.points || 10,
      explanation: savedQ.explanation || '',
      readQuestionAudio: true,
      options: [],
      canvasConfig: JSON.parse(JSON.stringify(savedQ.canvasConfig)),
    };
    setQuestions((prev) => [...prev, newQ]);
    setCurrentQIndex(questions.length);
  };

  // Duplicate question
  const handleDuplicateQuestion = (idx: number) => {
    sounds.playClick();
    const target = questions[idx];
    if (!target) return;
    const clonedQ: Question = {
      ...JSON.parse(JSON.stringify(target)),
      id: 'cq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: target.title + ' (Bản sao)',
    };
    const nextList = [...questions];
    nextList.splice(idx + 1, 0, clonedQ);
    setQuestions(nextList);
    setCurrentQIndex(idx + 1);
  };

  // Delete question
  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('Trò chơi cần có ít nhất 1 câu hỏi.');
      return;
    }
    sounds.playClick();
    const nextList = questions.filter((_, i) => i !== idx);
    setQuestions(nextList);
    setCurrentQIndex(Math.max(0, idx - 1));
  };

  // Move question
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

  // Speech testing
  const handleToggleVoice = () => {
    sounds.playClick();
    unlockSpeechAudio();
    if (isSpeaking) {
      stopSpeaking();
    } else if (currentQ) {
      speakQuestionWithOptions(currentQ.title, currentQ.options);
    }
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
        handleUpdateCurrentQ({ openEndedBgImage: dataUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectPresetBgImage = (dataUrl: string) => {
    sounds.playCorrect();
    handleUpdateCurrentQ({ openEndedBgImage: dataUrl });
  };

  const handleRemoveOpenEndedBgImage = () => {
    sounds.playClick();
    handleUpdateCurrentQ({ openEndedBgImage: undefined });
  };

  // Save game
  const handleSave = () => {
    sounds.playFanfare();
    const gameToSave: Game = {
      id: initialGame?.id || 'game_' + Date.now(),
      title: gameTitle.trim() || 'TRÒ CHƠI TÙY CHỌN',
      description: 'Trò chơi tùy chọn do giáo viên tự thiết kế',
      theme: selectedBgId,
      category,
      targetAge,
      gameType: 'custom',
      status: 'published',
      createdAt: initialGame?.createdAt || Date.now(),
      updatedAt: Date.now(),
      playCount: initialGame?.playCount || 0,
      questions,
      settings: {
        timePerQuestion: 0,
        speedBonus: true,
        maxTeams,
        soundEffects: true,
      },
    };
    saveGame(gameToSave);
    onSaveAndExit(gameToSave);
  };

  const currentTheme = PRESET_WALLPAPERS.find((w) => w.id === selectedBgId) || PRESET_WALLPAPERS[0];
  const boxSize = currentQ?.boxSize || 'lg';
  const columns = currentQ?.layoutColumns || 2;

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden select-none">
      {/* Top Header - Streamlined, Action-Oriented */}
      <header className="h-14 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playClick();
              onCancel();
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <input
              type="text"
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              className="font-black text-slate-900 text-base sm:text-lg bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-hidden px-1 transition"
              placeholder="Tên trò chơi tùy chọn..."
            />
          </div>

          <div className="hidden lg:flex items-center gap-2 ml-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="Chữ cái">Chủ đề: Chữ cái</option>
              <option value="Toán học">Chủ đề: Toán học</option>
              <option value="Khám phá">Chủ đề: Khám phá</option>
              <option value="Kỹ năng sống">Chủ đề: Kỹ năng sống</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Test Voice Button */}
          <button
            onClick={handleToggleVoice}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition cursor-pointer ${
              isSpeaking
                ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
            }`}
            title="Thử nghe giọng đọc câu hỏi"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
            <span className="hidden sm:inline">{isSpeaking ? 'Dừng đọc' : 'Thử giọng'}</span>
          </button>

          {/* Preview Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsPreviewOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Xem trước màn hình chơi"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Xem trước</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>LƯU TRÒ CHƠI</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Questions List & Quick Actions */}
        <div className="w-56 sm:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-400">
                CÂU HỎI ({questions.length})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="py-1.5 px-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] sm:text-[11px] flex items-center justify-center gap-0.5 transition cursor-pointer"
                title="Thêm câu trắc nghiệm"
              >
                <Plus className="w-3 h-3" />
                <span>Trắc nghiệm</span>
              </button>
              <button
                type="button"
                onClick={handleAddOpenEndedQuestion}
                className="py-1.5 px-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-[10px] sm:text-[11px] flex items-center justify-center gap-0.5 transition cursor-pointer"
                title="Thêm câu hỏi tự luận (bé vẽ hoặc viết vào ô trống)"
              >
                <Plus className="w-3 h-3" />
                <span>Tự luận</span>
              </button>
              <button
                type="button"
                onClick={handleAddWordDragQuestion}
                className="py-1.5 px-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-extrabold text-[10px] sm:text-[11px] flex items-center justify-center gap-0.5 transition cursor-pointer"
                title="Thêm câu hỏi kéo thả ô chữ (ghép từ còn thiếu)"
              >
                <Plus className="w-3 h-3" />
                <span>Kéo ô chữ</span>
              </button>
              <button
                type="button"
                onClick={handleAddDragDropQuestion}
                className="py-1.5 px-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold text-[10px] sm:text-[11px] flex items-center justify-center gap-0.5 transition cursor-pointer"
                title="Thêm câu hỏi kéo thả phân loại"
              >
                <Plus className="w-3 h-3" />
                <span>Kéo thả</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {questions.map((q, idx) => {
              const isActive = idx === currentQIndex;
              const isOE = q.type === 'open_ended';
              const isWD = q.type === 'word_drag_drop';
              const isDD = !isWD && (q.type === 'drag_drop' || Boolean(q.canvasConfig));

              return (
                <div
                  key={q.id}
                  onClick={() => {
                    sounds.playClick();
                    setCurrentQIndex(idx);
                  }}
                  className={`p-2.5 rounded-xl text-left transition cursor-pointer border flex items-center justify-between group ${
                    isActive
                      ? isOE
                        ? 'bg-purple-50/90 border-purple-300 text-purple-950 shadow-2xs font-black'
                        : isWD
                        ? 'bg-teal-50/90 border-teal-300 text-teal-950 shadow-2xs font-black'
                        : isDD
                        ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs font-black'
                        : 'bg-indigo-50/80 border-indigo-300 text-indigo-900 shadow-2xs font-black'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-bold'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-black text-slate-400">
                        Câu {idx + 1}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                        isOE
                          ? 'bg-purple-100 text-purple-700'
                          : isWD
                          ? 'bg-teal-100 text-teal-800'
                          : isDD
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {isOE ? 'Tự luận' : isWD ? 'Ô chữ' : isDD ? 'Kéo thả' : 'Trắc nghiệm'}
                      </span>
                    </div>
                    <p className="text-xs truncate mt-0.5">{q.title || 'Câu hỏi chưa đặt tên'}</p>
                  </div>

                  {/* Actions inside list */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveQuestion(idx, 'up');
                      }}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                      title="Chuyển câu lên trước"
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
                      title="Chuyển câu xuống sau"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateQuestion(idx);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition cursor-pointer"
                      title="Nhân bản"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(idx);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                        title="Xóa câu"
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
          <div className="p-2 border-t border-slate-100 flex items-center justify-around bg-slate-50/60">
            <button
              onClick={() => handleMoveQuestion(currentQIndex, 'up')}
              disabled={currentQIndex === 0}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Chuyển câu lên trên"
            >
              <MoveUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleMoveQuestion(currentQIndex, 'down')}
              disabled={currentQIndex === questions.length - 1}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Chuyển câu xuống dưới"
            >
              <MoveDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDuplicateQuestion(currentQIndex)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              title="Sao chép câu này"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Live Interactive Design Canvas */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Quick Customization Toolbar - Icons & Buttons Priority */}
          <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 shadow-2xs">
            {/* Left Controls: Question Type & Voice */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-500 uppercase">Loại câu:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    handleUpdateCurrentQ({
                      type: 'multiple_choice',
                      options: currentQ?.options?.length ? currentQ.options : [
                        { id: 'opt_1', text: 'Đáp án 1', isCorrect: true },
                        { id: 'opt_2', text: 'Đáp án 2', isCorrect: false },
                        { id: 'opt_3', text: 'Đáp án 3', isCorrect: false },
                        { id: 'opt_4', text: 'Đáp án 4', isCorrect: false },
                      ],
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currentQ?.type === 'multiple_choice' || (!currentQ?.type && !currentQ?.canvasConfig)
                      ? 'bg-white text-indigo-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Trắc nghiệm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    handleUpdateCurrentQ({
                      type: 'open_ended',
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currentQ?.type === 'open_ended'
                      ? 'bg-purple-600 text-white shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tự luận
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    const correct = currentQ?.missingLetters?.[0] || 'm';
                    const distractors = currentQ?.distractorLetters?.length ? currentQ.distractorLetters : ['n', 'b', 'p'];
                    handleUpdateCurrentQ({
                      type: 'word_drag_drop',
                      targetWord: currentQ?.targetWord || 'miệng',
                      wordTemplate: currentQ?.wordTemplate || '...iệng',
                      missingLetters: [correct],
                      distractorLetters: distractors,
                      letterPool: Array.from(new Set([correct, ...distractors])),
                      options: [
                        { id: 'opt_c', text: correct, isCorrect: true },
                        ...distractors.map((d, i) => ({ id: `opt_d_${i}`, text: d, isCorrect: false })),
                      ],
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currentQ?.type === 'word_drag_drop'
                      ? 'bg-teal-600 text-white shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kéo ô chữ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    const dflt = BUILDER_TEMPLATES[0].createQuestion();
                    handleUpdateCurrentQ({
                      type: 'drag_drop',
                      canvasConfig: currentQ?.canvasConfig || dflt.canvasConfig,
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currentQ?.type === 'drag_drop' || (Boolean(currentQ?.canvasConfig) && currentQ?.type !== 'word_drag_drop')
                      ? 'bg-amber-500 text-white shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kéo thả
                </button>
              </div>

              {/* Sub-toggle for multiple-choice only */}
              {(currentQ?.type === 'multiple_choice' || (!currentQ?.type && !currentQ?.canvasConfig)) && (
                <div className="flex items-center bg-indigo-50/70 p-0.5 rounded-xl border border-indigo-200">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      handleUpdateCurrentQ({ allowMultipleCorrect: false });
                    }}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      !currentQ?.allowMultipleCorrect
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-indigo-800 hover:text-indigo-950'
                    }`}
                  >
                    1 đáp án
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      handleUpdateCurrentQ({ allowMultipleCorrect: true });
                    }}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      currentQ?.allowMultipleCorrect
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-indigo-800 hover:text-indigo-950'
                    }`}
                  >
                    Nhiều đáp án
                  </button>
                </div>
              )}

              {/* Speaker Toggle */}
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  handleUpdateCurrentQ({ readQuestionAudio: !currentQ?.readQuestionAudio });
                }}
                className={`ml-1 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                  currentQ?.readQuestionAudio
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
                title="Bật/Tắt nút loa đọc câu hỏi"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Loa đọc: {currentQ?.readQuestionAudio ? 'BẬT' : 'TẮT'}</span>
              </button>
            </div>

            {/* Right Controls: Points, Box Size & Columns */}
            <div className="flex items-center gap-3">

              {/* Points selector */}
              <div className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={currentQ?.points || 10}
                  onChange={(e) => handleUpdateCurrentQ({ points: Number(e.target.value) })}
                  className="text-xs font-black bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 cursor-pointer"
                >
                  <option value={5}>5 điểm</option>
                  <option value={10}>10 điểm</option>
                  <option value={15}>15 điểm</option>
                  <option value={20}>20 điểm</option>
                  <option value={50}>50 điểm</option>
                </select>
              </div>

              {/* Box Size & Columns for multiple choice only */}
              {currentQ?.type === 'multiple_choice' && (
                <>
                  {/* Box Size: S, M, L, XL */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 px-1">Cỡ:</span>
                    {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          handleUpdateCurrentQ({ boxSize: s });
                        }}
                        className={`w-6 h-6 rounded-md text-[11px] font-black transition cursor-pointer ${
                          boxSize === s
                            ? 'bg-white text-indigo-700 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Layout Columns: 1, 2, 3, 4 */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 px-1">Lưới:</span>
                    {[1, 2, 3, 4].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          handleUpdateCurrentQ({ layoutColumns: col as any });
                        }}
                        className={`w-6 h-6 rounded-md text-[11px] font-black transition cursor-pointer ${
                          columns === col
                            ? 'bg-white text-indigo-700 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title={`${col} cột`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Max Teams Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 px-1">Đội:</span>
                <select
                  value={maxTeams}
                  onChange={(e) => {
                    sounds.playClick();
                    setMaxTeams(Number(e.target.value));
                  }}
                  className="bg-transparent text-xs font-black text-slate-700 outline-none pr-1 cursor-pointer"
                  title="Số đội chơi hỗ trợ (tối đa 12 đội)"
                >
                  <option value={2}>2 đội</option>
                  <option value={3}>3 đội</option>
                  <option value={4}>4 đội</option>
                  <option value={5}>5 đội</option>
                  <option value={6}>6 đội</option>
                  <option value={8}>8 đội</option>
                  <option value={10}>10 đội</option>
                  <option value={12}>12 đội</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Visual Frame (The Canvas) */}
          <div
            className={`flex-1 p-4 sm:p-6 pb-28 transition-all duration-300 relative flex flex-col items-center justify-start min-h-full ${
              currentTheme.bgClass
            }`}
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
            {/* Background Selector Pill at Top-Right of Canvas */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/40 shadow-sm z-10">
              <Palette className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Nền hình:</span>
              <div className="flex items-center gap-1.5">
                {PRESET_WALLPAPERS.map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() => {
                      sounds.playClick();
                      setSelectedBgId(wp.id);
                      setCustomBgImage(null);
                    }}
                    style={{ backgroundColor: wp.previewColor }}
                    className={`w-5 h-5 rounded-full border-2 transition transform hover:scale-110 cursor-pointer ${
                      selectedBgId === wp.id && !customBgImage
                        ? 'border-indigo-600 ring-2 ring-indigo-200'
                        : 'border-slate-300'
                    }`}
                    title={wp.name}
                  />
                ))}
                <button
                  onClick={() => bgImageInputRef.current?.click()}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold border border-slate-200 cursor-pointer"
                  title="Tải ảnh nền riêng"
                >
                  Tải ảnh
                </button>
                <input
                  ref={bgImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const r = new FileReader();
                    r.onload = (ev) => {
                      setCustomBgImage(ev.target?.result as string);
                    };
                    r.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* Central Question & Option Workspace Box */}
            <div className="w-full max-w-4xl bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl border border-white/60">
              {/* Question Header & Title Input */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs">
                      CÂU {currentQIndex + 1}
                    </span>
                    {currentQ?.readQuestionAudio && (
                      <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-1 border border-rose-200">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Có đọc câu hỏi</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => questionImageInputRef.current?.click()}
                    className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{currentQ?.imageUrl ? 'Đổi ảnh câu hỏi' : 'Thêm ảnh'}</span>
                  </button>
                  <input
                    ref={questionImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const r = new FileReader();
                      r.onload = (ev) => {
                        handleUpdateCurrentQ({ imageUrl: ev.target?.result as string });
                      };
                      r.readAsDataURL(f);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={answerImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAnswerImageUpload}
                  />
                </div>

                {/* Question Input */}
                <textarea
                  value={currentQ?.title || ''}
                  onChange={(e) => handleUpdateCurrentQ({ title: e.target.value })}
                  placeholder="Nhập nội dung câu hỏi cho bé tại đây..."
                  rows={2}
                  className="w-full text-lg sm:text-xl font-black text-slate-900 border-2 border-slate-200 rounded-2xl p-3.5 focus:border-indigo-500 focus:outline-hidden transition resize-y"
                />

                {/* Question Image Preview & Size Controls */}
                {currentQ?.imageUrl && (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="relative inline-block group bg-white rounded-xl p-1 border border-slate-200 shadow-2xs">
                        <img
                          src={currentQ.imageUrl}
                          alt="Question"
                          style={{
                            maxHeight: `${currentQ.imageHeight || (currentQ.imageSize === 'sm' ? 120 : currentQ.imageSize === 'lg' ? 250 : currentQ.imageSize === 'xl' ? 340 : 180)}px`,
                          }}
                          className="rounded-lg object-contain transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateCurrentQ({ imageUrl: undefined })}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 shadow-md cursor-pointer transition active:scale-95"
                          title="Xóa ảnh minh họa"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                        Hình minh họa sẽ hiển thị trên màn hình học sinh với kích thước tương ứng.
                      </span>
                    </div>

                    {/* Image Size Toolbar */}
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
                          const currentH = currentQ.imageHeight || (currentQ.imageSize === 'sm' ? 120 : currentQ.imageSize === 'lg' ? 250 : currentQ.imageSize === 'xl' ? 340 : 180);
                          const active = (currentQ.imageHeight === sz.height) || (!currentQ.imageHeight && (currentQ.imageSize === sz.key || (sz.key === 'md' && !currentQ.imageSize)));
                          return (
                            <button
                              key={sz.key}
                              type="button"
                              onClick={() => handleUpdateCurrentQ({ imageSize: sz.key as any, imageHeight: sz.height })}
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
                            value={currentQ.imageHeight || (currentQ.imageSize === 'sm' ? 120 : currentQ.imageSize === 'lg' ? 250 : currentQ.imageSize === 'xl' ? 340 : 180)}
                            onChange={(e) => handleUpdateCurrentQ({ imageHeight: Number(e.target.value) })}
                            className="w-20 sm:w-24 accent-indigo-600 cursor-pointer"
                            title="Kéo để tinh chỉnh chiều cao ảnh"
                          />
                          <span className="text-[11px] font-black text-indigo-700 min-w-[42px] text-right">
                            {currentQ.imageHeight || (currentQ.imageSize === 'sm' ? 120 : currentQ.imageSize === 'lg' ? 250 : currentQ.imageSize === 'xl' ? 340 : 180)}px
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Question Type Specific Editor Area */}
              {currentQ?.type === 'open_ended' ? (
                /* OPEN-ENDED QUESTION CONFIGURATION (Same interface & functionality, no modelAnswer) */
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50/40 to-pink-50/40 rounded-3xl p-5 sm:p-6 border-2 border-purple-200 space-y-4 mb-6">
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
                          Trẻ sẽ có ô trống bảng vẽ và ô chữ để tự do ghi, vẽ đáp án; hệ thống tự động ghi nhận nét vẽ
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
                      {currentQ.openEndedBgImage && (
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

                    {currentQ.openEndedBgImage ? (
                      <div className="flex items-center gap-4 bg-white p-3.5 rounded-2xl border border-purple-200 shadow-2xs">
                        <img
                          src={currentQ.openEndedBgImage}
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
                      <p>1. <b>Học sinh:</b> Màn hình có ô trống, bảng cọ vẽ 8 màu sắc, tẩy, xóa vẽ lại và ô nhập chữ để bé làm bài. Hệ thống tự động ghi nhận ngay khi bé vẽ xong nét cọ.</p>
                      <p>2. <b>Giáo viên:</b> Ở màn hình kết quả câu hỏi và tổng kết, cô xem bài vẽ & chữ viết của từng bé, có nút <b>"Chấm điểm & Sửa bài"</b> để cho điểm và gửi lời nhận xét trực tiếp về thiết bị của trẻ!</p>
                    </div>
                  </div>
                </div>
              ) : currentQ?.type === 'drag_drop' || Boolean(currentQ?.canvasConfig) ? (
                /* DRAG & DROP QUESTION CONFIGURATION */
                <div className="bg-gradient-to-r from-amber-50 via-orange-50/40 to-yellow-50/40 rounded-3xl p-5 sm:p-6 border-2 border-amber-200 space-y-4 mb-6">
                  <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-amber-950 uppercase tracking-wide">
                          CẤU HÌNH CÂU HỎI KÉO THẢ PHÂN LOẠI (DRAG & DROP)
                        </h4>
                        <p className="text-xs font-bold text-slate-500">
                          Trẻ dùng ngón tay kéo các thẻ phía dưới thả vào đúng ô đích phía trên
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-black px-3 py-1 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
                      🎯 Tự động chấm điểm thời gian thực
                    </span>
                  </div>

                  {/* Interactive Questions Integration Section */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-amber-200/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                            CÂU HỎI KÉO THẢ TƯƠNG TÁC ĐÃ TẠO
                          </label>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            {savedInteractiveQuestions.length} câu đã có
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                          Chọn câu hỏi kéo thả bạn đã thiết kế (ví dụ kéo thả m, n) để tích hợp vào câu hỏi tùy chọn này
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setIsInteractiveCreatorOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                        title="Mở Bảng tương tác để tự do vẽ, thêm ô đích và thẻ kéo thả mới"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                        <span>+ Tạo câu hỏi kéo thả mới (Bảng tương tác)</span>
                      </button>
                    </div>

                    {/* List of Created Interactive Questions */}
                    {savedInteractiveQuestions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                        {savedInteractiveQuestions.map((iq) => {
                          const isCurrentlySelected =
                            currentQ.canvasConfig &&
                            currentQ.title === iq.title;
                          const dropZones = iq.canvasConfig.elements.filter(e => e.isDropZone);
                          const draggables = iq.canvasConfig.elements.filter(e => e.isDraggable);

                          return (
                            <div
                              key={iq.id}
                              className={`p-3.5 rounded-2xl bg-white border-2 text-left transition flex flex-col justify-between shadow-2xs group ${
                                isCurrentlySelected
                                  ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-200'
                                  : 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/30'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 truncate max-w-[200px]">
                                    {iq.gameTitle || 'Tự thiết kế'}
                                  </span>
                                  {isCurrentlySelected ? (
                                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-emerald-300">
                                      <Check className="w-3 h-3" />
                                      <span>Đang chọn</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {new Date(iq.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <h5 className="font-black text-sm text-slate-900 leading-snug group-hover:text-amber-800">
                                    {iq.title}
                                  </h5>
                                  {iq.explanation && (
                                    <p className="text-[11px] text-slate-500 font-semibold line-clamp-1 mt-0.5">
                                      {iq.explanation}
                                    </p>
                                  )}
                                </div>

                                {/* Preview Drop zones and draggables */}
                                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="font-extrabold text-slate-500">Ô đích:</span>
                                    {dropZones.map((z, idx) => (
                                      <span
                                        key={z.id || idx}
                                        className="px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-black text-[10px] border border-sky-200"
                                      >
                                        {z.text || `Ô ${idx + 1}`}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex items-center justify-between text-slate-500 font-bold text-[10px]">
                                    <span>🃏 Thẻ kéo: <b>{draggables.length} thẻ</b></span>
                                    <span>🎯 Luật chấm: <b>{iq.canvasConfig.rules?.length || 0} mục</b></span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    sounds.playCorrect();
                                    handleUpdateCurrentQ({
                                      title: iq.title,
                                      canvasConfig: JSON.parse(JSON.stringify(iq.canvasConfig)),
                                      explanation: iq.explanation,
                                      points: iq.points || 10,
                                    });
                                  }}
                                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow-xs ${
                                    isCurrentlySelected
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                                  }`}
                                >
                                  <span>{isCurrentlySelected ? '✓ Đã tích hợp câu này' : '🎯 Tích hợp vào câu này'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleIntegrateInteractiveAsNew(iq)}
                                  className="py-1.5 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
                                  title="Thêm câu hỏi này thành 1 câu mới trong bài"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Thêm câu mới</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewingInteractiveQ({
                                      id: iq.id,
                                      title: iq.title,
                                      type: 'drag_drop',
                                      canvasConfig: iq.canvasConfig,
                                      points: iq.points,
                                      explanation: iq.explanation,
                                      options: [],
                                      timeLimit: 0,
                                      noTimeLimit: true,
                                    });
                                  }}
                                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                                  title="Xem trước câu hỏi tương tác này"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Empty state when no interactive questions created yet */
                      <div className="p-6 rounded-2xl bg-white border-2 border-dashed border-amber-300 text-center space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shadow-2xs">
                          🎨
                        </div>
                        <div className="max-w-md mx-auto space-y-1">
                          <h5 className="font-black text-sm text-slate-800">
                            Chưa có câu hỏi kéo thả tương tác nào được tạo
                          </h5>
                          <p className="text-xs font-bold text-slate-500 leading-relaxed">
                            Bấm nút bên dưới để mở Bảng tương tác thiết kế câu hỏi kéo thả (như kéo thả chữ m, n, số đếm, con vật...), sau đó bạn có thể chọn và tích hợp trực tiếp vào câu hỏi tùy chọn này!
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setIsInteractiveCreatorOpen(true);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs inline-flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-amber-200" />
                          <span>Mở Bảng tương tác để tạo câu hỏi kéo thả ngay</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Drop Zones & Cards Summary */}
                  {currentQ.canvasConfig && (
                    <div className="bg-white rounded-2xl p-4 border border-amber-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-900 uppercase">
                          Các ô đích và thẻ kéo thả:
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsPreviewOpen(true)}
                          className="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-black flex items-center gap-1 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem trước tương tác</span>
                        </button>
                      </div>

                      {/* Zones list */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {currentQ.canvasConfig.elements.filter(e => e.isDropZone).map((zone, zIdx) => (
                          <div key={zone.id} className="p-3 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/50 flex flex-col gap-1">
                            <span className="text-[10px] font-black text-sky-700 uppercase">Tên ô đích {zIdx + 1}:</span>
                            <input
                              type="text"
                              value={zone.text || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const newElements = currentQ.canvasConfig!.elements.map(el =>
                                  el.id === zone.id ? { ...el, text: val } : el
                                );
                                handleUpdateCurrentQ({
                                  canvasConfig: { ...currentQ.canvasConfig!, elements: newElements }
                                });
                              }}
                              className="font-black text-xs text-sky-950 bg-white border border-sky-200 rounded-lg px-2 py-1"
                              placeholder="Tên ô đích..."
                            />
                          </div>
                        ))}
                      </div>

                      {/* Draggable cards count & preview */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Tổng số thẻ kéo: <b>{currentQ.canvasConfig.elements.filter(e => e.isDraggable).length} thẻ</b></span>
                        <span>Luật chấm đúng: <b>{currentQ.canvasConfig.rules?.length || 0} mục</b></span>
                      </div>
                    </div>
                  )}
                </div>
              ) : currentQ?.type === 'word_drag_drop' ? (
                /* WORD DRAG DROP CONFIGURATION */
                <div className="bg-gradient-to-r from-teal-50 via-cyan-50/40 to-emerald-50/40 rounded-3xl p-5 sm:p-6 border-2 border-teal-200 space-y-4 mb-6">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-teal-200/60 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black shadow-xs">
                        <Type className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-teal-950 uppercase tracking-wide">
                          CẤU HÌNH CÂU HỎI KÉO THẢ Ô CHỮ (WORD DRAG & DROP)
                        </h4>
                        <p className="text-xs font-bold text-slate-500">
                          Bé kéo chữ cái còn thiếu vào ô trống để hoàn thành từ đúng. Cô sẽ kết thúc thu bài và chấm điểm.
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-black px-3 py-1 bg-teal-100 text-teal-900 rounded-xl border border-teal-300">
                      ⭐ Trẻ không thấy đáp án ngay · Cô thu bài & chấm điểm
                    </span>
                  </div>

                  {/* Section 1: Target Word & Template */}
                  <div className="bg-white rounded-2xl p-4 border border-teal-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-black text-slate-700 block mb-1">
                          Từ hoàn chỉnh (đầy đủ):
                        </label>
                        <input
                          type="text"
                          value={currentQ.targetWord || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateCurrentQ({ targetWord: val });
                          }}
                          placeholder="VD: miệng, con mèo, quả dừa..."
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border-2 border-slate-200 font-black text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black text-slate-700 block mb-1">
                          Mẫu từ hiển thị (dùng <code className="bg-teal-100 text-teal-800 px-1 rounded">...</code> cho ô trống):
                        </label>
                        <input
                          type="text"
                          value={currentQ.wordTemplate || ''}
                          onChange={(e) => handleUpdateCurrentQ({ wordTemplate: e.target.value })}
                          placeholder="VD: ...iệng hoặc con ...èo hoặc quả ...ừa"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border-2 border-slate-200 font-black text-sm text-teal-700 focus:outline-none focus:border-teal-500 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    {/* Interactive Click-to-blank Letter Selector */}
                    {currentQ.targetWord && currentQ.targetWord.trim().length > 0 && (
                      <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-teal-950">
                            👉 BẤM VÀO CHỮ CÁI DƯỚI ĐÂY ĐỂ ĐẶT LÀM Ô TRỐNG [ ? ]:
                          </span>
                          <span className="text-[11px] font-bold text-teal-700 bg-white px-2 py-0.5 rounded-lg border border-teal-200">
                            Chữ đúng hiện tại: <b>{(currentQ.missingLetters?.[0] || 'm').toUpperCase()}</b>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {currentQ.targetWord.split('').map((char, charIdx) => {
                            if (char === ' ') {
                              return <span key={charIdx} className="w-4 text-center font-bold text-slate-400">·</span>;
                            }
                            const isCurrentMissing = (currentQ.missingLetters?.[0] || '').toLowerCase() === char.toLowerCase();

                            return (
                              <button
                                key={charIdx}
                                type="button"
                                onClick={() => handleSelectBlankChar(char, charIdx)}
                                className={`w-10 h-11 rounded-xl font-black text-base transition active:scale-95 cursor-pointer flex flex-col items-center justify-center uppercase shadow-2xs ${
                                  isCurrentMissing
                                    ? 'bg-teal-600 text-white ring-4 ring-teal-300 scale-105'
                                    : 'bg-white hover:bg-teal-100 text-slate-800 border-2 border-teal-200'
                                }`}
                                title={`Bấm để chọn chữ "${char}" làm ô trống`}
                              >
                                <span>{char}</span>
                                <span className="text-[8px] font-extrabold opacity-75">
                                  {isCurrentMissing ? 'TRỐNG' : 'CHỌN'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Letters for Child to Drag (Tray) */}
                  <div className="bg-white rounded-2xl p-4 border border-teal-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-700">
                        CÁC CHỮ CÁI CHO BÉ KÉO VÀO Ô:
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        Bao gồm 1 chữ đúng và các chữ gây nhiễu
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Correct Letter Card */}
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-100 border-2 border-emerald-400 text-emerald-900 font-black text-xs flex items-center gap-1.5 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Chữ đúng: <b>{(currentQ.missingLetters?.[0] || 'm').toUpperCase()}</b></span>
                      </div>

                      {/* Distractor Letter Cards */}
                      {(currentQ.distractorLetters || []).map((letter) => (
                        <div
                          key={letter}
                          className="px-2.5 py-1 rounded-xl bg-slate-50 border-2 border-slate-300 text-slate-800 font-black text-xs flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className="uppercase">{letter}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDistractor(letter)}
                            className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-0.5"
                            title="Xóa chữ này"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Quick Add from Vietnamese Alphabet */}
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
                              className={`w-6 h-6 rounded-md text-[11px] font-black uppercase transition cursor-pointer ${
                                isAlreadyIn
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-40'
                                  : 'bg-white hover:bg-teal-600 hover:text-white text-slate-700 border border-slate-300 active:scale-95 shadow-2xs'
                              }`}
                            >
                              {char}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Answer Image Upload & Answer Details */}
                  <div className="bg-white rounded-2xl p-4 border border-teal-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase text-teal-900 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-teal-600" />
                        <span>HÌNH ẢNH ĐÁP ÁN ĐÚNG CỦA CÔ (HIỂN THỊ SONG SONG TRONG CHI TIẾT CHẤM BÀI) ⭐</span>
                      </label>
                      {currentQ.answerImageUrl && (
                        <button
                          type="button"
                          onClick={() => handleUpdateCurrentQ({ answerImageUrl: undefined })}
                          className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Xóa ảnh đáp án
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-teal-50/40 p-3 rounded-xl border border-teal-200">
                      {currentQ.answerImageUrl ? (
                        <div className="relative w-24 h-24 rounded-xl bg-white border-2 border-teal-300 overflow-hidden shadow-xs shrink-0 flex items-center justify-center p-1">
                          <img
                            src={currentQ.answerImageUrl}
                            alt="Ảnh đáp án"
                            className="max-h-full max-w-full object-contain rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-xl bg-white border-2 border-dashed border-teal-300 flex flex-col items-center justify-center text-slate-400 p-2 text-center shrink-0">
                          <ImageIcon className="w-6 h-6 mb-1 text-teal-400" />
                          <span className="text-[10px] font-bold text-teal-700">Chưa có ảnh</span>
                        </div>
                      )}

                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => answerImageInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Tải ảnh đáp án từ máy tính</span>
                          </button>
                        </div>

                        <input
                          type="text"
                          value={currentQ.answerImageUrl || ''}
                          onChange={(e) => handleUpdateCurrentQ({ answerImageUrl: e.target.value })}
                          placeholder="Hoặc dán URL link ảnh đáp án..."
                          className="w-full px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-400"
                        />

                        <input
                          type="text"
                          value={currentQ.answerTitle || ''}
                          onChange={(e) => handleUpdateCurrentQ({ answerTitle: e.target.value })}
                          placeholder="Tên gọi đáp án (VD: Cái miệng xinh, Con mèo con...)"
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-teal-200 text-xs font-black text-teal-900 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1">
                        Lời giải thích / gợi ý của cô:
                      </label>
                      <input
                        type="text"
                        value={currentQ.explanation || ''}
                        onChange={(e) => handleUpdateCurrentQ({ explanation: e.target.value })}
                        placeholder="VD: Chữ m ghép với vần iệng tạo thành từ miệng..."
                        className="w-full px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  </div>

                  {/* Section 4: Live Interactive Card Preview */}
                  <div className="bg-white rounded-2xl p-4 border border-teal-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-teal-950 uppercase flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-teal-600" />
                        <span>MÔ PHỎNG MÀN HÌNH CỦA BÉ:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPreviewOpen(true)}
                        className="text-xs font-black text-teal-700 hover:underline cursor-pointer"
                      >
                        Mở xem trước đầy đủ ➔
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex flex-col items-center justify-center gap-3 text-center">
                      {/* Word slot preview */}
                      <div className="flex items-center gap-2">
                        {(() => {
                          const template = currentQ.wordTemplate || (currentQ.targetWord ? `...${currentQ.targetWord.substring(1)}` : '...iệng');
                          const parts = template.split('...');
                          const prefix = parts[0] || '';
                          const suffix = parts[1] || '';
                          return (
                            <div className="flex items-center gap-2">
                              {prefix && (
                                <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-wider">
                                  {prefix}
                                </span>
                              )}
                              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-3 border-dashed border-teal-500 bg-white flex items-center justify-center text-teal-700 font-black text-lg sm:text-xl tracking-widest shadow-inner">
                                ......
                              </div>
                              {suffix && (
                                <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-wider">
                                  {suffix}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Letters tray preview */}
                      <div className="flex items-center gap-2 flex-wrap justify-center pt-2 border-t border-teal-200/60 w-full">
                        <span className="text-[10px] font-bold text-slate-400 block w-full">Các thẻ chữ bé có thể kéo vào:</span>
                        {Array.from(new Set([currentQ.missingLetters?.[0] || 'm', ...(currentQ.distractorLetters || ['n', 'b', 'p'])])).map((char) => (
                          <span
                            key={char}
                            className="w-10 h-10 rounded-xl bg-white border-2 border-slate-300 shadow-sm text-slate-800 font-black text-base flex items-center justify-center uppercase"
                          >
                            {char}
                          </span>
                        ))}
                      </div>

                      <p className="text-[11px] font-semibold text-teal-900 bg-teal-100/80 px-3 py-1 rounded-xl">
                        💡 Bé có thể kéo hoặc chạm bất kỳ chữ cái nào vào ô trống. Hệ thống KHÔNG báo đúng/sai ngay. Khi hết giờ hoặc cô bấm <b>"KẾT THÚC & THU BÀI"</b>, cô sẽ là người chấm điểm cho bé!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Options Section */
                <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wide">
                    CÁC Ô ĐÁP ÁN (Bấm vào vòng tròn để chọn đáp án đúng):
                  </span>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      const nextOpts = [
                        ...(currentQ?.options || []),
                        {
                          id: 'opt_' + Date.now(),
                          text: `Đáp án ${(currentQ?.options?.length || 0) + 1}`,
                          isCorrect: false,
                        },
                      ];
                      handleUpdateCurrentQ({ options: nextOpts });
                    }}
                    className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm ô đáp án</span>
                  </button>
                </div>

                {/* Options Grid with Dynamic Columns & Box Sizes */}
                <div
                  className={`grid gap-3 ${
                    columns === 1
                      ? 'grid-cols-1'
                      : columns === 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : columns === 3
                      ? 'grid-cols-1 sm:grid-cols-3'
                      : 'grid-cols-2 sm:grid-cols-4'
                  }`}
                >
                  {currentQ?.options.map((opt, optIdx) => {
                    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                    const letter = letters[optIdx] || `${optIdx + 1}`;
                    const paddingClass =
                      boxSize === 'sm'
                        ? 'p-2.5'
                        : boxSize === 'md'
                        ? 'p-3.5'
                        : boxSize === 'lg'
                        ? 'p-4'
                        : 'p-5';
                    const textClass =
                      boxSize === 'sm'
                        ? 'text-xs'
                        : boxSize === 'md'
                        ? 'text-sm'
                        : boxSize === 'lg'
                        ? 'text-base font-extrabold'
                        : 'text-lg font-black';

                    return (
                      <div
                        key={opt.id}
                        className={`rounded-2xl border-2 transition-all flex flex-col justify-between relative group ${
                          opt.isCorrect
                            ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                        } ${paddingClass}`}
                      >
                        <div className="flex items-center gap-2 mb-2 min-w-0">
                          {/* Toggle Correct Button */}
                          <button
                            onClick={() => {
                              sounds.playClick();
                              const isMultiple = currentQ.allowMultipleCorrect;
                              const updated = currentQ.options.map((o) => {
                                if (o.id === opt.id) {
                                  return { ...o, isCorrect: !o.isCorrect };
                                }
                                return isMultiple ? o : { ...o, isCorrect: false };
                              });
                              handleUpdateCurrentQ({ options: updated });
                            }}
                            className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center transition cursor-pointer shrink-0 ${
                              opt.isCorrect
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                            title="Bấm để đặt làm đáp án đúng"
                          >
                            {opt.isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : letter}
                          </button>

                          {/* Option text input with min-w-0 to prevent flex overflow */}
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const updated = currentQ.options.map((o) =>
                                o.id === opt.id ? { ...o, text: e.target.value } : o
                              );
                              handleUpdateCurrentQ({ options: updated });
                            }}
                            className={`flex-1 min-w-0 font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden transition ${textClass}`}
                            placeholder="Nội dung đáp án..."
                          />

                          {/* Delete option button - always inside card */}
                          {currentQ.options.length > 2 && (
                            <button
                              onClick={() => {
                                sounds.playClick();
                                const updated = currentQ.options.filter((o) => o.id !== opt.id);
                                handleUpdateCurrentQ({ options: updated });
                              }}
                              className="shrink-0 p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="Xóa đáp án này"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Optional Image for Option with Size Customization */}
                        <div className="mt-2 pt-2 border-t border-slate-200/60">
                          {opt.imageUrl ? (
                            <div className="space-y-2">
                              {/* Image Display according to selected size */}
                              <div className={`relative ${opt.imageFit === 'full' || opt.imageFit === 'custom' ? 'w-full' : 'inline-block'}`}>
                                <img
                                  src={opt.imageUrl}
                                  alt="Option"
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
                                    const updated = currentQ.options.map((o) =>
                                      o.id === opt.id ? { ...o, imageUrl: undefined } : o
                                    );
                                    handleUpdateCurrentQ({ options: updated });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs hover:bg-rose-600 shadow-sm cursor-pointer"
                                  title="Xóa ảnh này"
                                >
                                  ×
                                </button>
                              </div>

                              {/* Size Selector Toolbar */}
                              <div className="space-y-1.5 pt-1">
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <div className="flex flex-wrap items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                                    <span className="text-[10px] font-black text-slate-400 px-1">Cỡ ảnh:</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        sounds.playClick();
                                        const updated = currentQ.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageFit: 'small' as const } : o
                                        );
                                        handleUpdateCurrentQ({ options: updated });
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
                                        const updated = currentQ.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageFit: 'medium' as const } : o
                                        );
                                        handleUpdateCurrentQ({ options: updated });
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
                                        const updated = currentQ.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageFit: 'large' as const } : o
                                        );
                                        handleUpdateCurrentQ({ options: updated });
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
                                        const updated = currentQ.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageFit: 'full' as const } : o
                                        );
                                        handleUpdateCurrentQ({ options: updated });
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
                                        const updated = currentQ.options.map((o) =>
                                          o.id === opt.id
                                            ? { ...o, imageFit: 'custom' as const, imageHeight: o.imageHeight || 150 }
                                            : o
                                        );
                                        handleUpdateCurrentQ({ options: updated });
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

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => optionImageInputRefs.current[opt.id]?.click()}
                                      className="text-[10px] font-extrabold text-indigo-600 hover:underline cursor-pointer"
                                    >
                                      Đổi ảnh
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        sounds.playClick();
                                        const updated = currentQ.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageUrl: undefined } : o
                                        );
                                        handleUpdateCurrentQ({ options: updated });
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
                                        const updated = currentQ.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageHeight: nextH } : o
                                        );
                                        handleUpdateCurrentQ({ options: updated });
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
                                        const updated = currentQ.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageHeight: val } : o
                                        );
                                        handleUpdateCurrentQ({ options: updated });
                                      }}
                                      className="flex-1 accent-purple-600 cursor-pointer h-1.5 bg-purple-200 rounded-lg"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentH = opt.imageHeight || 150;
                                        const nextH = Math.min(280, currentH + 20);
                                        const updated = currentQ.options.map((o) =>
                                          o.id === opt.id ? { ...o, imageHeight: nextH } : o
                                        );
                                        handleUpdateCurrentQ({ options: updated });
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
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => optionImageInputRefs.current[opt.id]?.click()}
                                className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-indigo-50 border border-dashed border-slate-200 transition cursor-pointer"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                                <span>+ Thêm ảnh đáp án</span>
                              </button>
                              <span className="text-[10px] font-bold text-slate-400">
                                {opt.isCorrect ? '✓ Đáp án đúng' : ''}
                              </span>
                            </div>
                          )}

                          <input
                            ref={(el) => {
                              optionImageInputRefs.current[opt.id] = el;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const r = new FileReader();
                              r.onload = (ev) => {
                                const updated = currentQ.options.map((o) =>
                                  o.id === opt.id
                                    ? {
                                        ...o,
                                        imageUrl: ev.target?.result as string,
                                        imageFit: o.imageFit || 'full', // Default to full frame so image is immediately big and clear!
                                      }
                                    : o
                                );
                                handleUpdateCurrentQ({ options: updated });
                              };
                              r.readAsDataURL(f);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Optional Explanation for preschool children */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  Lời khen / Giải thích cho bé (hiện sau khi trả lời):
                </span>
                <input
                  type="text"
                  value={currentQ?.explanation || ''}
                  onChange={(e) => handleUpdateCurrentQ({ explanation: e.target.value })}
                  placeholder="Ví dụ: Hoan hô bé! Quả táo và con cá đều có chữ A đấy!"
                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:border-indigo-500 focus:outline-hidden transition"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && currentQ && (
        <PreviewModal
          isOpen={isPreviewOpen}
          question={currentQ}
          theme={selectedBgId}
          customBgImage={customBgImage}
          allQuestions={questions}
          currentQuestionIndex={currentQIndex}
          onSelectQuestionIndex={(idx) => setCurrentQIndex(idx)}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {/* Preview Modal for selected saved interactive question */}
      {previewingInteractiveQ && (
        <PreviewModal
          isOpen={Boolean(previewingInteractiveQ)}
          question={previewingInteractiveQ}
          theme={selectedBgId}
          customBgImage={customBgImage}
          onClose={() => setPreviewingInteractiveQ(null)}
        />
      )}

      {/* Interactive Game Builder Modal to create new interactive question and return */}
      {isInteractiveCreatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col">
          <InteractiveGameBuilder
            initialGame={null}
            onSaveAndExit={(savedGame) => {
              sounds.playCorrect();
              // Extract the first interactive question created in the game
              const createdQ =
                savedGame.questions.find((q) => q.type === 'drag_drop' || Boolean(q.canvasConfig)) ||
                savedGame.questions[0];

              if (createdQ) {
                saveInteractiveQuestion(createdQ, savedGame.title);
                // Immediately integrate into current question
                handleUpdateCurrentQ({
                  title: createdQ.title,
                  canvasConfig: JSON.parse(JSON.stringify(createdQ.canvasConfig)),
                  explanation: createdQ.explanation,
                  points: createdQ.points || 10,
                });
              }

              setIsInteractiveCreatorOpen(false);
              setSavedInteractiveQuestions(getSavedInteractiveQuestions());
            }}
            onCancel={() => {
              setIsInteractiveCreatorOpen(false);
              setSavedInteractiveQuestions(getSavedInteractiveQuestions());
            }}
          />
        </div>
      )}
    </div>
  );
};
