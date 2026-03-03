// src/components/MobileNav.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // 🌟 企业级细节 1：当用户点击菜单切换了路由时，自动收起抽屉
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // 🌟 企业级细节 2：抽屉打开时，禁止底层页面滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      {/* 移动端顶部 Navbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-30">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 text-gray-600 hover:text-[#FF8C00] rounded-lg hover:bg-orange-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <span className="font-bold text-gray-900 text-lg">章鱼房间</span>
        
        {/* 右侧占位，保持标题绝对居中 */}
        <div className="w-8"></div>
      </div>

      {/* 移动端毛玻璃遮罩层 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 移动端侧边抽屉 */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}