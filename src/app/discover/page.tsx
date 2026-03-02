'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DiscoverPage() {
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

      if (profilesData) setProfiles(profilesData);

      // 2. 获取我已关注的人
      if (user) {
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        if (followsData) {
          setFollowingIds(new Set(followsData.map(f => f.following_id)));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (targetId: string) => {
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
    <div className="min-h-screen bg-octo-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black text-octo-orange italic">发现博主</h1>
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-octo-orange transition-colors">
            ← 返回章鱼房间
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">正在搜索信号...</div>
        ) : (
          <div className="grid gap-4">
            {profiles.map(profile => (
              <div key={profile.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all">
                <div className="flex items-center space-x-4">
                  <Link href={`/user/${profile.id}`}>
                    <img src={profile.avatar_url} className="w-14 h-14 rounded-full bg-gray-100 border-2 border-white shadow-sm cursor-pointer hover:opacity-90 transition-opacity" alt="avatar" />
                  </Link>
                  <div>
                    <Link href={`/user/${profile.id}`}>
                      <h3 className="font-bold text-gray-900 text-lg hover:text-octo-orange transition-colors cursor-pointer">{profile.username}</h3>
                    </Link>
                    <p className="text-sm text-gray-500">{profile.bio}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleFollow(profile.id)}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                    followingIds.has(profile.id)
                      ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      : 'bg-octo-orange text-white hover:bg-[#E67E00] shadow-sm hover:shadow-md'
                  }`}
                >
                  {followingIds.has(profile.id) ? '已关注' : '关注'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}