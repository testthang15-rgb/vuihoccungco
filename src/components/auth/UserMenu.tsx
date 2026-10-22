import React, { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, ChevronDown, Sparkles, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sounds } from '../../utils/sound';

export const UserMenu: React.FC = () => {
  const { user, teacherName, openAuthModal, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenLogin = () => {
    sounds.playClick();
    openAuthModal('login');
  };

  const handleToggleMenu = () => {
    sounds.playClick();
    setIsOpen(!isOpen);
  };

  const handleSignOut = async () => {
    sounds.playClick();
    setIsOpen(false);
    await signOut();
  };

  if (!user) {
    return (
      <button
        type="button"
        onClick={handleOpenLogin}
        className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-amber-200/60 hover:shadow-lg transition active:scale-95 cursor-pointer shrink-0"
        title="Đăng nhập tài khoản giáo viên"
      >
        <span className="text-base shrink-0 leading-none">👩‍🏫</span>
        <span className="whitespace-nowrap hidden sm:inline">Cô giáo</span>
        <span className="whitespace-nowrap hidden md:inline">đăng nhập</span>
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={handleToggleMenu}
        className="px-2.5 sm:px-3 py-1.5 rounded-full bg-white hover:bg-indigo-50/80 border-2 border-indigo-200 text-indigo-900 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
        title={`Tài khoản: ${teacherName}`}
        aria-expanded={isOpen}
      >
        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-2xs shrink-0">
          👩‍🏫
        </div>
        <span className="max-w-[85px] sm:max-w-[120px] truncate font-black text-slate-800">
          {teacherName}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header info */}
          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 mb-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-600 tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Đã xác thực Supabase</span>
            </div>
            <div className="font-black text-xs sm:text-sm text-slate-900 truncate mt-0.5">
              {teacherName}
            </div>
            <div className="text-[11px] text-slate-500 truncate font-semibold">
              {user.email}
            </div>
          </div>

          {/* Account Details */}
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setIsOpen(false);
              openAuthModal('login');
            }}
            className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-2 cursor-pointer"
          >
            <User className="w-4 h-4 text-slate-400" />
            <span>Thông tin tài khoản</span>
          </button>

          <div className="my-1 border-t border-slate-100" />

          {/* Logout */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 transition flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </div>
  );
};
