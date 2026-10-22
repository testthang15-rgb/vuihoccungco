import WebSocket from 'ws';

const BASE_HTTP = 'http://127.0.0.1:3000';
const BASE_WS = 'ws://127.0.0.1:3000/ws';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`✅ [PASS] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message, durationMs: Date.now() - start });
    console.error(`❌ [FAIL] ${name}:`, err.message);
  }
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('🚀 Starting Comprehensive System Smoke Tests...\n');

  // TEST 1: Health API
  await runTest('API: GET /api/health', async () => {
    const res = await fetch(`${BASE_HTTP}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(`Invalid status: ${JSON.stringify(data)}`);
  });

  // TEST 2: Network Info API
  await runTest('API: GET /api/network-info', async () => {
    const res = await fetch(`${BASE_HTTP}/api/network-info`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.localIps)) throw new Error('localIps is not array');
  });

  // TEST 3: Custom Games API
  await runTest('API: GET & POST /api/games/custom', async () => {
    const resGet = await fetch(`${BASE_HTTP}/api/games/custom`);
    if (!resGet.ok) throw new Error(`HTTP ${resGet.status}`);

    const testGame = {
      id: 'smoke_test_game_' + Date.now(),
      title: 'Smoke Test Game',
      description: 'Automated test game',
      category: 'Chữ cái',
      playCount: 0,
      createdAt: Date.now(),
      questions: [],
      settings: { timeLimitPerQuestion: 30, pointsPerCorrectAnswer: 10, maxTeams: 4, allowLateJoin: true, autoAdvance: false },
    };

    const resPost = await fetch(`${BASE_HTTP}/api/games/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testGame),
    });
    if (!resPost.ok) throw new Error(`POST HTTP ${resPost.status}`);

    // Clean up
    await fetch(`${BASE_HTTP}/api/games/custom/${testGame.id}`, { method: 'DELETE' });
  });

  // TEST 4: Vietnamese Natural TTS API
  await runTest('API: GET /api/tts (Vietnamese Text-to-Speech)', async () => {
    const text = 'Xin chào các bé, đây là bài kiểm tra';
    const res = await fetch(`${BASE_HTTP}/api/tts?text=${encodeURIComponent(text)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cType = res.headers.get('content-type') || '';
    if (!cType.includes('audio/mpeg')) throw new Error(`Expected audio/mpeg, got ${cType}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 500) throw new Error(`Audio buffer too small: ${buf.byteLength} bytes`);
  });

  // TEST 5: Nonexistent Session API
  await runTest('API: GET /api/session/:roomCode (404 expected)', async () => {
    const res = await fetch(`${BASE_HTTP}/api/session/NONEXISTENT99`);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  // TEST 6: WebSocket Full E2E Multiplayer Cycle
  await runTest('WebSocket: Full Game Session Lifecycle & Presence', async () => {
    let hostWs: WebSocket | null = null;
    let player1Ws: WebSocket | null = null;
    let player2Ws: WebSocket | null = null;

    try {
      // 1. Connect Host
      hostWs = new WebSocket(BASE_WS);
      await new Promise((resolve, reject) => {
        hostWs!.onopen = resolve;
        hostWs!.onerror = reject;
      });

      let roomCode = '';
      const hostMessages: any[] = [];
      hostWs.onmessage = (event) => {
        hostMessages.push(JSON.parse(event.data.toString()));
      };

      // Create session
      const sampleGame = {
        id: 'smoke_test_run',
        title: 'Trắc nghiệm mầm non',
        description: 'Bé nhận biết con vật',
        category: 'Động vật',
        createdAt: Date.now(),
        playCount: 0,
        settings: { timeLimitPerQuestion: 25, pointsPerCorrectAnswer: 10, maxTeams: 4, allowLateJoin: true, autoAdvance: false },
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            title: 'Con gì kêu meo meo?',
            timeLimit: 20,
            options: [
              { id: 'opt_1', text: 'Con mèo', isCorrect: true },
              { id: 'opt_2', text: 'Con cún', isCorrect: false },
            ],
          },
        ],
      };

      hostWs.send(JSON.stringify({ type: 'host:create_session', game: sampleGame }));

      // Wait for session_created
      await wait(300);
      const createdMsg = hostMessages.find((m) => m.type === 'session_created');
      if (!createdMsg || !createdMsg.data?.session?.roomCode) {
        throw new Error('Host did not receive session_created');
      }
      roomCode = createdMsg.data.session.roomCode;

      // 2. Player 1 Connects & Joins
      player1Ws = new WebSocket(BASE_WS);
      await new Promise((resolve, reject) => {
        player1Ws!.onopen = resolve;
        player1Ws!.onerror = reject;
      });

      const p1Messages: any[] = [];
      player1Ws.onmessage = (event) => {
        p1Messages.push(JSON.parse(event.data.toString()));
      };

      player1Ws.send(JSON.stringify({
        type: 'player:join',
        roomCode,
        teamId: 'team_red',
        deviceId: 'device_test_1',
        customTeamName: 'Đội Thỏ Đỏ',
      }));

      await wait(300);
      const p1Join = p1Messages.find((m) => m.type === 'join_success');
      if (!p1Join) throw new Error('Player 1 did not receive join_success');

      // 3. Player 2 Connects & Joins
      player2Ws = new WebSocket(BASE_WS);
      await new Promise((resolve, reject) => {
        player2Ws!.onopen = resolve;
        player2Ws!.onerror = reject;
      });

      const p2Messages: any[] = [];
      player2Ws.onmessage = (event) => {
        p2Messages.push(JSON.parse(event.data.toString()));
      };

      player2Ws.send(JSON.stringify({
        type: 'player:join',
        roomCode,
        teamId: 'team_blue',
        deviceId: 'device_test_2',
        customTeamName: 'Đội Voi Xanh',
      }));

      await wait(300);
      const p2Join = p2Messages.find((m) => m.type === 'join_success');
      if (!p2Join) throw new Error('Player 2 did not receive join_success');

      // 4. Heartbeats
      player1Ws.send(JSON.stringify({ type: 'player:heartbeat', roomCode, teamId: 'team_red' }));
      player2Ws.send(JSON.stringify({ type: 'player:heartbeat', roomCode, teamId: 'team_blue' }));

      // 5. Host starts question
      hostWs.send(JSON.stringify({ type: 'host:start_question', roomCode, questionIndex: 0 }));
      await wait(300);
      const qStartHost = hostMessages.find((m) => m.type === 'session_updated' && m.data?.session?.questionStatus === 'active');
      if (!qStartHost) throw new Error('Host did not receive questionStatus active');

      // 6. Player 1 submits answer
      player1Ws.send(JSON.stringify({
        type: 'player:submit_answer',
        roomCode,
        teamId: 'team_red',
        questionIndex: 0,
        answerId: 'opt_1',
      }));

      await wait(300);
      const ansMsg = hostMessages.find((m) => m.type === 'answer_status_updated');
      if (!ansMsg) throw new Error('Host did not receive answer_status_updated');

      // 7. Player 2 leaves room (Presence test)
      player2Ws.send(JSON.stringify({
        type: 'player:leave',
        roomCode,
        teamId: 'team_blue',
        deviceId: 'device_test_2',
      }));

      await wait(300);
      const presenceMsg = hostMessages.find((m) => m.type === 'team_presence_changed' && m.data?.teamId === 'team_blue' && m.data?.online === false);
      if (!presenceMsg) throw new Error('Host did not receive team_presence_changed online=false for Player 2');

      // 8. Host kicks Player 2
      hostWs.send(JSON.stringify({
        type: 'host:kick_team',
        roomCode,
        teamId: 'team_blue',
      }));
      await wait(200);

      // 9. Host ends question & game
      hostWs.send(JSON.stringify({ type: 'host:end_question', roomCode }));
      await wait(200);
      hostWs.send(JSON.stringify({ type: 'host:end_game', roomCode }));
      await wait(200);
      const gameEndMsg = hostMessages.find((m) => m.type === 'game_ended');
      if (!gameEndMsg) throw new Error('Host did not receive game_ended');

    } finally {
      if (player1Ws) player1Ws.close();
      if (player2Ws) player2Ws.close();
      if (hostWs) hostWs.close();
    }
  });

  // TEST 7: ZIP/HTML Game Scoring Accuracy (Verify NO arbitrary 34 points & Detail Tracking)
  await runTest('WebSocket: HTML/ZIP Game Real Scoring & History Breakdown', async () => {
    let hostWs: WebSocket | null = null;
    let playerWs: WebSocket | null = null;

    try {
      hostWs = new WebSocket(BASE_WS);
      await new Promise<void>((res) => hostWs!.on('open', () => res()));

      const hostMessages: any[] = [];
      hostWs.on('message', (data) => hostMessages.push(JSON.parse(data.toString())));

      // Create room with a custom HTML game
      const sampleHtmlGame = {
        id: 'smoke_test_html_game',
        title: 'Đua thuyền trí tuệ (ZIP Test)',
        description: 'Trò chơi tương tác',
        category: 'Trò chơi',
        createdAt: Date.now(),
        playCount: 0,
        gameType: 'html_game',
        isZipArchive: true,
        settings: { timeLimitPerQuestion: 30, pointsPerCorrectAnswer: 30, maxTeams: 4, allowLateJoin: true, autoAdvance: false },
        questions: [
          {
            id: 'q_zip_1',
            title: 'Trò chơi đua thuyền trí tuệ',
            type: 'html_game',
            timeLimit: 30,
            points: 30,
            options: [],
          },
        ],
      };

      hostWs.send(JSON.stringify({
        type: 'host:create_session',
        game: sampleHtmlGame,
      }));

      await wait(300);
      const createdMsg = hostMessages.find((m) => m.type === 'session_created');
      if (!createdMsg || !createdMsg.data?.session?.roomCode) throw new Error('Failed to create session');
      const roomCode = createdMsg.data.session.roomCode;

      // Join player
      playerWs = new WebSocket(BASE_WS);
      await new Promise<void>((res) => playerWs!.on('open', () => res()));

      const playerMessages: any[] = [];
      playerWs.on('message', (data) => playerMessages.push(JSON.parse(data.toString())));

      playerWs.send(JSON.stringify({
        type: 'player:join_room',
        roomCode,
        teamId: 'team1',
        deviceId: 'dev_smoke_test_html',
      }));

      await wait(300);

      // Start game & question 0
      hostWs.send(JSON.stringify({ type: 'host:start_question', roomCode, questionIndex: 0 }));
      await wait(300);

      // Submit realistic HTML game result with 2 correct out of 5 (40%)
      playerWs.send(JSON.stringify({
        type: 'player:submit_answer',
        roomCode,
        teamId: 'team1',
        questionIndex: 0,
        answerId: 'html_game_complete',
        htmlGameResult: {
          isCorrect: true,
          score: 12, // 12 points out of 30
          totalCorrect: 2,
          totalQuestions: 5,
          summary: 'Đúng 2/5 câu (12đ)',
          history: [
            { question: 'Câu 1', choiceText: 'Thuyền buồm', correctText: 'Thuyền buồm', isCorrect: true },
            { question: 'Câu 2', choiceText: 'Ca nô', correctText: 'Tàu thủy', isCorrect: false },
            { question: 'Câu 3', choiceText: 'Tàu ngầm', correctText: 'Tàu ngầm', isCorrect: true },
            { question: 'Câu 4', choiceText: 'Thuyền nan', correctText: 'Du thuyền', isCorrect: false },
            { question: 'Câu 5', choiceText: 'Bè tre', correctText: 'Thuyền thúng', isCorrect: false },
          ],
        },
      }));

      await wait(300);

      const ackMsg = playerMessages.find((m) => m.type === 'answer_received');
      if (!ackMsg) throw new Error('Did not receive answer_received');

      // VERIFY: Score must be exactly 12 points, NOT 34!
      if (ackMsg.data.pointsAwarded !== 12) {
        throw new Error(`Expected pointsAwarded to be 12, but received ${ackMsg.data.pointsAwarded}`);
      }

      // Host ends question to receive full session answers
      hostWs.send(JSON.stringify({ type: 'host:end_question', roomCode }));
      await wait(300);

      const sessionUpdatedMsg = hostMessages.reverse().find((m) => m.type === 'session_updated');
      if (!sessionUpdatedMsg) throw new Error('Host did not receive session_updated with results');

      const savedAnswer = sessionUpdatedMsg.data.session.answers[0]?.team1;
      if (!savedAnswer) throw new Error('Session did not store team1 answer');

      if (savedAnswer.pointsAwarded !== 12) {
        throw new Error(`Stored answer pointsAwarded is ${savedAnswer.pointsAwarded}, expected 12`);
      }

      if (!savedAnswer.htmlDetails?.answersList || savedAnswer.htmlDetails.answersList.length !== 5) {
        throw new Error('answersList was not properly constructed or missing 5 items');
      }

      if (savedAnswer.htmlDetails.answersList[0].chosenAnswer !== 'Thuyền buồm') {
        throw new Error(`Incorrect first answer: ${savedAnswer.htmlDetails.answersList[0].chosenAnswer}`);
      }

    } finally {
      if (playerWs) playerWs.close();
      if (hostWs) hostWs.close();
    }
  });

  // TEST 8: Dual-Mode (2 Question Sets) Room Creation & API Session Lookup (QR Scan flow)
  await runTest('WebSocket & API: Dual-Mode (2-Set Quiz) Room Creation and Session Lookup', async () => {
    let hostWs: WebSocket | null = null;
    let playerWs: WebSocket | null = null;

    try {
      hostWs = new WebSocket(BASE_WS);
      await new Promise((resolve, reject) => {
        hostWs!.onopen = resolve;
        hostWs!.onerror = reject;
      });

      const hostMessages: any[] = [];
      hostWs.onmessage = (event) => {
        hostMessages.push(JSON.parse(event.data.toString()));
      };

      const gameA = {
        id: 'game_a_' + Date.now(),
        title: 'Bộ Đề 1 - Chữ cái',
        category: 'Chữ cái',
        questions: [{ id: 'qa1', title: 'Chữ gì đây?', type: 'multiple_choice', options: [{ id: 'o1', text: 'A', isCorrect: true }] }],
      };

      const gameB = {
        id: 'game_b_' + Date.now(),
        title: 'Bộ Đề 2 - Chữ số',
        category: 'Toán học',
        questions: [{ id: 'qb1', title: 'Số mấy đây?', type: 'multiple_choice', options: [{ id: 'o2', text: '1', isCorrect: true }] }],
      };

      hostWs.send(JSON.stringify({
        type: 'host:create_session',
        game: gameA,
        gameB: gameB,
        isDualMode: true,
      }));

      await wait(300);
      const createdMsg = hostMessages.find((m) => m.type === 'session_created');
      if (!createdMsg || !createdMsg.data?.session?.roomCode) {
        throw new Error('Host did not receive session_created for dual room');
      }

      const roomCode = createdMsg.data.session.roomCode;
      if (!createdMsg.data.session.isDualMode) {
        throw new Error('Created session is not flagged as isDualMode');
      }
      if (!createdMsg.data.session.gameB) {
        throw new Error('Created session is missing gameB');
      }

      // Simulate QR scan / Player checking room via /api/session/:roomCode
      const apiRes = await fetch(`${BASE_HTTP}/api/session/${roomCode}`);
      if (!apiRes.ok) throw new Error(`API GET /api/session/${roomCode} returned HTTP ${apiRes.status}`);
      const apiData = await apiRes.json();
      if (!apiData.session || apiData.session.roomCode !== roomCode) {
        throw new Error('API session data mismatch');
      }

      // Player connects and joins
      playerWs = new WebSocket(BASE_WS);
      await new Promise((resolve, reject) => {
        playerWs!.onopen = resolve;
        playerWs!.onerror = reject;
      });

      const playerMessages: any[] = [];
      playerWs.onmessage = (event) => {
        playerMessages.push(JSON.parse(event.data.toString()));
      };

      playerWs.send(JSON.stringify({
        type: 'player:join',
        roomCode,
        teamId: 'team_red',
        deviceId: 'device_dual_1',
        customTeamName: 'Đội Thỏ Ngọc',
      }));

      await wait(300);
      const joinSuccess = playerMessages.find((m) => m.type === 'join_success');
      if (!joinSuccess) throw new Error('Player failed to join dual room');
      if (!joinSuccess.data?.session?.isDualMode) {
        throw new Error('Player session does not reflect dual mode');
      }

    } finally {
      if (playerWs) playerWs.close();
      if (hostWs) hostWs.close();
    }
  });

  console.log('\n======================================');
  console.log('       SMOKE TEST SUMMARY');
  console.log('======================================');
  let passedCount = 0;
  for (const r of results) {
    if (r.passed) passedCount++;
    console.log(`${r.passed ? '✅ PASS' : '❌ FAIL'}: ${r.name} (${r.durationMs}ms)${r.error ? ` - ${r.error}` : ''}`);
  }
  console.log(`\nTotal: ${passedCount}/${results.length} tests passed.\n`);

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal smoke test error:', err);
  process.exit(1);
});
