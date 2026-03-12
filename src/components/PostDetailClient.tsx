// src/components/PostDetailClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import PostList from '@/components/PostList';
import useSWR from 'swr'; 

interface PostDetailClientProps {
  post: any;
  initialComments: any[];
  postId: string;
}

export default function PostDetailClient({ post, initialComments, postId }: PostDetailClientProps) {
  const router = useRouter();
  const [comments, setComments] = useState<any[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 🌟 核心修复 1：利用 localStorage 实现0延迟获取 currentUserId
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('octo_room_user_id');
    return null;
  });

  useEffect(() => {
    // 异步兜底，防止 localStorage 被清空
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
        localStorage.setItem('octo_room_user_id', data.user.id);
      }
    });
  }, []);

  const { data, mutate } = useSWR(
    postId ? `post-${postId}` : null,
    async () => {
      const localUserId = typeof window !== 'undefined' ? localStorage.getItem('octo_room_user_id') : null;

      const { data: countsData } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url), quote_post:quote_post_id(id, content, image_urls, username), likes(count), comments(count), bookmarks(count), reposts(count)')
        .eq('id', postId)
        .single();

      const basePost = countsData ? {
        ...countsData,
        username: countsData.profiles?.username || '未知用户',
        avatar_url: countsData.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${countsData.author_id}`,
      } : post;

      let likedByMe = false, markedByMe = false, repostedByMe = false, isFollowingAuthor = false;

      if (localUserId) {
        const [l, m, r, f] = await Promise.all([
          supabase.from('likes').select('post_id').eq('user_id', localUserId).eq('post_id', postId),
          supabase.from('bookmarks').select('post_id').eq('user_id', localUserId).eq('post_id', postId),
          supabase.from('reposts').select('post_id').eq('user_id', localUserId).eq('post_id', postId),
          supabase.from('follows').select('following_id').eq('follower_id', localUserId).eq('following_id', basePost.author_id)
        ]);
        likedByMe = l.data && l.data.length > 0 ? true : false;
        markedByMe = m.data && m.data.length > 0 ? true : false;
        repostedByMe = r.data && r.data.length > 0 ? true : false;
        isFollowingAuthor = f.data && f.data.length > 0 ? true : false;
      }

      return {
        enrichedPost: {
          ...basePost,
          _interactions: {
            likes: Array.isArray(basePost.likes) ? basePost.likes[0]?.count : (basePost.likes?.count || 0),
            comments: Array.isArray(basePost.comments) ? basePost.comments[0]?.count : (basePost.comments?.count || 0),
            marks: Array.isArray(basePost.bookmarks) ? basePost.bookmarks[0]?.count : (basePost.bookmarks?.count || 0), 
            reposts: Array.isArray(basePost.reposts) ? basePost.reposts[0]?.count : (basePost.reposts?.count || 0),
            likedByMe,
            markedByMe,
            repostedByMe,
            isFollowingAuthor
          }
        },
        currentUserId: localUserId
      };
    },
    {
      revalidateOnFocus: false,
      fallbackData: {
        enrichedPost: post,
        currentUserId: typeof window !== 'undefined' ? localStorage.getItem('octo_room_user_id') : null
      }
    }
  );

  const enrichedPost = data?.enrichedPost || post;

  // 🌟 核心修复 2：查询时显式指定 user_id，杜绝查不到的情况
  const fetchComments = useCallback(async () => {
    if (!postId) return;
    const { data: commentsData } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at, post_id') 
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (commentsData && commentsData.length > 0) {
      const userIds = Array.from(new Set(commentsData.map((c: any) => c.user_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
      const commentsWithUser = commentsData.map((c: any) => ({
        ...c,
        user: profileMap.get(c.user_id) || { username: '未知用户', avatar_url: null }
      }));
      setComments(commentsWithUser);
    } else {
      setComments([]);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('请先登录');

      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim()
      });

      if (error) throw error;

      setNewComment('');
      fetchComments(); 
      
      if (data) {
        mutate({
          ...data,
          enrichedPost: {
            ...data.enrichedPost,
            _interactions: {
              ...data.enrichedPost._interactions,
              comments: (data.enrichedPost._interactions?.comments || 0) + 1
            }
          }
        }, false);
      }
    } catch (err: any) {
      alert('评论失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const isConfirmed = window.confirm('确定要删除这条评论吗？此操作不可撤销。');
    if (!isConfirmed) return;

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;

      // 1. 评论列表无缝去除
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      // 2. 主贴评论数字无缝 -1
      if (data) {
        mutate({
          ...data,
          enrichedPost: {
            ...data.enrichedPost,
            _interactions: {
              ...data.enrichedPost._interactions,
              comments: Math.max(0, (data.enrichedPost._interactions?.comments || 1) - 1)
            }
          }
        }, false);
      }
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-20">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/80 backdrop-blur-md z-10 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <h1 className="text-2xl font-black text-gray-900">帖子详情</h1>
        <button onClick={() => router.back()} className="text-sm font-bold text-octo-orange hover:bg-orange-50 px-3 py-1.5 rounded-full transition-colors">
          ← 返回
        </button>
      </div>

      <div className="-mt-8">
        <PostList posts={[enrichedPost]} currentUserId={currentUserId} fetching={false} />
      </div>

      <div className="mt-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm focus-within:border-[#FF8C00] focus-within:ring-1 focus-within:ring-[#FF8C00] transition-all">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="写下你的评论..."
          className="w-full p-2 bg-transparent outline-none resize-none text-sm font-medium text-gray-800 placeholder-gray-400"
          rows={3}
        />
        <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400 font-medium tracking-wider">{newComment.length} / 500</span>
          <button
            onClick={handleSubmitComment}
            disabled={submitting || !newComment.trim()}
            className="bg-[#FF8C00] text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-[#E67E00] transition-colors disabled:opacity-50 disabled:hover:bg-[#FF8C00]"
          >
            {submitting ? '发送中...' : '发评论'}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4 pl-2 border-l-4 border-[#FF8C00]">
          评论 ({comments.length})
        </h3>
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 font-medium text-sm border-2 border-dashed border-gray-200 rounded-2xl">
            还没有人评论，快来抢沙发吧！
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: any) => (
              <div key={comment.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                
                {/* 🌟 核心修复 3：全新的评论卡片排版 */}
                <div className="flex items-start gap-3">
                  {/* 头像 */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF8C00] to-yellow-400 flex items-center justify-center text-white text-[15px] font-bold shrink-0 overflow-hidden mt-0.5">
                    {comment.user?.avatar_url ? (
                      <img src={comment.user.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                    ) : (
                      (comment.user?.username || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  
                  {/* 核心内容区 */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-gray-900 truncate">
                          {comment.user?.username || '未知用户'}
                        </span>
                        
                        {/* 🌟 直接把红色删除按钮放在名字旁边！绝对不会被隐藏！ */}
                        {currentUserId === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full hover:bg-red-100 transition-colors shrink-0"
                          >
                            删除
                          </button>
                        )}
                      </div>
                      
                      {/* 时间 */}
                      <span className="text-[11px] text-gray-400 font-medium shrink-0">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* 评论内容 */}
                    <p className="text-gray-800 text-[14px] mt-1.5 leading-relaxed break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}