import JSZip from 'jszip';

export interface ExtractedZipResult {
  gameId?: string;
  gameUrl?: string;
  mainHtmlPath: string;
  bundledHtml: string;
  title: string;
  fileCount: number;
  fileList: string[];
  htmlFiles: string[];
  filesMap: Record<string, { content: string; isBase64: boolean; mimeType: string }>;
  isFallbackFromError?: boolean;
  fallbackReason?: string;
  hasValidAlternative?: boolean;
  hasSubstantialContent: boolean;
  textFiles: Record<string, string>;
  binaryFiles: Record<string, string>;
  originalCandidateCount: number;
}

/**
 * Checks whether an HTML string is essentially empty, trivial, or lacking playable markup
 */
export function isTrivialHtml(html: string | undefined): boolean {
  if (!html) return true;
  const trimmed = html.trim();
  if (trimmed.length < 40) return true;

  // Clean out comments and tags to check text content
  const clean = trimmed
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, '')
    .trim();

  // Common error indicators
  const isErrorDoc =
    /<title[^>]*>(404|Error|Not Found|Lỗi|Failed)<\/title>/i.test(trimmed) ||
    /<h1>\s*(404|Not Found|Error|File Not Found|Lỗi)\s*<\/h1>/i.test(trimmed);
  if (isErrorDoc) return true;

  const hasScript = /<script\b/i.test(trimmed);
  const hasCanvas = /<canvas\b/i.test(trimmed);
  const hasInteractive = /<(input|button|svg|canvas|video|audio|select|textarea)\b/i.test(trimmed);
  const hasImages = /<img\b/i.test(trimmed);
  const hasMultipleDivs = (trimmed.match(/<div\b/gi) || []).length >= 2;

  // If there are no scripts, no interactive elements, no images, and less than 15 text characters
  if (!hasScript && !hasCanvas && !hasInteractive && !hasImages && clean.length < 15 && !hasMultipleDivs) {
    return true;
  }
  return false;
}

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'js':
    case 'mjs':
      return 'application/javascript';
    case 'json':
      return 'application/json';
    case 'svg':
      return 'image/svg+xml';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'ico':
      return 'image/x-icon';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'm4a':
      return 'audio/mp4';
    case 'aac':
      return 'audio/aac';
    case 'flac':
      return 'audio/flac';
    case 'woff':
      return 'font/woff';
    case 'woff2':
      return 'font/woff2';
    case 'ttf':
      return 'font/ttf';
    case 'otf':
      return 'font/otf';
    default:
      return 'application/octet-stream';
  }
}

function isBinaryFile(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svg', 'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'woff', 'woff2', 'ttf', 'otf', 'pdf', 'mp4', 'webm'].includes(ext);
}

/**
 * Normalizes a relative path from a base directory
 */
function resolveRelativePath(baseDir: string, relativePath: string): string {
  const cleanRelative = relativePath.split('?')[0].split('#')[0].replace(/^\.\//, '');
  if (!baseDir) return cleanRelative;
  const parts = (baseDir + '/' + cleanRelative).split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      resolved.pop();
    } else if (part !== '.' && part !== '') {
      resolved.push(part);
    }
  }
  return resolved.join('/');
}

/**
 * Bundles a specific target HTML file with all inlined CSS, JS, images, audio, and runtime bridges
 */
