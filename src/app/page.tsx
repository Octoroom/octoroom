// src/app/page.tsx
'use client';

import { useLocalAuth } from '@/components/InsforgeProviderWrapper';
import PostBox from '@/components/PostBox'; 
import AuthModal from '@/components/AuthModal'; 

export default function Home() {
  const { isSignedIn, loading } = useLocalAuth();

  if (loading) return null;

  return (
    <>
      {!isSignedIn ? (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
           <div className="mb-8 text-center">
              <h1 className="text-4xl font-black text-octo-orange italic tracking-tighter mb-2">OctoRoom</h1>
              <p className="text-gray-500 font-medium">欢迎来到章鱼房间，寻找你的同温层。</p>
           </div>
           <AuthModal />
        </div>
      ) : (
        // 🌟 直接返回中间的 PostBox
        // 因为右侧相册已经在 layout.tsx 全局接管了
        <PostBox />
      )}
    </>
  );
}