// Standalone HTML5 Game definitions & templates
import { Question } from '../types/game';

/**
 * Trò Chơi Kéo Chữ U - Ư Nghề Nghiệp (Single-file HTML5 Game)
 * Self-contained HTML/CSS/JS with touch & mouse drag-drop, Web Audio effects, confetti, and parent postMessage bridge.
 */
export const HTML_GAME_U_UW_NGHE_NGHIEP = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>KÉO CHỮ U - Ư NGHỀ NGHIỆP</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; user-select: none; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Nunito", "Quicksand", sans-serif;
      background: linear-gradient(180deg, #e0f2fe 0%, #ecfeff 50%, #f0fdf4 100%);
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 16px 12px;
      overflow-x: hidden;
    }
    header {
      text-align: center;
      margin-bottom: 12px;
      width: 100%;
    }
    h1 {
      font-size: 1.65rem;
      font-weight: 900;
      color: #0369a1;
      text-shadow: 0 1px 3px rgba(0,0,0,0.06);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    p.subtitle {
      font-size: 0.95rem;
      font-weight: 700;
      color: #475569;
      margin-bottom: 6px;
    }
    .score-badge {
      display: inline-block;
      background: #ffffff;
      padding: 5px 18px;
      border-radius: 999px;
      font-size: 0.88rem;
      font-weight: 800;
      color: #0284c7;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border: 1.5px solid #bae6fd;
    }
    /* Drop Zones Grid */
    .zones-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      width: 100%;
      max-width: 900px;
      margin-bottom: 16px;
      flex: 1;
      min-height: 220px;
    }
    .zone {
      background: #ffffff;
      border-radius: 28px;
      padding: 16px 14px;
      min-height: 220px;
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 3px dashed #cbd5e1;
      transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(0,0,0,0.03);
      position: relative;
    }
    .zone-u {
      border-color: #38bdf8;
      background: #f0f9ff;
    }
    .zone-uw {
      border-color: #fb7185;
      background: #fff1f2;
    }
    .zone.hovered {
      transform: scale(1.02);
      border-style: solid;
      box-shadow: 0 10px 28px rgba(2, 132, 199, 0.22);
    }
    .zone-title {
      font-size: 1.3rem;
      font-weight: 900;
      margin-bottom: 2px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .zone-u .zone-title { color: #0284c7; }
    .zone-uw .zone-title { color: #e11d48; }
    .zone-hint {
      font-size: 0.8rem;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 10px;
    }
    .zone-slots {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      align-items: center;
      width: 100%;
      flex: 1;
      min-height: 120px;
    }
    /* Shelf Container */
    .shelf-container {
      width: 100%;
      max-width: 900px;
      background: #ffffff;
      border-radius: 28px;
      padding: 14px 18px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
      border: 2px solid #e2e8f0;
      text-align: center;
    }
    .shelf-title {
      font-size: 0.85rem;
      font-weight: 900;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .cards-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      min-height: 110px;
    }
    .card {
      background: #ffffff;
      border: 2px solid #cbd5e1;
      border-radius: 20px;
      padding: 10px 12px;
      min-width: 112px;
      width: 118px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: grab;
      touch-action: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      position: relative;
    }
    .card:hover {
      border-color: #94a3b8;
      box-shadow: 0 6px 16px rgba(0,0,0,0.09);
    }
    .card:active {
      cursor: grabbing;
      transform: scale(1.08);
      box-shadow: 0 14px 28px rgba(0,0,0,0.22);
      z-index: 1000;
    }
    .card-icon {
      width: 52px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 6px;
      pointer-events: none;
    }
    .card-text {
      font-size: 0.88rem;
      font-weight: 900;
      color: #0f172a;
      text-align: center;
      line-height: 1.2;
      pointer-events: none;
    }
    .card-keyword {
      font-size: 0.78rem;
      font-weight: 800;
      margin-top: 3px;
      pointer-events: none;
    }
    .card-u .card-keyword { color: #0284c7; }
    .card-uw .card-keyword { color: #e11d48; }
    .card.placed {
      background: #ffffff;
      border-color: #10b981;
      border-width: 2.5px;
      cursor: default;
      width: 108px;
      min-width: 100px;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
      animation: popIn 0.25s ease-out;
    }
    .card.placed::after {
      content: "✓";
      position: absolute;
      top: -8px;
      right: -8px;
      background: #10b981;
      color: #ffffff;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      font-size: 13px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      border: 2px solid #ffffff;
    }
    .card.shake {
      animation: shake 0.4s ease;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-8px); }
      40%, 80% { transform: translateX(8px); }
    }
    /* Victory Overlay Modal */
    #victory-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      z-index: 9999;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .victory-box {
      background: #ffffff;
      border-radius: 28px;
      padding: 26px 20px;
      text-align: center;
      max-width: 380px;
      width: 100%;
      border: 4px solid #facc15;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes popIn {
      from { transform: scale(0.7); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .btn-action {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: #ffffff;
      border: none;
      border-radius: 16px;
      padding: 12px 24px;
      font-weight: 900;
      font-size: 0.95rem;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
      margin-top: 14px;
      transition: transform 0.1s;
    }
    .btn-action:active { transform: scale(0.96); }
    canvas#confetti-canvas {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 10000;
    }
  </style>
</head>
<body>

  <header>
    <h1><span>🏅</span> <span>KÉO CHỮ U - Ư NGHỀ NGHIỆP</span> <span>👷</span></h1>
    <p class="subtitle">Bé hãy kéo các thẻ nghề nghiệp vào đúng ô có chứa chữ <b>U</b> hoặc chữ <b>Ư</b> nhé!</p>
    <div class="score-badge">Đã xếp: <span id="score-text">0</span> / 6 nghề nghiệp</div>
  </header>

  <!-- 2 Drop Zones -->
  <div class="zones-grid">
    <div class="zone zone-u" id="zone-u" data-target="U">
      <div class="zone-title">🎯 CÓ CHỮ U</div>
      <div class="zone-hint">Thả nghề có chữ U vào đây</div>
      <div class="zone-slots" id="slots-u"></div>
    </div>

    <div class="zone zone-uw" id="zone-uw" data-target="UW">
      <div class="zone-title">🎯 CÓ CHỮ Ư</div>
      <div class="zone-hint">Thả nghề có chữ Ư vào đây</div>
      <div class="zone-slots" id="slots-uw"></div>
    </div>
  </div>

  <!-- Draggable Shelf -->
  <div class="shelf-container">
    <div class="shelf-title">👉 Chạm giữ và kéo thẻ nghề nghiệp lên ô phía trên</div>
    <div class="cards-grid" id="cards-shelf">
      <!-- Card 1: Chú bộ đội (U) -->
      <div class="card card-u" id="c1" data-letter="U">
        <div class="card-icon">
          <svg width="44" height="38" viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 38C4 20 16 6 32 6C48 6 60 20 60 38C60 41 57 43 53 43C47 43 42 41 32 41C22 41 17 43 11 43C7 43 4 41 4 38Z" fill="#3B7A57"/>
            <ellipse cx="32" cy="18" rx="20" ry="10" fill="#4E9B6E" opacity="0.4"/>
            <path d="M12 42C12 46 17 49 32 49C47 49 52 46 52 42" stroke="#2D5A40" stroke-width="3" stroke-linecap="round"/>
            <polygon points="32,16 34,22 40,22 35,26 37,32 32,28 27,32 29,26 24,22 30,22" fill="#EAB308"/>
          </svg>
        </div>
        <div class="card-text">Chú bộ đội</div>
        <div class="card-keyword">(Ch<b>ú</b>)</div>
      </div>

      <!-- Card 2: Kỹ sư xây dựng (Ư) -->
      <div class="card card-uw" id="c2" data-letter="UW">
        <div class="card-icon">
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 26C14 16 22 10 32 10C42 10 50 16 50 26H14Z" fill="#F59E0B"/>
            <rect x="10" y="24" width="44" height="6" rx="3" fill="#D97706"/>
            <rect x="30" y="8" width="4" height="12" rx="2" fill="#FBBF24"/>
            <circle cx="32" cy="34" r="12" fill="#FDBA74"/>
            <circle cx="28" cy="33" r="1.5" fill="#1E293B"/>
            <circle cx="36" cy="33" r="1.5" fill="#1E293B"/>
            <path d="M29 38C30 40 34 40 35 38" stroke="#9A3412" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M18 56C18 46 24 44 32 44C40 44 46 46 46 56H18Z" fill="#EA580C"/>
            <path d="M28 44L32 50L36 44" fill="#FDBA74"/>
          </svg>
        </div>
        <div class="card-text">Kỹ sư xây dựng</div>
        <div class="card-keyword">(Kỹ s<b>ư</b>)</div>
      </div>

      <!-- Card 3: Bác sĩ thú y (U) -->
      <div class="card card-u" id="c3" data-letter="U">
        <div class="card-icon">
          <svg width="44" height="42" viewBox="0 0 64 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="14,24 22,10 28,22" fill="#EA580C"/>
            <polygon points="17,22 22,13 26,21" fill="#FDBA74"/>
            <polygon points="50,24 42,10 36,22" fill="#EA580C"/>
            <polygon points="47,22 42,13 38,21" fill="#FDBA74"/>
            <circle cx="32" cy="34" r="20" fill="#F97316"/>
            <circle cx="22" cy="38" r="3" fill="#FDA4AF" opacity="0.8"/>
            <circle cx="42" cy="38" r="3" fill="#FDA4AF" opacity="0.8"/>
            <ellipse cx="24" cy="32" rx="2.5" ry="3.5" fill="#1E293B"/>
            <ellipse cx="40" cy="32" rx="2.5" ry="3.5" fill="#1E293B"/>
            <circle cx="25" cy="31" r="1" fill="#FFFFFF"/>
            <circle cx="41" cy="31" r="1" fill="#FFFFFF"/>
            <polygon points="32,36 30,34 34,34" fill="#991B1B"/>
            <path d="M32 36C30 38 28 38 27 37M32 36C34 38 36 38 37 37" stroke="#991B1B" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M16 34L8 33M16 37L9 38M48 34L56 33M48 37L55 38" stroke="#C2410C" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="card-text">Bác sĩ thú y</div>
        <div class="card-keyword">(Th<b>ú</b> y)</div>
      </div>

      <!-- Card 4: Bác đưa thư (Ư) -->
      <div class="card card-uw" id="c4" data-letter="UW">
        <div class="card-icon">
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="29" y="44" width="6" height="16" rx="2" fill="#64748B"/>
            <path d="M14 26C14 17 21 12 32 12C43 12 50 17 50 26V44H14V26Z" fill="#2563EB"/>
            <path d="M14 26C14 17 21 12 32 12V44H14V26Z" fill="#1D4ED8"/>
            <rect x="48" y="18" width="4" height="16" fill="#DC2626"/>
            <polygon points="52,18 60,22 52,26" fill="#EF4444"/>
            <rect x="20" y="24" width="24" height="16" rx="2" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
            <polyline points="20,24 32,33 44,24" stroke="#DC2626" stroke-width="1.5" fill="none"/>
          </svg>
        </div>
        <div class="card-text">Bác đưa thư</div>
        <div class="card-keyword">(Đ<b>ư</b>a th<b>ư</b>)</div>
      </div>

      <!-- Card 5: Chú thủ môn (U) -->
      <div class="card card-u" id="c5" data-letter="U">
        <div class="card-icon">
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="24" fill="#FFFFFF" stroke="#0284C7" stroke-width="2.5"/>
            <polygon points="32,22 40,28 37,38 27,38 24,28" fill="#0284C7"/>
            <line x1="32" y1="22" x2="32" y2="10" stroke="#0284C7" stroke-width="2"/>
            <line x1="40" y1="28" x2="51" y2="22" stroke="#0284C7" stroke-width="2"/>
            <line x1="37" y1="38" x2="47" y2="46" stroke="#0284C7" stroke-width="2"/>
            <line x1="27" y1="38" x2="17" y2="46" stroke="#0284C7" stroke-width="2"/>
            <line x1="24" y1="28" x2="13" y2="22" stroke="#0284C7" stroke-width="2"/>
            <path d="M26 10C30 9 34 9 38 10" stroke="#0284C7" stroke-width="2"/>
          </svg>
        </div>
        <div class="card-text">Chú thủ môn</div>
        <div class="card-keyword">(Th<b>ủ</b> môn)</div>
      </div>

      <!-- Card 6: Thợ sửa xe (Ư) -->
      <div class="card card-uw" id="c6" data-letter="UW">
        <div class="card-icon">
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="rotate(-45 32 32)">
              <rect x="29" y="16" width="6" height="32" rx="3" fill="#94A3B8"/>
              <path d="M24 16C24 10 29 8 32 8C35 8 40 10 40 16C37 14 34 16 32 18C30 16 27 14 24 16Z" fill="#CBD5E1"/>
              <path d="M24 16C24 10 29 8 32 8C35 8 40 10 40 16L36 17C35 14 33 13 32 13C31 13 29 14 28 17L24 16Z" fill="#64748B"/>
              <circle cx="32" cy="48" r="8" fill="#94A3B8"/>
              <circle cx="32" cy="48" r="4" fill="#F1F5F9"/>
            </g>
          </svg>
        </div>
        <div class="card-text">Thợ sửa xe</div>
        <div class="card-keyword">(S<b>ử</b>a xe)</div>
      </div>
    </div>
  </div>

  <!-- Victory Modal -->
  <div id="victory-modal">
    <div class="victory-box">
      <div style="font-size: 3.5rem; margin-bottom: 8px;">🌟🏆🌟</div>
      <h2 style="font-size: 1.4rem; font-weight: 900; color: #0f172a; margin-bottom: 4px;">HOÀN THÀNH XUẤT SẮC!</h2>
      <p style="font-size: 0.88rem; font-weight: 700; color: #475569; margin-bottom: 12px;">
        Bé đã nhận biết chính xác chữ <b>U</b> và chữ <b>Ư</b> trong các từ nghề nghiệp!
      </p>
      <div style="background: #fef3c7; border: 1.5px solid #fde68a; border-radius: 14px; padding: 10px 14px; font-weight: 900; color: #b45309; font-size: 1.15rem; margin-bottom: 14px;">
        +30 ĐIỂM THƯỞNG ⭐
      </div>
      <button class="btn-action" onclick="resetGame()">Chơi lại lần nữa 🔄</button>
    </div>
  </div>

  <canvas id="confetti-canvas"></canvas>

  <script>
    // Web Audio Synthesizer for rich sound effects without external assets
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playBeep(freq, type = 'sine', duration = 0.15) {
      try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch(e){}
    }
    function playSuccessSound() {
      playBeep(523.25, 'triangle', 0.12);
      setTimeout(() => playBeep(659.25, 'triangle', 0.12), 100);
      setTimeout(() => playBeep(783.99, 'triangle', 0.2), 200);
    }
    function playWrongSound() {
      playBeep(220, 'sawtooth', 0.2);
    }
    function playFanfare() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, idx) => {
        setTimeout(() => playBeep(n, 'triangle', 0.25), idx * 120);
      });
    }

    // Touch & Mouse Drag & Drop Implementation
    let activeCard = null;
    let initialX = 0, initialY = 0;
    let placedCount = 0;
    const totalCards = 6;
    const zoneU = document.getElementById('zone-u');
    const zoneUw = document.getElementById('zone-uw');
    const slotsU = document.getElementById('slots-u');
    const slotsUw = document.getElementById('slots-uw');
    const shelf = document.getElementById('cards-shelf');
    const scoreText = document.getElementById('score-text');

    document.querySelectorAll('.card').forEach(card => {
      // Touch handlers
      card.addEventListener('touchstart', onDragStart, { passive: false });
      // Mouse handlers
      card.addEventListener('mousedown', onDragStart);
    });

    function onDragStart(e) {
      if (this.classList.contains('placed')) return;
      e.preventDefault();
      activeCard = this;
      activeCard.style.zIndex = '1000';

      const point = e.touches ? e.touches[0] : e;
      const rect = activeCard.getBoundingClientRect();
      initialX = point.clientX - rect.left;
      initialY = point.clientY - rect.top;

      activeCard.style.position = 'fixed';
      activeCard.style.left = (point.clientX - initialX) + 'px';
      activeCard.style.top = (point.clientY - initialY) + 'px';

      document.addEventListener('touchmove', onDragMove, { passive: false });
      document.addEventListener('touchend', onDragEnd);
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
    }

    function onDragMove(e) {
      if (!activeCard) return;
      e.preventDefault();
      const point = e.touches ? e.touches[0] : e;
      activeCard.style.left = (point.clientX - initialX) + 'px';
      activeCard.style.top = (point.clientY - initialY) + 'px';

      // Highlight drop zones
      const uRect = zoneU.getBoundingClientRect();
      const uwRect = zoneUw.getBoundingClientRect();
      const cx = point.clientX, cy = point.clientY;

      if (cx >= uRect.left && cx <= uRect.right && cy >= uRect.top && cy <= uRect.bottom) {
        zoneU.classList.add('hovered');
      } else {
        zoneU.classList.remove('hovered');
      }

      if (cx >= uwRect.left && cx <= uwRect.right && cy >= uwRect.top && cy <= uwRect.bottom) {
        zoneUw.classList.add('hovered');
      } else {
        zoneUw.classList.remove('hovered');
      }
    }

    function onDragEnd(e) {
      if (!activeCard) return;
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('touchend', onDragEnd);
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);

      zoneU.classList.remove('hovered');
      zoneUw.classList.remove('hovered');

      const cardLetter = activeCard.getAttribute('data-letter');
      const point = e.changedTouches ? e.changedTouches[0] : e;
      const uRect = zoneU.getBoundingClientRect();
      const uwRect = zoneUw.getBoundingClientRect();
      const cx = point.clientX, cy = point.clientY;

      let droppedTarget = null;
      if (cx >= uRect.left && cx <= uRect.right && cy >= uRect.top && cy <= uRect.bottom) {
        droppedTarget = 'U';
      } else if (cx >= uwRect.left && cx <= uwRect.right && cy >= uwRect.top && cy <= uwRect.bottom) {
        droppedTarget = 'UW';
      }

      // Check correctness
      if (droppedTarget === cardLetter) {
        // Correct drop!
        playSuccessSound();
        activeCard.classList.add('placed');
        activeCard.style.position = 'static';
        activeCard.style.left = 'auto';
        activeCard.style.top = 'auto';
        activeCard.style.zIndex = '1';

        if (cardLetter === 'U') {
          slotsU.appendChild(activeCard);
        } else {
          slotsUw.appendChild(activeCard);
        }

        placedCount++;
        scoreText.innerText = placedCount;

        // Notify parent application of intermediate progress
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'GAME_PROGRESS',
            placedCount: placedCount,
            totalRequired: totalCards
          }, '*');
        }

        // Check if all placed
        if (placedCount >= totalCards) {
          setTimeout(showVictory, 300);
        }
      } else {
        // Incorrect drop or dropped outside
        playWrongSound();
        activeCard.style.position = 'static';
        activeCard.style.left = 'auto';
        activeCard.style.top = 'auto';
        activeCard.style.zIndex = '1';
        shelf.appendChild(activeCard);
        activeCard.classList.add('shake');
        setTimeout(() => activeCard && activeCard.classList.remove('shake'), 400);
      }

      activeCard = null;
    }

    function showVictory() {
      playFanfare();
      launchConfetti();
      document.getElementById('victory-modal').style.display = 'flex';

      const dragDetails = [
        { cardId: 'c1', cardText: 'Chú bộ đội (Chữ U)', letter: 'U', targetZone: 'Ô CHỮ U', expectedZone: 'Ô CHỮ U', isCorrect: true, status: 'correct', points: 5 },
        { cardId: 'c2', cardText: 'Kỹ sư xây dựng (Chữ Ư)', letter: 'Ư', targetZone: 'Ô CHỮ Ư', expectedZone: 'Ô CHỮ Ư', isCorrect: true, status: 'correct', points: 5 },
        { cardId: 'c3', cardText: 'Bác sĩ thú y (Chữ U)', letter: 'U', targetZone: 'Ô CHỮ U', expectedZone: 'Ô CHỮ U', isCorrect: true, status: 'correct', points: 5 },
        { cardId: 'c4', cardText: 'Thợ may (Chữ U)', letter: 'U', targetZone: 'Ô CHỮ U', expectedZone: 'Ô CHỮ U', isCorrect: true, status: 'correct', points: 5 },
        { cardId: 'c5', cardText: 'Bác đưa thư (Chữ Ư)', letter: 'Ư', targetZone: 'Ô CHỮ Ư', expectedZone: 'Ô CHỮ Ư', isCorrect: true, status: 'correct', points: 5 },
        { cardId: 'c6', cardText: 'Thợ lặn (Chữ U)', letter: 'U', targetZone: 'Ô CHỮ U', expectedZone: 'Ô CHỮ U', isCorrect: true, status: 'correct', points: 5 }
      ];

      const answersList = dragDetails.map(d => ({
        question: 'Thẻ [' + d.letter + '] ' + d.cardText,
        chosenAnswer: 'Kéo vào: ' + d.targetZone,
        correctAnswer: d.expectedZone,
        isCorrect: true,
        points: d.points
      }));

      // Send standard completion message to parent app
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'GAME_COMPLETE',
          isCorrect: true,
          score: 30,
          totalCorrect: totalCards,
          totalQuestions: totalCards,
          dragDetails: dragDetails,
          answersList: answersList,
          history: answersList.map(a => ({ question: a.question, choiceText: a.chosenAnswer, correctText: a.correctAnswer, isCorrect: a.isCorrect })),
          summary: 'Bé kéo đúng 6/6 nghề nghiệp chữ U và Ư!'
        }, '*');
      }
    }

    function resetGame() {
      document.getElementById('victory-modal').style.display = 'none';
      placedCount = 0;
      scoreText.innerText = '0';
      const allCards = [
        document.getElementById('c1'),
        document.getElementById('c2'),
        document.getElementById('c3'),
        document.getElementById('c4'),
        document.getElementById('c5'),
        document.getElementById('c6')
      ];
      allCards.forEach(c => {
        c.classList.remove('placed');
        shelf.appendChild(c);
      });
    }

    // Mini confetti effect
    function launchConfetti() {
      const canvas = document.getElementById('confetti-canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles = [];
      const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
      for (let i = 0; i < 90; i++) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          r: Math.random() * 6 + 4,
          dx: (Math.random() - 0.5) * 14,
          dy: (Math.random() - 0.5) * 14 - 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          tilt: Math.random() * 10
        });
      }

      let frames = 0;
      function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.dx;
          p.y += p.dy;
          p.dy += 0.3; // gravity
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        });
        frames++;
        if (frames < 120) {
          requestAnimationFrame(render);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      render();
    }
  </script>
