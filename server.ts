import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { SessionState, ConnectedTeam, TeamAnswer, Game, GameSettings, Question, DragActionRecord, TeamPreset } from './src/types/game';

// Alphabet without ambiguous characters (no 0, O, 1, I, 5, S)
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRTVWXYZ2346789';
function generateRoomCode(length: number = 5): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return result;
}

const TEAM_PRESETS: TeamPreset[] = [
  { id: 'team_sun', name: 'máy 1', icon: '☀️', colorName: 'Đỏ Mặt Trời', bgColor: 'bg-rose-500', textColor: 'text-rose-600', borderColor: 'border-rose-400', ringColor: 'ring-rose-400' },
  { id: 'team_rainbow', name: 'máy 2', icon: '🌈', colorName: 'Xanh Lam', bgColor: 'bg-sky-500', textColor: 'text-sky-600', borderColor: 'border-sky-400', ringColor: 'ring-sky-400' },
  { id: 'team_flower', name: 'máy 3', icon: '🌸', colorName: 'Hồng Phấn', bgColor: 'bg-pink-500', textColor: 'text-pink-600', borderColor: 'border-pink-400', ringColor: 'ring-pink-400' },
  { id: 'team_leaf', name: 'máy 4', icon: '🍃', colorName: 'Xanh Lá', bgColor: 'bg-emerald-500', textColor: 'text-emerald-600', borderColor: 'border-emerald-400', ringColor: 'ring-emerald-400' },
  { id: 'team_star', name: 'máy 5', icon: '⭐', colorName: 'Vàng Sao', bgColor: 'bg-amber-500', textColor: 'text-amber-600', borderColor: 'border-amber-400', ringColor: 'ring-amber-400' },
  { id: 'team_cloud', name: 'máy 6', icon: '☁️', colorName: 'Xanh Lơ', bgColor: 'bg-cyan-500', textColor: 'text-cyan-600', borderColor: 'border-cyan-400', ringColor: 'ring-cyan-400' },
  { id: 'team_elephant', name: 'máy 7', icon: '🐘', colorName: 'Tím Biếc', bgColor: 'bg-purple-500', textColor: 'text-purple-600', borderColor: 'border-purple-400', ringColor: 'ring-purple-400' },
  { id: 'team_rabbit', name: 'máy 8', icon: '🐰', colorName: 'Cam Cà Rốt', bgColor: 'bg-orange-500', textColor: 'text-orange-600', borderColor: 'border-orange-400', ringColor: 'ring-orange-400' },
  { id: 'team_lion', name: 'máy 9', icon: '🦁', colorName: 'Vàng Hổ Phách', bgColor: 'bg-amber-600', textColor: 'text-amber-700', borderColor: 'border-amber-500', ringColor: 'ring-amber-500' },
  { id: 'team_dolphin', name: 'máy 10', icon: '🐬', colorName: 'Xanh Đại Dương', bgColor: 'bg-blue-600', textColor: 'text-blue-700', borderColor: 'border-blue-500', ringColor: 'ring-blue-500' },
  { id: 'team_chick', name: 'máy 11', icon: '🐥', colorName: 'Xanh Lá Non', bgColor: 'bg-lime-500', textColor: 'text-lime-700', borderColor: 'border-lime-400', ringColor: 'ring-lime-400' },
  { id: 'team_strawberry', name: 'máy 12', icon: '🍓', colorName: 'Đỏ Ruby', bgColor: 'bg-red-500', textColor: 'text-red-600', borderColor: 'border-red-400', ringColor: 'ring-red-400' },
];

interface DragEvaluationResult {
  isComplete: boolean;
  isCorrect: boolean;
  totalCorrect: number;
  totalWrong: number;
  placedCount: number;
  totalRequired: number;
  pointsAwarded: number;
  actions: DragActionRecord[];
}

