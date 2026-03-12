// src/components/ImageViewer.tsx
'use client';

import { useState, useEffect } from 'react';

interface ImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageViewer({ images, initialIndex, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // 🌟 企业级细节：打开图片时，禁止底层页面跟着滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* 左上角关闭按钮 */}
      <button 
        onClick={onClose} 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 p-2.5 text-white/70 hover:text-white bg-black/20 hover:bg-white/20 rounded-full transition-all z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      {/* 左右切换按钮 (只有当图片大于1张时才显示) */}
      {images.length > 1 && (
        <>
           <button 
             onClick={handlePrev} 
             className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white/70 hover:text-white bg-black/20 hover:bg-white/20 rounded-full transition-all z-50"
           >
             <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
           </button>
           <button 
             onClick={handleNext} 
             className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white/70 hover:text-white bg-black/20 hover:bg-white/20 rounded-full transition-all z-50"
           >
             <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
           </button>
        </>
      )}

      {/* 图片主体区域 */}
      <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-12" onClick={(e) => e.stopPropagation()}>
        <img 
          src={images[currentIndex]} 
          alt="preview" 
          className="max-w-full max-h-full object-contain select-none animate-in zoom-in-95 duration-200" 
        />
      </div>

      {/* 底部数量指示器 (如 1 / 4) */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/90 text-sm font-bold bg-white/10 backdrop-blur-md px-5 py-1.5 rounded-full tracking-widest z-50">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}