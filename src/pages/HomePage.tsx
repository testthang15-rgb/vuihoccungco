import React, { useState, useEffect } from 'react';
import {
  Play,
  Sparkles,
  Star,
  ArrowRight,
  Check,
  Search,
  X,
  CheckCircle2
} from 'lucide-react';
import { sounds } from '../utils/sound';
import { DEFAULT_GAMES } from '../data/defaultGames';
import { Game } from '../types/game';
import {
  getAllGames,
  getFeaturedGameId,
  setFeaturedGameId,
  subscribeGames,
  subscribeFeaturedGame
} from '../services/gameStorage';
import { SelectRoomTypeModal } from '../components/host/SelectRoomTypeModal';

interface HomePageProps {
  onQuickPlay: (game: Game) => void;
  onOpenGamesBank: () => void;
  onCreateGame: () => void;
  onCreateDualRoom?: () => void;
  onJoinRoom: () => void;
  onViewHistory: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onQuickPlay,
  onOpenGamesBank,
  onCreateGame,
  onCreateDualRoom,
  onJoinRoom,
  onViewHistory,
}) => {
  const [allGamesList, setAllGamesList] = useState<Game[]>(() => getAllGames());
  const [featuredId, setFeaturedId] = useState<string>(() => getFeaturedGameId());
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);
  const [isSelectFeaturedModalOpen, setIsSelectFeaturedModalOpen] = useState(false);
  const [isSelectRoomTypeModalOpen, setIsSelectRoomTypeModalOpen] = useState(false);
  const [featuredSearch, setFeaturedSearch] = useState('');

  // Subscribe to storage changes
  useEffect(() => {
    const unsubGames = subscribeGames((updated) => setAllGamesList(updated));
    const unsubFeatured = subscribeFeaturedGame((newId) => setFeaturedId(newId));
    return () => {
      unsubGames();
      unsubFeatured();
    };
  }, []);

  // Determine the active featured game
  const featuredGame: Game =
    allGamesList.find((g) => g.id === featuredId) ||
    DEFAULT_GAMES.find((g) => g.id === featuredId) ||
    DEFAULT_GAMES[0];

  const handleSelectFeatured = (game: Game) => {
    sounds.playCorrect();
    setFeaturedGameId(game.id);
    setFeaturedId(game.id);
    setIsSelectFeaturedModalOpen(false);
    setToastFeedback(`✨ Đã ghim trò chơi "${game.title}" lên banner trang chủ!`);
    setTimeout(() => setToastFeedback(null), 3500);
  };

  const filteredGamesForModal = allGamesList.filter((g) =>
    (g.title || '').toLowerCase().includes(featuredSearch.toLowerCase()) ||
    (g.category || '').toLowerCase().includes(featuredSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8 select-none">
      {/* ---------------------------------------------------- */}
      {/* HERO BANNER: SLOGAN + FEATURED GAME CARD             */}
      {/* ---------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] bg-gradient-to-r from-sky-100/90 via-amber-50/80 to-pink-100/90 border-2 border-white shadow-xl shadow-sky-100/50 p-6 sm:p-10 mb-8 backdrop-blur-sm">
        {/* Soft background pastel cloud blurs */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 right-24 w-72 h-72 bg-pink-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-sky-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
          {/* Left: Clean typography & preschool slogan (removed awkward vector icon as requested) */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-amber-200 text-amber-900 text-xs sm:text-sm font-black shadow-xs mb-3">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin-slow" />
              <span>Thế giới học mầm non</span>
            </div>

            <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight select-none">
              <span className="text-sky-600 block">Cùng nhau</span>
              <span className="text-rose-500 flex items-center justify-center sm:justify-start gap-2 mt-1">
                khám phá <span className="text-amber-400 text-2xl sm:text-3xl animate-bounce">✨</span>
              </span>
              <span className="text-emerald-600 flex items-center justify-center sm:justify-start gap-2 mt-1 text-2xl sm:text-3xl md:text-4xl">
                và học thật vui! <span className="text-rose-500 text-2xl sm:text-3xl">💖</span>
              </span>
            </div>

            <p className="mt-3 text-xs sm:text-sm md:text-base font-bold text-slate-600 leading-relaxed max-w-md">
              Hệ thống trò chơi tương tác giáo dục mầm non sinh động, trực quan giúp các bé hào hứng học tập và phát triển toàn diện.
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
              <span className="px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-xs font-black border border-sky-200/70">
                🎨 Trực quan sinh động
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-black border border-emerald-200/70">
                🎵 Âm thanh vui tươi
              </span>
              <span className="px-3 py-1 rounded-full bg-pink-100/80 text-pink-800 text-xs font-black border border-pink-200/70">
                🌟 Thi đua sôi nổi
              </span>
            </div>

            {/* Quick button to create 2-question-set room inside Hero Banner */}
            {onCreateDualRoom && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onCreateDualRoom();
                  }}
                  className="px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-200 transition active:scale-95 cursor-pointer"
                  title="Tạo phòng chơi kết hợp 2 bộ câu hỏi và chỉ định từng đội"
                >
                  <span className="text-amber-300 text-base">⚡</span>
                  <span>Tạo phòng 2 bộ đề</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 font-black uppercase shadow-2xs">
                    Mới
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Featured Game Card (Trò chơi nổi bật) with slanted Pin 📌 */}
          <div className="relative shrink-0 w-full sm:w-auto max-w-sm">
            {/* Cute Purple Pushpin */}
            <div className="absolute -top-3.5 -right-2 z-20 text-2xl filter drop-shadow-md select-none transform rotate-12">
              📌
            </div>

            {/* Pinned Card Body */}
            <div className="relative bg-white rounded-3xl p-5 border-2 border-amber-100 shadow-xl shadow-amber-900/5 overflow-hidden group">
              {/* Star Ribbon on top-left of card */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white font-black text-[11px] shadow-xs mb-3">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Trò chơi nổi bật</span>
              </div>

              {/* Game Info Row */}
              <div className="flex items-center gap-4 mb-4">
                {/* Visual Game Badge (Clean icon, no awkward SVG) */}
                <div className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shrink-0 shadow-sm border ${
                  featuredGame.theme === 'rose'
                    ? 'bg-gradient-to-br from-rose-100 to-pink-100 border-rose-200 text-rose-600'
                    : featuredGame.theme === 'emerald'
                    ? 'bg-gradient-to-br from-emerald-100 to-teal-100 border-emerald-200 text-emerald-600'
                    : featuredGame.theme === 'cyan'
                    ? 'bg-gradient-to-br from-cyan-100 to-sky-100 border-cyan-200 text-sky-600'
                    : 'bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-200 text-amber-600'
                }`}>
                  {featuredGame.category === 'Làm quen với toán'
                    ? '🔢'
                    : featuredGame.category === 'Khám phá khoa học'
                    ? '🔬'
                    : featuredGame.category === 'Giáo dục âm nhạc'
                    ? '🎵'
                    : '🔤'}
                </div>

                {/* Title & Age info */}
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug line-clamp-2">
                    {featuredGame.title}
                  </h3>
                  <span className="text-xs font-bold text-slate-400 block mt-1">
                    {featuredGame.targetAge || '5 – 6 tuổi'} · {featuredGame.questions?.length || 0} câu
                  </span>

                  {/* Play Button */}
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playCorrect();
                      onQuickPlay(featuredGame);
                    }}
                    className="mt-2.5 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-rose-200 transition active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Chơi ngay</span>
                  </button>
                </div>
              </div>

              {/* Teacher option: Change / Mark Featured Game Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">
                  {featuredGame.category || 'Mầm non'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setIsSelectFeaturedModalOpen(true);
                  }}
                  className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                  title="Cô có thể chọn bất kỳ trò chơi nào để hiển thị nổi bật trên banner này"
                >
                  <Star className="w-3 h-3 text-amber-500 fill-current" />
                  <span>Đổi trò nổi bật</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4 MAIN ACTION CARDS (2x2 GRID) AS IN ORIGINAL MOCKUP */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        {/* CARD 1: TẠO PHÒNG CHƠI (Yellow pastel) */}
        <div
          onClick={() => {
            sounds.playClick();
            setIsSelectRoomTypeModalOpen(true);
          }}
          className="group relative bg-[#fefce8] hover:bg-[#fef9c3] border-2 border-[#fef08a] rounded-[28px] sm:rounded-[36px] p-5 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4 sm:gap-5">
            {/* 3D-styled preschool house icon with plus badge */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-105 transition-transform duration-200">
              <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16">
                {/* Green bush ground */}
                <ellipse cx="25" cy="85" rx="14" ry="7" fill="#86efac" />
                <ellipse cx="75" cy="85" rx="14" ry="7" fill="#86efac" />
                {/* House Base */}
                <rect x="25" y="44" width="50" height="42" rx="6" fill="#fef08a" />
                <rect x="25" y="44" width="50" height="8" fill="#fde047" />
                {/* Red Roof with 3D slope */}
                <polygon points="50,15 15,44 85,44" fill="#ef4444" />
                <polygon points="50,15 48,15 13,44 15,44" fill="#b91c1c" />
                {/* Blue door with white medical/educational cross/plus */}
                <rect x="38" y="58" width="24" height="28" rx="4" fill="#38bdf8" />
                {/* Plus symbol */}
                <rect x="47" y="66" width="6" height="14" rx="2" fill="#ffffff" />
                <rect x="43" y="70" width="14" height="6" rx="2" fill="#ffffff" />
                {/* Small round attic window */}
                <circle cx="50" cy="32" r="6" fill="#fef9c3" stroke="#b91c1c" strokeWidth="2" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Tạo phòng chơi
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                Cô tạo phòng để cả lớp cùng chơi
              </p>
            </div>
          </div>

          {/* Yellow circular arrow button */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-amber-400 group-hover:bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:translate-x-1 transition-all duration-200">
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          </div>
        </div>

        {/* CARD 2: THAM GIA PHÒNG (Mint/Cyan pastel) */}
        <div
          onClick={() => {
            sounds.playClick();
            onJoinRoom();
          }}
          className="group relative bg-[#ecfdf5] hover:bg-[#d1fae5] border-2 border-[#a7f3d0] rounded-[28px] sm:rounded-[36px] p-5 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4 sm:gap-5">
            {/* 3D-styled kid avatars (blue & pink) with cheerful rays */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-emerald-100 group-hover:scale-105 transition-transform duration-200">
              <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16">
                {/* Cheerful celebration rays above heads */}
                <line x1="50" y1="20" x2="50" y2="12" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                <line x1="38" y1="24" x2="33" y2="18" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                <line x1="62" y1="24" x2="67" y2="18" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />

                {/* Left: Blue boy silhouette with cute head & body */}
                <circle cx="36" cy="45" r="16" fill="#38bdf8" />
                <path d="M 18 85 C 18 68 54 68 54 85 Z" fill="#0284c7" />

                {/* Right: Pink girl silhouette overlapping */}
                <circle cx="64" cy="48" r="15" fill="#f472b6" />
                <path d="M 48 85 C 48 70 80 70 80 85 Z" fill="#db2777" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Tham gia phòng
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                Nhập mã phòng để tham gia
              </p>
            </div>
          </div>

          {/* Mint/Teal circular arrow button */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-400 group-hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:translate-x-1 transition-all duration-200">
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          </div>
        </div>

        {/* CARD 3: TẠO TRÒ CHƠI MỚI (Lilac pastel) */}
        <div
          onClick={() => {
            sounds.playClick();
            onCreateGame();
          }}
          className="group relative bg-[#f5f3ff] hover:bg-[#ede9fe] border-2 border-[#ddd6fe] rounded-[28px] sm:rounded-[36px] p-5 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4 sm:gap-5">
            {/* 3D-styled Magic Wand with Smiling Star */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-purple-100 group-hover:scale-105 transition-transform duration-200">
              <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16">
                {/* Magic sparkles */}
                <circle cx="28" cy="30" r="2.5" fill="#c084fc" />
                <circle cx="75" cy="22" r="3" fill="#facc15" />
                <circle cx="82" cy="55" r="2" fill="#ec4899" />
                <circle cx="22" cy="70" r="2" fill="#38bdf8" />

                {/* Wand Stick */}
                <path d="M 22 80 L 52 48" stroke="#7c3aed" strokeWidth="8" strokeLinecap="round" />
                <path d="M 22 80 L 32 68" stroke="#a855f7" strokeWidth="8" strokeLinecap="round" />

                {/* Smiling Star on tip */}
                <polygon
                  points="58,15 64,30 80,32 68,44 72,60 58,50 44,60 48,44 36,32 52,30"
                  fill="#facc15"
                />
                <polygon
                  points="58,18 63,31 77,33 66,43 70,57 58,48 46,57 50,43 39,33 53,31"
                  fill="#fde047"
                />
                {/* Cute star smiling face */}
                <circle cx="54" cy="37" r="1.5" fill="#1e293b" />
                <circle cx="62" cy="37" r="1.5" fill="#1e293b" />
                <path d="M 55 42 Q 58 45 61 42" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                <circle cx="51" cy="40" r="1.5" fill="#f43f5e" opacity="0.6" />
                <circle cx="65" cy="40" r="1.5" fill="#f43f5e" opacity="0.6" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Tạo trò chơi mới
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                Tự thiết kế trò chơi của cô
              </p>
            </div>
          </div>

          {/* Purple circular arrow button */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-purple-400 group-hover:bg-purple-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:translate-x-1 transition-all duration-200">
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          </div>
        </div>

        {/* CARD 4: LỊCH SỬ CHƠI (Rose pastel) */}
        <div
          onClick={() => {
            sounds.playClick();
            onViewHistory();
          }}
          className="group relative bg-[#fff1f2] hover:bg-[#ffe4e6] border-2 border-[#fecdd3] rounded-[28px] sm:rounded-[36px] p-5 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4 sm:gap-5">
            {/* 3D-styled Friendly Blue Clock */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-rose-100 group-hover:scale-105 transition-transform duration-200">
              <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16">
                <circle cx="50" cy="50" r="34" fill="#38bdf8" />
                <circle cx="50" cy="50" r="30" fill="#0284c7" />
                <circle cx="50" cy="50" r="26" fill="#ffffff" />

                <circle cx="50" cy="29" r="2" fill="#94a3b8" />
                <circle cx="71" cy="50" r="2" fill="#94a3b8" />
                <circle cx="50" cy="71" r="2" fill="#94a3b8" />
                <circle cx="29" cy="50" r="2" fill="#94a3b8" />

                <line x1="50" y1="50" x2="50" y2="34" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
                <line x1="50" y1="50" x2="66" y2="50" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="50" cy="50" r="4" fill="#d97706" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                Lịch sử chơi
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                Xem lại các lần chơi
              </p>
            </div>
          </div>

          {/* Rose/Coral circular arrow button */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-rose-300 group-hover:bg-rose-400 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:translate-x-1 transition-all duration-200">
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* FOOTER: VÌ SAO GIÁO VIÊN VÀ BÉ YÊU THÍCH              */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white rounded-[32px] sm:rounded-[36px] p-6 sm:p-10 md:p-12 border border-slate-200/80 shadow-xs mb-8">
        <h2 className="text-center text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase mb-8 sm:mb-12">
          VÌ SAO GIÁO VIÊN VÀ BÉ YÊU THÍCH "VUI HỌC CÙNG CÔ"?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 text-center">
          {/* Feature 1: Đồng bộ tức thời */}
          <div className="flex flex-col items-center px-2">
            <div className="w-12 h-12 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-xs" fill="none">
                <path
                  d="M13 2L4 13.5H11L9.5 22L19.5 10.5H12.5L14 2H13Z"
                  fill="#f97316"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2">
              Đồng bộ tức thời
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed max-w-xs">
              Cô bấm là tất cả điện thoại các đội cùng nhận câu hỏi ngay lập tức mà không có độ trễ.
            </p>
          </div>

          {/* Feature 2: Chống nhìn bài và gian lận */}
          <div className="flex flex-col items-center px-2">
            <div className="w-12 h-12 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-xs" fill="none">
                <path
                  d="M12 2L4 5.5V11.5C4 16.5 7.4 21.1 12 22.3C16.6 21.1 20 16.5 20 11.5V5.5L12 2Z"
                  fill="#38bdf8"
                  stroke="#0284c7"
                  strokeWidth="1"
                />
                <path
                  d="M12 3.5V20.8C15.6 19.7 18.5 15.8 18.5 11.5V6.6L12 3.5Z"
                  fill="#0284c7"
                  opacity="0.25"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2">
              Chống nhìn bài và gian lận
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed max-w-xs">
              Trong lúc đếm ngược, máy tính cô chỉ hiện trạng thái đã trả lời, không lộ phương án của đội.
            </p>
          </div>

          {/* Feature 3: Báo cáo chi tiết sau buổi học */}
          <div className="flex flex-col items-center px-2">
            <div className="w-12 h-12 flex items-center justify-center mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/90 flex items-end justify-center gap-1.5 p-1.5 shadow-2xs">
                <span className="w-1.5 h-3.5 bg-rose-400 rounded-xs" />
                <span className="w-1.5 h-5 bg-emerald-400 rounded-xs" />
                <span className="w-1.5 h-6.5 bg-sky-400 rounded-xs" />
              </div>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2">
              Báo cáo chi tiết sau buổi học
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed max-w-xs">
              Ma trận đầy đủ từng câu của từng đội, tỷ lệ đúng, và hỗ trợ xuất file CSV để lưu hồ sơ.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Toast Feedback */}
      {toastFeedback && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-slate-900/90 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2.5 shadow-2xl backdrop-blur-md border border-white/20 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastFeedback}</span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CHỌN TRÒ CHƠI NỔI BẬT ĐỂ HIỂN THỊ TRÊN BANNER */}
      {/* ---------------------------------------------------- */}
      {isSelectFeaturedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border-2 border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-400 to-pink-500 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                  ⭐
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">
                    Chọn trò chơi nổi bật trên trang chủ
                  </h3>
                  <p className="text-xs font-semibold text-amber-100">
                    Trò chơi được chọn sẽ xuất hiện nổi bật tại góc banner chính
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSelectFeaturedModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={featuredSearch}
                  onChange={(e) => setFeaturedSearch(e.target.value)}
                  placeholder="Tìm kiếm trò chơi để ghim nổi bật..."
                  className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Games List to pick from */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {filteredGamesForModal.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-slate-400">
                  Không tìm thấy trò chơi nào phù hợp
                </div>
              ) : (
                filteredGamesForModal.map((g) => {
                  const isCurrent = g.id === featuredId;

                  return (
                    <div
                      key={g.id}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-amber-50/80 border-amber-400 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div
                        onClick={() => handleSelectFeatured(g)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                          g.theme === 'rose'
                            ? 'bg-rose-100 text-rose-600'
                            : g.theme === 'cyan'
                            ? 'bg-cyan-100 text-cyan-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}>
                          {g.category === 'Làm quen với toán' ? '🔢' : '🔤'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">
                            {g.title}
                          </h4>
                          <span className="text-[11px] font-bold text-slate-400 block mt-0.5">
                            {g.category} · {g.targetAge || '5 - 6 tuổi'} · {g.questions?.length || 0} câu
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCurrent ? (
                          <span className="px-3 py-1.5 rounded-full bg-amber-400 text-white font-black text-xs flex items-center gap-1 shadow-2xs">
                            <Check className="w-3.5 h-3.5" />
                            <span>Đang nổi bật</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectFeatured(g)}
                            className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 font-extrabold text-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            <span>Ghim banner</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsSelectFeaturedModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Room Type Modal (Option 1: Standard Room vs Option 2: Dual Question Set Room) */}
      <SelectRoomTypeModal
        isOpen={isSelectRoomTypeModalOpen}
        onClose={() => setIsSelectRoomTypeModalOpen(false)}
        onSelectNormalRoom={() => {
          setIsSelectRoomTypeModalOpen(false);
          onOpenGamesBank();
        }}
        onSelectDualRoom={() => {
          setIsSelectRoomTypeModalOpen(false);
          if (onCreateDualRoom) onCreateDualRoom();
        }}
      />
    </div>
  );
};
