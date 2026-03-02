// src/app/user/[id]/followers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FollowersPage() {
  const { id } = useParams();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!id) return;
      const targetId = Array.isArray(id) ? id[0] : id;

      try {
        // 1. 从 follows 表查出关注记录 (这是最准确的 ID 来源)
        const { data: follows, error: followsError } = await supabase
          .from('follows')
          .select('follower_id, created_at')
          .eq('following_id', targetId)
          .order('created_at', { ascending: false });

        if (followsError) throw new Error(`查关注表失败: ${followsError.message}`);

        if (!follows || follows.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const followerIds = follows.map(f => f.follower_id);

        // 2. 去 profiles 表获取资料
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio')
          .in('id', followerIds);

        if (profilesError) throw new Error(`查用户资料表失败: ${profilesError.message}`);

        // 3. 🌟 核心修复：手动映射关联！
        // 以 follows 表为主表，即使 profiles 里没有这个人的详细资料，也能保证 ID 联通，点击绝对能跳转！
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedUsers = follows.map(f => {
          const profile = profileMap.get(f.follower_id);
          return {
            id: f.follower_id, // 🌟 100% 保证有 ID，解决无法联通的问题
            username: profile?.username || '神秘用户',
            avatar_url: profile?.avatar_url,
            bio: profile?.bio || '这个人很神秘，什么都没写...',
          };
        });

        setUsers(enrichedUsers);
      } catch (err: any) {
        console.error("详细报错:", err);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [id]);

  return (
    <div className="p-4 sm:p-6 pb-20 max-w-2xl mx-auto">
      {/* 顶部吸顶导航 */}
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-50/90 backdrop-blur-md z-10 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <h1 className="text-2xl font-black text-gray-900">关注者 (粉丝)</h1>
        <button 
          onClick={() => router.back()} 
          className="text-sm font-bold text-octo-orange hover:bg-orange-50 px-3 py-1.5 rounded-full transition-colors"
        >
          ← 返回
        </button>
      </div>

      {/* 错误雷达 */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl mb-6 font-bold text-sm shadow-sm">
          <p>⚠️ 抓到报错了：</p>
          <p className="mt-1 font-mono break-words">{errorMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-[#FF8C00] font-bold animate-pulse">正在加载名单...</div>
      ) : users.length === 0 && !errorMsg ? (
        <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-gray-200 text-gray-400 font-medium">
          TA 还没有粉丝，快去支持一下吧！
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