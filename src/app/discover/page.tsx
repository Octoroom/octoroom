'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DiscoverPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 1. 获取所有博主 (排除自己)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id || '');

      // 2. 获取所有的关注关系 (用于计算粉丝数和关注数)
      // 注意：这里为了前端快速实现拉取了全量 follows，后续数据量大了可以改写为 Supabase RPC 视图
      const { data: allFollows } = await supabase
        .from('follows')
        .select('follower_id, following_id');

      // 3. 计算每个人的数据
      const statsMap: Record<string, { followers: number; following: number }> = {};
      profilesData?.forEach(p => {
        statsMap[p.id] = { followers: 0, following: 0 };
      });

      const myFollowingSet = new Set<string>();

      allFollows?.forEach(f => {
        // 记录我关注的人
        if (f.follower_id === user?.id) {
          myFollowingSet.add(f.following_id);
        }
        // 计算全站用户的粉丝数
        if (statsMap[f.following_id]) {
          statsMap[f.following_id].followers++;
        }
        // 计算全站用户的关注数
        if (statsMap[f.follower_id]) {
          statsMap[f.follower_id].following++;
        }
      });

      // 4. 组装最终数据
      if (profilesData) {
        const enrichedProfiles = profilesData.map(p => ({
          ...p,
          followersCount: statsMap[p.id]?.followers || 0,
          followingCount: statsMap[p.id]?.following || 0
        }));
        
        // 可选：按粉丝数量排序，把热门博主排在前面
        enrichedProfiles.sort((a, b) => b.followersCount - a.followersCount);
        
        setProfiles(enrichedProfiles);
      }

      setFollowingIds(myFollowingSet);
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation(); // 阻止事件冒泡，防止触发跳转主页
    if (!currentUser) return alert('请先登录');

    const isFollowing = followingIds.has(targetId);
    
    if (isFollowing) {
      // 取消关注
      const { error } = await supabase.from('follows').delete().match({ follower_id: currentUser.id, following_id: targetId });
      if (!error) {
        const newSet = new Set(followingIds);
        newSet.delete(targetId);
        setFollowingIds(newSet);
      }
    } else {
      // 关注
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
                  <img 
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} 
                    className="w-12 h-12 rounded-full border border-gray-100 object-cover shrink-0 bg-gray-50" 
                    alt={profile.username} 
                  />
                  
                  {/* 右侧：信息与按钮 */}
                  <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                    
                    {/* 头部行：名字与按钮 */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col min-w-0 pr-4">
                        <h3 className="font-bold text-[15px] text-gray-900 hover:underline truncate">
                          {profile.username || '神秘用户'}
                        </h3>
                        {/* 如果没有设置特别的账号ID，可以使用邮箱前缀或占位符 */}
                        <span className="text-[13px] text-gray-500 truncate">
                           @{profile.id.substring(0, 8)}
                        </span>
                      </div>
                      
                      {/* 推特风关注按钮 */}
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
                    
                    {/* 简介区 */}
                    <p className="text-[14px] text-gray-900 mt-1 mb-2.5 leading-relaxed line-clamp-2">
                      {profile.bio || '这个人很懒，还没有写简介...'}
                    </p>
                    
                    {/* 数据统计区 */}
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