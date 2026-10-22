import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Đồng ý',
  cancelText = 'Hủy bỏ',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const btnColors = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-slate-900',
  }[confirmVariant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all scale-100">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-slate-900">{title}</h3>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onCancel();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-600 font-medium text-sm leading-relaxed mb-6">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onCancel();
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onConfirm();
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition ${btnColors}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