class GameEngine {
  public static evaluateDragDrop(
    question: Question,
    placements: Record<string, string>,
    speedBonus: boolean = false,
    responseTimeMs: number = 0
  ): DragEvaluationResult {
    const config = question.canvasConfig;
    if (!config) {
      return {
        isComplete: true,
        isCorrect: true,
        totalCorrect: 0,
        totalWrong: 0,
        placedCount: 0,
        totalRequired: 0,
        pointsAwarded: question.points || 10,
        actions: [],
      };
    }

    const rules = config.rules || [];
    const draggableElements = config.elements.filter(
      (e) => e.isDraggable && !e.isLocked && e.cardRole !== 'static'
    );
    const requiredCards = draggableElements.filter(
      (e) => e.cardRole !== 'wrong' && rules.some((r) => r.sourceId === e.id && r.isCorrect)
    );
    const totalRequired = requiredCards.length > 0 ? requiredCards.length : draggableElements.length;
    const placedCount = Object.keys(placements).length;

    let totalCorrect = 0;
    let totalWrong = 0;
    const actions: DragActionRecord[] = [];

    for (const [itemId, targetId] of Object.entries(placements)) {
      const itemEl = config.elements.find((e) => e.id === itemId);
      if (itemEl?.cardRole === 'wrong') {
        totalWrong++;
        actions.push({
          itemId,
          targetId,
          isCorrect: false,
          timestamp: Date.now(),
        });
        continue;
      }

      const rule = rules.find((r) => r.sourceId === itemId && r.targetId === targetId);
      const isItemCorrect = Boolean(rule && rule.isCorrect);

      if (isItemCorrect) {
        totalCorrect++;
      } else {
        totalWrong++;
      }

      actions.push({
        itemId,
        targetId,
        isCorrect: isItemCorrect,
        timestamp: Date.now(),
      });
    }

    const isComplete = placedCount >= totalRequired && totalRequired > 0;
    const isAllCorrect = totalCorrect === totalRequired && totalWrong === 0 && totalRequired > 0;

    const pointsPerItem = Math.floor((question.points || 30) / Math.max(1, totalRequired));
    let pointsAwarded = Math.max(0, totalCorrect * pointsPerItem);

    if (isAllCorrect && speedBonus && question.timeLimit) {
      const limitMs = question.timeLimit * 1000;
      const speedFactor = Math.max(0, (limitMs - responseTimeMs) / limitMs);
      pointsAwarded += Math.round(5 * speedFactor);
    }

    return {
      isComplete,
      isCorrect: isAllCorrect,
      totalCorrect,
      totalWrong,
      placedCount,
      totalRequired,
      pointsAwarded,
      actions,
    };
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

server.on('error', (err: any) => {
  console.error('[Vui Hoc Cung Co] HTTP Server Error:', err?.message || err);
});

wss.on('error', (err: any) => {
  console.error('[Vui Hoc Cung Co] WebSocket Server Error:', err?.message || err);
});

// Ensure game-storage directory exists for extracted zip assets
const GAMES_STORAGE_DIR = path.resolve(__dirname, 'game-storage');
if (!fs.existsSync(GAMES_STORAGE_DIR)) {
  fs.mkdirSync(GAMES_STORAGE_DIR, { recursive: true });
}

// Serve uploaded web game assets statically with CORS and subfolder fallback
// Helper to recursively find file in directory
function findFileRecursively(dir: string, targetNameOrSubpath: string): string | null {
  try {
    if (!fs.existsSync(dir)) return null;
    const directTarget = path.join(dir, targetNameOrSubpath);
    if (fs.existsSync(directTarget) && !fs.statSync(directTarget).isDirectory()) {
      return directTarget;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const baseTarget = path.basename(targetNameOrSubpath).toLowerCase();
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subDirect = path.join(full, targetNameOrSubpath);
        if (fs.existsSync(subDirect) && !fs.statSync(subDirect).isDirectory()) {
          return subDirect;
        }
        const deepMatch = findFileRecursively(full, targetNameOrSubpath);
        if (deepMatch) return deepMatch;
      } else if (entry.name.toLowerCase() === baseTarget) {
        return full;
      }
    }
  } catch (err) {
    console.warn('findFileRecursively error:', err);
  }
  return null;
}

const VUIHOC_HTML_SHIM = `
<script id="__vui_hoc_sandbox_shim__">
(function() {
  try {
    var _k = '__vh_t__';
    window.localStorage.setItem(_k, '1');
    window.localStorage.removeItem(_k);
  } catch(e) {
    var _s = {};
    var _p = {
      getItem: function(k) { return _s.hasOwnProperty(k) ? _s[k] : null; },
      setItem: function(k, v) { _s[k] = String(v); },
      removeItem: function(k) { delete _s[k]; },
      clear: function() { _s = {}; },
      get length() { return Object.keys(_s).length; },
      key: function(i) { return Object.keys(_s)[i] || null; }
    };
    try {
      Object.defineProperty(window, 'localStorage', { value: _p, configurable: true, writable: true });
      Object.defineProperty(window, 'sessionStorage', { value: _p, configurable: true, writable: true });
    } catch(err) {}
  }

  // Intercept blocking dialogs so sandboxed iframes don't freeze
  try {
    window.alert = function(msg) { console.log('[VuiHoc Alert Intercepted]:', msg); };
    window.confirm = function() { return true; };
    window.prompt = function() { return ''; };
  } catch(e) {}

  // In-memory drag & drop action recorder
  var _recordedDragActions = [];

  function recordDragAction(item) {
    if (!item) return;
    // Replace or update existing card record if already exists
    var idx = -1;
    if (item.cardId) {
      for (var i = 0; i < _recordedDragActions.length; i++) {
        if (_recordedDragActions[i].cardId === item.cardId) {
          idx = i;
          break;
        }
      }
    }
    if (idx >= 0) {
      _recordedDragActions[idx] = Object.assign({}, _recordedDragActions[idx], item);
    } else {
      _recordedDragActions.push(item);
    }
  }

  function extractGameStats() {
    var history = [];
    var answersList = [];
    var dragDetails = [];
    var score = 0;
    var totalQuestions = 0;
    var totalCorrect = 0;
    var isCorrect = false;

    // 1. Branch A: Check for Racing / Turn-based Game (gameState)
    try {
      if (typeof gameState !== 'undefined' && gameState) {
        if (Array.isArray(gameState.history) && gameState.history.length > 0) {
          history = gameState.history.map(function(h) {
            return {
              question: h.question || 'Câu hỏi',
              choiceText: h.choiceText || '',
              choiceImg: h.choiceImg || '',
              correctText: h.correctText || '',
              correctChoiceImg: h.correctChoiceImg || '',
              isCorrect: Boolean(h.isCorrect),
              teamName: h.teamName || '',
              teamCode: h.teamCode || ''
            };
          });
          totalQuestions = history.length;
          totalCorrect = history.filter(function(h) { return h.isCorrect; }).length;
          answersList = history.map(function(h) {
            return {
              question: h.question,
              chosenAnswer: h.choiceText,
              chosenImage: h.choiceImg,
              correctAnswer: h.correctText,
              correctImage: h.correctChoiceImg,
              isCorrect: h.isCorrect,
              teamName: h.teamName
            };
          });
        }

        var s1 = typeof gameState.score1 === 'number' ? gameState.score1 : 0;
        var s2 = typeof gameState.score2 === 'number' ? gameState.score2 : 0;
        var highestScore = Math.max(s1, s2);
        if (highestScore > 0) {
          score = highestScore;
        } else if (totalQuestions > 0) {
          score = Math.round((totalCorrect / Math.max(totalQuestions, 1)) * 30);
        } else {
          score = 0;
        }
        isCorrect = totalCorrect > 0 && (totalCorrect >= Math.ceil(totalQuestions / 2));

        return {
          history: history,
          answersList: answersList,
          dragDetails: [],
          totalQuestions: totalQuestions,
          totalCorrect: totalCorrect,
          score: score,
          isCorrect: isCorrect,
          summary: totalQuestions > 0 ? ('Đúng ' + totalCorrect + '/' + totalQuestions + ' câu (' + score + 'đ)') : 'Hoàn thành lượt đua'
        };
      }
    } catch (e) {}

    // 2. Branch B: Drag & Drop / Letter Sorting Game
    try {
      var allCards = Array.from(document.querySelectorAll('.drag-card, [draggable="true"], .card-u, .card-uw, [id^="c-"], [id^="c1"], [id^="c2"], [id^="c3"], [id^="c4"], [id^="c5"], [id^="c6"], [data-letter]'));
      
      // Filter out drop zones or targets that might have been matched
      allCards = allCards.filter(function(el) {
        var id = el.id || '';
        var cls = el.className || '';
        return !id.startsWith('drop-') && !id.startsWith('zone-') && !cls.includes('drop-zone') && !cls.includes('targets-container');
      });

      if (allCards.length > 0 || _recordedDragActions.length > 0) {
        var scannedActions = [];
        
        allCards.forEach(function(cardEl, idx) {
          var cardId = cardEl.id || ('card_' + idx);
          var letterEl = cardEl.querySelector('.letter, [data-letter], strong, b');
          var subtextEl = cardEl.querySelector('.subtext, .desc, span:last-child');
          var letter = (letterEl ? letterEl.innerText : cardEl.getAttribute('data-letter') || '').trim();
          var subtext = (subtextEl ? subtextEl.innerText : '').trim();
          var fullText = (letter && subtext) ? (letter + ' · ' + subtext) : (cardEl.innerText || ('Thẻ ' + (idx + 1))).trim().replace(/\\s+/g, ' ');

          // Check where card is currently placed in DOM
          var isPlacedInU = Boolean(cardEl.closest('#placed-u, #drop-u, .zone-u, #slots-u'));
          var isPlacedInUw = Boolean(cardEl.closest('#placed-uw, #drop-uw, .zone-uw, #slots-uw'));
          var isPlacedGeneric = Boolean(cardEl.closest('.placed-items, [id^="placed-"], .zone, [class*="drop"], .slots') || cardEl.classList.contains('placed'));

          // Expected target
          var expectedLetter = letter || (cardEl.classList.contains('card-u') ? 'U' : cardEl.classList.contains('card-uw') ? 'Ư' : '');
          var expectedZone = expectedLetter === 'U' ? 'Ô CHỮ U' : expectedLetter === 'Ư' || expectedLetter === 'UW' ? 'Ô CHỮ Ư' : 'Ô đúng';

          var targetZone = '';
          var cardCorrect = false;
          var status = 'unplaced';

          if (isPlacedInU) {
            targetZone = 'Ô CHỮ U';
            cardCorrect = (expectedLetter === 'U' || cardEl.classList.contains('card-u'));
            status = cardCorrect ? 'correct' : 'wrong';
          } else if (isPlacedInUw) {
            targetZone = 'Ô CHỮ Ư';
            cardCorrect = (expectedLetter === 'Ư' || expectedLetter === 'UW' || cardEl.classList.contains('card-uw'));
            status = cardCorrect ? 'correct' : 'wrong';
          } else if (isPlacedGeneric) {
            targetZone = 'Vùng xếp';
            cardCorrect = true;
            status = 'correct';
          }

          // Check if we have an explicit recorded action for this card
          var recorded = _recordedDragActions.find(function(a) { return a.cardId === cardId; });
          if (recorded) {
            if (recorded.targetZone) targetZone = recorded.targetZone;
            if (typeof recorded.isCorrect === 'boolean') cardCorrect = recorded.isCorrect;
            if (recorded.status) status = recorded.status;
          }

          scannedActions.push({
            cardId: cardId,
            cardText: fullText,
            letter: letter || expectedLetter,
            subtext: subtext,
            targetZone: targetZone || 'Chưa kéo',
            expectedZone: expectedZone,
            isCorrect: cardCorrect,
            status: status,
            points: cardCorrect ? Math.round(30 / Math.max(allCards.length, 1)) : 0
          });
        });

        // Use scannedActions or recorded actions
        dragDetails = scannedActions.length > 0 ? scannedActions : _recordedDragActions;
        totalQuestions = dragDetails.length;
        totalCorrect = dragDetails.filter(function(d) { return d.isCorrect; }).length;

        // Try reading global correctCount or score variables if available in game scope
        try {
          if (typeof correctCount === 'number' && correctCount > totalCorrect) {
            totalCorrect = correctCount;
          }
          if (typeof totalCards === 'number' && totalCards > 0) {
            totalQuestions = totalCards;
          }
          if (typeof placedCount === 'number' && placedCount > totalCorrect) {
            totalCorrect = placedCount;
          }
        } catch(e) {}

        score = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 30) : 0;
        isCorrect = totalCorrect > 0 && totalCorrect === totalQuestions;

        answersList = dragDetails.map(function(d, dIdx) {
          return {
            question: 'Thẻ ' + (d.letter ? '[' + d.letter + '] ' : '') + d.cardText,
            chosenAnswer: d.status === 'unplaced' ? 'Chưa kéo vào ô' : ('Kéo vào: ' + d.targetZone),
            correctAnswer: d.expectedZone || d.targetZone || 'Đúng vị trí',
            isCorrect: d.isCorrect,
            points: d.points || (d.isCorrect ? 5 : 0),
            teamName: ''
          };
        });

        history = answersList.map(function(a) {
          return {
            question: a.question,
            choiceText: a.chosenAnswer,
            correctText: a.correctAnswer,
            isCorrect: a.isCorrect
          };
        });

        return {
          history: history,
          answersList: answersList,
          dragDetails: dragDetails,
          totalQuestions: totalQuestions,
          totalCorrect: totalCorrect,
          score: score,
          isCorrect: isCorrect,
          summary: 'Bé kéo đúng ' + totalCorrect + '/' + totalQuestions + ' thẻ chữ (Đạt ' + score + 'đ)'
        };
      }
    } catch(e) {}

    // Fallback if no specific elements detected
    return {
      history: history,
      answersList: answersList,
      dragDetails: dragDetails,
      totalQuestions: totalQuestions,
      totalCorrect: totalCorrect,
      score: score,
      isCorrect: isCorrect,
      summary: 'Hoàn thành trò chơi'
    };
  }

  window.finishVuiHocGame = function(isCorrectParam, pointsParam, summaryParam, extraDetails) {
    if (window.parent && window.parent !== window) {
      var stats = extractGameStats();
      var finalScore = (typeof pointsParam === 'number' && !isNaN(pointsParam)) ? pointsParam : stats.score;
      var finalCorrect = (typeof isCorrectParam === 'boolean') ? isCorrectParam : stats.isCorrect;
      var totalQ = (extraDetails && extraDetails.totalQuestions !== undefined) ? extraDetails.totalQuestions : stats.totalQuestions;
      var totalC = (extraDetails && extraDetails.totalCorrect !== undefined) ? extraDetails.totalCorrect : stats.totalCorrect;
      var finalHistory = (extraDetails && extraDetails.history) ? extraDetails.history : stats.history;
      var finalAnswers = (extraDetails && extraDetails.answersList) ? extraDetails.answersList : stats.answersList;
      var finalDrag = (extraDetails && extraDetails.dragDetails) ? extraDetails.dragDetails : stats.dragDetails;

      window.parent.postMessage({
        type: 'GAME_COMPLETE',
        isCorrect: finalCorrect,
        score: finalScore,
        totalCorrect: totalC,
        totalQuestions: totalQ,
        summary: summaryParam || stats.summary || ('Đúng ' + totalC + '/' + totalQ + ' thẻ (' + finalScore + 'đ)'),
        history: finalHistory,
        answersList: finalAnswers,
        dragDetails: finalDrag,
        extra: extraDetails || {}
      }, '*');
    }
  };

  window.reportGameProgress = function() {
    if (window.parent && window.parent !== window) {
      var stats = extractGameStats();
      window.parent.postMessage({
        type: 'GAME_PROGRESS',
        score: stats.score,
        totalCorrect: stats.totalCorrect,
        totalQuestions: stats.totalQuestions,
        history: stats.history,
        answersList: stats.answersList,
        dragDetails: stats.dragDetails,
        placedCount: stats.totalCorrect,
        totalRequired: stats.totalQuestions
      }, '*');
    }
  };

  window.getVuiHocGameResult = function() {
    var stats = extractGameStats();
    return stats;
  };

  function autoHook() {
    // 1. Hook Racing / Multiple-Choice games
    if (typeof window.endGame === 'function' && !window.endGame.__vh_hooked) {
      var origEnd = window.endGame;
      window.endGame = function() {
        var r = origEnd.apply(this, arguments);
        try {
          var stats = extractGameStats();
          window.finishVuiHocGame(stats.isCorrect, stats.score, 'Bé đã hoàn thành trò chơi!', {
            totalCorrect: stats.totalCorrect,
            totalQuestions: stats.totalQuestions,
            history: stats.history,
            answersList: stats.answersList,
            dragDetails: stats.dragDetails
          });
        } catch (err) {}
        return r;
      };
      window.endGame.__vh_hooked = true;
    }

    if (typeof window.handleAnswer === 'function' && !window.handleAnswer.__vh_hooked) {
      var origAns = window.handleAnswer;
      window.handleAnswer = function() {
        var r = origAns.apply(this, arguments);
        try {
          window.reportGameProgress();
        } catch (err) {}
        return r;
      };
      window.handleAnswer.__vh_hooked = true;
    }

    // 2. Hook Drag & Drop games (processCardPlacement from zip templates)
    if (typeof window.processCardPlacement === 'function' && !window.processCardPlacement.__vh_hooked) {
      var origProcess = window.processCardPlacement;
      window.processCardPlacement = function(cardId, letterType, zoneType) {
        var isMatch = (String(letterType).toLowerCase() === String(zoneType).toLowerCase());
        var cardElem = document.getElementById(cardId);
        var letterText = letterType ? String(letterType).toUpperCase() : '';
        var subtext = cardElem ? (cardElem.querySelector('.subtext')?.innerText || '') : '';
        var targetName = zoneType === 'u' ? 'Ô CHỮ U' : zoneType === 'uw' ? 'Ô CHỮ Ư' : ('Ô CHỮ ' + String(zoneType).toUpperCase());

        recordDragAction({
          cardId: cardId,
          cardText: (letterText && subtext) ? (letterText + ' · ' + subtext) : (cardElem ? cardElem.innerText : cardId),
          letter: letterText,
          subtext: subtext,
          targetZone: targetName,
          expectedZone: zoneType === 'u' ? 'Ô CHỮ U' : 'Ô CHỮ Ư',
          isCorrect: isMatch,
          status: isMatch ? 'correct' : 'wrong'
        });

        var r = origProcess.apply(this, arguments);
        try {
          window.reportGameProgress();
        } catch (e) {}
        return r;
      };
      window.processCardPlacement.__vh_hooked = true;
    }

    // 3. Hook submitGameResult in zip templates
    if (typeof window.submitGameResult === 'function' && !window.submitGameResult.__vh_hooked) {
      var origSubmit = window.submitGameResult;
      window.submitGameResult = function() {
        var stats = extractGameStats();
        window.finishVuiHocGame(stats.isCorrect, stats.score, stats.summary, {
          totalCorrect: stats.totalCorrect,
          totalQuestions: stats.totalQuestions,
          history: stats.history,
          answersList: stats.answersList,
          dragDetails: stats.dragDetails
        });
        try { origSubmit.apply(this, arguments); } catch(e) {}
      };
      window.submitGameResult.__vh_hooked = true;
    }

    // 4. Hook showVictory in single-file drag games
    if (typeof window.showVictory === 'function' && !window.showVictory.__vh_hooked) {
      var origVictory = window.showVictory;
      window.showVictory = function() {
        var stats = extractGameStats();
        window.finishVuiHocGame(stats.isCorrect, stats.score, stats.summary, {
          totalCorrect: stats.totalCorrect,
          totalQuestions: stats.totalQuestions,
          history: stats.history,
          answersList: stats.answersList,
          dragDetails: stats.dragDetails
        });
        return origVictory.apply(this, arguments);
      };
      window.showVictory.__vh_hooked = true;
    }
  }

  autoHook();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoHook);
  }
  window.addEventListener('load', autoHook);
})();
</script>
`;

app.use('/api/games/static', (req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  // Sanitize path to prevent directory traversal
  let safeSubPath = decodeURIComponent(req.path).replace(/^(\.\.[\/\\])+/, '');
  if (safeSubPath.startsWith('/')) safeSubPath = safeSubPath.slice(1);
  const cleanSubPath = safeSubPath.replace(/\/+$/, '');

  const fullFsPath = path.join(GAMES_STORAGE_DIR, safeSubPath);

  // If path is a folder, find index.html or first available html file
  if (fs.existsSync(fullFsPath) && fs.statSync(fullFsPath).isDirectory()) {
    const candidateIndex = path.join(fullFsPath, 'index.html');
    if (fs.existsSync(candidateIndex)) {
      if (!req.path.endsWith('/')) {
        return res.redirect(302, `/api/games/static/${cleanSubPath}/index.html`);
      }
      return sendHtmlWithShim(candidateIndex, res);
    }

    try {
      const entries = fs.readdirSync(fullFsPath);
      const rootHtml = entries.find(e => e.toLowerCase().endsWith('.html') || e.toLowerCase().endsWith('.htm'));
      if (rootHtml) {
        return res.redirect(302, `/api/games/static/${cleanSubPath}/${rootHtml}`);
      }

      // Check subdirectories (e.g. duathuyen/gameduathuyen.html)
      for (const sub of entries) {
        const subFullPath = path.join(fullFsPath, sub);
        if (fs.statSync(subFullPath).isDirectory()) {
          const subEntries = fs.readdirSync(subFullPath);
          const subHtml = subEntries.find(e => e.toLowerCase().endsWith('.html') || e.toLowerCase().endsWith('.htm'));
          if (subHtml) {
            // Redirect directly to the subfolder html so relative assets resolve properly
            return res.redirect(302, `/api/games/static/${cleanSubPath}/${sub}/${subHtml}`);
          }
        }
      }
    } catch (scanErr) {
      console.warn('Error scanning directory for HTML files:', scanErr);
    }
  }

  // If direct file exists
  if (fs.existsSync(fullFsPath) && !fs.statSync(fullFsPath).isDirectory()) {
    if (fullFsPath.toLowerCase().endsWith('.html') || fullFsPath.toLowerCase().endsWith('.htm')) {
      return sendHtmlWithShim(fullFsPath, res);
    }
    return res.sendFile(fullFsPath);
  }

  // If direct file was not found, search inside game folder
  // E.g. /api/games/static/game_zip_123/image/1.png where 1.png is in game_zip_123/duathuyen/image/1.png
  const pathParts = safeSubPath.split('/');
  if (pathParts.length >= 2) {
    const gameFolder = pathParts[0];
    const assetSubPath = pathParts.slice(1).join('/');
    const gameDir = path.join(GAMES_STORAGE_DIR, gameFolder);

    if (fs.existsSync(gameDir) && fs.statSync(gameDir).isDirectory()) {
      const matchedFile = findFileRecursively(gameDir, assetSubPath);
      if (matchedFile && fs.existsSync(matchedFile) && !fs.statSync(matchedFile).isDirectory()) {
        if (matchedFile.toLowerCase().endsWith('.html') || matchedFile.toLowerCase().endsWith('.htm')) {
          return sendHtmlWithShim(matchedFile, res);
        }
        return res.sendFile(matchedFile);
      }
    }
  }

  // Graceful fallback for missing assets to prevent breaking the game UI
  const lowerPath = safeSubPath.toLowerCase();
  if (lowerPath.endsWith('.png') || lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg') || lowerPath.endsWith('.gif') || lowerPath.endsWith('.webp')) {
    // 1x1 transparent PNG buffer
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    res.setHeader('Content-Type', 'image/png');
    return res.send(transparentPng);
  }
  if (lowerPath.endsWith('.svg')) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
  }
  if (lowerPath.endsWith('.mp3') || lowerPath.endsWith('.wav') || lowerPath.endsWith('.ogg')) {
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(Buffer.alloc(0));
  }

  // Not found in static game storage
  return res.status(404).send('<!DOCTYPE html><html><body><h3>404: Không tìm thấy file trò chơi.</h3></body></html>');
});

