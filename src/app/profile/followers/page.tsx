// src/app/profile/followers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FollowersPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 🚀 提速 1：直接从本地拿到 ID，干掉冗余的网络验证请求
      const userId = typeof window !== 'undefined' ? localStorage.getItem('octo_room_user_id') : null;
      if (!userId) {
        setLoading(false);
        return;
      }

      // 1. 获取关注我的人的 ID
      const { data: follows } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (follows && follows.length > 0) {
        const ids = follows.map(f => f.follower_id);
        // 2. 获取这些人的资料
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio')
          .in('id', ids);
        setProfiles(profilesData || []);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    // 🌟 布局优化：去掉多余的全屏和居中限制，完美适应 layout.tsx
    <div className="p-4 sm:p-6 pb-20">
      
      {/* 🌟 视觉统一：使用推特风格的半透明吸顶导航 */}
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/80 backdrop-blur-md z-10 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <h1 className="text-2xl font-black text-gray-900">我的粉丝</h1>
        <button 
          onClick={() => router.back()} 
          className="text-sm font-bold text-octo-orange hover:bg-orange-50 px-3 py-1.5 rounded-full transition-colors"
        >
          ← 返回
        </button>
      </div>
      
      {loading ? (
        <div className="text-center text-[#FF8C00] font-bold py-10 animate-pulse">加载中...</div>
      ) : profiles.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-2xl border border-dashed border-gray-300">
          还没有粉丝，快去发帖吸引关注吧！
        </div>
      ) : (
        <div className="grid gap-4">
          {profiles.map(profile => (
            <div key={profile.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
              <Link href={`/user/${profile.id}`} className="shrink-0">
                {/* 🌟 头像托底：如果没有上传图片，自动显示首字母渐变头像，防止图片裂开 */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF8C00] to-yellow-400 flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                  ) : (
                    (profile.username || 'U').charAt(0).toUpperCase()
                  )}
                </div>
              </Link>
              <div className="flex-1">
                <Link href={`/user/${profile.id}`}>
                  <h3 className="font-bold text-gray-900 hover:text-octo-orange transition-colors cursor-pointer">
                    {profile.username || '未知用户'}
                  </h3>
                </Link>
                <p className="text-xs text-gray-500 line-clamp-1">
                  {profile.bio || '这家伙很懒，什么都没留下...'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}