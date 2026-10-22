import { Game, GameSettings, SessionState } from '../types/game';

type EventCallback = (data: any) => void;

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectTimer: number | null = null;
  private isConnected: boolean = false;
  private currentRoomCode: string | null = null;
  private currentRole: 'host' | 'player' | null = null;
  private currentTeamId: string | null = null;
  private currentDeviceId: string | null = null;
  private pendingQueue: string[] = [];
  private serverTimeOffset: number = 0; // Point 2: server time clock skew correction

  constructor() {
    this.initNetworkListeners();
    this.connect();
  }

  private initNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.connect();
        this.emit('connection_change', { status: 'reconnecting', online: true });
      });

      window.addEventListener('offline', () => {
        this.isConnected = false;
        this.emit('connection_change', { status: 'offline', online: false });
      });
    }
  }

  private getWsUrl(): string {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      const url = this.getWsUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('connection_change', { status: 'connected', online: true });

        // Point 9 & 10: Automatic synchronization upon reconnect
        if (this.currentRoomCode && this.currentRole) {
          this.send({
            type: 'sync_request',
            roomCode: this.currentRoomCode,
            role: this.currentRole,
            teamId: this.currentTeamId,
            deviceId: this.currentDeviceId,
          });
        }

        // Flush pending messages
        while (this.pendingQueue.length > 0) {
          const msg = this.pendingQueue.shift();
          if (msg && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(msg);
          }
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // Synchronize clock offset if server timestamp is present
          if (payload.serverTime) {
            this.serverTimeOffset = payload.serverTime - Date.now();
          }

          if (payload.type === 'session_created' && payload.data?.session?.roomCode) {
            this.currentRoomCode = payload.data.session.roomCode.toUpperCase();
            this.currentRole = 'host';
          }
          if (payload.type === 'session_updated' && payload.data?.session?.roomCode && this.currentRole === 'host') {
            this.currentRoomCode = payload.data.session.roomCode.toUpperCase();
          }

          if (payload.type) {
            this.emit(payload.type, payload.data ?? payload);
          }
        } catch (err) {
          console.error('[RealtimeClient] Parse error', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('connection_change', { status: 'disconnected', online: navigator.onLine });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[RealtimeClient] WS error', err);
        this.isConnected = false;
        this.emit('connection_change', { status: 'error', online: navigator.onLine });
      };
    } catch (err) {
      console.error('[RealtimeClient] Connection error', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 1500);
  }

  public send(payload: object) {
    const raw = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else {
      this.pendingQueue.push(raw);
      this.connect();
    }
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.off(event, callback);
    };
  }

  public off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[RealtimeClient] Listener error on event '${event}'`, err);
        }
      });
    }
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Point 2: Returns the authoritative current timestamp adjusted with server offset
   */
  public getServerNow(): number {
    return Date.now() + this.serverTimeOffset;
  }

  // High-level Actions
  public createSession(game: Game, settings?: GameSettings) {
    this.currentRole = 'host';
    this.send({
      type: 'host:create_session',
      game,
      settings: settings || game.settings,
    });
  }

  public createDualSession(gameA: Game, gameB: Game, settings?: GameSettings) {
    this.currentRole = 'host';
    this.send({
      type: 'host:create_session',
      game: gameA,
      gameB,
      isDualMode: true,
      settings: settings || gameA.settings,
    });
  }

  public assignTeamSet(roomCode: string, teamId: string, set: 'A' | 'B') {
    this.send({
      type: 'host:assign_team_set',
      roomCode: roomCode.toUpperCase(),
      teamId,
      set,
    });
  }

  public setAllTeamAssignments(roomCode: string, assignments: Record<string, 'A' | 'B'>) {
    this.send({
      type: 'host:set_all_team_assignments',
      roomCode: roomCode.toUpperCase(),
      assignments,
    });
  }

  private heartbeatTimer: number | null = null;

  public startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.currentRole === 'player' && this.currentRoomCode && this.currentTeamId && this.isConnected) {
        this.send({
          type: 'player:heartbeat',
          roomCode: this.currentRoomCode,
          teamId: this.currentTeamId,
          deviceId: this.currentDeviceId,
        });
      }
    }, 3500);
  }

  public stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public joinRoom(roomCode: string, teamId: string, deviceId: string, customTeamName?: string) {
    this.currentRoomCode = roomCode.toUpperCase();
    this.currentRole = 'player';
    this.currentTeamId = teamId;
    this.currentDeviceId = deviceId;

    this.send({
      type: 'player:join',
      roomCode: this.currentRoomCode,
      teamId,
      deviceId,
      customTeamName: customTeamName?.trim() || undefined,
    });

    this.startHeartbeat();
  }

  public leaveRoom(roomCode: string, teamId: string, deviceId: string) {
    this.stopHeartbeat();
    this.send({
      type: 'player:leave',
      roomCode: roomCode.toUpperCase(),
      teamId,
      deviceId,
    });
    this.currentRoomCode = null;
    this.currentRole = null;
    this.currentTeamId = null;
  }

  public kickTeam(roomCode: string, teamId: string) {
    this.send({
      type: 'host:kick_team',
      roomCode: roomCode.toUpperCase(),
      teamId,
    });
  }

  public updateTeamName(roomCode: string, teamId: string, customTeamName: string) {
    this.send({
      type: 'player:update_team_name',
      roomCode: roomCode.toUpperCase(),
      teamId,
      customTeamName: customTeamName.trim(),
    });
  }

  public registerHost(roomCode: string) {
    this.currentRoomCode = roomCode.toUpperCase();
    this.currentRole = 'host';
    this.send({
      type: 'host:register',
      roomCode: this.currentRoomCode,
    });
  }

  public updateRoomSettings(roomCode: string, settings: Partial<GameSettings>) {
    this.send({
      type: 'host:update_room_settings',
      roomCode: roomCode.toUpperCase(),
      settings,
    });
  }

  public startQuestion(roomCode: string, questionIndex: number) {
    this.send({
      type: 'host:start_question',
      roomCode: roomCode.toUpperCase(),
      questionIndex,
    });
  }

  public submitAnswer(
    roomCode: string,
    teamId: string,
    questionIndex: number,
    answerId: string,
    answerIds?: string[]
  ) {
    this.send({
      type: 'player:submit_answer',
      roomCode: roomCode.toUpperCase(),
      teamId,
      questionIndex,
      answerId,
      answerIds,
    });
  }

  public saveOpenEndedDraft(
    roomCode: string,
    teamId: string,
    questionIndex: number,
    textAnswer: string,
    drawingDataUrl: string,
    hasDrawn?: boolean
  ) {
    this.send({
      type: 'player:save_open_ended_draft',
      roomCode: roomCode.toUpperCase(),
      teamId,
      questionIndex,
      textAnswer,
      drawingDataUrl,
      hasDrawn,
    });
  }

  public endQuestion(roomCode: string) {
    this.send({
      type: 'host:end_question',
      roomCode: roomCode.toUpperCase(),
    });
  }

  public nextQuestion(roomCode: string) {
    this.send({
      type: 'host:next_question',
      roomCode: roomCode.toUpperCase(),
    });
  }

  public showLeaderboard(roomCode: string) {
    this.send({
      type: 'host:show_leaderboard',
      roomCode: roomCode.toUpperCase(),
    });
  }

  public endGame(roomCode: string) {
    this.send({
      type: 'host:end_game',
      roomCode: roomCode.toUpperCase(),
    });
  }

  public restartGame(roomCode: string) {
    this.send({
      type: 'host:restart_game',
      roomCode: roomCode.toUpperCase(),
    });
  }

  public terminateSession(roomCode: string) {
    this.send({
      type: 'host:terminate_session',
      roomCode: roomCode.toUpperCase(),
    });
  }

  public gradeOpenEndedAnswer(
    roomCode: string,
    questionIndex: number,
    teamId: string,
    points: number,
    isCorrect: boolean,
    feedback: string,
    annotatedDrawingDataUrl?: string
  ) {
    this.send({
      type: 'host:grade_open_ended',
      roomCode: roomCode.toUpperCase(),
      questionIndex,
      teamId,
      points,
      isCorrect,
      feedback,
      annotatedDrawingDataUrl,
    });
  }

  public requestSync(roomCode: string, role: 'host' | 'player', teamId?: string) {
    this.currentRoomCode = roomCode.toUpperCase();
    this.currentRole = role;
    if (teamId) this.currentTeamId = teamId;
    this.send({
      type: 'sync_request',
      roomCode: this.currentRoomCode,
      role,
      teamId,
      deviceId: this.currentDeviceId,
    });
  }

  public getCurrentRoomCode(): string | null {
    return this.currentRoomCode;
  }

  public getCurrentTeamId(): string | null {
    return this.currentTeamId;
  }

  // REST fallback for fetching latest state
  public async fetchSessionState(roomCode: string): Promise<SessionState | null> {
    try {
      const res = await fetch(`/api/session/${encodeURIComponent(roomCode.toUpperCase())}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.session;
    } catch {
      return null;
    }
  }
}

export const realtime = new RealtimeClient();
