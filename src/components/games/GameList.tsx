import React, { useState, useEffect } from 'react';
import { Plus, Play, Edit3, Copy, Trash2, BookOpen, Users, Sparkles, Search, FileCode, Eye, Archive, Filter, X, CheckCircle2, Star, Heart } from 'lucide-react';
import { Game } from '../../types/game';
import { GameCoverIllustration } from './GameCoverIllustration';
import {
  getAllGames,
  deleteGame,
  saveGame,
  subscribeGames,
  moveToTrash,
  getTrashGames,
  subscribeTrash,
  getFeaturedGameId,
  setFeaturedGameId,
  subscribeFeaturedGame,
  getFavoriteGameIds,
  toggleFavoriteGameId,
  subscribeFavorites,
} from '../../services/gameStorage';
import { sounds } from '../../utils/sound';
import { Modal } from '../common/Modal';
import { UploadHtmlGameModal } from './UploadHtmlGameModal';
import { HtmlGamePreviewModal } from './HtmlGamePreviewModal';
import { GameTrashModal } from './GameTrashModal';

interface GameListProps {
  onSelectGameToPlay: (game: Game) => void;
  onEditGame: (game: Game) => void;
  onCreateNewGame: () => void;
  onCreateDualRoom?: () => void;
}

export const GameList: React.FC<GameListProps> = ({
  onSelectGameToPlay,
  onEditGame,
  onCreateNewGame,
  onCreateDualRoom,
}) => {
  const [games, setGames] = useState<Game[]>(() => getAllGames());
  const [trashGames, setTrashGames] = useState<Game[]>(() => getTrashGames());
  const [isTrashModalOpen, setIsTrashModalOpen] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [featuredId, setFeaturedId] = useState<string>(() => getFeaturedGameId());
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteGameIds());

  useEffect(() => {
    const unsubGames = subscribeGames((updatedGames) => {
      setGames(updatedGames);
    });
    const unsubTrash = subscribeTrash((updatedTrash) => {
      setTrashGames(updatedTrash);
    });
    const unsubFeatured = subscribeFeaturedGame((newId) => {
      setFeaturedId(newId);
    });
    const unsubFavs = subscribeFavorites((newFavs) => {
      setFavoriteIds(newFavs);
    });
    return () => {
      unsubGames();
      unsubTrash();
      unsubFeatured();
      unsubFavs();
    };
  }, []);

  const handleToggleFavorite = (game: Game, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sounds.playClick();
    const isNowFav = toggleFavoriteGameId(game.id);
    setActionFeedback(
      isNowFav
        ? `❤️ Đã thêm "${game.title}" vào danh sách yêu thích!`
        : `Đã bỏ "${game.title}" khỏi danh sách yêu thích.`
    );
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleMarkFeatured = (game: Game, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sounds.playCorrect();
    setFeaturedGameId(game.id);
    setFeaturedId(game.id);
    setActionFeedback(`✨ Đã ghim trò chơi "${game.title}" lên banner trang chủ!`);
    setTimeout(() => setActionFeedback(null), 3500);
  };
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [previewHtmlGame, setPreviewHtmlGame] = useState<Game | null>(null);

  const defaultCategories = [
    'Tất cả',
    '⭐ Nổi bật',
    '❤️ Yêu thích',
    'Chữ cái',
    'Làm quen với toán',
    'Động vật',
    'Môi trường xung quanh',
    'Kỹ năng xã hội',
  ];

  // Combine default categories with any existing categories from custom/imported games
  const existingCategories = Array.from(
    new Set(games.map((g) => g.category).filter((c): c is string => Boolean(c && c.trim())))
  );
  const categories = [
    'Tất cả',
    '⭐ Nổi bật',
    '❤️ Yêu thích',
    ...Array.from(new Set([...defaultCategories.slice(3), ...existingCategories])),
  ];

  const filteredGames = games.filter(g => {
    let matchCat = true;
    if (selectedCategory === '⭐ Nổi bật') {
      matchCat = g.id === featuredId;
    } else if (selectedCategory === '❤️ Yêu thích') {
      matchCat = favoriteIds.includes(g.id);
    } else if (selectedCategory !== 'Tất cả') {
      matchCat = g.category === selectedCategory;
    }

    const matchSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleDuplicate = (game: Game) => {
    sounds.playClick();
    const cloned: Game = {
      ...game,
      id: 'game_' + Math.random().toString(36).substring(2, 9),
      title: `${game.title} (Bản sao)`,
      createdAt: Date.now(),
      playCount: 0,
    };
    saveGame(cloned);
    setGames(getAllGames());
  };

  const handleConfirmDelete = () => {
    if (!gameToDelete) return;
    sounds.playClick();
    moveToTrash(gameToDelete.id);
    setGames(getAllGames());
    setTrashGames(getTrashGames());
    setActionFeedback(`Đã chuyển trò chơi "${gameToDelete.title}" vào Thùng rác (Lưu giữ trong 7 ngày).`);
    setTimeout(() => {
      setActionFeedback(null);
    }, 3500);
    setGameToDelete(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Toast feedback */}
      {actionFeedback && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-800 text-sm font-black flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              setIsTrashModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer"
          >
            Mở thùng rác
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>NGÂN HÀNG TRÒ CHƠI</span>
            <span className="text-2xl">📚</span>
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Chọn bộ trò chơi có sẵn, tạo trò chơi mới hoặc tải lên gói game ZIP (đầy đủ CSS, JS) của cô
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Button: Trash Bin */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsTrashModalOpen(true);
            }}
            className="px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-2 border-slate-200 font-black text-sm flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer relative"
            title="Xem thùng rác trò chơi (Lưu trữ 7 ngày)"
          >
            <Trash2 className="w-5 h-5 text-rose-500" />
            <span>THÙNG RÁC</span>
            {trashGames.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black animate-pulse">
                {trashGames.length}
              </span>
            )}
          </button>

          {/* Button: Upload ZIP / HTML Game */}
          <button
            onClick={() => {
              sounds.playClick();
              setIsUploadModalOpen(true);
            }}
            className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-cyan-200 transition active:scale-95 cursor-pointer"
          >
            <Archive className="w-5 h-5" />
            <span>TẢI GÓI ZIP / HTML</span>
          </button>

          {/* Button: Create Dual Mode Room */}
          {onCreateDualRoom && (
            <button
              onClick={() => {
                sounds.playClick();
                onCreateDualRoom();
              }}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-purple-200 transition active:scale-95 cursor-pointer"
              title="Tạo phòng chơi kết hợp 2 bộ câu hỏi và chỉ định từng đội trả lời"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>PHÒNG 2 BỘ ĐỀ</span>
            </button>
          )}

          {/* Button: Create Game with Builder */}
          <button
            onClick={() => {
              sounds.playClick();
              onCreateNewGame();
            }}
            className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-200 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>TẠO TRÒ CHƠI MỚI</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm mb-8 space-y-4">
        {/* Top line: Search Input & Quick Info */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên trò chơi, chủ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-2xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Counter & Clear Filters */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-bold text-slate-500">
            <span>
              Tìm thấy <b className="text-indigo-600 font-black">{filteredGames.length}</b> trò chơi
            </span>
            {(selectedCategory !== 'Tất cả' || searchQuery) && (
              <button
                onClick={() => {
                  sounds.playClick();
                  setSelectedCategory('Tất cả');
                  setSearchQuery('');
                }}
                className="text-xs font-black text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Xóa bộ lọc</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills - Flex-wrap to ensure full visibility with no truncation or cut off */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span>Chủ đề:</span>
          </div>

          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                sounds.playClick();
                setSelectedCategory(cat);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-300 scale-102 ring-2 ring-slate-900/10'
                  : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Games Grid */}
      {filteredGames.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-700 text-lg">
            Không tìm thấy trò chơi nào
          </h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Cô hãy thử thay đổi từ khóa tìm kiếm hoặc tạo một bộ trò chơi mới nhé!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="bg-white rounded-3xl p-3.5 sm:p-4 border-2 border-slate-100 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group overflow-hidden hover:-translate-y-1"
            >
              <div>
                {/* 1. Prominent Illustration Cover */}
                <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden shadow-inner bg-slate-100 mb-3">
                  <GameCoverIllustration game={game} />

                  {/* Floating Badges Over Cover */}
                  {/* Top-Left: Category & ZIP/HTML5 */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs border border-white/70">
                      {game.category}
                    </span>
                    {(game.gameType === 'html_game' || game.isCustomHtml) && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-white bg-cyan-600/90 backdrop-blur-md px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 border border-cyan-400/40">
                        {game.isZipArchive ? (
                          <>
                            <Archive className="w-2.5 h-2.5 text-cyan-200" />
                            <span>GÓI ZIP</span>
                          </>
                        ) : (
                          <>
                            <FileCode className="w-2.5 h-2.5 text-cyan-200" />
                            <span>HTML5</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Top-Right: Favorite & Featured Buttons */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                    {/* Favorite Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(game, e)}
                      className={`p-1.5 rounded-full backdrop-blur-md transition cursor-pointer shadow-xs active:scale-95 ${
                        favoriteIds.includes(game.id)
                          ? 'bg-white text-rose-500 ring-2 ring-rose-300'
                          : 'bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500'
                      }`}
                      title={favoriteIds.includes(game.id) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${favoriteIds.includes(game.id) ? 'fill-current' : ''}`} />
                    </button>

                    {/* Star Featured Badge / Pin Button */}
                    {game.id === featuredId ? (
                      <span
                        className="px-2 py-1 rounded-full bg-amber-400 text-white font-black text-[9px] flex items-center gap-1 shadow-xs"
                        title="Trò chơi này đang được hiển thị nổi bật trên banner trang chủ"
                      >
                        <Star className="w-3 h-3 fill-current" />
                        <span>Nổi bật</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleMarkFeatured(game, e)}
                        className="px-2 py-1 rounded-full bg-white/80 hover:bg-white text-slate-600 hover:text-amber-800 font-extrabold text-[9px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                        title="Đánh dấu ghim trò chơi này lên banner trang chủ"
                      >
                        <Star className="w-3 h-3 text-amber-500" />
                        <span>Ghim</span>
                      </button>
                    )}
                  </div>

                  {/* Bottom-Left: Question Count Badge (NO time limit shown) */}
                  <div className="absolute bottom-2.5 left-2.5 z-10">
                    <span className="text-[10px] font-black text-white bg-slate-900/70 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 border border-white/20">
                      <BookOpen className="w-3 h-3 text-indigo-300" />
                      <span>{game.questions.length} câu hỏi</span>
                    </span>
                  </div>

                  {/* Bottom-Right: Target Age */}
                  <div className="absolute bottom-2.5 right-2.5 z-10">
                    <span className="text-[10px] font-black text-white bg-slate-900/70 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs border border-white/20">
                      {game.targetAge || '5-6 tuổi'}
                    </span>
                  </div>
                </div>

                {/* 2. Title & Brief Subtitle (Reduced text clutter) */}
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition tracking-tight line-clamp-2 px-1">
                  {game.title}
                </h3>
                {game.description && (
                  <p className="text-xs font-semibold text-slate-400 mt-1 line-clamp-1 leading-relaxed px-1">
                    {game.description}
                  </p>
                )}
              </div>

              {/* 3. Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    sounds.playCorrect();
                    onSelectGameToPlay(game);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 transition active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>CHƠI NGAY</span>
                </button>

                <div className="flex items-center gap-1">
                  {/* Preview / Test Play Button (Especially for HTML games) */}
                  {(game.gameType === 'html_game' || game.isCustomHtml) && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setPreviewHtmlGame(game);
                      }}
                      title="Xem trước / Chơi thử game HTML"
                      className="p-2 rounded-xl text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      sounds.playClick();
                      onEditGame(game);
                    }}
                    title="Chỉnh sửa"
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(game)}
                    title="Sao chép trò chơi"
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      sounds.playClick();
                      setGameToDelete(game);
                    }}
                    title="Xóa trò chơi"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload HTML Game Modal */}
      <UploadHtmlGameModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onGameUploaded={(newGame) => {
          setGames(getAllGames());
        }}
      />

      {/* Preview HTML Game Modal */}
      <HtmlGamePreviewModal
        isOpen={Boolean(previewHtmlGame)}
        game={previewHtmlGame}
        onClose={() => setPreviewHtmlGame(null)}
      />

      {/* Trash Bin Modal (7-day storage) */}
      <GameTrashModal
        isOpen={isTrashModalOpen}
        trashGames={trashGames}
        onClose={() => setIsTrashModalOpen(false)}
        onGameRestored={() => {
          setGames(getAllGames());
          setTrashGames(getTrashGames());
        }}
      />

      {/* Confirmation Modal for Moving to Trash */}
      <Modal
        isOpen={Boolean(gameToDelete)}
        title="Chuyển vào thùng rác?"
        message={`Cô có chắc chắn muốn chuyển bộ trò chơi "${gameToDelete?.title}" vào Thùng rác không? Trò chơi sẽ được lưu trữ trong 7 ngày trước khi tự động xóa vĩnh viễn (cô có thể khôi phục lại bất kỳ lúc nào).`}
        confirmText="Chuyển vào thùng rác"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setGameToDelete(null)}
      />
    </div>
  );
};