function sendHtmlWithShim(filePath: string, res: Response) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('__vui_hoc_sandbox_shim__')) {
      if (content.includes('<head>')) {
        content = content.replace('<head>', `<head>${VUIHOC_HTML_SHIM}`);
      } else if (content.includes('<!DOCTYPE') || content.includes('<html')) {
        content = `${VUIHOC_HTML_SHIM}${content}`;
      } else {
        content = `<head>${VUIHOC_HTML_SHIM}</head>${content}`;
      }
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(content);
  } catch (err) {
    console.warn('sendHtmlWithShim error, falling back to res.sendFile:', err);
    return res.sendFile(filePath);
  }
}

// Increase body parser limit to support ZIP asset dictionaries
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enable CORS and Cross-Device Access for mobile phones (iOS & Android)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// In-memory authoritative sessions store
const sessions = new Map<string, SessionState>();

// Socket metadata tracking
interface SocketMeta {
  ws: WebSocket;
  roomCode?: string;
  role?: 'host' | 'player';
  teamId?: string;
  deviceId?: string;
  isAlive: boolean;
}

const socketMap = new Map<WebSocket, SocketMeta>();

// Broadcast helper with server timestamp injection
function broadcastToRoom(roomCode: string, payload: { type: string; data?: any }, excludeWs?: WebSocket) {
  const envelope = {
    ...payload,
    serverTime: Date.now(),
  };
  const raw = JSON.stringify(envelope);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      const meta = socketMap.get(client);
      if (meta && meta.roomCode === roomCode) {
        client.send(raw);
      }
    }
  });
}

// Send helper to a single socket
function sendToSocket(ws: WebSocket, payload: { type: string; data?: any }) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      ...payload,
      serverTime: Date.now(),
    }));
  }
}

// Sanitize session for player (hides correct answers and rules during active question phase)
function getSanitizedSessionForPlayer(session: SessionState, targetTeamId?: string): SessionState {
  const cloned: SessionState = JSON.parse(JSON.stringify(session));

  if (cloned.isDualMode) {
    const assignedSet: 'A' | 'B' = (targetTeamId && session.teamAssignments?.[targetTeamId]) ||
      (targetTeamId && session.teams[targetTeamId]?.assignedSet) ||
      'A';
    cloned.myAssignedSet = assignedSet;

    if (assignedSet === 'B' && session.gameB) {
      cloned.game = JSON.parse(JSON.stringify(session.gameB));
      cloned.gameId = session.gameB.id;
      cloned.assignedSetTitle = session.gameB.title;
    } else {
      cloned.assignedSetTitle = session.game.title;
    }
  }

  if (cloned.game && cloned.game.gameUrl && Array.isArray(cloned.game.questions)) {
    cloned.game.questions.forEach(q => {
      if (!q.gameUrl && cloned.game.gameUrl) {
        q.gameUrl = cloned.game.gameUrl;
      }
    });
  }

  if (cloned.questionStatus === 'active' || cloned.questionStatus === 'waiting') {
    const qIndex = cloned.currentQuestionIndex;
    const currentQ = cloned.game.questions[qIndex];
    if (currentQ) {
      if (!currentQ.gameUrl && cloned.game.gameUrl) {
        currentQ.gameUrl = cloned.game.gameUrl;
      }
      currentQ.explanation = undefined;
      // Strip isCorrect flag from multiple choice options
      if (currentQ.options) {
        const correctCount = currentQ.options.filter(opt => opt.isCorrect).length;
        if (correctCount > 1) {
          currentQ.allowMultipleCorrect = true;
        }
        currentQ.options = currentQ.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          imageUrl: opt.imageUrl,
          isCorrect: false,
        }));
      }

      // If interactive drag-drop, strip isCorrect flag from rules so client cannot inspect rules
      if (currentQ.canvasConfig && currentQ.canvasConfig.rules) {
        currentQ.canvasConfig.rules = currentQ.canvasConfig.rules.map(r => ({
          id: r.id,
          sourceId: r.sourceId,
          targetId: r.targetId,
          isCorrect: false,
          points: 0,
        }));
      }
    }

    // Hide choices and correctness of answers while question is running
    const qAnswers = cloned.answers[qIndex] || {};
    const sanitizedAnswers: Record<string, TeamAnswer> = {};
    for (const [tId, ans] of Object.entries(qAnswers)) {
      if (tId === targetTeamId) {
        // Player sees that their own team answered
        sanitizedAnswers[tId] = {
          ...ans,
          isCorrect: false,
          pointsAwarded: 0,
        };
      } else {
        // Other teams only show progress / completion
        sanitizedAnswers[tId] = {
          ...ans,
          answerId: '',
          answerText: '',
          isCorrect: false,
          pointsAwarded: 0,
          actions: [],
        };
      }
    }
    cloned.answers[qIndex] = sanitizedAnswers;
  }

  return cloned;
}

// Sanitize session for host during active question (HOST sees live progress, NOT what they picked)
function getSanitizedSessionForHost(session: SessionState): SessionState {
  const cloned: SessionState = JSON.parse(JSON.stringify(session));

  if (cloned.game && cloned.game.gameUrl && Array.isArray(cloned.game.questions)) {
    cloned.game.questions.forEach(q => {
      if (!q.gameUrl && cloned.game.gameUrl) {
        q.gameUrl = cloned.game.gameUrl;
      }
    });
  }

  if (cloned.gameB && cloned.gameB.gameUrl && Array.isArray(cloned.gameB.questions)) {
    cloned.gameB.questions.forEach(q => {
      if (!q.gameUrl && cloned.gameB!.gameUrl) {
        q.gameUrl = cloned.gameB!.gameUrl;
      }
    });
  }

  // If question is active, mask exact answers from host so screen doesn't leak to kids in classroom
  if (cloned.questionStatus === 'active') {
    const qIndex = cloned.currentQuestionIndex;
    const currentQ = cloned.game.questions[qIndex];
    if (currentQ && !currentQ.gameUrl && cloned.game.gameUrl) {
      currentQ.gameUrl = cloned.game.gameUrl;
    }
    if (cloned.gameB) {
      const currentQB = cloned.gameB.questions[qIndex];
      if (currentQB && !currentQB.gameUrl && cloned.gameB.gameUrl) {
        currentQB.gameUrl = cloned.gameB.gameUrl;
      }
    }
    const qAnswers = cloned.answers[qIndex] || {};
    const sanitizedAnswers: Record<string, TeamAnswer> = {};

    for (const [tId, ans] of Object.entries(qAnswers)) {
      sanitizedAnswers[tId] = {
        sessionId: ans.sessionId,
        questionIndex: ans.questionIndex,
        questionId: ans.questionId,
        teamId: ans.teamId,
        teamName: ans.teamName,
        answerId: 'hidden_during_active',
        answerText: ans.placedCount && ans.totalItems ? `${ans.placedCount}/${ans.totalItems} thẻ` : 'Đã nộp bài',
        submittedAt: ans.submittedAt,
        responseTimeMs: ans.responseTimeMs,
        isCorrect: false,
        pointsAwarded: 0,
        placedCount: ans.placedCount,
        totalItems: ans.totalItems,
      };
    }
    cloned.answers[qIndex] = sanitizedAnswers;
  }

  return cloned;
}

// Authoritative Question Timers & Auto-End Helper
const questionTimers = new Map<string, NodeJS.Timeout>();

function clearQuestionTimer(roomCode: string) {
  const existing = questionTimers.get(roomCode);
  if (existing) {
    clearTimeout(existing);
    questionTimers.delete(roomCode);
  }
}

function scheduleQuestionTimer(session: SessionState) {
  clearQuestionTimer(session.roomCode);
  // Theo yêu cầu: loại bỏ tính năng tính giờ trả lời câu hỏi, mặc định không tính giờ trả lời
  return;
}

