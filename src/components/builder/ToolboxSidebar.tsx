import React, { useState, useRef } from 'react';
import { CanvasElement, ElementType, Question } from '../../types/game';
import { ASSET_LIBRARY } from '../../data/assetLibrary';
import { BUILDER_TEMPLATES } from '../../data/builderTemplates';
import {
  Plus,
  Sparkles,
  Layers,
  Box,
  FolderOpen,
  HelpCircle,
  Zap,
  Image as ImageIcon,
  Upload,
  Trash2,
  PenTool,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

interface ToolboxSidebarProps {
  onAddElement: (elem: Partial<CanvasElement>) => void;
  onApplyTemplate: (question: Question) => void;
  onOpenQuickCreate: () => void;
  questions: Question[];
  currentQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
  onAddQuestion: () => void;
  onAddQuestionFromImage?: (dataUrl: string, imageName: string) => void;
  onMoveQuestion?: (index: number, direction: 'up' | 'down') => void;
}

export const ToolboxSidebar: React.FC<ToolboxSidebarProps> = ({
  onAddElement,
  onApplyTemplate,
  onOpenQuickCreate,
  questions,
  currentQuestionIndex,
  onSelectQuestion,
  onAddQuestion,
  onAddQuestionFromImage,
  onMoveQuestion,
}) => {
  const [activeTab, setActiveTab] = useState<'elements' | 'templates' | 'library' | 'questions'>('elements');
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>('letters');
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; name: string; dataUrl: string }>>(() => {
    try {
      const stored = localStorage.getItem('vuihoc_builder_custom_images');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const cardImageInputRef = useRef<HTMLInputElement>(null);
  const libraryImageInputRef = useRef<HTMLInputElement>(null);
  const questionImageInputRef = useRef<HTMLInputElement>(null);

  const saveUploadedImages = (newImages: Array<{ id: string; name: string; dataUrl: string }>) => {
    setUploadedImages(newImages);
    try {
      localStorage.setItem('vuihoc_builder_custom_images', JSON.stringify(newImages.slice(0, 20)));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  };

  // Helper to extract clean, friendly title from filename or empty if UUID/asset hash
  const getFriendlyCardLabel = (filename: string): string => {
    const raw = filename.replace(/\.[^/.]+$/, '').trim();
    if (/^[0-9a-f-]{15,}$/i.test(raw) || raw.length > 20 || /^(image|img|screenshot|pngtree|download|preview)/i.test(raw)) {
      return '';
    }
    return raw;
  };

  // Upload image to directly add as a card on Canvas
  const handleCardImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const friendlyLabel = getFriendlyCardLabel(file.name);
        onAddElement({
          type: 'drag_item',
          width: 180,
          height: 180,
          text: friendlyLabel,
          imageUrl: dataUrl,
          bgColor: '#ffffff',
          borderColor: '#6366f1',
          borderWidth: 3,
          borderRadius: 24,
          textColor: '#1e293b',
          fontSize: 18,
          isDraggable: true,
          shadow: true,
        });

        // Also add to custom images library
        const newEntry = {
          id: 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: cleanName,
          dataUrl,
        };
        saveUploadedImages([newEntry, ...uploadedImages.filter(im => im.name !== cleanName)]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload image to the library
  const handleLibraryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    sounds.playCorrect();
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          const newEntry = {
            id: 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: cleanName,
            dataUrl,
          };
          setUploadedImages((prev) => {
            const next = [newEntry, ...prev.filter(im => im.name !== cleanName)];
            try {
              localStorage.setItem('vuihoc_builder_custom_images', JSON.stringify(next.slice(0, 20)));
            } catch {}
            return next;
          });
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Upload image to create a brand new question
  const handleCreateQuestionFromImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAddQuestionFromImage) return;

    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onAddQuestionFromImage(dataUrl, file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteUploadedImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playClick();
    const updated = uploadedImages.filter(im => im.id !== id);
    saveUploadedImages(updated);
  };

  // Palette components to add directly to canvas
  const componentPalette = [
    {
      type: 'drop_zone' as ElementType,
      label: 'Vùng đích (Drop Zone)',
      icon: '🎯',
      desc: 'Ô để bé kéo thả đáp án vào',
      action: () => {
        sounds.playClick();
        onAddElement({
          type: 'drop_zone' as ElementType,
          width: 320,
          height: 240,
          text: 'Ô ĐÍCH',
          subText: 'Kéo thả vào đây',
          bgColor: '#f0f9ff',
          borderColor: '#0284c7',
          borderWidth: 4,
          borderRadius: 28,
          textColor: '#0284c7',
          fontSize: 36,
          isDropZone: true,
          shadow: true,
        });
      },
    },
    {
      type: 'drag_item' as ElementType,
      label: 'Thẻ kéo (Draggable)',
      icon: '↔',
      desc: 'Thẻ chữ hoặc hình cho bé di chuyển',
      action: () => {
        sounds.playClick();
        onAddElement({
          type: 'drag_item' as ElementType,
          width: 150,
          height: 150,
          text: 'Chữ',
          bgColor: '#f59e0b',
          borderRadius: 24,
          textColor: '#ffffff',
          fontSize: 48,
          isDraggable: true,
          shadow: true,
        });
      },
    },
    {
      type: 'drag_item' as ElementType,
      label: 'Thẻ hình ảnh (Tải từ máy)',
      icon: '📷',
      desc: 'Tải ảnh của cô vào làm thẻ trò chơi',
      action: () => {
        cardImageInputRef.current?.click();
      },
    },
    {
      type: 'word_card' as ElementType,
      label: 'Thẻ từ (Word Card)',
      icon: '🃏',
      desc: 'Thẻ chứa từ ngữ và hình minh họa',
      action: () => {
        sounds.playClick();
        onAddElement({
          type: 'word_card' as ElementType,
          width: 220,
          height: 130,
          text: 'Quả bưởi 🍈',
          subText: '(tiếng có vần Ư)',
          bgColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderWidth: 3,
          borderRadius: 20,
          textColor: '#1e293b',
          fontSize: 24,
          isDraggable: true,
          shadow: true,
        });
      },
    },
    {
      type: 'illustration_card' as ElementType,
      label: '💡 Thẻ minh họa (Đáp án mẫu)',
      icon: '💡',
      desc: 'Thẻ đáp án mẫu hiển thị song song lúc tổng kết',
      action: () => {
        sounds.playClick();
        onAddElement({
          type: 'illustration_card' as ElementType,
          width: 170,
          height: 140,
          text: 'Thẻ mẫu',
          subText: 'Minh họa',
          bgColor: '#fffbeb',
          borderColor: '#f59e0b',
          borderWidth: 3,
          borderRadius: 22,
          textColor: '#92400e',
          fontSize: 26,
          isDraggable: false,
          isLocked: true,
          cardRole: 'illustration',
          isIllustration: true,
          shadow: true,
        });
      },
    },
    {
      type: 'text' as ElementType,
      label: 'Văn bản / Tiêu đề',
      icon: '📝',
      desc: 'Tiêu đề câu hỏi hoặc chỉ dẫn',
      action: () => {
        sounds.playClick();
        onAddElement({
          type: 'text' as ElementType,
          width: 700,
          height: 70,
          text: 'BÉ HÃY KÉO CHỮ VÀO ĐÚNG Ô NHÉ!',
          bgColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: 2,
          borderRadius: 20,
          textColor: '#1e293b',
          fontSize: 28,
          shadow: true,
        });
      },
    },
    {
      type: 'shape' as ElementType,
      label: 'Khung / Giá để thẻ',
      icon: '📦',
      desc: 'Khung nền trang trí hoặc khay chứa',
      action: () => {
        sounds.playClick();
        onAddElement({
          type: 'shape' as ElementType,
          width: 1080,
          height: 220,
          bgColor: '#f8fafc',
          borderColor: '#cbd5e1',
          borderWidth: 3,
          borderRadius: 32,
          shadow: false,
        });
      },
    },
  ];

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col select-none">
      {/* Hidden file input for card image upload */}
      <input
        ref={cardImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleCardImageUpload}
        className="hidden"
      />

      {/* Hidden file input for question image upload */}
      <input
        ref={questionImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleCreateQuestionFromImage}
        className="hidden"
      />

      {/* Quick Create Highlight Button */}
      <div className="p-3 border-b border-slate-100 bg-amber-50/50">
        <button
          onClick={() => {
            sounds.playCorrect();
            onOpenQuickCreate();
          }}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-200 transition active:scale-95 cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-current text-amber-200" />
          <span>⚡ TẠO NHANH BỘ TRÒ CHƠI</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-600">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${
            activeTab === 'elements'
              ? 'border-indigo-600 text-indigo-700 bg-white font-black'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Thành phần
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${
            activeTab === 'templates'
              ? 'border-indigo-600 text-indigo-700 bg-white font-black'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Mẫu sẵn
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${
            activeTab === 'library'
              ? 'border-indigo-600 text-indigo-700 bg-white font-black'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Kho ảnh
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${
            activeTab === 'questions'
              ? 'border-indigo-600 text-indigo-700 bg-white font-black'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          Các câu ({questions.length})
        </button>
      </div>

      {/* Tab 1: Components palette */}
      {activeTab === 'elements' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Chạm để thêm vào Canvas
          </p>

          {componentPalette.map((item, idx) => (
            <button
              key={idx}
              onClick={item.action}
              className="w-full p-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 hover:border-indigo-300 hover:bg-white transition flex items-center gap-3 text-left shadow-sm group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition">
                {item.icon}
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm text-slate-800 leading-tight">
                  {item.label}
                </h4>
                <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                  {item.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tab 2: Ready Templates */}
      {activeTab === 'templates' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Chọn mẫu trò chơi để áp dụng
          </p>

          {BUILDER_TEMPLATES
            .filter(tpl => {
              const q = tpl.createQuestion();
              return q.type === 'drag_drop' || Boolean(q.canvasConfig);
            })
            .map((tpl) => (
            <div
              key={tpl.id}
              className="p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-amber-400 shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                    {tpl.thumbnailBadge}
                  </span>
                  <span className="text-xl">{tpl.icon}</span>
                </div>
                <h4 className="font-black text-sm text-slate-900 leading-snug">
                  {tpl.title}
                </h4>
                <p className="text-xs font-semibold text-slate-500 mt-1 line-clamp-2">
                  {tpl.description}
                </p>
              </div>

              <button
                onClick={() => {
                  sounds.playCorrect();
                  onApplyTemplate(tpl.createQuestion());
                }}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-extrabold text-xs transition active:scale-95 cursor-pointer text-center"
              >
                Áp dụng mẫu này
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Asset Library & Sample Letters & Uploaded Images */}
      {activeTab === 'library' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {/* Category Selector */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3 scrollbar-none">
            {/* Custom Uploaded Images Category */}
            <button
              onClick={() => setSelectedAssetCategory('custom_upload')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                selectedAssetCategory === 'custom_upload'
                  ? 'bg-rose-500 text-white shadow-sm font-black'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Ảnh của cô ({uploadedImages.length})</span>
            </button>

            {ASSET_LIBRARY.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedAssetCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedAssetCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm font-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Subheader / Info for selected category */}
          {selectedAssetCategory === 'letters' && (
            <div className="mb-2 p-2 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center gap-2 text-indigo-900">
              <PenTool className="w-4 h-4 text-indigo-600 shrink-0" />
              <p className="text-[10px] font-bold">
                Bảng chữ mẫu viết thường theo kiểu chữ viết tay (hỗ trợ tiếng Việt). Chạm vào chữ để thêm thẻ lên Canvas!
              </p>
            </div>
          )}

          {/* Category: Custom Uploaded Images */}
          {selectedAssetCategory === 'custom_upload' && (
            <div className="space-y-3 flex-1 flex flex-col">
              <button
                onClick={() => libraryImageInputRef.current?.click()}
                className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-rose-300 hover:border-rose-500 bg-rose-50/50 hover:bg-rose-50 text-rose-700 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-rose-500" />
                <span>+ TẢI ẢNH TỪ MÁY TÍNH</span>
              </button>
              <input
                ref={libraryImageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleLibraryImageUpload}
                className="hidden"
              />

              {uploadedImages.length === 0 ? (
                <div className="p-6 text-center text-slate-400 my-auto">
                  <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Chưa có ảnh nào được tải lên.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cô hãy bấm nút ở trên để tải các hình ảnh từ máy tính vào nhé!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1">
                  {uploadedImages.map((img) => {
                    const cardPayload = {
                      type: 'drag_item' as ElementType,
                      width: 180,
                      height: 180,
                      text: getFriendlyCardLabel(img.name),
                      imageUrl: img.dataUrl,
                      bgColor: '#ffffff',
                      borderColor: '#6366f1',
                      borderWidth: 3,
                      borderRadius: 24,
                      textColor: '#1e293b',
                      fontSize: 18,
                      isDraggable: true,
                      shadow: true,
                    };

                    return (
                      <div
                        key={img.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify(cardPayload));
                        }}
                        onClick={() => {
                          sounds.playClick();
                          onAddElement(cardPayload);
                        }}
                        className="p-2.5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 flex flex-col items-center justify-between text-center transition group shadow-xs cursor-grab active:cursor-grabbing relative"
                      >
                        <button
                          onClick={(e) => handleDeleteUploadedImage(img.id, e)}
                          className="absolute top-1.5 right-1.5 p-1 bg-slate-900/60 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition z-10"
                          title="Xóa ảnh này khỏi thư viện"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        <div className="w-full h-20 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-1">
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-105 transition pointer-events-none"
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-800 truncate w-full mt-1.5">
                          {img.name}
                        </span>
                        <span className="text-[9px] font-extrabold text-indigo-600">
                          + Kéo hoặc bấm thêm
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Category: Standard ASSET_LIBRARY items (including Bảng chữ mẫu) */}
          {selectedAssetCategory !== 'custom_upload' && (
            <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1">
              {ASSET_LIBRARY.find((c) => c.id === selectedAssetCategory)?.items.map((item) => {
                const isLetterCategory = selectedAssetCategory === 'letters';

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      sounds.playClick();
                      onAddElement({
                        type: 'drag_item',
                        width: isLetterCategory ? 140 : 150,
                        height: isLetterCategory ? 140 : 150,
                        text: item.icon.length > 2 ? '' : (isLetterCategory ? item.icon.toLowerCase() : item.icon),
                        icon: item.icon.length > 2 ? item.icon : undefined,
                        subText: item.name,
                        bgColor: '#ffffff',
                        borderColor: isLetterCategory ? '#818cf8' : '#cbd5e1',
                        borderWidth: 3,
                        borderRadius: 24,
                        textColor: isLetterCategory ? '#4338ca' : '#1e293b',
                        fontSize: isLetterCategory ? 56 : 40,
                        fontFamily: isLetterCategory ? "'Playpen Sans', 'Mali', cursive" : undefined,
                        isHandwriting: isLetterCategory,
                        isDraggable: true,
                        itemCategory: isLetterCategory ? item.icon.toLowerCase() : item.icon,
                        shadow: true,
                      });
                    }}
                    className={`p-3 bg-slate-50 hover:bg-white rounded-2xl border transition group shadow-sm cursor-pointer flex flex-col items-center justify-center text-center ${
                      isLetterCategory
                        ? 'border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50/30'
                        : 'border-slate-200 hover:border-indigo-400'
                    }`}
                  >
                    <span
                      className={`mb-1 group-hover:scale-110 transition ${
                        isLetterCategory
                          ? 'font-handwriting lowercase text-4xl sm:text-5xl font-black text-indigo-700 leading-none'
                          : 'text-3xl'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 truncate w-full">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Questions manager */}
      {activeTab === 'questions' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Các màn câu hỏi trong game
            </span>
            <button
              onClick={() => {
                sounds.playClick();
                onAddQuestion();
              }}
              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm câu</span>
            </button>
          </div>

          {/* Quick Create Question from Image Button */}
          {onAddQuestionFromImage && (
            <button
              onClick={() => questionImageInputRef.current?.click()}
              className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer mb-2"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>📷 TẠO CÂU HỎI TỪ ẢNH TẢI LÊN</span>
            </button>
          )}

          {questions.map((q, idx) => (
            <div
              key={q.id || idx}
              onClick={() => {
                sounds.playClick();
                onSelectQuestion(idx);
              }}
              className={`w-full p-3 rounded-2xl border-2 text-left transition flex items-center justify-between cursor-pointer group ${
                currentQuestionIndex === idx
                  ? 'border-indigo-600 bg-indigo-50/90 shadow-sm ring-2 ring-indigo-400 font-extrabold text-indigo-900'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      currentQuestionIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Câu {idx + 1}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {q.type === 'drag_drop' || q.canvasConfig
                      ? '🎮 Kéo thả'
                      : q.type === 'html_game'
                      ? '🚀 HTML5'
                      : '📝 Trắc nghiệm'}
                  </span>
                  {q.imageUrl && (
                    <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-100 px-1 rounded">
                      📷 Có ảnh
                    </span>
                  )}
                </div>
                <h5 className="text-xs font-bold truncate mt-1 text-slate-800">
                  {q.title || 'Câu hỏi chưa đặt tên'}
                </h5>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {onMoveQuestion && (
                  <div className="flex items-center gap-0.5 mr-1 opacity-70 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveQuestion(idx, 'up');
                      }}
                      disabled={idx === 0}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                      title="Chuyển câu hỏi lên trước"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveQuestion(idx, 'down');
                      }}
                      disabled={idx === questions.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                      title="Chuyển câu hỏi xuống sau"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  {q.canvasConfig ? `${q.canvasConfig.elements.length} phần tử` : `${q.options?.length || 0} đáp án`}
                </span>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white px-1.5 py-1 rounded-lg transition">
                  ✏️
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
