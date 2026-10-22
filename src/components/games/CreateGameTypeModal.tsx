import React, { useEffect, useState } from 'react';
import { HelpCircle, Layers, Sparkles, X, CheckCircle2, ArrowRight, Volume2, Image as ImageIcon, Palette, Sliders, Clock, ArrowLeft, Type, Award } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface CreateGameTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuestionGame: () => void;
  onSelectInteractiveGame: () => void;
  onSelectWordDragGame: () => void;
  onSelectCustomGame: () => void;
}

export const CreateGameTypeModal: React.FC<CreateGameTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectQuestionGame,
  onSelectInteractiveGame,
  onSelectWordDragGame,
  onSelectCustomGame,
}) => {
  const [showInteractiveSub, setShowInteractiveSub] = useState(false);

  // Reset sub choice on open/close
  useEffect(() => {
    if (!isOpen) {
      setShowInteractiveSub(false);
    }
  }, [isOpen]);
  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        sounds.playClick();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        // Clicking backdrop closes modal
        if (e.target === e.currentTarget) {
          sounds.playClick();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm p-3 sm:p-5 flex items-center justify-center min-h-screen select-none animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl border-2 sm:border-4 border-indigo-100 my-auto relative animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Sticky Header with prominent, single Close Button */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shrink-0 relative flex items-center justify-between gap-3 shadow-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1 text-indigo-100 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Tạo trò chơi mới cho bé</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
              CHỌN LOẠI TRÒ CHƠI
            </h2>
            <p className="text-xs font-bold text-indigo-100 mt-0.5 line-clamp-1">
              Cô chọn thể loại phù hợp với bài dạy và mục đích tiết học nhé!
            </p>
          </div>

          {/* Single prominent close button */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="shrink-0 px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 text-slate-800 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md border border-slate-200"
            title="Đóng (phím Esc)"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-4 h-4 text-rose-500 stroke-[2.5]" />
            <span>ĐÓNG</span>
          </button>
        </div>

        {/* Content: 3 Cards - Balanced and fully visible on all screen sizes */}
        <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 bg-slate-50/70 overflow-y-auto flex-1 min-h-0 items-stretch">
          {/* Card 1: Trò chơi câu hỏi */}
          <div
            onClick={() => {
              sounds.playCorrect();
              onClose();
              onSelectQuestionGame();
            }}
            className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-indigo-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-150 flex flex-col justify-between cursor-pointer group hover:-translate-y-1 relative"
          >
            <div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 shadow-xs group-hover:bg-indigo-600 group-hover:text-white transition duration-150">
                <HelpCircle className="w-5 h-5" />
              </div>

              <div className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider mb-1 border border-indigo-200">
                Phổ biến · Dễ soạn
              </div>

              <h3 className="text-base font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition">
                TRÒ CHƠI CÂU HỎI
              </h3>

              <p className="text-xs font-semibold text-slate-600 leading-snug mb-2">
                Soạn câu hỏi trắc nghiệm hoặc tự luận (bé vẽ & viết chữ vào ô trống) có hình ảnh và giọng đọc.
              </p>

              <ul className="space-y-1 text-xs font-bold text-slate-600 mb-2.5">
                <li className="flex items-center gap-1.5 text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>1 hoặc <b>nhiều đáp án đúng</b></span>
                </li>
                <li className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-lg border border-purple-200">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span><b>Tự luận:</b> Bé vẽ hình & viết vào ô trống</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-700">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Hình minh họa câu & đáp án</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-700">
                  <Volume2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span><b>Tự động đọc câu hỏi</b></span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="w-full mt-2 py-2 sm:py-2.5 px-3 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
            >
              <span>SOẠN CÂU HỎI & TỰ LUẬN</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Trò chơi tương tác (Kéo thả tự do & Kéo thả ô chữ) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-emerald-300 hover:border-emerald-500 hover:shadow-xl transition-all duration-150 flex flex-col justify-between group hover:-translate-y-1 relative">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs group-hover:bg-emerald-600 group-hover:text-white transition duration-150">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                  2 Kiểu chơi
                </span>
              </div>

              <h3 className="text-base font-black text-slate-900 mb-1 group-hover:text-emerald-600 transition">
                TRÒ CHƠI TƯƠNG TÁC
              </h3>

              <p className="text-xs font-semibold text-slate-600 leading-snug mb-2.5">
                Bao gồm kéo thả tự do trên canvas và kéo thả ô chữ vào từ còn thiếu.
              </p>

              <div className="space-y-2 mb-3">
                <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[11px] font-black text-emerald-900 flex items-center gap-1.5 mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>1. Kéo thả tự do:</span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Bảng canvas tự do kéo thả phân loại chữ, con vật, hoa quả vào các ô đích.
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-200">
                  <div className="text-[11px] font-black text-purple-900 flex items-center gap-1.5 mb-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>2. Kéo thả ô chữ (Mới ⭐):</span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Kéo chữ vào từ còn thiếu (VD: <b>...iệng</b> kéo chữ <b>m</b>). Có ảnh câu hỏi & ảnh đáp án!
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 shrink-0 mt-2">
              <button
                type="button"
                onClick={() => {
                  sounds.playCorrect();
                  onClose();
                  onSelectWordDragGame();
                }}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Type className="w-4 h-4 text-amber-300" />
                <span>KÉO THẢ Ô CHỮ ⭐</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playCorrect();
                  onClose();
                  onSelectInteractiveGame();
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>KÉO THẢ TỰ DO</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Trò chơi tùy chọn (Phần tùy biến trò chơi) */}
          <div
            onClick={() => {
              sounds.playCorrect();
              onClose();
              onSelectCustomGame();
            }}
            className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-amber-300 hover:border-amber-500 hover:shadow-xl transition-all duration-150 flex flex-col justify-between cursor-pointer group hover:-translate-y-1 relative"
          >
            <div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition duration-150">
                <Palette className="w-5 h-5" />
              </div>

              <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black uppercase tracking-wider mb-1 border border-amber-200">
                ⭐ Tùy biến cao · Mới
              </div>

              <h3 className="text-base font-black text-slate-900 mb-1 group-hover:text-amber-600 transition">
                TRÒ CHƠI TÙY CHỌN
              </h3>

              <p className="text-xs font-semibold text-slate-600 leading-snug mb-2">
                Tự do thiết kế: nền hình, đổi loại câu, loa đọc, điểm và thời gian.
              </p>

              <ul className="space-y-1 text-xs font-bold text-slate-600 mb-2.5">
                <li className="flex items-center gap-1.5 text-slate-700">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Chọn <b>nền hình đẹp</b> theo chủ đề</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-700">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Tùy biến <b>loại câu hỏi</b> & cỡ ô</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-700">
                  <Volume2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span><b>Nút loa đọc câu hỏi</b> & thời gian</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="w-full mt-2 py-2 sm:py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
            >
              <span>THIẾT KẾ TÙY CHỌN</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Minimal Footer Info */}
        <div className="px-4 py-2.5 bg-white border-t border-slate-100 text-center text-xs font-bold text-slate-500 shrink-0">
          💡 Tất cả trò chơi đều hỗ trợ thi đấu nhiều đội trực tiếp trên điện thoại & máy tính bảng!
        </div>
      </div>
    </div>
  );
};
