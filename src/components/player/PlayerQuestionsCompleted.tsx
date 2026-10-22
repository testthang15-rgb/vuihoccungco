import React, { useEffect, useState } from 'react';
import { ConnectedTeam, SessionState } from '../../types/game';
import { TEAM_PRESETS } from '../../data/teamPresets';
import { sounds } from '../../utils/sound';
import { speakVietnamese, isSpeechSupported, stopSpeaking, subscribeSpeakingState } from '../../utils/speechVoice';
import { Trophy, Sparkles, Tv, CheckCircle2, Volume2, VolumeX, Radio } from 'lucide-react';

interface PlayerQuestionsCompletedProps {
  team: ConnectedTeam;
  session: SessionState;
}

export const PlayerQuestionsCompleted: React.FC<PlayerQuestionsCompletedProps> = ({
  team,
  session,
}) => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const preset = TEAM_PRESETS.find((p) => p.id === team.teamId);
  const teamScore = session.teams[team.teamId]?.score || 0;
  const totalQuestions = session.game.questions.length;
  const assignedTitle = session.assignedSetTitle || (session.myAssignedSet === 'B' ? 'Bộ câu hỏi 2' : 'Bộ câu hỏi 1');

  useEffect(() => {
    // Play celebratory fanfare on mount
    sounds.playFanfare();

    // Friendly preschool voice prompt
    const welcomeSpeech = `Chúc mừng ${team.teamName} đã hoàn thành tất cả câu hỏi! Các bé hãy nhìn lên màn hình của cô giáo và cùng chờ cô tổng kết nhé!`;
    const timer = setTimeout(() => {
      speakVietnamese(welcomeSpeech);
    }, 600);

    return () => {
      clearTimeout(timer);
      stopSpeaking();
    };
  }, [team.teamName]);

  useEffect(() => {
    const unsub = subscribeSpeakingState((speaking) => {
      setIsSpeaking(speaking);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleToggleSpeak = () => {
    sounds.playClick();
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakVietnamese(
        `Chúc mừng ${team.teamName} đã hoàn thành tất cả câu hỏi! Các bé hãy nhìn lên màn hình của cô giáo và cùng chờ cô tổng kết nhé!`
      );
    }
  };

  return (
    <div className="max-w-xl sm:max-w-2xl mx-auto w-full px-4 py-6 sm:py-8 flex flex-col items-center text-center my-auto">
      {/* Top Tag */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border-2 border-emerald-300 font-black text-xs sm:text-sm shadow-xs mb-4">
        <Sparkles className="w-4 h-4 text-emerald-600 animate-spin-slow" />
        <span>ĐÃ HOÀN THÀNH BỘ ĐỀ {session.isDualMode ? `· ${assignedTitle}` : ''}</span>
      </div>

      {/* Main Cheerful Card */}
      <div className="w-full bg-white rounded-3xl p-6 sm:p-8 md:p-10 border-4 border-amber-300 shadow-2xl relative overflow-hidden">
        {/* Decorative Top Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-amber-400 via-rose-400 via-purple-500 to-sky-400" />

        {/* Mascot & Animated Icon */}
        <div className="relative inline-block mb-3 sm:mb-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200 border-4 border-amber-300 flex items-center justify-center text-5xl sm:text-6xl shadow-lg mx-auto animate-bounce">
            🏆
          </div>
          <span className="absolute -top-1 -right-1 text-2xl animate-spin-slow">✨</span>
          <span className="absolute -bottom-1 -left-1 text-2xl">🎈</span>
        </div>

        {/* Team Identity Banner */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-50 border-2 border-slate-200 shadow-2xs mb-4">
          <span className={`w-10 h-10 rounded-xl ${preset?.bgColor || 'bg-indigo-600'} text-white flex items-center justify-center text-xl shadow-xs shrink-0`}>
            {team.icon || preset?.icon || '⭐'}
          </span>
          <div className="text-left">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Đội của bé
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 leading-none">
              {team.teamName}
            </span>
          </div>
        </div>

        {/* Main Heading */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight mb-3">
          HOAN HÔ CÁC BÉ!
        </h2>
        <p className="text-sm sm:text-base font-bold text-slate-600 mb-6 max-w-md mx-auto">
          Đội của bé đã trả lời hết tất cả câu hỏi trong bộ câu hỏi rồi!
        </p>

        {/* Eye-catching "LOOK UP AT TEACHER'S SCREEN" Callout Box */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white shadow-xl mb-6 relative overflow-hidden border-2 border-indigo-200">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl mb-2.5 shadow-inner border border-white/30 animate-pulse">
              📺
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/25 backdrop-blur-md text-amber-200 text-xs sm:text-sm font-black uppercase tracking-wider mb-2">
              <span>👀 HƯỚNG DẪN DÀNH CHO BÉ</span>
            </div>

            <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight mb-2 text-white drop-shadow-sm">
              BÉ HÃY NHÌN LÊN MÀN HÌNH CỦA CÔ NHÉ!
            </h3>

            <p className="text-xs sm:text-sm md:text-base font-bold text-indigo-100 max-w-md leading-relaxed">
              Bây giờ các bé hãy cùng chú ý nhìn lên màn hình máy chiếu hoặc TV của cô để theo dõi và chờ cô tổng kết điểm số cùng cả lớp nha ⭐
            </p>
          </div>
        </div>

        {/* Score & Completed Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div className="bg-amber-50/90 rounded-2xl p-3.5 sm:p-4 border-2 border-amber-200">
            <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wide block mb-1">
              ⭐ TỔNG ĐIỂM CỦA ĐỘI
            </span>
            <span className="text-3xl sm:text-4xl font-black text-amber-600 font-mono">
              {teamScore}
            </span>
            <span className="text-xs font-bold text-amber-700 block">
              điểm tích lũy
            </span>
          </div>

          <div className="bg-emerald-50/90 rounded-2xl p-3.5 sm:p-4 border-2 border-emerald-200">
            <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wide block mb-1">
              ✅ SỐ CÂU ĐÃ LÀM
            </span>
            <span className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono">
              {totalQuestions}/{totalQuestions}
            </span>
            <span className="text-xs font-bold text-emerald-700 block">
              hoàn thành xuất sắc
            </span>
          </div>
        </div>

        {/* Audio Replay Button */}
        {isSpeechSupported() && (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={handleToggleSpeak}
              className={`px-4 py-2 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-sm ${
                isSpeaking
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isSpeaking ? 'Dừng đọc hướng dẫn' : '🔊 Nghe lại lời cô nhắc'}</span>
            </button>
          </div>
        )}

        {/* Live Status indicator */}
        <div className="flex items-center justify-center gap-2 text-xs font-extrabold text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Đang kết nối trực tuyến với cô giáo · Phòng {session.roomCode}</span>
        </div>
      </div>
    </div>
  );
};
