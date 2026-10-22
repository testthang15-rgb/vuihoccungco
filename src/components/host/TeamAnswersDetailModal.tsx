import React, { useState, useEffect } from 'react';
import { SessionState, ConnectedTeam, TeamAnswer } from '../../types/game';
import { TEAM_PRESETS } from '../../data/teamPresets';
import { sounds } from '../../utils/sound';
import { realtime } from '../../services/realtimeClient';
import {
  X,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  HelpCircle,
  Eye,
  Layers,
  Filter,
  Check,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  PenTool,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Type,
  Award,
} from 'lucide-react';
import { GradeOpenEndedModal } from './GradeOpenEndedModal';

interface ParsedWordSlot {
  type: 'leading_blank' | 'trailing_blank' | 'middle_blank';
  blank: string;
  prefix?: string;
  suffix?: string;
}

const parseWordSlot = (text?: string): ParsedWordSlot | null => {
  if (!text) return null;
  const clean = text.trim();
  // Check if starts with dots or blanks (e.g. ".....iệng", "...ơ", "___iệng", "…iệng")
  const leadingMatch = clean.match(/^(\.{2,}|…+|_+)\s*(.+)$/);
  if (leadingMatch) {
    return {
      type: 'leading_blank',
      blank: leadingMatch[1],
      suffix: leadingMatch[2].trim(),
    };
  }
  // Check if ends with dots or blanks (e.g. "hoa...", "mi…")
  const trailingMatch = clean.match(/^(.+?)\s*(\.{2,}|…+|_+$)$/);
  if (trailingMatch) {
    return {
      type: 'trailing_blank',
      prefix: trailingMatch[1].trim(),
      blank: trailingMatch[2],
    };
  }
  // Check if middle dots or blanks (e.g. "m...t")
  const middleMatch = clean.match(/^(.+?)\s*(\.{2,}|…+|_)\s*(.+)$/);
  if (middleMatch) {
    return {
      type: 'middle_blank',
      prefix: middleMatch[1].trim(),
      blank: middleMatch[2],
      suffix: middleMatch[3].trim(),
    };
  }
  return null;
};

