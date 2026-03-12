'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

// 1. 定义类型，防止 Vercel 严格的 TS 检查报错
interface Profile {
  id: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
}

export default function DiscoverPage() {
  const router = useRouter();
  // 2. 替换掉 any[]
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id || '');

      if (profilesError) {
        console.error("🚨 获取博主列表失败:", profilesError.message);
      }

      const { data: allFollows, error: followsError } = await supabase
        .from('follows')
        .select('follower_id, following_id');

      if (followsError) {
         console.error("🚨 获取关注列表失败:", followsError.message);
      }

      const statsMap: Record<string, { followers: number; following: number }> = {};
      profilesData?.forEach(p => {
        statsMap[p.id] = { followers: 0, following: 0 };
      });

      const myFollowingSet = new Set<string>();

      allFollows?.forEach(f => {
        if (f.follower_id === user?.id) myFollowingSet.add(f.following_id);
        if (statsMap[f.following_id]) statsMap[f.following_id].followers++;
        if (statsMap[f.follower_id]) statsMap[f.follower_id].following++;
      });

      if (profilesData) {
        // 确保映射后的数据符合 Profile 接口
        const enrichedProfiles: Profile[] = profilesData.map((p) => ({
          ...p,
          followersCount: statsMap[p.id]?.followers || 0,
          followingCount: statsMap[p.id]?.following || 0
        }));
        
        enrichedProfiles.sort((a, b) => b.followersCount - a.followersCount);
        setProfiles(enrichedProfiles);
      }

      setFollowingIds(myFollowingSet);
      
    } catch (error) {
      console.error("代码运行崩溃:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation(); 
    if (!currentUser) return alert('请先登录');

    const isFollowing = followingIds.has(targetId);
    
    if (isFollowing) {
      const { error } = await supabase.from('follows').delete().match({ follower_id: currentUser.id, following_id: targetId });
      if (!error) {
        const newSet = new Set(followingIds);
        newSet.delete(targetId);
        setFollowingIds(newSet);
      }
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetId });
      if (!error) {
        const newSet = new Set(followingIds);
        newSet.add(targetId);
        setFollowingIds(newSet);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">发现博主</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">发现章鱼房间里有趣的灵魂</p>
          </div>
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm transition-colors">
            ← 返回主页
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {profiles.map((profile, index) => {
              const isFollowing = followingIds.has(profile.id);
              
              return (
                <div 
                  key={profile.id} 
                  onClick={() => router.push(`/user/${profile.id}`)}
                  className={`flex items-start gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors ${
                    index !== profiles.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* 左侧：头像 */}
                  {/* 3. 添加 lint 忽略注释，防止 Vercel 拦截 img 标签 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} 
                    className="w-12 h-12 rounded-full border border-gray-100 object-cover shrink-0 bg-gray-50" 
                    alt={profile.username || 'user avatar'} 
                  />
                  
                  {/* 右侧：信息与按钮 */}
                  <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col min-w-0 pr-4">
                        <h3 className="font-bold text-[15px] text-gray-900 hover:underline truncate">
                          {profile.username || '神秘用户'}
                        </h3>
                        <span className="text-[13px] text-gray-500 truncate">
                           @{profile.id.substring(0, 8)}
                        </span>
                      </div>
                      
                      <button
                        onClick={(e) => toggleFollow(e, profile.id)}
                        className={`group px-4 py-1.5 rounded-full text-[14px] font-bold transition-all shrink-0 border ${
                          isFollowing
                            ? 'bg-white border-gray-300 text-gray-900 hover:border-red-200 hover:bg-red-50 hover:text-red-600 w-[96px]'
                            : 'bg-gray-900 border-gray-900 text-white hover:bg-gray-800 hover:border-gray-800 w-[76px]'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <span className="group-hover:hidden">已关注</span>
                            <span className="hidden group-hover:inline">取消关注</span>
                          </>
                        ) : (
                          '关注'
                        )}
                      </button>
                    </div>
                    
                    <p className="text-[14px] text-gray-900 mt-1 mb-2.5 leading-relaxed line-clamp-2">
                      {profile.bio || '这个人很懒，还没有写简介...'}
                    </p>
                    
                    <div className="flex items-center gap-4 text-[13px] text-gray-500">
                      <span className="hover:underline">
                        <span className="font-bold text-gray-900">{profile.followingCount}</span> 正在关注
                      </span>
                      <span className="hover:underline">
                        <span className="font-bold text-gray-900">{profile.followersCount}</span> 关注者
                      </span>
                    </div>

                  </div>
                </div>
              );
            })}
            
            {profiles.length === 0 && (
              <div className="p-10 text-center text-gray-500 text-sm font-medium">
                目前还没有发现其他博主
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}