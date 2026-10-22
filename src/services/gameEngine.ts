import { Question, TeamAnswer, DragActionRecord, InteractionRule } from '../types/game';

export interface DragEvaluationResult {
  isComplete: boolean;
  isCorrect: boolean;
  totalCorrect: number;
  totalWrong: number;
  placedCount: number;
  totalRequired: number;
  pointsAwarded: number;
  actions: DragActionRecord[];
}

export class GameEngine {
  /**
   * Evaluate a drag-drop placement state against the question's canvasConfig rules
   * @param question Current interactive question
   * @param placements Map of itemId -> targetId where the item is currently dropped
   * @param speedBonus Whether speed bonus applies
   * @param responseTimeMs Time taken in milliseconds
   */
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
    // Only elements that are truly draggable and not locked or static
    const draggableElements = config.elements.filter(
      (e) => !e.isDropZone && e.type !== 'drop_zone' && !e.isLocked && e.cardRole !== 'static' && e.isDraggable !== false && Boolean(e.isDraggable || e.type === 'drag_item')
    );
    // Target required cards to place: exclude cards designated as 'wrong'
    const requiredCards = draggableElements.filter(
      (e) => e.cardRole !== 'wrong' && rules.some((r) => r.sourceId === e.id && r.isCorrect)
    );
    const totalRequired = requiredCards.length > 0 ? requiredCards.length : draggableElements.length;
    const placedCount = Object.keys(placements).length;

    let totalCorrect = 0;
    let totalWrong = 0;
    const actions: DragActionRecord[] = [];

    // Evaluate each placed item
    for (const [itemId, targetId] of Object.entries(placements)) {
      const itemEl = config.elements.find((e) => e.id === itemId);
      // If card role is explicitly 'wrong' (thẻ kéo vào là tính sai / thẻ gây nhiễu)
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

      // Find matching rule
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

    // Complete if all required cards have been placed
    const isComplete = placedCount >= totalRequired && totalRequired > 0;
    const isAllCorrect = totalCorrect === totalRequired && totalWrong === 0 && totalRequired > 0;

    // Calculate score
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

  /**
   * Validate game structure and find issues (Section 35)
   */
  public static validateQuestion(question: Question): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!question.title || !question.title.trim()) {
      errors.push('Câu hỏi chưa có tiêu đề.');
    }

    if (question.type === 'drag_drop') {
      const config = question.canvasConfig;
      if (!config) {
        errors.push('Chưa có cấu hình Canvas cho trò chơi kéo thả.');
      } else {
        const dropZones = config.elements.filter(e => e.isDropZone);
        const dragItems = config.elements.filter(e => e.isDraggable);

        if (dropZones.length === 0) {
          errors.push('Cần ít nhất một Vùng đích (Drop Zone) để bé kéo vào.');
        }

        if (dragItems.length === 0) {
          errors.push('Cần ít nhất một Thẻ kéo (Draggable Item).');
        }

        const validRules = config.rules.filter(r => r.isCorrect);
        if (validRules.length === 0) {
          errors.push('Chưa thiết lập quy tắc đáp án đúng cho các thẻ kéo.');
        }
      }
    } else {
      // Choice question
      if (!question.options || question.options.length < 2) {
        errors.push('Cần ít nhất 2 đáp án lựa chọn.');
      }
      const hasCorrect = question.options?.some(o => o.isCorrect);
      if (!hasCorrect) {
        errors.push('Chưa đánh dấu đáp án đúng.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