function endQuestionAuthoritatively(session: SessionState, code: string) {
  clearQuestionTimer(code);
  const qIdx = session.currentQuestionIndex;

  if (!session.answers[qIdx]) {
    session.answers[qIdx] = {};
  }

  for (const [tId, team] of Object.entries(session.teams)) {
    if (!session.answers[qIdx][tId]) {
      const tAssignedSet: 'A' | 'B' = (session.isDualMode && (session.teamAssignments?.[tId] || session.teams[tId]?.assignedSet)) || 'A';
      const question = (session.isDualMode && tAssignedSet === 'B' && session.gameB)
        ? session.gameB.questions[qIdx]
        : session.game.questions[qIdx];

      if (!question) continue;
      const maxPoints = question.points || 10;

      // Check if there was an active draft saved by this team
      const draft = session.drafts?.[qIdx]?.[tId];
      const draftText = (draft?.textAnswer || '').trim();
      const draftDrawing = draft?.drawingDataUrl || '';
      const hasDraft = Boolean(draftText || (draftDrawing && draftDrawing.length > 50));

      let isCorrect = false;
      let pointsAwarded = 0;
      let answerText = 'Tự động nộp bài khi cô kết thúc câu';
      let openEndedObj: any = undefined;

      if (question.type === 'open_ended') {
        isCorrect = false;
        pointsAwarded = 0;

        if (hasDraft) {
          answerText = draftText
            ? `Tự luận: "${draftText.slice(0, 60)}${draftText.length > 60 ? '...' : ''}"`
            : (draftDrawing ? 'Bé đã vẽ tranh câu trả lời' : 'Bé đã làm bài tự luận');
        } else {
          answerText = 'Đã tự động nộp bài tự luận khi cô kết thúc câu';
        }

        openEndedObj = {
          textAnswer: draftText,
          drawingDataUrl: draftDrawing,
          teacherGrade: 'pending',
          teacherPoints: maxPoints,
          teacherFeedback: '',
          gradedAt: Date.now(),
        };
      } else if (question.type === 'word_drag_drop') {
        const chosen = (draftText || (draft as any)?.chosenLetter || '').trim().toLowerCase();
        const correctLetter = (question.missingLetters?.[0] || question.options?.find(o => o.isCorrect)?.text || '').trim().toLowerCase();
        const isAutoMatch = Boolean(chosen && correctLetter && chosen === correctLetter);
        isCorrect = isAutoMatch;
        pointsAwarded = isAutoMatch ? maxPoints : 0;
        answerText = chosen ? `Bé ghép chữ "${chosen}"` : 'Chưa kéo chữ cái';

        openEndedObj = {
          textAnswer: chosen,
          teacherGrade: isAutoMatch ? 'correct' : 'wrong',
          teacherPoints: pointsAwarded,
          teacherFeedback: '',
          gradedAt: Date.now(),
        };

        if (pointsAwarded > 0 && session.teams[tId]) {
          session.teams[tId].score += pointsAwarded;
        }
      } else if (question.type === 'drag_drop' && question.canvasConfig) {
        isCorrect = false;
        pointsAwarded = 0;
        answerText = 'Chưa hoàn thành phân loại';
      } else {
        isCorrect = false;
        pointsAwarded = 0;
        answerText = 'Chưa chọn đáp án';
      }

      session.answers[qIdx][tId] = {
        sessionId: session.roomCode,
        questionIndex: qIdx,
        questionId: question.id,
        teamId: tId,
        teamName: team.teamName,
        answerId: hasDraft ? 'draft_auto_submitted_end_question' : 'auto_submitted_end_question',
        answerText,
        submittedAt: Date.now(),
        responseTimeMs: Date.now() - (session.questionStartTime || Date.now()),
        isCorrect,
        pointsAwarded,
        assignedSet: tAssignedSet,
        openEnded: openEndedObj,
      };
    }
  }
  session.questionStatus = 'results';

  // Broadcast session_updated to all clients in room with role sanitization
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const cMeta = socketMap.get(client);
      if (cMeta && cMeta.roomCode === code) {
        sendToSocket(client, {
          type: 'session_updated',
          data: {
            session: cMeta.role === 'host'
              ? getSanitizedSessionForHost(session)
              : getSanitizedSessionForPlayer(session, cMeta.teamId),
          },
        });
      }
    }
  });
}

// Active Presence & Ping/Pong watchdog
// Checks both socket connectivity and application-level team heartbeats
const presenceWatchdog = setInterval(() => {
  const now = Date.now();

  // 1. Socket level ping-pong check
  wss.clients.forEach((ws) => {
    const meta = socketMap.get(ws);
    if (!meta) return;
    if (!meta.isAlive) {
      if (meta.roomCode && meta.teamId) {
        const session = sessions.get(meta.roomCode);
        if (session && session.teams[meta.teamId]) {
          session.teams[meta.teamId].online = false;
          broadcastToRoom(meta.roomCode, {
            type: 'team_presence_changed',
            data: { teamId: meta.teamId, online: false },
          });
          broadcastToRoom(meta.roomCode, {
            type: 'session_updated',
            data: { session: getSanitizedSessionForHost(session) },
          });
        }
      }
      return ws.terminate();
    }
    meta.isAlive = false;
    ws.ping();
  });

  // 2. Application-level heartbeat timeout check (detects dead mobile clients within 8 seconds)
  sessions.forEach((session, roomCode) => {
    let hasPresenceChange = false;
    Object.values(session.teams).forEach((team) => {
      if (team.online && team.lastSeen && (now - team.lastSeen > 8000)) {
        team.online = false;
        hasPresenceChange = true;
        broadcastToRoom(roomCode, {
          type: 'team_presence_changed',
          data: { teamId: team.teamId, online: false },
        });
      }
    });

    if (hasPresenceChange) {
      broadcastToRoom(roomCode, {
        type: 'session_updated',
        data: { session: getSanitizedSessionForHost(session) },
      });
    }
  });
}, 4000);

wss.on('close', () => {
  clearInterval(presenceWatchdog);
});

