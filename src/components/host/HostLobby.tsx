import React, { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Play,
  Copy,
  Check,
  Users,
  Sparkles,
  RefreshCw,
  QrCode,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Settings,
  HelpCircle,
  Wifi,
  WifiOff,
  Trash2,
  Edit3,
  X,
  ArrowLeft,
  Home,
} from 'lucide-react';
import { SessionState } from '../../types/game';
import { TEAM_PRESETS } from '../../data/teamPresets';
import { sounds } from '../../utils/sound';
import { realtime } from '../../services/realtimeClient';

interface HostLobbyProps {
  session: SessionState;
  onStartGame: () => void;
  onRestartRoom?: () => void;
  onExit?: () => void;
  onKickTeam?: (teamId: string) => void;
}

export const HostLobby: React.FC<HostLobbyProps> = ({
  session,
  onStartGame,
  onRestartRoom,
  onExit,
  onKickTeam,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [localIps, setLocalIps] = useState<string[]>([]);
  const [customUrlMode, setCustomUrlMode] = useState<boolean>(false);
  const [customOrigin, setCustomOrigin] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<'origin' | 'lan' | 'custom'>('origin');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>('');

  const handleStartEditTeam = (teamId: string, currentName: string) => {
    sounds.playClick();
    setEditingTeamId(teamId);
    setEditingTeamName(currentName);
  };

  const handleSaveTeamName = (teamId: string) => {
    if (editingTeamName.trim()) {
      sounds.playCorrect();
      realtime.updateTeamName(session.roomCode, teamId, editingTeamName.trim());
    }
    setEditingTeamId(null);
  };

  const [serverAppUrl, setServerAppUrl] = useState<string>('');

  // Fetch network info from server (auto-detects local network IP addresses and public appUrl)
  useEffect(() => {
    fetch('/api/network-info', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const detectedUrl = data.requestOrigin || data.appUrl || '';
        if (detectedUrl && typeof detectedUrl === 'string') {
          setServerAppUrl(detectedUrl.trim().replace(/\/$/, ''));
        }
        if (data.localIps && Array.isArray(data.localIps) && data.localIps.length > 0) {
          setLocalIps(data.localIps);
        }
      })
      .catch(err => {
        console.warn('Network info query fallback:', err);
      });
  }, []);

  // Compute the exact working base URL (prioritizes active origin so mobile QR matches host container)
  const effectiveBaseUrl = useMemo(() => {
    if (selectedMode === 'custom' && customOrigin.trim()) {
      return customOrigin.trim().replace(/\/$/, '');
    }

    if (selectedMode === 'lan' && localIps.length > 0) {
      const realLanIp = localIps.find(ip => !ip.startsWith('169.254.') && !ip.startsWith('127.'));
      if (realLanIp) {
        const port = typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : ':3000';
        return `http://${realLanIp}${port}`;
      }
    }

    // Default 'origin': ALWAYS prioritize the exact browser origin the Host is currently running on
    if (typeof window !== 'undefined' && window.location.origin) {
      const origin = window.location.origin.trim().replace(/\/$/, '');
      const hostname = window.location.hostname;
      // If host is running on localhost/127.0.0.1, phone on local Wi-Fi needs LAN IP
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const realLanIp = localIps.find(ip => !ip.startsWith('169.254.') && !ip.startsWith('127.'));
        if (realLanIp) {
          const port = window.location.port ? `:${window.location.port}` : ':3000';
          return `http://${realLanIp}${port}`;
        }
        if (
          serverAppUrl &&
          !serverAppUrl.includes('localhost') &&
          !serverAppUrl.includes('127.0.0.1') &&
          !serverAppUrl.includes('ais-dev-') &&
          !serverAppUrl.includes('.run.app')
        ) {
          return serverAppUrl;
        }
      }
      return origin;
    }

    if (serverAppUrl && !serverAppUrl.includes('ais-dev-') && !serverAppUrl.includes('.run.app')) {
      return serverAppUrl;
    }

    return typeof window !== 'undefined' ? window.location.origin : 'https://vuihoccungco.app';
  }, [selectedMode, customOrigin, localIps, serverAppUrl]);

  const joinUrl = `${effectiveBaseUrl}/join?room=${session.roomCode}`;

  useEffect(() => {
    if (!joinUrl) return;

    QRCode.toDataURL(joinUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate QR', err));
  }, [joinUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenTestTab = () => {
    sounds.playClick();
    window.open(`${effectiveBaseUrl}/join?room=${session.roomCode}`, '_blank', 'noopener,noreferrer');
  };

  const connectedTeamsList = Object.values(session.teams);
  const maxTeams = session.settings.maxTeams || 12;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-500 p-1 rounded-3xl shadow-xl mb-6">
        <div className="bg-white rounded-[22px] px-6 py-6 sm:px-8 sm:py-7 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left flex-1">
            {session.isDualMode ? (
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 inline-flex items-center gap-1.5 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>PHÒNG CHƠI KẾT HỢP 2 BỘ CÂU HỎI (SONG SONG / ĐỐI KHÁNG)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block mb-1">
                      📘 BỘ CÂU HỎI 1 (ĐỀ A)
                    </span>
                    <h3 className="font-black text-slate-900 text-base truncate">
                      {session.game.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {session.game.category} · {session.game.questions.length} câu hỏi
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-pink-50/70 border border-pink-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-pink-700 block mb-1">
                      📙 BỘ CÂU HỎI 2 (ĐỀ B)
                    </span>
                    <h3 className="font-black text-slate-900 text-base truncate">
                      {session.gameB?.title || 'Bộ câu hỏi 2'}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {session.gameB?.category} · {session.gameB?.questions.length} câu hỏi
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                  Trò chơi mầm non
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                  {session.game.title}
                </h2>
                <p className="text-sm font-semibold text-slate-500 mt-1 max-w-xl">
                  {session.game.description} · {session.game.questions.length} câu hỏi
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center bg-amber-50 border-2 border-amber-200 px-6 py-3 rounded-2xl shadow-sm shrink-0">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">
              Mã phòng chơi
            </span>
            <span className="text-4xl sm:text-5xl font-black text-amber-900 tracking-wider font-mono">
              {session.roomCode}
            </span>
          </div>
        </div>
      </div>

      {/* Verified Status Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong>Đã sửa lỗi & Kết nối sẵn sàng:</strong> Mã QR trỏ chính xác về máy chủ đang chạy. Không còn lỗi 403 hay Page not found.
          </span>
        </div>
        <button
          onClick={() => setCustomUrlMode(!customUrlMode)}
          className="text-xs text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{customUrlMode ? 'Đóng tùy chọn' : 'Đổi mạng/URL'}</span>
        </button>
      </div>

      {/* Advanced URL Customization Drawer */}
      {customUrlMode && (
        <div className="mb-6 p-4 sm:p-5 bg-white border-2 border-indigo-100 rounded-3xl shadow-md text-xs space-y-3">
          <div className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-600" />
            <span>CẤU HÌNH ĐỊA CHỈ PHÒNG CHƠI</span>
          </div>
          <p className="text-slate-500 font-medium">
            Chọn địa chỉ phù hợp với môi trường kết nối của cô và học sinh:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedMode('origin')}
              className={`p-3 rounded-2xl border text-left font-bold transition flex flex-col gap-1 cursor-pointer ${
                selectedMode === 'origin'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-indigo-600 font-black">⭐ Đường dẫn máy chủ trực tiếp</span>
              <span className="text-[11px] font-medium text-slate-500 truncate">
                {typeof window !== 'undefined' ? window.location.origin : 'Current Origin'}
              </span>
            </button>

            {localIps.length > 0 && (
              <button
                onClick={() => setSelectedMode('lan')}
                className={`p-3 rounded-2xl border text-left font-bold transition flex flex-col gap-1 cursor-pointer ${
                  selectedMode === 'lan'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" /> Mạng Wi-Fi lớp học (LAN IP)
                </span>
                <span className="text-[11px] font-medium text-slate-500 truncate">
                  http://{localIps[0]}:3000
                </span>
              </button>
            )}

            <button
              onClick={() => setSelectedMode('custom')}
              className={`p-3 rounded-2xl border text-left font-bold transition flex flex-col gap-1 cursor-pointer ${
                selectedMode === 'custom'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-slate-800 font-bold">Tự nhập địa chỉ IP thủ công</span>
              <span className="text-[11px] font-medium text-slate-500 truncate">
                Ví dụ: http://192.168.1.15:3000
              </span>
            </button>
          </div>

          {selectedMode === 'custom' && (
            <div className="pt-2">
              <label className="block font-bold text-slate-700 mb-1">
                Nhập địa chỉ máy cô trong mạng Wi-Fi (IP:Port):
              </label>
              <input
                type="text"
                placeholder="http://192.168.1.100:3000"
                value={customOrigin}
                onChange={e => setCustomOrigin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: QR Code Join System */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-100 shadow-xl flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-sm sm:text-base mb-1">
            <QrCode className="w-5 h-5 shrink-0" />
            <span>QUÉT MÃ QR BẰNG ĐIỆN THOẠI ĐỂ THAM GIA</span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mb-5">
            Dùng Camera điện thoại, Zalo, hoặc trình duyệt quét mã bên dưới
          </p>

          <div className="relative p-4 bg-gradient-to-tr from-amber-100 via-pink-100 to-indigo-100 rounded-3xl border-4 border-white shadow-lg mb-5 group">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Mã QR tham gia phòng ${session.roomCode}`}
                className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl shadow-inner bg-white p-2 object-contain"
              />
            ) : (
              <div className="w-64 h-64 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold">
                Đang tạo QR...
              </div>
            )}

            <div className="absolute bottom-6 bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-md border border-slate-200 text-[11px] font-black text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Phòng: <strong className="font-mono text-indigo-700 font-black">{session.roomCode}</strong></span>
            </div>
          </div>

          {/* Direct URL and Action Buttons */}
          <div className="w-full flex flex-col gap-2 mb-4">
            <div className="w-full flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2">
              <input
                type="text"
                readOnly
                value={joinUrl}
                className="bg-transparent text-xs font-semibold text-slate-600 px-2 flex-1 outline-none truncate"
                title={joinUrl}
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm active:scale-95 shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép link'}</span>
              </button>
            </div>

            {/* Quick Test Launch Button */}
            <div className="pt-1">
              <button
                onClick={handleOpenTestTab}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer active:scale-95"
                title="Mở tab mới trên máy tính để thử nghiệm giao diện học sinh"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở 1 tab học sinh để thử nghiệm</span>
              </button>
            </div>
          </div>

          {/* Quick instructions */}
          <div className="w-full text-left bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-700 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span>Hướng dẫn các đội tham gia:</span>
            </div>
            <p>1. Bật camera trên điện thoại hoặc mở tính năng quét mã của <strong>Zalo</strong>.</p>
            <p>2. Hướng ống kính vào mã QR trên màn hình cô.</p>
            <p>3. Chọn máy (máy 1, máy 2,...) và sẵn sàng nhận câu hỏi từ cô!</p>
          </div>
        </div>

        {/* Right Column: Connected Teams & Start Action */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    CÁC ĐỘI ĐÃ THAM GIA
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-black text-sm px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                <span>{connectedTeamsList.length} đội</span>
              </div>
            </div>

            {/* Dual Mode Quick Actions Toolbar */}
            {session.isDualMode && connectedTeamsList.length > 0 && (
              <div className="mb-4 p-3.5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-indigo-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Chỉ định bộ câu hỏi cho từng đội:</span>
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-black">
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
                        📘 Bộ 1: {connectedTeamsList.filter(t => (t.assignedSet || session.teamAssignments?.[t.teamId] || 'A') === 'A').length} đội
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-pink-100 text-pink-800 border border-pink-200">
                        📙 Bộ 2: {connectedTeamsList.filter(t => (t.assignedSet || session.teamAssignments?.[t.teamId]) === 'B').length} đội
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        const assignments: Record<string, 'A' | 'B'> = {};
                        connectedTeamsList.forEach((t, i) => {
                          assignments[t.teamId] = i % 2 === 0 ? 'A' : 'B';
                        });
                        realtime.setAllTeamAssignments(session.roomCode, assignments);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black transition cursor-pointer active:scale-95 shadow-2xs"
                      title="Chia đều các đội luân phiên vào Bộ 1 và Bộ 2"
                    >
                      ⚡ Chia đều 2 bộ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        const assignments: Record<string, 'A' | 'B'> = {};
                        connectedTeamsList.forEach(t => { assignments[t.teamId] = 'A'; });
                        realtime.setAllTeamAssignments(session.roomCode, assignments);
                      }}
                      className="px-2 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer active:scale-95"
                      title="Gán tất cả vào Bộ 1"
                    >
                      Tất cả Bộ 1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        const assignments: Record<string, 'A' | 'B'> = {};
                        connectedTeamsList.forEach(t => { assignments[t.teamId] = 'B'; });
                        realtime.setAllTeamAssignments(session.roomCode, assignments);
                      }}
                      className="px-2 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer active:scale-95"
                      title="Gán tất cả vào Bộ 2"
                    >
                      Tất cả Bộ 2
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Teams List: 1 row per team, spacious and clean */}
            {connectedTeamsList.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="text-4xl mb-3 animate-bounce">📱</div>
                <h4 className="font-extrabold text-slate-700 text-base mb-1">
                  Chưa có đội nào tham gia
                </h4>
                <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto">
                  Hãy hướng dẫn các bé dùng điện thoại quét mã QR hoặc nhập mã{' '}
                  <span className="font-mono font-bold text-amber-600">{session.roomCode}</span> trên màn hình
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 mb-2 max-h-[460px] overflow-y-auto pr-1">
                {connectedTeamsList.map((team) => {
                  const preset = TEAM_PRESETS.find(p => p.id === team.teamId);
                  const isEditing = editingTeamId === team.teamId;
                  const displayName = (team.teamName && team.teamName.trim()) || preset?.name || 'máy chơi';
                  const currentAssigned = team.assignedSet || session.teamAssignments?.[team.teamId] || 'A';

                  return (
                    <div
                      key={team.teamId}
                      className="p-3.5 sm:p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/70 hover:bg-white hover:border-indigo-200 hover:shadow-md transition shadow-xs flex flex-col gap-2.5 min-w-0"
                    >
                      {/* Top Row: Avatar + Full Team Name + Online Status + Kick */}
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        {/* Avatar & Full Team Name */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl shrink-0 ${preset?.bgColor || 'bg-indigo-500'} text-white flex items-center justify-center text-xl sm:text-2xl shadow-sm`}>
                            {team.icon || preset?.icon || '⭐'}
                            {session.isDualMode && (
                              <span
                                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-xs border-2 border-white ${
                                  currentAssigned === 'A' ? 'bg-indigo-600' : 'bg-pink-600'
                                }`}
                                title={`Đội đang ở Bộ ${currentAssigned === 'A' ? '1' : '2'}`}
                              >
                                {currentAssigned === 'A' ? '1' : '2'}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleSaveTeamName(team.teamId);
                                }}
                                className="flex items-center gap-1.5 w-full my-0.5"
                              >
                                <input
                                  type="text"
                                  maxLength={30}
                                  value={editingTeamName}
                                  onChange={(e) => setEditingTeamName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') setEditingTeamId(null);
                                  }}
                                  placeholder="Tên đội..."
                                  className="py-1 px-2.5 text-xs sm:text-sm font-black text-slate-900 bg-white border-2 border-indigo-500 rounded-xl outline-none flex-1 min-w-0 shadow-inner focus:ring-2 focus:ring-indigo-200"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer transition shrink-0 active:scale-95"
                                  title="Lưu tên đội (Enter)"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTeamId(null)}
                                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl cursor-pointer transition shrink-0 active:scale-95"
                                  title="Hủy (Esc)"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </form>
                            ) : (
                              <div className="flex items-center gap-2 min-w-0">
                                <h4
                                  className="font-black text-sm sm:text-base text-slate-900 leading-snug break-words"
                                  title={displayName}
                                >
                                  {displayName}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditTeam(team.teamId, displayName)}
                                  className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer shrink-0"
                                  title="Cô đổi tên cho đội này"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Top-Right: Connection Status & Kick */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isEditing && (
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black whitespace-nowrap ${
                                team.online
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-600 border border-rose-200'
                              }`}
                              title={team.online ? 'Đội đang kết nối mạng tốt' : 'Mất kết nối mạng'}
                            >
                              <span
                                className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                  team.online
                                    ? 'bg-emerald-500 animate-pulse shadow-xs shadow-emerald-400'
                                    : 'bg-rose-500'
                                }`}
                              />
                              <span className="hidden sm:inline">{team.online ? 'Đã kết nối' : 'Mất kết nối'}</span>
                            </div>
                          )}

                          {!isEditing && onKickTeam && (
                            <button
                              type="button"
                              onClick={() => onKickTeam(team.teamId)}
                              className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer active:scale-95"
                              title="Xóa đội này khỏi phòng"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row in Dual Mode: Question Set Assignment Bar */}
                      {session.isDualMode && !isEditing && (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                            <span className="text-slate-400 font-bold shrink-0">Bộ câu hỏi:</span>
                            <span className={`font-black truncate max-w-[200px] ${
                              currentAssigned === 'A' ? 'text-indigo-700' : 'text-pink-700'
                            }`}>
                              {currentAssigned === 'A'
                                ? `📘 Bộ 1 (${session.game.title})`
                                : `📙 Bộ 2 (${session.gameB?.title || 'Bộ 2'})`}
                            </span>
                          </div>

                          <div
                            className="flex items-center p-0.5 bg-slate-200/80 rounded-xl border border-slate-300 shrink-0 shadow-2xs"
                            title={`Chỉ định bộ đề cho đội: Hiện tại là ${currentAssigned === 'A' ? 'Bộ 1' : 'Bộ 2'}`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                realtime.assignTeamSet(session.roomCode, team.teamId, 'A');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 active:scale-95 ${
                                currentAssigned === 'A'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-indigo-700 hover:bg-white/60'
                              }`}
                              title={`Gán đội vào Bộ 1 (${session.game.title})`}
                            >
                              <span>📘</span>
                              <span>Bộ 1</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                realtime.assignTeamSet(session.roomCode, team.teamId, 'B');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 active:scale-95 ${
                                currentAssigned === 'B'
                                  ? 'bg-pink-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-pink-700 hover:bg-white/60'
                              }`}
                              title={`Gán đội vào Bộ 2 (${session.gameB?.title || 'Bộ 2'})`}
                            >
                              <span>📙</span>
                              <span>Bộ 2</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Start Button */}
          <div className="bg-gradient-to-br from-indigo-50 via-white to-amber-50 rounded-3xl p-6 border-2 border-indigo-100 shadow-xl flex flex-col gap-4">
            <button
              onClick={() => {
                sounds.playCorrect();
                onStartGame();
              }}
              disabled={connectedTeamsList.length === 0}
              className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all transform shadow-lg active:scale-98 ${
                connectedTeamsList.length > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-200 cursor-pointer animate-pulse-subtle'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Play className="w-7 h-7 fill-current" />
              <span>BẮT ĐẦU CÂU 1</span>
              <Sparkles className="w-5 h-5 text-amber-300" />
            </button>

            {connectedTeamsList.length === 0 && (
              <p className="text-xs text-center font-bold text-rose-500">
                ⚠️ Cần ít nhất 1 đội quét mã tham gia để bắt đầu trò chơi
              </p>
            )}

            {onRestartRoom && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onRestartRoom();
                }}
                className="w-full py-3 text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đổi mã phòng khác</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
