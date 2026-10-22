import React, { useState, useRef, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import { Game } from '../../types/game';
import { createHtmlGameQuestion, generateStarterHtmlTemplate } from '../../data/htmlGames';
import {
  extractAndBundleZipGame,
  reBundleFromSelectedHtml,
  saveZipAssetsToServer,
  ExtractedZipResult,
  isTrivialHtml
} from '../../utils/zipGameHandler';
import { saveGame } from '../../services/gameStorage';
import { sounds } from '../../utils/sound';
import {
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Play,
  Download,
  Info,
  X,
  Sparkles,
  HelpCircle,
  Archive,
  Loader2,
  FolderOpen,
  FileText,
  Palette,
  Code,
  Image as ImageIcon,
  Music,
  Check,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface UploadHtmlGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGameUploaded: (game: Game) => void;
}

export const UploadHtmlGameModal: React.FC<UploadHtmlGameModalProps> = ({
  isOpen,
  onClose,
  onGameUploaded,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'preview' | 'guide'>('info');
  const [file, setFile] = useState<File | null>(null);
  const [isZipArchive, setIsZipArchive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [zipResult, setZipResult] = useState<ExtractedZipResult | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [gameTitle, setGameTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('Trò chơi tương tác HTML5 / ZIP dành cho các bé');
  const [category, setCategory] = useState<string>('Chữ cái');
  const [timeLimit, setTimeLimit] = useState<number>(0);
  const [points, setPoints] = useState<number>(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const failedHtmlFilesRef = useRef<Set<string>>(new Set());
  const zipResultRef = useRef<ExtractedZipResult | null>(null);

  // Keep zipResultRef synchronized
  useEffect(() => {
    zipResultRef.current = zipResult;
  }, [zipResult]);

  // Listen to runtime errors or empty DOM messages from the iframe
  // Requirement: "file index của game bị lỗi hãy truy xuất file html khác trong gói zip để chạy. Nếu không có hãy xuất ra thông báo lỗi trò chơi cho người dùng biết"
  useEffect(() => {
    const handleFrameMessage = (e: MessageEvent) => {
      if (e.data && typeof e.data === 'object') {
        if (e.data.type === 'GAME_RUNTIME_ERROR' || e.data.type === 'GAME_EMPTY_DOM') {
          const errDetail =
            e.data.type === 'GAME_RUNTIME_ERROR'
              ? String(e.data.message || 'Lỗi mã nguồn JavaScript')
              : 'Trang HTML hiển thị màn hình trắng (không có phần tử nội dung)';

          // Ignore benign warnings
          const str = errDetail.toLowerCase();
          if (
            str.includes('firebase') ||
            str.includes('auth/') ||
            str.includes('play()') ||
            str.includes('resizeobserver') ||
            str.includes('user gesture')
          ) {
            return;
          }

          console.warn('Game execution issue in iframe:', e.data);

          const currentZip = zipResultRef.current;
          if (currentZip && currentZip.htmlFiles.length > 0) {
            const currentFailed = e.data.htmlPath || currentZip.mainHtmlPath;
            failedHtmlFilesRef.current.add(currentFailed);

            // Attempt to retrieve another HTML file in the ZIP package that hasn't failed yet
            const alternateFile = currentZip.htmlFiles.find(
              (f) => !failedHtmlFilesRef.current.has(f) && f !== currentFailed
            );

            if (alternateFile) {
              console.log(`Auto-recovering from broken ${currentFailed} -> loading alternate: ${alternateFile}`);
              try {
                const updated = reBundleFromSelectedHtml(currentZip, alternateFile);
                setZipResult(updated);
                zipResultRef.current = updated;
                setHtmlContent(updated.bundledHtml);
                setRuntimeError(null);
                setErrorMsg(null);
                setFallbackNotice(
                  `File index của game ("${currentFailed}") bị lỗi khi chạy (${errDetail}). Hệ thống đã tự động truy xuất sang file "${alternateFile}" trong gói ZIP để chạy.`
                );
                sounds.playCorrect();
                return;
              } catch (reBundleErr) {
                console.error('Failed to bundle alternate HTML:', reBundleErr);
              }
            }

            // No other HTML file in the ZIP or all alternatives failed
            const errMsg =
              currentZip.htmlFiles.length <= 1
                ? `THÔNG BÁO LỖI TRÒ CHƠI: File index của game bị lỗi khi chạy (${errDetail}) và không tìm thấy file HTML nào khác trong gói ZIP để chạy. Vui lòng kiểm tra lại mã nguồn trò chơi!`
                : `THÔNG BÁO LỖI TRÒ CHƠI: Tất cả ${currentZip.htmlFiles.length} file HTML trong gói ZIP đều gặp lỗi khi chạy. File cuối cùng bị lỗi: ${errDetail}.`;

            setRuntimeError(errDetail);
            setErrorMsg(errMsg);
            sounds.playWrong();
          } else {
            setRuntimeError(errDetail);
            setErrorMsg(`THÔNG BÁO LỖI TRÒ CHƠI: ${errDetail}.`);
            sounds.playWrong();
          }
        }
      }
    };

    window.addEventListener('message', handleFrameMessage);
    return () => window.removeEventListener('message', handleFrameMessage);
  }, []);

  const zipStats = useMemo(() => {
    if (!zipResult) return null;
    const htmlFiles = zipResult.fileList.filter(f => f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm'));
    const cssFiles = zipResult.fileList.filter(f => f.toLowerCase().endsWith('.css'));
    const jsFiles = zipResult.fileList.filter(f => f.toLowerCase().endsWith('.js') || f.toLowerCase().endsWith('.mjs'));
    const imageFiles = zipResult.fileList.filter(f => /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(f));
    const audioFiles = zipResult.fileList.filter(f => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f));
    const otherFiles = zipResult.fileList.filter(f => !htmlFiles.includes(f) && !cssFiles.includes(f) && !jsFiles.includes(f) && !imageFiles.includes(f) && !audioFiles.includes(f));

    return {
      htmlCount: htmlFiles.length,
      cssCount: cssFiles.length,
      jsCount: jsFiles.length,
      imageCount: imageFiles.length,
      audioCount: audioFiles.length,
      otherCount: otherFiles.length,
      htmlFiles,
      cssFiles,
      jsFiles,
      imageFiles,
      audioFiles,
      otherFiles,
    };
  }, [zipResult]);

  if (!isOpen) return null;

  const categories = [
    'Chữ cái',
    'Làm quen với toán',
    'Động vật',
    'Môi trường xung quanh',
    'Kỹ năng xã hội',
    'Khác',
  ];

  // Process chosen or dropped ZIP / HTML file
  const handleProcessFile = async (selectedFile: File) => {
    const isZip = selectedFile.name.toLowerCase().endsWith('.zip');
    const isHtml = selectedFile.name.toLowerCase().endsWith('.html') || selectedFile.name.toLowerCase().endsWith('.htm');

    if (!isZip && !isHtml) {
      setErrorMsg('Vui lòng chọn file nén (.zip) hoặc file (.html, .htm)');
      sounds.playWrong();
      return;
    }

    setErrorMsg(null);
    setFile(selectedFile);
    setIsZipArchive(isZip);
    setIsProcessing(true);

    try {
      if (isZip) {
        // Unpack zip, parse assets and bundle
        const result = await extractAndBundleZipGame(selectedFile);
        setZipResult(result);
        setHtmlContent(result.bundledHtml);
        setGameTitle(result.title);
        setRuntimeError(null);

        failedHtmlFilesRef.current = new Set();
        if (result.isFallbackFromError) {
          if (result.hasValidAlternative && result.hasSubstantialContent) {
            setFallbackNotice(
              result.fallbackReason ||
                `File index của game bị lỗi. Hệ thống đã tự động truy xuất sang file "${result.mainHtmlPath}" trong gói ZIP để chạy.`
            );
            sounds.playCorrect();
          } else {
            setErrorMsg(
              result.fallbackReason ||
                `LỖI TRÒ CHƠI: File index của game bị lỗi và không tìm thấy file HTML nào khác trong gói ZIP để chạy. Vui lòng kiểm tra lại trò chơi!`
            );
            sounds.playWrong();
          }
        } else if (!result.hasSubstantialContent) {
          setErrorMsg(
            `LỖI TRÒ CHƠI: File "${result.mainHtmlPath}" có nội dung rỗng hoặc không hợp lệ và không tìm thấy file HTML nào khác trong gói ZIP để chạy.`
          );
          sounds.playWrong();
        } else {
          setFallbackNotice(null);
          sounds.playCorrect();
        }
      } else {
        // Read standalone HTML file
        const text = await selectedFile.text();
        setZipResult(null);
        setHtmlContent(text);
        setFallbackNotice(null);
        setRuntimeError(null);

        if (isTrivialHtml(text)) {
          setErrorMsg('Cảnh báo: File HTML này có nội dung quá ngắn hoặc rỗng, có thể không hiển thị được trò chơi.');
        }

        // Extract title from <title> tag if present
        const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          setGameTitle(titleMatch[1].trim());
        } else {
          const cleanName = selectedFile.name.replace(/\.(html|htm)$/i, '').replace(/[-_]/g, ' ');
          setGameTitle(cleanName);
        }
        sounds.playCorrect();
      }
    } catch (err: any) {
      console.error('File process error:', err);
      setErrorMsg(err.message || 'Lỗi khi đọc file. Vui lòng kiểm tra lại file nén.');
      sounds.playWrong();
    } finally {
      setIsProcessing(false);
    }
  };

  // Switch to another HTML file entry in the same uploaded ZIP
  const handleSwitchHtmlFile = (targetPath: string) => {
    if (!zipResult) return;
    sounds.playClick();
    try {
      const updated = reBundleFromSelectedHtml(zipResult, targetPath);
      setZipResult(updated);
      setHtmlContent(updated.bundledHtml);
      if (updated.title && updated.title.toLowerCase() !== 'index') {
        setGameTitle(updated.title);
      }
      setRuntimeError(null);
      setErrorMsg(null);
      setFallbackNotice(`Đã chuyển sang khởi chạy bằng tệp: "${targetPath}".`);
      sounds.playCorrect();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể chuyển sang file HTML này.');
      sounds.playWrong();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleProcessFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleProcessFile(droppedFile);
    }
  };

  const handleSave = async () => {
    if (!htmlContent.trim()) {
      setErrorMsg('Vui lòng chọn hoặc tải lên một file trò chơi trước khi lưu.');
      sounds.playWrong();
      return;
    }

    if (!gameTitle.trim()) {
      setErrorMsg('Vui lòng nhập tên trò chơi.');
      sounds.playWrong();
      return;
    }

    sounds.playCorrect();
    setIsProcessing(true);

    const gameId = zipResult?.gameId || ('game_html_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
    let hostedGameUrl: string | undefined = zipResult?.gameUrl;

    // If it's a ZIP archive with multiple files and not hosted yet, upload to static backend storage
    if (isZipArchive && zipResult && zipResult.filesMap && !hostedGameUrl) {
      try {
        const savedUrl = await saveZipAssetsToServer(gameId, zipResult.filesMap, zipResult.mainHtmlPath);
        if (savedUrl) {
          hostedGameUrl = savedUrl;
        }
      } catch (err) {
        console.warn('Backend static save failed, relying on bundled HTML:', err);
      }
    }

    const newQuestion = createHtmlGameQuestion(
      gameTitle.trim(),
      htmlContent,
      timeLimit,
      points,
      description.trim() || 'Bé đã hoàn thành trò chơi tương tác xuất sắc!'
    );

    if (hostedGameUrl) {
      newQuestion.gameUrl = hostedGameUrl;
    }

    const newGame: Game = {
      id: gameId,
      title: gameTitle.trim(),
      description: description.trim(),
      theme: 'cyan',
      category,
      targetAge: '5-6 tuổi',
      gameType: 'html_game',
      isCustomHtml: true,
      isZipArchive,
      zipFileName: isZipArchive ? file?.name : undefined,
      gameUrl: hostedGameUrl,
      status: 'published',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      playCount: 0,
      settings: {
        timePerQuestion: 0,
        speedBonus: false,
        maxTeams: 12,
        soundEffects: true,
      },
      questions: [newQuestion],
    };

    try {
      saveGame(newGame);
      setIsProcessing(false);
      onGameUploaded(newGame);
      onClose();
    } catch (saveErr: any) {
      console.error('Failed to save game:', saveErr);
      setErrorMsg(`Lỗi khi lưu trò chơi: ${saveErr.message || 'Không thể lưu vào bộ nhớ'}`);
      sounds.playWrong();
      setIsProcessing(false);
    }
  };

  // Download complete multi-file ZIP sample (index.html, style.css, game.js, huong-dan.txt)
  const handleDownloadZipSample = async () => {
    sounds.playClick();
    const zip = new JSZip();

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trò Chơi Kéo Chữ U - Ư Nghề Nghiệp</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="game-container">
    <div class="header">
      <h1>⭐ BÉ GHÉP CHỮ U - Ư VÀO Ô NGHỀ NGHIỆP ⭐</h1>
      <p class="subtitle">Bé hãy kéo hoặc bấm vào các thẻ chữ cái để ghép vào đúng ô nhé!</p>
    </div>

    <!-- Drop targets -->
    <div class="targets-container">
      <div id="drop-u" class="drop-zone zone-u" ondragover="allowDrop(event)" ondrop="handleDrop(event, 'u')">
        <div class="zone-badge">Ô CHỮ U</div>
        <div class="zone-desc">Chú Bộ Đội · Thợ May</div>
        <div id="placed-u" class="placed-items"></div>
      </div>

      <div id="drop-uw" class="drop-zone zone-uw" ondragover="allowDrop(event)" ondrop="handleDrop(event, 'uw')">
        <div class="zone-badge">Ô CHỮ Ư</div>
        <div class="zone-desc">Bác Sĩ Thú Y · Kỹ Sư</div>
        <div id="placed-uw" class="placed-items"></div>
      </div>
    </div>

    <!-- Draggable letter cards -->
    <div class="source-tray">
      <div class="tray-title">🏷️ CÁC THẺ CHỮ CÁI CỦA BÉ:</div>
      <div id="cards-wrapper" class="cards-list">
        <div id="c1" class="drag-card card-u" draggable="true" ondragstart="handleDragStart(event, 'u', 'c1')" onclick="quickTap('u', 'c1')">
          <span class="letter">U</span>
          <span class="subtext">Chú bộ đội</span>
        </div>
        <div id="c2" class="drag-card card-uw" draggable="true" ondragstart="handleDragStart(event, 'uw', 'c2')" onclick="quickTap('uw', 'c2')">
          <span class="letter">Ư</span>
          <span class="subtext">Bác sĩ thú y</span>
        </div>
        <div id="c3" class="drag-card card-u" draggable="true" ondragstart="handleDragStart(event, 'u', 'c3')" onclick="quickTap('u', 'c3')">
          <span class="letter">U</span>
          <span class="subtext">Thợ may</span>
        </div>
        <div id="c4" class="drag-card card-uw" draggable="true" ondragstart="handleDragStart(event, 'uw', 'c4')" onclick="quickTap('uw', 'c4')">
          <span class="letter">Ư</span>
          <span class="subtext">Kỹ sư công trình</span>
        </div>
      </div>
    </div>

    <div class="footer-bar">
      <div id="status-msg" class="status-msg">Tiến độ: 0/4 thẻ chữ</div>
      <button class="btn-complete" onclick="submitGameResult()">Hoàn thành & Gửi kết quả ⭐</button>
    </div>
  </div>

  <script src="game.js"></script>
</body>
</html>`;

    const css = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: 'Nunito', system-ui, -apple-system, sans-serif;
  background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 50%, #fef3c7 100%);
  min-height: 100vh;
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  -webkit-user-select: none;
}
.game-container {
  background: white;
  border-radius: 28px;
  padding: 24px;
  max-width: 760px;
  width: 100%;
  box-shadow: 0 20px 40px -15px rgba(0,0,0,0.12);
  border: 4px solid #38bdf8;
  display: flex;
  flex-col: column;
  gap: 16px;
}
.header {
  text-align: center;
}
.header h1 {
  font-size: 1.35rem;
  color: #0369a1;
  font-weight: 900;
  letter-spacing: -0.5px;
}
.subtitle {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 700;
  margin-top: 4px;
}
.targets-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.drop-zone {
  border-radius: 20px;
  padding: 16px;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 3px dashed;
  transition: all 0.2s;
  background: #f8fafc;
}
.zone-u {
  border-color: #0284c7;
  background: #f0f9ff;
}
.zone-uw {
  border-color: #059669;
  background: #ecfdf5;
}
.zone-badge {
  font-size: 1.15rem;
  font-weight: 900;
  padding: 4px 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}
.zone-u .zone-badge { color: #0284c7; }
.zone-uw .zone-badge { color: #059669; }
.zone-desc {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 700;
  margin-top: 4px;
}
.placed-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  width: 100%;
  justify-content: center;
}
.source-tray {
  background: #f1f5f9;
  border-radius: 20px;
  padding: 14px;
  text-align: center;
}
.tray-title {
  font-size: 0.8rem;
  font-weight: 900;
  color: #475569;
  margin-bottom: 10px;
}
.cards-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}
.drag-card {
  background: white;
  border-radius: 16px;
  padding: 10px 18px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
  border: 2px solid #cbd5e1;
  cursor: grab;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.15s, box-shadow 0.15s;
}
.drag-card:active {
  transform: scale(1.05);
  cursor: grabbing;
}
.card-u { border-color: #38bdf8; }
.card-uw { border-color: #34d399; }
.drag-card .letter {
  font-size: 1.5rem;
  font-weight: 900;
  line-height: 1;
}
.card-u .letter { color: #0284c7; }
.card-uw .letter { color: #059669; }
.drag-card .subtext {
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 800;
  margin-top: 4px;
}
.footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 6px;
}
.status-msg {
  font-size: 0.9rem;
  font-weight: 800;
  color: #0369a1;
}
.btn-complete {
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  color: white;
  border: none;
  border-radius: 16px;
  padding: 12px 24px;
  font-size: 0.9rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
  transition: transform 0.15s;
}
.btn-complete:active {
  transform: scale(0.97);
}`;

    const js = `// Biến theo dõi tiến độ
let correctCount = 0;
const totalCards = 4;
let draggedData = null;

// Hàm phát âm thanh vui nhộn cho bé bằng Web Audio
function playBeep(freq, type, duration) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq || 440;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function allowDrop(ev) {
  ev.preventDefault();
}

function handleDragStart(ev, targetType, cardId) {
  draggedData = { targetType, cardId };
  ev.dataTransfer.setData('text/plain', JSON.stringify(draggedData));
}

function handleDrop(ev, zoneType) {
  ev.preventDefault();
  let data = draggedData;
  try {
    const raw = ev.dataTransfer.getData('text/plain');
    if (raw) data = JSON.parse(raw);
  } catch(e) {}

  if (!data) return;
  processCardPlacement(data.cardId, data.targetType, zoneType);
}

// Hỗ trợ cả thao tác bấm chạm trực tiếp trên điện thoại
function quickTap(targetType, cardId) {
  processCardPlacement(cardId, targetType, targetType);
}

function processCardPlacement(cardId, letterType, zoneType) {
  const cardElem = document.getElementById(cardId);
  if (!cardElem) return;

  if (letterType === zoneType) {
    // Đặt đúng
    playBeep(587.33, 'triangle', 0.2); // Âm thanh khen thưởng
    const targetBox = document.getElementById('placed-' + zoneType);
    if (targetBox) {
      targetBox.appendChild(cardElem);
      cardElem.style.cursor = 'default';
      cardElem.draggable = false;
      cardElem.onclick = null;
      correctCount++;
      updateStatus();
    }
  } else {
    // Đặt sai
    playBeep(220, 'sawtooth', 0.25);
    cardElem.style.transform = 'translateX(-6px)';
    setTimeout(() => { cardElem.style.transform = 'translateX(6px)'; }, 80);
    setTimeout(() => { cardElem.style.transform = ''; }, 160);
  }
}

function updateStatus() {
  const msg = document.getElementById('status-msg');
  if (msg) {
    msg.innerText = 'Tiến độ: ' + correctCount + '/' + totalCards + ' thẻ chữ';
  }
  if (correctCount >= totalCards) {
    setTimeout(submitGameResult, 500);
  }
}

function submitGameResult() {
  const isAllDone = correctCount >= totalCards;
  const score = isAllDone ? 30 : Math.round((correctCount / totalCards) * 30);

  // Danh sách chi tiết các thẻ đã kéo được
  const c1Placed = Boolean(document.getElementById('placed-u')?.contains(document.getElementById('c1')));
  const c2Placed = Boolean(document.getElementById('placed-uw')?.contains(document.getElementById('c2')));
  const c3Placed = Boolean(document.getElementById('placed-u')?.contains(document.getElementById('c3')));
  const c4Placed = Boolean(document.getElementById('placed-uw')?.contains(document.getElementById('c4')));

  const dragDetails = [
    { cardId: 'c1', cardText: 'U · Chú bộ đội', letter: 'U', subtext: 'Chú bộ đội', targetZone: c1Placed ? 'Ô CHỮ U' : 'Chưa kéo', expectedZone: 'Ô CHỮ U', isCorrect: c1Placed, status: c1Placed ? 'correct' : 'unplaced', points: c1Placed ? 8 : 0 },
    { cardId: 'c2', cardText: 'Ư · Bác sĩ thú y', letter: 'Ư', subtext: 'Bác sĩ thú y', targetZone: c2Placed ? 'Ô CHỮ Ư' : 'Chưa kéo', expectedZone: 'Ô CHỮ Ư', isCorrect: c2Placed, status: c2Placed ? 'correct' : 'unplaced', points: c2Placed ? 8 : 0 },
    { cardId: 'c3', cardText: 'U · Thợ may', letter: 'U', subtext: 'Thợ may', targetZone: c3Placed ? 'Ô CHỮ U' : 'Chưa kéo', expectedZone: 'Ô CHỮ U', isCorrect: c3Placed, status: c3Placed ? 'correct' : 'unplaced', points: c3Placed ? 7 : 0 },
    { cardId: 'c4', cardText: 'Ư · Kỹ sư công trình', letter: 'Ư', subtext: 'Kỹ sư công trình', targetZone: c4Placed ? 'Ô CHỮ Ư' : 'Chưa kéo', expectedZone: 'Ô CHỮ Ư', isCorrect: c4Placed, status: c4Placed ? 'correct' : 'unplaced', points: c4Placed ? 7 : 0 }
  ];

  const answersList = dragDetails.map(d => ({
    question: 'Thẻ [' + d.letter + '] ' + d.cardText,
    chosenAnswer: d.isCorrect ? ('Kéo vào: ' + d.targetZone) : 'Chưa kéo đúng ô',
    correctAnswer: d.expectedZone,
    isCorrect: d.isCorrect,
    points: d.points
  }));

  // Gửi thông điệp hoàn thành tới ứng dụng Vui Học Cùng Cô
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'GAME_COMPLETE',
      isCorrect: isAllDone,
      score: score,
      totalCorrect: correctCount,
      totalQuestions: totalCards,
      dragDetails: dragDetails,
      answersList: answersList,
      history: answersList.map(a => ({ question: a.question, choiceText: a.chosenAnswer, correctText: a.correctAnswer, isCorrect: a.isCorrect })),
      summary: 'Bé đã ghép đúng ' + correctCount + '/' + totalCards + ' chữ cái U - Ư!'
    }, '*');
  } else {
    alert('Chúc mừng bé đã hoàn thành trò chơi! Điểm số: ' + score + '/30');
  }
}`;

    const readme = `HƯỚNG DẪN ĐÓNG GÓI TRÒ CHƠI CHO ỨNG DỤNG "VUI HỌC CÙNG CÔ"
============================================================
1. Tệp tin chính của trò chơi: index.html
2. Tệp tin CSS giao diện: style.css (hoặc thư mục css/)
3. Tệp tin JavaScript tương tác: game.js (hoặc thư mục js/)
4. Có thể đặt thêm các thư mục hình ảnh (images/) và âm thanh (sounds/)
5. Cơ chế tính điểm và đồng bộ với màn hình máy cô:
   Trong file JavaScript, khi bé hoàn thành chỉ cần gọi:
   window.parent.postMessage({
     type: 'GAME_COMPLETE',
     isCorrect: true,
     score: 30,
     summary: 'Bé đã hoàn thành xuất sắc!'
   }, '*');

6. Nén tất cả các file này thành 1 file .ZIP và tải lên hệ thống là xong!`;

    zip.file('index.html', html);
    zip.file('style.css', css);
    zip.file('game.js', js);
    zip.file('huong-dan.txt', readme);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tro-choi-mau-keo-chu-u-uw-kem-css-js.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingleHtmlSample = () => {
    sounds.playClick();
    const sample = generateStarterHtmlTemplate('Trò Chơi Kéo Thả Mẫu Của Cô');
    const blob = new Blob([sample], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tro-choi-mau-vui-hoc.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs select-none animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/30">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-100 flex items-center gap-2">
                <span>TẢI LÊN FILE ZIP TRÒ CHƠI (HTML + CSS + JS)</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  GÓI ZIP / HTML5
                </span>
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Hỗ trợ trọn gói file .zip (bao gồm index.html, style.css, script.js, thư mục ảnh & âm thanh) hoặc file .html
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 text-xs font-black">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === 'info'
                ? 'border-cyan-600 text-cyan-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Chọn file ZIP / HTML & Cấu hình
          </button>
          <button
            onClick={() => {
              if (htmlContent) setActiveTab('preview');
              else setErrorMsg('Vui lòng chọn file trò chơi trước để xem thử.');
            }}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'preview'
                ? 'border-cyan-600 text-cyan-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>2. Xem thử trước (Preview)</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'guide'
                ? 'border-cyan-600 text-cyan-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>3. Hướng dẫn & Tải gói ZIP mẫu</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Explicit Error Alert */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-black text-rose-900 text-sm">THÔNG BÁO LỖI TRÒ CHƠI</h5>
                <p className="mt-0.5 text-slate-700">{errorMsg}</p>
                {zipResult && zipResult.htmlFiles.length > 1 && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-rose-900 font-extrabold">Thử chạy tệp HTML khác:</span>
                    {zipResult.htmlFiles
                      .filter(f => f !== zipResult.mainHtmlPath)
                      .map(path => (
                        <button
                          key={path}
                          onClick={() => handleSwitchHtmlFile(path)}
                          className="px-2.5 py-1 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg text-rose-800 text-xs font-bold transition shadow-2xs cursor-pointer"
                        >
                          👉 {path}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fallback Notification */}
          {fallbackNotice && !errorMsg && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <span className="font-black text-amber-950">Thông báo truy xuất tự động: </span>
                <span className="text-amber-800">{fallbackNotice}</span>
              </div>
            </div>
          )}

          {/* TAB 1: File selection & Game info */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* File Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-3 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                  isDraggingOver
                    ? 'border-cyan-500 bg-cyan-50/80 scale-[1.01]'
                    : file
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-cyan-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.html,.htm"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {isProcessing ? (
                  <div className="flex flex-col items-center py-4">
                    <Loader2 className="w-10 h-10 text-cyan-600 animate-spin mb-3" />
                    <h4 className="font-black text-slate-800 text-sm">
                      Đang phân tích & giải nén gói trò chơi...
                    </h4>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Hệ thống đang tích hợp HTML, CSS, JavaScript và toàn bộ tài nguyên đi kèm
                    </p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 shadow-sm">
                      {isZipArchive ? <Archive className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-800 text-sm">{file.name}</h4>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {isZipArchive ? 'GÓI ZIP' : 'FILE HTML'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      Kích thước: {(file.size / 1024).toFixed(1)} KB
                      {zipResult && ` · ${zipResult.fileCount} tệp tin đã giải nén (File chạy: ${zipResult.mainHtmlPath})`}
                    </p>
                    <span className="mt-3 px-3.5 py-1 rounded-xl bg-white border border-emerald-300 text-emerald-700 text-xs font-extrabold hover:bg-emerald-50 transition shadow-2xs">
                      Bấm để chọn file khác
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-2">
                    <div className="w-16 h-16 rounded-3xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-3 shadow-inner">
                      <Archive className="w-8 h-8" />
                    </div>
                    <h4 className="font-black text-slate-800 text-base">
                      Kéo thả file .ZIP trò chơi vào đây (hoặc file .html)
                    </h4>
                    <p className="text-xs text-slate-500 font-bold mt-1 max-w-lg">
                      Hỗ trợ trọn gói file .zip chứa <span className="text-indigo-600 font-black">index.html</span>, file <span className="text-purple-600 font-black">.CSS</span>, file <span className="text-amber-600 font-black">JavaScript (.js)</span>, cùng thư mục âm thanh & hình ảnh!
                    </p>
                    <span className="mt-4 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-xs font-black shadow-md shadow-cyan-200 transition cursor-pointer">
                      BẤM ĐỂ CHỌN FILE ZIP / HTML TỪ MÁY
                    </span>
                  </div>
                )}
              </div>

              {/* Show ZIP unpacked files summary & categorization */}
              {isZipArchive && zipResult && zipStats && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-cyan-600" />
                      <span>Đã giải nén thành công gói ZIP ({zipResult.fileCount} tệp tin):</span>
                    </span>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1 w-fit">
                      <Check className="w-3.5 h-3.5" />
                      <span>Trang chính: {zipResult.mainHtmlPath}</span>
                    </span>
                  </div>

                  {/* Category counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Trang HTML</div>
                        <div className="font-black text-slate-800">{zipStats.htmlCount} file</div>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Palette className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Định dạng CSS</div>
                        <div className="font-black text-slate-800">{zipStats.cssCount} file</div>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Code className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">JavaScript</div>
                        <div className="font-black text-slate-800">{zipStats.jsCount} file</div>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Ảnh / Âm thanh</div>
                        <div className="font-black text-slate-800">{zipStats.imageCount + zipStats.audioCount} file</div>
                      </div>
                    </div>
                  </div>

                  {/* File tags */}
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {zipResult.fileList.map((fName, i) => (
                      <span
                        key={i}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 ${
                          fName === zipResult.mainHtmlPath
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : fName.toLowerCase().endsWith('.css')
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : fName.toLowerCase().endsWith('.js')
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : /\.(png|jpe?g|gif|webp|svg)$/i.test(fName)
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : /\.(mp3|wav|ogg)$/i.test(fName)
                            ? 'bg-pink-50 text-pink-700 border border-pink-200'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        <span>{fName}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* HTML Entry Selector if Multiple HTML Files exist */}
              {isZipArchive && zipResult && zipResult.htmlFiles.length > 1 && (
                <div className="p-4 bg-cyan-50/70 border-2 border-cyan-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <h5 className="font-black text-cyan-900 flex items-center gap-1.5 text-sm">
                      <FileCode className="w-4 h-4 text-cyan-600" />
                      <span>Chọn file HTML khởi chạy ({zipResult.htmlFiles.length} file HTML trong gói ZIP):</span>
                    </h5>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      Nếu file index.html bị lỗi, cô có thể đổi sang file HTML khác trong danh sách này để chạy game.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={zipResult.mainHtmlPath}
                      onChange={(e) => handleSwitchHtmlFile(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-cyan-300 bg-white font-mono font-bold text-xs text-slate-800 focus:outline-none focus:border-cyan-500 shadow-2xs cursor-pointer"
                    >
                      {zipResult.htmlFiles.map(path => (
                        <option key={path} value={path}>
                          {path} {path.toLowerCase().endsWith('index.html') ? '(Mặc định)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Game Metadata Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    Tên trò chơi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={gameTitle}
                    onChange={(e) => setGameTitle(e.target.value)}
                    placeholder="Ví dụ: Kéo Chữ U - Ư Nghề Nghiệp"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    Mô tả trò chơi
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Bé kéo các thẻ nghề nghiệp vào đúng chữ cái"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    Chủ đề
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    Thời gian chơi
                  </label>
                  <div className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-100 flex items-center gap-2">
                    <span className="text-emerald-600 font-black">✓</span>
                    <span>Không tính thời gian (Cô bấm kết thúc câu)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Live Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              {/* Top toolbar for preview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-cyan-700 font-black">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Đang xem trước:</span>
                  </span>
                  <span className="font-extrabold text-slate-900">{gameTitle}</span>
                  {zipResult && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono font-bold text-[11px] border border-emerald-300 flex items-center gap-1">
                      <FileCode className="w-3 h-3 text-emerald-600" />
                      <span>{zipResult.mainHtmlPath}</span>
                    </span>
                  )}
                </div>

                {/* If ZIP has multiple HTML files, let user switch directly in preview */}
                {zipResult && zipResult.htmlFiles.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">Đổi file chạy:</span>
                    <select
                      value={zipResult.mainHtmlPath}
                      onChange={(e) => handleSwitchHtmlFile(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-xs text-slate-800 focus:outline-none focus:border-cyan-500 shadow-2xs cursor-pointer"
                    >
                      {zipResult.htmlFiles.map(path => (
                        <option key={path} value={path}>
                          {path} {path.toLowerCase().endsWith('index.html') ? '(index)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Warning or Runtime Error alert in Preview */}
              {runtimeError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <span className="font-black text-rose-900">Phát hiện lỗi hiển thị ({zipResult?.mainHtmlPath || 'HTML'}): </span>
                      <span>{runtimeError}</span>
                      {zipResult && zipResult.htmlFiles.length > 1 && (
                        <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                          Tệp hiện tại có thể bị lỗi cú pháp hoặc thiếu tài nguyên. Cô hãy bấm thử tệp HTML khác bên dưới:
                        </p>
                      )}
                    </div>
                  </div>

                  {zipResult && zipResult.htmlFiles.length > 1 && (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {zipResult.htmlFiles
                        .filter(f => f !== zipResult.mainHtmlPath)
                        .map(path => (
                          <button
                            key={path}
                            onClick={() => handleSwitchHtmlFile(path)}
                            className="px-2.5 py-1 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg text-rose-800 text-xs font-black shadow-2xs transition cursor-pointer"
                          >
                            👉 Thử {path}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Empty or Broken HTML Alert when only 1 HTML exists */}
              {zipResult && zipResult.htmlFiles.length <= 1 && (!zipResult.hasSubstantialContent || isTrivialHtml(htmlContent) || runtimeError) && (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <h5 className="font-black text-rose-900 text-sm">THÔNG BÁO LỖI TRÒ CHƠI</h5>
                    <p className="mt-1 text-slate-700">
                      File <code>{zipResult.mainHtmlPath}</code> trong gói ZIP bị lỗi hoặc không có nội dung hiển thị, và <b>không tìm thấy file HTML nào khác trong gói ZIP để chạy thay thế</b>.
                    </p>
                    <p className="mt-1 text-slate-500 text-[11px]">
                      Cô vui lòng kiểm tra lại file nén hoặc tải gói ZIP mẫu chuẩn tại tab "3. Hướng dẫn & Tải gói ZIP mẫu".
                    </p>
                  </div>
                </div>
              )}

              {/* If preview shows blank box and other files exist, offer button */}
              {zipResult && zipResult.htmlFiles.length > 1 && !runtimeError && (
                <div className="flex items-center justify-between bg-cyan-50/60 border border-cyan-200 p-2.5 rounded-xl text-xs">
                  <span className="text-[11px] text-cyan-900 font-bold flex items-center gap-1.5">
                    <span>💡 Nếu màn hình dưới bị trắng hoặc lỗi, bấm để đổi tệp chạy:</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {zipResult.htmlFiles
                      .filter(f => f !== zipResult.mainHtmlPath)
                      .map(path => (
                        <button
                          key={path}
                          onClick={() => handleSwitchHtmlFile(path)}
                          className="px-2 py-0.5 bg-white hover:bg-cyan-100 border border-cyan-300 rounded-md text-cyan-800 text-[11px] font-black transition cursor-pointer"
                        >
                          Chạy {path}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Iframe Viewport */}
              <div className="w-full h-[480px] rounded-2xl border-2 border-slate-300 overflow-hidden shadow-inner bg-slate-50 relative">
                <iframe
                  key={zipResult?.gameUrl || zipResult?.mainHtmlPath || 'default_preview'}
                  src={zipResult?.gameUrl || undefined}
                  srcDoc={!zipResult?.gameUrl ? htmlContent : undefined}
                  title="HTML/ZIP Game Preview"
                  sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
                  allow="autoplay; fullscreen"
                  className="w-full h-full border-0 bg-white"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Guide & Sample Templates */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs font-semibold text-slate-600 leading-relaxed">
              <div className="bg-cyan-50 rounded-2xl p-4 border border-cyan-200 space-y-2">
                <h4 className="font-black text-sm text-cyan-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-cyan-600" />
                  <span>Cấu trúc gói trò chơi ZIP chuẩn (.zip)</span>
                </h4>
                <p>
                  Cô có thể nén toàn bộ thư mục trò chơi thành 1 file <b className="text-cyan-900">.zip</b>. File nén cần có:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li><b>index.html</b>: File HTML trang chủ chính của trò chơi.</li>
                  <li><b>Các file .css</b>: Định dạng giao diện (ví dụ <code>style.css</code>).</li>
                  <li><b>Các file .js</b>: Mã xử lý tương tác kéo thả (ví dụ <code>game.js</code>).</li>
                  <li><b>Thư mục ảnh và âm thanh</b>: (ví dụ <code>images/</code>, <code>audio/</code>) được nạp tự động.</li>
                </ul>
                <p className="mt-2 text-slate-500 text-[11px]">
                  💡 <i>Lưu ý: Ứng dụng tự động nhúng toàn bộ CSS, JavaScript và hình ảnh để đảm bảo trò chơi chạy mượt mà ngay cả khi không có mạng Internet.</i>
                </p>
              </div>

              {/* Sample Download Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Download Full ZIP Package */}
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-cyan-50 rounded-2xl border border-indigo-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">Khuyên dùng</span>
                    <h5 className="font-black text-slate-900 text-xs mt-1">Gói ZIP hoàn chỉnh (HTML + CSS + JS)</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Bao gồm 3 file riêng biệt index.html, style.css, game.js để cô dễ phát triển.</p>
                  </div>
                  <button
                    onClick={handleDownloadZipSample}
                    className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Tải file mẫu .ZIP</span>
                  </button>
                </div>

                {/* Download Single HTML File */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md">File đơn</span>
                    <h5 className="font-black text-slate-900 text-xs mt-1">File đơn HTML (.html)</h5>
                    <p className="text-[11px] text-slate-500 mt-1">Toàn bộ mã HTML, CSS và Script được viết gộp trong 1 file duy nhất.</p>
                  </div>
                  <button
                    onClick={handleDownloadSingleHtmlSample}
                    className="mt-3 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file mẫu .HTML</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-black transition"
          >
            Hủy bỏ
          </button>

          <div className="flex items-center gap-2">
            {activeTab !== 'preview' && htmlContent && (
              <button
                onClick={() => setActiveTab('preview')}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs flex items-center gap-1.5 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Xem thử</span>
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={!htmlContent || isProcessing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-cyan-200 transition active:scale-95 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
                  <span>ĐANG LƯU...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>LƯU VÀO NGÂN HÀNG TRÒ CHƠI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
