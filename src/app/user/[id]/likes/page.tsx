// src/app/user/[id]/likes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import PostList from '@/components/PostList';

export default function UserLikesPage() {
  const { id } = useParams();
  const router = useRouter();
  
  // 确保拿到的是纯字符串 ID
  const targetId = Array.isArray(id) ? id[0] : id;

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLikes = async () => {
      if (!targetId) return;

      const localUserId = typeof window !== 'undefined' ? localStorage.getItem('octo_room_user_id') : null;
      setCurrentUserId(localUserId);

      try {
        // 1. 先去 likes 表查出该博主点赞过的所有 帖子ID
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id, created_at')
          .eq('user_id', targetId)
          .order('created_at', { ascending: false }); // 按点赞的时间倒序

        if (!likesData || likesData.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }

        const postIds = likesData.map(item => item.post_id);

        // 2. 拿着帖子 ID 去 posts 表获取完整的帖子信息和统计数据
        const { data: postsData } = await supabase
          .from('posts')
          .select('*, quote_post:quote_post_id(id, content, image_urls, username), likes(count), comments(count), bookmarks(count), reposts(count)')
          .in('id', postIds);

        if (!postsData || postsData.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }

        // 3. 获取这批帖子的原作者信息 (联通名字和头像)
        const authorIds = [...new Set(postsData.map(p => p.author_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', authorIds);

        const profileMap = new Map(profilesData?.map(p => [p.id, p]));

        // 4. 并发获取“我(当前访客)”对这些帖子的互动状态
        let myLikes: string[] = [], myMarks: string[] = [], myReposts: string[] = [];
        let myFollows: string[] = [];

        if (localUserId) {
          const [l, m, r, f] = await Promise.all([
            supabase.from('likes').select('post_id').eq('user_id', localUserId).in('post_id', postIds),
            supabase.from('bookmarks').select('post_id').eq('user_id', localUserId).in('post_id', postIds),
            supabase.from('reposts').select('post_id').eq('user_id', localUserId).in('post_id', postIds),
            supabase.from('follows').select('following_id').eq('follower_id', localUserId).in('following_id', authorIds)
          ]);
          myLikes = l.data?.map(i => i.post_id) || [];
          myMarks = m.data?.map(i => i.post_id) || [];
          myReposts = r.data?.map(i => i.post_id) || [];
          myFollows = f.data?.map(i => i.following_id) || [];
        }

        // 5. 拼装数据，并维持原来的点赞时间排序
        const postMap = new Map(postsData.map(p => [p.id, p]));
        
        const enrichedPosts = likesData.map(like => {
          const p = postMap.get(like.post_id);
          if (!p) return null; // 帖子如果被删除了就跳过
          
          const authorProfile = profileMap.get(p.author_id);
          return {
            ...p,
            username: authorProfile?.username || '未知用户',
            avatar_url: authorProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author_id}`,
            _interactions: {
              likes: p.likes?.[0]?.count || 0,
              comments: p.comments?.[0]?.count || 0,
              marks: p.bookmarks?.[0]?.count || 0,
              reposts: p.reposts?.[0]?.count || 0,
              likedByMe: myLikes.includes(p.id),
              markedByMe: myMarks.includes(p.id),
              repostedByMe: myReposts.includes(p.id),
              isFollowingAuthor: myFollows.includes(p.author_id)
            }
          };
        }).filter(Boolean); 

        setPosts(enrichedPosts);
      } catch (error) {
        console.error('获取点赞列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikes();
  }, [targetId]);

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-gray-50 border-x border-gray-100 pb-20">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-40 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100">
        <h1 className="text-[18px] sm:text-xl font-black text-gray-900">Ta 赞过的动态</h1>
        <button onClick={() => router.back()} className="text-[13px] sm:text-sm font-bold text-octo-orange hover:bg-orange-50 px-3 py-1.5 rounded-full transition-colors">
          ← 返回
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="text-center py-10">
            <div className="w-6 h-6 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[14px] text-gray-400 font-medium">Ta 还没有点赞过任何动态哦</p>
          </div>
        ) : (
          <PostList 
            posts={posts} 
            currentUserId={currentUserId} 
            fetching={false} 
            onDelete={() => {}} 
          />
        )}
      </div>
    </div>
  );
}