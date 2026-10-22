import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Clock, X, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { Game } from '../../types/game';
import { SEVEN_DAYS_MS, restoreFromTrash, permanentlyDeleteGame, emptyTrash } from '../../services/gameStorage';
import { sounds } from '../../utils/sound';
import { Modal } from '../common/Modal';

interface GameTrashModalProps {
  isOpen: boolean;
  trashGames: Game[];
  onClose: () => void;
  onGameRestored?: (game: Game) => void;
}

export const GameTrashModal: React.FC<GameTrashModalProps> = ({
  isOpen,
  trashGames,
  onClose,
  onGameRestored,
}) => {
  const [gameToPermanentlyDelete, setGameToPermanentlyDelete] = useState<Game | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const getDaysRemaining = (deletedAt?: number): number => {
    if (!deletedAt) return 7;
    const elapsed = Date.now() - deletedAt;
    const remainingMs = Math.max(0, SEVEN_DAYS_MS - elapsed);
    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  };

  const handleRestore = (game: Game) => {
    sounds.playCorrect();
    restoreFromTrash(game.id);
    showToast(`Đã khôi phục trò chơi "${game.title}" về danh sách chính!`);
    onGameRestored?.(game);
  };

  const handleConfirmPermanentDelete = () => {
    if (!gameToPermanentlyDelete) return;
    sounds.playClick();
    permanentlyDeleteGame(gameToPermanentlyDelete.id);
    showToast(`Đã xóa vĩnh viễn "${gameToPermanentlyDelete.title}".`);
    setGameToPermanentlyDelete(null);
  };

  const handleConfirmEmptyTrash = () => {
    sounds.playClick();
    emptyTrash();
    showToast('Đã dọn sạch thùng rác vĩnh viễn.');
    setShowEmptyConfirm(false);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          sounds.playClick();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm select-none overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-4 border-slate-100 my-auto relative animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 text-white relative shrink-0 flex items-center justify-between gap-3 shadow-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1 text-rose-100 text-xs font-black uppercase tracking-wider">
              <Trash2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Thùng rác trò chơi</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
              THÙNG RÁC ({trashGames.length})
            </h2>
            <p className="text-xs font-bold text-rose-100 mt-0.5 line-clamp-1">
              Trò chơi đã xóa được lưu trữ an toàn trong <b>7 ngày</b> trước khi tự động xóa hẳn.
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
            title="Đóng (Esc)"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-4 h-4 text-rose-500 stroke-[2.5]" />
            <span>ĐÓNG</span>
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Action Bar */}
        {trashGames.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
            <span>
              Có <b className="text-slate-800">{trashGames.length}</b> trò chơi đang chờ xử lý
            </span>
            <button
              onClick={() => setShowEmptyConfirm(true)}
              className="text-xs font-black text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Dọn sạch thùng rác</span>
            </button>
          </div>
        )}

        {/* List of Trash Games */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-[260px] bg-slate-50/50 space-y-3">
          {trashGames.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center text-3xl mb-3 shadow-inner">
                🗑️
              </div>
              <h3 className="text-base font-black text-slate-700">
                Thùng rác đang trống
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1 max-w-xs">
                Khi cô xóa trò chơi trong ngân hàng, trò chơi sẽ được chuyển vào đây để lưu giữ trong 7 ngày.
              </p>
            </div>
          ) : (
            trashGames.map((game) => {
              const daysLeft = getDaysRemaining(game.deletedAt);
              return (
                <div
                  key={game.id}
                  className="p-4 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                        {game.category}
                      </span>
                      <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Tự động xóa sau {daysLeft} ngày</span>
                      </span>
                    </div>

                    <h4 className="font-black text-slate-900 text-base leading-snug truncate">
                      {game.title}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 line-clamp-1 mt-0.5">
                      {game.description || 'Không có mô tả'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleRestore(game)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer border border-indigo-200"
                      title="Khôi phục trò chơi về ngân hàng chính"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Khôi phục</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setGameToPermanentlyDelete(game);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-black text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer border border-slate-200"
                      title="Xóa vĩnh viễn ngay lập tức"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Xóa hẳn</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
          <span>💡 Trò chơi sau khi khôi phục sẽ xuất hiện lại ngay trong ngân hàng trò chơi.</span>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Permanent Delete */}
      <Modal
        isOpen={Boolean(gameToPermanentlyDelete)}
        title="Xóa vĩnh viễn trò chơi?"
        message={`Cô có chắc chắn muốn xóa vĩnh viễn "${gameToPermanentlyDelete?.title}" ngay bây giờ không? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa vĩnh viễn"
        confirmVariant="danger"
        onConfirm={handleConfirmPermanentDelete}
        onCancel={() => setGameToPermanentlyDelete(null)}
      />

      {/* Confirmation Modal for Empty Trash */}
      <Modal
        isOpen={showEmptyConfirm}
        title="Dọn sạch thùng rác?"
        message="Cô có chắc chắn muốn xóa vĩnh viễn tất cả trò chơi trong thùng rác không? Tất cả các trò chơi sẽ bị xóa hoàn toàn khỏi hệ thống."
        confirmText="Dọn sạch tất cả"
        confirmVariant="danger"
        onConfirm={handleConfirmEmptyTrash}
        onCancel={() => setShowEmptyConfirm(false)}
      />
    </div>
  );
};
