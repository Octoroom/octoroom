'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation'; // 引入路由

export default function MyAlbumsPage() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // 初始化路由

  useEffect(() => {
    async function fetchMyAlbums() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 🌟 只查询当前用户在 posts 表里发布的带图帖子
        const { data, error } = await supabase
          .from('posts')
          .select('id, content, image_urls, created_at')
          .eq('author_id', user.id)
          .neq('image_urls', '{}')
          .not('image_urls', 'is', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setAlbums(data);
      } catch (error) {
        console.error('获取我的相册失败:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMyAlbums();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">加载中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black mb-6 border-b pb-4">我的相册</h1>
      
      {albums.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-2xl">
          你还没有发布过图文动态哦
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {albums.map(album => (
            <div 
              key={album.id} 
              // 🌟 点击卡片进入对应的帖子详情
              onClick={() => router.push(`/post/${album.id}`)}
              className="bg-white rounded-xl overflow-hidden border shadow-sm group cursor-pointer hover:shadow-md transition-all"
            >
              <div className="aspect-[3/4] relative overflow-hidden bg-gray-100">
                {album.image_urls?.[0] && (
                  <img src={album.image_urls[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                )}
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                  {album.image_urls?.length} 图
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-sm text-gray-800 line-clamp-2">{album.content || '分享了一组图片'}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(album.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}