export function bundleHtmlFromTarget(
  targetHtmlPath: string,
  textFiles: Record<string, string>,
  binaryFiles: Record<string, string>,
  fallbackTitle: string
): { bundledHtml: string; title: string; hasSubstantialContent: boolean } {
  let htmlSource = textFiles[targetHtmlPath] || '';
  const hasSubstantialContent = !isTrivialHtml(htmlSource);
  const baseDir = targetHtmlPath.includes('/') ? targetHtmlPath.substring(0, targetHtmlPath.lastIndexOf('/')) : '';

  // Extract <title> if present
  let title = '';
  const titleMatch = htmlSource.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  } else {
    title = fallbackTitle;
  }

  const inlinedCssPaths = new Set<string>();
  const inlinedJsPaths = new Set<string>();

  // 1. Bundle CSS: Replace <link rel="stylesheet" href="..."> with inline <style>
  htmlSource = htmlSource.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi, (match) => {
    const hrefMatch = match.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch || !hrefMatch[1]) return match;

    const href = hrefMatch[1];
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      return match; // Keep external CDN
    }

    const resolvedCssPath = resolveRelativePath(baseDir, href);
    let cssContent = textFiles[resolvedCssPath];
    let matchedPath = resolvedCssPath;
    if (!cssContent) {
      // Try searching by filename
      const fileName = href.split('/').pop() || '';
      const fallbackKey = Object.keys(textFiles).find(k => k.endsWith('/' + fileName) || k === fileName);
      if (fallbackKey) {
        cssContent = textFiles[fallbackKey];
        matchedPath = fallbackKey;
      }
    }

    if (cssContent) {
      inlinedCssPaths.add(matchedPath);
      // Replace asset url(...) inside CSS with binary data URIs
      const cssDir = matchedPath.includes('/') ? matchedPath.substring(0, matchedPath.lastIndexOf('/')) : '';
      cssContent = cssContent.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (urlMatch, urlPath) => {
        if (urlPath.startsWith('data:') || urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
          return urlMatch;
        }
        const resolvedAssetPath = resolveRelativePath(cssDir, urlPath);
        const assetUri = binaryFiles[resolvedAssetPath] || Object.entries(binaryFiles).find(([k]) => k.endsWith('/' + urlPath.split('/').pop()))?.[1];
        if (assetUri) {
          return `url('${assetUri}')`;
        }
        return urlMatch;
      });

      return `<style>/* Inlined from ${href} */\n${cssContent}\n</style>`;
    }

    return match;
  });

  // Also match <link href="..." rel="stylesheet"> where href is before rel
  htmlSource = htmlSource.replace(/<link\s+[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi, (match, href) => {
    if (match.includes('/* Inlined from')) return match;
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) return match;

    const resolvedCssPath = resolveRelativePath(baseDir, href);
    let cssContent = textFiles[resolvedCssPath];
    let matchedPath = resolvedCssPath;
    if (!cssContent) {
      const fileName = href.split('/').pop()?.split('?')[0] || '';
      const fallbackKey = Object.keys(textFiles).find(k => k.endsWith('/' + fileName) || k === fileName);
      if (fallbackKey) {
        cssContent = textFiles[fallbackKey];
        matchedPath = fallbackKey;
      }
    }

    if (cssContent) {
      inlinedCssPaths.add(matchedPath);
      return `<style>/* Inlined from ${href} */\n${cssContent}\n</style>`;
    }
    return match;
  });

  // 2. Bundle JS: Replace <script src="..."> with inline <script>
  htmlSource = htmlSource.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (match, src) => {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
      return match; // Keep external script
    }

    const resolvedJsPath = resolveRelativePath(baseDir, src);
    let jsContent = textFiles[resolvedJsPath];
    let matchedPath = resolvedJsPath;
    if (!jsContent) {
      const fileName = src.split('/').pop()?.split('?')[0] || '';
      const fallbackKey = Object.keys(textFiles).find(k => k.endsWith('/' + fileName) || k === fileName);
      if (fallbackKey) {
        jsContent = textFiles[fallbackKey];
        matchedPath = fallbackKey;
      }
    }

    if (jsContent) {
      inlinedJsPaths.add(matchedPath);
      // Avoid breaking on </script> in js content
      const safeJs = jsContent.replace(/<\/script>/gi, '<\\/script>');
      return `<script>/* Inlined from ${src} */\n${safeJs}\n</script>`;
    }

    return match;
  });

  // 3. Bundle Images: Replace <img src="..."> with Data URIs
  htmlSource = htmlSource.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
      return match;
    }

    const resolvedImgPath = resolveRelativePath(baseDir, src);
    const dataUri = binaryFiles[resolvedImgPath] || Object.entries(binaryFiles).find(([k]) => k.endsWith('/' + src.split('/').pop()))?.[1];
    if (dataUri) {
      return `<img ${before}src="${dataUri}"${after}>`;
    }

    return match;
  });

  // 4. Audio & Video elements
  htmlSource = htmlSource.replace(/<(audio|video|source)\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, tag, before, src, after) => {
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return match;
    const resolvedPath = resolveRelativePath(baseDir, src);
    const dataUri = binaryFiles[resolvedPath] || Object.entries(binaryFiles).find(([k]) => k.endsWith('/' + src.split('/').pop()))?.[1];
    if (dataUri) {
      return `<${tag} ${before}src="${dataUri}"${after}>`;
    }
    return match;
  });

  // Safe minimal bridge script for teacher games and parent communication
  const runtimeInterceptorScript = `
<script id="__vui_hoc_zip_bridge__">
(function() {
  // 1. Safe in-memory storage polyfill for sandboxed iframes without origin storage access
  try {
    var _testKey = '__vui_hoc_test__';
    window.localStorage.setItem(_testKey, '1');
    window.localStorage.removeItem(_testKey);
  } catch (_storageErr) {
    var _memStore = {};
    var _storagePoly = {
      getItem: function(k) { return _memStore.hasOwnProperty(k) ? _memStore[k] : null; },
      setItem: function(k, v) { _memStore[k] = String(v); },
      removeItem: function(k) { delete _memStore[k]; },
      clear: function() { _memStore = {}; }
    };
    try {
      Object.defineProperty(window, 'localStorage', { value: _storagePoly, configurable: true });
      Object.defineProperty(window, 'sessionStorage', { value: _storagePoly, configurable: true });
    } catch(e) {}
  }

  // In-memory drag & drop action recorder
  var _recordedDragActions = [];

  function recordDragAction(item) {
    if (!item) return;
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

  // 2. Standardized completion bridge for teacher games
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

          var isPlacedInU = Boolean(cardEl.closest('#placed-u, #drop-u, .zone-u, #slots-u'));
          var isPlacedInUw = Boolean(cardEl.closest('#placed-uw, #drop-uw, .zone-uw, #slots-uw'));
          var isPlacedGeneric = Boolean(cardEl.closest('.placed-items, [id^="placed-"], .zone, [class*="drop"], .slots') || cardEl.classList.contains('placed'));

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

        dragDetails = scannedActions.length > 0 ? scannedActions : _recordedDragActions;
        totalQuestions = dragDetails.length;
        totalCorrect = dragDetails.filter(function(d) { return d.isCorrect; }).length;

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

        answersList = dragDetails.map(function(d) {
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
    return extractGameStats();
  };

  function autoHook() {
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
        try { window.reportGameProgress(); } catch (e) {}
        return r;
      };
      window.processCardPlacement.__vh_hooked = true;
    }

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

  // 3. Catch only genuine fatal script errors (ignore benign third-party/audio/firebase warnings)
  function isIgnorableError(msg) {
    if (!msg) return true;
    var str = String(msg).toLowerCase();
    return (
      str.indexOf('firebase') !== -1 ||
      str.indexOf('auth/') !== -1 ||
      str.indexOf('play() failed') !== -1 ||
      str.indexOf('user gesture') !== -1 ||
      str.indexOf('resizeobserver') !== -1 ||
      str.indexOf('script error') !== -1 ||
      str.indexOf('cancelled') !== -1 ||
      str.indexOf('cors') !== -1
    );
  }

  window.onerror = function(msg, source, lineno, colno, err) {
    if (isIgnorableError(msg)) return;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'GAME_RUNTIME_ERROR',
        message: String(msg || 'Lỗi mã nguồn JavaScript'),
        filename: source || '',
        lineno: lineno || 0,
        htmlPath: '${targetHtmlPath.replace(/'/g, "\\'")}'
      }, '*');
    }
  };

  window.addEventListener('unhandledrejection', function(e) {
    var reasonMsg = e && e.reason ? (e.reason.message || String(e.reason)) : '';
    if (isIgnorableError(reasonMsg)) return;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'GAME_RUNTIME_ERROR',
        message: 'Lỗi: ' + reasonMsg,
        htmlPath: '${targetHtmlPath.replace(/'/g, "\\'")}'
      }, '*');
    }
  });
})();
</script>
`;

  // Inject runtime interceptor early in <head> or at start
  if (htmlSource.includes('<head>')) {
    htmlSource = htmlSource.replace('<head>', `<head>\n${runtimeInterceptorScript}`);
  } else if (htmlSource.includes('<html>')) {
    htmlSource = htmlSource.replace('<html>', `<html>\n<head>${runtimeInterceptorScript}</head>`);
  } else {
    htmlSource = `${runtimeInterceptorScript}\n${htmlSource}`;
  }

  return {
    bundledHtml: htmlSource,
    title,
    hasSubstantialContent,
  };
}

