import React, { useState } from 'react';
import { History, Trophy, Calendar, Users, HelpCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { getGameHistory, GameHistoryRecord } from '../services/gameStorage';
import { sounds } from '../utils/sound';

interface HistoryPageProps {
  onBack: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onBack }) => {
  const [history, setHistory] = useState<GameHistoryRecord[]>(() => getGameHistory());

  const handleClearHistory = () => {
    sounds.playClick();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vuihoc_game_history');
      setHistory([]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => {
            sounds.playClick();
            onBack();
          }}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-extrabold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-xs font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa lịch sử</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-xl mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
          <span>LỊCH SỬ CÁC PHIÊN CHƠI</span>
          <span className="text-2xl">📜</span>
        </h2>
        <p className="text-xs sm:text-sm font-bold text-slate-500 mb-6">
          Xem lại thành tích và các đội đã chiến thắng trong các buổi học trước
        </p>

        {history.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="font-extrabold text-slate-700 text-base mb-1">
              Chưa có phiên chơi nào hoàn thành
            </h4>
            <p className="text-xs font-semibold text-slate-400">
              Khi cô tổ chức xong một buổi chơi, kết quả sẽ tự động được lưu lại tại đây!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-4 sm:p-5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 hover:bg-white hover:border-indigo-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                      Phòng {record.roomCode}
                    </span>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(record.date).toLocaleDateString('vi-VN')} {new Date(record.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="font-black text-lg text-slate-900">
                    {record.gameTitle}
                  </h4>

                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      {record.teamsCount} đội chơi
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                      {record.questionsCount} câu hỏi
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl shrink-0">
                  <Trophy className="w-6 h-6 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                      ĐỘI VÔ ĐỊCH
                    </span>
                    <span className="font-black text-sm text-slate-900 block">
                      {record.winnerTeamName}
                    </span>
                    <span className="text-xs font-black text-amber-700">
                      {record.winnerScore} điểm
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
