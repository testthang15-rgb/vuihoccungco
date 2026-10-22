import React, { useState } from 'react';
import { Zap, X, Sparkles, Check } from 'lucide-react';
import { Question, InteractiveCanvasConfig, CanvasElement, InteractionRule } from '../../types/game';
import { sounds } from '../../utils/sound';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (question: Question) => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const [title, setTitle] = useState('KÉO CHỮ VÀO ĐÚNG Ô (U – Ư)');
  const [targetA, setTargetA] = useState('U');
  const [targetB, setTargetB] = useState('Ư');
  const [cardCount, setCardCount] = useState<number>(6); // 4, 6, or 8

  if (!isOpen) return null;

  const handleGenerate = () => {
    sounds.playCorrect();

    const targetAId = 'zone_' + targetA.toLowerCase() + '_' + Math.random().toString(36).substring(2, 6);
    const targetBId = 'zone_' + targetB.toLowerCase() + '_' + Math.random().toString(36).substring(2, 6);

    const elements: CanvasElement[] = [
      // Title
      {
        id: 'title_auto',
        type: 'text',
        x: 240,
        y: 35,
        width: 800,
        height: 70,
        text: title.toUpperCase(),
        fontSize: 32,
        fontWeight: '900',
        textColor: '#1e293b',
        bgColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 3,
        borderRadius: 24,
        shadow: true,
      },
      // Drop zone A
      {
        id: targetAId,
        type: 'drop_zone',
        x: 200,
        y: 135,
        width: 380,
        height: 270,
        text: `Ô CHỮ ${targetA}`,
        subText: `Thả chữ ${targetA} vào đây`,
        fontSize: 48,
        fontWeight: '900',
        textColor: '#0284c7',
        bgColor: '#f0f9ff',
        borderColor: '#38bdf8',
        borderWidth: 4,
        borderRadius: 32,
        isDropZone: true,
        acceptsCategory: targetA,
        shadow: true,
      },
      // Drop zone B
      {
        id: targetBId,
        type: 'drop_zone',
        x: 700,
        y: 135,
        width: 380,
        height: 270,
        text: `Ô CHỮ ${targetB}`,
        subText: `Thả chữ ${targetB} vào đây`,
        fontSize: 48,
        fontWeight: '900',
        textColor: '#e11d48',
        bgColor: '#fff1f2',
        borderColor: '#fb7185',
        borderWidth: 4,
        borderRadius: 32,
        isDropZone: true,
        acceptsCategory: targetB,
        shadow: true,
      },
      // Shelf
      {
        id: 'shelf_auto',
        type: 'shape',
        x: 80,
        y: 445,
        width: 1120,
        height: 235,
        bgColor: '#ffffff',
        borderColor: '#cbd5e1',
        borderWidth: 3,
        borderRadius: 36,
        shadow: true,
      },
    ];

    const rules: InteractionRule[] = [];
    const cardWidth = Math.floor(1040 / cardCount);

    for (let i = 0; i < cardCount; i++) {
      const isA = i % 2 === 0;
      const char = isA ? targetA : targetB;
      const targetId = isA ? targetAId : targetBId;
      const cardId = `card_${char.toLowerCase()}_${i + 1}_` + Math.random().toString(36).substring(2, 6);
      const cardX = 120 + i * (cardWidth + 10);

      elements.push({
        id: cardId,
        type: 'drag_item',
        x: cardX,
        y: 485,
        width: Math.min(150, cardWidth),
        height: 150,
        text: char,
        fontSize: 64,
        fontWeight: '900',
        textColor: '#ffffff',
        bgColor: isA ? '#0284c7' : '#e11d48',
        borderRadius: 28,
        isDraggable: true,
        itemCategory: char,
        shadow: true,
      });

      rules.push({
        id: `r_${i + 1}`,
        sourceId: cardId,
        targetId,
        isCorrect: true,
        points: 5,
      });
    }

    const question: Question = {
      id: 'q_quick_' + Date.now(),
      title,
      type: 'drag_drop',
      timeLimit: 0,
      noTimeLimit: true,
      points: cardCount * 5,
      explanation: `Bé đã phân biệt xuất sắc chữ ${targetA} và chữ ${targetB}!`,
      options: [],
      canvasConfig: {
        width: 1280,
        height: 720,
        bgTheme: 'pastel_sky',
        elements,
        rules,
      },
    };

    onApply(question);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2 text-amber-600 font-black text-lg">
            <Zap className="w-5 h-5 fill-current" />
            <span>TẠO NHANH BỘ TRÒ CHƠI KÉO THẢ</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
              TIÊU ĐỀ TRÒ CHƠI
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                VÙNG ĐÍCH 1
              </label>
              <input
                type="text"
                value={targetA}
                onChange={(e) => setTargetA(e.target.value)}
                placeholder="VD: U"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-center text-lg text-slate-900 outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                VÙNG ĐÍCH 2
              </label>
              <input
                type="text"
                value={targetB}
                onChange={(e) => setTargetB(e.target.value)}
                placeholder="VD: Ư"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-center text-lg text-slate-900 outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
              SỐ LƯỢNG THẺ KÉO
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[4, 6, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCardCount(num)}
                  className={`py-2.5 rounded-xl text-xs font-black transition ${
                    cardCount === num
                      ? 'bg-amber-500 text-slate-900 ring-2 ring-amber-300 shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {num} thẻ ({num / 2} {targetA} / {num / 2} {targetB})
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            Đóng
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>TỰ ĐỘNG TẠO BỐ CỤC</span>
          </button>
        </div>
      </div>
    </div>
  );
};