interface TeamAnswersDetailModalProps {
  session: SessionState;
  initialTeamId?: string;
  initialQuestionIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const TeamAnswersDetailModal: React.FC<TeamAnswersDetailModalProps> = ({
  session,
  initialTeamId,
  initialQuestionIndex,
  isOpen,
  onClose,
}) => {
  const teamsList: ConnectedTeam[] = Object.values(session.teams || {});
  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    return initialTeamId || (teamsList[0]?.teamId || '');
  });
  const [filterMode, setFilterMode] = useState<'all' | 'correct' | 'wrong'>('all');
  const [selectedQuestionFilter, setSelectedQuestionFilter] = useState<number | 'all'>(
    initialQuestionIndex !== undefined ? initialQuestionIndex : 'all'
  );
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [gradeModalQuestionIndex, setGradeModalQuestionIndex] = useState<number>(0);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
        } else {
          onClose();
        }
      }
    };
    const handleFsChange = () => {
      setIsBrowserFullscreen(Boolean(document.fullscreenElement));
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [isOpen, onClose, previewImage]);

  const toggleFullscreen = () => {
    sounds.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleGradeWordDrag = async (
    questionIndex: number,
    teamId: string,
    points: number,
    isCorrect: boolean,
    feedback?: string
  ) => {
    sounds.playCorrect();
    // Optimistic local update
    if (session.answers[questionIndex]?.[teamId]) {
      const a = session.answers[questionIndex][teamId];
      const oldPts = a.pointsAwarded || 0;
      a.pointsAwarded = points;
      a.isCorrect = isCorrect;
      if (!a.openEnded) a.openEnded = {};
      a.openEnded.teacherPoints = points;
      a.openEnded.teacherGrade = isCorrect ? 'correct' : 'wrong';
      if (feedback !== undefined) a.openEnded.teacherFeedback = feedback;
      a.openEnded.gradedAt = Date.now();
      if (session.teams[teamId]) {
        session.teams[teamId].score = Math.max(0, (session.teams[teamId].score || 0) + (points - oldPts));
      }
    }

    try {
      realtime.gradeOpenEndedAnswer(
        session.roomCode,
        questionIndex,
        teamId,
        points,
        isCorrect,
        feedback || ''
      );
      await fetch(`/api/session/${encodeURIComponent(session.roomCode)}/grade-open-ended`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIndex,
          teamId,
          points,
          isCorrect,
          feedback: feedback || '',
        }),
      }).catch(() => {});
    } catch (e) {
      console.warn('Grade word drag error:', e);
    }
  };

  if (!isOpen) return null;

  const currentTeam = teamsList.find(t => t.teamId === selectedTeamId) || teamsList[0];
  const teamPreset = TEAM_PRESETS.find(p => p.id === currentTeam?.teamId);

  // Gather all answers for the selected team across questions
  const isTeamB = session.isDualMode && (currentTeam?.assignedSet === 'B' || session.teamAssignments?.[currentTeam?.teamId || ''] === 'B');
  const questions = (isTeamB && session.gameB?.questions) ? session.gameB.questions : (session.game?.questions || []);
  
  // Aggregate statistics for the selected team
  let totalTeamCorrectCount = 0;
  let totalTeamAttempted = 0;
  let totalTeamPoints = currentTeam?.score || 0;

  // Process answers
  interface DragCardDetail {
    id: string;
    cardText: string;
    cardSubtext?: string;
    cardImage?: string;
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
    icon?: string;
    category?: string;
    placedTargetName: string;
    placedTargetImage?: string;
    correctTargetName: string;
    correctTargetImage?: string;
    placedZoneId?: string;
    targetZoneId?: string;
    isCorrect: boolean;
    status: 'correct' | 'wrong' | 'unplaced';
    points: number;
  }

  interface DropZoneSummary {
    zoneId: string;
    zoneName: string;
    zoneText?: string;
    zoneSubText?: string;
    zoneImage?: string;
    zoneBgColor?: string;
    zoneTextColor?: string;
    zoneBorderColor?: string;
    acceptsCategory?: string;
    placedCards: DragCardDetail[];
    expectedCards: DragCardDetail[];
    illustrationCards?: DragCardDetail[];
  }

  interface DragSummary {
    totalCards: number;
    totalCorrect: number;
    totalWrong: number;
    totalUnplaced: number;
    correctCards: DragCardDetail[];
    wrongCards: DragCardDetail[];
    unplacedCards: DragCardDetail[];
    zoneSummaries: DropZoneSummary[];
    illustrationCards?: DragCardDetail[];
  }

  interface DetailedItem {
    questionIndex: number;
    questionTitle: string;
    questionType: string;
    questionPoints: number;
    turnIndex?: number;
    subQuestionText?: string;
    chosenText: string;
    chosenImage?: string;
    chosenItems?: Array<{ text: string; imageUrl?: string; letter?: string; isCorrect?: boolean }>;
    correctText: string;
    correctImage?: string;
    correctItems?: Array<{ text: string; imageUrl?: string; letter?: string }>;
    modelAnswer?: string;
    modelAnswerImage?: string;
    isCorrect: boolean;
    pointsAwarded: number;
    responseTimeMs?: number;
    summaryText?: string;
    source: 'multiple_choice' | 'drag_drop' | 'html_game' | 'open_ended' | 'word_drag_drop';
    openEnded?: any;
    dragSummary?: DragSummary;
    wordDragSummary?: {
      targetWord?: string;
      wordTemplate?: string;
      prefix: string;
      suffix: string;
      correctLetter: string;
      chosenLetter: string;
      formedWord: string;
      isMatch: boolean;
      answerImageUrl?: string;
      answerTitle?: string;
      explanation?: string;
      teacherGrade?: string;
      teacherPoints?: number;
      teacherFeedback?: string;
    };
  }

  const detailedItems: DetailedItem[] = [];

  questions.forEach((q, qIdx) => {
    if (selectedQuestionFilter !== 'all' && selectedQuestionFilter !== qIdx) return;

    const ans = session.answers?.[qIdx]?.[selectedTeamId];
    const realQ = (ans?.questionId && (session.gameB?.questions.find(item => item.id === ans.questionId) || session.game.questions.find(item => item.id === ans.questionId)))
      || q;

    const isDrag = realQ.type === 'drag_drop' || Boolean(realQ.canvasConfig) || Boolean(ans?.actions?.length);
    const isHtml = !isDrag && (realQ.type === 'html_game' || session.game.isZipArchive || Boolean(realQ.htmlContent) || Boolean(realQ.gameUrl) || Boolean(ans?.htmlDetails));
    const isWordDrag = !isDrag && !isHtml && (realQ.type === 'word_drag_drop' || Boolean(realQ.targetWord) || Boolean(realQ.wordTemplate));
    const isOpenEnded = !isDrag && !isHtml && !isWordDrag && (realQ.type === 'open_ended' || Boolean(ans?.openEnded));

    if (isWordDrag) {
      if (ans) totalTeamAttempted++;
      const correctLetter = (realQ.missingLetters?.[0] || realQ.options?.find(o => o.isCorrect)?.text || 'm').trim();
      const rawTargetWord = (realQ.targetWord || realQ.title || '').trim();
      let prefix = '';
      let suffix = '';
      if (realQ.wordTemplate) {
        const parts = realQ.wordTemplate.split(/\.{2,}|_{1,}/);
        prefix = parts[0] || '';
        suffix = parts[1] || '';
      } else if (rawTargetWord) {
        const lowerTarget = rawTargetWord.toLowerCase();
        const lowerMissing = correctLetter.toLowerCase();
        const idx = lowerTarget.indexOf(lowerMissing);
        if (idx >= 0) {
          prefix = rawTargetWord.substring(0, idx);
          suffix = rawTargetWord.substring(idx + correctLetter.length);
        } else {
          suffix = rawTargetWord;
        }
      }

      let chosenLetter = (ans?.openEnded?.textAnswer || '').trim();
      if (!chosenLetter && ans?.answerText) {
        const m = ans.answerText.match(/Bé ghép chữ "([^"]+)"/);
        if (m && m[1]) chosenLetter = m[1].trim();
      }
      if (!chosenLetter && ans?.answerId && ans.answerId.length <= 4 && ans.answerId !== 'submission') {
        chosenLetter = ans.answerId.trim();
      }

      const formedWord = chosenLetter ? `${prefix}${chosenLetter}${suffix}` : (prefix || suffix ? `${prefix}?${suffix}` : 'Chưa kéo chữ');
      const isMatch = Boolean(chosenLetter && correctLetter && chosenLetter.toLowerCase() === correctLetter.toLowerCase());
      // Tự chấm điểm tự động cho câu kéo thả ô chữ (không cần cô chấm thủ công)
      const isItemCorrect = Boolean(isMatch || ans?.isCorrect || ans?.openEnded?.teacherGrade === 'correct');
      const pointsAwarded = isItemCorrect ? (realQ.points || 10) : 0;
      if (isItemCorrect) totalTeamCorrectCount++;

      detailedItems.push({
        questionIndex: qIdx,
        questionTitle: realQ.title,
        questionType: 'Trò chơi kéo thả ô chữ',
        questionPoints: realQ.points || 10,
        subQuestionText: realQ.explanation || 'Bé kéo chữ cái còn thiếu vào chỗ trống',
        chosenText: chosenLetter ? `Bé ghép chữ: "${chosenLetter}" (${formedWord})` : 'Chưa kéo chữ vào ô',
        correctText: `Chữ đúng: "${correctLetter}" (${realQ.targetWord || `${prefix}${correctLetter}${suffix}`})`,
        isCorrect: isItemCorrect,
        pointsAwarded,
        responseTimeMs: ans?.responseTimeMs,
        summaryText: isItemCorrect ? 'Tự chấm: Đúng (+10đ)' : (chosenLetter ? 'Tự chấm: Chưa đúng' : 'Chưa ghép chữ'),
        source: 'word_drag_drop',
        openEnded: ans?.openEnded,
        wordDragSummary: {
          targetWord: realQ.targetWord,
          wordTemplate: realQ.wordTemplate,
          prefix,
          suffix,
          correctLetter,
          chosenLetter,
          formedWord,
          isMatch,
          answerImageUrl: realQ.answerImageUrl,
          answerTitle: realQ.answerTitle,
          explanation: realQ.explanation,
          teacherGrade: isItemCorrect ? 'correct' : 'wrong',
          teacherPoints: pointsAwarded,
          teacherFeedback: ans?.openEnded?.teacherFeedback,
        },
      });
    } else if (isOpenEnded) {
      if (ans) totalTeamAttempted++;
      if (ans?.isCorrect) totalTeamCorrectCount++;
      const oe = ans?.openEnded;

      detailedItems.push({
        questionIndex: qIdx,
        questionTitle: realQ.title,
        questionType: 'Câu hỏi tự luận (Vẽ & Viết)',
        questionPoints: realQ.points || 10,
        subQuestionText: 'Bé dùng bảng vẽ màu hoặc gõ chữ vào ô đáp án',
        chosenText: oe?.textAnswer ? `Đã gõ chữ: "${oe.textAnswer}"` : (oe?.drawingDataUrl ? 'Đã vẽ hình tự luận' : 'Chưa nộp bài'),
        chosenImage: oe?.annotatedDrawingDataUrl || oe?.drawingDataUrl,
        correctText: 'Bé vẽ hình hoặc viết chữ theo yêu cầu của cô',
        modelAnswer: realQ.modelAnswer,
        modelAnswerImage: realQ.modelAnswerImage,
        isCorrect: Boolean(oe?.teacherGrade === 'correct'),
        pointsAwarded: ans?.pointsAwarded ?? 0,
        responseTimeMs: ans?.responseTimeMs,
        summaryText: oe?.teacherFeedback?.trim() && oe?.teacherGrade && oe.teacherGrade !== 'pending'
          ? `Lời cô sửa bài: "${oe.teacherFeedback}"`
          : (oe?.teacherGrade === 'correct' ? 'Đánh giá: Đúng' : oe?.teacherGrade === 'wrong' ? 'Đánh giá: Chưa đúng' : 'Đánh giá: Chờ cô chấm'),
        source: 'open_ended',
        openEnded: oe,
      });
    } else if (isHtml) {
      const htmlDet = ans?.htmlDetails;
      const dragCards: any[] = Array.isArray(htmlDet?.dragDetails)
        ? htmlDet.dragDetails
        : (Array.isArray(htmlDet?.rawResult?.dragDetails) ? htmlDet.rawResult.dragDetails : []);
      const history: any[] = Array.isArray(htmlDet?.history)
        ? htmlDet.history
        : (Array.isArray(htmlDet?.rawResult?.history) ? htmlDet.rawResult.history : []);
      const answersList: any[] = Array.isArray(htmlDet?.answersList)
        ? htmlDet.answersList
        : (Array.isArray(htmlDet?.rawResult?.answersList) ? htmlDet.rawResult.answersList : []);

      if (dragCards.length > 0) {
        if (ans) totalTeamAttempted++;
        const totalCards = dragCards.length;
        const correctCards: DragCardDetail[] = [];
        const wrongCards: DragCardDetail[] = [];
        const unplacedCards: DragCardDetail[] = [];

        const zoneNamesSet = new Set<string>();
        dragCards.forEach(c => {
          if (c.targetZone && c.targetZone !== 'Chưa kéo' && c.targetZone !== 'Chưa kéo vào ô') {
            zoneNamesSet.add(c.targetZone);
          }
          if (c.expectedZone) {
            zoneNamesSet.add(c.expectedZone);
          }
        });
        if (zoneNamesSet.size === 0) {
          zoneNamesSet.add('Ô đích');
        }

        dragCards.forEach((c, idx) => {
          const isItemCorrect = Boolean(c.isCorrect);
          const isUnplaced = c.status === 'unplaced' || !c.targetZone || c.targetZone === 'Chưa kéo' || c.targetZone === 'Chưa kéo vào ô';
          const status: 'correct' | 'wrong' | 'unplaced' = isUnplaced ? 'unplaced' : isItemCorrect ? 'correct' : 'wrong';

          const cardText = c.letter ? `${c.letter}${c.subtext ? ` · ${c.subtext}` : ''}` : (c.cardText || `Thẻ ${idx + 1}`);
          const cardItem: DragCardDetail = {
            id: c.cardId || `drag_card_${idx}`,
            cardText,
            cardSubtext: c.subtext,
            cardImage: c.imageUrl,
            category: c.letter,
            placedTargetName: isUnplaced ? 'Chưa kéo vào ô' : (c.targetZone || 'Chưa kéo'),
            correctTargetName: c.expectedZone || c.targetZone || 'Ô chính xác',
            placedZoneId: isUnplaced ? undefined : (c.targetZone || 'Ô đích'),
            targetZoneId: c.expectedZone || c.targetZone || 'Ô đích',
            isCorrect: isItemCorrect,
            status,
            points: c.points !== undefined ? c.points : (isItemCorrect ? Math.round((q.points || 30) / Math.max(totalCards, 1)) : 0),
          };

          if (isUnplaced) {
            unplacedCards.push(cardItem);
          } else if (isItemCorrect) {
            correctCards.push(cardItem);
          } else {
            wrongCards.push(cardItem);
          }
        });

        if (correctCards.length > 0 && correctCards.length === totalCards) {
          totalTeamCorrectCount++;
        }

        const allCards = [...correctCards, ...wrongCards, ...unplacedCards];
        const zoneSummaries: DropZoneSummary[] = Array.from(zoneNamesSet).map((zName, zIdx) => {
          const placedCards = allCards.filter(c => c.placedZoneId === zName);
          const expectedCards = allCards.filter(c => c.targetZoneId === zName);
          return {
            zoneId: `zone_html_${zIdx}`,
            zoneName: zName,
            zoneText: zName.replace(/^Ô\s*(CHỮ\s*)?/i, ''),
            placedCards,
            expectedCards,
          };
        });

        detailedItems.push({
          questionIndex: qIdx,
          questionTitle: q.title,
          questionType: 'Trò chơi kéo thẻ phân loại (Gói ZIP)',
          questionPoints: q.points || 30,
          subQuestionText: htmlDet?.summary || 'Bé kéo các thẻ vào đúng vùng quy định',
          chosenText: `Đúng ${correctCards.length}/${totalCards} thẻ`,
          correctText: `Kéo đúng toàn bộ ${totalCards} thẻ vào vùng đích`,
          isCorrect: correctCards.length === totalCards && totalCards > 0,
          pointsAwarded: ans?.pointsAwarded ?? (correctCards.length * Math.round((q.points || 30) / Math.max(totalCards, 1))),
          responseTimeMs: ans?.responseTimeMs,
          source: 'drag_drop',
          dragSummary: {
            totalCards,
            totalCorrect: correctCards.length,
            totalWrong: wrongCards.length,
            totalUnplaced: unplacedCards.length,
            correctCards,
            wrongCards,
            unplacedCards,
            zoneSummaries,
          },
        });
      } else if (answersList.length > 0) {
        answersList.forEach((item, itemIdx) => {
          totalTeamAttempted++;
          if (item.isCorrect) totalTeamCorrectCount++;
          detailedItems.push({
            questionIndex: qIdx,
            questionTitle: q.title,
            questionType: 'Trò chơi tương tác (Gói ZIP)',
            questionPoints: q.points || 30,
            turnIndex: itemIdx + 1,
            subQuestionText: item.question || `Lượt chơi ${itemIdx + 1}`,
            chosenText: item.chosenAnswer || 'Đã chọn hình',
            chosenImage: item.chosenImage,
            correctText: item.correctAnswer || 'Đáp án mẫu',
            correctImage: item.correctImage,
            isCorrect: Boolean(item.isCorrect),
            pointsAwarded: item.points !== undefined ? item.points : (item.isCorrect ? Math.round((q.points || 30) / Math.max(answersList.length, 1)) : 0),
            summaryText: htmlDet?.summary,
            source: 'html_game',
          });
        });
      } else if (history.length > 0) {
        history.forEach((h, hIdx) => {
          totalTeamAttempted++;
          if (h.isCorrect) totalTeamCorrectCount++;
          detailedItems.push({
            questionIndex: qIdx,
            questionTitle: q.title,
            questionType: 'Trò chơi tương tác (Gói ZIP)',
            questionPoints: q.points || 30,
            turnIndex: hIdx + 1,
            subQuestionText: h.question || `Lượt chơi ${hIdx + 1}`,
            chosenText: h.choiceText || 'Đã bấm chọn',
            chosenImage: h.choiceImg,
            correctText: h.correctText || 'Đáp án đúng',
            correctImage: h.correctChoiceImg,
            isCorrect: Boolean(h.isCorrect),
            pointsAwarded: h.isCorrect ? Math.round((q.points || 30) / Math.max(history.length, 1)) : 0,
            summaryText: htmlDet?.summary,
            source: 'html_game',
          });
        });
      } else {
        // Single game item
        if (ans) totalTeamAttempted++;
        if (ans?.isCorrect) totalTeamCorrectCount++;
        detailedItems.push({
          questionIndex: qIdx,
          questionTitle: q.title,
          questionType: 'Trò chơi gói ZIP / HTML5',
          questionPoints: q.points || 30,
          chosenText: ans?.answerText || (ans ? 'Đã hoàn thành' : 'Chưa nộp kết quả'),
          correctText: 'Hoàn thành các thử thách trong trò chơi',
          isCorrect: Boolean(ans?.isCorrect),
          pointsAwarded: ans?.pointsAwarded || 0,
          responseTimeMs: ans?.responseTimeMs,
          summaryText: htmlDet?.summary || (ans?.isCorrect ? 'Đạt kết quả tốt' : 'Chưa đạt điểm'),
          source: 'html_game',
        });
      }
    } else if (isDrag) {
      if (ans) totalTeamAttempted++;
      if (ans?.isCorrect) totalTeamCorrectCount++;

      const draggableElements = realQ.canvasConfig?.elements?.filter(e => !e.isDropZone && e.type !== 'drop_zone' && !e.isLocked && e.cardRole !== 'static' && e.isDraggable !== false && Boolean(e.isDraggable || e.type === 'drag_item')) || [];
      const dropZones = realQ.canvasConfig?.elements?.filter(e => e.isDropZone || e.type === 'drop_zone') || [];
      const rules = realQ.canvasConfig?.rules || [];
      const actions = ans?.actions || [];

      const correctCards: DragCardDetail[] = [];
      const wrongCards: DragCardDetail[] = [];
      const unplacedCards: DragCardDetail[] = [];

      draggableElements.forEach(dragEl => {
        const act = actions.find(a => a.itemId === dragEl.id);
        const placedTarget = act ? dropZones.find(dz => dz.id === act.targetId) : null;

        // Find the REAL correct target drop zone using rules first, then category matching
        const correctRule = rules.find(r => r.sourceId === dragEl.id && r.isCorrect);
        let correctTarget = correctRule ? dropZones.find(dz => dz.id === correctRule.targetId) : undefined;
        // Don't match category if card is explicitly flagged as a 'wrong' distractor
        if (!correctTarget && dragEl.cardRole !== 'wrong' && dragEl.itemCategory) {
          correctTarget = dropZones.find(dz =>
            dz.acceptsCategory &&
            dz.acceptsCategory.trim().toLowerCase() === dragEl.itemCategory!.trim().toLowerCase()
          );
        }
        // If single drop zone and card is explicitly marked 'correct', assign it
        if (!correctTarget && dragEl.cardRole === 'correct' && dropZones.length === 1) {
          correctTarget = dropZones[0];
        }

        const cardText = dragEl.text || dragEl.subText || dragEl.itemCategory || 'Thẻ';
        const cardSubtext = dragEl.subText;
        const cardImage = dragEl.imageUrl;
        const correctTargetName = correctTarget?.text || (correctTarget?.acceptsCategory ? `Ô ${correctTarget.acceptsCategory}` : 'Ô chính xác');
        const correctTargetImage = correctTarget?.imageUrl;
        const placedTargetName = placedTarget?.text || (placedTarget?.acceptsCategory ? `Ô ${placedTarget.acceptsCategory}` : 'Chưa kéo vào ô');
        const placedTargetImage = placedTarget?.imageUrl;

        const cardItem: DragCardDetail = {
          id: dragEl.id,
          cardText,
          cardSubtext,
          cardImage,
          bgColor: dragEl.bgColor,
          textColor: dragEl.textColor,
          borderColor: dragEl.borderColor,
          icon: dragEl.icon,
          category: dragEl.itemCategory,
          placedTargetName: !act ? 'Chưa kịp kéo vào ô' : placedTargetName,
          placedTargetImage,
          correctTargetName,
          correctTargetImage,
          placedZoneId: placedTarget?.id,
          targetZoneId: correctTarget?.id,
          isCorrect: Boolean(act && act.isCorrect),
          status: !act ? 'unplaced' : act.isCorrect ? 'correct' : 'wrong',
          points: act?.isCorrect ? Math.round((realQ.points || 20) / Math.max(draggableElements.length, 1)) : 0,
        };

        if (!act) {
          unplacedCards.push(cardItem);
        } else if (act.isCorrect) {
          correctCards.push(cardItem);
        } else {
          wrongCards.push(cardItem);
        }
      });

      const allCards = [...correctCards, ...wrongCards, ...unplacedCards];

      const illustrationElements = realQ.canvasConfig?.elements?.filter(e =>
        e.cardRole === 'illustration' || e.isIllustration || e.type === 'illustration_card'
      ) || [];

      const allIllustrationCards: DragCardDetail[] = illustrationElements.map(el => {
        const targetZone = dropZones.find(dz => dz.id === el.targetZoneId);
        const rawText = el.text || el.subText || '';
        const cleanText = (rawText.trim().toLowerCase() === 'thẻ minh họa' || rawText.trim().toLowerCase() === 'minh họa') ? '' : rawText;
        return {
          id: el.id,
          cardText: cleanText,
          cardSubtext: el.subText,
          cardImage: el.imageUrl,
          bgColor: el.bgColor || '#fef3c7',
          textColor: el.textColor || '#92400e',
          borderColor: el.borderColor || '#f59e0b',
          icon: el.icon,
          category: el.itemCategory,
          placedTargetName: 'Đáp án chuẩn của cô',
          correctTargetName: targetZone?.text || 'Đáp án mẫu chuẩn',
          targetZoneId: el.targetZoneId,
          isCorrect: true,
          status: 'correct',
          points: 0,
        };
      });

      const zoneSummaries: DropZoneSummary[] = dropZones.map(dz => {
        const placedCards = allCards.filter(c => c.placedZoneId === dz.id);
        let expectedCards = allCards.filter(c => c.targetZoneId === dz.id);
        if (expectedCards.length === 0 && dropZones.length === 1) {
          expectedCards = allCards.filter(c => {
            const el = draggableElements.find(e => e.id === c.id);
            return el?.cardRole === 'correct' || (!el?.cardRole && rules.some(r => r.sourceId === c.id && r.isCorrect));
          });
        }
        if (expectedCards.length === 0) {
          expectedCards = allCards.filter(c => c.isCorrect && c.placedZoneId === dz.id);
        }

        const zoneIllustrations = allIllustrationCards.filter(c =>
          c.targetZoneId === dz.id || (!c.targetZoneId && dropZones.length === 1)
        );

        return {
          zoneId: dz.id,
          zoneName: dz.text || (dz.acceptsCategory ? `Ô ${dz.acceptsCategory}` : 'Vùng đích'),
          zoneText: dz.text,
          zoneSubText: dz.subText,
          zoneImage: dz.imageUrl,
          zoneBgColor: dz.bgColor,
          zoneTextColor: dz.textColor,
          zoneBorderColor: dz.borderColor,
          acceptsCategory: dz.acceptsCategory,
          placedCards,
          expectedCards,
          illustrationCards: zoneIllustrations,
        };
      });

      const totalCards = draggableElements.length;
      const isQuestionCorrect = Boolean(ans?.isCorrect || (totalCards > 0 && correctCards.length === totalCards));

      detailedItems.push({
        questionIndex: qIdx,
        questionTitle: realQ.title,
        questionType: 'Trò chơi kéo thả phân loại',
        questionPoints: realQ.points || 20,
        subQuestionText: realQ.explanation || 'Bé kéo các thẻ vào đúng ô quy định',
        chosenText: ans ? `Đúng ${correctCards.length}/${totalCards} thẻ` : 'Chưa nộp bài',
        correctText: `Xếp đúng toàn bộ ${totalCards} thẻ vào ô quy định`,
        isCorrect: isQuestionCorrect,
        pointsAwarded: ans?.pointsAwarded ?? (correctCards.length * Math.round((realQ.points || 20) / Math.max(totalCards, 1))),
        responseTimeMs: ans?.responseTimeMs,
        source: 'drag_drop',
        dragSummary: {
          totalCards,
          totalCorrect: correctCards.length,
          totalWrong: wrongCards.length,
          totalUnplaced: unplacedCards.length,
          correctCards,
          wrongCards,
          unplacedCards,
          zoneSummaries,
          illustrationCards: allIllustrationCards,
        },
      });
    } else {
      // Classic multiple choice
      if (ans) totalTeamAttempted++;
      if (ans?.isCorrect) totalTeamCorrectCount++;
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      const allCorrectOpts = q.options?.filter(o => o.isCorrect) || [];
      
      const chosenAnswerIds = ans?.answerIds || (ans?.answerId ? ans.answerId.split(',') : []);
      const chosenOpts = q.options?.filter(o => chosenAnswerIds.includes(o.id) || (ans?.answerText && o.text === ans.answerText)) || [];

      const chosenItems = chosenOpts.map(o => {
        const idx = q.options?.findIndex(opt => opt.id === o.id) ?? -1;
        return {
          text: o.text,
          imageUrl: o.imageUrl,
          letter: idx >= 0 ? letters[idx] : undefined,
          isCorrect: Boolean(o.isCorrect),
        };
      });

      const correctItems = allCorrectOpts.map(o => {
        const idx = q.options?.findIndex(opt => opt.id === o.id) ?? -1;
        return {
          text: o.text,
          imageUrl: o.imageUrl,
          letter: idx >= 0 ? letters[idx] : undefined,
        };
      });

      const correctTextSummary = allCorrectOpts.map((o, idx) => {
        const oIdx = q.options?.findIndex(opt => opt.id === o.id) ?? -1;
        const letter = oIdx >= 0 ? `[${letters[oIdx]}] ` : '';
        return `${letter}${o.text}`;
      }).join(' & ') || 'Đáp án chuẩn';

      detailedItems.push({
        questionIndex: qIdx,
        questionTitle: q.title,
        questionType: 'Câu hỏi trắc nghiệm',
        questionPoints: q.points || 10,
        chosenText: ans ? (ans.answerText || (chosenOpts.length > 0 ? chosenOpts.map(o => o.text).join(', ') : 'Đã chọn')) : 'Chưa chọn đáp án',
        chosenImage: chosenOpts[0]?.imageUrl,
        chosenItems: chosenItems.length > 0 ? chosenItems : undefined,
        correctText: correctTextSummary,
        correctImage: allCorrectOpts.length === 1 ? allCorrectOpts[0]?.imageUrl : undefined,
        correctItems: correctItems.length > 0 ? correctItems : undefined,
        isCorrect: Boolean(ans?.isCorrect),
        pointsAwarded: ans?.pointsAwarded || 0,
        responseTimeMs: ans?.responseTimeMs,
        source: 'multiple_choice',
      });
    }
  });

  // Filter items
  const filteredItems = detailedItems.filter(item => {
    if (filterMode === 'correct') return item.isCorrect;
    if (filterMode === 'wrong') return !item.isCorrect;
    return true;
  });

  const accuracyPercent = totalTeamAttempted > 0
    ? Math.round((totalTeamCorrectCount / totalTeamAttempted) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col w-screen h-screen overflow-hidden select-none animate-in fade-in">
      <div className="bg-white w-full h-full flex flex-col overflow-hidden">
        {/* Header - Compact & Sleek */}
        <div className="bg-gradient-to-r from-indigo-800 via-indigo-700 to-purple-800 px-4 py-2 sm:px-6 sm:py-2.5 text-white flex items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg shadow-inner shrink-0">
              🔍
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/20 shrink-0">
                BẢNG CHI TIẾT BÀI LÀM
              </span>
              <span className="text-xs font-bold text-white/90 shrink-0">
                Phòng: <b className="font-mono text-amber-300 font-black">{session.roomCode}</b>
              </span>
              <span className="hidden md:inline-block text-xs font-bold text-white/70 truncate max-w-sm">
                · {session.game.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title={isBrowserFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình trình chiếu (F11)'}
            >
              {isBrowserFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isBrowserFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                window.print();
              }}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="In báo cáo chi tiết"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">In kết quả</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition cursor-pointer"
              title="Đóng bảng chi tiết (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Compact Team Selector & Inline Performance Stats Bar */}
        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200/90 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Left: Team Selection Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[11px] font-black text-slate-500 uppercase shrink-0">
              Chọn đội:
            </span>
            {teamsList.map(team => {
              const isSelected = team.teamId === currentTeam?.teamId;
              const preset = TEAM_PRESETS.find(p => p.id === team.teamId);

              return (
                <button
                  key={team.teamId}
                  onClick={() => {
                    sounds.playClick();
                    setSelectedTeamId(team.teamId);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition shrink-0 cursor-pointer ${
                    isSelected
                      ? `${preset?.bgColor || 'bg-indigo-600'} text-white shadow-md scale-102 ring-2 ring-indigo-400 ring-offset-1`
                      : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="text-base">{team.icon}</span>
                  <span className="font-bold">{team.teamName}</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600 font-bold'
                  }`}>
                    {team.score}đ
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Selected Team Live Metric Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black shadow-2xs">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>{currentTeam?.score} điểm</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-black shadow-2xs">
              <span>✅ {totalTeamCorrectCount} đúng</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-100 text-rose-950 border border-rose-300 text-xs font-black shadow-2xs">
              <span>❌ {Math.max(0, totalTeamAttempted - totalTeamCorrectCount)} chưa đúng</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-950 border border-indigo-300 text-xs font-black shadow-2xs">
              <span>🎯 {accuracyPercent}% chính xác</span>
            </div>
          </div>
        </div>

        {/* Slim Filter Toolbar */}
        <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap shrink-0 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Lọc bài làm:
            </span>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-0.5 rounded-lg font-extrabold transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Tất cả ({detailedItems.length})
            </button>
            <button
              onClick={() => setFilterMode('correct')}
              className={`px-2.5 py-0.5 rounded-lg font-extrabold transition cursor-pointer ${
                filterMode === 'correct'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              Chỉ câu đúng ✅ ({detailedItems.filter(i => i.isCorrect).length})
            </button>
            <button
              onClick={() => setFilterMode('wrong')}
              className={`px-2.5 py-0.5 rounded-lg font-extrabold transition cursor-pointer ${
                filterMode === 'wrong'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              Chỉ câu chưa đúng ❌ ({detailedItems.filter(i => !i.isCorrect).length})
            </button>
          </div>

          {questions.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500">Xem câu:</span>
              <select
                value={selectedQuestionFilter}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setSelectedQuestionFilter(val);
                }}
                className="bg-white border border-slate-200 text-slate-800 font-extrabold px-2.5 py-0.5 rounded-lg cursor-pointer shadow-2xs"
              >
                <option value="all">Tất cả câu ({questions.length})</option>
                {questions.map((q, idx) => (
                  <option key={q.id} value={idx}>
                    Câu {idx + 1}: {q.title.slice(0, 35)}...
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Scrollable Questions & Answers List - Optimized Full Screen Width & Spacing */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/70 space-y-6">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border-2 border-slate-100 shadow-sm max-w-md mx-auto my-6">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="font-black text-slate-700 text-base">
                Không tìm thấy lượt trả lời phù hợp
              </h4>
              <p className="text-xs font-bold text-slate-400 mt-1">
                Hãy thử chọn bộ lọc "Tất cả" hoặc kiểm tra xem đội đã tham gia trả lời trò chơi chưa nhé.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border-2 shadow-xs transition ${
                    item.isCorrect
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : 'border-rose-200 hover:border-rose-300'
                  }`}
                >
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-black text-xs border border-slate-200">
                        CÂU {item.questionIndex + 1}
                        {item.turnIndex !== undefined ? ` · LƯỢT ${item.turnIndex}` : ''}
                      </span>
                      <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                        {item.questionType}
                      </span>
                      {item.responseTimeMs && item.responseTimeMs > 0 && (
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {(item.responseTimeMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full font-black text-xs flex items-center gap-1.5 shadow-2xs ${
                        item.isCorrect
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : item.pointsAwarded > 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {item.isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>ĐÚNG (+{item.pointsAwarded}đ)</span>
                          </>
                        ) : item.pointsAwarded > 0 ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-amber-600" />
                            <span>{item.dragSummary ? `ĐÚNG ${item.dragSummary.totalCorrect}/${item.dragSummary.totalCards} THẺ` : 'ĐÚNG 1 PHẦN'} (+{item.pointsAwarded}đ)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>CHƯA ĐÚNG (0đ)</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Question Content */}
                  <h5 className="font-black text-slate-900 text-sm sm:text-base mb-3.5">
                    {item.subQuestionText || item.questionTitle}
                  </h5>

                  {/* Detailed Drag & Drop Statistics breakdown */}
                  {item.source === 'drag_drop' && item.dragSummary ? (
                    <div className="space-y-3.5">
                      {/* Summary score bar */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-black flex-wrap gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-slate-600">
                            Tổng số thẻ: <span className="text-slate-900 font-mono text-sm">{item.dragSummary.totalCards}</span>
                          </span>
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">
                            ✓ Đúng: {item.dragSummary.totalCorrect}
                          </span>
                          {item.dragSummary.totalWrong > 0 && (
                            <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200">
                              ✕ Sai: {item.dragSummary.totalWrong}
                            </span>
                          )}
                          {item.dragSummary.totalUnplaced > 0 && (
                            <span className="text-slate-600 bg-slate-200 px-2 py-0.5 rounded-lg border border-slate-300">
                              Chưa xếp: {item.dragSummary.totalUnplaced}
                            </span>
                          )}
                        </div>
                        <span className="text-indigo-700 font-extrabold ml-auto">
                          +{item.pointsAwarded} / {item.questionPoints} điểm
                        </span>
                      </div>

                      {/* Visual Drop Zones Breakdown (User Request: Hiển thị đáp án hình ảnh thẻ nằm trong vùng kéo giống ảnh mẫu) */}
                      {item.dragSummary.zoneSummaries && item.dragSummary.zoneSummaries.length > 0 && (
                        <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/40 p-4 sm:p-5 space-y-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h6 className="font-black text-sm uppercase tracking-wider text-indigo-950 flex items-center gap-2">
                              <Layers className="w-4 h-4 text-sky-600" />
                              <span>HÌNH ẢNH THẺ BÉ ĐÃ KÉO VÀO VÙNG KÉO ({item.dragSummary.zoneSummaries.length} vùng đích)</span>
                            </h6>
                            <span className="text-xs font-black text-sky-700 bg-sky-100/90 border border-sky-300 px-3 py-1 rounded-full shadow-2xs">
                              Bên trái: Trẻ đã kéo ➔ Bên phải: Đáp án của cô
                            </span>
                          </div>

                          <div className="space-y-4 sm:space-y-5">
                            {item.dragSummary.zoneSummaries.map((zone) => {
                              const parsedSlot = parseWordSlot(zone.zoneText || zone.zoneSubText);
                              const isWordBlank = Boolean(parsedSlot);
                              const isZoneAllCorrect = zone.placedCards.length > 0 &&
                                zone.placedCards.every(c => c.isCorrect) &&
                                zone.placedCards.length === zone.expectedCards.length;
                              const isZonePartiallyCorrect = zone.placedCards.some(c => c.isCorrect);

                              // Resolve teacher answer cards for this zone (illustration cards or expected cards)
                              const teacherCards = (zone.illustrationCards && zone.illustrationCards.length > 0)
                                ? zone.illustrationCards
                                : (zone.expectedCards && zone.expectedCards.length > 0)
                                ? zone.expectedCards
                                : (item.dragSummary?.illustrationCards && item.dragSummary.illustrationCards.length > 0)
                                ? item.dragSummary.illustrationCards
                                : [];

                              return (
                                <div
                                  key={zone.zoneId}
                                  className="rounded-2xl border-2 border-sky-300 bg-gradient-to-r from-sky-50/30 via-white to-emerald-50/30 p-3 sm:p-4 shadow-sm"
                                >
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                                    {/* CỘT BÊN TRÁI: VÙNG ĐÍCH (ĐÁP ÁN TRẺ ĐÃ KÉO) */}
                                    <div
                                      className="relative rounded-2xl border-2 border-sky-400 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between"
                                      style={{
                                        backgroundImage: 'radial-gradient(#94a3b8 1.2px, transparent 1.2px)',
                                        backgroundSize: '18px 18px',
                                      }}
                                    >
                                      {/* Top Header: 🎯 VÙNG ĐÍCH */}
                                      <div className="flex items-center justify-between gap-2 mb-2.5 w-full">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500 text-white text-xs font-black shadow-xs uppercase tracking-wider">
                                          <span>🎯</span>
                                          <span>VÙNG ĐÍCH</span>
                                          {zone.zoneName && zone.zoneName !== 'Vùng đích' && (
                                            <span className="text-sky-100 font-bold normal-case">
                                              ({zone.zoneName})
                                            </span>
                                          )}
                                        </div>

                                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs">
                                          Đã kéo: <b className="text-indigo-600">{zone.placedCards.length}</b> thẻ
                                        </span>
                                      </div>

                                      {/* Center: Cards placed inside this zone */}
                                      <div className="py-2.5 sm:py-3.5 px-2 flex flex-wrap items-center justify-center gap-2.5 min-h-[110px] w-full bg-slate-50/70 rounded-2xl border border-sky-100 my-1">
                                        {zone.placedCards.length === 0 ? (
                                          <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl border border-dashed border-sky-300 bg-sky-50/50 max-w-sm">
                                            <span className="text-xl text-slate-300 mb-0.5">🎯</span>
                                            <span className="text-xs font-bold text-slate-500">
                                              Chưa có thẻ nào được kéo vào vùng này
                                            </span>
                                            {parsedSlot && (
                                              <span className="text-[11px] font-extrabold text-sky-600 mt-1">
                                                Chỗ chấm còn trống: {zone.zoneText}
                                              </span>
                                            )}
                                          </div>
                                        ) : isWordBlank && parsedSlot ? (
                                          /* Accurate position for fill-in-the-blank word completion: card sits in the blank slot */
                                          <div className="flex flex-col items-center justify-center gap-2 w-full">
                                            <div className="flex items-center justify-center flex-wrap gap-2.5">
                                              {/* Prefix word part if middle or trailing blank */}
                                              {parsedSlot.prefix && (
                                                <span className="text-3xl sm:text-4xl font-black text-sky-800 font-nunito tracking-wider select-none leading-none">
                                                  {parsedSlot.prefix}
                                                </span>
                                              )}

                                              {/* The placed cards in the exact blank slot position */}
                                              {zone.placedCards.map((card) => (
                                                <div key={card.id} className="flex flex-col items-center">
                                                  {/* Badge on top of card: ✓ ĐÚNG / ✕ SAI */}
                                                  <div className="mb-1 z-10">
                                                    {card.isCorrect ? (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                                                        <span>✓</span>
                                                        <span>ĐÚNG</span>
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                                                        <span>✕</span>
                                                        <span>SAI</span>
                                                      </span>
                                                    )}
                                                  </div>

                                                  {/* Draggable Card Element */}
                                                  <div
                                                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center text-center p-1.5 shadow-md relative transition-transform hover:scale-105 border-2 border-white/50 ${
                                                      card.bgColor
                                                        ? card.bgColor.startsWith('bg-')
                                                          ? card.bgColor
                                                          : ''
                                                        : card.isCorrect
                                                        ? 'bg-sky-500'
                                                        : 'bg-rose-500'
                                                    }`}
                                                    style={
                                                      card.bgColor && !card.bgColor.startsWith('bg-')
                                                        ? { backgroundColor: card.bgColor }
                                                        : {}
                                                    }
                                                  >
                                                    {card.cardImage ? (
                                                      <div
                                                        className="flex flex-col items-center justify-center w-full h-full cursor-zoom-in"
                                                        onClick={() => card.cardImage && setPreviewImage(card.cardImage)}
                                                        title="Bấm để phóng to hình"
                                                      >
                                                        <img
                                                          src={card.cardImage}
                                                          alt={card.cardText}
                                                          className="max-w-[42px] max-h-[42px] sm:max-w-[50px] sm:max-h-[50px] object-contain rounded-xl bg-white/95 p-1 shadow-2xs"
                                                        />
                                                        {card.cardText && (
                                                          <span className="text-[10px] sm:text-xs font-black text-white mt-0.5 truncate max-w-full drop-shadow-xs">
                                                            {card.cardText}
                                                          </span>
                                                        )}
                                                      </div>
                                                    ) : (
                                                      <div className="flex flex-col items-center justify-center">
                                                        <span className="text-2xl sm:text-3xl font-black text-white font-nunito tracking-normal select-none leading-none drop-shadow-xs">
                                                          {card.cardText}
                                                        </span>
                                                        {card.cardSubtext && (
                                                          <span className="text-[10px] font-extrabold text-white/90 mt-0.5 max-w-[95%] truncate">
                                                            {card.cardSubtext}
                                                          </span>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}

                                              {/* Suffix word part if leading or middle blank (e.g. iệng) */}
                                              {parsedSlot.suffix && (
                                                <span className="text-3xl sm:text-4xl font-black text-sky-800 font-nunito tracking-wider select-none leading-none">
                                                  {parsedSlot.suffix}
                                                </span>
                                              )}

                                              {/* Drop zone image if present */}
                                              {zone.zoneImage && (
                                                <img
                                                  src={zone.zoneImage}
                                                  alt=""
                                                  onClick={() => zone.zoneImage && setPreviewImage(zone.zoneImage)}
                                                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xl bg-white border border-sky-200 p-1 shadow-2xs cursor-zoom-in"
                                                  title="Bấm để phóng to"
                                                />
                                              )}
                                            </div>

                                            {/* Explanatory badge: Bé ghép thành từ */}
                                            <div className="text-[11px] sm:text-xs font-black px-3 py-1 rounded-full bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs flex items-center gap-1.5 flex-wrap justify-center">
                                              <span>Bé ghép thành:</span>
                                              <span className="text-indigo-700 font-black text-xs sm:text-sm font-nunito">
                                                "{parsedSlot.prefix || ''}{zone.placedCards.map(c => c.cardText).join('')}{parsedSlot.suffix || ''}"
                                              </span>
                                              {isZoneAllCorrect ? (
                                                <span className="text-emerald-700 font-extrabold ml-1">(Chính xác ✓)</span>
                                              ) : (
                                                <span className="text-rose-700 font-extrabold ml-1">(Chưa đúng ✕)</span>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          /* Standard classification / sorting drop zone view */
                                          <div className="flex flex-wrap items-center justify-center gap-2.5">
                                            {zone.placedCards.map((card) => (
                                              <div key={card.id} className="flex flex-col items-center">
                                                <div className="mb-1 z-10">
                                                  {card.isCorrect ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                                                      <span>✓</span>
                                                      <span>ĐÚNG</span>
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                                                      <span>✕</span>
                                                      <span>SAI</span>
                                                    </span>
                                                  )}
                                                </div>
                                                <div
                                                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center text-center p-1.5 shadow-md relative transition-transform hover:scale-105 border-2 border-white/50 ${
                                                    card.bgColor
                                                      ? card.bgColor.startsWith('bg-')
                                                        ? card.bgColor
                                                        : ''
                                                      : card.isCorrect
                                                      ? 'bg-sky-500'
                                                      : 'bg-rose-500'
                                                  }`}
                                                  style={
                                                    card.bgColor && !card.bgColor.startsWith('bg-')
                                                      ? { backgroundColor: card.bgColor }
                                                      : {}
                                                  }
                                                >
                                                  {card.cardImage ? (
                                                    <div
                                                      className="flex flex-col items-center justify-center w-full h-full cursor-zoom-in"
                                                      onClick={() => card.cardImage && setPreviewImage(card.cardImage)}
                                                      title="Bấm để phóng to hình"
                                                    >
                                                      <img
                                                        src={card.cardImage}
                                                        alt={card.cardText}
                                                        className="max-w-[42px] max-h-[42px] sm:max-w-[50px] sm:max-h-[50px] object-contain rounded-xl bg-white/95 p-1 shadow-2xs"
                                                      />
                                                      {card.cardText && (
                                                        <span className="text-[10px] sm:text-xs font-black text-white mt-0.5 truncate max-w-full drop-shadow-xs">
                                                          {card.cardText}
                                                        </span>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div className="flex flex-col items-center justify-center">
                                                      <span className="text-2xl sm:text-3xl font-black text-white font-nunito tracking-normal select-none leading-none drop-shadow-xs">
                                                        {card.cardText}
                                                      </span>
                                                      {card.cardSubtext && (
                                                        <span className="text-[10px] font-extrabold text-white/90 mt-0.5 max-w-[95%] truncate">
                                                          {card.cardSubtext}
                                                        </span>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                            {zone.zoneImage && (
                                              <img
                                                src={zone.zoneImage}
                                                alt=""
                                                onClick={() => zone.zoneImage && setPreviewImage(zone.zoneImage)}
                                                className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xl bg-white border border-sky-200 p-1 shadow-2xs cursor-zoom-in"
                                                title="Bấm để phóng to"
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* CỘT BÊN PHẢI: ĐÁP ÁN ĐÚNG CỦA CÔ (Hiện bên phải vùng đích theo Hình 2) */}
                                    <div className="relative rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50/70 via-teal-50/50 to-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
                                      {/* Top Header: ✓ ĐÁP ÁN ĐÚNG CỦA CÔ */}
                                      <div className="flex items-center justify-between gap-2 mb-2.5 w-full flex-wrap">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-xs uppercase tracking-wider">
                                          <span>✓</span>
                                          <span>ĐÁP ÁN ĐÚNG CỦA CÔ</span>
                                        </div>

                                        {/* Result status pill */}
                                        {zone.placedCards.length > 0 && (
                                          <span className={`text-xs font-black px-3 py-1 rounded-full shadow-2xs flex items-center gap-1.5 ${
                                            isZoneAllCorrect
                                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                                              : isZonePartiallyCorrect
                                              ? 'bg-amber-500 text-white ring-2 ring-amber-300/50'
                                              : 'bg-rose-600 text-white ring-2 ring-rose-400/50'
                                          }`}>
                                            {isZoneAllCorrect ? (
                                              <>
                                                <span>🌟</span>
                                                <span>KÉO ĐÚNG HOÀN TOÀN</span>
                                              </>
                                            ) : isZonePartiallyCorrect ? (
                                              <>
                                                <span>⚡</span>
                                                <span>ĐÚNG MỘT PHẦN</span>
                                              </>
                                            ) : (
                                              <>
                                                <span>⚠️</span>
                                                <span>KÉO CHƯA CHÍNH XÁC</span>
                                              </>
                                            )}
                                          </span>
                                        )}
                                      </div>

                                      {/* Center: Thẻ đáp án của cô (chỉ hiện thẻ đáp án, không ghi chữ 'thẻ minh họa') */}
                                      <div className="py-2.5 sm:py-3.5 px-2 flex-1 flex flex-wrap items-center justify-center gap-3 min-h-[110px] w-full bg-white/95 rounded-2xl border border-emerald-200 my-1 shadow-inner">
                                        {teacherCards.length === 0 ? (
                                          <div className="text-xs font-bold text-slate-400 italic bg-white p-3 rounded-xl border border-dashed border-emerald-300">
                                            Không có thẻ quy định cho ô này
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap items-center justify-center gap-3">
                                            {teacherCards.map((tc) => {
                                              const isGenericText = !tc.cardText ||
                                                tc.cardText.trim().toLowerCase() === 'thẻ minh họa' ||
                                                tc.cardText.trim().toLowerCase() === 'minh họa';
                                              const displayLabel = isGenericText ? '' : tc.cardText;

                                              return (
                                                <div
                                                  key={tc.id}
                                                  onClick={() => tc.cardImage && setPreviewImage(tc.cardImage)}
                                                  className={`flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-br from-white to-emerald-50/70 border-2 border-emerald-400 shadow-md transition-all hover:scale-105 ${
                                                    tc.cardImage ? 'cursor-zoom-in' : ''
                                                  }`}
                                                  title={tc.cardImage ? 'Bấm để phóng to thẻ đáp án của cô' : undefined}
                                                >
                                                  {tc.cardImage ? (
                                                    <div className="flex flex-col items-center">
                                                      <img
                                                        src={tc.cardImage}
                                                        alt=""
                                                        className="max-w-[70px] max-h-[70px] sm:max-w-[85px] sm:max-h-[85px] object-contain rounded-xl bg-white p-1 border border-emerald-200 shadow-2xs"
                                                      />
                                                      {displayLabel && (
                                                        <span className="font-black text-xs sm:text-sm text-emerald-950 mt-1 max-w-[120px] truncate text-center font-nunito">
                                                          {displayLabel}
                                                        </span>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex flex-col items-center justify-center p-1.5 shadow-xs border-2 border-emerald-400">
                                                      <span className="text-xl sm:text-2xl font-black font-nunito leading-tight">
                                                        {displayLabel || '✓'}
                                                      </span>
                                                      {tc.cardSubtext && (
                                                        <span className="text-[10px] font-bold text-emerald-100 truncate max-w-full">
                                                          {tc.cardSubtext}
                                                        </span>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>

                                      {/* Bottom hint badge */}
                                      <div className="mt-2 text-center">
                                        <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100/80 px-3 py-0.5 rounded-full border border-emerald-300">
                                          Thẻ đáp án đúng của cô
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Section 1: Thẻ đã chọn ĐÚNG */}
                      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-2.5">
                          <h6 className="font-black text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>CÁC THẺ ĐÃ KÉO ĐÚNG ({item.dragSummary.correctCards.length} thẻ)</span>
                          </h6>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            +{item.dragSummary.correctCards.reduce((acc, c) => acc + c.points, 0)}đ
                          </span>
                        </div>

                        {item.dragSummary.correctCards.length === 0 ? (
                          <div className="p-3 bg-white rounded-xl text-center text-xs font-bold text-slate-400 border border-dashed border-emerald-200">
                            Chưa có thẻ nào được kéo đúng ô.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {item.dragSummary.correctCards.map((c) => (
                              <div
                                key={c.id}
                                className="bg-white p-3 rounded-xl border border-emerald-300 shadow-2xs flex items-center justify-between gap-2.5"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {c.cardImage ? (
                                    <img
                                      src={c.cardImage}
                                      alt={c.cardText}
                                      onClick={() => c.cardImage && setPreviewImage(c.cardImage)}
                                      className="w-12 h-12 object-contain rounded-xl border border-emerald-200 shrink-0 bg-emerald-50/30 p-0.5 shadow-2xs cursor-zoom-in hover:scale-105 transition"
                                      title="Bấm để phóng to"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-black flex items-center justify-center text-sm shrink-0 border border-emerald-200">
                                      🎴
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="font-black text-sm text-slate-900 block truncate" title={c.cardText}>
                                      {c.cardText}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 mt-0.5 flex-wrap">
                                      <span>➔ Đúng:</span>
                                      <span className="inline-flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-md font-extrabold text-emerald-900">
                                        {c.placedTargetImage && (
                                          <img src={c.placedTargetImage} alt="" className="w-4 h-4 object-contain rounded bg-white" />
                                        )}
                                        <span className="truncate">{c.placedTargetName}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs font-black text-emerald-600 shrink-0 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  ✓ (+{c.points}đ)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Thẻ kéo SAI / NHẦM Ô */}
                      <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-2.5">
                          <h6 className="font-black text-xs uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>CÁC THẺ KÉO SAI / NHẦM Ô ({item.dragSummary.wrongCards.length} thẻ)</span>
                          </h6>
                          {item.dragSummary.wrongCards.length > 0 && (
                            <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                              Cần cô hướng dẫn thêm
                            </span>
                          )}
                        </div>

                        {item.dragSummary.wrongCards.length === 0 ? (
                          <div className="p-3 bg-white rounded-xl text-center text-xs font-bold text-emerald-700 border border-dashed border-emerald-200">
                            Tuyệt vời! Đội không kéo nhầm thẻ nào! 🎉
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {item.dragSummary.wrongCards.map((c) => (
                              <div
                                key={c.id}
                                className="bg-white p-3 rounded-xl border-2 border-rose-300 shadow-2xs flex flex-col gap-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {c.cardImage ? (
                                      <img
                                        src={c.cardImage}
                                        alt={c.cardText}
                                        onClick={() => c.cardImage && setPreviewImage(c.cardImage)}
                                        className="w-12 h-12 object-contain rounded-xl border border-rose-200 shrink-0 bg-rose-50/30 p-0.5 shadow-2xs cursor-zoom-in hover:scale-105 transition"
                                        title="Bấm để phóng to"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 font-black flex items-center justify-center text-sm shrink-0 border border-rose-200">
                                        🎴
                                      </div>
                                    )}
                                    <span className="font-black text-sm text-slate-900 truncate" title={c.cardText}>
                                      {c.cardText}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md shrink-0">
                                    ✕ Sai (0đ)
                                  </span>
                                </div>

                                {/* Comparison: placed target vs correct target */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-xs">
                                  <div className="p-2 rounded-lg bg-rose-50 text-rose-900 border border-rose-200">
                                    <span className="text-[10px] font-black uppercase text-rose-600 block">Đã kéo nhầm vào:</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {c.placedTargetImage && (
                                        <img src={c.placedTargetImage} alt="" className="w-4 h-4 object-contain rounded bg-white" />
                                      )}
                                      <span className="font-extrabold line-through text-rose-800">{c.placedTargetName}</span>
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                                    <span className="text-[10px] font-black uppercase text-emerald-700 block">Ô chính xác:</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {c.correctTargetImage && (
                                        <img src={c.correctTargetImage} alt="" className="w-4 h-4 object-contain rounded bg-white" />
                                      )}
                                      <span className="font-black text-emerald-800">{c.correctTargetName}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 3: Thẻ CHƯA KỊP KÉO (nếu có) */}
                      {item.dragSummary.unplacedCards.length > 0 && (
                        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/60 p-3 sm:p-4">
                          <h6 className="font-black text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-2.5">
                            <AlertCircle className="w-4 h-4 text-slate-500" />
                            <span>CÁC THẺ CHƯA KỊP KÉO ({item.dragSummary.unplacedCards.length} thẻ)</span>
                          </h6>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                            {item.dragSummary.unplacedCards.map((c) => (
                              <div key={c.id} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {c.cardImage ? (
                                    <img
                                      src={c.cardImage}
                                      alt=""
                                      onClick={() => c.cardImage && setPreviewImage(c.cardImage)}
                                      className="w-9 h-9 object-contain rounded-lg border border-slate-200 bg-slate-50 p-0.5 shrink-0 cursor-zoom-in"
                                      title="Bấm để phóng to"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">🎴</div>
                                  )}
                                  <span className="font-extrabold text-slate-700 truncate">{c.cardText}</span>
                                </div>
                                <span className="text-[11px] text-slate-500 font-bold shrink-0">
                                  Ô đúng là: <strong className="text-emerald-700">{c.correctTargetName}</strong>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : item.source === 'word_drag_drop' && item.wordDragSummary ? (
                    /* Redesigned Word Drag & Drop: Clean, Border-Minimized Side-by-Side Comparison (Tự chấm điểm) */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 items-stretch">
                      {/* CỘT BÊN TRÁI: BÀI LÀM CỦA BÉ */}
                      <div className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-slate-50/80 border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                            <span className="text-sm">🎯</span>
                            <span>BÀI LÀM CỦA {currentTeam?.teamName}:</span>
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs flex items-center gap-1 ${
                            item.isCorrect
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.wordDragSummary.chosenLetter
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {item.isCorrect
                              ? `✓ ĐÚNG (+${item.pointsAwarded}đ)`
                              : item.wordDragSummary.chosenLetter
                              ? '✕ CHƯA ĐÚNG (0đ)'
                              : 'CHƯA GHÉP CHỮ (0đ)'}
                          </span>
                        </div>

                        {/* Word formation center display */}
                        <div className="py-4 sm:py-5 flex flex-col items-center justify-center">
                          <span className="text-[11px] font-bold uppercase text-slate-400 mb-2.5 tracking-wider">
                            Vị trí ô chữ bé đã ghép
                          </span>

                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {item.wordDragSummary.prefix && (
                              <span className="text-2xl sm:text-4xl font-black text-slate-800 lowercase font-nunito tracking-wide">
                                {item.wordDragSummary.prefix.toLowerCase()}
                              </span>
                            )}

                            {/* Child's chosen letter slot */}
                            <div className={`w-13 h-15 sm:w-16 sm:h-18 rounded-2xl flex items-center justify-center text-center shadow-xs select-none ${
                              item.isCorrect
                                ? 'bg-emerald-600 text-white'
                                : item.wordDragSummary.chosenLetter
                                ? 'bg-rose-500 text-white'
                                : 'bg-slate-200 text-slate-400 border-2 border-dashed border-slate-300'
                            }`}>
                              <span className="text-2xl sm:text-4xl font-black lowercase">
                                {(item.wordDragSummary.chosenLetter || '...').toLowerCase()}
                              </span>
                            </div>

                            {item.wordDragSummary.suffix && (
                              <span className="text-2xl sm:text-4xl font-black text-slate-800 lowercase font-nunito tracking-wide">
                                {item.wordDragSummary.suffix.toLowerCase()}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 text-xs sm:text-sm font-black text-slate-700">
                            {item.wordDragSummary.chosenLetter ? (
                              <span>
                                Bé ghép thành từ: <b className="text-indigo-700 lowercase font-nunito text-sm sm:text-base">"{item.wordDragSummary.formedWord.toLowerCase()}"</b>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Bé chưa kéo chữ cái nào vào ô</span>
                            )}
                          </div>
                        </div>

                        {/* Clean auto-graded footer notice */}
                        <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                          <span>⚡ Kết quả tự động chấm</span>
                          <span className={item.isCorrect ? 'text-emerald-700 font-black' : 'text-rose-600 font-black'}>
                            {item.isCorrect ? `Đạt ${item.pointsAwarded}đ` : 'Chưa ghi điểm'}
                          </span>
                        </div>
                      </div>

                      {/* CỘT BÊN PHẢI: ĐÁP ÁN ĐÚNG CỦA CÔ */}
                      <div className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between bg-emerald-50/50 border border-emerald-200 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-emerald-200/60">
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                            <span className="text-sm">✓</span>
                            <span>ĐÁP ÁN ĐÚNG CỦA CÔ (ĐỐI CHIẾU):</span>
                          </span>
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Đáp án chuẩn
                          </span>
                        </div>

                        {/* Teacher's correct word formation display */}
                        <div className="py-4 sm:py-5 flex flex-col items-center justify-center">
                          <span className="text-[11px] font-bold uppercase text-emerald-700 mb-2.5 tracking-wider">
                            Chữ cái đúng và từ chuẩn
                          </span>

                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {item.wordDragSummary.prefix && (
                              <span className="text-2xl sm:text-4xl font-black text-emerald-950 uppercase font-nunito tracking-wide">
                                {item.wordDragSummary.prefix}
                              </span>
                            )}

                            {/* Correct letter tile */}
                            <div className="w-13 h-15 sm:w-16 sm:h-18 rounded-2xl flex items-center justify-center text-center shadow-xs bg-emerald-600 text-white select-none">
                              <span className="text-2xl sm:text-4xl font-black uppercase">
                                {item.wordDragSummary.correctLetter}
                              </span>
                            </div>

                            {item.wordDragSummary.suffix && (
                              <span className="text-2xl sm:text-4xl font-black text-emerald-950 uppercase font-nunito tracking-wide">
                                {item.wordDragSummary.suffix}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 text-xs sm:text-sm font-black text-emerald-950">
                            Từ chuẩn của cô: <b className="text-emerald-700 uppercase font-nunito text-sm sm:text-base">"{(item.wordDragSummary.targetWord || `${item.wordDragSummary.prefix}${item.wordDragSummary.correctLetter}${item.wordDragSummary.suffix}`).toUpperCase()}"</b>
                          </div>
                        </div>

                        {/* Clean Illustration and explanation section (no clashing borders) */}
                        {item.wordDragSummary.answerImageUrl ? (
                          <div className="pt-2.5 border-t border-emerald-200/60 flex items-center gap-2.5">
                            <img
                              src={item.wordDragSummary.answerImageUrl}
                              alt="Hình ảnh đáp án"
                              onClick={() => setPreviewImage(item.wordDragSummary!.answerImageUrl!)}
                              className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-xl bg-white border border-emerald-200 p-0.5 shadow-2xs cursor-zoom-in shrink-0"
                              title="Bấm để phóng to hình"
                            />
                            <div className="min-w-0 flex-1">
                              {item.wordDragSummary.answerTitle && (
                                <h6 className="text-xs sm:text-sm font-black text-emerald-950 truncate">
                                  ⭐ {item.wordDragSummary.answerTitle}
                                </h6>
                              )}
                              {item.wordDragSummary.explanation && (
                                <p className="text-[11px] font-semibold text-emerald-800 line-clamp-2 mt-0.5">
                                  {item.wordDragSummary.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : item.wordDragSummary.explanation ? (
                          <div className="pt-2.5 border-t border-emerald-200/60 text-xs font-semibold text-emerald-900">
                            💡 <b>Giải thích của cô:</b> {item.wordDragSummary.explanation}
                          </div>
                        ) : (
                          <div className="pt-2.5 border-t border-emerald-200/60 text-[11px] text-emerald-700 font-bold">
                            ✓ Đối chiếu chuẩn xác
                          </div>
                        )}
                      </div>
                    </div>
                  ) : item.source === 'open_ended' ? (
                    /* Open-ended Dedicated Layout: Side-by-Side Child Submission & Teacher Model Answer */
                    <div className="space-y-4 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 p-4 sm:p-6 rounded-3xl border-2 border-purple-200 shadow-xs">
                      {/* Side-by-Side Comparison: Child Work (Left) vs Model Answer (Right) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                        {/* Side A: Child's Submission */}
                        <div className="flex flex-col justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border-2 border-purple-200 shadow-xs">
                          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-purple-100">
                            <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-2">
                              <PenTool className="w-4 h-4 text-purple-600" />
                              <span>🧒 BÀI LÀM CỦA {currentTeam?.teamName}:</span>
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                              item.isCorrect
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : item.openEnded?.teacherGrade === 'wrong'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {item.openEnded?.teacherGrade === 'correct' ? '✅ Đã chấm Đúng (+10đ)' : item.openEnded?.teacherGrade === 'wrong' ? '❌ Đã chấm Chưa đúng (0đ)' : '⏳ Chờ cô sửa lỗi & chấm'}
                            </span>
                          </div>

                          {item.chosenImage ? (
                            <div className="relative group bg-slate-50/80 rounded-2xl border-2 border-purple-200 p-2.5 shadow-inner flex flex-col items-center justify-center overflow-hidden min-h-[220px]">
                              <img
                                src={item.chosenImage}
                                alt="Bài vẽ của bé"
                                onClick={() => setPreviewImage(item.chosenImage!)}
                                className="max-h-72 sm:max-h-84 w-full object-contain rounded-xl cursor-zoom-in transition group-hover:scale-101"
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewImage(item.chosenImage!)}
                                className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md backdrop-blur-sm transition cursor-pointer"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span>Phóng to bài vẽ</span>
                              </button>
                            </div>
                          ) : null}

                          {item.openEnded?.textAnswer ? (
                            <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-200">
                              <span className="text-[10px] font-black uppercase text-purple-600 block mb-1">Nội dung chữ bé đã viết:</span>
                              <p className="text-base sm:text-lg font-black text-slate-800 tracking-wide">
                                "{item.openEnded.textAnswer}"
                              </p>
                            </div>
                          ) : null}

                          {!item.chosenImage && !item.openEnded?.textAnswer && (
                            <div className="bg-slate-50 p-8 rounded-xl border-2 border-dashed border-purple-200 text-center text-xs font-bold text-slate-400">
                              Đội chưa nộp hình vẽ hoặc nội dung chữ cho câu hỏi này.
                            </div>
                          )}
                        </div>

                        {/* Side B: Teacher's Model Answer (Song song đối chiếu) */}
                        <div className="flex flex-col justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-300 shadow-xs">
                          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-emerald-100">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                                🎯
                              </span>
                              <span>ĐÁP ÁN MẪU CHUẨN CỦA CÔ (ĐỐI CHIẾU):</span>
                            </span>
                            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Mẫu chuẩn so sánh
                            </span>
                          </div>

                          {item.modelAnswerImage ? (
                            <div className="relative group bg-emerald-50/40 rounded-2xl border-2 border-emerald-200 p-2.5 shadow-inner flex flex-col items-center justify-center overflow-hidden min-h-[220px]">
                              <img
                                src={item.modelAnswerImage}
                                alt="Đáp án mẫu của cô"
                                onClick={() => setPreviewImage(item.modelAnswerImage!)}
                                className="max-h-72 sm:max-h-84 w-full object-contain rounded-xl cursor-zoom-in transition group-hover:scale-101"
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewImage(item.modelAnswerImage!)}
                                className="absolute bottom-3 right-3 bg-emerald-800/90 hover:bg-emerald-900 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md backdrop-blur-sm transition cursor-pointer"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span>Phóng to đáp án mẫu</span>
                              </button>
                            </div>
                          ) : null}

                          {item.modelAnswer ? (
                            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                              <span className="text-[10px] font-black uppercase text-emerald-800 block mb-1">
                                Lời giải / nội dung chữ mẫu của cô:
                              </span>
                              <p className="text-sm sm:text-base font-extrabold text-emerald-950 leading-relaxed">
                                "{item.modelAnswer}"
                              </p>
                            </div>
                          ) : null}

                          {!item.modelAnswerImage && !item.modelAnswer && (
                            <div className="bg-amber-50/60 p-6 rounded-xl border-2 border-dashed border-amber-200 text-center text-xs font-bold text-amber-800 space-y-1">
                              <p className="font-black text-amber-900">Chưa tải hình ảnh hoặc ghi đáp án mẫu cho câu này</p>
                              <p className="text-[11px] text-amber-700">Cô có thể bấm vào nút Chỉnh sửa câu hỏi để thêm ảnh mẫu hoặc ghi lời giải mẫu.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Grading & Comment Bar */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-4 sm:p-5 rounded-2xl border-2 border-purple-200/80 shadow-2xs items-center">
                        <div className="md:col-span-8 space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-500 shrink-0 mt-0.5">
                              Yêu cầu đề bài:
                            </span>
                            <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                              {item.questionTitle}
                            </span>
                          </div>
                          {item.openEnded?.teacherFeedback?.trim() ? (
                            <div className="p-2.5 rounded-xl bg-purple-50 text-xs font-bold text-purple-900 border border-purple-200 flex items-start gap-2">
                              <span>💌</span>
                              <span><b>Lời cô sửa:</b> "{item.openEnded.teacherFeedback}"</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="md:col-span-4 flex flex-col sm:flex-row items-center justify-end gap-3">
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Điểm câu này</span>
                            <span className="font-mono font-black text-lg text-purple-700">+{item.pointsAwarded}đ</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              setGradeModalQuestionIndex(item.questionIndex);
                              setGradeModalOpen(true);
                            }}
                            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                          >
                            <PenTool className="w-4 h-4" />
                            <span>✏️ Mở Bút Vẽ Sửa Bài & Chấm Điểm</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Multiple Choice & Interactive Games Answer Comparison Grid */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Student / Team Picked */}
                      <div className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 ${
                        item.isCorrect
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50/70 border-rose-200 text-rose-950'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                            {currentTeam?.teamName} ĐÃ CHỌN:
                          </span>
                          <span className="text-base">
                            {item.isCorrect ? '✅' : '❌'}
                          </span>
                        </div>

                        {item.chosenItems && item.chosenItems.length > 0 ? (
                          <div className="space-y-2">
                            {item.chosenItems.map((ci, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                                {ci.letter && (
                                  <span className={`w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 ${
                                    ci.isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                                  }`}>
                                    {ci.letter}
                                  </span>
                                )}
                                {ci.imageUrl && (
                                  <img
                                    src={ci.imageUrl}
                                    alt={ci.text}
                                    onClick={() => ci.imageUrl && setPreviewImage(ci.imageUrl)}
                                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-lg border border-slate-200 shrink-0 bg-slate-50 cursor-zoom-in hover:scale-105 transition"
                                    title="Bấm để phóng to"
                                  />
                                )}
                                <span className="font-extrabold text-sm sm:text-base text-slate-800 break-words flex-1">
                                  {ci.text}
                                </span>
                                <span className="text-sm">
                                  {ci.isCorrect ? '✅' : '❌'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                            {item.chosenImage ? (
                              <img
                                src={item.chosenImage}
                                alt="Đáp án chọn"
                                onClick={() => item.chosenImage && setPreviewImage(item.chosenImage)}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg border border-slate-200 shrink-0 bg-slate-50 cursor-zoom-in hover:scale-105 transition"
                                title="Bấm để phóng to"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <span className="font-extrabold text-sm sm:text-base text-slate-800 block break-words">
                                {item.chosenText}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Official Correct Answer - Displays ALL correct options */}
                      <div className="p-4 rounded-2xl border-2 bg-emerald-50/40 border-emerald-200 text-emerald-950 flex flex-col justify-between gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                            <span>ĐÁP ÁN ĐÚNG CHUẨN CỦA CÔ:</span>
                            {item.correctItems && item.correctItems.length > 1 && (
                              <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.2 rounded-md font-extrabold">
                                ({item.correctItems.length} đáp án đúng)
                              </span>
                            )}
                          </span>
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        </div>

                        {item.correctItems && item.correctItems.length > 0 ? (
                          <div className="space-y-2">
                            {item.correctItems.map((ci, cIdx) => (
                              <div key={cIdx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                                {ci.letter && (
                                  <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                    {ci.letter}
                                  </span>
                                )}
                                {ci.imageUrl && (
                                  <img
                                    src={ci.imageUrl}
                                    alt={ci.text}
                                    onClick={() => ci.imageUrl && setPreviewImage(ci.imageUrl)}
                                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-lg border border-emerald-200 shrink-0 bg-emerald-50/50 cursor-zoom-in hover:scale-105 transition"
                                    title="Bấm để phóng to"
                                  />
                                )}
                                <span className="font-extrabold text-sm sm:text-base text-emerald-900 break-words flex-1">
                                  {ci.text}
                                </span>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                            {item.correctImage ? (
                              <img
                                src={item.correctImage}
                                alt="Đáp án đúng"
                                onClick={() => item.correctImage && setPreviewImage(item.correctImage)}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg border border-emerald-200 shrink-0 bg-emerald-50/50 cursor-zoom-in hover:scale-105 transition"
                                title="Bấm để phóng to"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <span className="font-extrabold text-sm sm:text-base text-emerald-900 block break-words">
                                {item.correctText}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Extra summary if available */}
                  {item.summaryText && item.source !== 'open_ended' && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                      <span>Ghi chú: {item.summaryText}</span>
                      <span>+{item.pointsAwarded} điểm</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-500">
            Hiển thị <b>{filteredItems.length}</b> lượt trả lời của <b>{currentTeam?.teamName}</b> · Chế độ toàn màn hình
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {isBrowserFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isBrowserFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình (F11)'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer"
            >
              Đóng (Esc)
            </button>
          </div>
        </div>
      </div>

      {/* Grade Open Ended Modal */}
      <GradeOpenEndedModal
        session={session}
        questionIndex={gradeModalQuestionIndex}
        teamId={selectedTeamId}
        isOpen={gradeModalOpen}
        onClose={() => setGradeModalOpen(false)}
      />

      {/* Image Zoom / Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={previewImage}
              alt="Phóng to"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-white p-2 border-2 border-white/20"
            />
            <div className="mt-3 flex items-center gap-2 bg-black/60 text-white px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm">
              <span>Bấm vào bất kỳ đâu hoặc bấm Esc để đóng</span>
              <X className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
