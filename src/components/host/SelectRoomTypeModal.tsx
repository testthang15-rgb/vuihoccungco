import React from 'react';
import { X, Sparkles, Layers, ArrowRight, Play, Gamepad2 } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface SelectRoomTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNormalRoom: () => void;
  onSelectDualRoom: () => void;
}

export const SelectRoomTypeModal: React.FC<SelectRoomTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectNormalRoom,
  onSelectDualRoom,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl border-4 border-amber-100 overflow-hidden flex flex-col animate-scale-up">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner font-black">
              🏫
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight">
                CHỌN LOẠI PHÒNG CHƠI
              </h3>
              <p className="text-xs text-amber-100 font-semibold">
                Cô hãy chọn kiểu phòng phù hợp với tiết dạy hôm nay nhé
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition cursor-pointer active:scale-95"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 Room Options Grid */}
        <div className="p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 bg-slate-50/60">
          
          {/* OPTION 1: Normal Room (1 Question Set) */}
          <div
            onClick={() => {
              sounds.playClick();
              onClose();
              onSelectNormalRoom();
            }}
            className="group relative bg-white hover:bg-amber-50/40 rounded-3xl p-5 border-2 border-slate-200 hover:border-amber-300 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between active:scale-98"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform">
                  🎮
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black uppercase">
                  Tiêu chuẩn
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-800 transition">
                Phòng chơi tiêu chuẩn
              </h4>
              <p className="text-xs font-semibold text-slate-500 mt-1.5 leading-relaxed">
                Tất cả các đội cùng trả lời một bộ câu hỏi chung. Phù hợp cho ôn tập cả lớp, sinh hoạt chung, hội thi.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-amber-700">
              <span>Vào kho chọn trò chơi</span>
              <div className="w-7 h-7 rounded-full bg-amber-100 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition">
                <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          </div>

          {/* OPTION 2: Dual Room (2 Question Sets) */}
          <div
            onClick={() => {
              sounds.playClick();
              onClose();
              onSelectDualRoom();
            }}
            className="group relative bg-white hover:bg-purple-50/40 rounded-3xl p-5 border-2 border-purple-200 hover:border-purple-400 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between active:scale-98"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform">
                  ⚡
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-900 text-[11px] font-black uppercase flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3" />
                  <span>Mới</span>
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-purple-700 transition">
                Phòng kết hợp 2 bộ đề
              </h4>
              <p className="text-xs font-semibold text-slate-500 mt-1.5 leading-relaxed">
                Kết hợp 2 bộ câu hỏi. Cô chỉ định bộ câu hỏi cho từng đội. Màn hình cô chia đôi hiển thị tất cả câu hỏi của 2 bộ.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-purple-100 flex items-center justify-between text-xs font-black text-purple-700">
              <span>Tạo phòng 2 bộ đề</span>
              <div className="w-7 h-7 rounded-full bg-purple-100 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition">
                <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-black text-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
