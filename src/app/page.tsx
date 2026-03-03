// src/app/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLocalAuth } from '@/components/InsforgeProviderWrapper';
import PostBox from '@/components/PostBox'; 
import AuthModal from '@/components/AuthModal'; 

export default function Home() {
  // 1. 获取登录状态
  const { isSignedIn, loading } = useLocalAuth();
  
  // 2. 控制未登录时，显示“封面”还是“登录框”
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) return null;

  // 🌟 如果已经登录，直接返回广场页面 (PostBox)
  if (isSignedIn) {
    return <PostBox />;
  }

  // 🌟 如果未登录，则显示封面或者登录框
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center p-8 bg-white text-slate-800 text-center relative overflow-hidden">
      
      {!showAuthModal ? (
        /* --- 封面模式 --- */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col items-center">
          {/* 顶部中英文标题 */}
          <div className="mb-8">
            <h1 className="text-5xl font-black mb-2 text-[#FF8C00] italic tracking-tighter">
              OctoRoom
            </h1>
            <p className="text-orange-400 font-medium tracking-widest uppercase text-sm">
              Social Housing & Rental Community
            </p>
          </div>

          {/* 图片容器 */}
          <div className="relative w-72 h-auto rounded-3xl overflow-hidden border-4 border-orange-100 shadow-[0_20px_50px_rgba(249,115,22,0.2)] mb-10 bg-orange-50">
            <Image 
              src="/octoroom.png" 
              alt="OctoRoom Cover" 
              width={400} 
              height={600}
              className="hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* 描述区域 */}
          <div className="max-w-2xl space-y-6 mb-12 px-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">欢迎来到章鱼房间，寻找你的同温层。</h2>
              <p className="text-slate-500 leading-relaxed">
                章鱼房间（OctoRoom）将社交基因注入房产租赁。房东可以更真实地展示房源，租客可以通过社交背书找到理想居所。
              </p>
            </div>
          </div>

          {/* 橙色系按钮 - 点击触发登录框 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => setShowAuthModal(true)} 
              className="bg-[#FF8C00] text-white px-10 py-4 rounded-2xl font-bold hover:bg-[#E67E00] transition-all shadow-lg shadow-orange-200 text-lg"
            >
              立即寻房 / Find a Room
            </button>
            <button 
              onClick={() => setShowAuthModal(true)} 
              className="bg-white text-[#FF8C00] border-2 border-[#FF8C00] px-10 py-4 rounded-2xl font-bold hover:bg-orange-50 transition-all text-lg"
            >
              发布房源 / List a Room
            </button>
          </div>

          {/* 页脚 */}
          <footer className="mt-20 text-slate-300 text-sm">
            © 2026 OctoRoom 章鱼房间. Powered by Next.js.
          </footer>
        </div>
      ) : (
        /* --- 登录框模式 --- */
        <div className="w-full relative animate-in zoom-in-95 duration-300 flex flex-col items-center justify-center z-10">
          
          <div className="mb-6 text-center">
             <h1 className="text-4xl font-black text-[#FF8C00] italic tracking-tighter mb-2">OctoRoom</h1>
             <p className="text-gray-500 font-medium">欢迎来到章鱼房间，寻找你的同温层。</p>
          </div>

          {/* 返回封面按钮 */}
          <div className="w-full max-w-sm mb-4">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="text-gray-500 hover:text-[#FF8C00] flex items-center gap-1 font-medium transition-colors"
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              返回封面
            </button>
          </div>
          
          {/* 引入您的注册登录组件 */}
          <AuthModal />
        </div>
      )}

    </main>
  );
}