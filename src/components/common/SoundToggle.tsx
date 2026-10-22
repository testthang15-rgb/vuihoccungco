import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { sounds } from '../../utils/sound';

export const SoundToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [enabled, setEnabled] = useState(sounds.isEnabled());

  const handleToggle = () => {
    const next = sounds.toggle();
    setEnabled(next);
    if (next) {
      sounds.playClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={enabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
      className={`p-2 sm:px-4 sm:py-2 rounded-full transition-all flex items-center justify-center gap-1.5 font-black text-xs cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
        enabled
          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200'
      } ${className}`}
      aria-label={enabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
    >
      {enabled ? (
        <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
      ) : (
        <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
      )}
      <span className="whitespace-nowrap hidden sm:inline">{enabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}</span>
      {enabled && <span className="text-[10px] text-emerald-400 hidden md:inline">✨</span>}
    </button>
  );
};
