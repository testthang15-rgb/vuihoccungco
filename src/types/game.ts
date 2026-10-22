export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'image_choice'
  | 'letter_recognition'
  | 'word_choice'
  | 'counting'
  | 'drag_drop'
  | 'word_drag_drop'
  | 'matching'
  | 'sorting'
  | 'html_game'
  | 'open_ended';

export type OptionImageFit = 'small' | 'medium' | 'large' | 'full' | 'custom';

export interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
  imageFit?: OptionImageFit; // 'small' | 'medium' | 'large' | 'full' | 'custom'
  imageHeight?: number; // Custom height in px (50 - 320px)
  isCorrect: boolean;
}

export type ElementType =
  | 'text'
  | 'letter'
  | 'word_card'
  | 'image'
  | 'drag_item'
  | 'drop_zone'
  | 'button'
  | 'shape'
  | 'illustration_card';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // 0 - 360 degrees
  zIndex?: number;

  // Content
  text?: string;
  subText?: string;
  imageUrl?: string;
  icon?: string;

  // Visual styling
  bgColor?: string;
  textColor?: string;
  fontFamily?: string;
  isHandwriting?: boolean;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  fontSize?: number;
  fontWeight?: string;
  shadow?: boolean;
  opacity?: number;
  animation?: 'none' | 'bounce' | 'pulse' | 'float' | 'shake' | 'pop';

  // Interaction properties
  isDraggable?: boolean;
  isDropZone?: boolean;
  isLocked?: boolean; // Khóa kéo (thẻ chỉ hiển thị không kéo)
  cardRole?: 'correct' | 'wrong' | 'static' | 'illustration'; // 'correct' = kéo đúng, 'wrong' = kéo vào vùng kéo thì tính sai, 'static' = chỉ hiển thị không kéo, 'illustration' = thẻ tranh minh họa
  isIllustration?: boolean;
  targetZoneId?: string;
  maxItems?: number; // Số lượng thẻ tối đa được kéo vào vùng chứa (mặc định undefined = vô hạn)
  itemCategory?: string; // e.g. "U", "Ư", "A", "Ă", "Â", "fruit", "animal"
  acceptsCategory?: string;
}

export interface InteractionRule {
  id: string;
  sourceId: string; // The draggable element ID
  targetId: string; // The drop-zone element ID, or '*' for any drop zone
  isCorrect: boolean;
  points?: number;
}

export interface InteractiveCanvasConfig {
  width: number; // 1280 standard 16:9
  height: number; // 720 standard 16:9
  bgTheme?: string;
  elements: CanvasElement[];
  rules: InteractionRule[];
}

export interface Question {
  id: string;
  title: string;
  type: QuestionType;
  imageUrl?: string;
  bgImageUrl?: string;
  bgColor?: string;
  audioUrl?: string;
  options: QuestionOption[];
  timeLimit: number; // in seconds, default 20 or 25 (0 = không tính thời gian)
  noTimeLimit?: boolean; // Lựa chọn không tính thời gian trả lời câu hỏi (cô bấm kết thúc)
  points: number; // default 10
  explanation?: string;
  // Multiple correct answers vs single correct answer
  allowMultipleCorrect?: boolean;
  // Whether question supports preschool audio reader
  readQuestionAudio?: boolean;
  // Box and frame size customization (sm, md, lg, xl)
  boxSize?: 'sm' | 'md' | 'lg' | 'xl';
  layoutColumns?: 1 | 2 | 3 | 4;
  // Illustration image size customization (presets sm, md, lg, xl or custom height in px)
  imageSize?: 'sm' | 'md' | 'lg' | 'xl';
  imageHeight?: number;
  // Interactive Canvas configuration for drag-and-drop / matching games
  canvasConfig?: InteractiveCanvasConfig;
  // Raw HTML content for standalone / uploaded HTML5 games
  htmlContent?: string;
  // Hosted URL (for games extracted from ZIP archives with separate assets)
  gameUrl?: string;
  // Open-ended / Essay question properties
  modelAnswer?: string;
  modelAnswerImage?: string;
  openEndedPrompt?: string;
  openEndedBgImage?: string; // Hình ảnh đáp án / bức tranh nền để bé vẽ & ghi chữ đè trực tiếp lên
  // Word Slot Drag-and-Drop properties
  targetWord?: string; // e.g. "miệng"
  wordTemplate?: string; // e.g. "...iệng" or "_iệng"
  missingLetters?: string[]; // e.g. ["m"]
  distractorLetters?: string[]; // e.g. ["n", "b", "l"]
  letterPool?: string[]; // Tất cả các chữ cái để bé kéo
  answerImageUrl?: string; // Hình ảnh đáp án upload lên (hiển thị khi hoàn thành đúng hoặc thẻ đáp án)
  answerTitle?: string; // Tiêu đề/chú thích đáp án (VD: "Cái miệng")
}

