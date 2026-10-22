import React, { useRef } from 'react';
import { CanvasElement, InteractionRule, Question } from '../../types/game';
import {
  Settings,
  Sparkles,
  Target,
  Palette,
  Move,
  Type,
  CheckSquare,
  Trash2,
  Copy,
  X,
  Plus,
  Layers,
  Image as ImageIcon,
  Upload,
  PenTool,
  Clock,
  Award,
  HelpCircle,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

interface PropertiesSidebarProps {
  element: CanvasElement | null;
  allElements: CanvasElement[];
  rules: InteractionRule[];
  onUpdateElement: (updated: CanvasElement) => void;
  onUpdateRules: (updatedRules: InteractionRule[]) => void;
  onSelectElement?: (id: string | null) => void;
  onDuplicateElement?: (id: string) => void;
  onDeleteElement?: (id: string) => void;
  onAddElement?: (elem: Partial<CanvasElement>) => void;
  currentQuestion?: Question;
  onUpdateQuestion?: (updated: Question) => void;
}

export const PropertiesSidebar: React.FC<PropertiesSidebarProps> = ({
  element,
  allElements,
  rules,
  onUpdateElement,
  onUpdateRules,
  onSelectElement,
  onDuplicateElement,
  onDeleteElement,
  onAddElement,
  currentQuestion,
  onUpdateQuestion,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionImageInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !element) return;

    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const clean = file.name.replace(/\.[^/.]+$/, '').trim();
        const isFriendly = clean.length <= 20 && !/^[0-9a-f-]{15,}$/i.test(clean) && !/^(image|img|screenshot|pngtree|download|preview)/i.test(clean);
        const existingIsHash = element.text && (/^[0-9a-f-]{15,}$/i.test(element.text) || element.text.includes('pngtree'));
        onUpdateElement({
          ...element,
          imageUrl: dataUrl,
          text: existingIsHash ? '' : (element.text || (isFriendly ? clean : '')),
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQuestionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentQuestion || !onUpdateQuestion) return;

    sounds.playCorrect();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateQuestion({
          ...currentQuestion,
          imageUrl: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // If no element is selected
  if (!element) {
    // If it's a quiz question without canvas elements, show Question Properties so teacher can edit properties!
    if (currentQuestion && (!currentQuestion.canvasConfig || currentQuestion.type !== 'drag_drop')) {
      return (
        <div className="w-80 h-full bg-white border-l border-slate-200 flex flex-col select-none overflow-y-auto">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
              BẢNG THUỘC TÍNH
            </span>
            <h4 className="font-black text-sm text-slate-800">
              Thuộc tính câu hỏi trắc nghiệm
            </h4>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Cài đặt thông số cho màn câu hỏi hiện tại:
            </p>
          </div>

          <div className="p-4 space-y-4 text-xs font-bold text-slate-700 flex-1 overflow-y-auto">
            {/* Question Title */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tiêu đề câu hỏi</span>
              </label>
              <input
                type="text"
                value={currentQuestion.title || ''}
                onChange={(e) => onUpdateQuestion?.({ ...currentQuestion, title: e.target.value })}
                placeholder="Nhập tiêu đề câu hỏi..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-indigo-400 outline-none text-xs"
              />
            </div>

            {/* Question Image Upload */}
            <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <label className="block text-[11px] font-black uppercase tracking-wider text-indigo-900 mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ảnh minh họa câu hỏi</span>
              </label>
              {currentQuestion.imageUrl ? (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white p-1 max-h-36 flex items-center justify-center">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Minh họa"
                      className="max-h-32 object-contain rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => questionImageInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Đổi ảnh</span>
                    </button>
                    <button
                      onClick={() => onUpdateQuestion?.({ ...currentQuestion, imageUrl: undefined })}
                      className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition border border-rose-200"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => questionImageInputRef.current?.click()}
                  className="w-full py-2.5 px-3 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl bg-white text-indigo-600 font-extrabold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition hover:bg-indigo-50/50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh câu hỏi từ máy tính</span>
                </button>
              )}
              <input
                ref={questionImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleQuestionImageChange}
                className="hidden"
              />
            </div>

            {/* Points */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Award className="w-3 h-3 text-emerald-500" />
                <span>Điểm thưởng</span>
              </label>
              <select
                value={currentQuestion.points || 10}
                onChange={(e) => onUpdateQuestion?.({ ...currentQuestion, points: Number(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none text-xs"
              >
                <option value={5}>5 điểm</option>
                <option value={10}>10 điểm</option>
                <option value={15}>15 điểm</option>
                <option value={20}>20 điểm</option>
              </select>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                <span>Lời khen / Giải thích</span>
              </label>
              <textarea
                value={currentQuestion.explanation || ''}
                onChange={(e) => onUpdateQuestion?.({ ...currentQuestion, explanation: e.target.value })}
                rows={2}
                placeholder="Lời khen khi bé hoàn thành..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-indigo-400 outline-none text-xs"
              />
            </div>
          </div>
        </div>
      );
    }

    // Default: Show elements list on canvas
    return (
      <div className="w-80 h-full bg-white border-l border-slate-200 flex flex-col select-none overflow-y-auto">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
            BẢNG THUỘC TÍNH
          </span>
          <h4 className="font-black text-sm text-slate-800">
            Các thành phần trên Canvas ({allElements.length})
          </h4>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Bấm vào một thẻ trên Canvas hoặc chọn từ danh sách bên dưới để chỉnh sửa:
          </p>
        </div>

        <div className="p-3 space-y-2 flex-1 overflow-y-auto">
          {allElements.length === 0 ? (
            <div className="p-6 text-center text-slate-400 space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-700">Màn hình Canvas hiện chưa có thẻ nào.</p>
                <p className="text-[11px] mt-1 text-slate-400">Cô hãy thêm Vùng đích hoặc Thẻ kéo để bắt đầu:</p>
              </div>
              {onAddElement && (
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onAddElement({
                        type: 'drop_zone',
                        width: 320,
                        height: 240,
                        text: 'Ô ĐÍCH 🎯',
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
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm Vùng đích (Drop Zone)</span>
                  </button>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onAddElement({
                        type: 'drag_item',
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
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm Thẻ kéo (Draggable)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            allElements.map((el) => {
              const rule = rules.find((r) => r.sourceId === el.id);
              const targetZone = rule ? allElements.find((z) => z.id === rule.targetId) : null;

              return (
                <button
                  key={el.id}
                  onClick={() => {
                    sounds.playClick();
                    onSelectElement?.(el.id);
                  }}
                  className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-400 rounded-xl text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {el.type === 'drop_zone'
                          ? '🎯 Vùng đích'
                          : el.type === 'drag_item'
                          ? '↔ Thẻ kéo'
                          : el.type === 'word_card'
                          ? '🃏 Thẻ từ'
                          : el.type === 'shape'
                          ? '📦 Khung'
                          : '📝 Chữ'}
                      </span>
                      {el.imageUrl && (
                        <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-100 px-1 rounded flex items-center gap-0.5">
                          📷 Có ảnh
                        </span>
                      )}
                      {el.isHandwriting && (
                        <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1 rounded flex items-center gap-0.5">
                          ✍️ Viết tay
                        </span>
                      )}
                      {el.isDraggable && targetZone && (
                        <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1 rounded">
                          → {targetZone.text || 'Đích'}
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-xs text-slate-800 truncate mt-1">
                      {el.text || el.subText || `Thành phần (${el.id.substring(0, 5)})`}
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition shrink-0">
                    Sửa ✏️
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // All drop zones on the canvas
  const dropZones = allElements.filter((e) => e.isDropZone && e.id !== element.id);

  // Find existing rule for this draggable item
  const currentRule = rules.find((r) => r.sourceId === element.id);

  const handleTargetChange = (targetId: string) => {
    sounds.playClick();
    const otherRules = rules.filter((r) => r.sourceId !== element.id);
    if (!targetId) {
      onUpdateRules(otherRules);
      return;
    }

    const newRule: InteractionRule = {
      id: 'rule_' + Math.random().toString(36).substring(2, 7),
      sourceId: element.id,
      targetId,
      isCorrect: true,
      points: 5,
    };
    onUpdateRules([...otherRules, newRule]);
  };

  const presetBgColors = [
    '#ffffff', // White
    '#f0f9ff', // Light Sky
    '#0284c7', // Sky Blue
    '#fff1f2', // Light Rose
    '#e11d48', // Rose Red
    '#fef3c7', // Amber
    '#dcfce7', // Light Emerald
    '#16a34a', // Emerald Green
    '#ede9fe', // Light Purple
    '#4f46e5', // Indigo
  ];

  return (
    <div className="w-80 h-full bg-white border-l border-slate-200 flex flex-col select-none overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10 shadow-2xs">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
              {element.type === 'drop_zone'
                ? '🎯 VÙNG ĐÍCH'
                : element.type === 'drag_item'
                ? '↔ THẺ KÉO'
                : element.type === 'word_card'
                ? '🃏 THẺ TỪ'
                : element.type === 'shape'
                ? '📦 KHUNG CHỨA'
                : '📝 VĂN BẢN'}
            </span>
          </div>
          <h4 className="font-black text-sm text-slate-900 truncate max-w-[170px]">
            {element.text || element.type}
          </h4>
        </div>

        <div className="flex items-center gap-1">
          {onDuplicateElement && (
            <button
              onClick={() => onDuplicateElement(element.id)}
              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
              title="Nhân đôi thành phần"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          {onDeleteElement && (
            <button
              onClick={() => onDeleteElement(element.id)}
              className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition"
              title="Xóa thành phần này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {onSelectElement && (
            <button
              onClick={() => onSelectElement(null)}
              className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition"
              title="Bỏ chọn"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-5 text-xs font-bold text-slate-700">
        {/* Content Section */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-indigo-500" />
            <span>Nội dung chữ hiển thị</span>
          </label>
          <input
            type="text"
            value={element.text || ''}
            onChange={(e) => onUpdateElement({ ...element, text: e.target.value })}
            placeholder="Nội dung chữ..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-indigo-400 outline-none"
          />

          {element.text && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onUpdateElement({
                  ...element,
                  text: element.text?.toLowerCase(),
                });
              }}
              className="mt-1 text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Chuyển sang chữ viết thường: "{element.text.toLowerCase()}"</span>
            </button>
          )}

          {element.imageUrl && element.text && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onUpdateElement({
                  ...element,
                  text: '',
                });
              }}
              className="mt-1 text-[10px] font-extrabold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Xóa chữ (chỉ hiển thị hình ảnh thẻ)</span>
            </button>
          )}

          <input
            type="text"
            value={element.subText || ''}
            onChange={(e) => onUpdateElement({ ...element, subText: e.target.value })}
            placeholder="Dòng phụ / hướng dẫn..."
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-600 focus:bg-white focus:border-indigo-400 outline-none mt-2 text-[11px]"
          />

          {/* Handwriting font toggle */}
          <div className="mt-2.5 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black text-indigo-900 block flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                <span>Kiểu chữ viết tay (Mầm non)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                Font Playpen Sans / Mali tiếng Việt
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onUpdateElement({
                  ...element,
                  isHandwriting: !element.isHandwriting,
                  fontFamily: !element.isHandwriting ? "'Playpen Sans', 'Mali', cursive" : undefined,
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                element.isHandwriting
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {element.isHandwriting ? 'Bật ✍️' : 'Tắt'}
            </button>
          </div>
        </div>

        {/* Element Image Section */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Hình ảnh thẻ</span>
          </label>

          {element.imageUrl ? (
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white p-1 max-h-32 flex items-center justify-center">
                <img
                  src={element.imageUrl}
                  alt={element.text || 'Ảnh thẻ'}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="max-h-28 object-contain rounded-lg select-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition"
                >
                  <Upload className="w-3 h-3" />
                  <span>Đổi ảnh</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateElement({ ...element, imageUrl: undefined })}
                  className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition border border-rose-200"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa ảnh</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl bg-white text-slate-600 hover:text-indigo-600 font-extrabold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition hover:bg-indigo-50/30"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tải ảnh từ máy tính cho thẻ này</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
          />
        </div>

        {/* DROP ZONE CONFIGURATION AT TOP (when element is a drop zone) */}
        {(element.isDropZone || element.type === 'drop_zone') && (
          <div className="p-3.5 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl border-2 border-sky-300 shadow-xs space-y-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-sky-950 mb-1 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-sky-600" />
                <span>CẤU HÌNH VÙNG CHỨA (DROP ZONE)</span>
              </label>
              <p className="text-[10px] text-sky-800 font-bold">
                Quy định số lượng thẻ tối đa được kéo vào vùng chứa này:
              </p>
            </div>

            {/* Maximum number of cards that can be placed in this container */}
            <div className="bg-white p-3 rounded-xl border border-sky-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                  <span>SỐ THẺ ĐƯỢC KÉO VÀO:</span>
                </label>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 border border-sky-200">
                  {element.maxItems && element.maxItems > 0 ? `${element.maxItems} thẻ` : 'Không giới hạn'}
                </span>
              </div>

              {/* Quick preset buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Chỉ 1 thẻ', val: 1 },
                  { label: '2 thẻ', val: 2 },
                  { label: '3 thẻ', val: 3 },
                  { label: '4 thẻ', val: 4 },
                  { label: '5 thẻ', val: 5 },
                  { label: 'Vô hạn', val: undefined },
                ].map((item) => {
                  const isSelected = item.val === undefined
                    ? (!element.maxItems || element.maxItems <= 0)
                    : element.maxItems === item.val;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        onUpdateElement({
                          ...element,
                          maxItems: item.val,
                        });
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Exact custom number input */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-600">Hoặc tự nhập số lượng thẻ:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={element.maxItems || ''}
                    placeholder="Vô hạn"
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      onUpdateElement({
                        ...element,
                        maxItems: !isNaN(parsed) && parsed > 0 ? parsed : undefined,
                      });
                    }}
                    className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-center text-xs font-black outline-none focus:bg-white focus:border-sky-400"
                  />
                  <span className="text-[10px] font-bold text-slate-500">thẻ</span>
                </div>
              </div>

              {/* Detailed Explanation for Teachers */}
              <div className="p-2.5 bg-sky-50/90 rounded-xl text-[10px] font-semibold text-sky-900 border border-sky-200 flex items-start gap-1.5 leading-relaxed">
                <span className="text-sm">💡</span>
                <span>
                  {element.maxItems === 1
                    ? 'Đang chọn 1 thẻ: Vùng chứa này chỉ chứa đúng 1 thẻ. Muốn đặt thẻ mới vào, trẻ phải kéo thẻ cũ ra ngoài trước.'
                    : element.maxItems && element.maxItems > 1
                    ? `Đang chọn ${element.maxItems} thẻ: Vùng chứa này chứa tối đa ${element.maxItems} thẻ. Khi đã đủ ${element.maxItems} thẻ, trẻ phải kéo bớt thẻ ra ngoài trước mới cho thêm thẻ mới vào.`
                    : 'Không giới hạn: Vùng chứa có thể nhận nhiều thẻ cùng lúc.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* DRAG-DROP ROLE & RULES CONFIGURATION */}
        {!element.isDropZone && (
          <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 space-y-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-600" />
                <span>VAI TRÒ THẺ & TÍNH NĂNG KÉO THẢ</span>
              </label>
              <p className="text-[10px] text-amber-800 font-bold mb-2">
                Chọn luật tính điểm hoặc khóa tính năng kéo:
              </p>
            </div>

            {/* Quick Lock / Unlock Status Toggle */}
            <div className={`p-3 rounded-xl border-2 transition ${
              (element.isLocked || element.cardRole === 'static' || element.isDraggable === false)
                ? 'bg-slate-100 border-slate-400 text-slate-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-black text-xs">
                    {(element.isLocked || element.cardRole === 'static' || element.isDraggable === false) ? (
                      <>
                        <span className="text-base">🔒</span>
                        <span className="text-slate-900">THẺ ĐÃ KHÓA KÉO (CỐ ĐỊNH)</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base">🔓</span>
                        <span className="text-emerald-950">THẺ ĐANG MỞ KÉO</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold mt-0.5 text-slate-600">
                    {(element.isLocked || element.cardRole === 'static' || element.isDraggable === false)
                      ? 'Thẻ không thể bị kéo hay di chuyển trên bản thiết kế lẫn khi bé chơi.'
                      : 'Học sinh có thể dùng tay hoặc chuột kéo thẻ này vào ô đích.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    const isLocked = Boolean(element.isLocked) || element.cardRole === 'static' || element.isDraggable === false;
                    if (isLocked) {
                      onUpdateElement({
                        ...element,
                        isLocked: false,
                        isDraggable: true,
                        cardRole: 'correct',
                      });
                    } else {
                      onUpdateElement({
                        ...element,
                        isLocked: true,
                        isDraggable: false,
                        cardRole: 'static',
                      });
                      const otherRules = rules.filter((r) => r.sourceId !== element.id);
                      onUpdateRules(otherRules);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1 shadow-xs shrink-0 ${
                    (element.isLocked || element.cardRole === 'static' || element.isDraggable === false)
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-900 text-white'
                  }`}
                >
                  {(element.isLocked || element.cardRole === 'static' || element.isDraggable === false)
                    ? '🔓 Mở khóa'
                    : '🔒 Khóa kéo'}
                </button>
              </div>
            </div>

            {/* 3 Role Selection Buttons */}
            <div className="grid grid-cols-1 gap-2">
              {/* Option 1: Thẻ kéo ĐÚNG */}
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onUpdateElement({
                    ...element,
                    isDraggable: true,
                    isLocked: false,
                    cardRole: 'correct',
                  });
                  if (!currentRule && dropZones.length > 0) {
                    handleTargetChange(dropZones[0].id);
                  }
                }}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  (element.cardRole === 'correct' || (!element.cardRole && element.isDraggable && !element.isLocked))
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 text-emerald-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-xs text-emerald-900">
                    🎯 Thẻ kéo ĐÚNG (Có ô đích đúng)
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    Học sinh kéo vào đúng ô đích đã chọn sẽ được tính ĐÚNG & cộng điểm.
                  </div>
                </div>
              </button>

              {/* Option 2: Thẻ kéo vào là SAI (Thẻ gây nhiễu) */}
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onUpdateElement({
                    ...element,
                    isDraggable: true,
                    isLocked: false,
                    cardRole: 'wrong',
                  });
                  const otherRules = rules.filter((r) => r.sourceId !== element.id);
                  onUpdateRules(otherRules);
                }}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  element.cardRole === 'wrong'
                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 text-rose-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  ✗
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-xs text-rose-900">
                    ❌ Kéo vào vùng kéo là tính SAI (Thẻ gây nhiễu)
                  </div>
                  <div className="text-[10px] text-rose-700 font-semibold mt-0.5">
                    Học sinh vẫn kéo được thẻ này, nhưng kéo vào bất kỳ ô đích nào sẽ tính là SAI.
                  </div>
                </div>
              </button>

              {/* Option 3: Thẻ KHÔNG ĐƯỢC KÉO (Khóa tính năng kéo) */}
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onUpdateElement({
                    ...element,
                    isDraggable: false,
                    isLocked: true,
                    cardRole: 'static',
                    isIllustration: false,
                  });
                  const otherRules = rules.filter((r) => r.sourceId !== element.id);
                  onUpdateRules(otherRules);
                }}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  (element.cardRole === 'static' || (element.isLocked && !element.isIllustration) || (!element.isDraggable && !element.isIllustration))
                    ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-300 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  🔒
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-xs text-slate-900">
                    🔒 Thẻ KHÔNG ĐƯỢC KÉO (Khóa kéo)
                  </div>
                  <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                    Khóa tính năng kéo. Thẻ chỉ hiển thị cố định làm mẫu / đề bài, học sinh không kéo được.
                  </div>
                </div>
              </button>

              {/* Option 4: Thẻ MINH HỌA / ĐÁP ÁN MẪU CỦA CÔ */}
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onUpdateElement({
                    ...element,
                    isDraggable: false,
                    isLocked: true,
                    cardRole: 'illustration',
                    isIllustration: true,
                    targetZoneId: element.targetZoneId || (dropZones[0]?.id || undefined),
                  });
                  const otherRules = rules.filter((r) => r.sourceId !== element.id);
                  onUpdateRules(otherRules);
                }}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  (element.cardRole === 'illustration' || element.isIllustration)
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 text-amber-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  💡
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-xs text-amber-900">
                    💡 Thẻ MINH HỌA (Đáp án mẫu của cô)
                  </div>
                  <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                    Thẻ được coi như là đáp án chuẩn. Hiển thị song song với phần bài đã kéo của trẻ lúc tổng kết để cô cho trẻ so sánh!
                  </div>
                </div>
              </button>
            </div>

            {/* Target Drop Zone Selector for Illustration Card */}
            {(element.cardRole === 'illustration' || element.isIllustration) && (
              <div className="pt-2.5 border-t border-amber-200 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <label className="block text-[11px] font-black uppercase tracking-wider text-amber-950 mb-1.5 flex items-center gap-1.5">
                  <span>💡 Ô đích mà thẻ này minh họa làm đáp án:</span>
                </label>

                {dropZones.length === 0 ? (
                  <p className="text-[11px] text-amber-800 font-semibold">
                    Thẻ này là minh họa chung cho câu hỏi (hoặc hãy thêm Ô đích để gán minh họa riêng cho từng ô).
                  </p>
                ) : (
                  <select
                    value={element.targetZoneId || ''}
                    onChange={(e) => onUpdateElement({ ...element, targetZoneId: e.target.value || undefined })}
                    className="w-full p-2.5 bg-white border-2 border-amber-400 rounded-xl font-black text-amber-950 outline-none text-xs"
                  >
                    <option value="">-- Minh họa chung cho cả câu hỏi --</option>
                    {dropZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.text ? `Minh họa cho ô: "${zone.text}"` : `Minh họa cho Ô đích (${zone.id.substring(0, 5)})`}
                      </option>
                    ))}
                  </select>
                )}

                <p className="text-[10px] font-bold text-amber-800 mt-1.5">
                  ✨ Khi xem báo cáo chi tiết, thẻ này sẽ hiển thị song song ngay bên cạnh ô mà trẻ đã kéo để cô và trẻ cùng so sánh.
                </p>
              </div>
            )}

            {/* Target Drop Zone Selector (Only visible when cardRole === 'correct') */}
            {(element.cardRole === 'correct' || (!element.cardRole && element.isDraggable && !element.isLocked && !element.isIllustration)) && (
              <div className="pt-2 border-t border-amber-200">
                <label className="block text-[10px] font-black uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1">
                  <span>🎯 Chọn ô đích đúng cho thẻ này:</span>
                </label>

                {dropZones.length === 0 ? (
                  <p className="text-[11px] text-amber-700 font-semibold">
                    ⚠️ Chưa có Vùng đích (Drop Zone) nào trên Canvas. Hãy thêm ít nhất 1 Vùng đích từ tab "Thành phần" bên trái!
                  </p>
                ) : (
                  <select
                    value={currentRule?.targetId || ''}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    className="w-full p-2.5 bg-white border-2 border-amber-300 rounded-xl font-black text-amber-900 outline-none text-xs"
                  >
                    <option value="">-- Chọn ô đích đúng cho thẻ này --</option>
                    {dropZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.text || `Ô đích (${zone.id.substring(0, 5)})`}
                      </option>
                    ))}
                  </select>
                )}

                {currentRule && (
                  <div className="mt-2 flex items-center gap-1.5 text-emerald-700 font-black text-[11px]">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Đã gán đáp án đúng (+ điểm khi kéo trúng)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}



        {/* Visual Styling */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-indigo-500" />
            <span>Màu sắc & Định dạng</span>
          </label>

          {/* Quick preset color palette */}
          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
            {presetBgColors.map((c) => (
              <button
                key={c}
                onClick={() => onUpdateElement({ ...element, bgColor: c })}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-lg border shadow-2xs transition hover:scale-110 cursor-pointer ${
                  element.bgColor === c ? 'ring-2 ring-indigo-500 ring-offset-1' : 'border-slate-300'
                }`}
                title={`Màu ${c}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold">Màu nền tùy chọn</span>
              <input
                type="color"
                value={element.bgColor || '#ffffff'}
                onChange={(e) => onUpdateElement({ ...element, bgColor: e.target.value })}
                className="w-full h-9 p-0.5 rounded-xl border border-slate-200 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold">Màu chữ</span>
              <input
                type="color"
                value={element.textColor || '#1e293b'}
                onChange={(e) => onUpdateElement({ ...element, textColor: e.target.value })}
                className="w-full h-9 p-0.5 rounded-xl border border-slate-200 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold">Cỡ chữ (px)</span>
              <input
                type="number"
                value={element.fontSize || 32}
                onChange={(e) => onUpdateElement({ ...element, fontSize: Number(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold">Bo góc (px)</span>
              <input
                type="number"
                value={element.borderRadius || 24}
                onChange={(e) => onUpdateElement({ ...element, borderRadius: Number(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center outline-none"
              />
            </div>
          </div>
        </div>

        {/* Position & Size */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-indigo-500" />
            <span>Vị trí & Kích thước (px)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold">Tọa độ X</span>
              <input
                type="number"
                value={element.x}
                onChange={(e) => onUpdateElement({ ...element, x: Number(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold">Tọa độ Y</span>
              <input
                type="number"
                value={element.y}
                onChange={(e) => onUpdateElement({ ...element, y: Number(e.target.value) })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold">Chiều rộng (W)</span>
              <input
                type="number"
                value={element.width}
                onChange={(e) => onUpdateElement({ ...element, width: Math.max(40, Number(e.target.value)) })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold">Chiều cao (H)</span>
              <input
                type="number"
                value={element.height}
                onChange={(e) => onUpdateElement({ ...element, height: Math.max(40, Number(e.target.value)) })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center outline-none"
              />
            </div>
          </div>
        </div>

        {/* Animation dropdown */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Hiệu ứng sinh động (Animation)</span>
          </label>
          <select
            value={element.animation || 'none'}
            onChange={(e) => onUpdateElement({ ...element, animation: e.target.value as any })}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none text-xs"
          >
            <option value="none">Không hiệu ứng</option>
            <option value="bounce">Nhảy vui nhộn (Bounce)</option>
            <option value="pulse">Nhấp nháy nhẹ (Pulse)</option>
            <option value="float">Bồng bềnh (Float)</option>
            <option value="shake">Lắc lư (Shake)</option>
            <option value="pop">Bật nở (Pop)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