// WebSocket Connection handling
wss.on('connection', (ws: WebSocket) => {
  socketMap.set(ws, { ws, isAlive: true });

  ws.on('pong', () => {
    const meta = socketMap.get(ws);
    if (meta) meta.isAlive = true;
  });

  ws.on('message', (messageRaw: string) => {
    try {
      const msg = JSON.parse(messageRaw);
      const meta = socketMap.get(ws);
      if (!meta) return;

      switch (msg.type) {
        // ----------------------------------------------------
        // HOST: CREATE SESSION
        // ----------------------------------------------------
        case 'host:create_session': {
          const game: Game = msg.game;
          if (!game) {
            sendToSocket(ws, {
              type: 'error',
              data: { message: 'Không tìm thấy thông tin trò chơi để tạo phòng.' },
            });
            break;
          }
          const isDualMode = Boolean(msg.isDualMode && msg.gameB);
          const gameB: Game | undefined = isDualMode ? msg.gameB : undefined;
          const settings: GameSettings = {
            ...(msg.settings || game?.settings || {}),
            timePerQuestion: msg.settings?.timePerQuestion !== undefined ? Number(msg.settings.timePerQuestion) : (game?.settings?.timePerQuestion !== undefined ? Number(game.settings.timePerQuestion) : 0),
            maxTeams: Math.max(12, msg.settings?.maxTeams || game?.settings?.maxTeams || 12),
          };

          if (game && Array.isArray(game.questions)) {
            game.questions.forEach(q => {
              if (!q.gameUrl && game.gameUrl) {
                q.gameUrl = game.gameUrl;
              }
            });
          }

          if (gameB && Array.isArray(gameB.questions)) {
            gameB.questions.forEach(q => {
              if (!q.gameUrl && gameB.gameUrl) {
                q.gameUrl = gameB.gameUrl;
              }
            });
          }

          let code = generateRoomCode(5);
          while (sessions.has(code)) {
            code = generateRoomCode(5);
          }

          const session: SessionState = {
            sessionId: 'ses_' + Math.random().toString(36).substring(2, 9),
            roomCode: code,
            gameId: game.id,
            game,
            isDualMode,
            gameBId: gameB?.id,
            gameB,
            teamAssignments: {},
            status: 'lobby',
            currentQuestionIndex: 0,
            questionStatus: 'waiting',
            questionStartTime: null,
            questionTimeLimit: settings.timePerQuestion !== undefined ? settings.timePerQuestion : 0,
            teams: {},
            answers: {},
            createdAt: Date.now(),
            startedAt: null,
            endedAt: null,
            settings,
          };

          sessions.set(code, session);
          meta.roomCode = code;
          meta.role = 'host';

          sendToSocket(ws, {
            type: 'session_created',
            data: { session: getSanitizedSessionForHost(session) },
          });
          break;
        }

        // ----------------------------------------------------
        // HOST: REGISTER / RE-ATTACH EXISTING SESSION (ON REFRESH)
        // ----------------------------------------------------
        case 'host:register': {
          const code = (msg.roomCode || '').toUpperCase();
          const session = sessions.get(code);
          if (!session) {
            sendToSocket(ws, {
              type: 'error',
              data: { message: 'Phòng chơi không tồn tại hoặc đã hết hạn.' },
            });
            return;
          }
          meta.roomCode = code;
          meta.role = 'host';

          sendToSocket(ws, {
            type: 'session_updated',
            data: { session: getSanitizedSessionForHost(session) },
          });
          break;
        }

        // ----------------------------------------------------
        // PLAYER: JOIN ROOM
        // ----------------------------------------------------
        case 'player:join': {
          const code = (msg.roomCode || '').toUpperCase();
          const { teamId, deviceId } = msg;

          if (!code || !teamId || !deviceId) {
            sendToSocket(ws, {
              type: 'error',
              data: { message: 'Dữ liệu tham gia không hợp lệ.' },
            });
            return;
          }

          const session = sessions.get(code);
          if (!session) {
            sendToSocket(ws, {
              type: 'error',
              data: { message: 'Mã phòng không tồn tại hoặc đã hết hạn.' },
            });
            return;
          }

          if (session.status === 'ended') {
            sendToSocket(ws, {
              type: 'error',
              data: { message: 'Phiên chơi này đã kết thúc.' },
            });
            return;
          }

          // A team cannot log in on two devices simultaneously
          const existingTeam = session.teams[teamId];
          if (existingTeam && existingTeam.online && existingTeam.deviceId !== deviceId) {
            sendToSocket(ws, {
              type: 'error',
              data: { message: 'Đội này đã có thiết bị đang tham gia!' },
            });
            return;
          }

          const currentTeamCount = Object.keys(session.teams).length;
          const maxTeams = Math.max(12, session.settings.maxTeams || 12);
          if (!existingTeam && currentTeamCount >= maxTeams) {
            sendToSocket(ws, {
              type: 'error',
              data: { message: `Phòng đã đủ tối đa ${maxTeams} đội chơi.` },
            });
            return;
          }

          const preset = TEAM_PRESETS.find(p => p.id === teamId);
          const defaultTeamName = preset ? preset.name : `máy ${teamId}`;
          const customName = typeof msg.customTeamName === 'string' && msg.customTeamName.trim()
            ? msg.customTeamName.trim().slice(0, 30)
            : null;
          const teamName = customName || (existingTeam?.teamName || defaultTeamName);
          const teamIcon = preset ? preset.icon : '⭐';
          const teamColor = preset ? preset.bgColor : 'bg-blue-500';

          // Close previous socket for same device
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              const otherMeta = socketMap.get(client);
              if (otherMeta && otherMeta.deviceId === deviceId && otherMeta.roomCode === code) {
                client.terminate();
              }
            }
          });

          const joinedTeam: ConnectedTeam = existingTeam ? {
            ...existingTeam,
            teamName: customName || existingTeam.teamName,
            deviceId,
            online: true,
            lastSeen: Date.now(),
          } : {
            teamId,
            teamNumber: currentTeamCount + 1,
            teamName,
            icon: teamIcon,
            color: teamColor,
            deviceId,
            joinedAt: Date.now(),
            online: true,
            score: 0,
            lastSeen: Date.now(),
          };

          if (session.isDualMode) {
            if (!session.teamAssignments) session.teamAssignments = {};
            if (!session.teamAssignments[teamId]) {
              const countA = Object.values(session.teamAssignments).filter(s => s === 'A').length;
              const countB = Object.values(session.teamAssignments).filter(s => s === 'B').length;
              session.teamAssignments[teamId] = countA <= countB ? 'A' : 'B';
            }
            joinedTeam.assignedSet = session.teamAssignments[teamId];
          }

          session.teams[teamId] = joinedTeam;
          meta.roomCode = code;
          meta.role = 'player';
          meta.teamId = teamId;
          meta.deviceId = deviceId;

          sendToSocket(ws, {
            type: 'join_success',
            data: {
              session: getSanitizedSessionForPlayer(session, teamId),
              team: joinedTeam,
            },
          });

          broadcastToRoom(code, {
            type: 'team_joined',
            data: {
              team: joinedTeam,
              teams: session.teams,
            },
          }, ws);
          break;
        }

        // ----------------------------------------------------
        // HOST: START QUESTION
        // ----------------------------------------------------
        case 'host:start_question': {
          const code = (msg.roomCode || '').toUpperCase();
          const qIndex = Number(msg.questionIndex ?? 0);
          const session = sessions.get(code);

          if (!session || meta.role !== 'host') return;

          const totalQuestions = session.isDualMode
            ? Math.max(session.game.questions.length, session.gameB?.questions?.length || 0)
            : session.game.questions.length;
          if (qIndex >= totalQuestions) return;

          const question = session.game.questions[qIndex] || session.gameB?.questions[qIndex];
          if (!question) return;

          session.status = 'playing';
          if (!session.startedAt) session.startedAt = Date.now();
          session.currentQuestionIndex = qIndex;
          session.questionStatus = 'active';
          session.questionStartTime = Date.now();
          const roomTimeLimit = session.settings.timePerQuestion !== undefined ? Number(session.settings.timePerQuestion) : 0;
          const isNoLimit = roomTimeLimit === 0 || Boolean(question.noTimeLimit || question.timeLimit === 0);
          session.questionTimeLimit = isNoLimit ? 0 : roomTimeLimit;
          scheduleQuestionTimer(session);

          if (!session.answers[qIndex]) {
            session.answers[qIndex] = {};
          }

          sendToSocket(ws, {
            type: 'session_updated',
            data: { session: getSanitizedSessionForHost(session) },
          });

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client !== ws) {
              const cMeta = socketMap.get(client);
              if (cMeta && cMeta.roomCode === code) {
                sendToSocket(client, {
                  type: 'session_updated',
                  data: { session: getSanitizedSessionForPlayer(session, cMeta.teamId) },
                });
              }
            }
          });
          break;
        }

        // ----------------------------------------------------
        // PLAYER: SAVE OPEN ENDED DRAFT (Real-time auto-saving)
        // ----------------------------------------------------
        case 'player:save_open_ended_draft': {
          const code = (msg.roomCode || meta.roomCode || '').toUpperCase();
          const session = sessions.get(code);
          if (!session) return;
          const qIdx = Number(msg.questionIndex ?? session.currentQuestionIndex);
          const tId = msg.teamId || meta.teamId;
          if (!tId) return;
          if (!session.drafts) session.drafts = {};
          if (!session.drafts[qIdx]) session.drafts[qIdx] = {};

          const currentDraft = session.drafts[qIdx][tId] || {};
          const newDrawing = msg.drawingDataUrl !== undefined ? msg.drawingDataUrl : (currentDraft.drawingDataUrl || '');
          const newText = msg.textAnswer !== undefined ? msg.textAnswer : (currentDraft.textAnswer || '');

          session.drafts[qIdx][tId] = {
            textAnswer: newText,
            drawingDataUrl: newDrawing,
            hasDrawn: Boolean(msg.hasDrawn || (newDrawing && newDrawing.length > 50)),
            updatedAt: Date.now(),
          };

          // Always broadcast draft progress to host in real-time so teacher knows child has drawn
          broadcastToRoom(code, {
            type: 'draft_updated',
            data: {
              questionIndex: qIdx,
              teamId: tId,
              textAnswer: newText,
              drawingDataUrl: newDrawing,
              hasDrawn: Boolean(msg.hasDrawn || (newDrawing && newDrawing.length > 50)),
            },
          });

          // If question has ended (results phase) or answer was an auto-submit placeholder,
          // update existing answer immediately with this newly arrived drawing!
          const existingAns = session.answers[qIdx]?.[tId];
          const hasNewDrawing = Boolean(newDrawing && newDrawing.length > 50);
          const hasNewText = Boolean(newText && newText.trim());

          if (existingAns && (hasNewDrawing || hasNewText)) {
            if (!existingAns.openEnded) existingAns.openEnded = {};
            if (hasNewDrawing) existingAns.openEnded.drawingDataUrl = newDrawing;
            if (hasNewText) existingAns.openEnded.textAnswer = newText.trim();
            existingAns.answerText = newText.trim()
              ? `Tự luận: "${newText.trim().slice(0, 60)}${newText.trim().length > 60 ? '...' : ''}"`
              : (hasNewDrawing ? 'Bé đã vẽ tranh câu trả lời' : existingAns.answerText);

            broadcastToRoom(code, {
              type: 'session_updated',
              data: { session },
            });
          }
          break;
        }

        // ----------------------------------------------------
        // PLAYER: UPDATE TEAM NAME (Custom Name Modification)
        // ----------------------------------------------------
        case 'player:update_team_name': {
          const code = (msg.roomCode || '').toUpperCase();
          const { teamId, customTeamName } = msg;
          const session = sessions.get(code);
          if (session && session.teams[teamId] && typeof customTeamName === 'string' && customTeamName.trim()) {
            const cleanName = customTeamName.trim().slice(0, 30);
            session.teams[teamId].teamName = cleanName;
            broadcastToRoom(code, {
              type: 'team_joined',
              data: {
                team: session.teams[teamId],
                teams: session.teams,
              },
            });
            broadcastToRoom(code, {
              type: 'session_updated',
              data: { session },
            });
          }
          break;
        }

        // ----------------------------------------------------
        // PLAYER: SUBMIT ANSWER (Multiple Choice or Drag & Drop)
        // ----------------------------------------------------
        case 'player:submit_answer': {
          const code = (msg.roomCode || '').toUpperCase();
          const { teamId, questionIndex, answerId, answerIds, placements, liveProgress } = msg;
          const session = sessions.get(code);

          if (!session) return;
          const qIdx = Number(questionIndex);
          if (qIdx !== session.currentQuestionIndex) return;

          if (!session.answers[qIdx]) {
            session.answers[qIdx] = {};
          }

          let assignedSet: 'A' | 'B' = (session.isDualMode && (session.teamAssignments?.[teamId] || session.teams[teamId]?.assignedSet)) || 'A';
          // In dual mode, check which question set the option ID actually belongs to
          if (session.isDualMode) {
            const probeId = (Array.isArray(answerIds) && answerIds[0]) || answerId;
            if (probeId) {
              if (session.gameB?.questions[qIdx]?.options?.some(o => o.id === probeId)) {
                assignedSet = 'B';
              } else if (session.game?.questions[qIdx]?.options?.some(o => o.id === probeId)) {
                assignedSet = 'A';
              }
            }
          }

          const question = (session.isDualMode && assignedSet === 'B' && session.gameB)
            ? session.gameB.questions[qIdx]
            : session.game.questions[qIdx];
          if (!question) return;

          const existingAns = session.answers[qIdx]?.[teamId];
          const isOverwritingAutoSubmit = Boolean(
            existingAns &&
            (existingAns.answerId === 'auto_submitted_end_question' ||
             existingAns.answerId === 'draft_auto_submitted_end_question')
          );
          const isOpenEnded = question.type === 'open_ended' || Boolean(msg.openEnded);
          const isOpenEndedGrace = isOpenEnded &&
            session.questionStatus === 'results' &&
            qIdx === session.currentQuestionIndex;

          if (session.questionStatus !== 'active' && !isOverwritingAutoSubmit && !isOpenEndedGrace) {
            sendToSocket(ws, {
              type: 'answer_rejected',
              data: { reason: 'Câu hỏi đã kết thúc hoặc chưa bắt đầu.' },
            });
            return;
          }

          // If live intermediate progress update (e.g. 3/6 cards placed)
          if (liveProgress && placements) {
            const placedCount = Object.keys(placements).length;
            const totalRequired = question.canvasConfig?.elements.filter(e => e.isDraggable).length || 0;

            broadcastToRoom(code, {
              type: 'answer_progress_updated',
              data: {
                questionIndex: qIdx,
                teamId,
                placedCount,
                totalRequired,
              },
            });
            return;
          }

          const isMultipleChoiceQuestion = Boolean(
            question.allowMultipleCorrect ||
            (question.options && question.options.filter(o => o.isCorrect).length > 1)
          );
          const isWordDragQuestion = question.type === 'word_drag_drop' || msg.chosenLetter !== undefined;
          const isUpdatableQuestion = (isMultipleChoiceQuestion || isWordDragQuestion) && session.questionStatus === 'active';

          // Anti-duplicate check for final submission (allow replacing auto-submitted placeholder, open-ended grace update, or updating multiple-choice/word-drag selection while question is active)
          if (existingAns && !isOverwritingAutoSubmit && !isOpenEndedGrace && !isUpdatableQuestion) {
            sendToSocket(ws, {
              type: 'answer_rejected',
              data: { reason: 'Đội của bé đã gửi kết quả rồi!' },
            });
            return;
          }

          // If replacing auto-submitted placeholder or updating previous answer, refund previous points before calculating
          if ((isOverwritingAutoSubmit || isOpenEndedGrace || isUpdatableQuestion) && session.teams[teamId] && existingAns) {
            session.teams[teamId].score = Math.max(0, session.teams[teamId].score - (existingAns.pointsAwarded || 0));
          }

          const submittedAt = Date.now();
          const responseTimeMs = Math.max(0, submittedAt - (session.questionStartTime || submittedAt));
          const team = session.teams[teamId];

          let isCorrect = false;
          let pointsAwarded = 0;
          let answerText = '';
          let actions = undefined;
          let totalCorrect = undefined;
          let totalWrong = undefined;
          let placedCount = undefined;
          let totalItems = undefined;
          let htmlDetails: any = undefined;
          let openEnded: any = undefined;

          // Branch 0: Word Slot Drag & Drop (Tự động chấm điểm, học sinh chọn xong cô thu bài)
          if (question.type === 'word_drag_drop' || msg.chosenLetter !== undefined) {
            const rawChosen = msg.chosenLetter !== undefined
              ? msg.chosenLetter
              : (answerId || (Array.isArray(answerIds) ? answerIds[0] : '') || existingAns?.openEnded?.textAnswer || '');
            const chosen = String(rawChosen || '').trim().toLowerCase();
            const correctLetter = (question.missingLetters?.[0] || question.options?.find((o: any) => o.isCorrect)?.text || '').trim().toLowerCase();
            const maxPoints = question.points || 10;
            const isAutoMatch = Boolean(chosen && correctLetter && chosen === correctLetter);

            // Tự chấm điểm ngay lập tức (không cần cô chấm thủ công)
            isCorrect = isAutoMatch;
            pointsAwarded = isAutoMatch ? maxPoints : 0;
            answerText = chosen ? `Bé ghép chữ "${chosen}"` : 'Chưa kéo chữ cái';

            openEnded = {
              textAnswer: chosen,
              teacherGrade: isAutoMatch ? 'correct' : 'wrong',
              teacherPoints: pointsAwarded,
              teacherFeedback: '',
              gradedAt: submittedAt,
            };

            if (session.teams[teamId]) {
              session.teams[teamId].score += pointsAwarded;
            }
          } else if (question.type === 'drag_drop' && question.canvasConfig && placements) {
            const evalResult = GameEngine.evaluateDragDrop(
              question,
              placements,
              session.settings.speedBonus,
              responseTimeMs
            );
            isCorrect = evalResult.isCorrect;
            pointsAwarded = evalResult.pointsAwarded;
            actions = evalResult.actions;
            totalCorrect = evalResult.totalCorrect;
            totalWrong = evalResult.totalWrong;
            placedCount = evalResult.placedCount;
            totalItems = evalResult.totalRequired;
            answerText = `Kéo đúng ${totalCorrect}/${totalItems} thẻ`;

            if (session.teams[teamId]) {
              session.teams[teamId].score += pointsAwarded;
            }
          } else if (question.type === 'open_ended' || msg.openEnded) {
            // Branch 2: Open-ended / Essay / Drawing question
            const oePayload = msg.openEnded || {};
            const textAnswer = (oePayload.textAnswer || '').trim();
            let drawingDataUrl = oePayload.drawingDataUrl || '';

            // Robust fallback: If drawingDataUrl was empty in payload, check if draft or existingAns has it
            if (!drawingDataUrl || drawingDataUrl.length < 50) {
              const draftDrawing = session.drafts?.[qIdx]?.[teamId]?.drawingDataUrl;
              if (draftDrawing && draftDrawing.length > 50) {
                drawingDataUrl = draftDrawing;
              } else if (existingAns?.openEnded?.drawingDataUrl && existingAns.openEnded.drawingDataUrl.length > 50) {
                drawingDataUrl = existingAns.openEnded.drawingDataUrl;
              }
            }

            const effectiveText = textAnswer || session.drafts?.[qIdx]?.[teamId]?.textAnswer || existingAns?.openEnded?.textAnswer || '';
            const maxPoints = question.points || 10;

            const existingTeacherGrade = existingAns?.openEnded?.teacherGrade;
            const isAlreadyGraded = existingTeacherGrade && existingTeacherGrade !== 'pending';

            isCorrect = isAlreadyGraded ? existingAns.isCorrect : false;
            pointsAwarded = isAlreadyGraded ? (existingAns.pointsAwarded || 0) : 0;
            answerText = effectiveText
              ? `Tự luận: "${effectiveText.slice(0, 60)}${effectiveText.length > 60 ? '...' : ''}"`
              : (drawingDataUrl ? 'Bé đã vẽ tranh câu trả lời' : 'Đã nộp bài tự luận');

            openEnded = {
              textAnswer: effectiveText,
              drawingDataUrl,
              teacherGrade: existingTeacherGrade || 'pending',
              teacherPoints: existingAns?.openEnded?.teacherPoints ?? maxPoints,
              teacherFeedback: existingAns?.openEnded?.teacherFeedback || '',
              annotatedDrawingDataUrl: existingAns?.openEnded?.annotatedDrawingDataUrl,
              gradedAt: submittedAt,
            };

            if (isAlreadyGraded && session.teams[teamId]) {
              session.teams[teamId].score += pointsAwarded;
            }
          } else if (
            question.type === 'html_game' ||
            session.game.gameType === 'html_game' ||
            session.game.isZipArchive ||
            Boolean(question.htmlContent) ||
            msg.htmlGameResult
          ) {
            // Branch 2: Standalone HTML5 Game
            const res = msg.htmlGameResult || {};
            const dragDetails = Array.isArray(res.dragDetails)
              ? res.dragDetails
              : (Array.isArray(res.rawResult?.dragDetails) ? res.rawResult.dragDetails : undefined);

            let totalCorrectVal = res.totalCorrect !== undefined ? Number(res.totalCorrect) : (res.correct !== undefined ? Number(res.correct) : undefined);
            let totalItemsVal = res.totalQuestions !== undefined ? Number(res.totalQuestions) : (res.total !== undefined ? Number(res.total) : undefined);

            if ((totalItemsVal === undefined || totalItemsVal === 0) && dragDetails && dragDetails.length > 0) {
              totalItemsVal = dragDetails.length;
              totalCorrectVal = dragDetails.filter((d: any) => d.isCorrect).length;
            }

            totalCorrect = totalCorrectVal;
            totalItems = totalItemsVal;
            if (totalCorrect !== undefined && totalItems !== undefined) {
              totalWrong = Math.max(0, totalItems - totalCorrect);
            }

            // Real correctness calculation
            if (totalCorrect !== undefined && totalItems !== undefined && totalItems > 0) {
              isCorrect = totalCorrect === totalItems;
            } else if (res.isCorrect !== undefined) {
              isCorrect = Boolean(res.isCorrect);
            } else {
              isCorrect = false;
            }

            // Real score calculation - accurately reflect student's performance (No more flat 34!)
            const maxPoints = question.points || 30;
            if (res.score !== undefined && typeof res.score === 'number' && !isNaN(res.score)) {
              pointsAwarded = Math.max(0, Math.min(maxPoints, Math.round(res.score)));
            } else if (res.points !== undefined && typeof res.points === 'number' && !isNaN(res.points)) {
              pointsAwarded = Math.max(0, Math.min(maxPoints, Math.round(res.points)));
            } else if (totalCorrect !== undefined && totalItems !== undefined && totalItems > 0) {
              // Proportional to correct answers
              pointsAwarded = Math.round((totalCorrect / totalItems) * maxPoints);
            } else {
              pointsAwarded = isCorrect ? maxPoints : 0;
            }

            // Speed bonus ONLY if answers were 100% correct, pointsAwarded > 0, and session.settings.speedBonus
            if (isCorrect && pointsAwarded >= maxPoints && session.settings.speedBonus) {
              const limitMs = session.questionTimeLimit * 1000;
              const remainingFraction = Math.max(0, (limitMs - responseTimeMs) / limitMs);
              const bonus = Math.round(4 * remainingFraction);
              pointsAwarded += bonus;
            }

            const history = Array.isArray(res.history) ? res.history : (Array.isArray(res.rawResult?.history) ? res.rawResult.history : []);
            let answersList = Array.isArray(res.answersList) ? res.answersList : (Array.isArray(res.rawResult?.answersList) ? res.rawResult.answersList : undefined);

            if (!answersList && dragDetails && dragDetails.length > 0) {
              answersList = dragDetails.map((d: any) => ({
                question: 'Thẻ ' + (d.letter ? '[' + d.letter + '] ' : '') + (d.cardText || ''),
                chosenAnswer: d.status === 'unplaced' ? 'Chưa kéo vào ô' : ('Kéo vào: ' + (d.targetZone || '')),
                correctAnswer: d.expectedZone || d.targetZone || 'Đúng vị trí',
                isCorrect: Boolean(d.isCorrect),
                points: d.points || (d.isCorrect ? 5 : 0),
                teamName: team?.teamName || '',
              }));
            } else if (!answersList && history.length > 0) {
              answersList = history.map((h: any) => ({
                question: h.question || h.title || 'Câu hỏi',
                chosenAnswer: h.choiceText || h.text || h.answer || '',
                chosenImage: h.choiceImg || h.imageUrl,
                correctAnswer: h.correctText || h.correctAnswer || '',
                correctImage: h.correctChoiceImg || h.correctImg,
                isCorrect: Boolean(h.isCorrect),
                teamName: h.teamName,
              }));
            }

            htmlDetails = {
              summary: res.summary,
              score: pointsAwarded,
              totalCorrect,
              totalQuestions: totalItems,
              isCorrect,
              rawResult: res.rawResult || res,
              history: history.length > 0 ? history : undefined,
              answersList: answersList && answersList.length > 0 ? answersList : undefined,
              dragDetails: dragDetails && dragDetails.length > 0 ? dragDetails : undefined,
            };

            answerText = res.summary || (totalCorrect !== undefined && totalItems !== undefined
              ? `Đúng ${totalCorrect}/${totalItems} thẻ/câu (+${pointsAwarded}đ)`
              : pointsAwarded > 0 ? `Đạt ${pointsAwarded} điểm` : 'Chưa ghi điểm');

            if (session.teams[teamId]) {
              session.teams[teamId].score += pointsAwarded;
            }
          } else {
            // Branch 3: Classic multiple choice / image choice (single or multiple correct answers)
            const correctOptions = question.options?.filter(opt => opt.isCorrect) || [];
            const correctIds = correctOptions.map(opt => opt.id);
            const isMultipleQuestion = Boolean(
              question.allowMultipleCorrect ||
              correctIds.length > 1 ||
              (Array.isArray(answerIds) && answerIds.length > 1) ||
              (answerId && answerId.includes(','))
            );

            const selectedIds: string[] = Array.isArray(answerIds)
              ? answerIds
              : (answerId ? answerId.split(',').filter(Boolean) : []);

            const maxPoints = question.points || 10;

            if (isMultipleQuestion && correctIds.length > 1) {
              // Multiple correct answers question:
              // Points are calculated proportionally for each correct answer selected.
              // Example: 2 correct answers, 10 points -> 1 correct answer = 5 points.
              const totalCorrectRequired = correctIds.length;
              const pointsPerCorrect = maxPoints / totalCorrectRequired;

              const numCorrectSelected = selectedIds.filter(id => correctIds.includes(id)).length;
              const numWrongSelected = selectedIds.filter(id => !correctIds.includes(id)).length;

              // Penalty for wrong options ensures selecting everything does not grant full marks
              const netCorrect = Math.max(0, numCorrectSelected - numWrongSelected);
              pointsAwarded = Math.round(netCorrect * pointsPerCorrect);

              // 100% correct requires selecting all correct options and no wrong options
              isCorrect = (numCorrectSelected === totalCorrectRequired) && (numWrongSelected === 0);

              totalCorrect = numCorrectSelected;
              totalWrong = numWrongSelected;
              totalItems = totalCorrectRequired;

              const selectedOptions = question.options?.filter(opt => selectedIds.includes(opt.id)) || [];
              answerText = selectedOptions.map(o => o.text).join(', ');
            } else if (isMultipleQuestion && correctIds.length === 1) {
              // Question flagged as multiple, but only 1 option is marked correct
              const numCorrectSelected = selectedIds.filter(id => correctIds.includes(id)).length;
              const numWrongSelected = selectedIds.filter(id => !correctIds.includes(id)).length;

              isCorrect = (numCorrectSelected === 1) && (numWrongSelected === 0);
              pointsAwarded = isCorrect ? maxPoints : 0;
              totalCorrect = numCorrectSelected;
              totalWrong = numWrongSelected;
              totalItems = 1;

              const selectedOptions = question.options?.filter(opt => selectedIds.includes(opt.id)) || [];
              answerText = selectedOptions.map(o => o.text).join(', ');
            } else {
              // Single choice question
              const chosenId = selectedIds[0] || answerId;
              let selectedOption = question.options?.find(opt => opt.id === chosenId);
              if (!selectedOption && session.isDualMode) {
                const otherQ = (assignedSet === 'B') ? session.game.questions[qIdx] : session.gameB?.questions[qIdx];
                selectedOption = otherQ?.options?.find(opt => opt.id === chosenId);
                if (selectedOption) {
                  assignedSet = (assignedSet === 'B') ? 'A' : 'B';
                }
              }
              isCorrect = Boolean(selectedOption?.isCorrect);
              pointsAwarded = isCorrect ? maxPoints : 0;
              answerText = selectedOption ? selectedOption.text : (chosenId || '');
              totalCorrect = isCorrect ? 1 : 0;
              totalWrong = isCorrect ? 0 : 1;
              totalItems = 1;
            }

            // Speed bonus ONLY applies if all answers are 100% correct
            if (isCorrect && pointsAwarded >= maxPoints && session.settings.speedBonus) {
              const limitMs = session.questionTimeLimit * 1000;
              const remainingFraction = Math.max(0, (limitMs - responseTimeMs) / limitMs);
              const bonus = Math.round(5 * remainingFraction);
              pointsAwarded += bonus;
            }

            if (pointsAwarded > 0 && session.teams[teamId]) {
              session.teams[teamId].score += pointsAwarded;
            }
          }

          const record: TeamAnswer = {
            sessionId: session.sessionId,
            questionIndex: qIdx,
            questionId: question.id,
            teamId,
            teamName: team ? team.teamName : teamId,
            answerId: answerId || (Array.isArray(answerIds) ? answerIds.join(',') : 'submission'),
            answerIds: Array.isArray(answerIds) ? answerIds : undefined,
            answerText,
            submittedAt,
            responseTimeMs,
            isCorrect,
            pointsAwarded,
            assignedSet,
            actions,
            totalCorrect,
            totalWrong,
            placedCount,
            totalItems,
            htmlDetails,
            openEnded,
          };

          session.answers[qIdx][teamId] = record;

          // Acknowledge player
          sendToSocket(ws, {
            type: 'answer_received',
            data: {
              questionIndex: qIdx,
              answerId: record.answerId,
              message: 'Đã hoàn thành câu hỏi!',
              isCorrect,
              pointsAwarded,
            },
          });

          // Masked progress broadcast to host
          const sanitizedStatusList: Record<string, { answered: boolean; submittedAt: number; placedCount?: number; totalItems?: number }> = {};
          for (const [tId, ans] of Object.entries(session.answers[qIdx])) {
            sanitizedStatusList[tId] = {
              answered: true,
              submittedAt: ans.submittedAt,
              placedCount: ans.placedCount,
              totalItems: ans.totalItems,
            };
          }

          broadcastToRoom(code, {
            type: 'answer_status_updated',
            data: {
              questionIndex: qIdx,
              teamId,
              answeredCount: Object.keys(session.answers[qIdx]).length,
              totalTeams: Object.keys(session.teams).length,
              answeredTeams: sanitizedStatusList,
            },
          });

          // If child was completing an auto-submitted placeholder or grace update, re-sync full session so teacher sees actual answer
          if (isOverwritingAutoSubmit || isOpenEndedGrace) {
            broadcastToRoom(code, {
              type: 'session_updated',
              data: { session },
            });
          }
          break;
        }

        // ----------------------------------------------------
        // HOST: GRADE OPEN ENDED QUESTION
        // ----------------------------------------------------
        case 'host:grade_open_ended': {
          const code = (msg.roomCode || '').toUpperCase();
          const session = sessions.get(code);
          if (!session || meta.role !== 'host') return;

          const qIdx = Number(msg.questionIndex);
          const tId = msg.teamId;
          const ans = session.answers[qIdx]?.[tId];
          if (ans) {
            const oldPoints = Number(ans.pointsAwarded || 0);
            const newPoints = Math.max(0, Number(msg.points !== undefined ? msg.points : 0));
            const pointDiff = newPoints - oldPoints;
            const isCorr = Boolean(msg.isCorrect);
            ans.pointsAwarded = newPoints;
            ans.isCorrect = isCorr;

            if (!ans.openEnded) {
              ans.openEnded = {};
            }
            ans.openEnded.teacherPoints = newPoints;
            ans.openEnded.teacherGrade = isCorr ? 'correct' : 'wrong';
            ans.openEnded.teacherFeedback = String(msg.feedback || '').trim();
            if (msg.annotatedDrawingDataUrl) {
              ans.openEnded.annotatedDrawingDataUrl = String(msg.annotatedDrawingDataUrl);
            }
            ans.openEnded.gradedAt = Date.now();

            if (session.teams[tId]) {
              session.teams[tId].score = Math.max(0, (session.teams[tId].score || 0) + pointDiff);
            }

            broadcastToRoom(code, {
              type: 'session_updated',
              data: { session },
            });
          }
          break;
        }

        // ----------------------------------------------------
        // HOST: END QUESTION (SHOW RESULTS)
        // Auto-submit all pending teams even if they haven't submitted
        // ----------------------------------------------------
        case 'host:end_question': {
          const code = (msg.roomCode || meta.roomCode || '').toUpperCase();
          const session = sessions.get(code);
          if (!session) return;
          endQuestionAuthoritatively(session, code);
          break;
        }

        // ----------------------------------------------------
        // HOST: NEXT QUESTION
        // ----------------------------------------------------
        case 'host:next_question': {
          const code = (msg.roomCode || meta.roomCode || '').toUpperCase();
          const session = sessions.get(code);
          if (!session || meta.role !== 'host') return;

          const maxQuestions = session.isDualMode
            ? Math.max(session.game.questions.length, session.gameB?.questions?.length || 0)
            : session.game.questions.length;
          const nextIndex = session.currentQuestionIndex + 1;
          if (nextIndex >= maxQuestions) {
            clearQuestionTimer(code);
            session.status = 'ended';
            session.endedAt = Date.now();
            session.questionStatus = 'results';

            broadcastToRoom(code, {
              type: 'game_ended',
              data: { session },
            });
          } else {
            session.currentQuestionIndex = nextIndex;
            session.questionStatus = 'active';
            session.questionStartTime = Date.now();
            const nextQ = session.game.questions[nextIndex] || session.gameB?.questions[nextIndex];
            const roomTimeLimit = session.settings.timePerQuestion !== undefined ? Number(session.settings.timePerQuestion) : 0;
            const isNextNoLimit = roomTimeLimit === 0 || Boolean(nextQ?.noTimeLimit || nextQ?.timeLimit === 0);
            session.questionTimeLimit = isNextNoLimit ? 0 : roomTimeLimit;
            scheduleQuestionTimer(session);

            if (!session.answers[nextIndex]) {
              session.answers[nextIndex] = {};
            }

            sendToSocket(ws, {
              type: 'session_updated',
              data: { session: getSanitizedSessionForHost(session) },
            });

            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN && client !== ws) {
                const cMeta = socketMap.get(client);
                if (cMeta && cMeta.roomCode === code) {
                  sendToSocket(client, {
                    type: 'session_updated',
                    data: { session: getSanitizedSessionForPlayer(session, cMeta.teamId) },
                  });
                }
              }
            });
          }
          break;
        }

        // ----------------------------------------------------
        // HOST: SHOW LEADERBOARD
        // ----------------------------------------------------
        case 'host:show_leaderboard': {
          const code = (msg.roomCode || '').toUpperCase();
          const session = sessions.get(code);
          if (!session || meta.role !== 'host') return;

          session.questionStatus = 'leaderboard';
          broadcastToRoom(code, {
            type: 'session_updated',
            data: { session },
          });
          break;
        }

        // ----------------------------------------------------
        // HOST: END GAME EARLY
        // ----------------------------------------------------
        case 'host:end_game': {
          const code = (msg.roomCode || '').toUpperCase();
          const session = sessions.get(code);
          if (!session || meta.role !== 'host') return;

          session.status = 'ended';
          session.endedAt = Date.now();
          broadcastToRoom(code, {
            type: 'game_ended',
            data: { session },
          });
          break;
        }

        // ----------------------------------------------------
        // HOST: RESTART GAME
        // ----------------------------------------------------
        case 'host:restart_game': {
          const code = (msg.roomCode || '').toUpperCase();
          const session = sessions.get(code);
          if (!session || meta.role !== 'host') return;

          session.status = 'lobby';
          session.currentQuestionIndex = 0;
          session.questionStatus = 'waiting';
          session.questionStartTime = null;
          session.startedAt = null;
          session.endedAt = null;
          session.answers = {};
          for (const teamId of Object.keys(session.teams)) {
            session.teams[teamId].score = 0;
          }

          broadcastToRoom(code, {
            type: 'session_updated',
            data: { session: getSanitizedSessionForHost(session) },
          });
          break;
        }

        // ----------------------------------------------------
        // SYNC REQUEST
        // ----------------------------------------------------
        case 'sync_request': {
          const code = (msg.roomCode || '').toUpperCase();
          const session = sessions.get(code);
          if (!session) {
            sendToSocket(ws, {
              type: 'error',
              data: { message: 'Phòng chơi không tồn tại hoặc đã hết hạn.' },
            });
            return;
          }

          meta.roomCode = code;
          meta.role = msg.role;
          meta.teamId = msg.teamId;
          meta.deviceId = msg.deviceId;

          if (msg.teamId && session.teams[msg.teamId]) {
            session.teams[msg.teamId].online = true;
            session.teams[msg.teamId].lastSeen = Date.now();
            broadcastToRoom(code, {
              type: 'team_presence_changed',
              data: { teamId: msg.teamId, online: true },
            }, ws);
          }

          if (meta.role === 'host') {
            sendToSocket(ws, {
              type: 'session_updated',
              data: { session: getSanitizedSessionForHost(session) },
            });
          } else {
            sendToSocket(ws, {
              type: 'session_updated',
              data: { session: getSanitizedSessionForPlayer(session, msg.teamId) },
            });
          }
          break;
        }

        // ----------------------------------------------------
        // PLAYER: LEAVE ROOM
        // ----------------------------------------------------
        case 'player:leave': {
          const code = (msg.roomCode || meta.roomCode || '').toUpperCase();
          const teamId = msg.teamId || meta.teamId;
          const session = sessions.get(code);

          if (session && teamId && session.teams[teamId]) {
            session.teams[teamId].online = false;
            session.teams[teamId].lastSeen = Date.now();
            meta.teamId = undefined;
            meta.roomCode = undefined;
            meta.role = undefined;

            broadcastToRoom(code, {
              type: 'team_presence_changed',
              data: { teamId, online: false },
            });
            broadcastToRoom(code, {
              type: 'session_updated',
              data: { session: getSanitizedSessionForHost(session) },
            });
          }
          break;
        }

        // ----------------------------------------------------
        // PLAYER: HEARTBEAT (Every 3-4s to keep connection alive)
        // ----------------------------------------------------
        case 'player:heartbeat': {
          const code = (msg.roomCode || meta.roomCode || '').toUpperCase();
          const teamId = msg.teamId || meta.teamId;
          const session = sessions.get(code);

          meta.isAlive = true;

          if (session && teamId && session.teams[teamId]) {
            const team = session.teams[teamId];
            const wasOffline = !team.online;
            team.lastSeen = Date.now();
            team.online = true;

            if (wasOffline) {
              broadcastToRoom(code, {
                type: 'team_presence_changed',
                data: { teamId, online: true },
              });
              broadcastToRoom(code, {
                type: 'session_updated',
                data: { session: getSanitizedSessionForHost(session) },
              });
            }
          }
          break;
        }

        // ----------------------------------------------------
        // HOST: ASSIGN TEAM QUESTION SET (DUAL MODE)
        // ----------------------------------------------------
        case 'host:assign_team_set': {
          const code = (msg.roomCode || meta.roomCode || '').toUpperCase();
          const { teamId, set } = msg;
          const session = sessions.get(code);
          if (!session || !session.isDualMode) return;
          if (!session.teamAssignments) session.teamAssignments = {};
          if (set === 'A' || set === 'B') {
            session.teamAssignments[teamId] = set;
            if (session.teams[teamId]) {
              session.teams[teamId].assignedSet = set;
            }
          }
          sendToSocket(ws, {
            type: 'session_updated',
            data: { session: getSanitizedSessionForHost(session) },
          });
          // Broadcast to players so their state updates
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              const cMeta = socketMap.get(client);
              if (cMeta && cMeta.roomCode === code) {
                if (cMeta.role === 'host') {
                  sendToSocket(client, {
                    type: 'session_updated',
                    data: { session: getSanitizedSessionForHost(session) },
                  });
                } else if (cMeta.role === 'player' && cMeta.teamId) {
                  sendToSocket(client, {
                    type: 'session_updated',
                    data: { session: getSanitizedSessionForPlayer(session, cMeta.teamId) },
                  });
                }
              }
            }
          });
          break;
        }

        case 'host:set_all_team_assignments': {
          const code = (msg.roomCode || meta.roomCode || '').toUpperCase();
          const { assignments } = msg;
          const session = sessions.get(code);
          if (!session || !session.isDualMode || !assignments) return;
          if (!session.teamAssignments) session.teamAssignments = {};
          for (const [tId, setVal] of Object.entries(assignments as Record<string, 'A' | 'B'>)) {
            if (setVal === 'A' || setVal === 'B') {
              session.teamAssignments[tId] = setVal;
              if (session.teams[tId]) {
                session.teams[tId].assignedSet = setVal;
              }
            }
          }
          sendToSocket(ws, {
            type: 'session_updated',
            data: { session: getSanitizedSessionForHost(session) },
          });
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              const cMeta = socketMap.get(client);
              if (cMeta && cMeta.roomCode === code) {
                if (cMeta.role === 'host') {
                  sendToSocket(client, {
                    type: 'session_updated',
                    data: { session: getSanitizedSessionForHost(session) },
                  });
                } else if (cMeta.role === 'player' && cMeta.teamId) {
                  sendToSocket(client, {
                    type: 'session_updated',
                    data: { session: getSanitizedSessionForPlayer(session, cMeta.teamId) },
                  });
                }
              }
            }
          });
          break;
        }

        // ----------------------------------------------------
        // HOST: UPDATE ROOM SETTINGS (e.g. time limit from waiting room)
        // ----------------------------------------------------
        case 'host:update_room_settings': {
          const code = (msg.roomCode || meta.roomCode || '').toUpperCase();
          const session = sessions.get(code);
          if (session && meta.role === 'host' && msg.settings) {
            session.settings = {
              ...session.settings,
              ...msg.settings,
            };
            if (msg.settings.timePerQuestion !== undefined) {
              const newTime = Number(msg.settings.timePerQuestion) || 0;
              session.settings.timePerQuestion = newTime;
              session.questionTimeLimit = newTime;
            }
            broadcastToRoom(code, {
              type: 'session_updated',
              data: { session: getSanitizedSessionForHost(session) },
            });
          }
          break;
        }

        // ----------------------------------------------------
        // HOST: KICK / REMOVE OFFLINE TEAM
        // ----------------------------------------------------
        case 'host:kick_team': {
          const code = (msg.roomCode || meta.roomCode || '').toUpperCase();
          const teamId = msg.teamId;
          const session = sessions.get(code);

          if (session && meta.role === 'host' && teamId && session.teams[teamId]) {
            delete session.teams[teamId];
            broadcastToRoom(code, {
              type: 'session_updated',
              data: { session: getSanitizedSessionForHost(session) },
            });
            broadcastToRoom(code, {
              type: 'team_removed',
              data: { teamId },
            });
          }
          break;
        }

        // ----------------------------------------------------
        // HOST: TERMINATE ENTIRE SESSION AND CLOSE ROOM
        // ----------------------------------------------------
        case 'host:terminate_session': {
          const code = (msg.roomCode || meta.roomCode || '').toUpperCase();
          clearQuestionTimer(code);
          const session = sessions.get(code);
          if (session && meta.role === 'host') {
            broadcastToRoom(code, {
              type: 'game_ended',
              data: { reason: 'terminated_by_host', message: 'Cô giáo đã kết thúc phiên học.' },
            });
            sessions.delete(code);
            console.log(`[Session Terminated] Host closed room ${code}`);
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[WS Message Error]', err);
    }
  });

  ws.on('close', () => {
    const meta = socketMap.get(ws);
    if (meta && meta.roomCode && meta.teamId) {
      const session = sessions.get(meta.roomCode);
      if (session && session.teams[meta.teamId]) {
        session.teams[meta.teamId].online = false;
        session.teams[meta.teamId].lastSeen = Date.now();
        broadcastToRoom(meta.roomCode, {
          type: 'team_presence_changed',
          data: { teamId: meta.teamId, online: false },
        });
        broadcastToRoom(meta.roomCode, {
          type: 'session_updated',
          data: { session: getSanitizedSessionForHost(session) },
        });
      }
    }
    socketMap.delete(ws);
  });
});

