'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface AlbumPost {
  id: string;
  content: string;
  image_urls: string[];
  username: string;
}

export default function PhotoAlbumFeed() {
  const [albums, setAlbums] = useState<AlbumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchAlbums() {
      try {
        // 直接从 posts 表查询带图动态，保持独立且无外键报错
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            image_urls,
            username
          `)
          .neq('image_urls', '{}')
          .not('image_urls', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Supabase 详细报错:', JSON.stringify(error, null, 2));
          throw error;
        }
        
        if (data) {
          setAlbums(data as unknown as AlbumPost[]);
        }
      } catch (error) {
        console.error('获取相册失败:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAlbums();
  }, []); 

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-6 w-24 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl mt-8">
        还没有人发布图片动态
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800">精选相册</h2>
      
      <div className="grid grid-cols-2 gap-3">
        {albums.map((album) => {
          const coverUrl = album.image_urls?.[0] || '';
          const imageCount = album.image_urls?.length || 0;
          const authorName = album.username || '神秘章鱼';

          return (
            <div 
              key={album.id} 
              onClick={() => router.push(`/post/${album.id}`)} 
              // 🌟 核心新增 1：开启元素的拖拽支持
              draggable={true} 
              // 🌟 核心新增 2：拖拽开始时，将当前相册的数据转化为 JSON 存入拖拽引擎
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(album));
                e.dataTransfer.effectAllowed = 'copy'; // 设置鼠标样式为“复制”
              }}
              // 加入 cursor-grab 和 active:cursor-grabbing 优化鼠标悬浮和抓取时的视觉体验
              className="flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group"
            >
              {/* 封面图区域 */}
              <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-50">
                {coverUrl && (
                  <img 
                    src={coverUrl} 
                    alt="相册封面"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none" // pointer-events-none 防止拖拽时选中图片本身
                  />
                )}
                
                {/* 多图角标 */}
                {imageCount > 1 && (
                  <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="14" height="14" rx="2" ry="2"></rect>
                      <path d="M7 21h14a2 2 0 0 0 2-2V7"></path>
                    </svg>
                    {imageCount}
                  </div>
                )}
              </div>

              {/* 标题文案区域 */}
              <div className="p-2">
                <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">
                  {album.content || '分享了一组图片'}
                </p>
              </div>

              {/* 统一的橙色渐变头像区域 */}
              <div className="px-2 pb-3 mt-auto flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#FF8C00] to-yellow-400 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  {authorName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-gray-500 truncate">
                  {authorName}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}