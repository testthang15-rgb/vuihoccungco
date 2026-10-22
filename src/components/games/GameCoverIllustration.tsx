import React, { useState, useMemo } from 'react';
import { Game } from '../../types/game';

interface GameCoverIllustrationProps {
  game: Game;
  className?: string;
}

export const GameCoverIllustration: React.FC<GameCoverIllustrationProps> = ({
  game,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  // 1. Detect if any direct image exists in the game or its questions
  const directImageUrl = useMemo(() => {
    if (game.coverImage && game.coverImage.trim()) return game.coverImage.trim();
    if (game.thumbnailUrl && game.thumbnailUrl.trim()) return game.thumbnailUrl.trim();

    if (game.questions && game.questions.length > 0) {
      // Check for first question image
      const qWithImg = game.questions.find((q) => q.imageUrl && q.imageUrl.trim());
      if (qWithImg?.imageUrl) return qWithImg.imageUrl.trim();

      // Check for open-ended drawing template
      const qWithBg = game.questions.find((q) => q.openEndedBgImage && q.openEndedBgImage.trim());
      if (qWithBg?.openEndedBgImage) return qWithBg.openEndedBgImage.trim();

      // Check for option image
      for (const q of game.questions) {
        if (q.options) {
          const optWithImg = q.options.find((o) => o.imageUrl && o.imageUrl.trim());
          if (optWithImg?.imageUrl) return optWithImg.imageUrl.trim();
        }
      }

      // Check for interactive canvas elements with image
      for (const q of game.questions) {
        if (q.canvasConfig?.elements) {
          const elWithImg = q.canvasConfig.elements.find((e) => e.imageUrl && e.imageUrl.trim());
          if (elWithImg?.imageUrl) return elWithImg.imageUrl.trim();
        }
      }
    }

    return null;
  }, [game]);

  // 2. Content analysis for contextual preschool illustrations
  const titleLower = (game.title || '').toLowerCase();
  const descLower = (game.description || '').toLowerCase();
  const categoryLower = (game.category || '').toLowerCase();

  // Drawing & Coloring
  const isDrawing =
    titleLower.includes('tô hình') ||
    titleLower.includes('tô màu') ||
    titleLower.includes('vẽ') ||
    titleLower.includes('hội họa') ||
    titleLower.includes('bức tranh') ||
    game.questions?.some((q) => q.type === 'open_ended');

  // Interactive / HTML5 / ZIP Game
  const isHtmlZip =
    game.gameType === 'html_game' ||
    Boolean(game.isZipArchive) ||
    Boolean(game.isCustomHtml) ||
    titleLower.includes('html5') ||
    titleLower.includes('gói zip') ||
    descLower.includes('zip') ||
    descLower.includes('html5');

  // Math & Counting
  const isMath =
    categoryLower.includes('toán') ||
    titleLower.includes('toán') ||
    titleLower.includes('đếm') ||
    titleLower.includes('chữ số') ||
    titleLower.includes('số lượng') ||
    titleLower.includes('1 đến 5') ||
    titleLower.includes('1-5') ||
    game.questions?.some((q) => q.type === 'counting');

  // Animals & Nature
  const isAnimal =
    categoryLower.includes('động vật') ||
    titleLower.includes('con vật') ||
    titleLower.includes('động vật') ||
    titleLower.includes('thú');

  // Music
  const isMusic =
    categoryLower.includes('nhạc') ||
    titleLower.includes('nhạc') ||
    titleLower.includes('hát') ||
    titleLower.includes('âm thanh');

  // Letters / Alphabet
  const isLetters = categoryLower.includes('chữ cái') || titleLower.includes('chữ');

  // Extract letter pairs or trios from title if present
  const extractedLetters = useMemo(() => {
    const raw = game.title || '';
    // Check specific patterns like "U - Ư", "M - N", "H, K", "A – Ă – Â", "O - Ô - Ơ"
    if (/u\s*[-–,]\s*ư/i.test(raw)) return ['U', 'Ư'];
    if (/m\s*[-–,]\s*n/i.test(raw)) return ['M', 'N'];
    if (/h\s*[-–,]\s*k/i.test(raw)) return ['H', 'K'];
    if (/a\s*[-–,]\s*ă\s*[-–,]\s*â/i.test(raw)) return ['A', 'Ă', 'Â'];
    if (/b\s*[-–,]\s*d\s*[-–,]\s*đ/i.test(raw)) return ['B', 'D', 'Đ'];
    if (/o\s*[-–,]\s*ô\s*[-–,]\s*ơ/i.test(raw)) return ['O', 'Ô', 'Ơ'];
    if (/e\s*[-–,]\s*ê/i.test(raw)) return ['E', 'Ê'];
    if (/l\s*[-–,]\s*m\s*[-–,]\s*n/i.test(raw)) return ['L', 'M', 'N'];
    if (/p\s*[-–,]\s*q/i.test(raw)) return ['P', 'Q'];
    if (/s\s*[-–,]\s*x/i.test(raw)) return ['S', 'X'];
    if (/g\s*[-–,]\s*h/i.test(raw)) return ['G', 'H'];
    if (/c\s*[-–,]\s*k/i.test(raw)) return ['C', 'K'];
    if (/r\s*[-–,]\s*s/i.test(raw)) return ['R', 'S'];
    return ['A', 'B', 'C'];
  }, [game.title]);

  // If a real image exists and has not failed, render it
  if (directImageUrl && !imgFailed) {
    return (
      <div className={`w-full h-full relative overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}>
        <img
          src={directImageUrl}
          alt={game.title}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        {/* Soft bottom vignette overlay for text & badges contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-black/10 pointer-events-none" />
      </div>
    );
  }

  // --- 3. DYNAMIC VECTOR ILLUSTRATIONS ---

  // A. DRAWING / COLORING ILLUSTRATION
  if (isDrawing) {
    return (
      <div className={`w-full h-full relative overflow-hidden bg-gradient-to-br from-pink-100 via-rose-50 to-amber-100 flex items-center justify-center select-none ${className}`}>
        <svg viewBox="0 0 360 200" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="artBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fdf2f8" />
              <stop offset="50%" stopColor="#fce7f3" />
              <stop offset="100%" stopColor="#fef3c7" />
            </linearGradient>
            <linearGradient id="rainbowGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="75%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="paletteWood" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="360" height="200" fill="url(#artBg)" />

          {/* Whimsical decorative rainbow arc */}
          <path d="M -20,180 Q 180,-20 380,180" fill="none" stroke="url(#rainbowGrad)" strokeWidth="18" opacity="0.3" strokeLinecap="round" />
          <path d="M 0,185 Q 180,5 360,185" fill="none" stroke="url(#rainbowGrad)" strokeWidth="8" opacity="0.4" strokeLinecap="round" />

          {/* Sparkles & floating bubbles */}
          <circle cx="50" cy="50" r="16" fill="#f43f5e" opacity="0.15" />
          <circle cx="310" cy="60" r="22" fill="#3b82f6" opacity="0.12" />
          <circle cx="80" cy="140" r="12" fill="#10b981" opacity="0.18" />
          <circle cx="290" cy="140" r="14" fill="#fbbf24" opacity="0.2" />

          <text x="45" y="45" fontSize="20" opacity="0.8">✨</text>
          <text x="300" y="55" fontSize="24" opacity="0.8">⭐</text>
          <text x="60" y="160" fontSize="18" opacity="0.7">🌸</text>
          <text x="290" y="150" fontSize="22" opacity="0.8">🎈</text>

          {/* Main Drawing Easel / Canvas & Palette Group */}
          <g transform="translate(180, 100)">
            {/* White Paper Canvas Card */}
            <rect x="-85" y="-65" width="170" height="110" rx="18" fill="#ffffff" stroke="#fbcfe8" strokeWidth="4" filter="drop-shadow(0 8px 16px rgba(244,63,94,0.15))" />

            {/* Cute flower drawn on canvas */}
            <circle cx="-25" cy="-10" r="14" fill="#fb7185" />
            <circle cx="-13" cy="-22" r="14" fill="#fb7185" />
            <circle cx="0" cy="-10" r="14" fill="#fb7185" />
            <circle cx="-13" cy="2" r="14" fill="#fb7185" />
            <circle cx="-13" cy="-10" r="11" fill="#fef08a" stroke="#f59e0b" strokeWidth="2" />
            <path d="M -13,10 Q -10,32 -13,42" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
            <path d="M -13,24 Q 0,16 6,24 Q 0,30 -13,26" fill="#86efac" stroke="#16a34a" strokeWidth="1.5" />

            {/* Painter's Palette */}
            <g transform="translate(35, 12)">
              <ellipse cx="0" cy="0" rx="36" ry="26" fill="url(#paletteWood)" stroke="#ca8a04" strokeWidth="3" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.1))" />
              <ellipse cx="18" cy="-6" rx="6" ry="7" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
              {/* Colorful Paint Blobs */}
              <circle cx="-18" cy="-10" r="5.5" fill="#ef4444" />
              <circle cx="-6" cy="-15" r="5.5" fill="#3b82f6" />
              <circle cx="-22" cy="5" r="5.5" fill="#10b981" />
              <circle cx="-8" cy="14" r="5.5" fill="#f59e0b" />
              <circle cx="8" cy="12" r="5" fill="#8b5cf6" />
            </g>

            {/* Paint Brush across */}
            <g transform="rotate(-30 45 -20)">
              <rect x="20" y="-24" width="60" height="6" rx="3" fill="#b45309" />
              <rect x="12" y="-25" width="10" height="8" rx="2" fill="#94a3b8" />
              <path d="M 12,-25 Q 2,-21 12,-17 Z" fill="#ec4899" />
            </g>
          </g>

          {/* Cheerful Banner Text at bottom */}
          <rect x="70" y="162" width="220" height="26" rx="13" fill="#ffffff" opacity="0.95" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))" />
          <text x="180" y="179" textAnchor="middle" fill="#db2777" fontWeight="900" fontSize="11" letterSpacing="0.8">
            🎨 BÉ TẬP VẼ & TÔ MÀU SÁNG TẠO
          </text>
        </svg>
      </div>
    );
  }

  // B. HTML5 / ZIP INTERACTIVE GAME
  if (isHtmlZip) {
    return (
      <div className={`w-full h-full relative overflow-hidden bg-gradient-to-br from-cyan-100 via-sky-50 to-indigo-100 flex items-center justify-center select-none ${className}`}>
        <svg viewBox="0 0 360 200" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="gameBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ecfeff" />
              <stop offset="50%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#ede9fe" />
            </linearGradient>
            <linearGradient id="consoleBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="screenGlass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>

          <rect width="360" height="200" fill="url(#gameBg)" />

          {/* Floating gamer decorative elements */}
          <circle cx="40" cy="40" r="20" fill="#0284c7" opacity="0.1" />
          <circle cx="320" cy="50" r="18" fill="#8b5cf6" opacity="0.15" />
          <circle cx="60" cy="150" r="14" fill="#10b981" opacity="0.15" />
          <circle cx="310" cy="140" r="22" fill="#f59e0b" opacity="0.12" />

          <text x="35" y="45" fontSize="20" opacity="0.8">🕹️</text>
          <text x="305" y="55" fontSize="22" opacity="0.8">⭐</text>
          <text x="45" y="165" fontSize="20" opacity="0.8">🚀</text>
          <text x="300" y="150" fontSize="24" opacity="0.8">👾</text>

          {/* Handheld Gamepad / Console Graphic */}
          <g transform="translate(180, 95)">
            {/* Outer Console Body */}
            <rect x="-105" y="-55" width="210" height="110" rx="32" fill="url(#consoleBody)" stroke="#0284c7" strokeWidth="4" filter="drop-shadow(0 10px 20px rgba(2,132,199,0.25))" />

            {/* Inner Screen Bezel */}
            <rect x="-52" y="-42" width="104" height="84" rx="14" fill="url(#screenGlass)" stroke="#38bdf8" strokeWidth="2.5" />

            {/* Screen Content: Cute animated game elements */}
            <circle cx="0" cy="-6" r="16" fill="#facc15" />
            <circle cx="-5" cy="-9" r="2.5" fill="#0f172a" />
            <circle cx="5" cy="-9" r="2.5" fill="#0f172a" />
            <path d="M -6,-2 Q 0,5 6,-2" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
            <text x="0" y="24" textAnchor="middle" fill="#38bdf8" fontWeight="900" fontSize="10" letterSpacing="1">
              LEVEL 1
            </text>

            {/* D-Pad (Left Controller) */}
            <g transform="translate(-80, 0)">
              <rect x="-12" y="-4" width="24" height="8" rx="2" fill="#f8fafc" />
              <rect x="-4" y="-12" width="8" height="24" rx="2" fill="#f8fafc" />
              <circle cx="0" cy="0" r="3" fill="#cbd5e1" />
            </g>

            {/* Action Buttons (Right Controller) */}
            <g transform="translate(80, 0)">
              <circle cx="0" cy="-10" r="6" fill="#ef4444" />
              <circle cx="-10" cy="0" r="6" fill="#eab308" />
              <circle cx="10" cy="0" r="6" fill="#10b981" />
              <circle cx="0" cy="10" r="6" fill="#3b82f6" />
            </g>
          </g>

          {/* Badge pill */}
          <rect x="75" y="162" width="210" height="26" rx="13" fill="#ffffff" opacity="0.95" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))" />
          <text x="180" y="179" textAnchor="middle" fill="#0284c7" fontWeight="900" fontSize="11" letterSpacing="0.8">
            🎮 TRÒ CHƠI TƯƠNG TÁC HTML5 / ZIP
          </text>
        </svg>
      </div>
    );
  }

  // C. MATH & COUNTING ILLUSTRATION
  if (isMath) {
    return (
      <div className={`w-full h-full relative overflow-hidden bg-gradient-to-br from-emerald-100 via-teal-50 to-amber-100 flex items-center justify-center select-none ${className}`}>
        <svg viewBox="0 0 360 200" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="mathBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ecfdf5" />
              <stop offset="50%" stopColor="#f0fdf4" />
              <stop offset="100%" stopColor="#fef3c7" />
            </linearGradient>
            <linearGradient id="block1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="block2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id="block3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          <rect width="360" height="200" fill="url(#mathBg)" />

          {/* Floating symbols */}
          <text x="40" y="55" fontSize="22" opacity="0.7">🍎</text>
          <text x="310" y="50" fontSize="24" opacity="0.8">⭐</text>
          <text x="50" y="150" fontSize="22" opacity="0.7">🍏</text>
          <text x="295" y="155" fontSize="24" opacity="0.8">🖐️</text>

          {/* Main 1 - 2 - 3 3D Block Stack */}
          <g transform="translate(180, 95)">
            {/* Block 1 */}
            <g transform="translate(-65, -5)">
              <rect x="-26" y="-26" width="52" height="52" rx="14" fill="url(#block1)" filter="drop-shadow(0 8px 12px rgba(2,132,199,0.25))" />
              <text x="0" y="11" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="32" fontFamily="sans-serif">
                1
              </text>
            </g>

            {/* Block 2 */}
            <g transform="translate(0, -18)">
              <rect x="-28" y="-28" width="56" height="56" rx="15" fill="url(#block2)" filter="drop-shadow(0 10px 16px rgba(225,29,72,0.25))" />
              <text x="0" y="12" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="36" fontFamily="sans-serif">
                2
              </text>
            </g>

            {/* Block 3 */}
            <g transform="translate(65, -5)">
              <rect x="-26" y="-26" width="52" height="52" rx="14" fill="url(#block3)" filter="drop-shadow(0 8px 12px rgba(217,119,6,0.25))" />
              <text x="0" y="11" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="32" fontFamily="sans-serif">
                3
              </text>
            </g>

            {/* Counting red apples below */}
            <g transform="translate(-55, 36)">
              <circle cx="0" cy="0" r="10" fill="#ef4444" />
              <path d="M 0,-8 Q 4,-14 6,-10" fill="none" stroke="#15803d" strokeWidth="2" />
            </g>
            <g transform="translate(0, 36)">
              <circle cx="-11" cy="0" r="10" fill="#ef4444" />
              <circle cx="11" cy="0" r="10" fill="#ef4444" />
            </g>
            <g transform="translate(55, 36)">
              <circle cx="-16" cy="0" r="8" fill="#ef4444" />
              <circle cx="0" cy="0" r="8" fill="#ef4444" />
              <circle cx="16" cy="0" r="8" fill="#ef4444" />
            </g>
          </g>

          {/* Banner Pill */}
          <rect x="75" y="162" width="210" height="26" rx="13" fill="#ffffff" opacity="0.95" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))" />
          <text x="180" y="179" textAnchor="middle" fill="#059669" fontWeight="900" fontSize="11" letterSpacing="0.8">
            🔢 LÀM QUEN TOÁN & BÉ TẬP ĐẾM
          </text>
        </svg>
      </div>
    );
  }

  // D. ANIMALS & NATURE ILLUSTRATION
  if (isAnimal) {
    return (
      <div className={`w-full h-full relative overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-emerald-100 flex items-center justify-center select-none ${className}`}>
        <svg viewBox="0 0 360 200" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
          <rect width="360" height="200" fill="#fef3c7" />
          <circle cx="180" cy="180" r="160" fill="#dcfce7" opacity="0.6" />

          {/* Sun */}
          <circle cx="60" cy="50" r="22" fill="#fde047" stroke="#f59e0b" strokeWidth="3" />
          <text x="310" y="60" fontSize="24">🌳</text>
          <text x="45" y="160" fontSize="22">🌸</text>
          <text x="300" y="160" fontSize="22">🦋</text>

          {/* Cute Animals Row */}
          <g transform="translate(180, 95)">
            {/* Bear */}
            <g transform="translate(-65, 0)">
              <circle cx="0" cy="0" r="24" fill="#b45309" />
              <circle cx="-16" cy="-18" r="8" fill="#b45309" />
              <circle cx="16" cy="-18" r="8" fill="#b45309" />
              <ellipse cx="0" cy="6" rx="12" ry="8" fill="#fde68a" />
              <circle cx="-7" cy="-2" r="3" fill="#1e293b" />
              <circle cx="7" cy="-2" r="3" fill="#1e293b" />
              <circle cx="0" cy="3" r="3.5" fill="#1e293b" />
            </g>

            {/* Cute Lion in center */}
            <g transform="translate(0, -6)">
              {/* Mane */}
              <circle cx="0" cy="0" r="36" fill="#f97316" />
              {/* Face */}
              <circle cx="0" cy="0" r="26" fill="#fde047" />
              <circle cx="-8" cy="-3" r="3" fill="#1e293b" />
              <circle cx="8" cy="-3" r="3" fill="#1e293b" />
              <ellipse cx="0" cy="8" rx="8" ry="6" fill="#fef08a" />
              <path d="M 0,5 L -3,9 L 3,9 Z" fill="#9a3412" />
            </g>

            {/* Bunny */}
            <g transform="translate(65, 0)">
              {/* Ears */}
              <ellipse cx="-8" cy="-24" rx="5" ry="15" fill="#fce7f3" stroke="#f43f5e" strokeWidth="2" />
              <ellipse cx="8" cy="-24" rx="5" ry="15" fill="#fce7f3" stroke="#f43f5e" strokeWidth="2" />
              {/* Head */}
              <circle cx="0" cy="0" r="22" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
              <circle cx="-7" cy="-2" r="2.5" fill="#1e293b" />
              <circle cx="7" cy="-2" r="2.5" fill="#1e293b" />
              <circle cx="0" cy="3" r="3" fill="#f43f5e" />
            </g>
          </g>

          {/* Banner Pill */}
          <rect x="75" y="162" width="210" height="26" rx="13" fill="#ffffff" opacity="0.95" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))" />
          <text x="180" y="179" textAnchor="middle" fill="#ea580c" fontWeight="900" fontSize="11" letterSpacing="0.8">
            🦁 THẾ GIỚI ĐỘNG VẬT QUANH BÉ
          </text>
        </svg>
      </div>
    );
  }

  // E. MUSIC ILLUSTRATION
  if (isMusic) {
    return (
      <div className={`w-full h-full relative overflow-hidden bg-gradient-to-br from-violet-100 via-purple-50 to-pink-100 flex items-center justify-center select-none ${className}`}>
        <svg viewBox="0 0 360 200" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
          <rect width="360" height="200" fill="#faf5ff" />
          <path d="M 0,160 Q 90,80 180,140 Q 270,200 360,110" fill="none" stroke="#c084fc" strokeWidth="6" opacity="0.4" />
          <text x="40" y="55" fontSize="24">🎵</text>
          <text x="310" y="55" fontSize="26">🎶</text>
          <text x="50" y="150" fontSize="22">🥁</text>
          <text x="300" y="150" fontSize="22">⭐</text>

          <g transform="translate(180, 95)">
            <circle cx="0" cy="0" r="42" fill="#a855f7" filter="drop-shadow(0 8px 16px rgba(168,85,247,0.3))" />
            <text x="0" y="14" textAnchor="middle" fontSize="42">
              🎼
            </text>
          </g>

          <rect x="75" y="162" width="210" height="26" rx="13" fill="#ffffff" opacity="0.95" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))" />
          <text x="180" y="179" textAnchor="middle" fill="#7e22ce" fontWeight="900" fontSize="11" letterSpacing="0.8">
            🎵 BÉ HỌC VUI CÙNG ÂM NHẠC
          </text>
        </svg>
      </div>
    );
  }

  // F. LETTERS / ALPHABET (DEFAULT & PRIMARY PRESCHOOL THEME)
  // Display dynamic 3D blocks matching the actual letters in the game
  const blocks = extractedLetters;
  const isTrio = blocks.length >= 3;

  const blockColors = [
    { bg: '#38bdf8', border: '#0284c7', text: '#ffffff' },
    { bg: '#f43f5e', border: '#be123c', text: '#ffffff' },
    { bg: '#fbbf24', border: '#b45309', text: '#ffffff' },
  ];

  return (
    <div className={`w-full h-full relative overflow-hidden bg-gradient-to-br from-amber-100 via-rose-50 to-sky-100 flex items-center justify-center select-none ${className}`}>
      <svg viewBox="0 0 360 200" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="alphaBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="50%" stopColor="#fdf2f8" />
            <stop offset="100%" stopColor="#f0f9ff" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="360" height="200" fill="url(#alphaBg)" />

        {/* Floating playful clouds & stars */}
        <circle cx="45" cy="45" r="16" fill="#fbbf24" opacity="0.2" />
        <circle cx="315" cy="50" r="20" fill="#38bdf8" opacity="0.2" />
        <circle cx="50" cy="155" r="14" fill="#f43f5e" opacity="0.15" />
        <circle cx="310" cy="145" r="18" fill="#10b981" opacity="0.2" />

        <text x="35" y="45" fontSize="22" opacity="0.8">⭐</text>
        <text x="305" y="55" fontSize="24" opacity="0.8">🎈</text>
        <text x="45" y="165" fontSize="20" opacity="0.75">✏️</text>
        <text x="300" y="150" fontSize="22" opacity="0.8">🌟</text>

        {/* Alphabet Blocks Center Group */}
        <g transform="translate(180, 95)">
          {isTrio ? (
            <>
              {/* 3 Blocks Layout: e.g. A, Ă, Â or A, B, C */}
              <g transform="translate(-68, -4)">
                <rect x="-27" y="-27" width="54" height="54" rx="16" fill={blockColors[0].bg} stroke={blockColors[0].border} strokeWidth="3" filter="drop-shadow(0 8px 12px rgba(2,132,199,0.25))" />
                <text x="0" y="12" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="30" fontFamily="sans-serif">
                  {blocks[0]}
                </text>
              </g>

              <g transform="translate(0, -16)">
                <rect x="-30" y="-30" width="60" height="60" rx="18" fill={blockColors[1].bg} stroke={blockColors[1].border} strokeWidth="3.5" filter="drop-shadow(0 10px 16px rgba(225,29,72,0.3))" />
                <text x="0" y="13" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="34" fontFamily="sans-serif">
                  {blocks[1]}
                </text>
              </g>

              <g transform="translate(68, -4)">
                <rect x="-27" y="-27" width="54" height="54" rx="16" fill={blockColors[2].bg} stroke={blockColors[2].border} strokeWidth="3" filter="drop-shadow(0 8px 12px rgba(180,83,9,0.25))" />
                <text x="0" y="12" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="30" fontFamily="sans-serif">
                  {blocks[2]}
                </text>
              </g>
            </>
          ) : (
            <>
              {/* 2 Blocks Layout: e.g. U - Ư or M - N or H - K */}
              <g transform="translate(-48, -10)">
                <rect x="-36" y="-36" width="72" height="72" rx="20" fill={blockColors[0].bg} stroke={blockColors[0].border} strokeWidth="4" filter="drop-shadow(0 10px 18px rgba(2,132,199,0.28))" />
                <text x="0" y="16" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="42" fontFamily="sans-serif">
                  {blocks[0]}
                </text>
              </g>

              <g transform="translate(48, -10)">
                <rect x="-36" y="-36" width="72" height="72" rx="20" fill={blockColors[1].bg} stroke={blockColors[1].border} strokeWidth="4" filter="drop-shadow(0 10px 18px rgba(225,29,72,0.28))" />
                <text x="0" y="16" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="42" fontFamily="sans-serif">
                  {blocks[1]}
                </text>
              </g>
            </>
          )}

          {/* Cheerful playful sparkles between blocks */}
          <circle cx="0" cy="30" r="4" fill="#f59e0b" />
          <circle cx="-35" cy="36" r="3" fill="#3b82f6" />
          <circle cx="35" cy="36" r="3" fill="#ec4899" />
        </g>

        {/* Bottom Banner Pill */}
        <rect x="70" y="162" width="220" height="26" rx="13" fill="#ffffff" opacity="0.95" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.06))" />
        <text x="180" y="179" textAnchor="middle" fill="#4f46e5" fontWeight="900" fontSize="11" letterSpacing="0.8">
          🔤 BÉ LÀM QUEN CHỮ CÁI TIẾNG VIỆT
        </text>
      </svg>
    </div>
  );
};
