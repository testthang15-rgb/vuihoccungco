import React, { useEffect, useState, useCallback } from 'react';
import { Game, SessionState } from '../types/game';
import { realtime } from '../services/realtimeClient';
import { HostLobby } from '../components/host/HostLobby';
import { HostQuestionActive } from '../components/host/HostQuestionActive';
import { HostQuestionResults } from '../components/host/HostQuestionResults';
import { HostLeaderboard } from '../components/host/HostLeaderboard';
import { HostFinalReport } from '../components/host/HostFinalReport';
import { Modal } from '../components/common/Modal';
import { sounds } from '../utils/sound';
import { Wifi, WifiOff, AlertCircle, RefreshCw, Home, Users } from 'lucide-react';

interface HostPageProps {
  initialGame?: Game | null;
  initialGameB?: Game | null;
  isDualMode?: boolean;
  existingRoomCode?: string | null;
  isNewSession?: boolean;
  onExit: () => void;
}

export const HostPage: React.FC<HostPageProps> = ({
  initialGame,
  initialGameB,
  isDualMode,
  existingRoomCode,
  isNewSession = false,
  onExit,
}) => {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isConnected, setIsConnected] = useState(realtime.getIsConnected());
  const [disconnectedTeamsModal, setDisconnectedTeamsModal] = useState<{
    isOpen: boolean;
    disconnectedTeams: string[];
    actionType: 'start' | 'next';
  }>({
    isOpen: false,
    disconnectedTeams: [],
    actionType: 'start',
  });

  // Determine room code to restore on page refresh (Point 10)
  const [targetRoomCode] = useState<string | null>(() => {
    // If user explicitly initiated creating a new room, NEVER grab an old room code!
    if (isNewSession) return null;
    if (existingRoomCode) return existingRoomCode.trim().toUpperCase();
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRoom = urlParams.get('room');
      if (urlRoom && urlRoom.trim()) return urlRoom.trim().toUpperCase();
      // Only restore from localStorage if there is no explicit initialGame chosen
      if (!initialGame) {
        const savedRoom = localStorage.getItem('vuihoc_host_room');
        if (savedRoom && savedRoom.trim()) return savedRoom.trim().toUpperCase();
      }
    }
    return null;
  });

  useEffect(() => {
    // Listen to connection changes (Point 12)
    const unsubConn = realtime.on('connection_change', (data: any) => {
      setIsConnected(data.status === 'connected');
    });

    // Listen to session creation
    const unsubCreated = realtime.on('session_created', (data: any) => {
      setSession(data.session);
      setLoading(false);
      setError(null);
      if (typeof window !== 'undefined') {
        localStorage.setItem('vuihoc_host_room', data.session.roomCode);
        window.history.replaceState({}, '', `/host?room=${data.session.roomCode}`);
      }
    });

    // Listen to full authoritative updates
    const unsubUpdated = realtime.on('session_updated', (data: any) => {
      setSession(data.session);
      setLoading(false);
      setError(null);
      if (typeof window !== 'undefined' && data.session?.roomCode) {
        localStorage.setItem('vuihoc_host_room', data.session.roomCode);
        window.history.replaceState({}, '', `/host?room=${data.session.roomCode}`);
      }
    });

    // Listen to teams joining in realtime
    const unsubTeamJoined = realtime.on('team_joined', (data: any) => {
      sounds.playCorrect();
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          teams: data.teams || { ...prev.teams, [data.team.teamId]: data.team },
        };
      });
    });

    // Listen to team presence changes (online / offline) in realtime
    const unsubPresence = realtime.on('team_presence_changed', (data: any) => {
      setSession(prev => {
        if (!prev || !prev.teams[data.teamId]) return prev;
        return {
          ...prev,
          teams: {
            ...prev.teams,
            [data.teamId]: {
              ...prev.teams[data.teamId],
              online: Boolean(data.online),
            },
          },
        };
      });
    });

    // Point 4 & 5: Listen to answer status changes in realtime without revealing answer texts
    const unsubAnswerStatus = realtime.on('answer_status_updated', (data: any) => {
      sounds.playClick();
      setSession(prev => {
        if (!prev) return prev;
        const qIndex = data.questionIndex;
        const clonedAnswers = { ...prev.answers };
        const qAns = clonedAnswers[qIndex] ? { ...clonedAnswers[qIndex] } : {};

        // Merge answered status
        if (data.answeredTeams) {
          for (const [tId, val] of Object.entries(data.answeredTeams as Record<string, any>)) {
            if (!qAns[tId]) {
              qAns[tId] = {
                sessionId: prev.sessionId,
                questionIndex: qIndex,
                questionId: prev.game.questions[qIndex]?.id || '',
                teamId: tId,
                teamName: prev.teams[tId]?.teamName || tId,
                answerId: '',
                answerText: '',
                submittedAt: val.submittedAt || Date.now(),
                responseTimeMs: 0,
                isCorrect: false,
                pointsAwarded: 0,
              };
            }
          }
        }
        clonedAnswers[qIndex] = qAns;

        return {
          ...prev,
          answers: clonedAnswers,
        };
      });
    });

    // Listen to game ended
    const unsubGameEnded = realtime.on('game_ended', (data: any) => {
      setSession(data.session);
    });

    // Listen to real-time draft status updates for open-ended questions
    const unsubDraft = realtime.on('draft_updated', (data: any) => {
      if (!data) return;
      const { questionIndex: qIdx, teamId: tId } = data;
      if (tId === undefined || qIdx === undefined) return;
      const draftObj = data.draft || {
        textAnswer: data.textAnswer,
        drawingDataUrl: data.drawingDataUrl,
        hasDrawn: Boolean(data.hasDrawn || (data.drawingDataUrl && data.drawingDataUrl.length > 50)),
        updatedAt: Date.now(),
      };
      setSession(prev => {
        if (!prev) return prev;
        const currentDrafts = prev.drafts ? { ...prev.drafts } : {};
        const qDrafts = currentDrafts[qIdx] ? { ...currentDrafts[qIdx] } : {};
        qDrafts[tId] = draftObj;
        currentDrafts[qIdx] = qDrafts;
        return {
          ...prev,
          drafts: currentDrafts,
        };
      });
    });

    // Listen to error events
    const unsubError = realtime.on('error', (data: any) => {
      // If host tried to register to an expired or non-existent room, auto-recreate session
      if (data.message && data.message.includes('không tồn tại') && initialGame) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vuihoc_host_room');
          window.history.replaceState({}, '', '/host');
        }
        if (isDualMode && initialGameB) {
          realtime.createDualSession(initialGame, initialGameB);
        } else {
          realtime.createSession(initialGame);
        }
        return;
      }
      setError(data.message || 'Lỗi phiên chơi');
      setLoading(false);
    });

    // Point 10: Re-attach on refresh, or create session
    if (targetRoomCode) {
      realtime.registerHost(targetRoomCode);
    } else if (isDualMode && initialGame && initialGameB) {
      realtime.createDualSession(initialGame, initialGameB);
    } else if (initialGame) {
      realtime.createSession(initialGame);
    } else {
      setError('Không có trò chơi nào được chọn để tạo phòng.');
      setLoading(false);
    }

    return () => {
      unsubConn();
      unsubCreated();
      unsubUpdated();
      unsubTeamJoined();
      unsubPresence();
      unsubAnswerStatus();
      unsubDraft();
      unsubGameEnded();
      unsubError();
    };
  }, [targetRoomCode, initialGame, initialGameB, isDualMode, isNewSession]);

  // Host Action Handlers
  const handleKickTeam = useCallback((teamId: string) => {
    if (session) {
      sounds.playClick();
      realtime.kickTeam(session.roomCode, teamId);
    }
  }, [session?.roomCode]);

  const proceedStartQuestion0 = useCallback(() => {
    if (!session) return;
    realtime.startQuestion(session.roomCode, 0);
  }, [session?.roomCode]);

  const proceedNextQuestion = useCallback(() => {
    if (!session) return;
    realtime.nextQuestion(session.roomCode);
  }, [session?.roomCode]);

  const handleStartGame = useCallback(() => {
    if (!session) return;
    const teams = Object.values(session.teams || {});
    const offlineTeams = teams.filter(t => t.online === false);

    if (offlineTeams.length > 0) {
      sounds.playWrong();
      setDisconnectedTeamsModal({
        isOpen: true,
        disconnectedTeams: offlineTeams.map(t => `${t.icon || '📱'} ${t.teamName}`),
        actionType: 'start',
      });
      return;
    }

    proceedStartQuestion0();
  }, [session, proceedStartQuestion0]);

  const handleEndQuestion = useCallback(() => {
    if (!session) return;
    realtime.endQuestion(session.roomCode);
  }, [session?.roomCode]);

  const handleNextQuestion = useCallback(() => {
    if (!session) return;
    const teams = Object.values(session.teams || {});
    const offlineTeams = teams.filter(t => t.online === false);

    if (offlineTeams.length > 0) {
      sounds.playWrong();
      setDisconnectedTeamsModal({
        isOpen: true,
        disconnectedTeams: offlineTeams.map(t => `${t.icon || '📱'} ${t.teamName}`),
        actionType: 'next',
      });
      return;
    }

    proceedNextQuestion();
  }, [session, proceedNextQuestion]);

  const handleShowLeaderboard = useCallback(() => {
    if (!session) return;
    realtime.showLeaderboard(session.roomCode);
  }, [session?.roomCode]);

  const handleContinueFromLeaderboard = useCallback(() => {
    if (!session) return;
    realtime.endQuestion(session.roomCode);
  }, [session?.roomCode]);

  const handleReplayGame = useCallback(() => {
    if (!session) return;
    realtime.restartGame(session.roomCode);
  }, [session?.roomCode]);

  const handleCleanExit = () => {
    if (session) {
      realtime.terminateSession(session.roomCode);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vuihoc_host_room');
      window.history.replaceState({}, '', '/');
    }
    onExit();
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center text-3xl animate-bounce mb-4">
          🎈
        </div>
        <h3 className="font-black text-xl text-slate-800">
          Đang kết nối phòng chơi của cô...
        </h3>
        <p className="text-xs font-semibold text-slate-400 mt-1">
          Hệ thống đang đồng bộ danh sách các đội và trạng thái câu hỏi
        </p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border-2 border-rose-200 text-center shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 text-2xl">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="font-black text-xl text-slate-900 mb-2">
          Không tìm thấy phòng chơi
        </h3>
        <p className="text-sm font-semibold text-slate-600 mb-6">
          {error || 'Phiên chơi có thể đã kết thúc hoặc không còn tồn tại trên máy chủ.'}
        </p>
        <div className="flex flex-col gap-2.5">
          {initialGame && (
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('vuihoc_host_room');
                  window.history.replaceState({}, '', '/host');
                }
                if (isDualMode && initialGameB) {
                  realtime.createDualSession(initialGame, initialGameB);
                } else {
                  realtime.createSession(initialGame);
                }
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold text-sm shadow-md transition cursor-pointer"
            >
              Tạo phòng chơi mới ngay
            </button>
          )}
          <button
            onClick={handleCleanExit}
            className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 transition cursor-pointer"
          >
            Quay về Trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Unified Compact Host Header */}
      {session.status !== 'ended' && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            {/* Left: Single clean Exit button & Room code badge */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowExitConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-extrabold text-xs sm:text-sm border border-slate-200 hover:border-rose-300 shadow-2xs transition active:scale-95 cursor-pointer"
                title="Thoát phiên học và quay lại trang chủ"
              >
                <Home className="w-4 h-4 text-rose-500" />
                <span>Thoát phiên</span>
              </button>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-950">
                <span className="text-indigo-600 text-[11px] font-black uppercase">Phòng</span>
                <span className="font-mono font-black text-indigo-700 tracking-wider text-sm">{session.roomCode}</span>
              </div>
            </div>

            {/* Center: Game Title & Current Phase */}
            <div className="hidden md:flex items-center gap-2 truncate max-w-md text-xs font-semibold text-slate-600">
              <span className="font-black text-slate-900 truncate">{session.game.title}</span>
              <span className="text-slate-300">•</span>
              <span className="px-2 py-0.5 rounded-lg font-extrabold text-xs text-indigo-700 bg-indigo-50/70 border border-indigo-100">
                {session.status === 'lobby'
                  ? 'Phòng chờ'
                  : session.questionStatus === 'active'
                  ? `Câu ${session.currentQuestionIndex + 1} / ${session.game.questions.length}`
                  : session.questionStatus === 'results'
                  ? `Kết quả Câu ${session.currentQuestionIndex + 1}`
                  : 'Bảng xếp hạng'}
              </span>
            </div>

            {/* Right: Realtime status & connected teams count */}
            <div className="flex items-center gap-2 shrink-0">
              {isConnected ? (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="hidden sm:inline">Trực tuyến</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl text-xs font-bold animate-pulse">
                  <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Mất kết nối</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-xs font-extrabold text-slate-700">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{Object.keys(session.teams).length} đội</span>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Render screens based on authoritative session status */}
      {session.status === 'lobby' && (
        <HostLobby
          session={session}
          onStartGame={handleStartGame}
          onKickTeam={handleKickTeam}
          onExit={() => setShowExitConfirm(true)}
        />
      )}

      {session.status === 'playing' && session.questionStatus === 'active' && (
        <HostQuestionActive
          session={session}
          onEndQuestion={handleEndQuestion}
          onExit={() => setShowExitConfirm(true)}
        />
      )}

      {session.status === 'playing' && session.questionStatus === 'results' && (
        <HostQuestionResults
          session={session}
          onNextQuestion={handleNextQuestion}
          onShowLeaderboard={handleShowLeaderboard}
          onExit={() => setShowExitConfirm(true)}
        />
      )}

      {session.status === 'playing' && session.questionStatus === 'leaderboard' && (
        <HostLeaderboard
          session={session}
          onContinue={handleContinueFromLeaderboard}
          onExit={() => setShowExitConfirm(true)}
        />
      )}

      {session.status === 'ended' && (
        <HostFinalReport
          session={session}
          onReplay={handleReplayGame}
          onHome={handleCleanExit}
        />
      )}

      {/* Confirmation Dialog before exiting */}
      <Modal
        isOpen={showExitConfirm}
        title="Kết thúc phiên học?"
        message="Cô có chắc chắn muốn kết thúc phiên học này không? Nếu kết thúc, tất cả các thiết bị học sinh sẽ dừng phiên chơi và kết quả buổi học sẽ được lưu lại."
        confirmText="Kết thúc phiên học"
        cancelText="Tiếp tục giảng dạy"
        confirmVariant="danger"
        onConfirm={handleCleanExit}
        onCancel={() => setShowExitConfirm(false)}
      />

      {/* Disconnected Teams Warning Modal */}
      <Modal
        isOpen={disconnectedTeamsModal.isOpen}
        title="⚠️ Cảnh báo: Có đội bị mất kết nối!"
        message={`Hiện tại đang có ${disconnectedTeamsModal.disconnectedTeams.length} đội bị mất kết nối internet/thiết bị: ${disconnectedTeamsModal.disconnectedTeams.join(', ')}.\n\nNếu cô bắt đầu ngay lúc này, các đội này có thể sẽ không nhận được câu hỏi hoặc bị mất lượt làm bài. Cô có muốn tiếp tục bắt đầu không hay chờ các bé kết nối lại?`}
        confirmText="Vẫn tiếp tục bắt đầu"
        cancelText="Chờ các đội kết nối lại"
        confirmVariant="warning"
        onConfirm={() => {
          const action = disconnectedTeamsModal.actionType;
          setDisconnectedTeamsModal(prev => ({ ...prev, isOpen: false }));
          if (action === 'start') {
            proceedStartQuestion0();
          } else {
            proceedNextQuestion();
          }
        }}
        onCancel={() => {
          setDisconnectedTeamsModal(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
};
