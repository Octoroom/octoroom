// src/components/AuthModal.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Provider } from '@supabase/supabase-js';

export default function AuthModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); 
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false); 

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      alert('请先输入你的注册邮箱！\nPlease enter your registered email first!');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      
      alert('💌 重置链接已发送！请前往邮箱查收。\n\n💌 Reset link sent! Please check your inbox.');
      setIsResetPassword(false); 
      setPassword(''); 
      
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
      alert('提示：两次输入的密码不一致，请重新输入！\nPasswords do not match!');
      return; 
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { username: username } }
        });
        if (error) throw error;
        
        if (data?.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            username: username,
            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.user.id}`
          });
        }

        if (data?.user && !data.session) {
          alert('注册成功！请前往邮箱点击验证链接。\nSign up successful! Please check your email.');
          setIsSignUp(false); 
          return;
        }
        window.location.reload(); 
        
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.reload();
      }
    } catch (err: any) {
      alert('操作失败 / Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: Provider) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (err: any) {
      alert(`${provider} 登录失败: ` + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-black shadow-[4px_4px_0px_0px_#FF8C00] max-w-sm w-full mx-auto transition-all text-black">
      <h2 className="text-xl font-bold text-[#FF8C00] mb-6 text-center italic tracking-wider">
        {isResetPassword ? 'Reset Password' : (isSignUp ? 'Join OctoRoom' : 'Back To OctoRoom')}
      </h2>

      {isResetPassword ? (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] outline-none bg-white text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button disabled={loading} className="w-full bg-[#FF8C00] text-white py-3 rounded-xl font-bold border border-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-y-[3px] transition-all text-sm">
            Send Reset Link
          </button>
        </form>
      ) : (
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Username"
              className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] outline-none bg-white text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] outline-none bg-white text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] outline-none bg-white text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {isSignUp && (
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full p-3 rounded-xl border border-black focus:shadow-[3px_3px_0px_0px_#FF8C00] outline-none bg-white text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}
          <button disabled={loading} className="w-full bg-[#FF8C00] text-white py-3 rounded-xl font-bold border border-black shadow-[3px_3px_0px_0px_black] active:shadow-none active:translate-y-[3px] transition-all text-sm">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
      )}

      {/* 2x2 网格布局：Google, X, GitHub, Spotify */}
      {!isResetPassword && (
        <div className="mt-6">
          <div className="relative flex items-center py-2 mb-2">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-[11px] font-bold uppercase">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Google */}
            <button onClick={() => handleOAuthLogin('google')} type="button" className="w-full bg-white py-2 rounded-xl font-bold border border-black shadow-[2px_2px_0px_0px_black] hover:shadow-[3px_3px_0px_0px_#FF8C00] transition-all flex items-center justify-center gap-2 text-xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>

            {/* X (Twitter) */}
            <button onClick={() => handleOAuthLogin('twitter')} type="button" className="w-full bg-white py-2 rounded-xl font-bold border border-black shadow-[2px_2px_0px_0px_black] hover:shadow-[3px_3px_0px_0px_#FF8C00] transition-all flex items-center justify-center gap-2 text-xs">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X
            </button>

            {/* GitHub */}
            <button onClick={() => handleOAuthLogin('github')} type="button" className="w-full bg-white py-2 rounded-xl font-bold border border-black shadow-[2px_2px_0px_0px_black] hover:shadow-[3px_3px_0px_0px_#FF8C00] transition-all flex items-center justify-center gap-2 text-xs">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </button>

            {/* Spotify */}
            <button onClick={() => handleOAuthLogin('spotify')} type="button" className="w-full bg-white py-2 rounded-xl font-bold border border-black shadow-[2px_2px_0px_0px_black] hover:shadow-[3px_3px_0px_0px_#FF8C00] transition-all flex items-center justify-center gap-2 text-xs">
              <svg className="w-4 h-4" fill="#1DB954" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.45 17.34c-.213.344-.668.455-1.012.243-2.774-1.696-6.264-2.078-10.378-1.138-.386.088-.767-.153-.855-.54-.088-.386.153-.767.54-.855 4.49-.976 8.355-.53 11.46 1.37.344.212.455.667.243 1.011zm1.432-3.21c-.266.425-.828.563-1.253.298-3.174-1.954-8.038-2.527-11.83-1.38-.49.148-1.002-.128-1.15-.618-.148-.49.128-1.002.618-1.15 4.34-1.31 9.71-.662 13.318 1.558.425.265.563.827.297 1.252zm.126-3.342C15.176 8.5 8.79 8.28 5.122 9.395c-.58.176-1.185-.148-1.36-.728-.176-.58.148-1.185.728-1.36 4.25-1.295 11.31-1.042 15.655 1.54.524.31.696.994.387 1.517-.31.523-.994.695-1.518.386z"/>
              </svg>
              Spotify
            </button>
          </div>
        </div>
      )}
      
      <div className="text-center mt-6 flex flex-col space-y-3">
        {!isResetPassword && !isSignUp && (
          <button onClick={() => setIsResetPassword(true)} className="text-xs font-medium text-gray-400 hover:text-[#FF8C00]">
            Forgot Password?
          </button>
        )}
        <button 
          onClick={() => isResetPassword ? setIsResetPassword(false) : setIsSignUp(!isSignUp)}
          className="text-xs font-medium text-gray-500 hover:text-[#FF8C00] underline decoration-dotted"
        >
          {isResetPassword ? 'Back to Sign In' : (isSignUp ? 'Already have an account? Sign In' : 'New here? Sign Up')}
        </button>
      </div>
    </div>
  );
}