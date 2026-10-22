// Preschool drawing templates for open-ended questions (tô màu, nối nét, khoanh tròn, tập viết chữ)

export interface OpenEndedTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  dataUrl: string;
}

// Generate crisp, clean SVG data URLs for preschool coloring and drawing activities
const svgToDataUrl = (svgString: string): string => {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
};

export const OPEN_ENDED_PRESET_TEMPLATES: OpenEndedTemplate[] = [
  {
    id: 'tpl_flower_color',
    name: 'Tô màu bông hoa 🌸',
    description: 'Bé tập tô màu các cánh hoa và nhụy hoa thật đẹp',
    icon: '🌸',
    dataUrl: svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#ffffff" />
  <!-- Stem & Leaves -->
  <path d="M400,320 Q405,440 395,540" fill="none" stroke="#22c55e" stroke-width="14" stroke-linecap="round" />
  <path d="M400,430 Q460,400 480,430 Q460,470 400,450" fill="#bbf7d0" stroke="#16a34a" stroke-width="6" />
  <path d="M398,470 Q340,440 320,470 Q340,510 398,490" fill="#bbf7d0" stroke="#16a34a" stroke-width="6" />
  
  <!-- Flower Petals Outlines for coloring -->
  <!-- Top Petal -->
  <ellipse cx="400" cy="180" rx="65" ry="90" fill="#fdf2f8" stroke="#db2777" stroke-width="8" stroke-dasharray="2,1" />
  <!-- Top Right Petal -->
  <ellipse cx="495" cy="235" rx="65" ry="90" transform="rotate(72 495 235)" fill="#fdf2f8" stroke="#db2777" stroke-width="8" stroke-dasharray="2,1" />
  <!-- Bottom Right Petal -->
  <ellipse cx="460" cy="345" rx="65" ry="90" transform="rotate(144 460 345)" fill="#fdf2f8" stroke="#db2777" stroke-width="8" stroke-dasharray="2,1" />
  <!-- Bottom Left Petal -->
  <ellipse cx="340" cy="345" rx="65" ry="90" transform="rotate(216 340 345)" fill="#fdf2f8" stroke="#db2777" stroke-width="8" stroke-dasharray="2,1" />
  <!-- Top Left Petal -->
  <ellipse cx="305" cy="235" rx="65" ry="90" transform="rotate(288 305 235)" fill="#fdf2f8" stroke="#db2777" stroke-width="8" stroke-dasharray="2,1" />
  
  <!-- Center Flower Core -->
  <circle cx="400" cy="280" r="55" fill="#fef08a" stroke="#ca8a04" stroke-width="8" />
  <!-- Smiley Face in center -->
  <circle cx="380" cy="270" r="6" fill="#854d0e" />
  <circle cx="420" cy="270" r="6" fill="#854d0e" />
  <path d="M382,295 Q400,315 418,295" fill="none" stroke="#854d0e" stroke-width="6" stroke-linecap="round" />
  
  <!-- Prompt note at bottom -->
  <text x="400" y="580" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="20" fill="#9333ea">
    Bé hãy chọn màu yêu thích để tô thật đẹp cho bông hoa nhé!
  </text>
</svg>`),
  },
  {
    id: 'tpl_bunny_draw',
    name: 'Tô & vẽ chú thỏ con 🐰',
    description: 'Bé vẽ thêm mắt, mũi và tô màu cho chú thỏ',
    icon: '🐰',
    dataUrl: svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#ffffff" />
  <!-- Bunny Ears Outlines -->
  <ellipse cx="340" cy="160" rx="36" ry="110" fill="#fdf2f8" stroke="#475569" stroke-width="8" />
  <ellipse cx="340" cy="170" rx="18" ry="75" fill="#fbcfe8" stroke="#f472b6" stroke-width="4" stroke-dasharray="4,4" />
  
  <ellipse cx="460" cy="160" rx="36" ry="110" fill="#fdf2f8" stroke="#475569" stroke-width="8" />
  <ellipse cx="460" cy="170" rx="18" ry="75" fill="#fbcfe8" stroke="#f472b6" stroke-width="4" stroke-dasharray="4,4" />

  <!-- Bunny Head -->
  <circle cx="400" cy="310" r="130" fill="#ffffff" stroke="#475569" stroke-width="8" />

  <!-- Cheeks blush -->
  <circle cx="320" cy="340" r="22" fill="#fecdd3" opacity="0.6" />
  <circle cx="480" cy="340" r="22" fill="#fecdd3" opacity="0.6" />

  <!-- Dotted guides for Eyes & Nose -->
  <circle cx="350" cy="290" r="10" fill="none" stroke="#94a3b8" stroke-width="4" stroke-dasharray="4,3" />
  <circle cx="450" cy="290" r="10" fill="none" stroke="#94a3b8" stroke-width="4" stroke-dasharray="4,3" />
  <polygon points="400,325 385,345 415,345" fill="none" stroke="#94a3b8" stroke-width="4" stroke-dasharray="4,3" />
  <path d="M400,345 L400,360 Q380,380 360,365 M400,360 Q420,380 440,365" fill="none" stroke="#94a3b8" stroke-width="4" stroke-dasharray="4,3" />

  <!-- Whiskers -->
  <line x1="280" y1="330" x2="220" y2="320" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round" />
  <line x1="280" y1="350" x2="215" y2="355" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round" />
  <line x1="520" y1="330" x2="580" y2="320" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round" />
  <line x1="520" y1="350" x2="585" y2="355" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round" />

  <!-- Prompt note at bottom -->
  <text x="400" y="540" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="20" fill="#475569">
    Bé hãy vẽ mắt, mũi, miệng và tô màu cho chú thỏ con thật đáng yêu nhé!
  </text>
</svg>`),
  },
  {
    id: 'tpl_letter_o',
    name: 'Tập viết nét chữ O ⭕',
    description: 'Bé tập đồ theo nét đứt để viết chữ O thật tròn',
    icon: '⭕',
    dataUrl: svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#ffffff" />
  <!-- Notebook lines grid -->
  <line x1="60" y1="120" x2="740" y2="120" stroke="#e2e8f0" stroke-width="3" />
  <line x1="60" y1="260" x2="740" y2="260" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6,6" />
  <line x1="60" y1="400" x2="740" y2="400" stroke="#f43f5e" stroke-width="4" />
  
  <!-- Model Letter O on left -->
  <ellipse cx="230" cy="260" rx="90" ry="120" fill="none" stroke="#6366f1" stroke-width="16" />
  <text x="230" y="460" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="24" fill="#4f46e5">
    Chữ O mẫu
  </text>

  <!-- Dotted Practice Letter O on right for child to trace -->
  <ellipse cx="560" cy="260" rx="90" ry="120" fill="none" stroke="#94a3b8" stroke-width="14" stroke-dasharray="14,12" stroke-linecap="round" />
  
  <!-- Start Point dot & arrow -->
  <circle cx="560" cy="140" r="14" fill="#ef4444" />
  <text x="560" y="105" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="18" fill="#ef4444">
    Điểm bắt đầu 🔴
  </text>
  <path d="M540,145 Q510,165 490,200" fill="none" stroke="#f97316" stroke-width="6" marker-end="url(#arrow)" />

  <text x="560" y="460" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="24" fill="#0284c7">
    Bé đồ theo nét đứt này nhé!
  </text>
  <text x="400" y="550" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="20" fill="#64748b">
    Bé dùng cọ màu đỏ hoặc xanh để vẽ theo nét đứt thành chữ O thật tròn
  </text>
</svg>`),
  },
  {
    id: 'tpl_matching_animals',
    name: 'Nối hình con vật & thức ăn 🐱🐟',
    description: 'Bé dùng bút vẽ các đường nối con vật với món ăn yêu thích',
    icon: '🐱',
    dataUrl: svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#ffffff" />
  <!-- Title -->
  <text x="400" y="60" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="24" fill="#1e1b4b">
    BÉ HÃY NỐI CON VẬT VỚI MÓN ĂN TƯƠNG ỨNG NHÉ!
  </text>

  <!-- Left Column: Animals -->
  <!-- Cat -->
  <rect x="100" y="110" width="180" height="95" rx="20" fill="#eff6ff" stroke="#3b82f6" stroke-width="4" />
  <text x="145" y="172" font-size="44">🐱</text>
  <text x="195" y="165" font-family="sans-serif" font-weight="900" font-size="22" fill="#1e3a8a">Mèo con</text>
  <circle cx="280" cy="157" r="12" fill="#3b82f6" />

  <!-- Rabbit -->
  <rect x="100" y="250" width="180" height="95" rx="20" fill="#fdf2f8" stroke="#ec4899" stroke-width="4" />
  <text x="145" y="312" font-size="44">🐰</text>
  <text x="195" y="305" font-family="sans-serif" font-weight="900" font-size="22" fill="#831843">Thỏ trắng</text>
  <circle cx="280" cy="297" r="12" fill="#ec4899" />

  <!-- Dog -->
  <rect x="100" y="390" width="180" height="95" rx="20" fill="#fffbeb" stroke="#f59e0b" stroke-width="4" />
  <text x="145" y="452" font-size="44">🐶</text>
  <text x="195" y="445" font-family="sans-serif" font-weight="900" font-size="22" fill="#78350f">Cún con</text>
  <circle cx="280" cy="437" r="12" fill="#f59e0b" />

  <!-- Right Column: Foods (Shuffled) -->
  <!-- Carrot -->
  <rect x="520" y="110" width="180" height="95" rx="20" fill="#fdf2f8" stroke="#ec4899" stroke-width="4" />
  <circle cx="520" cy="157" r="12" fill="#ec4899" />
  <text x="565" y="172" font-size="44">🥕</text>
  <text x="615" y="165" font-family="sans-serif" font-weight="900" font-size="22" fill="#831843">Củ cà rốt</text>

  <!-- Bone -->
  <rect x="520" y="250" width="180" height="95" rx="20" fill="#fffbeb" stroke="#f59e0b" stroke-width="4" />
  <circle cx="520" cy="297" r="12" fill="#f59e0b" />
  <text x="565" y="312" font-size="44">🦴</text>
  <text x="615" y="305" font-family="sans-serif" font-weight="900" font-size="22" fill="#78350f">Cục xương</text>

  <!-- Fish -->
  <rect x="520" y="390" width="180" height="95" rx="20" fill="#eff6ff" stroke="#3b82f6" stroke-width="4" />
  <circle cx="520" cy="437" r="12" fill="#3b82f6" />
  <text x="565" y="452" font-size="44">🐟</text>
  <text x="615" y="445" font-family="sans-serif" font-weight="900" font-size="22" fill="#1e3a8a">Con cá</text>

  <!-- Helper instruction -->
  <text x="400" y="555" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="19" fill="#64748b">
    Bé hãy dùng cọ vẽ một đường nối từ chấm tròn của con vật sang món ăn đúng nhé!
  </text>
</svg>`),
  },
  {
    id: 'tpl_picture_frame',
    name: 'Khung tranh hoa cầu vồng 🌈',
    description: 'Khung viền sinh động để bé tự do vẽ tranh theo đề bài của cô',
    icon: '🎨',
    dataUrl: svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#ffffff" />
  <!-- Colorful rounded border frame -->
  <rect x="30" y="30" width="740" height="540" rx="36" fill="#fdfbf7" stroke="#e0e7ff" stroke-width="10" />
  <rect x="50" y="50" width="700" height="500" rx="24" fill="#ffffff" stroke="#c7d2fe" stroke-width="4" stroke-dasharray="10,8" />

  <!-- Corner decorations -->
  <!-- Top Left Sun -->
  <text x="65" y="115" font-size="52">☀️</text>
  <!-- Top Right Rainbow -->
  <text x="665" y="115" font-size="52">🌈</text>
  <!-- Bottom Left Flower -->
  <text x="65" y="525" font-size="52">🌸</text>
  <!-- Bottom Right Star -->
  <text x="665" y="525" font-size="52">⭐</text>

  <!-- Gentle center prompt -->
  <text x="400" y="290" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="26" fill="#cbd5e1">
    BÉ VẼ TRANH VÀO KHUNG NÀY NHÉ!
  </text>
  <text x="400" y="330" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="18" fill="#e2e8f0">
    (Bé hãy chọn màu cọ bên trên và tự do sáng tạo)
  </text>
</svg>`),
  },
];
