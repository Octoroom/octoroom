// src/app/update-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 可选：检查用户是否真的携带了恢复 session 进来
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // 如果没有 session，说明用户可能是乱输入网址进来的，或者 token 已经过期
      if (!session) {
        console.warn('No active session found. User might need to request a new reset link.');
      }
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      alert('密码太短！请至少输入 6 位密码。\nPassword too short! Please enter at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      alert('两次输入的密码不一致，请重新输入！\nPasswords do not match, please try again!');
      return;
    }

    setLoading(true);

    try {
      // 🌟 核心 API：更新当前用户的密码
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      alert('密码更新成功！请使用新密码重新登录。\nPassword updated successfully! Please log in with your new password.');
      
      // 更新成功后，退出当前重置状态的登录，并跳转回主页要求用户重新正常登录
      await supabase.auth.signOut();
      router.push('/'); 

    } catch (err: any) {
      alert('更新失败 / Update failed: ' + (err.message || '未知错误 / Unknown error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center p-8 bg-white text-slate-800 text-center relative overflow-hidden">
      
      {/* 页面背景装饰，与主页保持一致 */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-50 rounded-full blur-3xl opacity-50 z-0 pointer-events-none"></div>
      
      <div className="z-10 bg-white p-8 rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_#FF8C00] max-w-md w-full mx-auto transition-all animate-in zoom-in-95 duration-300">
        
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#FF8C00] italic tracking-tighter mb-2">
            OctoRoom
          </h1>
          <h2 className="text-lg font-bold text-slate-800">
            Set New Password / 设置新密码
          </h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            Please enter your new password below.<br/>请在下方输入你的新密码。
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-gray-700 ml-1">New Password / 新密码</label>
            <input
              type="password"
              placeholder="至少 6 位字符 / 6+ characters"
              className="w-full p-3.5 rounded-xl border-2 border-black focus:shadow-[4px_4px_0px_0px_#FF8C00] focus:-translate-y-[2px] focus:-translate-x-[2px] outline-none transition-all bg-gray-50 focus:bg-white text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-gray-700 ml-1">Confirm Password / 确认密码</label>
            <input
              type="password"
              placeholder="再次输入新密码 / Confirm new password"
              className="w-full p-3.5 rounded-xl border-2 border-black focus:shadow-[4px_4px_0px_0px_#FF8C00] focus:-translate-y-[2px] focus:-translate-x-[2px] outline-none transition-all bg-gray-50 focus:bg-white text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-[#FF8C00] text-white py-4 mt-2 rounded-xl font-black border-2 border-black shadow-[4px_4px_0px_0px_black] active:shadow-none active:translate-y-[4px] active:translate-x-[4px] transition-all disabled:opacity-50 text-base tracking-wide"
          >
            {loading ? 'Updating... / 更新中...' : 'Update Password / 确认更新'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => router.push('/')}
            className="text-sm font-bold text-gray-400 hover:text-[#FF8C00] underline decoration-dotted transition-colors"
            type="button"
          >
            Cancel and back to Home / 取消并返回主页
          </button>
        </div>

      </div>
    </main>
  );
}