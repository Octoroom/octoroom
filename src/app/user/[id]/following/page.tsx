// src/app/user/[id]/following/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FollowingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!id) return;
      const targetId = Array.isArray(id) ? id[0] : id;

      try {
        // 1. 查出该博主关注了哪些人
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id, created_at')
          .eq('follower_id', targetId)
          .order('created_at', { ascending: false });

        if (!follows || follows.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const followingIds = follows.map(f => f.following_id);

        // 2. 去 profiles 表获取资料
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio')
          .in('id', followingIds);

        // 3. 🌟 核心映射：保证数据绝对联通
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedUsers = follows.map(f => {
          const profile = profileMap.get(f.following_id);
          return {
            id: f.following_id, // 核心：永远提供可跳转的 ID
            username: profile?.username || '神秘用户',
            avatar_url: profile?.avatar_url,
            bio: profile?.bio || '这个人很神秘，什么都没写...',
          };
        });

        setUsers(enrichedUsers);
      } catch (error) {
        console.error('获取关注列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [id]);

  return (
    <div className="p-4 sm:p-6 pb-20 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-50/90 backdrop-blur-md z-10 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <h1 className="text-2xl font-black text-gray-900">正在关注</h1>
        <button 
          onClick={() => router.back()} 
          className="text-sm font-bold text-octo-orange hover:bg-orange-50 px-3 py-1.5 rounded-full transition-colors"
        >
          ← 返回
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-[#FF8C00] font-bold animate-pulse">正在加载名单...</div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-gray-200 text-gray-400 font-medium">
          TA 还没有关注任何人哦。
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Link 
              key={user.id} 
              href={`/user/${user.id}`} 
              className="flex items-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF8C00] to-yellow-400 flex items-center justify-center text-white text-lg font-bold shrink-0 overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  (user.username || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate group-hover:text-[#FF8C00] transition-colors">
                  {user.username}
                </h3>
                <p className="text-sm text-gray-500 truncate mt-0.5">{user.bio}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}