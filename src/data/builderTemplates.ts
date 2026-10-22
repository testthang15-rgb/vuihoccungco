import { Question, InteractiveCanvasConfig } from '../types/game';

export interface GameTemplateItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: string;
  thumbnailBadge: string;
  description: string;
  createQuestion: () => Question;
}

export const BUILDER_TEMPLATES: GameTemplateItem[] = [
  // 1. Template: KÉO CHỮ U - Ư (Giữ index 0 để tương thích)
  {
    id: 'tpl_u_uw_drag',
    title: 'KÉO CHỮ U – Ư VÀO Ô ĐÚNG',
    subtitle: '2 vùng đích + 6 thẻ chữ cái',
    category: 'Chữ cái',
    icon: '🔤',
    thumbnailBadge: 'Chữ U - Ư',
    description: 'Bé kéo các thẻ chữ U và chữ Ư vào đúng ô tương ứng ở phía trên.',
    createQuestion: (): Question => {
      const targetUId = 'zone_u_' + Math.random().toString(36).substring(2, 7);
      const targetUwId = 'zone_uw_' + Math.random().toString(36).substring(2, 7);

      const cardU1 = 'card_u1_' + Math.random().toString(36).substring(2, 7);
      const cardUw1 = 'card_uw1_' + Math.random().toString(36).substring(2, 7);
      const cardU2 = 'card_u2_' + Math.random().toString(36).substring(2, 7);
      const cardUw2 = 'card_uw2_' + Math.random().toString(36).substring(2, 7);
      const cardU3 = 'card_u3_' + Math.random().toString(36).substring(2, 7);
      const cardUw3 = 'card_uw3_' + Math.random().toString(36).substring(2, 7);

      const canvasConfig: InteractiveCanvasConfig = {
        width: 1280,
        height: 720,
        bgTheme: 'pastel_sky',
        elements: [
          // Title Banner
          {
            id: 'title_banner',
            type: 'text',
            x: 240,
            y: 35,
            width: 800,
            height: 70,
            text: 'BÉ HÃY KÉO CHỮ VÀO ĐÚNG Ô NHÉ!',
            fontSize: 32,
            fontWeight: '900',
            textColor: '#1e293b',
            bgColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: 3,
            borderRadius: 24,
            shadow: true,
          },
          // Drop Zone U
          {
            id: targetUId,
            type: 'drop_zone',
            x: 200,
            y: 135,
            width: 380,
            height: 270,
            text: 'Ô CHỮ U',
            subText: 'Thả chữ U vào đây',
            fontSize: 48,
            fontWeight: '900',
            textColor: '#0284c7',
            bgColor: '#f0f9ff',
            borderColor: '#38bdf8',
            borderWidth: 4,
            borderRadius: 32,
            isDropZone: true,
            acceptsCategory: 'U',
            shadow: true,
          },
          // Drop Zone Ư
          {
            id: targetUwId,
            type: 'drop_zone',
            x: 700,
            y: 135,
            width: 380,
            height: 270,
            text: 'Ô CHỮ Ư',
            subText: 'Thả chữ Ư vào đây',
            fontSize: 48,
            fontWeight: '900',
            textColor: '#e11d48',
            bgColor: '#fff1f2',
            borderColor: '#fb7185',
            borderWidth: 4,
            borderRadius: 32,
            isDropZone: true,
            acceptsCategory: 'Ư',
            shadow: true,
          },
          // Bottom Shelf Container
          {
            id: 'shelf_bg',
            type: 'shape',
            x: 80,
            y: 445,
            width: 1120,
            height: 235,
            bgColor: '#ffffff',
            borderColor: '#cbd5e1',
            borderWidth: 3,
            borderRadius: 36,
            shadow: true,
          },
          // 6 Draggable Cards (3 U, 3 Ư)
          {
            id: cardU1,
            type: 'drag_item',
            x: 120,
            y: 485,
            width: 155,
            height: 155,
            text: 'U',
            fontSize: 64,
            fontWeight: '900',
            textColor: '#ffffff',
            bgColor: '#0284c7',
            borderRadius: 28,
            isDraggable: true,
            itemCategory: 'U',
            shadow: true,
          },
          {
            id: cardUw1,
            type: 'drag_item',
            x: 300,
            y: 485,
            width: 155,
            height: 155,
            text: 'Ư',
            fontSize: 64,
            fontWeight: '900',
            textColor: '#ffffff',
            bgColor: '#e11d48',
            borderRadius: 28,
            isDraggable: true,
            itemCategory: 'Ư',
            shadow: true,
          },
          {
            id: cardU2,
            type: 'drag_item',
            x: 480,
            y: 485,
            width: 155,
            height: 155,
            text: 'U',
            fontSize: 64,
            fontWeight: '900',
            textColor: '#ffffff',
            bgColor: '#0284c7',
            borderRadius: 28,
            isDraggable: true,
            itemCategory: 'U',
            shadow: true,
          },
          {
            id: cardUw2,
            type: 'drag_item',
            x: 660,
            y: 485,
            width: 155,
            height: 155,
            text: 'Ư',
            fontSize: 64,
            fontWeight: '900',
            textColor: '#ffffff',
            bgColor: '#e11d48',
            borderRadius: 28,
            isDraggable: true,
            itemCategory: 'Ư',
            shadow: true,
          },
          {
            id: cardU3,
            type: 'drag_item',
            x: 840,
            y: 485,
            width: 155,
            height: 155,
            text: 'U',
            fontSize: 64,
            fontWeight: '900',
            textColor: '#ffffff',
            bgColor: '#0284c7',
            borderRadius: 28,
            isDraggable: true,
            itemCategory: 'U',
            shadow: true,
          },
          {
            id: cardUw3,
            type: 'drag_item',
            x: 1020,
            y: 485,
            width: 155,
            height: 155,
            text: 'Ư',
            fontSize: 64,
            fontWeight: '900',
            textColor: '#ffffff',
            bgColor: '#e11d48',
            borderRadius: 28,
            isDraggable: true,
            itemCategory: 'Ư',
            shadow: true,
          },
        ],
        rules: [
          { id: 'r1', sourceId: cardU1, targetId: targetUId, isCorrect: true, points: 5 },
          { id: 'r2', sourceId: cardUw1, targetId: targetUwId, isCorrect: true, points: 5 },
          { id: 'r3', sourceId: cardU2, targetId: targetUId, isCorrect: true, points: 5 },
          { id: 'r4', sourceId: cardUw2, targetId: targetUwId, isCorrect: true, points: 5 },
          { id: 'r5', sourceId: cardU3, targetId: targetUId, isCorrect: true, points: 5 },
          { id: 'r6', sourceId: cardUw3, targetId: targetUwId, isCorrect: true, points: 5 },
        ],
      };

      return {
        id: 'q_u_uw_' + Date.now(),
        title: 'Kéo chữ U và chữ Ư vào đúng ô',
        type: 'drag_drop',
        timeLimit: 0,
        noTimeLimit: true,
        points: 30,
        explanation: 'Bé đã phân biệt chữ U và chữ Ư rất chuẩn xác!',
        options: [],
        canvasConfig,
      };
    },
  },

  // 2. Template: PHÂN LOẠI A - Ă - Â (Giữ index 1 để tương thích)
  {
    id: 'tpl_a_aw_aa_drag',
    title: 'PHÂN LOẠI CHỮ A – Ă – Â',
    subtitle: '3 vùng đích + 6 thẻ chữ',
    category: 'Chữ cái',
    icon: '🅰️',
    thumbnailBadge: 'Chữ A - Ă - Â',
    description: '3 ô đích dành cho chữ A, Ă, Â cùng các thẻ chữ cái nhiều màu sắc.',
    createQuestion: (): Question => {
      const targetA = 'zone_a_' + Math.random().toString(36).substring(2, 7);
      const targetAw = 'zone_aw_' + Math.random().toString(36).substring(2, 7);
      const targetAa = 'zone_aa_' + Math.random().toString(36).substring(2, 7);

      const cA1 = 'cA1_' + Math.random().toString(36).substring(2, 7);
      const cAw1 = 'cAw1_' + Math.random().toString(36).substring(2, 7);
      const cAa1 = 'cAa1_' + Math.random().toString(36).substring(2, 7);
      const cA2 = 'cA2_' + Math.random().toString(36).substring(2, 7);
      const cAw2 = 'cAw2_' + Math.random().toString(36).substring(2, 7);
      const cAa2 = 'cAa2_' + Math.random().toString(36).substring(2, 7);

      const canvasConfig: InteractiveCanvasConfig = {
        width: 1280,
        height: 720,
        bgTheme: 'pastel_amber',
        elements: [
          {
            id: 'title_banner',
            type: 'text',
            x: 240,
            y: 35,
            width: 800,
            height: 70,
            text: 'BÉ PHÂN LOẠI CHỮ A, Ă, Â VÀO ĐÚNG Ô NHÉ!',
            fontSize: 30,
            fontWeight: '900',
            textColor: '#1e293b',
            bgColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: 3,
            borderRadius: 24,
            shadow: true,
          },
          // 3 Drop zones
          {
            id: targetA,
            type: 'drop_zone',
            x: 80,
            y: 130,
            width: 340,
            height: 270,
            text: 'CHỮ A',
            subText: 'Thả chữ A vào đây',
            fontSize: 44,
            fontWeight: '900',
            textColor: '#d97706',
            bgColor: '#fffbeb',
            borderColor: '#f59e0b',
            borderWidth: 4,
            borderRadius: 32,
            isDropZone: true,
            acceptsCategory: 'A',
            shadow: true,
          },
          {
            id: targetAw,
            type: 'drop_zone',
            x: 470,
            y: 130,
            width: 340,
            height: 270,
            text: 'CHỮ Ă',
            subText: 'Thả chữ Ă vào đây',
            fontSize: 44,
            fontWeight: '900',
            textColor: '#059669',
            bgColor: '#ecfdf5',
            borderColor: '#10b981',
            borderWidth: 4,
            borderRadius: 32,
            isDropZone: true,
            acceptsCategory: 'Ă',
            shadow: true,
          },
          {
            id: targetAa,
            type: 'drop_zone',
            x: 860,
            y: 130,
            width: 340,
            height: 270,
            text: 'CHỮ Â',
            subText: 'Thả chữ Â vào đây',
            fontSize: 44,
            fontWeight: '900',
            textColor: '#7c3aed',
            bgColor: '#f5f3ff',
            borderColor: '#8b5cf6',
            borderWidth: 4,
            borderRadius: 32,
            isDropZone: true,
            acceptsCategory: 'Â',
            shadow: true,
          },
          // Bottom Shelf
          {
            id: 'shelf_bg',
            type: 'shape',
            x: 80,
            y: 445,
            width: 1120,
            height: 235,
            bgColor: '#ffffff',
            borderColor: '#cbd5e1',
            borderWidth: 3,
            borderRadius: 36,
            shadow: true,
          },
          // 6 Draggable Cards
          { id: cA1, type: 'drag_item', x: 120, y: 485, width: 155, height: 155, text: 'A', fontSize: 64, fontWeight: '900', textColor: '#ffffff', bgColor: '#f59e0b', borderRadius: 28, isDraggable: true, itemCategory: 'A', shadow: true },
          { id: cAw1, type: 'drag_item', x: 300, y: 485, width: 155, height: 155, text: 'Ă', fontSize: 64, fontWeight: '900', textColor: '#ffffff', bgColor: '#10b981', borderRadius: 28, isDraggable: true, itemCategory: 'Ă', shadow: true },
          { id: cAa1, type: 'drag_item', x: 480, y: 485, width: 155, height: 155, text: 'Â', fontSize: 64, fontWeight: '900', textColor: '#ffffff', bgColor: '#8b5cf6', borderRadius: 28, isDraggable: true, itemCategory: 'Â', shadow: true },
          { id: cA2, type: 'drag_item', x: 660, y: 485, width: 155, height: 155, text: 'A', fontSize: 64, fontWeight: '900', textColor: '#ffffff', bgColor: '#f59e0b', borderRadius: 28, isDraggable: true, itemCategory: 'A', shadow: true },
          { id: cAw2, type: 'drag_item', x: 840, y: 485, width: 155, height: 155, text: 'Ă', fontSize: 64, fontWeight: '900', textColor: '#ffffff', bgColor: '#10b981', borderRadius: 28, isDraggable: true, itemCategory: 'Ă', shadow: true },
          { id: cAa2, type: 'drag_item', x: 1020, y: 485, width: 155, height: 155, text: 'Â', fontSize: 64, fontWeight: '900', textColor: '#ffffff', bgColor: '#8b5cf6', borderRadius: 28, isDraggable: true, itemCategory: 'Â', shadow: true },
        ],
        rules: [
          { id: 'r1', sourceId: cA1, targetId: targetA, isCorrect: true, points: 5 },
          { id: 'r2', sourceId: cAw1, targetId: targetAw, isCorrect: true, points: 5 },
          { id: 'r3', sourceId: cAa1, targetId: targetAa, isCorrect: true, points: 5 },
          { id: 'r4', sourceId: cA2, targetId: targetA, isCorrect: true, points: 5 },
          { id: 'r5', sourceId: cAw2, targetId: targetAw, isCorrect: true, points: 5 },
          { id: 'r6', sourceId: cAa2, targetId: targetAa, isCorrect: true, points: 5 },
        ],
      };

      return {
        id: 'q_a_aw_aa_' + Date.now(),
        title: 'Phân loại chữ A – Ă – Â vào 3 ô tương ứng',
        type: 'drag_drop',
        timeLimit: 0,
        noTimeLimit: true,
        points: 30,
        explanation: 'Hoan hô bé đã phân loại chuẩn xác các chữ A, Ă, Â!',
        options: [],
        canvasConfig,
      };
    },
  },

  // 3. Template: KÉO THẺ TỪ NGỮ VÀO CHỮ U - Ư (Giữ index 2 để tương thích)
  {
    id: 'tpl_word_card_drag',
    title: 'KÉO THẺ TỪ VÀO CHỮ U – Ư',
    subtitle: '2 vùng đích + 4 thẻ từ ngữ',
    category: 'Từ ngữ',
    icon: '📖',
    thumbnailBadge: 'Thẻ từ vựng',
    description: 'Thẻ từ ngữ phong phú (Quả đu đủ, Hoa sen, Củ từ, Sư tử) giúp trẻ nhận diện chữ cái trong từ.',
    createQuestion: (): Question => {
      const targetU = 'zone_u_' + Math.random().toString(36).substring(2, 7);
      const targetUw = 'zone_uw_' + Math.random().toString(36).substring(2, 7);

      const word1 = 'w1_' + Math.random().toString(36).substring(2, 7);
      const word2 = 'w2_' + Math.random().toString(36).substring(2, 7);
      const word3 = 'w3_' + Math.random().toString(36).substring(2, 7);
      const word4 = 'w4_' + Math.random().toString(36).substring(2, 7);

      const canvasConfig: InteractiveCanvasConfig = {
        width: 1280,
        height: 720,
        bgTheme: 'pastel_emerald',
        elements: [
          {
            id: 'title_banner',
            type: 'text',
            x: 240,
            y: 35,
            width: 800,
            height: 70,
            text: 'KÉO THẺ TỪ VÀO Ô CHỮ U HOẶC CHỮ Ư PHÙ HỢP',
            fontSize: 28,
            fontWeight: '900',
            textColor: '#1e293b',
            bgColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: 3,
            borderRadius: 24,
            shadow: true,
          },
          {
            id: targetU,
            type: 'drop_zone',
            x: 200,
            y: 135,
            width: 380,
            height: 270,
            text: 'TỪ CHỨA CHỮ U',
            subText: 'Thả từ có chữ U vào đây',
            fontSize: 34,
            fontWeight: '900',
            textColor: '#0284c7',
            bgColor: '#f0f9ff',
            borderColor: '#38bdf8',
            borderWidth: 4,
            borderRadius: 32,
            isDropZone: true,
            acceptsCategory: 'U',
            shadow: true,
          },
          {
            id: targetUw,
            type: 'drop_zone',
            x: 700,
            y: 135,
            width: 380,
            height: 270,
            text: 'TỪ CHỨA CHỮ Ư',
            subText: 'Thả từ có chữ Ư vào đây',
            fontSize: 34,
            fontWeight: '900',
            textColor: '#e11d48',
            bgColor: '#fff1f2',
            borderColor: '#fb7185',
            borderWidth: 4,
            borderRadius: 32,
            isDropZone: true,
            acceptsCategory: 'Ư',
            shadow: true,
          },
          // Shelf
          {
            id: 'shelf_bg',
            type: 'shape',
            x: 100,
            y: 445,
            width: 1080,
            height: 235,
            bgColor: '#ffffff',
            borderColor: '#cbd5e1',
            borderWidth: 3,
            borderRadius: 36,
            shadow: true,
          },
          // 4 Word cards
          {
            id: word1,
            type: 'word_card',
            x: 140,
            y: 490,
            width: 220,
            height: 140,
            text: 'Quả đu đủ 🍈',
            subText: '(có chữ U)',
            fontSize: 26,
            fontWeight: '800',
            textColor: '#1e293b',
            bgColor: '#f8fafc',
            borderColor: '#94a3b8',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            itemCategory: 'U',
            shadow: true,
          },
          {
            id: word2,
            type: 'word_card',
            x: 390,
            y: 490,
            width: 220,
            height: 140,
            text: 'Củ từ 🥔',
            subText: '(có chữ Ư)',
            fontSize: 26,
            fontWeight: '800',
            textColor: '#1e293b',
            bgColor: '#f8fafc',
            borderColor: '#94a3b8',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            itemCategory: 'Ư',
            shadow: true,
          },
          {
            id: word3,
            type: 'word_card',
            x: 640,
            y: 490,
            width: 220,
            height: 140,
            text: 'Hoa sen 🪷',
            subText: '(có chữ U: hoa)',
            fontSize: 26,
            fontWeight: '800',
            textColor: '#1e293b',
            bgColor: '#f8fafc',
            borderColor: '#94a3b8',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            itemCategory: 'U',
            shadow: true,
          },
          {
            id: word4,
            type: 'word_card',
            x: 890,
            y: 490,
            width: 220,
            height: 140,
            text: 'Sư tử 🦁',
            subText: '(có chữ Ư)',
            fontSize: 26,
            fontWeight: '800',
            textColor: '#1e293b',
            bgColor: '#f8fafc',
            borderColor: '#94a3b8',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            itemCategory: 'Ư',
            shadow: true,
          },
        ],
        rules: [
          { id: 'r1', sourceId: word1, targetId: targetU, isCorrect: true, points: 5 },
          { id: 'r2', sourceId: word2, targetId: targetUw, isCorrect: true, points: 5 },
          { id: 'r3', sourceId: word3, targetId: targetU, isCorrect: true, points: 5 },
          { id: 'r4', sourceId: word4, targetId: targetUw, isCorrect: true, points: 5 },
        ],
      };

      return {
        id: 'q_word_u_uw_' + Date.now(),
        title: 'Phân loại từ ngữ chứa chữ U hoặc chữ Ư',
        type: 'drag_drop',
        timeLimit: 0,
        noTimeLimit: true,
        points: 20,
        explanation: 'Bé nhớ rất chuẩn các từ có chữ U và chữ Ư!',
        options: [],
        canvasConfig,
      };
    },
  },

  // 4. Template: KÉO THẺ NGHỀ NGHIỆP VÀO CHỮ U - Ư (Bộ câu hỏi kéo thả nghề nghiệp nổi tiếng)
  {
    id: 'tpl_u_uw_nghe_nghiep_drag',
    title: 'KÉO THẺ NGHỀ NGHIỆP VÀO CHỮ U – Ư',
    subtitle: '2 ô chữ U, Ư + 6 thẻ nghề nghiệp',
    category: 'Chữ cái & Nghề nghiệp',
    icon: '🎖️',
    thumbnailBadge: 'Nghề nghiệp U - Ư',
    description: 'Bé kéo các thẻ nghề nghiệp (Chú bộ đội, Kỹ sư, Bác sĩ thú y, Cảnh sát, Thợ may, Luật sư) thả vào đúng ô chứa chữ U hoặc chữ Ư.',
    createQuestion: (): Question => {
      const targetUId = 'zone_u_' + Math.random().toString(36).substring(2, 7);
      const targetUwId = 'zone_uw_' + Math.random().toString(36).substring(2, 7);

      const jobBoDoi = 'job_bodoi_' + Math.random().toString(36).substring(2, 7);
      const jobKySu = 'job_kysu_' + Math.random().toString(36).substring(2, 7);
      const jobBacSi = 'job_bacsi_' + Math.random().toString(36).substring(2, 7);
      const jobCanhSat = 'job_canhsat_' + Math.random().toString(36).substring(2, 7);
      const jobThoMay = 'job_thomay_' + Math.random().toString(36).substring(2, 7);
      const jobLuatSu = 'job_luatsu_' + Math.random().toString(36).substring(2, 7);

      const canvasConfig: InteractiveCanvasConfig = {
        width: 1280,
        height: 720,
        bgTheme: 'pastel_sky',
        elements: [
          {
            id: 'title_banner',
            type: 'text',
            x: 200,
            y: 35,
            width: 880,
            height: 70,
            text: 'BÉ KÉO THẺ NGHỀ NGHIỆP VÀO Ô CHỮ U HOẶC CHỮ Ư NHÉ!',
            fontSize: 27,
            fontWeight: '900',
            textColor: '#0f172a',
            bgColor: '#ffffff',
            borderColor: '#bae6fd',
            borderWidth: 3,
            borderRadius: 24,
            shadow: true,
          },
          // 2 Drop zones: Chữ U & Chữ Ư
          {
            id: targetUId,
            type: 'drop_zone',
            x: 180,
            y: 130,
            width: 420,
            height: 280,
            text: 'Ô CHỮ U',
            subText: 'Thả nghề nghiệp có chữ U',
            fontSize: 44,
            fontWeight: '900',
            textColor: '#0284c7',
            bgColor: '#f0f9ff',
            borderColor: '#38bdf8',
            borderWidth: 4,
            borderRadius: 32,
            isDropZone: true,
            acceptsCategory: 'U',
            shadow: true,
          },
          {
            id: targetUwId,
            type: 'drop_zone',
            x: 680,
            y: 130,
            width: 420,
            height: 280,
            text: 'Ô CHỮ Ư',
            subText: 'Thả nghề nghiệp có chữ Ư',
            fontSize: 44,
            fontWeight: '900',
            textColor: '#e11d48',
            bgColor: '#fff1f2',
            borderColor: '#fb7185',
            borderWidth: 4,
            borderRadius: 32,
            isDropZone: true,
            acceptsCategory: 'Ư',
            shadow: true,
          },
          // Bottom Shelf
          {
            id: 'shelf_bg',
            type: 'shape',
            x: 80,
            y: 445,
            width: 1120,
            height: 235,
            bgColor: '#ffffff',
            borderColor: '#cbd5e1',
            borderWidth: 3,
            borderRadius: 36,
            shadow: true,
          },
          // 6 Job cards
          {
            id: jobBoDoi,
            type: 'word_card',
            x: 110,
            y: 485,
            width: 165,
            height: 155,
            text: 'Chú bộ đội 🎖️',
            subText: '(chứa chữ U)',
            fontSize: 20,
            fontWeight: '800',
            textColor: '#0f172a',
            bgColor: '#eff6ff',
            borderColor: '#3b82f6',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            itemCategory: 'U',
            shadow: true,
          },
          {
            id: jobKySu,
            type: 'word_card',
            x: 295,
            y: 485,
            width: 165,
            height: 155,
            text: 'Kỹ sư 📐',
            subText: '(chứa chữ Ư)',
            fontSize: 21,
            fontWeight: '800',
            textColor: '#0f172a',
            bgColor: '#fff1f2',
            borderColor: '#f43f5e',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            itemCategory: 'Ư',
            shadow: true,
          },
          {
            id: jobBacSi,
            type: 'word_card',
            x: 480,
            y: 485,
            width: 165,
            height: 155,
            text: 'Bác sĩ thú y 🩺',
            subText: '(thú y có chữ U)',
            fontSize: 20,
            fontWeight: '800',
            textColor: '#0f172a',
            bgColor: '#eff6ff',
            borderColor: '#3b82f6',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            itemCategory: 'U',
            shadow: true,
          },
          {
            id: jobCanhSat,
            type: 'word_card',
            x: 665,
            y: 485,
            width: 165,
            height: 155,
            text: 'Cảnh sát 👮',
            subText: '(cứu hỏa có chữ U)',
            fontSize: 20,
            fontWeight: '800',
            textColor: '#0f172a',
            bgColor: '#eff6ff',
            borderColor: '#3b82f6',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            itemCategory: 'U',
            shadow: true,
          },
          {
            id: jobThoMay,
            type: 'word_card',
            x: 850,
            y: 485,
            width: 165,
            height: 155,
            text: 'Thợ may ✂️',
            subText: '(cắt may thêu)',
            fontSize: 20,
            fontWeight: '800',
            textColor: '#0f172a',
            bgColor: '#fdf4ff',
            borderColor: '#d946ef',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            itemCategory: 'U',
            shadow: true,
          },
          {
            id: jobLuatSu,
            type: 'word_card',
            x: 1035,
            y: 485,
            width: 165,
            height: 155,
            text: 'Luật sư ⚖️',
            subText: '(chứa cả U và Ư)',
            fontSize: 20,
            fontWeight: '800',
            textColor: '#0f172a',
            bgColor: '#fdf2f8',
            borderColor: '#ec4899',
            borderWidth: 3,
            borderRadius: 24,
            isDraggable: true,
            itemCategory: 'Ư',
            shadow: true,
          },
        ],
        rules: [
          { id: 'r1', sourceId: jobBoDoi, targetId: targetUId, isCorrect: true, points: 5 },
          { id: 'r2', sourceId: jobKySu, targetId: targetUwId, isCorrect: true, points: 5 },
          { id: 'r3', sourceId: jobBacSi, targetId: targetUId, isCorrect: true, points: 5 },
          { id: 'r4', sourceId: jobCanhSat, targetId: targetUId, isCorrect: true, points: 5 },
          { id: 'r5', sourceId: jobThoMay, targetId: targetUId, isCorrect: true, points: 5 },
          { id: 'r6', sourceId: jobLuatSu, targetId: targetUwId, isCorrect: true, points: 5 },
        ],
      };

      return {
        id: 'q_job_u_uw_' + Date.now(),
        title: 'Kéo thẻ nghề nghiệp chứa chữ U hoặc chữ Ư vào đúng ô',
        type: 'drag_drop',
        timeLimit: 0,
        noTimeLimit: true,
        points: 30,
        explanation: 'Hoan hô bé đã phân loại chuẩn xác các nghề nghiệp chứa chữ U và chữ Ư!',
        options: [],
        canvasConfig,
      };
    },
  },

  // 5. Template: TOÁN MẦM NON: ĐẾM VÀ KÉO SỐ 1 ĐẾN 5
  {
    id: 'tpl_count_math_1_5',
    title: 'TOÁN: ĐẾM & KÉO SỐ 1 ĐẾN 5',
    subtitle: '5 ô số lượng hình + 5 thẻ số',
    category: 'Làm quen với toán',
    icon: '🔢',
    thumbnailBadge: 'Đếm số 1 - 5',
    description: 'Bé đếm số lượng hình vẽ (1 hoa, 2 táo, 3 sao, 4 cá, 5 bướm) rồi kéo thẻ số tương ứng vào đúng ô.',
    createQuestion: (): Question => {
      const z1 = 'zone_num1_' + Math.random().toString(36).substring(2, 7);
      const z2 = 'zone_num2_' + Math.random().toString(36).substring(2, 7);
      const z3 = 'zone_num3_' + Math.random().toString(36).substring(2, 7);
      const z4 = 'zone_num4_' + Math.random().toString(36).substring(2, 7);
      const z5 = 'zone_num5_' + Math.random().toString(36).substring(2, 7);

      const n1 = 'num_1_' + Math.random().toString(36).substring(2, 7);
      const n2 = 'num_2_' + Math.random().toString(36).substring(2, 7);
      const n3 = 'num_3_' + Math.random().toString(36).substring(2, 7);
      const n4 = 'num_4_' + Math.random().toString(36).substring(2, 7);
      const n5 = 'num_5_' + Math.random().toString(36).substring(2, 7);

      const canvasConfig: InteractiveCanvasConfig = {
        width: 1280,
        height: 720,
        bgTheme: 'pastel_purple',
        elements: [
          {
            id: 'title_banner',
            type: 'text',
            x: 240,
            y: 35,
            width: 800,
            height: 70,
            text: 'BÉ HÃY ĐẾM VÀ KÉO THẺ SỐ VÀO ĐÚNG Ô NHÉ!',
            fontSize: 29,
            fontWeight: '900',
            textColor: '#1e293b',
            bgColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: 3,
            borderRadius: 24,
            shadow: true,
          },
          // 5 Drop Zones (top row)
          { id: z1, type: 'drop_zone', x: 70, y: 130, width: 210, height: 270, text: '🌸', subText: '1 bông hoa', fontSize: 38, fontWeight: '900', textColor: '#ec4899', bgColor: '#fdf2f8', borderColor: '#f472b6', borderWidth: 4, borderRadius: 28, isDropZone: true, acceptsCategory: '1', shadow: true },
          { id: z2, type: 'drop_zone', x: 305, y: 130, width: 210, height: 270, text: '🍎🍎', subText: '2 quả táo', fontSize: 32, fontWeight: '900', textColor: '#ef4444', bgColor: '#fef2f2', borderColor: '#f87171', borderWidth: 4, borderRadius: 28, isDropZone: true, acceptsCategory: '2', shadow: true },
          { id: z3, type: 'drop_zone', x: 540, y: 130, width: 210, height: 270, text: '⭐⭐⭐', subText: '3 ngôi sao', fontSize: 28, fontWeight: '900', textColor: '#f59e0b', bgColor: '#fffbeb', borderColor: '#fbbf24', borderWidth: 4, borderRadius: 28, isDropZone: true, acceptsCategory: '3', shadow: true },
          { id: z4, type: 'drop_zone', x: 775, y: 130, width: 210, height: 270, text: '🐟🐟🐟🐟', subText: '4 con cá', fontSize: 24, fontWeight: '900', textColor: '#0284c7', bgColor: '#f0f9ff', borderColor: '#38bdf8', borderWidth: 4, borderRadius: 28, isDropZone: true, acceptsCategory: '4', shadow: true },
          { id: z5, type: 'drop_zone', x: 1010, y: 130, width: 210, height: 270, text: '🦋🦋🦋🦋🦋', subText: '5 chú bướm', fontSize: 21, fontWeight: '900', textColor: '#8b5cf6', bgColor: '#f5f3ff', borderColor: '#a78bfa', borderWidth: 4, borderRadius: 28, isDropZone: true, acceptsCategory: '5', shadow: true },
          // Bottom Shelf
          {
            id: 'shelf_bg',
            type: 'shape',
            x: 80,
            y: 445,
            width: 1120,
            height: 235,
            bgColor: '#ffffff',
            borderColor: '#cbd5e1',
            borderWidth: 3,
            borderRadius: 36,
            shadow: true,
          },
          // 5 Number Draggables
          { id: n3, type: 'drag_item', x: 130, y: 485, width: 170, height: 155, text: 'Số 3', fontSize: 48, fontWeight: '900', textColor: '#ffffff', bgColor: '#f59e0b', borderRadius: 28, isDraggable: true, itemCategory: '3', shadow: true },
          { id: n1, type: 'drag_item', x: 340, y: 485, width: 170, height: 155, text: 'Số 1', fontSize: 48, fontWeight: '900', textColor: '#ffffff', bgColor: '#ec4899', borderRadius: 28, isDraggable: true, itemCategory: '1', shadow: true },
          { id: n5, type: 'drag_item', x: 550, y: 485, width: 170, height: 155, text: 'Số 5', fontSize: 48, fontWeight: '900', textColor: '#ffffff', bgColor: '#8b5cf6', borderRadius: 28, isDraggable: true, itemCategory: '5', shadow: true },
          { id: n2, type: 'drag_item', x: 760, y: 485, width: 170, height: 155, text: 'Số 2', fontSize: 48, fontWeight: '900', textColor: '#ffffff', bgColor: '#ef4444', borderRadius: 28, isDraggable: true, itemCategory: '2', shadow: true },
          { id: n4, type: 'drag_item', x: 970, y: 485, width: 170, height: 155, text: 'Số 4', fontSize: 48, fontWeight: '900', textColor: '#ffffff', bgColor: '#0284c7', borderRadius: 28, isDraggable: true, itemCategory: '4', shadow: true },
        ],
        rules: [
          { id: 'r1', sourceId: n1, targetId: z1, isCorrect: true, points: 6 },
          { id: 'r2', sourceId: n2, targetId: z2, isCorrect: true, points: 6 },
          { id: 'r3', sourceId: n3, targetId: z3, isCorrect: true, points: 6 },
          { id: 'r4', sourceId: n4, targetId: z4, isCorrect: true, points: 6 },
          { id: 'r5', sourceId: n5, targetId: z5, isCorrect: true, points: 6 },
        ],
      };

      return {
        id: 'q_count_1_5_' + Date.now(),
        title: 'Đếm số lượng đồ vật và kéo chữ số tương ứng vào đúng ô',
        type: 'drag_drop',
        timeLimit: 0,
        noTimeLimit: true,
        points: 30,
        explanation: 'Bé đếm rất giỏi và nhận biết chữ số từ 1 đến 5 rất chuẩn xác!',
        options: [],
        canvasConfig,
      };
    },
  },

  // 6. Template: PHÂN LOẠI ĐỘNG VẬT DƯỚI NƯỚC & TRÊN CẠN
  {
    id: 'tpl_animals_habitat',
    title: 'PHÂN LOẠI ĐỘNG VẬT DƯỚI NƯỚC & TRÊN CẠN',
    subtitle: '2 vùng sống + 6 thẻ con vật',
    category: 'Khám phá khoa học',
    icon: '🐬',
    thumbnailBadge: 'Động vật',
    description: 'Bé phân biệt môi trường sống của các loài động vật: Dưới nước 🌊 và Trên cạn 🌳.',
    createQuestion: (): Question => {
      const targetWater = 'zone_water_' + Math.random().toString(36).substring(2, 7);
      const targetLand = 'zone_land_' + Math.random().toString(36).substring(2, 7);

      const aCa = 'ani_ca_' + Math.random().toString(36).substring(2, 7);
      const aTom = 'ani_tom_' + Math.random().toString(36).substring(2, 7);
      const aCua = 'ani_cua_' + Math.random().toString(36).substring(2, 7);
      const aCho = 'ani_cho_' + Math.random().toString(36).substring(2, 7);
      const aMeo = 'ani_meo_' + Math.random().toString(36).substring(2, 7);
      const aVoi = 'ani_voi_' + Math.random().toString(36).substring(2, 7);

      const canvasConfig: InteractiveCanvasConfig = {
        width: 1280,
        height: 720,
        bgTheme: 'pastel_sky',
        elements: [
          {
            id: 'title_banner',
            type: 'text',
            x: 200,
            y: 35,
            width: 880,
            height: 70,
            text: 'BÉ PHÂN LOẠI ĐỘNG VẬT DƯỚI NƯỚC VÀ TRÊN CẠN NHÉ!',
            fontSize: 28,
            fontWeight: '900',
            textColor: '#0f172a',
            bgColor: '#ffffff',
            borderColor: '#bae6fd',
            borderWidth: 3,
            borderRadius: 24,
            shadow: true,
          },
          // 2 Drop zones
          {
            id: targetWater,
            type: 'drop_zone',
            x: 180,
            y: 130,
            width: 420,
            height: 280,
            text: 'DƯỚI NƯỚC 🌊',
            subText: 'Thả con vật sống dưới nước',
            fontSize: 38,
            fontWeight: '900',
            textColor: '#0284c7',
            bgColor: '#f0f9ff',
            borderColor: '#38bdf8',
            borderWidth: 4,
            borderRadius: 32,
            isDropZone: true,
            acceptsCategory: 'WATER',
            shadow: true,
          },
          {
            id: targetLand,
            type: 'drop_zone',
            x: 680,
            y: 130,
            width: 420,
            height: 280,
            text: 'TRÊN CẠN 🌳',
            subText: 'Thả con vật sống trên cạn',
            fontSize: 38,
            fontWeight: '900',
            textColor: '#15803d',
            bgColor: '#f0fdf4',
            borderColor: '#4ade80',
            borderWidth: 4,
            borderRadius: 32,
            isDropZone: true,
            acceptsCategory: 'LAND',
            shadow: true,
          },
          // Shelf
          {
            id: 'shelf_bg',
            type: 'shape',
            x: 80,
            y: 445,
            width: 1120,
            height: 235,
            bgColor: '#ffffff',
            borderColor: '#cbd5e1',
            borderWidth: 3,
            borderRadius: 36,
            shadow: true,
          },
          // 6 Animal Cards
          { id: aCa, type: 'word_card', x: 110, y: 485, width: 165, height: 155, text: 'Con cá 🐟', subText: '(sống dưới nước)', fontSize: 22, fontWeight: '800', textColor: '#0f172a', bgColor: '#e0f2fe', borderColor: '#38bdf8', borderWidth: 3, borderRadius: 24, isDraggable: true, itemCategory: 'WATER', shadow: true },
          { id: aCho, type: 'word_card', x: 295, y: 485, width: 165, height: 155, text: 'Chú cún 🐶', subText: '(sống trên cạn)', fontSize: 22, fontWeight: '800', textColor: '#0f172a', bgColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 3, borderRadius: 24, isDraggable: true, itemCategory: 'LAND', shadow: true },
          { id: aTom, type: 'word_card', x: 480, y: 485, width: 165, height: 155, text: 'Con tôm 🦐', subText: '(sống dưới nước)', fontSize: 22, fontWeight: '800', textColor: '#0f172a', bgColor: '#e0f2fe', borderColor: '#38bdf8', borderWidth: 3, borderRadius: 24, isDraggable: true, itemCategory: 'WATER', shadow: true },
          { id: aMeo, type: 'word_card', x: 665, y: 485, width: 165, height: 155, text: 'Mèo con 🐱', subText: '(sống trên cạn)', fontSize: 22, fontWeight: '800', textColor: '#0f172a', bgColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 3, borderRadius: 24, isDraggable: true, itemCategory: 'LAND', shadow: true },
          { id: aCua, type: 'word_card', x: 850, y: 485, width: 165, height: 155, text: 'Con cua 🦀', subText: '(sống dưới nước)', fontSize: 22, fontWeight: '800', textColor: '#0f172a', bgColor: '#e0f2fe', borderColor: '#38bdf8', borderWidth: 3, borderRadius: 24, isDraggable: true, itemCategory: 'WATER', shadow: true },
          { id: aVoi, type: 'word_card', x: 1035, y: 485, width: 165, height: 155, text: 'Chú voi 🐘', subText: '(sống trên cạn)', fontSize: 22, fontWeight: '800', textColor: '#0f172a', bgColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 3, borderRadius: 24, isDraggable: true, itemCategory: 'LAND', shadow: true },
        ],
        rules: [
          { id: 'r1', sourceId: aCa, targetId: targetWater, isCorrect: true, points: 5 },
          { id: 'r2', sourceId: aTom, targetId: targetWater, isCorrect: true, points: 5 },
          { id: 'r3', sourceId: aCua, targetId: targetWater, isCorrect: true, points: 5 },
          { id: 'r4', sourceId: aCho, targetId: targetLand, isCorrect: true, points: 5 },
          { id: 'r5', sourceId: aMeo, targetId: targetLand, isCorrect: true, points: 5 },
          { id: 'r6', sourceId: aVoi, targetId: targetLand, isCorrect: true, points: 5 },
        ],
      };

      return {
        id: 'q_animals_habitat_' + Date.now(),
        title: 'Bé hãy phân loại con vật sống dưới nước và trên cạn',
        type: 'drag_drop',
        timeLimit: 0,
        noTimeLimit: true,
        points: 30,
        explanation: 'Hoan hô bé đã hiểu rất rõ môi trường sống của các loài động vật!',
        options: [],
        canvasConfig,
      };
    },
  },

  // 7. Template: PHÂN LOẠI MÀU SẮC (ĐỎ - VÀNG - XANH LÁ)
  {
    id: 'tpl_color_sorting',
    title: 'PHÂN LOẠI MÀU SẮC (ĐỎ – VÀNG – XANH LÁ)',
    subtitle: '3 hộp màu + 6 thẻ đồ vật/hoa quả',
    category: 'Màu sắc & Tạo hình',
    icon: '🎨',
    thumbnailBadge: 'Màu sắc',
    description: 'Bé nhận biết và kéo các loại hoa quả, đồ vật vào đúng hộp màu Đỏ, Vàng, Xanh lá.',
    createQuestion: (): Question => {
      const zRed = 'zone_red_' + Math.random().toString(36).substring(2, 7);
      const zYellow = 'zone_yellow_' + Math.random().toString(36).substring(2, 7);
      const zGreen = 'zone_green_' + Math.random().toString(36).substring(2, 7);

      const cDau = 'c_dau_' + Math.random().toString(36).substring(2, 7);
      const cChuoi = 'c_chuoi_' + Math.random().toString(36).substring(2, 7);
      const cTaoXanh = 'c_taoxanh_' + Math.random().toString(36).substring(2, 7);
      const cCuuHoa = 'c_cuuhoa_' + Math.random().toString(36).substring(2, 7);
      const cHuongDuong = 'c_huongduong_' + Math.random().toString(36).substring(2, 7);
      const cLaCay = 'c_lacay_' + Math.random().toString(36).substring(2, 7);

      const canvasConfig: InteractiveCanvasConfig = {
        width: 1280,
        height: 720,
        bgTheme: 'pastel_amber',
        elements: [
          {
            id: 'title_banner',
            type: 'text',
            x: 240,
            y: 35,
            width: 800,
            height: 70,
            text: 'BÉ PHÂN LOẠI ĐỒ VẬT VÀO HỘP MÀU ĐÚNG NHÉ!',
            fontSize: 29,
            fontWeight: '900',
            textColor: '#1e293b',
            bgColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: 3,
            borderRadius: 24,
            shadow: true,
          },
          // 3 Drop zones
          { id: zRed, type: 'drop_zone', x: 80, y: 130, width: 340, height: 270, text: 'HỘP ĐỎ 🔴', subText: 'Thả đồ vật màu đỏ vào đây', fontSize: 38, fontWeight: '900', textColor: '#dc2626', bgColor: '#fef2f2', borderColor: '#ef4444', borderWidth: 4, borderRadius: 32, isDropZone: true, acceptsCategory: 'RED', shadow: true },
          { id: zYellow, type: 'drop_zone', x: 470, y: 130, width: 340, height: 270, text: 'HỘP VÀNG 🟡', subText: 'Thả đồ vật màu vàng vào đây', fontSize: 38, fontWeight: '900', textColor: '#ca8a04', bgColor: '#fefce8', borderColor: '#eab308', borderWidth: 4, borderRadius: 32, isDropZone: true, acceptsCategory: 'YELLOW', shadow: true },
          { id: zGreen, type: 'drop_zone', x: 860, y: 130, width: 340, height: 270, text: 'HỘP XANH 🟢', subText: 'Thả đồ vật màu xanh vào đây', fontSize: 38, fontWeight: '900', textColor: '#16a34a', bgColor: '#f0fdf4', borderColor: '#22c55e', borderWidth: 4, borderRadius: 32, isDropZone: true, acceptsCategory: 'GREEN', shadow: true },
          // Bottom Shelf
          {
            id: 'shelf_bg',
            type: 'shape',
            x: 80,
            y: 445,
            width: 1120,
            height: 235,
            bgColor: '#ffffff',
            borderColor: '#cbd5e1',
            borderWidth: 3,
            borderRadius: 36,
            shadow: true,
          },
          // 6 Color items
          { id: cDau, type: 'word_card', x: 120, y: 485, width: 155, height: 155, text: 'Dâu tây 🍓', subText: '(Màu đỏ)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'RED', shadow: true },
          { id: cChuoi, type: 'word_card', x: 300, y: 485, width: 155, height: 155, text: 'Quả chuối 🍌', subText: '(Màu vàng)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#fef9c3', borderColor: '#eab308', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'YELLOW', shadow: true },
          { id: cTaoXanh, type: 'word_card', x: 480, y: 485, width: 155, height: 155, text: 'Táo xanh 🍏', subText: '(Màu xanh lá)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#dcfce7', borderColor: '#22c55e', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'GREEN', shadow: true },
          { id: cCuuHoa, type: 'word_card', x: 660, y: 485, width: 155, height: 155, text: 'Xe cứu hỏa 🚒', subText: '(Màu đỏ)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'RED', shadow: true },
          { id: cHuongDuong, type: 'word_card', x: 840, y: 485, width: 155, height: 155, text: 'Hoa cúc 🌻', subText: '(Màu vàng)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#fef9c3', borderColor: '#eab308', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'YELLOW', shadow: true },
          { id: cLaCay, type: 'word_card', x: 1020, y: 485, width: 155, height: 155, text: 'Chiếc lá 🍃', subText: '(Màu xanh lá)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#dcfce7', borderColor: '#22c55e', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'GREEN', shadow: true },
        ],
        rules: [
          { id: 'r1', sourceId: cDau, targetId: zRed, isCorrect: true, points: 5 },
          { id: 'r2', sourceId: cCuuHoa, targetId: zRed, isCorrect: true, points: 5 },
          { id: 'r3', sourceId: cChuoi, targetId: zYellow, isCorrect: true, points: 5 },
          { id: 'r4', sourceId: cHuongDuong, targetId: zYellow, isCorrect: true, points: 5 },
          { id: 'r5', sourceId: cTaoXanh, targetId: zGreen, isCorrect: true, points: 5 },
          { id: 'r6', sourceId: cLaCay, targetId: zGreen, isCorrect: true, points: 5 },
        ],
      };

      return {
        id: 'q_color_sorting_' + Date.now(),
        title: 'Phân loại các loại quả và đồ vật vào đúng hộp màu đỏ, vàng, xanh',
        type: 'drag_drop',
        timeLimit: 0,
        noTimeLimit: true,
        points: 30,
        explanation: 'Bé nhận biết màu sắc rất chuẩn xác!',
        options: [],
        canvasConfig,
      };
    },
  },

  // 8. Template: NHẬN BIẾT HÌNH HỌC (TRÒN - VUÔNG - TAM GIÁC)
  {
    id: 'tpl_shapes_sorting',
    title: 'NHẬN BIẾT HÌNH KHỐI (TRÒN – VUÔNG – TAM GIÁC)',
    subtitle: '3 ô hình học + 6 thẻ đồ vật quen thuộc',
    category: 'Làm quen hình khối',
    icon: '🔺',
    thumbnailBadge: 'Hình hình học',
    description: 'Bé phân biệt hình tròn, hình vuông, hình tam giác qua các đồ vật gần gũi.',
    createQuestion: (): Question => {
      const zCircle = 'zone_circle_' + Math.random().toString(36).substring(2, 7);
      const zSquare = 'zone_square_' + Math.random().toString(36).substring(2, 7);
      const zTriangle = 'zone_triangle_' + Math.random().toString(36).substring(2, 7);

      const cBong = 's_bong_' + Math.random().toString(36).substring(2, 7);
      const cDongHo = 's_dongho_' + Math.random().toString(36).substring(2, 7);
      const cHopQua = 's_hopqua_' + Math.random().toString(36).substring(2, 7);
      const cCuaSo = 's_cuaso_' + Math.random().toString(36).substring(2, 7);
      const cPizza = 's_pizza_' + Math.random().toString(36).substring(2, 7);
      const cBienBao = 's_bienbao_' + Math.random().toString(36).substring(2, 7);

      const canvasConfig: InteractiveCanvasConfig = {
        width: 1280,
        height: 720,
        bgTheme: 'pastel_sky',
        elements: [
          {
            id: 'title_banner',
            type: 'text',
            x: 220,
            y: 35,
            width: 840,
            height: 70,
            text: 'BÉ KÉO ĐỒ VẬT VÀO ĐÚNG Ô HÌNH DẠNG TƯƠNG ỨNG NHÉ!',
            fontSize: 27,
            fontWeight: '900',
            textColor: '#1e293b',
            bgColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: 3,
            borderRadius: 24,
            shadow: true,
          },
          // 3 Drop zones
          { id: zCircle, type: 'drop_zone', x: 80, y: 130, width: 340, height: 270, text: 'HÌNH TRÒN 🔴', subText: 'Thả đồ vật tròn vào đây', fontSize: 36, fontWeight: '900', textColor: '#ea580c', bgColor: '#fff7ed', borderColor: '#f97316', borderWidth: 4, borderRadius: 32, isDropZone: true, acceptsCategory: 'CIRCLE', shadow: true },
          { id: zSquare, type: 'drop_zone', x: 470, y: 130, width: 340, height: 270, text: 'HÌNH VUÔNG 🟦', subText: 'Thả đồ vật vuông vào đây', fontSize: 36, fontWeight: '900', textColor: '#2563eb', bgColor: '#eff6ff', borderColor: '#3b82f6', borderWidth: 4, borderRadius: 32, isDropZone: true, acceptsCategory: 'SQUARE', shadow: true },
          { id: zTriangle, type: 'drop_zone', x: 860, y: 130, width: 340, height: 270, text: 'HÌNH TAM GIÁC 🔺', subText: 'Thả đồ vật tam giác vào đây', fontSize: 34, fontWeight: '900', textColor: '#7c3aed', bgColor: '#f5f3ff', borderColor: '#8b5cf6', borderWidth: 4, borderRadius: 32, isDropZone: true, acceptsCategory: 'TRIANGLE', shadow: true },
          // Bottom Shelf
          {
            id: 'shelf_bg',
            type: 'shape',
            x: 80,
            y: 445,
            width: 1120,
            height: 235,
            bgColor: '#ffffff',
            borderColor: '#cbd5e1',
            borderWidth: 3,
            borderRadius: 36,
            shadow: true,
          },
          // 6 Shape items
          { id: cBong, type: 'word_card', x: 120, y: 485, width: 155, height: 155, text: 'Quả bóng ⚽', subText: '(Hình tròn)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#ffedd5', borderColor: '#f97316', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'CIRCLE', shadow: true },
          { id: cHopQua, type: 'word_card', x: 300, y: 485, width: 155, height: 155, text: 'Hộp quà 🎁', subText: '(Hình vuông)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#dbeafe', borderColor: '#3b82f6', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'SQUARE', shadow: true },
          { id: cPizza, type: 'word_card', x: 480, y: 485, width: 155, height: 155, text: 'Miếng pizza 🍕', subText: '(Hình tam giác)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#ede9fe', borderColor: '#8b5cf6', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'TRIANGLE', shadow: true },
          { id: cDongHo, type: 'word_card', x: 660, y: 485, width: 155, height: 155, text: 'Mặt đồng hồ ⏰', subText: '(Hình tròn)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#ffedd5', borderColor: '#f97316', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'CIRCLE', shadow: true },
          { id: cCuaSo, type: 'word_card', x: 840, y: 485, width: 155, height: 155, text: 'Khung cửa sổ 🪟', subText: '(Hình vuông)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#dbeafe', borderColor: '#3b82f6', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'SQUARE', shadow: true },
          { id: cBienBao, type: 'word_card', x: 1020, y: 485, width: 155, height: 155, text: 'Biển báo ⚠️', subText: '(Hình tam giác)', fontSize: 20, fontWeight: '800', textColor: '#0f172a', bgColor: '#ede9fe', borderColor: '#8b5cf6', borderWidth: 3, borderRadius: 28, isDraggable: true, itemCategory: 'TRIANGLE', shadow: true },
        ],
        rules: [
          { id: 'r1', sourceId: cBong, targetId: zCircle, isCorrect: true, points: 5 },
          { id: 'r2', sourceId: cDongHo, targetId: zCircle, isCorrect: true, points: 5 },
          { id: 'r3', sourceId: cHopQua, targetId: zSquare, isCorrect: true, points: 5 },
          { id: 'r4', sourceId: cCuaSo, targetId: zSquare, isCorrect: true, points: 5 },
          { id: 'r5', sourceId: cPizza, targetId: zTriangle, isCorrect: true, points: 5 },
          { id: 'r6', sourceId: cBienBao, targetId: zTriangle, isCorrect: true, points: 5 },
        ],
      };

      return {
        id: 'q_shapes_sorting_' + Date.now(),
        title: 'Phân loại đồ vật vào đúng ô hình tròn, hình vuông, hình tam giác',
        type: 'drag_drop',
        timeLimit: 0,
        noTimeLimit: true,
        points: 30,
        explanation: 'Bé nhận biết các hình khối rất thông minh!',
        options: [],
        canvasConfig,
      };
    },
  },

  // 9. Template: CHỌN HÌNH ĐÚNG (Trắc nghiệm chạm chọn)
  {
    id: 'tpl_image_choice',
    title: 'CHỌN HÌNH ĐÚNG',
    subtitle: '4 hình ảnh to rõ cho bé chạm chọn',
    category: 'Hình ảnh',
    icon: '🖼',
    thumbnailBadge: 'Chọn hình',
    description: 'Trẻ quan sát câu hỏi và chạm vào một hoặc nhiều hình ảnh chính xác.',
    createQuestion: (): Question => ({
      id: 'q_img_' + Date.now(),
      title: 'Đâu là con vật có tên chứa chữ "Ư"?',
      type: 'image_choice',
      timeLimit: 0,
      noTimeLimit: true,
      points: 10,
      explanation: 'Sư tử dũng mãnh có chữ Ư trong tiếng "Sư" đấy!',
      options: [
        { id: 'opt_1', text: 'Sư tử 🦁', isCorrect: true },
        { id: 'opt_2', text: 'Con voi 🐘', isCorrect: false },
        { id: 'opt_3', text: 'Con thỏ 🐰', isCorrect: false },
        { id: 'opt_4', text: 'Con gà 🐔', isCorrect: false },
      ],
    }),
  },
];
