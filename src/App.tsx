import React, { useState, useEffect, useRef } from 'react';
import { Game } from './types/game';
import { Header } from './components/common/Header';
import { HomePage } from './pages/HomePage';
import { HostPage } from './pages/HostPage';
import { PlayerPage } from './pages/PlayerPage';
import { GameList } from './components/games/GameList';
import { InteractiveGameBuilder } from './components/builder/InteractiveGameBuilder';
import { QuestionGameBuilder } from './components/builder/QuestionGameBuilder';
import { CustomGameBuilder } from './components/builder/CustomGameBuilder';
import { WordDragGameBuilder } from './components/builder/WordDragGameBuilder';
import { CreateGameTypeModal } from './components/games/CreateGameTypeModal';
import { CreateDualRoomModal } from './components/host/CreateDualRoomModal';
import { HistoryPage } from './pages/HistoryPage';
import { DEFAULT_GAMES } from './data/defaultGames';
import { getGameById } from './services/gameStorage';
import { Modal } from './components/common/Modal';
import { realtime } from './services/realtimeClient';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';

export type AppView =
  | 'home'
  | 'games_list'
  | 'builder'
  | 'host'
  | 'player'
  | 'history';

function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [activeGame, setActiveGame] = useState<Game | null>(DEFAULT_GAMES[0]);
  const [activeGameB, setActiveGameB] = useState<Game | null>(null);
  const [isDualMode, setIsDualMode] = useState<boolean>(false);
  const [isDualRoomModalOpen, setIsDualRoomModalOpen] = useState<boolean>(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [playerRoomCode, setPlayerRoomCode] = useState<string>('');
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<'interactive' | 'word_drag' | 'question' | 'custom'>('interactive');
  const [showHostExitConfirm, setShowHostExitConfirm] = useState(false);
  const [showPlayerExitConfirm, setShowPlayerExitConfirm] = useState(false);
  const [isPlayerInSession, setIsPlayerInSession] = useState(false);
  const [isPlayerHeaderVisible, setIsPlayerHeaderVisible] = useState(false);
  const headerHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hostSessionKey, setHostSessionKey] = useState<number>(() => Date.now());
  const [hostRoomCodeFromUrl, setHostRoomCodeFromUrl] = useState<string>('');

  // Swipe down gesture detection for revealing header when player is in session
  useEffect(() => {
    if (currentView !== 'player' || !isPlayerInSession) {
      setIsPlayerHeaderVisible(false);
      return;
    }

    let touchStartY = 0;
    let touchStartX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - touchStartY;
      const diffX = Math.abs(currentX - touchStartX);

      // Swiping down from top area (within top 120px) with downward gesture
      if (touchStartY <= 120 && diffY > 25 && diffY > diffX) {
        setIsPlayerHeaderVisible(true);
        if (headerHideTimeoutRef.current) clearTimeout(headerHideTimeoutRef.current);
        headerHideTimeoutRef.current = setTimeout(() => {
          setIsPlayerHeaderVisible(false);
        }, 5000);
      } else if (diffY < -20 && isPlayerHeaderVisible) {
        // Swiping up hides header
        setIsPlayerHeaderVisible(false);
      }
    };

    // Also support mouse cursor hovering near the top edge on PC/laptop
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 15) {
        setIsPlayerHeaderVisible(true);
        if (headerHideTimeoutRef.current) clearTimeout(headerHideTimeoutRef.current);
        headerHideTimeoutRef.current = setTimeout(() => {
          setIsPlayerHeaderVisible(false);
        }, 5000);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousemove', handleMouseMove);
      if (headerHideTimeoutRef.current) clearTimeout(headerHideTimeoutRef.current);
    };
  }, [currentView, isPlayerInSession, isPlayerHeaderVisible]);

  // Synchronize with URL on load and browser back/forward buttons
  useEffect(() => {
    const handleUrlRoute = () => {
      const pathname = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      let roomParam = (params.get('room') || '').trim().toUpperCase();
      if (!roomParam && pathname.startsWith('/join/')) {
        const parts = pathname.split('/');
        if (parts[2]) {
          roomParam = parts[2].trim().toUpperCase();
        }
      }

      if (pathname.includes('/host')) {
        const hostRoom = (params.get('room') || '').trim().toUpperCase();
        setHostRoomCodeFromUrl(hostRoom);
        setCurrentView('host');
      } else if (pathname.includes('/join') || roomParam) {
        setPlayerRoomCode(roomParam);
        setCurrentView('player');
      } else if (pathname.includes('/games/create-quiz') || pathname.includes('/quiz/create')) {
        const gameId = params.get('id');
        if (gameId) {
          const found = getGameById(gameId);
          setEditingGame(found || null);
        } else {
          setEditingGame(null);
        }
        setBuilderMode('question');
        setCurrentView('builder');
      } else if (pathname.includes('/games/custom')) {
        const gameId = params.get('id');
        if (gameId) {
          const found = getGameById(gameId);
          setEditingGame(found || null);
        } else {
          setEditingGame(null);
        }
        setBuilderMode('custom');
        setCurrentView('builder');
      } else if (pathname.includes('/games/builder') || pathname.includes('/games/create')) {
        const gameId = params.get('id');
        if (gameId) {
          const found = getGameById(gameId);
          setEditingGame(found || null);
          if (found && found.gameType === 'custom') {
            setBuilderMode('custom');
          } else if (found && (found.gameType === 'multiple_choice' || !found.questions?.[0]?.canvasConfig)) {
            setBuilderMode('question');
          } else {
            setBuilderMode('interactive');
          }
        } else {
          setEditingGame(null);
          setBuilderMode('interactive');
        }
        setCurrentView('builder');
      } else if (pathname.includes('/games')) {
        setCurrentView('games_list');
      } else if (pathname.includes('/history')) {
        setCurrentView('history');
      } else {
        setCurrentView('home');
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  // Navigation helpers that also update history
  const navigateTo = (view: AppView, url: string = '/') => {
    setCurrentView(view);
    const fullCurrentUrl = window.location.pathname + window.location.search;
    if (fullCurrentUrl !== url) {
      window.history.pushState({}, '', url);
    }
  };

  const handleQuickPlay = (game: Game) => {
    setActiveGame(game);
    setActiveGameB(null);
    setIsDualMode(false);
    setHostRoomCodeFromUrl('');
    setHostSessionKey(Date.now());
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vuihoc_host_room');
    }
    navigateTo('host', '/host');
  };

  const handleStartDualRoom = (gameA: Game, gameB: Game) => {
    setActiveGame(gameA);
    setActiveGameB(gameB);
    setIsDualMode(true);
    setIsDualRoomModalOpen(false);
    setHostRoomCodeFromUrl('');
    setHostSessionKey(Date.now());
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vuihoc_host_room');
    }
    navigateTo('host', '/host');
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    if (game.gameType === 'word_drag_drop' || game.questions?.[0]?.type === 'word_drag_drop') {
      setBuilderMode('word_drag');
    } else if (game.gameType === 'custom') {
      setBuilderMode('custom');
    } else {
      const isQuestionGame =
        game.gameType === 'multiple_choice' ||
        (!game.questions?.[0]?.canvasConfig && game.questions?.[0]?.type !== 'drag_drop');
      setBuilderMode(isQuestionGame ? 'question' : 'interactive');
    }
    navigateTo('builder', `/games/builder?id=${game.id}`);
  };

  const handleCreateNewGame = () => {
    setIsCreateTypeModalOpen(true);
  };

  const handleStartQuestionGameCreation = () => {
    setEditingGame(null);
    setBuilderMode('question');
    navigateTo('builder', '/games/create-quiz');
  };

  const handleStartInteractiveGameCreation = () => {
    setEditingGame(null);
    setBuilderMode('interactive');
    navigateTo('builder', '/games/builder');
  };

  const handleStartWordDragGameCreation = () => {
    setEditingGame(null);
    setBuilderMode('word_drag');
    navigateTo('builder', '/games/create-word-drag');
  };

  const handleStartCustomGameCreation = () => {
    setEditingGame(null);
    setBuilderMode('custom');
    navigateTo('builder', '/games/custom');
  };

  const handleSavedGame = (saved: Game) => {
    setActiveGame(saved);
    navigateTo('games_list', '/games');
  };

  const handleHeaderBackOrHome = () => {
    if (currentView === 'host') {
      setShowHostExitConfirm(true);
    } else if (currentView === 'player' && isPlayerInSession) {
      setShowPlayerExitConfirm(true);
    } else {
      navigateTo('home', '/');
    }
  };

  const handleConfirmExitHost = () => {
    setShowHostExitConfirm(false);
    if (typeof window !== 'undefined') {
      const savedRoom = localStorage.getItem('vuihoc_host_room');
      if (savedRoom) {
        realtime.terminateSession(savedRoom);
        localStorage.removeItem('vuihoc_host_room');
      }
      window.history.replaceState({}, '', '/');
    }
    setHostRoomCodeFromUrl('');
    setIsDualMode(false);
    setActiveGameB(null);
    navigateTo('home', '/');
  };

  const handleConfirmExitPlayer = () => {
    setShowPlayerExitConfirm(false);
    setIsPlayerInSession(false);
    if (typeof window !== 'undefined') {
      const savedRoom = localStorage.getItem('vuihoc_player_room');
      const savedTeamId = localStorage.getItem('vuihoc_player_team_id');
      const savedDevId = localStorage.getItem('vuihoc_device_id') || '';
      if (savedRoom && savedTeamId) {
        realtime.leaveRoom(savedRoom, savedTeamId, savedDevId);
      }
      localStorage.removeItem('vuihoc_player_room');
      localStorage.removeItem('vuihoc_player_team_id');
      window.history.replaceState({}, '', '/');
    }
    navigateTo('home', '/');
  };

  return (
    <div className={`bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-amber-200 ${
      currentView === 'player' && isPlayerInSession ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'
    }`}>
      {/* Slide-down Top Header for Student in Session: Ẩn mặc định, chỉ hiện khi vuốt từ trên xuống */}
      {currentView === 'player' && isPlayerInSession && (
        <>
          {/* Subtle top indicator bar / pull handle when hidden */}
          {!isPlayerHeaderVisible && (
            <div
              onClick={() => {
                setIsPlayerHeaderVisible(true);
                if (headerHideTimeoutRef.current) clearTimeout(headerHideTimeoutRef.current);
                headerHideTimeoutRef.current = setTimeout(() => {
                  setIsPlayerHeaderVisible(false);
                }, 5000);
              }}
              className="fixed top-0 left-1/2 -translate-x-1/2 z-40 pt-0.5 pb-2 px-6 cursor-pointer group flex flex-col items-center select-none"
              title="Vuốt từ trên xuống hoặc chạm vào để mở menu"
            >
              <div className="w-12 h-1 rounded-full bg-slate-300/80 group-hover:bg-indigo-400 group-hover:w-16 transition-all duration-200 shadow-2xs" />
            </div>
          )}

          {/* Slide-down header */}
          <div
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out transform ${
              isPlayerHeaderVisible
                ? 'translate-y-0 opacity-100 shadow-xl'
                : '-translate-y-full opacity-0 pointer-events-none'
            }`}
          >
            <Header
              title="Vui Học Cùng Cô"
              subtitle="Màn hình học sinh (Player)"
              showUserMenu={false}
              onCreateRoom={() => setShowPlayerExitConfirm(true)}
              onCreateDefaultRoom={() => setShowPlayerExitConfirm(true)}
              onCreateDualRoom={() => setShowPlayerExitConfirm(true)}
              onJoinRoom={() => setShowPlayerExitConfirm(true)}
              onHome={handleHeaderBackOrHome}
              rightAction={
                <button
                  type="button"
                  onClick={() => setIsPlayerHeaderVisible(false)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer"
                  title="Thu gọn menu"
                >
                  ▲ Ẩn menu
                </button>
              }
            />
          </div>
        </>
      )}

      {/* Top Header for normal views (home, games_list, host, history, and player before joining) */}
      {currentView !== 'builder' && !(currentView === 'player' && isPlayerInSession) && (
        <Header
          title="Vui Học Cùng Cô"
          showUserMenu={currentView !== 'player'}
          subtitle={
            currentView === 'host'
              ? 'Màn hình máy cô (Host)'
              : currentView === 'player'
              ? 'Màn hình học sinh (Player)'
              : currentView === 'games_list'
              ? 'Kho trò chơi mầm non'
              : currentView === 'history'
              ? 'Lịch sử buổi học'
              : 'Thế giới trò chơi mầm non'
          }
          onCreateRoom={() => {
            if (currentView === 'player' && isPlayerInSession) {
              setShowPlayerExitConfirm(true);
            } else if (currentView === 'host') {
              setShowHostExitConfirm(true);
            } else {
              navigateTo('games_list', '/games');
            }
          }}
          onCreateDefaultRoom={() => {
            if (currentView === 'player' && isPlayerInSession) {
              setShowPlayerExitConfirm(true);
            } else if (currentView === 'host') {
              setShowHostExitConfirm(true);
            } else {
              navigateTo('games_list', '/games');
            }
          }}
          onCreateDualRoom={() => {
            if (currentView === 'player' && isPlayerInSession) {
              setShowPlayerExitConfirm(true);
            } else if (currentView === 'host') {
              setShowHostExitConfirm(true);
            } else {
              setIsDualRoomModalOpen(true);
            }
          }}
          onJoinRoom={() => {
            if (currentView === 'player' && isPlayerInSession) {
              setShowPlayerExitConfirm(true);
            } else {
              navigateTo('player', '/join');
            }
          }}
          onHome={
            currentView !== 'home'
              ? handleHeaderBackOrHome
              : undefined
          }
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0">
        {currentView === 'home' && (
          <HomePage
            onQuickPlay={handleQuickPlay}
            onOpenGamesBank={() => navigateTo('games_list', '/games')}
            onCreateGame={handleCreateNewGame}
            onCreateDualRoom={() => setIsDualRoomModalOpen(true)}
            onJoinRoom={() => navigateTo('player', '/join')}
            onViewHistory={() => navigateTo('history', '/history')}
          />
        )}

        {currentView === 'games_list' && (
          <GameList
            onSelectGameToPlay={handleQuickPlay}
            onEditGame={handleEditGame}
            onCreateNewGame={handleCreateNewGame}
            onCreateDualRoom={() => setIsDualRoomModalOpen(true)}
          />
        )}

        {currentView === 'builder' && builderMode === 'question' && (
          <QuestionGameBuilder
            key={editingGame?.id || 'new_quiz_game'}
            initialGame={editingGame}
            onSaveAndExit={handleSavedGame}
            onCancel={() => navigateTo('games_list', '/games')}
          />
        )}

        {currentView === 'builder' && builderMode === 'word_drag' && (
          <WordDragGameBuilder
            key={editingGame?.id || 'new_word_drag_game'}
            initialGame={editingGame}
            onSaveAndExit={handleSavedGame}
            onCancel={() => navigateTo('games_list', '/games')}
          />
        )}

        {currentView === 'builder' && builderMode === 'interactive' && (
          <InteractiveGameBuilder
            key={editingGame?.id || 'new_interactive_game'}
            initialGame={editingGame}
            onSaveAndExit={handleSavedGame}
            onCancel={() => navigateTo('games_list', '/games')}
          />
        )}

        {currentView === 'builder' && builderMode === 'custom' && (
          <CustomGameBuilder
            key={editingGame?.id || 'new_custom_game'}
            initialGame={editingGame}
            onSaveAndExit={handleSavedGame}
            onCancel={() => navigateTo('games_list', '/games')}
          />
        )}

        {currentView === 'host' && (
          <HostPage
            key={hostSessionKey}
            initialGame={activeGame}
            initialGameB={activeGameB}
            isDualMode={isDualMode}
            existingRoomCode={hostRoomCodeFromUrl || undefined}
            isNewSession={!hostRoomCodeFromUrl}
            onExit={() => {
              setIsDualMode(false);
              setActiveGameB(null);
              setHostRoomCodeFromUrl('');
              navigateTo('home', '/');
            }}
          />
        )}

        {currentView === 'player' && (
          <PlayerPage
            initialRoomCode={playerRoomCode}
            onExit={() => {
              setIsPlayerInSession(false);
              navigateTo('home', '/');
            }}
            onJoinedStateChange={setIsPlayerInSession}
          />
        )}

        {currentView === 'history' && (
          <HistoryPage
            onBack={() => navigateTo('home', '/')}
          />
        )}
      </main>

      {/* Modal to choose game creation type */}
      <CreateGameTypeModal
        isOpen={isCreateTypeModalOpen}
        onClose={() => setIsCreateTypeModalOpen(false)}
        onSelectQuestionGame={handleStartQuestionGameCreation}
        onSelectInteractiveGame={handleStartInteractiveGameCreation}
        onSelectWordDragGame={handleStartWordDragGameCreation}
        onSelectCustomGame={handleStartCustomGameCreation}
      />

      {/* Modal to create dual room with 2 question sets */}
      <CreateDualRoomModal
        isOpen={isDualRoomModalOpen}
        onClose={() => setIsDualRoomModalOpen(false)}
        onConfirmDualRoom={handleStartDualRoom}
      />

      {/* Confirmation Dialog when exiting from host room via Header buttons */}
      <Modal
        isOpen={showHostExitConfirm}
        title="Kết thúc phiên học?"
        message="Cô có chắc chắn muốn kết thúc phiên học này không? Nếu kết thúc, tất cả các thiết bị học sinh sẽ dừng phiên chơi và kết quả buổi học sẽ được lưu lại."
        confirmText="Kết thúc phiên học"
        cancelText="Tiếp tục giảng dạy"
        confirmVariant="danger"
        onConfirm={handleConfirmExitHost}
        onCancel={() => setShowHostExitConfirm(false)}
      />

      {/* Confirmation Dialog when exiting from player room via Header buttons */}
      <Modal
        isOpen={showPlayerExitConfirm}
        title="Kết thúc phiên học?"
        message="Bé có chắc chắn muốn kết thúc phiên học này và quay về trang chủ không? Nếu kết thúc, bé sẽ rời khỏi phòng chơi."
        confirmText="Kết thúc phiên học"
        cancelText="Ở lại chơi tiếp"
        confirmVariant="danger"
        onConfirm={handleConfirmExitPlayer}
        onCancel={() => setShowPlayerExitConfirm(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <AuthModal />
    </AuthProvider>
  );
}