// REST API Endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    activeSessions: sessions.size,
    timestamp: Date.now(),
  });
});

app.get('/api/session/:roomCode', (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const code = (req.params.roomCode || '').trim().toUpperCase();
  const session = sessions.get(code);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ session: getSanitizedSessionForHost(session) });
});

function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!iface.address.startsWith('169.254.') && !iface.address.startsWith('127.')) {
          addresses.push(iface.address);
        }
      }
    }
  }
  return addresses;
}

app.get('/api/network-info', (req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const hostHeader = req.get('host') || '';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const requestOrigin = hostHeader ? `${proto}://${hostHeader}` : '';
  const rawAppUrl = process.env.APP_URL || '';
  res.json({
    appUrl: rawAppUrl,
    requestOrigin,
    localIps: getLocalIpAddresses(),
    port: PORT,
  });
});

// Endpoint to store extracted ZIP game files for static serving
app.post('/api/games/save-zip-assets', (req: Request, res: Response) => {
  try {
    const { gameId, filesMap, mainHtmlPath } = req.body;
    if (!gameId || !filesMap) {
      return res.status(400).json({ error: 'Missing gameId or filesMap' });
    }

    const safeGameId = String(gameId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetDir = path.join(GAMES_STORAGE_DIR, safeGameId);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const [relativePath, fileObj] of Object.entries(filesMap as Record<string, any>)) {
      const safeRelative = relativePath.replace(/^(\.\.[\/\\])+/, '');
      const destPath = path.join(targetDir, safeRelative);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      if (fileObj.isBase64) {
        fs.writeFileSync(destPath, Buffer.from(fileObj.content, 'base64'));
      } else {
        let content = fileObj.content;
        const lower = safeRelative.toLowerCase();
        if ((lower.endsWith('.html') || lower.endsWith('.htm')) && !content.includes('__vui_hoc_sandbox_shim__')) {
          if (content.includes('</body>')) {
            content = content.replace('</body>', `${VUIHOC_HTML_SHIM}</body>`);
          } else if (content.includes('</head>')) {
            content = content.replace('</head>', `${VUIHOC_HTML_SHIM}</head>`);
          } else {
            content = `${content}${VUIHOC_HTML_SHIM}`;
          }
        }
        fs.writeFileSync(destPath, content, 'utf-8');
      }
    }

    const gameUrl = `/api/games/static/${safeGameId}/${mainHtmlPath || 'index.html'}`;
    res.json({ success: true, gameUrl });
  } catch (err: any) {
    console.error('Error saving zip assets:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// Custom games & Trash database on server to eliminate localStorage quota limits
const CUSTOM_GAMES_FILE = path.join(GAMES_STORAGE_DIR, 'custom_games_list.json');
const TRASH_GAMES_FILE = path.join(GAMES_STORAGE_DIR, 'trash_games_list.json');
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function readCustomGames(): any[] {
  if (!fs.existsSync(CUSTOM_GAMES_FILE)) return [];
  try {
    const raw = fs.readFileSync(CUSTOM_GAMES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeCustomGames(games: any[]) {
  fs.writeFileSync(CUSTOM_GAMES_FILE, JSON.stringify(games, null, 2), 'utf-8');
}

function readTrashGames(): any[] {
  if (!fs.existsSync(TRASH_GAMES_FILE)) return [];
  try {
    const raw = fs.readFileSync(TRASH_GAMES_FILE, 'utf-8');
    const list: any[] = JSON.parse(raw);
    const now = Date.now();
    // Auto purge older than 7 days
    const valid = list.filter((g) => {
      const isExpired = g.deletedAt && now - g.deletedAt > SEVEN_DAYS_MS;
      if (isExpired) {
        // Clean static directory if exists
        const staticDir = path.join(GAMES_STORAGE_DIR, String(g.id).replace(/[^a-zA-Z0-9_-]/g, '_'));
        if (fs.existsSync(staticDir)) {
          try {
            fs.rmSync(staticDir, { recursive: true, force: true });
          } catch {}
        }
      }
      return !isExpired;
    });

    if (valid.length !== list.length) {
      fs.writeFileSync(TRASH_GAMES_FILE, JSON.stringify(valid, null, 2), 'utf-8');
    }
    return valid;
  } catch {
    return [];
  }
}

function writeTrashGames(games: any[]) {
  fs.writeFileSync(TRASH_GAMES_FILE, JSON.stringify(games, null, 2), 'utf-8');
}

app.get('/api/games/custom', (_req: Request, res: Response) => {
  try {
    const games = readCustomGames().filter((g) => !g.deletedAt);
    return res.json(games);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/games/custom', (req: Request, res: Response) => {
  try {
    const game = req.body;
    if (!game || !game.id) {
      return res.status(400).json({ error: 'Missing game or game.id' });
    }
    const games = readCustomGames();
    const idx = games.findIndex(g => g.id === game.id);
    if (idx >= 0) {
      games[idx] = game;
    } else {
      games.unshift(game);
    }
    writeCustomGames(games);

    // Also remove from trash if it was in trash
    const trash = readTrashGames().filter(g => g.id !== game.id);
    writeTrashGames(trash);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/games/custom/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const games = readCustomGames();
    const target = games.find(g => g.id === id);
    const updatedGames = games.filter(g => g.id !== id);
    writeCustomGames(updatedGames);

    if (target) {
      target.deletedAt = Date.now();
      const trash = readTrashGames().filter(g => g.id !== id);
      trash.unshift(target);
      writeTrashGames(trash);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Trash APIs
app.get('/api/games/trash', (_req: Request, res: Response) => {
  try {
    const trash = readTrashGames();
    return res.json(trash);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/games/trash/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bodyGame = req.body;
    const games = readCustomGames();
    const target = games.find(g => g.id === id) || bodyGame;
    const updatedGames = games.filter(g => g.id !== id);
    writeCustomGames(updatedGames);

    if (target && target.id) {
      target.deletedAt = Date.now();
      const trash = readTrashGames().filter(g => g.id !== id);
      trash.unshift(target);
      writeTrashGames(trash);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/games/restore/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const trash = readTrashGames();
    const target = trash.find(g => g.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Game not found in trash' });
    }
    const updatedTrash = trash.filter(g => g.id !== id);
    writeTrashGames(updatedTrash);

    delete target.deletedAt;
    const games = readCustomGames();
    const idx = games.findIndex(g => g.id === id);
    if (idx >= 0) {
      games[idx] = target;
    } else {
      games.unshift(target);
    }
    writeCustomGames(games);

    return res.json({ success: true, game: target });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/session/:roomCode/grade-open-ended', (req: Request, res: Response) => {
  try {
    const roomCode = String(req.params.roomCode || '').toUpperCase();
    const { questionIndex, teamId, points, isCorrect, feedback, annotatedDrawingDataUrl } = req.body;
    const session = sessions.get(roomCode);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const qIdx = Number(questionIndex);
    const ans = session.answers[qIdx]?.[teamId];
    if (!ans) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    const oldPoints = Number(ans.pointsAwarded || 0);
    const newPoints = Math.max(0, Number(points !== undefined ? points : 0));
    const pointDiff = newPoints - oldPoints;
    const isCorr = Boolean(isCorrect);
    ans.pointsAwarded = newPoints;
    ans.isCorrect = isCorr;

    if (!ans.openEnded) {
      ans.openEnded = {};
    }
    ans.openEnded.teacherPoints = newPoints;
    ans.openEnded.teacherGrade = isCorr ? 'correct' : 'wrong';
    ans.openEnded.teacherFeedback = String(feedback || '').trim();
    if (annotatedDrawingDataUrl) {
      ans.openEnded.annotatedDrawingDataUrl = String(annotatedDrawingDataUrl);
    }
    ans.openEnded.gradedAt = Date.now();

    if (session.teams[teamId]) {
      session.teams[teamId].score = Math.max(0, (session.teams[teamId].score || 0) + pointDiff);
    }

    broadcastToRoom(roomCode, {
      type: 'session_updated',
      data: { session },
    });

    return res.json({ success: true, session });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/games/trash/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const trash = readTrashGames().filter(g => g.id !== id);
    writeTrashGames(trash);

    // Clean static directory
    const staticDir = path.join(GAMES_STORAGE_DIR, String(id).replace(/[^a-zA-Z0-9_-]/g, '_'));
    if (fs.existsSync(staticDir)) {
      try {
        fs.rmSync(staticDir, { recursive: true, force: true });
      } catch {}
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/games/trash', (_req: Request, res: Response) => {
  try {
    const trash = readTrashGames();
    for (const g of trash) {
      const staticDir = path.join(GAMES_STORAGE_DIR, String(g.id).replace(/[^a-zA-Z0-9_-]/g, '_'));
      if (fs.existsSync(staticDir)) {
        try {
          fs.rmSync(staticDir, { recursive: true, force: true });
        } catch {}
      }
    }
    writeTrashGames([]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Natural Vietnamese Text-to-Speech proxy with in-memory caching
const ttsCache = new Map<string, Buffer>();

app.get('/api/tts', async (req: Request, res: Response) => {
  try {
    const rawText = String(req.query.text || '').trim();
    if (!rawText) {
      return res.status(400).send('Missing text parameter');
    }

    // Clean emojis, decorative characters, and quotation marks for clear preschool reading
    const text = rawText
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[⭐✨🎈🐶🐱🦁🐘🐰🦆🐟🦀🐒🐻🍎🍌🍇🍓🍊🍉🌽🚗🚌✈️🚲✍️🎯🧩💡❓📝🔘☑️✓]/g, '')
      .replace(/[""''«»]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      return res.status(400).send('Empty text after clean');
    }

    const cacheKey = text.toLowerCase();
    if (ttsCache.has(cacheKey)) {
      const cached = ttsCache.get(cacheKey)!;
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', String(cached.length));
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached);
    }

    // Split text into chunks <= 180 characters if needed
    const chunks: string[] = [];
    if (text.length <= 180) {
      chunks.push(text);
    } else {
      const words = text.split(' ');
      let currentChunk = '';
      for (const w of words) {
        if ((currentChunk + ' ' + w).trim().length <= 180) {
          currentChunk = (currentChunk + ' ' + w).trim();
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = w;
        }
      }
      if (currentChunk) chunks.push(currentChunk);
    }

    // Fetch all chunks in parallel for sub-second latency
    const buffers: Buffer[] = await Promise.all(
      chunks.map(async (chunk) => {
        const trimmed = chunk.trim();
        if (!trimmed) return Buffer.alloc(0);
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(trimmed)}&tl=vi&client=tw-ob`;
        const response = await fetch(ttsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/',
          },
        });
        if (!response.ok) {
          throw new Error(`TTS upstream error: ${response.status}`);
        }
        const arrayBuf = await response.arrayBuffer();
        return Buffer.from(arrayBuf);
      })
    );

    const validBuffers = buffers.filter((b) => b.length > 0);
    if (validBuffers.length === 0) {
      return res.status(500).send('No audio generated');
    }

    const finalBuffer = Buffer.concat(validBuffers);
    if (ttsCache.size > 300) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, finalBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(finalBuffer.length));
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(finalBuffer);
  } catch (err: any) {
    console.error('Error generating TTS:', err);
    return res.status(500).json({ error: 'TTS failed' });
  }
});

// Configure Vite or Static Serve
function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}
const PORT = getPort();

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const indexHtmlPath = path.resolve(distPath, 'index.html');
  const hasDist = fs.existsSync(indexHtmlPath);
  const isProduction = process.env.NODE_ENV === 'production' && hasDist;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Vui Hoc Cung Co] Server is running on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[Vui Hoc Cung Co] Received ${signal}, closing server...`);
    try {
      wss.close();
      server.close(() => {
        process.exit(0);
      });
    } catch {
      process.exit(0);
    }
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer();
