import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  ArrowRight,
  LogOut,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStoredSupabaseConfig, saveStoredSupabaseConfig } from '../../services/supabaseClient';
import { sounds } from '../../utils/sound';

export const AuthModal: React.FC = () => {
  const {
    user,
    teacherName,
    isAuthModalOpen,
    authModalTab,
    closeAuthModal,
    signIn,
    signUp,
    signOut,
    openAuthModal,
    refreshConfig,
    isConfigured,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'config'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Supabase Config form states
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');

  // Status & Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync active tab when modal is opened
  useEffect(() => {
    if (isAuthModalOpen) {
      setActiveTab(authModalTab);
      setErrorMessage(null);
      setSuccessMessage(null);
      const conf = getStoredSupabaseConfig();
      setSupabaseUrl(conf.url);
      setSupabaseAnonKey(conf.anonKey);
    }
  }, [isAuthModalOpen, authModalTab]);

  if (!isAuthModalOpen) return null;

  const handleTabChange = (tab: 'login' | 'register' | 'config') => {
    sounds.playClick();
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Cô vui lòng nhập đầy đủ Email và Mật khẩu nhé!');
      return;
    }

    setIsLoading(true);
    const res = await signIn(email, password);
    setIsLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
      sounds.playWrong?.();
    } else {
      sounds.playCorrect?.();
      setSuccessMessage('Đăng nhập thành công! Chào mừng cô trở lại.');
      setTimeout(() => {
        closeAuthModal();
      }, 1200);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Cô vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu cần có ít nhất 6 ký tự để bảo mật an toàn.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp. Cô vui lòng kiểm tra lại!');
      return;
    }

    setIsLoading(true);
    const res = await signUp(email, password, fullName || 'Cô Giáo');
    setIsLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
      sounds.playWrong?.();
    } else {
      sounds.playCorrect?.();
      if (res.needsEmailConfirmation) {
        setSuccessMessage('Đăng ký tài khoản thành công! Một email xác nhận đã được gửi đến hòm thư của cô.');
      } else {
        setSuccessMessage('Đăng ký và đăng nhập thành công!');
        setTimeout(() => {
          closeAuthModal();
        }, 1200);
      }
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    setErrorMessage(null);

    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setErrorMessage('Vui lòng nhập cả Supabase URL và Supabase Anon Key.');
      return;
    }

    if (!supabaseUrl.startsWith('https://')) {
      setErrorMessage('Supabase URL phải bắt đầu bằng https:// (VD: https://xyz.supabase.co)');
      return;
    }

    try {
      saveStoredSupabaseConfig(supabaseUrl, supabaseAnonKey);
      refreshConfig();
      sounds.playCorrect?.();
      setSuccessMessage('Đã lưu cấu hình kết nối Supabase thành công!');
      setTimeout(() => {
        setActiveTab('login');
        setSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi lưu cấu hình');
    }
  };

  const handleSignOut = async () => {
    sounds.playClick();
    setIsLoading(true);
    await signOut();
    setIsLoading(false);
    setSuccessMessage('Cô đã đăng xuất thành công.');
    setTimeout(() => {
      closeAuthModal();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-amber-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-500 p-4 sm:p-5 text-white flex items-center justify-between relative shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
              👩‍🏫
            </div>
            <div>
              <h3 className="font-black text-lg sm:text-xl tracking-tight leading-tight">
                {user ? 'Tài Khoản Giáo Viên' : 'Khu Vực Giáo Viên'}
              </h3>
              <p className="text-[11px] font-bold text-amber-100">
                {user ? `Xin chào: ${teacherName}` : 'Đăng nhập để quản lý trò chơi & dữ liệu riêng'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              closeAuthModal();
            }}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Đóng hộp thoại"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation (when not logged in) */}
        {!user ? (
          <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5 gap-1 text-xs font-black">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Đăng ký</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('config')}
              className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Cài đặt kết nối Supabase"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kết nối</span>
            </button>
          </div>
        ) : null}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Status Banners */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-700 text-xs sm:text-sm font-extrabold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-800 text-xs sm:text-sm font-extrabold flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* VIEW: LOGGED IN USER PROFILE */}
          {user ? (
            <div className="flex flex-col gap-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border-2 border-indigo-100 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                  👩‍🏫
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block">
                    Giáo viên phụ trách
                  </span>
                  <h4 className="font-black text-base sm:text-lg text-slate-900 truncate">
                    {teacherName}
                  </h4>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1 font-semibold">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{user.email}</span>
                  </p>
                </div>
              </div>

              {/* Security info banner */}
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 font-bold">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Tài khoản của cô được bảo vệ bằng chính sách phân quyền RLS Supabase. Chỉ tài khoản này mới có quyền chỉnh sửa hoặc tạo các trò chơi riêng.
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs sm:text-sm border-2 border-rose-200 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất tài khoản</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {/* VIEW: LOGIN FORM */}
          {!user && activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-3.5 animate-in fade-in">
              {!isConfigured && (
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Chưa có Supabase Key trong môi trường?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('config')}
                    className="text-sky-700 underline font-black text-[11px] cursor-pointer"
                  >
                    Cấu hình
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Email giáo viên
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: cogiao@mamnon.edu.vn"
                    className="w-full py-2.5 pl-9 pr-3 text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-50 rounded-xl border border-slate-300 focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full py-2.5 pl-9 pr-3 text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-50 rounded-xl border border-slate-300 focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <>
                    <span>ĐĂNG NHẬP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500 font-bold">Chưa có tài khoản cô giáo? </span>
                <button
                  type="button"
                  onClick={() => handleTabChange('register')}
                  className="text-xs font-black text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Đăng ký ngay
                </button>
              </div>
            </form>
          ) : null}

          {/* VIEW: REGISTER FORM */}
          {!user && activeTab === 'register' ? (
            <form onSubmit={handleRegister} className="flex flex-col gap-3.5 animate-in fade-in">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Họ và tên giáo viên
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Cô Mai Lan"
                    className="w-full py-2.5 pl-9 pr-3 text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-50 rounded-xl border border-slate-300 focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: mailan@mamnon.edu.vn"
                    className="w-full py-2.5 pl-9 pr-3 text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-50 rounded-xl border border-slate-300 focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Mật khẩu (tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tạo mật khẩu..."
                    className="w-full py-2.5 pl-9 pr-3 text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-50 rounded-xl border border-slate-300 focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Xác nhận lại mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    className="w-full py-2.5 pl-9 pr-3 text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-50 rounded-xl border border-slate-300 focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-200 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang đăng ký...</span>
                  </>
                ) : (
                  <>
                    <span>TẠO TÀI KHOẢN CÔ GIÁO</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500 font-bold">Đã có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => handleTabChange('login')}
                  className="text-xs font-black text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Đăng nhập
                </button>
              </div>
            </form>
          ) : null}

          {/* VIEW: SUPABASE CONFIG FORM */}
          {!user && activeTab === 'config' ? (
            <form onSubmit={handleSaveConfig} className="flex flex-col gap-3.5 animate-in fade-in">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-bold">
                💡 Cô có thể cấu hình nhanh thông tin dự án Supabase tại đây nếu chưa cấu hình qua file môi trường (.env).
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  required
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full py-2.5 px-3 text-xs sm:text-sm font-mono font-bold text-slate-900 bg-slate-50 rounded-xl border border-slate-300 focus:border-indigo-500 focus:bg-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                  Supabase Anon Key
                </label>
                <textarea
                  required
                  rows={3}
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full py-2 px-3 text-xs font-mono font-bold text-slate-900 bg-slate-50 rounded-xl border border-slate-300 focus:border-indigo-500 focus:bg-white outline-none transition"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Lưu cấu hình kết nối</span>
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
};
