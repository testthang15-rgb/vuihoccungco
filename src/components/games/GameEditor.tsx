import React, { useState } from 'react';
import { Save, Plus, Trash2, ArrowUp, ArrowDown, HelpCircle, Check, BookOpen, Clock, Users, ArrowLeft } from 'lucide-react';
import { Game, Question, QuestionOption, QuestionType } from '../../types/game';
import { saveGame } from '../../services/gameStorage';
import { sounds } from '../../utils/sound';

interface GameEditorProps {
  initialGame?: Game | null;
  onSaveComplete: (savedGame: Game) => void;
  onCancel: () => void;
}

export const GameEditor: React.FC<GameEditorProps> = ({
  initialGame,
  onSaveComplete,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialGame?.title || 'BỘ CÂU HỎI MỚI');
  const [description, setDescription] = useState(initialGame?.description || 'Mô tả trò chơi tương tác cho trẻ mầm non');
  const [category, setCategory] = useState(initialGame?.category || 'Chữ cái');
  const [timePerQuestion] = useState<number>(0);
  const [maxTeams, setMaxTeams] = useState<number>(initialGame?.settings?.maxTeams || 8);
  const [speedBonus, setSpeedBonus] = useState<boolean>(initialGame?.settings?.speedBonus ?? false);

  const [questions, setQuestions] = useState<Question[]>(() => {
    if (initialGame && initialGame.questions.length > 0) {
      return JSON.parse(JSON.stringify(initialGame.questions));
    }
    // Default initial question
    return [
      {
        id: 'q_' + Math.random().toString(36).substring(2, 9),
        title: 'Bé hãy chọn đáp án đúng nhất nhé!',
        type: 'multiple_choice',
        timeLimit: 0,
        noTimeLimit: true,
        points: 10,
        explanation: 'Lời khen và lời giải thích ngắn gọn cho bé.',
        options: [
          { id: 'opt_1', text: 'Đáp án A', isCorrect: true },
          { id: 'opt_2', text: 'Đáp án B', isCorrect: false },
          { id: 'opt_3', text: 'Đáp án C', isCorrect: false },
          { id: 'opt_4', text: 'Đáp án D', isCorrect: false },
        ],
      },
    ];
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddQuestion = () => {
    sounds.playClick();
    const newQ: Question = {
      id: 'q_' + Math.random().toString(36).substring(2, 9),
      title: 'Câu hỏi mới cho bé...',
      type: 'multiple_choice',
      timeLimit: 0,
      noTimeLimit: true,
      points: 10,
      explanation: '',
      options: [
        { id: 'opt_1', text: 'Đáp án 1', isCorrect: true },
        { id: 'opt_2', text: 'Đáp án 2', isCorrect: false },
        { id: 'opt_3', text: 'Đáp án 3', isCorrect: false },
        { id: 'opt_4', text: 'Đáp án 4', isCorrect: false },
      ],
    };
    setQuestions([...questions, newQ]);
  };

  const handleDeleteQuestion = (qIndex: number) => {
    if (questions.length <= 1) return;
    sounds.playClick();
    setQuestions(questions.filter((_, idx) => idx !== qIndex));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    sounds.playClick();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const cloned = [...questions];
    const temp = cloned[index];
    cloned[index] = cloned[targetIndex];
    cloned[targetIndex] = temp;
    setQuestions(cloned);
  };

  const handleUpdateQuestionTitle = (qIndex: number, newTitle: string) => {
    const cloned = [...questions];
    cloned[qIndex].title = newTitle;
    setQuestions(cloned);
  };

  const handleUpdateExplanation = (qIndex: number, explanation: string) => {
    const cloned = [...questions];
    cloned[qIndex].explanation = explanation;
    setQuestions(cloned);
  };

  const handleUpdateOptionText = (qIndex: number, optId: string, text: string) => {
    const cloned = [...questions];
    const opt = cloned[qIndex].options.find(o => o.id === optId);
    if (opt) {
      opt.text = text;
      setQuestions(cloned);
    }
  };

  const handleSetCorrectOption = (qIndex: number, optId: string) => {
    sounds.playClick();
    const cloned = [...questions];
    cloned[qIndex].options = cloned[qIndex].options.map(o => ({
      ...o,
      isCorrect: o.id === optId,
    }));
    setQuestions(cloned);
  };

  const handleSave = () => {
    sounds.playCorrect();
    const finalGame: Game = {
      id: initialGame?.id || 'game_' + Math.random().toString(36).substring(2, 9),
      title: title.trim() || 'TRÒ CHƠI MỚI',
      description: description.trim(),
      theme: 'indigo',
      category,
      createdAt: initialGame?.createdAt || Date.now(),
      playCount: initialGame?.playCount || 0,
      settings: {
        timePerQuestion,
        maxTeams,
        speedBonus,
        soundEffects: true,
      },
      questions,
    };

    saveGame(finalGame);
    setSavedSuccess(true);
    setTimeout(() => {
      onSaveComplete(finalGame);
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top action header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <button
          onClick={() => {
            sounds.playClick();
            onCancel();
          }}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-extrabold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <button
          onClick={handleSave}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-emerald-200 transition active:scale-95 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{savedSuccess ? 'ĐÃ LƯU XONG!' : 'LƯU TRÒ CHƠI'}</span>
        </button>
      </div>

      {/* Basic Settings Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-100 shadow-xl mb-8">
        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <span>THÔNG TIN BỘ TRÒ CHƠI</span>
          <span>✏️</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              TÊN TRÒ CHƠI
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: ÔN CHỮ CÁI U - Ư"
              className="w-full p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 font-extrabold text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              MÔ TẢ NGẮN
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Trò chơi nhận biết chữ cái cho trẻ 5-6 tuổi"
              className="w-full p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 font-medium text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              CHỦ ĐỀ / DANH MỤC
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition text-sm"
            >
              <option value="Chữ cái">Chữ cái</option>
              <option value="Làm quen với toán">Làm quen với toán</option>
              <option value="Động vật">Động vật</option>
              <option value="Môi trường xung quanh">Môi trường xung quanh</option>
              <option value="Kỹ năng xã hội">Kỹ năng xã hội</option>
              <option value="Âm nhạc & Tạo hình">Âm nhạc & Tạo hình</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              THỜI GIAN LÀM BÀI
            </label>
            <div className="w-full p-3.5 bg-slate-100 rounded-2xl border-2 border-slate-200 font-bold text-slate-700 text-sm flex items-center gap-2">
              <span className="text-emerald-600 font-black">✓</span>
              <span>Không tính thời gian (Cô bấm kết thúc câu)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              SỐ ĐỘI TỐI ĐA
            </label>
            <select
              value={maxTeams}
              onChange={(e) => setMaxTeams(Number(e.target.value))}
              className="w-full p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition text-sm"
            >
              <option value={2}>2 đội</option>
              <option value={3}>3 đội</option>
              <option value={4}>4 đội</option>
              <option value={5}>5 đội</option>
              <option value={6}>6 đội</option>
              <option value={8}>8 đội</option>
              <option value={10}>10 đội</option>
              <option value={12}>12 đội (Tối đa 12 đội chơi)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="speedBonus"
              checked={speedBonus}
              onChange={(e) => setSpeedBonus(e.target.checked)}
              className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
            />
            <label htmlFor="speedBonus" className="text-sm font-extrabold text-slate-800 cursor-pointer">
              Thưởng tốc độ (đội đúng nhanh nhất nhận thêm điểm)
            </label>
          </div>
        </div>
      </div>

      {/* Questions Manager */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <span>DANH SÁCH CÂU HỎI ({questions.length})</span>
        </h3>

        <button
          onClick={handleAddQuestion}
          className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center gap-1.5 border border-indigo-200 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm câu hỏi</span>
        </button>
      </div>

      {/* Questions List */}
      <div className="flex flex-col gap-6 mb-8">
        {questions.map((q, qIndex) => (
          <div
            key={q.id}
            className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-100 shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">
                CÂU {qIndex + 1}
              </span>

              <div className="flex items-center gap-1">
                <button
                  disabled={qIndex === 0}
                  onClick={() => handleMoveQuestion(qIndex, 'up')}
                  className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded-lg"
                  title="Di chuyển lên"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  disabled={qIndex === questions.length - 1}
                  onClick={() => handleMoveQuestion(qIndex, 'down')}
                  className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded-lg"
                  title="Di chuyển xuống"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  disabled={questions.length <= 1}
                  onClick={() => handleDeleteQuestion(qIndex)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg ml-2"
                  title="Xóa câu hỏi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question title input */}
            <div className="mb-4">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                NỘI DUNG CÂU HỎI
              </label>
              <input
                type="text"
                value={q.title}
                onChange={(e) => handleUpdateQuestionTitle(qIndex, e.target.value)}
                placeholder="VD: Đâu là chữ Ư?"
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-extrabold text-slate-900 focus:bg-white focus:border-amber-400 outline-none text-base"
              />
            </div>

            {/* Options list */}
            <div className="mb-4">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                CÁC ĐÁP ÁN (CHẠM ĐỂ CHỌN ĐÁP ÁN ĐÚNG ✓)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt, optIndex) => (
                  <div
                    key={opt.id}
                    onClick={() => handleSetCorrectOption(qIndex, opt.id)}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition ${
                      opt.isCorrect
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {opt.isCorrect ? '✓' : optIndex + 1}
                    </div>
                    <input
                      type="text"
                      value={opt.text}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleUpdateOptionText(qIndex, opt.id, e.target.value)}
                      placeholder={`Đáp án ${optIndex + 1}`}
                      className="w-full bg-transparent font-bold text-slate-800 outline-none text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                GIẢI THÍCH CHO BÉ (HIỂN THỊ KHI CÔNG BỐ KẾT QUẢ)
              </label>
              <input
                type="text"
                value={q.explanation || ''}
                onChange={(e) => handleUpdateExplanation(qIndex, e.target.value)}
                placeholder="VD: Chữ Ư có râu nhỏ xinh xắn ở góc trên!"
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:bg-white outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center pb-12">
        <button
          onClick={handleAddQuestion}
          className="px-6 py-3 rounded-2xl bg-white border-2 border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-700 font-black text-sm flex items-center gap-2 shadow-sm transition"
        >
          <Plus className="w-5 h-5" />
          <span>THÊM CÂU HỎI TIẾP THEO</span>
        </button>
      </div>
    </div>
  );
};