/**
 * Re-bundles an already extracted ZIP using a different HTML file entry
 */
export function reBundleFromSelectedHtml(
  currentResult: ExtractedZipResult,
  newHtmlPath: string
): ExtractedZipResult {
  const defaultTitle = newHtmlPath.split('/').pop()?.replace(/\.(html|htm)$/i, '') || currentResult.title;
  const bundled = bundleHtmlFromTarget(
    newHtmlPath,
    currentResult.textFiles,
    currentResult.binaryFiles,
    defaultTitle
  );

  const newGameUrl = currentResult.gameId
    ? `/api/games/static/${currentResult.gameId}/${newHtmlPath}`
    : currentResult.gameUrl;

  return {
    ...currentResult,
    mainHtmlPath: newHtmlPath,
    bundledHtml: bundled.bundledHtml,
    title: bundled.title || currentResult.title,
    gameUrl: newGameUrl,
    hasSubstantialContent: bundled.hasSubstantialContent,
    isFallbackFromError: false,
    fallbackReason: undefined,
  };
}

/**
 * Unpacks and bundles a ZIP file into a self-contained web game
 */
export async function extractAndBundleZipGame(file: File, preferredHtmlPath?: string): Promise<ExtractedZipResult> {
  const zip = await JSZip.loadAsync(file);

  const fileList: string[] = [];
  const textFiles: Record<string, string> = {};
  const binaryFiles: Record<string, string> = {}; // base64 string
  const filesMap: Record<string, { content: string; isBase64: boolean; mimeType: string }> = {};

  // Read all entries in the ZIP
  const entries = Object.keys(zip.files).filter(path => !zip.files[path].dir && !path.startsWith('__MACOSX/'));

  for (const filePath of entries) {
    const zipEntry = zip.files[filePath];
    const mime = getMimeType(filePath);

    if (isBinaryFile(filePath)) {
      const base64Data = await zipEntry.async('base64');
      const dataUri = `data:${mime};base64,${base64Data}`;
      binaryFiles[filePath] = dataUri;
      filesMap[filePath] = {
        content: base64Data,
        isBase64: true,
        mimeType: mime,
      };
    } else {
      const textData = await zipEntry.async('string');
      textFiles[filePath] = textData;
      filesMap[filePath] = {
        content: textData,
        isBase64: false,
        mimeType: mime,
      };
    }

    fileList.push(filePath);
  }

  // Find all HTML candidates in the zip
  const htmlFiles = entries.filter(p => p.toLowerCase().endsWith('.html') || p.toLowerCase().endsWith('.htm'));

  if (htmlFiles.length === 0) {
    throw new Error('Gói ZIP không chứa bất kỳ file .html nào. Vui lòng kiểm tra lại file nén hoặc tải gói ZIP mẫu.');
  }

  // Locate index.html or */index.html
  let candidateIndex = htmlFiles.find(p => p.toLowerCase() === 'index.html');
  if (!candidateIndex) {
    candidateIndex = htmlFiles.find(p => p.toLowerCase().endsWith('/index.html'));
  }

  let chosenHtmlPath = '';
  let isFallbackFromError = false;
  let fallbackReason = '';
  let hasValidAlternative = false;

  const isIndexBroken = !candidateIndex || !textFiles[candidateIndex] || isTrivialHtml(textFiles[candidateIndex]);

  if (preferredHtmlPath && textFiles[preferredHtmlPath]) {
    chosenHtmlPath = preferredHtmlPath;
    hasValidAlternative = true;
  } else if (!isIndexBroken && candidateIndex) {
    chosenHtmlPath = candidateIndex;
    hasValidAlternative = true;
  } else {
    // candidateIndex is missing OR trivial/empty/broken!
    // User requirement: "file index của game bị lỗi hãy truy xuất file html khác trong gói zip để chạy. Nếu không có hãy xuất ra thông báo lỗi trò chơi cho người dùng biết"
    const otherCandidates = htmlFiles.filter(p => p !== candidateIndex && textFiles[p] && !isTrivialHtml(textFiles[p]));

    if (otherCandidates.length > 0) {
      hasValidAlternative = true;
      // Prioritize files with name keywords or larger content
      const priorityNames = ['game', 'play', 'tro-choi', 'trochoi', 'u-uw', 'u_uw', 'letter', 'main', 'start', 'app', 'run', 'default'];
      otherCandidates.sort((a, b) => {
        const aScore = priorityNames.some(k => a.toLowerCase().includes(k)) ? 10 : 0;
        const bScore = priorityNames.some(k => b.toLowerCase().includes(k)) ? 10 : 0;
        if (aScore !== bScore) return bScore - aScore;
        return (textFiles[b]?.length || 0) - (textFiles[a]?.length || 0);
      });

      chosenHtmlPath = otherCandidates[0];
      isFallbackFromError = true;
      fallbackReason = candidateIndex
        ? `File index của game ("${candidateIndex}") bị lỗi hoặc trống. Hệ thống đã tự động truy xuất sang file "${chosenHtmlPath}" trong gói ZIP để chạy.`
        : `Không tìm thấy file index.html trong gói ZIP. Hệ thống đã tự động truy xuất sang file "${chosenHtmlPath}" để chạy.`;
    } else {
      // No non-trivial or alternative HTML found in the zip!
      hasValidAlternative = false;
      chosenHtmlPath = candidateIndex || htmlFiles[0];
      isFallbackFromError = true;
      fallbackReason = candidateIndex
        ? `LỖI TRÒ CHƠI: File index của game ("${candidateIndex}") bị lỗi hoặc rỗng, và không tìm thấy file HTML nào khác trong gói ZIP để chạy.`
        : `LỖI TRÒ CHƠI: Gói ZIP không có file index.html và không tìm thấy bất kỳ file HTML thay thế hợp lệ nào khác để chạy.`;
    }
  }

  const defaultTitle = file.name.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
  const bundled = bundleHtmlFromTarget(chosenHtmlPath, textFiles, binaryFiles, defaultTitle);

  // Generate unique game storage ID for server static hosting
  const safeGameId = 'game_zip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  let hostedGameUrl: string | undefined = undefined;

  // Save assets to server static storage immediately so preview and game run 100% identically
  if (typeof window !== 'undefined') {
    try {
      const savedUrl = await saveZipAssetsToServer(safeGameId, filesMap, chosenHtmlPath);
      if (savedUrl) {
        hostedGameUrl = savedUrl;
      }
    } catch (saveErr) {
      console.warn('Could not auto-save zip assets to server during extraction:', saveErr);
    }
  }

  return {
    gameId: safeGameId,
    gameUrl: hostedGameUrl,
    mainHtmlPath: chosenHtmlPath,
    bundledHtml: bundled.bundledHtml,
    title: bundled.title,
    fileCount: fileList.length,
    fileList,
    htmlFiles,
    filesMap,
    isFallbackFromError,
    fallbackReason,
    hasValidAlternative,
    hasSubstantialContent: bundled.hasSubstantialContent && hasValidAlternative,
    textFiles,
    binaryFiles,
    originalCandidateCount: htmlFiles.length,
  };
}

/**
 * Uploads unzipped static assets to the server backend so they can be hosted at /api/games/static/:gameId
 */
export async function saveZipAssetsToServer(
  gameId: string,
  filesMap: Record<string, { content: string; isBase64: boolean; mimeType: string }>,
  mainHtmlPath: string
): Promise<string | null> {
  try {
    const res = await fetch('/api/games/save-zip-assets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameId,
        filesMap,
        mainHtmlPath,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.gameUrl || `/api/games/static/${gameId}/${mainHtmlPath}`;
    }
  } catch (err) {
    console.warn('Could not save zip assets to server (fallback to bundled HTML):', err);
  }
  return null;
}
