// src/app/post/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import PostList from '@/components/PostList';
import CommentItem from '@/components/CommentItem';
import { useParams } from 'next/navigation';

export default function PostDetailPage() {
  const params = useParams();
  const postId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      setIsAuthLoaded(true);
    };
    initUser();
  }, []);

  const fetchPostDetails = useCallback(async () => {
    if (!postId) return;

    // 🌟 修复：拉取 bookmarks(count)
    const { data: postData } = await supabase
      .from('posts')
      .select('*, quote_post:quote_post_id(id, content, image_urls, username), likes(count), comments(count), bookmarks(count), reposts(count)')
      .eq('id', postId)
      .single();

    if (postData) {
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', postData.author_id)
        .single();

      let myLike = null, myMark = null, myRepost = null;
      if (currentUserId) {
        const [l, m, r] = await Promise.all([
          supabase.from('likes').select('id').match({ post_id: postId, user_id: currentUserId }).maybeSingle(),
          supabase.from('bookmarks').select('id').match({ post_id: postId, user_id: currentUserId }).maybeSingle(), // 🌟 修复：去 bookmarks 表查
          supabase.from('reposts').select('id').match({ post_id: postId, user_id: currentUserId }).maybeSingle()
        ]);
        myLike = l.data; myMark = m.data; myRepost = r.data;
      }

      const formattedPost = {
        ...postData,
        username: authorProfile?.username || '未知用户',
        avatar_url: authorProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${postData.author_id}`,
        _interactions: {
          likes: postData.likes?.[0]?.count || 0,
          marks: postData.bookmarks?.[0]?.count || 0, // 🌟 修复：展示 bookmarks count
          comments: postData.comments?.[0]?.count || 0,
          reposts: postData.reposts?.[0]?.count || 0,
          likedByMe: !!myLike, markedByMe: !!myMark, repostedByMe: !!myRepost, isFollowingAuthor: false 
        }
      };
      setPost(formattedPost);
    }
    setLoading(false);
  }, [postId, currentUserId]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (!commentsData || commentsData.length === 0) {
      setComments([]);
      return;
    }

    const userIds = Array.from(new Set(commentsData.map((c: any) => c.user_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);
    
    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);
    const commentMap = new Map();

    commentsData.forEach((c: any) => {
      commentMap.set(c.id, { 
        ...c, 
        user: profileMap.get(c.user_id) || { username: '未知用户', avatar_url: null },
        children: [],
        _interactions: { likes: 0, marks: 0, reposts: 0, likedByMe: false, markedByMe: false, repostedByMe: false }
      });
    });

    const rootComments: any[] = [];

    commentsData.forEach((c: any) => {
      const commentWithData = commentMap.get(c.id);
      if (c.parent_id && commentMap.has(c.parent_id)) {
        commentMap.get(c.parent_id).children.push(commentWithData);
      } else {
        rootComments.push(commentWithData);
      }
    });

    setComments(rootComments);
  }, [postId]);

  useEffect(() => {
    if (isAuthLoaded && postId) { 
      fetchPostDetails();
      fetchComments();
    }
  }, [postId, isAuthLoaded, fetchPostDetails, fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      if (!currentUserId) throw new Error('请先登录');

      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUserId,
        content: newComment.trim()
      });

      if (error) throw error;

      setNewComment('');
      fetchComments(); 
    } catch (err: any) {
      alert('评论失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-octo-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-900">帖子详情</h1>
          <Link href="/" className="text-sm font-bold text-octo-orange hover:underline">← 返回首页</Link>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">加载中...</div>
        ) : !post ? (
          <div className="text-center text-gray-500">帖子不存在或已被删除</div>
        ) : (
          <>
            <PostList posts={[post]} fetching={false} currentUserId={currentUserId} />

            <div className="mt-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="留下你的评论..."
                className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-octo-orange/20 transition-all resize-none text-sm"
                rows={3}
              />
              <div className="flex justify-end mt-2">
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
              <h3 className="text-lg font-bold text-gray-800 mb-4 pl-2 border-l-4 border-blue-400">
                评论区
              </h3>
              <div className="space-y-4">
                {comments.map((comment: any) => (
                  <CommentItem 
                    key={comment.id} 
                    comment={comment} 
                    postId={postId as string}
                    currentUserId={currentUserId}
                    onReplySuccess={fetchComments} 
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}