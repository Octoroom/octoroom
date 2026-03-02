// src/app/profile/likes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import PostList from '@/components/PostList';

export default function LikesPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      // 1. 获取我点赞的帖子 ID
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (likes && likes.length > 0) {
        const postIds = likes.map(l => l.post_id);

        // 2. 获取完整帖子数据
        const { data: postsData } = await supabase
          .from('posts')
          .select('*, quote_post:quote_post_id(id, content, image_urls, username), likes(count), comments(count), bookmarks(count), reposts(count)')
          .in('id', postIds)
          .order('created_at', { ascending: false });

        if (postsData) {
          // 3. 🌟 关键：获取所有作者的资料，映射头像和姓名
          const authorIds = Array.from(new Set(postsData.map(p => p.author_id)));
          const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url').in('id', authorIds);
          const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);

          // 4. 获取个人的其他互动状态（以便星标、转发按钮能正确显示）
          const [m, r] = await Promise.all([
            supabase.from('bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds),
            supabase.from('reposts').select('post_id').eq('user_id', user.id).in('post_id', postIds)
          ]);
          const myMarks = m.data?.map(i => i.post_id) || [];
          const myReposts = r.data?.map(i => i.post_id) || [];

          // 5. 数据拼装
          const enrichedPosts = postsData.map(p => ({
            ...p,
            username: profileMap.get(p.author_id)?.username || '未知用户',
            avatar_url: profileMap.get(p.author_id)?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author_id}`,
            _interactions: {
              likes: p.likes?.[0]?.count || 0,
              comments: p.comments?.[0]?.count || 0,
              marks: p.bookmarks?.[0]?.count || 0,
              reposts: p.reposts?.[0]?.count || 0,
              likedByMe: true, // 因为是点赞列表，所以爱心必定是亮起的
              markedByMe: myMarks.includes(p.id),
              repostedByMe: myReposts.includes(p.id),
              isFollowingAuthor: false
            }
          }));
          
          // 按点赞时间顺序排序
          const sortedEnrichedPosts = postIds.map(id => enrichedPosts.find(ep => ep.id === id)).filter(Boolean);
          setPosts(sortedEnrichedPosts);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-octo-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-octo-cream/90 backdrop-blur-md z-10 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <h1 className="text-2xl font-black text-pink-500">我赞过的</h1>
          <Link href="/profile" className="text-sm font-bold text-gray-500 hover:text-pink-500 transition-colors">
            ← 返回个人主页
          </Link>
        </div>
        
        <PostList posts={posts} fetching={loading} currentUserId={currentUserId} />
      </div>
    </div>
  );
}