</body>
</html>`;

/**
 * Creates a Question object with an embedded HTML Game
 */
export function createHtmlGameQuestion(
  title: string,
  htmlContent: string,
  timeLimit: number = 45,
  points: number = 30,
  explanation: string = 'Bé đã hoàn thành trò chơi tương tác xuất sắc!'
): Question {
  return {
    id: 'q_html_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title,
    type: 'html_game',
    timeLimit,
    points,
    explanation,
    options: [],
    htmlContent,
  };
}

/**
 * Generates starter HTML template for teachers to download and edit
 */
export function generateStarterHtmlTemplate(gameTitle: string = 'Trò Chơi Của Cô'): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${gameTitle}</title>
  <style>
    body {
      font-family: sans-serif;
      text-align: center;
      padding: 20px;
      background: #f8fafc;
      color: #1e293b;
    }
    .game-box {
      background: white;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      max-width: 600px;
      margin: 0 auto;
    }
    button {
      background: #0284c7;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="game-box">
    <h1>${gameTitle}</h1>
    <p>Giáo viên có thể thêm mã HTML, CSS và JavaScript của trò chơi vào đây!</p>
    <br>
    <button onclick="finishGame()">Bé hoàn thành trò chơi ⭐</button>
  </div>

  <script>
    function finishGame() {
      alert("Chúc mừng bé đã hoàn thành!");
      // Gửi tín hiệu hoàn thành về cho ứng dụng Vui Học Cùng Cô
      if (window.parent) {
        window.parent.postMessage({
          type: 'GAME_COMPLETE',
          isCorrect: true,
          score: 20,
          summary: 'Bé đã hoàn thành trò chơi!'
        }, '*');
      }
    }
  </script>
</body>
</html>`;
}
