// src/app/my-comments/MyCommentsClient.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';

type TabType = 'sent' | 'received';

// 🌟 企业级 Fetcher: 拆分查询，彻底避免 Supabase 外键 Join 失败问题
const fetchComments = async (key: string, tab: TabType) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录');

  const currentUserId = user.id;

  if (tab === 'sent') {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, content, created_at, post_id')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!comments || comments.length === 0) return [];

    // 1. 先查帖子
    const postIds = [...new Set(comments.map(c => c.post_id))];
    const { data: postsData } = await supabase
      .from('posts')
      .select('id, content, image_urls, author_id')
      .in('id', postIds);
      
    // 2. 再查帖子作者
    const authorIds = [...new Set(postsData?.map(p => p.author_id) || [])];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', authorIds);

    const profileMap = new Map(profilesData?.map(p => [p.id, p]));
    const postMap = new Map(postsData?.map(p => [p.id, { ...p, username: profileMap.get(p.author_id)?.username || '未知用户' }]));

    return comments.map(c => {
      const originalPost = postMap.get(c.post_id);
      return {
        ...c,
        original_post: originalPost ? {
          content: originalPost.content,
          image_urls: originalPost.image_urls,
          username: originalPost.username
        } : null,
        user: { username: '我', avatar_url: user.user_metadata?.avatar_url }
      };
    });
  } else {
    // 收到评论的逻辑同理拆分优化
    const [ { data: myPosts }, { data: myComments } ] = await Promise.all([
      supabase.from('posts').select('id').eq('author_id', currentUserId),
      supabase.from('comments').select('id').eq('user_id', currentUserId)
    ]);

    const myPostIds = myPosts?.map(p => p.id) || [];
    const myCommentIds = myComments?.map(c => c.id) || [];

    if (myPostIds.length === 0 && myCommentIds.length === 0) return [];

    let receivedComments: any[] = [];

    if (myPostIds.length > 0) {
      const { data: postComments } = await supabase.from('comments').select('*').in('post_id', myPostIds).neq('user_id', currentUserId);
      if (postComments) receivedComments.push(...postComments);
    }

    if (myCommentIds.length > 0) {
      const { data: replies } = await supabase.from('comments').select('*').in('parent_id', myCommentIds).neq('user_id', currentUserId);
      const existingIds = new Set(receivedComments.map(c => c.id));
      replies?.forEach(r => { if (!existingIds.has(r.id)) receivedComments.push(r); });
    }

    receivedComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (receivedComments.length === 0) return [];

    // 独立查询用户和帖子
    const userIds = [...new Set(receivedComments.map(c => c.user_id))];
    const recPostIds = [...new Set(receivedComments.map(c => c.post_id))];

    const { data: commenterProfiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
    const { data: postsData } = await supabase.from('posts').select('id, content, image_urls, author_id').in('id', recPostIds);
    
    const postAuthorIds = [...new Set(postsData?.map(p => p.author_id) || [])];
    const { data: postAuthorProfiles } = await supabase.from('profiles').select('id, username').in('id', postAuthorIds);

    const commenterProfileMap = new Map(commenterProfiles?.map(p => [p.id, p]));
    const postAuthorProfileMap = new Map(postAuthorProfiles?.map(p => [p.id, p]));
    const postMap = new Map(postsData?.map(p => [p.id, { ...p, username: postAuthorProfileMap.get(p.author_id)?.username || '未知用户' }]));

    return receivedComments.map(c => {
      const originalPost = postMap.get(c.post_id);
      return {
        ...c,
        original_post: originalPost ? {
          content: originalPost.content,
          image_urls: originalPost.image_urls,
          username: originalPost.username
        } : null,
        user: commenterProfileMap.get(c.user_id) || { username: '未知用户', avatar_url: null }
      };
    });
  }
};

export default function MyCommentsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('sent');

  const { data: comments, error, isLoading, mutate } = useSWR(
    ['my-comments', activeTab], 
    ([key, tab]) => fetchComments(key, tab),
    { revalidateOnFocus: true, dedupingInterval: 5000 }
  );

  const handleDelete = async (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation(); 
    if (!confirm('确定要删除这条评论吗？')) return;

    const previousComments = comments;
    mutate(comments?.filter((c: any) => c.id !== commentId), false);

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      mutate();
    } catch (err: any) {
      alert('删除失败: ' + err.message);
      mutate(previousComments, false);
    }
  };

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between p-4 sm:p-6 sticky top-0 bg-white/90 backdrop-blur-md z-20 border-b border-gray-100">
        <h1 className="text-2xl font-black text-gray-900">我的评论</h1>
        <button onClick={() => router.back()} className="text-sm font-bold text-octo-orange hover:bg-orange-50 px-3 py-1.5 rounded-full transition-colors">
          ← 返回
        </button>
      </div>

      <div className="flex border-b border-gray-100 sticky top-[73px] bg-white/90 backdrop-blur-md z-10">
        <button 
          onClick={() => setActiveTab('sent')} 
          className={`flex-1 py-3.5 text-center font-bold transition-all relative ${activeTab === 'sent' ? 'text-black' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          我发出的
          {activeTab === 'sent' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#FF8C00] rounded-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('received')} 
          className={`flex-1 py-3.5 text-center font-bold transition-all relative ${activeTab === 'received' ? 'text-black' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          我收到的
          {activeTab === 'received' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#FF8C00] rounded-full"></div>}
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-4 bg-gray-50/30 min-h-screen">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 animate-pulse flex space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-10 bg-gray-50 rounded-xl mt-2 w-full"></div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="text-center py-12 text-red-400 font-medium">获取数据失败，请检查网络或重试。</div>
        ) : comments?.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium text-sm">
              {activeTab === 'sent' ? '你还没有留下过任何评论喔' : '暂时还没有收到任何评论或回复'}
            </p>
          </div>
        ) : (
          comments?.map((comment: any) => (
            <div 
              key={comment.id}
              onClick={() => router.push(`/post/${comment.post_id}`)}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#FF8C00]/30 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF8C00] to-yellow-400 flex items-center justify-center text-white font-bold overflow-hidden shrink-0 shadow-sm">
                    {comment.user?.avatar_url ? (
                      <img src={comment.user.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                    ) : (
                      (comment.user?.username || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-gray-900 leading-tight">
                      {comment.user?.username || '未知用户'}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {activeTab === 'sent' && (
                  <button 
                    onClick={(e) => handleDelete(e, comment.id)}
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title="删除评论"
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                )}
              </div>

              <p className="text-gray-800 text-[14.5px] mb-3 pl-11 leading-relaxed">
                {comment.content}
              </p>

              <div className="ml-11">
                {comment.original_post ? (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden hover:border-[#FF8C00]/30 transition-colors shadow-sm flex flex-col sm:flex-row">
                    {comment.original_post.image_urls?.[0] && (
                      <div className="w-full sm:w-28 h-28 shrink-0 bg-gray-100 overflow-hidden">
                        <img 
                          src={comment.original_post.image_urls[0]} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          alt="原帖配图" 
                        />
                      </div>
                    )}
                    <div className="p-3 flex-1 min-w-0 flex flex-col justify-center">
                      <span className="text-xs font-bold text-gray-900 mb-1">
                        {activeTab === 'sent' ? `评论了 @${comment.original_post.username} 的帖子` : `来自 @${comment.original_post.username} 的帖子`}
                      </span>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {comment.original_post.content || '分享了图片'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-400 flex items-center gap-2">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-300">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    抱歉，该原帖已被作者删除
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}