// src/components/AuthModal.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); 
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isSignUp, setIsSignUp] = useState(false);
  // 🌟 新增：控制是否处于“忘记密码”模式
  const [isResetPassword, setIsResetPassword] = useState(false); 

  // 🌟 新增：处理发送重置邮件的逻辑
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      alert('请先输入你的注册邮箱！\nPlease enter your registered email first!');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // 重要：邮件点击后跳转到你的重置密码专用页面
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      
      alert('💌 重置链接已发送！请前往邮箱查收（如果没有收到，请检查垃圾邮件夹）。\n\n💌 Reset link sent! Please check your inbox (and spam folder).');
      setIsResetPassword(false); // 发送成功后，自动切回登录模式
      setPassword(''); // 清空可能残留的密码
      
    } catch (err: any) {
      alert('发送失败 / Failed to send: ' + (err.message || '未知错误 / Unknown error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp && password !== confirmPassword) {
      alert('提示：两次输入的密码不一致，请重新输入！\nPasswords do not match, please try again!');
      return; 
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { username: username }
          }
        });
        if (error) throw error;
        
        if (data?.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            username: username,
            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.user.id}`
          });
          if (profileError) {
            console.error('创建 Profile 失败 / Failed to create profile:', profileError.message);
          }
        }

        if (data?.user && !data.session) {
          alert('注册成功！请前往邮箱点击验证链接激活账号，然后在此登录。\n\nSign up successful! Please check your email to verify your account, then log in here.');
          setIsSignUp(false); 
          return;
        }

        const userId = data?.user?.id || data?.session?.user?.id;
        if (userId) {
          localStorage.setItem('octo_room_user_id', userId);
        }
        localStorage.setItem('octo_room_auth', 'true');
        
        alert('注册成功！已自动进入房间。\nWelcome to the room!');
        window.location.reload(); 
        
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('账号未激活！请检查邮箱验证邮件。\nAccount not verified! Please check your verification email.');
          }
          throw error;
        }
        
        const userId = data?.user?.id || data?.session?.user?.id;
        if (userId) {
          localStorage.setItem('octo_room_user_id', userId);
        }
        localStorage.setItem('octo_room_auth', 'true');
        
        alert('登录成功，欢迎回来！\nLogin successful, welcome back!');
        window.location.reload();
      }
    } catch (err: any) {
      const msg = err.message || '';
      
      if (msg.includes('Invalid login credentials')) {
        alert('登录失败：邮箱或密码不正确！\n如果您是新用户，请切换到【注册模式】。\n\nLogin failed: Invalid email or password. \nIf you are a new user, please switch to Sign Up.');
      } else if (msg.includes('User already registered')) {
        alert('提示：该邮箱已经被注册过啦！请直接登录。\n\nEmail already registered! Please log in directly.');
      } else if (msg.includes('Password should be at least')) {
        alert('提示：密码太短！请至少输入 6 位密码。\n\nPassword too short! Please enter at least 6 characters.');
      } else if (msg === 'Failed to fetch' || err.name === 'AuthRetryableFetchError') {
        alert('连接失败：无法连接到服务器！请检查网络连接。\n\nConnection failed: Unable to connect to server. Please check your network.');
      } else if (msg.includes('rate limit')) {
        alert('提示：操作太快了！请稍后再试。\n\nRate limit exceeded! Please try again later.');
      } else {
        alert('操作失败 / Error: ' + msg);
      }
      
      console.error('详细错误:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-black shadow-[4px_4px_0px_0px_#FF8C00] max-w-sm w-full mx-auto transition-all">
      <h2 className="text-xl font-bold text-[#FF8C00] mb-6 text-center italic tracking-wider">
        {/* 🌟 动态双语标题 */}
        {isResetPassword ? 'Reset Password / 重置密码' : (isSignUp ? 'Join OctoRoom / 加入房间' : 'Back To OctoRoom / 回到房间')}
      </h2>

      {/* 🌟 重置密码表单 */}
      {isResetPassword ? (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-xs text-gray-500 mb-2 text-center font-medium">
            Enter your email to receive a reset link.<br/>输入注册邮箱，我们将发送重置链接。
          </p>
          <input
            type="email"
            placeholder="邮箱地址 / Email Address"
            className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] focus:-translate-y-[1px] focus:-translate-x-[1px] outline-none transition-all bg-white text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button 
            disabled={loading} 
            className="w-full bg-[#FF8C00] text-white py-3 rounded-xl font-bold border border-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] transition-all disabled:opacity-50 text-sm"
          >
            {loading ? 'Processing... / 处理中...' : 'Send Reset Link / 发送重置链接'}
          </button>
        </form>
      ) : (
        /* 🌟 注册与登录表单 */
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="设置昵称 / Username"
              className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] focus:-translate-y-[1px] focus:-translate-x-[1px] outline-none transition-all bg-white text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="邮箱地址 / Email Address"
            className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] focus:-translate-y-[1px] focus:-translate-x-[1px] outline-none transition-all bg-white text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="输入密码 / Password (6+ chars)"
            className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] focus:-translate-y-[1px] focus:-translate-x-[1px] outline-none transition-all bg-white text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {isSignUp && (
            <input
              type="password"
              placeholder="再次输入密码 / Confirm Password"
              className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] focus:-translate-y-[1px] focus:-translate-x-[1px] outline-none transition-all bg-white text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}
          <button 
            disabled={loading} 
            className="w-full bg-[#FF8C00] text-white py-3 rounded-xl font-bold border border-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] transition-all disabled:opacity-50 text-sm tracking-wide"
          >
            {loading ? 'Processing... / 处理中...' : (isSignUp ? 'Sign Up / 立即注册' : 'Sign In / 登录')}
          </button>
        </form>
      )}
      
      {/* 🌟 底部状态切换区域 */}
      <div className="text-center mt-6 flex flex-col space-y-3">
        {!isResetPassword && !isSignUp && (
          <button 
            onClick={() => setIsResetPassword(true)}
            className="text-xs font-medium text-gray-400 hover:text-[#FF8C00] transition-colors"
            type="button"
          >
            Forgot Password? / 忘记密码？
          </button>
        )}

        <button 
          onClick={() => {
            if (isResetPassword) {
              setIsResetPassword(false);
            } else {
              setIsSignUp(!isSignUp);
              setConfirmPassword(''); 
            }
          }}
          className="text-xs font-medium text-gray-500 hover:text-[#FF8C00] underline decoration-dotted transition-colors"
          type="button"
        >
          {isResetPassword 
            ? 'Back to Sign In / 返回登录' 
            : (isSignUp ? 'Already have an account? Sign In / 已有账号？点此登录' : 'New here? Sign Up / 没有账号？加入房间')}
        </button>
      </div>
    </div>
  );
}