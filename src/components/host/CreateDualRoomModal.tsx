import React, { useState } from 'react';
import { Game } from '../../types/game';
import { getAllGames } from '../../services/gameStorage';
import { DEFAULT_GAMES } from '../../data/defaultGames';
import { GameCoverIllustration } from '../games/GameCoverIllustration';
import { sounds } from '../../utils/sound';
import {
  X,
  Layers,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Search,
  Check,
  Play
} from 'lucide-react';

interface CreateDualRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDualRoom: (gameA: Game, gameB: Game) => void;
}

export const CreateDualRoomModal: React.FC<CreateDualRoomModalProps> = ({
  isOpen,
  onClose,
  onConfirmDualRoom,
}) => {
  const allGames = getAllGames();
  const [selectedGameA, setSelectedGameA] = useState<Game>(() => allGames[0] || DEFAULT_GAMES[0]);
  const [selectedGameB, setSelectedGameB] = useState<Game>(() => allGames[1] || DEFAULT_GAMES[1] || allGames[0]);
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(allGames.map(g => g.category || 'Mầm non')))];

  const filteredGames = allGames.filter((g) => {
    const matchesSearch =
      (g.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectGame = (game: Game) => {
    sounds.playClick();
    if (activeSlot === 'A') {
      setSelectedGameA(game);
      // Auto move slot to B if B is the same game
      if (selectedGameB.id === game.id) {
        const otherGame = allGames.find(g => g.id !== game.id);
        if (otherGame) setSelectedGameB(otherGame);
      }
      setActiveSlot('B');
    } else {
      setSelectedGameB(game);
    }
  };

  const handleSwapGames = () => {
    sounds.playClick();
    const temp = selectedGameA;
    setSelectedGameA(selectedGameB);
    setSelectedGameB(temp);
  };

  const handleStartRoom = () => {
    sounds.playCorrect();
    onConfirmDualRoom(selectedGameA, selectedGameB);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border-4 border-indigo-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl shadow-inner">
              ⚡
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                <span>TẠO PHÒNG KẾT HỢP 2 BỘ CÂU HỎI</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 shadow-2xs">
                  Mới
                </span>
              </h2>
              <p className="text-xs text-indigo-100 font-semibold">
                Chọn 2 bộ câu hỏi. Trong phòng chơi, cô chỉ định từng đội trả lời bộ câu hỏi tương ứng!
              </p>
            </div>
          </div>

          <button
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

        {/* Selected Dual Slots Showcase */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            
            {/* Slot A */}
            <div
              onClick={() => setActiveSlot('A')}
              className={`p-4 rounded-2xl border-3 transition-all cursor-pointer relative ${
                activeSlot === 'A'
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-200'
                  : 'border-slate-200 bg-white hover:border-indigo-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block animate-pulse" />
                  <span>BỘ CÂU HỎI 1 (ĐỀ A)</span>
                </span>
                {activeSlot === 'A' && (
                  <span className="text-[11px] font-black text-indigo-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đang chọn cho ô này</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-20 h-14 rounded-xl overflow-hidden shadow-inner bg-slate-200 shrink-0">
                  <GameCoverIllustration game={selectedGameA} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                    {selectedGameA.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-semibold">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                      {selectedGameA.category}
                    </span>
                    <span>·</span>
                    <span>{selectedGameA.questions.length} câu hỏi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Swap Button In-Between */}
            <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwapGames();
                }}
                className="w-10 h-10 rounded-full bg-white border-2 border-indigo-200 text-indigo-600 shadow-md hover:bg-indigo-50 hover:scale-105 active:scale-95 flex items-center justify-center transition cursor-pointer"
                title="Đổi vị trí 2 bộ câu hỏi"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            {/* Slot B */}
            <div
              onClick={() => setActiveSlot('B')}
              className={`p-4 rounded-2xl border-3 transition-all cursor-pointer relative ${
                activeSlot === 'B'
                  ? 'border-pink-500 bg-pink-50/50 shadow-md ring-2 ring-pink-200'
                  : 'border-slate-200 bg-white hover:border-pink-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-pink-700 bg-pink-100 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-pink-600 inline-block animate-pulse" />
                  <span>BỘ CÂU HỎI 2 (ĐỀ B)</span>
                </span>
                {activeSlot === 'B' && (
                  <span className="text-[11px] font-black text-pink-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đang chọn cho ô này</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-20 h-14 rounded-xl overflow-hidden shadow-inner bg-slate-200 shrink-0">
                  <GameCoverIllustration game={selectedGameB} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                    {selectedGameB.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-semibold">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                      {selectedGameB.category}
                    </span>
                    <span>·</span>
                    <span>{selectedGameB.questions.length} câu hỏi</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-500">
            Bấm chọn trò chơi bên dưới để gán vào{' '}
            <span className={`font-black ${activeSlot === 'A' ? 'text-indigo-600' : 'text-pink-600'}`}>
              {activeSlot === 'A' ? 'Bộ câu hỏi 1' : 'Bộ câu hỏi 2'}
            </span>:
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm bộ trò chơi..."
                className="w-full pl-9 pr-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
        </div>

        {/* Games Grid for Selection */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-h-[380px] bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredGames.map((game) => {
              const isSelectedA = selectedGameA.id === game.id;
              const isSelectedB = selectedGameB.id === game.id;

              return (
                <div
                  key={game.id}
                  onClick={() => handleSelectGame(game)}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group hover:-translate-y-0.5 ${
                    isSelectedA
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-200'
                      : isSelectedB
                      ? 'border-pink-500 bg-pink-50/70 shadow-sm ring-2 ring-pink-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden mb-2 bg-slate-100">
                      <GameCoverIllustration game={game} />
                      <div className="absolute top-1.5 left-1.5">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/90 text-slate-800 shadow-2xs">
                          {game.category}
                        </span>
                      </div>
                      {isSelectedA && (
                        <div className="absolute top-1.5 right-1.5">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            <span>Bộ 1</span>
                          </span>
                        </div>
                      )}
                      {isSelectedB && (
                        <div className="absolute top-1.5 right-1.5">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-600 text-white shadow-2xs flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            <span>Bộ 2</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition truncate">
                      {game.title}
                    </h5>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>{game.questions.length} câu hỏi</span>
                    <span className="text-indigo-600 font-extrabold">
                      {isSelectedA ? 'Đã gán Bộ 1' : isSelectedB ? 'Đã gán Bộ 2' : 'Chọn'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>
              Bộ 1: <strong className="text-indigo-700">{selectedGameA.title}</strong> · Bộ 2: <strong className="text-pink-700">{selectedGameB.title}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-black text-xs transition cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleStartRoom}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>TẠO PHÒNG KẾT HỢP 2 BỘ ĐỀ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