export interface OpenEndedSubmission {
  textAnswer?: string;
  drawingDataUrl?: string;
  hasDrawn?: boolean;
  annotatedDrawingDataUrl?: string; // Hình ảnh có nét cô chấm, sửa bài hoặc ghi chú trực tiếp
  teacherAnnotatedDrawingDataUrl?: string; // Tương thích ngược với tên thuộc tính cũ
  teacherGrade?: 'correct' | 'partial' | 'wrong' | 'pending';
  teacherPoints?: number;
  teacherFeedback?: string;
  gradedAt?: number;
}

export interface GameSettings {
  timePerQuestion: number; // in seconds
  speedBonus: boolean;
  maxTeams: number; // 2, 3, 4, 5, 6, 8, 10, 12
  soundEffects: boolean;
  pointsPerCorrectItem?: number; // default 5 or 10 in drag-drop
}

export interface Game {
  id: string;
  title: string;
  description: string;
  theme: string;
  category: string;
  targetAge?: string; // "5-6 tuổi"
  coverImage?: string;
  thumbnailUrl?: string;
  gameType?: 'drag_drop' | 'word_drag_drop' | 'multiple_choice' | 'matching' | 'sorting' | 'hybrid' | 'html_game' | 'custom';
  status?: 'draft' | 'published';
  createdAt: number;
  updatedAt?: number;
  playCount: number;
  questions: Question[];
  settings: GameSettings;
  isCustomHtml?: boolean;
  isZipArchive?: boolean;
  zipFileName?: string;
  gameUrl?: string;
  deletedAt?: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  isPublic?: boolean;
  shareCode?: string;
}

export interface TeamPreset {
  id: string;
  name: string;
  icon: string; // Emoji
  colorName: string; // e.g. "Đỏ", "Xanh dương"
  bgColor: string;
  textColor: string;
  borderColor: string;
  ringColor: string;
}

export interface ConnectedTeam {
  teamId: string;
  teamNumber: number;
  teamName: string;
  icon: string;
  color: string;
  deviceId: string;
  joinedAt: number;
  online: boolean;
  score: number;
  lastSeen?: number;
  assignedSet?: 'A' | 'B'; // Which question set this team is assigned to in dual room mode
}

export interface DragActionRecord {
  itemId: string;
  targetId: string;
  isCorrect: boolean;
  timestamp: number;
}

export interface TeamAnswer {
  sessionId: string;
  questionIndex: number;
  questionId: string;
  teamId: string;
  teamName: string;
  answerId: string;
  answerIds?: string[];
  answerText: string;
  submittedAt: number;
  responseTimeMs: number;
  isCorrect: boolean;
  pointsAwarded: number;
  assignedSet?: 'A' | 'B';
  // Detailed tracking for drag & drop games
  actions?: DragActionRecord[];
  totalCorrect?: number;
  totalWrong?: number;
  placedCount?: number;
  totalItems?: number;
  // Detailed tracking for HTML5/ZIP games
  htmlDetails?: {
    summary?: string;
    score?: number;
    totalCorrect?: number;
    totalQuestions?: number;
    isCorrect?: boolean;
    rawResult?: any;
    history?: any[];
    dragDetails?: Array<{
      cardId?: string;
      cardText: string;
      letter?: string;
      subtext?: string;
      imageUrl?: string;
      targetZone: string;
      expectedZone?: string;
      isCorrect: boolean;
      status?: string;
      points?: number;
    }>;
    answersList?: Array<{
      question: string;
      chosenAnswer: string;
      chosenImage?: string;
      correctAnswer: string;
      correctImage?: string;
      isCorrect: boolean;
      teamName?: string;
    }>;
  };
  // Detailed tracking for Open-ended / Essay questions
  openEnded?: OpenEndedSubmission;
}

export type SessionStatus = 'lobby' | 'playing' | 'ended';
export type QuestionStatus = 'waiting' | 'active' | 'results' | 'leaderboard';

export interface SessionState {
  sessionId: string;
  roomCode: string;
  gameId: string;
  game: Game;
  // Dual game room properties (Combining 2 question sets)
  isDualMode?: boolean;
  gameBId?: string;
  gameB?: Game;
  teamAssignments?: Record<string, 'A' | 'B'>; // teamId => 'A' (Set 1) | 'B' (Set 2)
  myAssignedSet?: 'A' | 'B'; // For player view
  assignedSetTitle?: string; // Title of assigned question set
  status: SessionStatus;
  currentQuestionIndex: number;
  questionStatus: QuestionStatus;
  questionStartTime: number | null;
  questionTimeLimit: number;
  teams: Record<string, ConnectedTeam>;
  answers: Record<string, Record<string, TeamAnswer>>; // [questionIndex][teamId] => TeamAnswer
  drafts?: Record<string, Record<string, { textAnswer?: string; drawingDataUrl?: string; hasDrawn?: boolean; updatedAt?: number }>>; // [questionIndex][teamId] => Draft
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  settings: GameSettings;
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  icon: string;
  score: number;
  correctCount: number;
  totalAnswered: number;
  avgResponseTimeMs: number;
  rank: number;
  assignedSet?: 'A' | 'B';
}
