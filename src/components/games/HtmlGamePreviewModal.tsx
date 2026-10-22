import React, { useRef, useState, useEffect } from 'react';
import { Game } from '../../types/game';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface HtmlGamePreviewModalProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
}

export const HtmlGamePreviewModal: React.FC<HtmlGamePreviewModalProps> = ({
  isOpen,
  game,
  onClose,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const [useSrcDocFallback, setUseSrcDocFallback] = useState<boolean>(false);

  useEffect(() => {
    setRuntimeError(null);
    setUseSrcDocFallback(false);
    const handleMsg = (e: MessageEvent) => {
      if (e.data && typeof e.data === 'object' && e.data.type === 'GAME_RUNTIME_ERROR') {
        const msg = String(e.data.message || '');
        if (
          msg.includes('firebase') ||
          msg.includes('auth/') ||
          msg.includes('play()') ||
          msg.includes('ResizeObserver') ||
          msg.includes('user gesture')
        ) {
          return; // Ignore harmless warnings
        }
        setRuntimeError(`Lỗi mã nguồn: ${msg}`);
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [game]);

  if (!isOpen || !game) return null;

  const gameUrl = !useSrcDocFallback ? (game.gameUrl || game.questions?.[0]?.gameUrl) : undefined;
  const htmlContent = game.questions?.[0]?.htmlContent || '';

  const handleReset = () => {
    sounds.playClick();
    setRuntimeError(null);
    if (iframeRef.current) {
      if (gameUrl) {
        iframeRef.current.src = gameUrl;
      } else {
        iframeRef.current.srcdoc = htmlContent;
      }
    }
  };

  const handleIframeError = () => {
    if (!useSrcDocFallback && htmlContent) {
      console.warn('Preview iframe src failed, falling back to bundled HTML');
      setUseSrcDocFallback(true);
    }
  };

  const handleIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        const isSpa = Boolean(doc.getElementById('root')) || (doc.title && doc.title.includes('Vui Học Cùng Cô'));
        const is404 = (doc.title && doc.title.includes('404')) || (doc.body && doc.body.innerText && doc.body.innerText.includes('404: Không tìm thấy'));
        if ((isSpa || is404) && htmlContent && !useSrcDocFallback) {
          console.warn('Preview iframe loaded main SPA or 404, falling back to bundled HTML');
          setUseSrcDocFallback(true);
        }
      }
    } catch (_e) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/85 backdrop-blur-md select-none animate-in fade-in">
      <div className="bg-slate-900 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700">
        {/* Top Header */}
        <div className="px-6 py-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black uppercase text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-3 py-1 rounded-full">
              {game.isZipArchive ? 'Trò chơi đóng gói ZIP (HTML5 + CSS + JS)' : 'Chế độ xem trước trò chơi HTML5'}
            </span>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-100 truncate max-w-xs sm:max-w-md">
              {game.title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              title="Chơi lại từ đầu"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Chơi lại</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>ĐÓNG</span>
            </button>
          </div>
        </div>

        {/* Error notification banner */}
        {runtimeError && (
          <div className="bg-rose-500/90 text-white text-xs px-6 py-2.5 font-bold flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Cảnh báo lỗi: {runtimeError}</span>
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-black transition cursor-pointer"
            >
              Thử tải lại
            </button>
          </div>
        )}

        {/* IFrame Viewport */}
        <div className="flex-1 w-full h-full bg-slate-950 overflow-hidden relative">
          <iframe
            ref={iframeRef}
            src={gameUrl || undefined}
            srcDoc={!gameUrl ? htmlContent : undefined}
            onError={handleIframeError}
            title={game.title}
            sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
            allow="autoplay; fullscreen"
            className="w-full h-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
