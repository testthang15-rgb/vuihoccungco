import React, { useState, useEffect, useRef } from 'react';
import { Game, Question, CanvasElement, InteractionRule } from '../../types/game';
import { ToolboxSidebar } from './ToolboxSidebar';
import { CanvasArea } from './CanvasArea';
import { PropertiesSidebar } from './PropertiesSidebar';
import { QuestionQuizEditor } from './QuestionQuizEditor';
import { QuickCreateModal } from './QuickCreateModal';
import { PreviewModal } from './PreviewModal';
import { ValidationBanner } from './ValidationBanner';
import { BUILDER_TEMPLATES } from '../../data/builderTemplates';
import {
  ArrowLeft,
  Save,
  Play,
  Sparkles,
  Grid,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  Plus,
  Upload,
  Image as ImageIcon,
  HelpCircle,
  MoveUp,
  MoveDown,
} from 'lucide-react';
import { sounds } from '../../utils/sound';
import { saveGame } from '../../services/gameStorage';
import { saveInteractiveQuestion } from '../../services/interactiveQuestionStorage';

interface InteractiveGameBuilderProps {
  initialGame?: Game | null;
  onSaveAndExit: (game: Game) => void;
  onCancel: () => void;
}

export const InteractiveGameBuilder: React.FC<InteractiveGameBuilderProps> = ({
  initialGame,
  onSaveAndExit,
  onCancel,
}) => {
  // Game metadata
  const [gameTitle, setGameTitle] = useState<string>(initialGame?.title || 'TRÒ CHƠI KÉO THẢ TƯƠNG TÁC');
  const [description, setDescription] = useState<string>(initialGame?.description || 'Bé kéo thả chữ cái và hình ảnh vào đúng ô');
  const [category, setCategory] = useState<string>(initialGame?.category || 'Chữ cái');

  // Sidebar visibility toggles - open by default on desktop/laptop
  const [isToolboxOpen, setIsToolboxOpen] = useState(true);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);

  // Auto-collapse sidebars only on small mobile screens
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsPropertiesOpen(false);
      setIsToolboxOpen(false);
    }
  }, []);

  // Questions stack
  const [questions, setQuestions] = useState<Question[]>(() => {
    if (initialGame && initialGame.questions.length > 0) {
      return JSON.parse(JSON.stringify(initialGame.questions));
    }
    // Default template: Kéo chữ U - Ư
    return [BUILDER_TEMPLATES[0].createQuestion()];
  });

  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const currentQuestion: Question | undefined = questions[currentQIndex] || questions[0];

  // Active question canvas elements & rules
  const [elements, setElements] = useState<CanvasElement[]>(() => currentQuestion?.canvasConfig?.elements || []);
  const [rules, setRules] = useState<InteractionRule[]>(() => currentQuestion?.canvasConfig?.rules || []);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Auto-save feedback
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const headerImageInputRef = useRef<HTMLInputElement>(null);

  // Synchronize elements whenever question selection changes
  useEffect(() => {
    const q = questions[currentQIndex];
    if (!q) return;

    if (q.type === 'drag_drop' || q.canvasConfig) {
      if (q.canvasConfig && q.canvasConfig.elements) {
        setElements(q.canvasConfig.elements);
        setRules(q.canvasConfig.rules || []);
      } else {
        // Fallback default canvas elements if missing
        const fallback = BUILDER_TEMPLATES[0].createQuestion();
        setElements(fallback.canvasConfig!.elements);
        setRules(fallback.canvasConfig!.rules || []);
      }
    } else {
      // Quiz question (multiple choice, word choice, etc.)
      setElements([]);
      setRules([]);
    }
    setSelectedElementId(null);
  }, [currentQIndex]);

  // Sync canvas state back to current question
  const syncToCurrentQuestion = (newElements: CanvasElement[], newRules: InteractionRule[]) => {
    setQuestions((prev) => {
      const cloned = [...prev];
      if (cloned[currentQIndex]) {
        cloned[currentQIndex] = {
          ...cloned[currentQIndex],
          type: newElements.length > 0 ? 'drag_drop' : cloned[currentQIndex].type,
          canvasConfig: {
            width: 1280,
            height: 720,
            elements: newElements,
            rules: newRules,
          },
        };
      }
      return cloned;
    });

    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 600);
  };

  // Select another question with state persistence
  const handleSelectQuestion = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= questions.length) return;

    sounds.playClick();
    // 1. First save any current canvas modifications to outgoing question
    setQuestions((prev) => {
      const cloned = [...prev];
      if (cloned[currentQIndex] && (cloned[currentQIndex].type === 'drag_drop' || cloned[currentQIndex].canvasConfig)) {
        cloned[currentQIndex] = {
          ...cloned[currentQIndex],
          canvasConfig: {
            width: 1280,
            height: 720,
            elements: [...elements],
            rules: [...rules],
          },
        };
      }
      return cloned;
    });

    // 2. Set new index and load target question
    setCurrentQIndex(newIndex);
    setSelectedElementId(null);
    setIsPropertiesOpen(true); // Keep properties open so teacher can inspect question immediately

    const targetQ = questions[newIndex];
    if (targetQ) {
      if (targetQ.canvasConfig && targetQ.canvasConfig.elements) {
        setElements(targetQ.canvasConfig.elements);
        setRules(targetQ.canvasConfig.rules || []);
      } else if (targetQ.type === 'drag_drop') {
        const fallback = BUILDER_TEMPLATES[0].createQuestion();
        setElements(fallback.canvasConfig!.elements);
        setRules(fallback.canvasConfig!.rules || []);
      } else {
        setElements([]);
        setRules([]);
      }
    }
  };

  // Create brand new question directly from an uploaded image
  const handleAddQuestionFromImage = (imageUrl: string, imageName: string) => {
    sounds.playCorrect();
    const cleanName = imageName.replace(/\.[^/.]+$/, '');
    const newIdx = questions.length + 1;
    const targetZoneId = 'zone_' + Math.random().toString(36).substring(2, 7);
    const correctCardId = 'card_correct_' + Math.random().toString(36).substring(2, 7);
    const otherCardId = 'card_other_' + Math.random().toString(36).substring(2, 7);

    const newQ: Question = {
      id: 'q_img_' + Date.now(),
      title: `Câu ${newIdx}: Bé hãy nhìn tranh "${cleanName}" và kéo đáp án đúng vào ô nhé!`,
      type: 'drag_drop',
      imageUrl,
      options: [
        { id: 'opt_1', text: cleanName, isCorrect: true },
        { id: 'opt_2', text: 'Đáp án khác', isCorrect: false },
      ],
      timeLimit: 0,
      noTimeLimit: true,
      points: 10,
      explanation: `Hoan hô bé đã nhận biết chuẩn xác hình ảnh ${cleanName}!`,
      canvasConfig: {
        width: 1280,
        height: 720,
        elements: [
          // Banner tiêu đề
          {
            id: 'banner_title',
            type: 'text',
            x: 200,
            y: 30,
            width: 880,
            height: 70,
            text: `BÉ HÃY QUAN SÁT HÌNH ẢNH VÀ CHỌN THẺ ĐÚNG NHÉ!`,
            fontSize: 26,
            fontWeight: '900',
            textColor: '#1e293b',
            bgColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: 3,
            borderRadius: 24,
            shadow: true,
          },
          // Khung tranh minh họa (Vùng đích chính)
          {
            id: targetZoneId,
            type: 'drop_zone',
            x: 440,
            y: 125,
            width: 400,
            height: 280,
            text: cleanName,
            subText: '🎯 Kéo thẻ từ đúng vào đây',
            imageUrl: imageUrl,
            bgColor: '#f0fdf4',
            borderColor: '#22c55e',
            borderWidth: 4,
            borderRadius: 32,
            textColor: '#15803d',
            fontSize: 24,
            isDropZone: true,
            shadow: true,
          },
          // Kệ chứa thẻ bên dưới
          {
            id: 'bottom_shelf',
            type: 'shape',
            x: 80,
            y: 430,
            width: 1120,
            height: 240,
            bgColor: '#f8fafc',
            borderColor: '#cbd5e1',
            borderWidth: 3,
            borderRadius: 32,
          },
          // Thẻ đáp án đúng
          {
            id: correctCardId,
            type: 'drag_item',
            x: 340,
            y: 480,
            width: 260,
            height: 140,
            text: cleanName,
            fontSize: 28,
            fontWeight: '900',
            textColor: '#1e293b',
            bgColor: '#ffffff',
            borderColor: '#22c55e',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            shadow: true,
          },
          // Thẻ đáp án phụ
          {
            id: otherCardId,
            type: 'drag_item',
            x: 680,
            y: 480,
            width: 260,
            height: 140,
            text: 'Đáp án khác',
            fontSize: 28,
            fontWeight: '900',
            textColor: '#1e293b',
            bgColor: '#ffffff',
            borderColor: '#cbd5e1',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            shadow: true,
          },
        ],
        rules: [
          {
            id: 'rule_' + Math.random().toString(36).substring(2, 7),
            sourceId: correctCardId,
            targetId: targetZoneId,
            isCorrect: true,
            points: 10,
          },
        ],
      },
    };

    const nextQuestions = [...questions, newQ];
    setQuestions(nextQuestions);
    const newIdxPos = nextQuestions.length - 1;
    setCurrentQIndex(newIdxPos);
    setElements(newQ.canvasConfig!.elements);
    setRules(newQ.canvasConfig!.rules);
    setSelectedElementId(targetZoneId);
    setIsPropertiesOpen(true);
  };

  const handleHeaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleAddQuestionFromImage(dataUrl, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Update question data (e.g. title, options, explanation, timeLimit)
  const handleUpdateCurrentQuestion = (updatedQ: Question) => {
    setQuestions((prev) => {
      const cloned = [...prev];
      cloned[currentQIndex] = updatedQ;
      return cloned;
    });
    if (updatedQ.canvasConfig) {
      setElements(updatedQ.canvasConfig.elements);
      setRules(updatedQ.canvasConfig.rules || []);
    }
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 500);
  };

  const handleUpdateQuestionTitle = (newTitle: string) => {
    setQuestions((prev) => {
      const cloned = [...prev];
      if (cloned[currentQIndex]) {
        cloned[currentQIndex] = {
          ...cloned[currentQIndex],
          title: newTitle,
        };
      }
      return cloned;
    });
  };

  // Convert a quiz question into a drag-drop canvas question
  const handleConvertToDragDrop = () => {
    sounds.playCorrect();
    const q = questions[currentQIndex];
    if (!q) return;

    const targetZoneId = 'zone_' + Math.random().toString(36).substring(2, 7);
    const newElements: CanvasElement[] = [
      // Title Banner
      {
        id: 'title_banner',
        type: 'text',
        x: 240,
        y: 35,
        width: 800,
        height: 70,
        text: q.title || 'BÉ HÃY KÉO ĐÁP ÁN ĐÚNG VÀO Ô NHÉ!',
        fontSize: 30,
        fontWeight: '900',
        textColor: '#1e293b',
        bgColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 3,
        borderRadius: 24,
        shadow: true,
      },
      // Target Drop Zone
      {
        id: targetZoneId,
        type: 'drop_zone',
        x: 440,
        y: 135,
        width: 400,
        height: 250,
        text: 'Ô ĐÁP ÁN ĐÚNG 🎯',
        subText: 'Kéo đáp án đúng vào đây',
        fontSize: 34,
        fontWeight: '900',
        textColor: '#0284c7',
        bgColor: '#f0f9ff',
        borderColor: '#38bdf8',
        borderWidth: 4,
        borderRadius: 32,
        isDropZone: true,
        shadow: true,
      },
      // Bottom Shelf
      {
        id: 'bottom_shelf',
        type: 'shape',
        x: 80,
        y: 430,
        width: 1120,
        height: 240,
        bgColor: '#f8fafc',
        borderColor: '#cbd5e1',
        borderWidth: 3,
        borderRadius: 32,
      },
    ];

    const newRules: InteractionRule[] = [];
    const opts = q.options && q.options.length > 0
      ? q.options
      : [
          { id: 'opt_1', text: 'Đáp án A', isCorrect: true },
          { id: 'opt_2', text: 'Đáp án B', isCorrect: false },
        ];

    const cardW = 210;
    const spacing = 18;
    const totalW = opts.length * cardW + (opts.length - 1) * spacing;
    const startX = Math.max(100, Math.round((1280 - totalW) / 2));

    opts.forEach((opt, i) => {
      const cardId = 'card_' + i + '_' + Math.random().toString(36).substring(2, 7);
      newElements.push({
        id: cardId,
        type: 'drag_item',
        x: startX + i * (cardW + spacing),
        y: 475,
        width: cardW,
        height: 150,
        text: opt.text,
        fontSize: 24,
        fontWeight: '900',
        textColor: '#1e293b',
        bgColor: opt.isCorrect ? '#fef3c7' : '#ffffff',
        borderColor: opt.isCorrect ? '#f59e0b' : '#cbd5e1',
        borderWidth: 3,
        borderRadius: 24,
        isDraggable: true,
        shadow: true,
      });

      if (opt.isCorrect) {
        newRules.push({
          id: 'rule_' + Math.random().toString(36).substring(2, 7),
          sourceId: cardId,
          targetId: targetZoneId,
          isCorrect: true,
          points: 10,
        });
      }
    });

    const updatedQ: Question = {
      ...q,
      type: 'drag_drop',
      canvasConfig: {
        width: 1280,
        height: 720,
        elements: newElements,
        rules: newRules,
      },
    };

    setElements(newElements);
    setRules(newRules);
    setQuestions((prev) => {
      const cloned = [...prev];
      cloned[currentQIndex] = updatedQ;
      return cloned;
    });
  };

  const handleUpdateElement = (updated: CanvasElement) => {
    const next = elements.map((el) => (el.id === updated.id ? updated : el));
    setElements(next);
    syncToCurrentQuestion(next, rules);
  };

  const handleAddElement = (elemPartial: Partial<CanvasElement>) => {
    sounds.playClick();
    const newId = 'elem_' + Math.random().toString(36).substring(2, 7);
    // Slight stagger for added elements so they don't cover existing elements completely
    const offset = (elements.length % 6) * 30;
    const newElem: CanvasElement = {
      id: newId,
      type: elemPartial.type || 'text',
      x: elemPartial.x ?? (440 + offset),
      y: elemPartial.y ?? (240 + offset),
      width: elemPartial.width || 200,
      height: elemPartial.height || 100,
      text: elemPartial.text ?? '',
      subText: elemPartial.subText,
      imageUrl: elemPartial.imageUrl,
      icon: elemPartial.icon,
      fontFamily: elemPartial.fontFamily,
      isHandwriting: elemPartial.isHandwriting,
      bgColor: elemPartial.bgColor || '#ffffff',
      borderColor: elemPartial.borderColor,
      borderWidth: elemPartial.borderWidth,
      borderRadius: elemPartial.borderRadius || 20,
      textColor: elemPartial.textColor || '#1e293b',
      fontSize: elemPartial.fontSize || 28,
      fontWeight: elemPartial.fontWeight,
      isDraggable: elemPartial.isDraggable,
      isDropZone: elemPartial.isDropZone,
      isLocked: elemPartial.isLocked,
      cardRole: elemPartial.cardRole,
      maxItems: elemPartial.maxItems,
      shadow: elemPartial.shadow ?? true,
      animation: elemPartial.animation || 'none',
      itemCategory: elemPartial.itemCategory,
      acceptsCategory: elemPartial.acceptsCategory,
      rotation: elemPartial.rotation,
      zIndex: elemPartial.zIndex,
    };

    const next = [...elements, newElem];
    setElements(next);
    setSelectedElementId(newId);
    setIsPropertiesOpen(true);
    syncToCurrentQuestion(next, rules);
  };

  const handleDeleteElement = (id: string) => {
    sounds.playClick();
    const nextElements = elements.filter((el) => el.id !== id);
    const nextRules = rules.filter((r) => r.sourceId !== id && r.targetId !== id);
    setElements(nextElements);
    setRules(nextRules);
    setSelectedElementId(null);
    syncToCurrentQuestion(nextElements, nextRules);
  };

  const handleDuplicateElement = (id: string) => {
    sounds.playClick();
    const target = elements.find((el) => el.id === id);
    if (!target) return;

    const clonedId = 'elem_' + Math.random().toString(36).substring(2, 7);
    const cloned: CanvasElement = {
      ...target,
      id: clonedId,
      x: target.x + 30,
      y: target.y + 30,
    };

    const next = [...elements, cloned];
    setElements(next);
    setSelectedElementId(clonedId);
    setIsPropertiesOpen(true);
    syncToCurrentQuestion(next, rules);
  };

  const handleUpdateRules = (updatedRules: InteractionRule[]) => {
    setRules(updatedRules);
    syncToCurrentQuestion(elements, updatedRules);
  };

  const handleApplyTemplate = (newQuestion: Question) => {
    sounds.playCorrect();
    setQuestions((prev) => {
      const cloned = [...prev];
      cloned[currentQIndex] = newQuestion;
      return cloned;
    });
    if (newQuestion.canvasConfig) {
      setElements(newQuestion.canvasConfig.elements);
      setRules(newQuestion.canvasConfig.rules);
    }
  };

  const handleAddQuestion = () => {
    sounds.playClick();
    const newIdx = questions.length + 1;
    const newQ: Question = {
      ...BUILDER_TEMPLATES[0].createQuestion(),
      id: 'q_' + Math.random().toString(36).substring(2, 9),
      title: `Câu ${newIdx}: Kéo chữ cái vào đúng ô`,
    };
    const nextQuestions = [...questions, newQ];
    setQuestions(nextQuestions);
    handleSelectQuestion(nextQuestions.length - 1);
  };

  const handleDeleteCurrentQuestion = (idxToDelete: number) => {
    if (questions.length <= 1) return;
    sounds.playClick();
    const nextQuestions = questions.filter((_, i) => i !== idxToDelete);
    setQuestions(nextQuestions);
    const nextIdx = Math.max(0, Math.min(idxToDelete, nextQuestions.length - 1));
    setCurrentQIndex(nextIdx);
    const targetQ = nextQuestions[nextIdx];
    if (targetQ?.canvasConfig) {
      setElements(targetQ.canvasConfig.elements);
      setRules(targetQ.canvasConfig.rules || []);
    } else {
      setElements([]);
      setRules([]);
    }
  };

  const handleDuplicateCurrentQuestion = (idx: number) => {
    sounds.playClick();
    const target = questions[idx];
    if (!target) return;
    const cloned: Question = JSON.parse(JSON.stringify(target));
    cloned.id = 'q_' + Math.random().toString(36).substring(2, 9);
    cloned.title = `${target.title} (Bản sao)`;
    const nextQuestions = [...questions];
    nextQuestions.splice(idx + 1, 0, cloned);
    setQuestions(nextQuestions);
    handleSelectQuestion(idx + 1);
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    sounds.playClick();
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    // Save active elements into current question before swapping
    const nextQuestions = [...questions];
    if (nextQuestions[currentQIndex] && (nextQuestions[currentQIndex].type === 'drag_drop' || nextQuestions[currentQIndex].canvasConfig)) {
      nextQuestions[currentQIndex] = {
        ...nextQuestions[currentQIndex],
        canvasConfig: {
          width: 960,
          height: 600,
          elements,
          rules,
        },
      };
    }
    const temp = nextQuestions[idx];
    nextQuestions[idx] = nextQuestions[targetIdx];
    nextQuestions[targetIdx] = temp;
    setQuestions(nextQuestions);
    handleSelectQuestion(targetIdx);
  };

  const handleSaveGame = (publishMode: boolean = false) => {
    sounds.playCorrect();
    const finalGame: Game = {
      id: initialGame?.id || 'game_builder_' + Math.random().toString(36).substring(2, 9),
      title: gameTitle.trim() || 'TRÒ CHƠI KÉO THẢ MỚI',
      description: description.trim(),
      theme: 'indigo',
      category,
      targetAge: '5-6 tuổi',
      gameType: 'drag_drop',
      status: publishMode ? 'published' : 'draft',
      createdAt: initialGame?.createdAt || Date.now(),
      updatedAt: Date.now(),
      playCount: initialGame?.playCount || 0,
      settings: {
        timePerQuestion: 0,
        speedBonus: true,
        maxTeams: 12,
        soundEffects: true,
      },
      questions,
    };

    // Save each interactive drag & drop question to shared interactive questions bank
    questions.forEach((q) => {
      if (q.type === 'drag_drop' || Boolean(q.canvasConfig)) {
        saveInteractiveQuestion(q, gameTitle.trim());
      }
    });

    saveGame(finalGame);
    onSaveAndExit(finalGame);
  };

  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-30 shrink-0 shadow-xs">
        {/* Left: Back & Game Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playClick();
              onCancel();
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                className="font-black text-slate-900 text-base sm:text-lg bg-transparent hover:bg-slate-50 focus:bg-white px-2 py-0.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-indigo-400 outline-none transition"
                title="Bấm để đổi tên bộ trò chơi"
              />
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                TRÌNH SOẠN GAME
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-400 pl-2">
              {saveStatus === 'saved' ? '💾 Đã lưu nháp' : 'Đang lưu...'}
            </span>
          </div>
        </div>

        {/* Center: Sidebar Toggles & Grid */}
        <div className="flex items-center gap-2">
          {/* Toggle Toolbox Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsToolboxOpen(!isToolboxOpen);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
              isToolboxOpen
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Đóng / mở cột công cụ & danh sách câu hỏi"
          >
            {isToolboxOpen ? <PanelLeftClose className="w-4 h-4 text-indigo-600" /> : <PanelLeft className="w-4 h-4 text-slate-500" />}
            <span className="hidden sm:inline">Công cụ</span>
          </button>

          <div className="hidden lg:block">
            <ValidationBanner questions={questions} />
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`hidden md:flex px-3 py-1.5 rounded-xl text-xs font-bold items-center gap-1.5 border transition cursor-pointer ${
              showGrid
                ? 'bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-white text-slate-400 border-slate-200'
            }`}
            title="Bật/tắt lưới căn chỉnh Canvas"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Lưới</span>
          </button>

          {/* Toggle Properties Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsPropertiesOpen(!isPropertiesOpen);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
              isPropertiesOpen
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Đóng / mở bảng thuộc tính thẻ"
          >
            {isPropertiesOpen ? <PanelRightClose className="w-4 h-4 text-indigo-600" /> : <PanelRight className="w-4 h-4 text-slate-500" />}
            <span>Thuộc tính</span>
            {selectedElement && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Right: Preview, Save, Publish */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sounds.playClick();
              setIsPreviewOpen(true);
            }}
            className="px-3 sm:px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">XEM TRƯỚC</span>
          </button>

          <button
            onClick={() => handleSaveGame(false)}
            className="px-3 sm:px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LƯU NHÁP</span>
          </button>

          <button
            onClick={() => handleSaveGame(true)}
            className="px-3.5 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-200 transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-100" />
            <span>XUẤT BẢN</span>
          </button>
        </div>
      </header>

      {/* Hidden input for fast question creation via image upload */}
      <input
        ref={headerImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleHeaderImageUpload}
        className="hidden"
      />

      {/* Main 3-Area Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* KHU VỰC 1: Toolbox Sidebar (Collapsible) */}
        {isToolboxOpen && (
          <div className="shrink-0 h-full z-20 transition-all duration-200">
            <ToolboxSidebar
              onAddElement={handleAddElement}
              onApplyTemplate={handleApplyTemplate}
              onOpenQuickCreate={() => setIsQuickCreateOpen(true)}
              questions={questions}
              currentQuestionIndex={currentQIndex}
              onSelectQuestion={handleSelectQuestion}
              onAddQuestion={handleAddQuestion}
              onAddQuestionFromImage={handleAddQuestionFromImage}
              onMoveQuestion={handleMoveQuestion}
            />
          </div>
        )}

        {/* KHU VỰC 2: Center Workspace (Question Bar + Question Selector + Canvas Area / Quiz Editor) */}
        <div className="flex-1 h-full min-w-0 overflow-hidden relative bg-slate-100 flex flex-col">
          {/* Question Navigation & Title Bar */}
          <div className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-10 shrink-0 gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSelectQuestion(currentQIndex - 1)}
                disabled={currentQIndex <= 0}
                className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Câu hỏi trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-xl whitespace-nowrap">
                CÂU {currentQIndex + 1} / {questions.length}
              </span>

              <button
                onClick={() => handleSelectQuestion(currentQIndex + 1)}
                disabled={currentQIndex >= questions.length - 1}
                className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Câu hỏi kế tiếp"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Move Question Position Buttons */}
              <div className="flex items-center gap-0.5 ml-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleMoveQuestion(currentQIndex, 'up')}
                  disabled={currentQIndex <= 0}
                  className="p-1 rounded-md text-slate-600 hover:text-indigo-600 hover:bg-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                  title="Chuyển câu hỏi này sang trái / lên trước"
                >
                  <MoveUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveQuestion(currentQIndex, 'down')}
                  disabled={currentQIndex >= questions.length - 1}
                  className="p-1 rounded-md text-slate-600 hover:text-indigo-600 hover:bg-white disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                  title="Chuyển câu hỏi này sang phải / xuống sau"
                >
                  <MoveDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 ml-2 min-w-0">
                <span className="text-xs font-bold text-slate-400 hidden sm:inline">Tiêu đề:</span>
                <input
                  type="text"
                  value={currentQuestion?.title || ''}
                  onChange={(e) => handleUpdateQuestionTitle(e.target.value)}
                  placeholder="Nhập tiêu đề câu hỏi..."
                  className="text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-50 hover:bg-slate-100 focus:bg-white px-2.5 py-1 rounded-lg border border-slate-200 focus:border-indigo-400 outline-none w-48 sm:w-72 md:w-96 transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border flex items-center gap-1 shrink-0 ${
                  currentQuestion?.type === 'drag_drop' || currentQuestion?.canvasConfig
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {currentQuestion?.type === 'drag_drop' || currentQuestion?.canvasConfig
                  ? '🎮 Kéo thả'
                  : currentQuestion?.type === 'html_game'
                  ? '🚀 HTML5'
                  : '📝 Trắc nghiệm'}
              </span>

              <button
                onClick={() => handleDuplicateCurrentQuestion(currentQIndex)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Nhân đôi câu hỏi này"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {questions.length > 1 && (
                <button
                  onClick={() => handleDeleteCurrentQuestion(currentQIndex)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Xóa câu hỏi này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Question Tabs Bar - Always visible so teacher can switch & inspect questions with 1 click */}
          <div className="h-10 bg-slate-50 border-b border-slate-200 px-3 flex items-center gap-1.5 overflow-x-auto shrink-0 select-none">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0 mr-1 hidden sm:inline">
              Danh sách câu:
            </span>
            {questions.map((q, idx) => {
              const isActive = currentQIndex === idx;
              const isDD = q.type === 'drag_drop' || Boolean(q.canvasConfig);
              const isHtml = q.type === 'html_game';
              return (
                <button
                  key={q.id || idx}
                  onClick={() => handleSelectQuestion(idx)}
                  className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                  title={q.title || `Câu hỏi ${idx + 1}`}
                >
                  <span>{isHtml ? '🚀' : isDD ? '🎮' : '📝'}</span>
                  <span>Câu {idx + 1}</span>
                  {q.imageUrl && <span className="text-[10px]">📷</span>}
                </button>
              );
            })}

            <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

            <button
              onClick={handleAddQuestion}
              className="px-2.5 py-1 rounded-xl text-xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 shrink-0 transition cursor-pointer"
              title="Thêm câu hỏi mới"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm câu</span>
            </button>

            <button
              onClick={() => headerImageInputRef.current?.click()}
              className="px-2.5 py-1 rounded-xl text-xs font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 shrink-0 transition cursor-pointer"
              title="Tải ảnh từ máy tính để tạo câu hỏi tương tác"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>📷 Tải ảnh tạo câu</span>
            </button>
          </div>

          {/* Question Content Viewport: Canvas Area OR Quiz Question Editor */}
          <div className="flex-1 w-full h-full min-h-0 overflow-hidden relative">
            {currentQuestion?.type === 'drag_drop' || currentQuestion?.canvasConfig ? (
              <CanvasArea
                elements={elements}
                selectedId={selectedElementId}
                onSelectElement={(id) => {
                  setSelectedElementId(id);
                  if (id) {
                    setIsPropertiesOpen(true);
                  }
                }}
                onUpdateElement={handleUpdateElement}
                onDeleteElement={handleDeleteElement}
                onDuplicateElement={handleDuplicateElement}
                onAddElement={handleAddElement}
                onOpenProperties={() => setIsPropertiesOpen(true)}
                rules={rules}
                showGrid={showGrid}
              />
            ) : currentQuestion ? (
              <QuestionQuizEditor
                question={currentQuestion}
                questionIndex={currentQIndex}
                totalQuestions={questions.length}
                onUpdateQuestion={handleUpdateCurrentQuestion}
                onConvertToDragDrop={handleConvertToDragDrop}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
                <h4 className="font-extrabold text-base text-slate-700">Chưa chọn câu hỏi nào</h4>
                <p className="text-xs text-slate-400 mt-1">Cô hãy chọn một câu hỏi trong danh sách hoặc bấm thêm câu mới</p>
                <button
                  onClick={handleAddQuestion}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow"
                >
                  + Thêm câu hỏi mới
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KHU VỰC 3: Properties Sidebar (Collapsible) */}
        {isPropertiesOpen && (
          <div className="shrink-0 h-full z-20 transition-all duration-200">
            <PropertiesSidebar
              element={selectedElement}
              allElements={elements}
              rules={rules}
              onUpdateElement={handleUpdateElement}
              onUpdateRules={handleUpdateRules}
              onSelectElement={(id) => {
                setSelectedElementId(id);
                if (id) setIsPropertiesOpen(true);
              }}
              onDuplicateElement={handleDuplicateElement}
              onDeleteElement={handleDeleteElement}
              onAddElement={handleAddElement}
              currentQuestion={currentQuestion}
              onUpdateQuestion={handleUpdateCurrentQuestion}
            />
          </div>
        )}
      </div>

      {/* Quick Create Modal */}
      {isQuickCreateOpen && (
        <QuickCreateModal
          isOpen={isQuickCreateOpen}
          onClose={() => setIsQuickCreateOpen(false)}
          onApply={(newQ) => {
            handleApplyTemplate(newQ);
            setGameTitle(newQ.title);
          }}
        />
      )}

      {/* Play Preview Modal */}
      {isPreviewOpen && currentQuestion && (
        <PreviewModal
          isOpen={isPreviewOpen}
          question={currentQuestion}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};
