// src/components/AuthModal.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // 🌟 新增 1：添加确认密码的状态变量
  const [confirmPassword, setConfirmPassword] = useState(''); 
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🌟 新增 2：在开启 loading 和发送请求前，先校验两次密码是否一致
    if (isSignUp && password !== confirmPassword) {
      alert('提示：两次输入的密码不一致，请重新输入！');
      return; // 密码不一致直接拦截，不执行后续逻辑
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // 1. 注册时，将 username 作为元数据传入
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { username: username }
          }
        });
        if (error) throw error;
        
        // 🌟 核心修复：前端手动同步数据到 profiles 表（双重保险）
        if (data?.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            username: username,
            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.user.id}`
          });
          if (profileError) {
            console.error('创建 Profile 失败:', profileError.message);
          }
        }

        // 2. 检查是否需要邮箱验证
        if (data?.user && !data.session) {
          alert('注册成功！\n\n请前往邮箱点击验证链接激活账号，然后在此登录。');
          setIsSignUp(false); // 切换回登录模式
          return;
        }

        // 3. 注册并自动登录成功
        const userId = data?.user?.id || data?.session?.user?.id;
        if (userId) {
          localStorage.setItem('octo_room_user_id', userId);
        }
        localStorage.setItem('octo_room_auth', 'true');
        
        alert('注册成功！已自动进入房间');
        window.location.reload(); 
        
      } else {
        // 🌟 登录逻辑
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('账号未激活！请检查邮箱验证邮件，或在 Supabase 后台关闭邮箱验证。');
          }
          throw error;
        }
        
        const userId = data?.user?.id || data?.session?.user?.id;
        if (userId) {
          localStorage.setItem('octo_room_user_id', userId);
        }
        localStorage.setItem('octo_room_auth', 'true');
        
        alert('登录成功，欢迎回来！');
        window.location.reload();
      }
    } catch (err: any) {
      const msg = err.message || '';
      
      // 拦截并翻译常见的报错信息
      if (msg.includes('Invalid login credentials')) {
        alert('登录失败：邮箱或密码不正确！\n\n如果您是新用户，请点击下方切换到【注册模式】。\n如果您确认密码无误，可能是该账号尚未注册。');
      } else if (msg.includes('User already registered')) {
        alert('提示：该邮箱已经被注册过啦！\n\n请点击下方切换到【登录模式】直接登录。');
      } else if (msg.includes('Password should be at least')) {
        alert('提示：密码太短！为了安全，请至少输入 6 位密码。');
      } else if (msg === 'Failed to fetch' || err.name === 'AuthRetryableFetchError') {
        alert('连接失败：无法连接到服务器！\n\n请检查：\n1. 您的网络连接是否正常\n2. .env.local 中的配置是否正确');
      } else if (msg.includes('rate limit')) {
        alert('提示：操作太快了！系统限制了请求频率，请稍后再试。');
      } else {
        alert('操作失败: ' + msg);
      }
      
      console.error('详细错误:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-black shadow-[4px_4px_0px_0px_#FF8C00] max-w-sm w-full mx-auto transition-all">
      <h2 className="text-xl font-bold text-[#FF8C00] mb-6 text-center italic tracking-wider">
        {isSignUp ? 'Join OctoRoom' : 'Back To OctoRoom'}
      </h2>
      <form onSubmit={handleAuth} className="space-y-4">
        {/* 🌟 仅在注册模式下显示用户名输入框 */}
        {isSignUp && (
          <input
            type="text"
            placeholder="设置你的昵称 (Username)"
            className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] focus:-translate-y-[1px] focus:-translate-x-[1px] outline-none transition-all bg-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="你的邮箱"
          className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] focus:-translate-y-[1px] focus:-translate-x-[1px] outline-none transition-all bg-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="输入密码 (6位以上)"
          className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] focus:-translate-y-[1px] focus:-translate-x-[1px] outline-none transition-all bg-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {/* 🌟 新增 3：仅在注册模式下显示确认密码输入框 */}
        {isSignUp && (
          <input
            type="password"
            placeholder="再次输入密码确认"
            className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] focus:-translate-y-[1px] focus:-translate-x-[1px] outline-none transition-all bg-white"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        )}
        <button 
          disabled={loading} 
          className="w-full bg-[#FF8C00] text-white py-3 rounded-xl font-bold border border-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] transition-all disabled:opacity-50"
        >
          {loading ? '正在连接...' : (isSignUp ? '立 即 注 册' : '登 录')}
        </button>
      </form>
      
      <div className="text-center mt-6">
        <button 
          onClick={() => {
            setIsSignUp(!isSignUp);
            // 🌟 优化：切换模式时清空确认密码，避免数据残留
            setConfirmPassword(''); 
          }}
          className="text-xs font-medium text-gray-500 hover:text-[#FF8C00] underline decoration-dotted transition-colors"
          type="button"
        >
          {isSignUp ? '已有账号？点此登录' : '没有账号？加入章鱼房间'}
        </button>
      </div>
    </div>
  );
}