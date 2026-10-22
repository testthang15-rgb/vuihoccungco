import React, { useState } from 'react';
import { Question } from '../../types/game';
import { GameEngine } from '../../services/gameEngine';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface ValidationBannerProps {
  questions: Question[];
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({ questions }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const allErrors: { questionIndex: number; error: string }[] = [];

  questions.forEach((q, idx) => {
    const val = GameEngine.validateQuestion(q);
    if (!val.isValid) {
      val.errors.forEach(err => {
        allErrors.push({ questionIndex: idx + 1, error: err });
      });
    }
  });

  const isValid = allErrors.length === 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
          isValid
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
            : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
        }`}
      >
        {isValid ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Game hợp lệ</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Có {allErrors.length} lưu ý</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </>
        )}
      </button>

      {/* Expanded errors dropdown */}
      {isExpanded && !isValid && (
        <div className="absolute right-0 top-10 w-72 bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-3 z-50 animate-in fade-in">
          <h5 className="font-black text-xs text-amber-900 mb-2">
            CÁC LƯU Ý TRƯỚC KHI XUẤT BẢN:
          </h5>
          <ul className="space-y-1.5 text-[11px] font-semibold text-slate-700">
            {allErrors.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="font-bold text-amber-600 shrink-0">• Câu {item.questionIndex}:</span>
                <span>{item.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
