'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useLocalAuth } from '@/components/InsforgeProviderWrapper';

interface PopularRoom {
  id: string;
  title: string;
  coverImage: string;
  viewCount: number;
}

export default function PopularRoomsFeed() {
  const { isSignedIn } = useLocalAuth();
  const [popularRooms, setPopularRooms] = useState<PopularRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPopularRooms() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('id, title, cover_image, view_count')
          .order('view_count', { ascending: false })
          .limit(10); // 取前10个

        if (error) throw error;

        if (data) {
          const formattedData = data.map(room => ({
            id: room.id,
            title: room.title,
            coverImage: room.cover_image,
            viewCount: room.view_count || 0
          }));
          setPopularRooms(formattedData);
        }
      } catch (error) {
        console.error("获取热门房间失败", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isSignedIn) {
      fetchPopularRooms();
    } else {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  if (!isSignedIn) return null;

  return (
    <div className="w-full flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-[16px] font-bold text-gray-900 flex items-center gap-1">
           热门房间推荐
        </h2>
      </div>
      
      {isLoading ? (
        <div className="text-sm text-gray-400 font-medium">寻找神秘房间中...</div>
      ) : popularRooms.length > 0 ? (
        // 单列垂直排列
        <div className="flex flex-col gap-3">
          {popularRooms.map((room) => (
            <Link 
              key={room.id} 
              href={`/rooms/${room.id}`}
              className="block relative w-full rounded-xl overflow-hidden shadow-sm group cursor-pointer border border-black/5 bg-gray-100"
            >
              {/* 🌟 核心修改点：将 aspect-video 改为 aspect-square (1:1 正方形)
                  这样热门房间的图片尺寸就会和中间相册、左侧城市列表保持一致，视觉更统一。 */}
              <div className="w-full aspect-square relative overflow-hidden">
                <img 
                  src={room.coverImage || 'https://via.placeholder.com/150'} 
                  alt={room.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* 底部渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-3.5">
                <h3 className="text-white text-[14px] font-bold leading-tight line-clamp-2 drop-shadow-md">
                  {room.title}
                </h3>
                <div className="flex items-center gap-1 mt-2 text-white/90 text-[11px] font-medium tracking-wide">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.866 8.21 8.21 0 003 2.48z" />
                  </svg>
                  <span>{room.viewCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400 font-medium">暂无推荐，去探索一下吧。</div>
      )}
    </div>
  );
}