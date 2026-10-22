import React, { useEffect } from 'react';
import { Sparkles, WifiOff, Volume2 } from 'lucide-react';
import { ConnectedTeam } from '../../types/game';
import { TEAM_PRESETS } from '../../data/teamPresets';
import { unlockSpeechAudio, speakVietnamese } from '../../utils/speechVoice';

interface PlayerWaitingProps {
  team: ConnectedTeam;
  roomCode: string;
  isConnected?: boolean;
  isDualMode?: boolean;
  myAssignedSet?: 'A' | 'B';
  assignedSetTitle?: string;
}

export const PlayerWaiting: React.FC<PlayerWaitingProps> = ({
  team,
  roomCode,
  isConnected = true,
  isDualMode = false,
  myAssignedSet,
  assignedSetTitle,
}) => {
  const preset = TEAM_PRESETS.find(p => p.id === team.teamId);

  useEffect(() => {
    unlockSpeechAudio();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-start pt-3 sm:pt-5 pb-8 px-4 text-center relative overflow-hidden">
      {/* Decorative floating bubbles & stars */}
      <div className="absolute top-6 left-8 text-2xl animate-float opacity-70">⭐</div>
      <div className="absolute top-12 right-10 text-xl animate-float opacity-60" style={{ animationDelay: '1s' }}>🎈</div>
      <div className="absolute bottom-12 left-12 text-2xl animate-float opacity-70" style={{ animationDelay: '2s' }}>🌈</div>
      <div className="absolute bottom-16 right-8 text-xl animate-float opacity-60" style={{ animationDelay: '1.5s' }}>🌸</div>

      <div className="w-full max-w-xl sm:max-w-2xl bg-white rounded-3xl p-5 sm:p-7 border-4 border-white shadow-2xl relative z-10">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`}></span>
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
              PHÒNG CHƠI: <strong className="font-mono text-indigo-700 font-black">{roomCode}</strong>
            </span>
          </div>

          {isConnected ? (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Đã kết nối
            </span>
          ) : (
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 animate-pulse flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              <span>Đang kết nối lại...</span>
            </span>
          )}
        </div>

        {/* Big Team Emblem */}
        <div className="my-4">
          <div className={`w-28 h-28 mx-auto rounded-3xl ${preset?.bgColor || 'bg-indigo-500'} text-white flex items-center justify-center text-6xl shadow-xl animate-bounce mb-3`}>
            {team.icon}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {team.teamName}
            </h2>
          </div>
        </div>

        {/* Assigned Question Set Notice in Dual Mode */}
        {isDualMode && (
          <div className="mb-4 p-3 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-900 shadow-2xs">
            <span className="text-[11px] font-black uppercase text-indigo-600 block mb-0.5">
              🎯 BỘ CÂU HỎI ĐỘI BÉ ĐƯỢC CHỈ ĐỊNH:
            </span>
            <span className="text-sm font-black text-indigo-950">
              {myAssignedSet === 'B' ? '📙 Bộ 2' : '📘 Bộ 1'}: {assignedSetTitle || 'Trò chơi chỉ định'}
            </span>
          </div>
        )}

        {/* Status text */}
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-black text-base sm:text-lg mb-1">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <span>Đã tham gia thành công!</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-emerald-800">
            Bé hãy chú ý nhìn lên màn hình máy cô nhé!
          </p>
        </div>

        {/* Sound check & audio unlock button for Safari & mobile browsers */}
        <button
          type="button"
          onClick={() => {
            unlockSpeechAudio();
            speakVietnamese('Bé đã sẵn sàng nghe cô đọc bài!');
          }}
          className="w-full mb-4 py-2.5 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-98 shadow-2xs"
          title="Bấm để thử loa và mở khóa âm thanh trên Safari"
        >
          <Volume2 className="w-4 h-4 text-amber-600 animate-bounce" />
          <span>Bé chạm đây để thử loa và sẵn sàng nghe cô đọc câu hỏi 🔊</span>
        </button>

        <div className="flex items-center justify-center gap-2 text-slate-400 font-bold text-xs mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></div>
          <span>Chờ cô bấm bắt đầu trò chơi...</span>
        </div>
      </div>
    </div>
  );
};
