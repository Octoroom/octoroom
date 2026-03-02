// src/components/CommentItem.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface CommentItemProps {
  comment: any;
  postId: string;
  currentUserId: string | null;
  onReplySuccess: () => void;
}

export default function CommentItem({ 
  comment, 
  postId, 
  currentUserId, 
  onReplySuccess 
}: CommentItemProps) {
  // 乐观更新状态
  const [interactions, setInteractions] = useState({
    likes: comment._interactions?.likes || 0,
    marks: comment._interactions?.marks || 0,
    reposts: comment._interactions?.reposts || 0,
    likedByMe: comment._interactions?.likedByMe || false,
    markedByMe: comment._interactions?.markedByMe || false,
    repostedByMe: comment._interactions?.repostedByMe || false,
  });

  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 处理对评论的互动 (赞、藏、转)
  const handleInteraction = async (action: 'like' | 'mark' | 'repost') => {
    if (!currentUserId) {
      alert('请先登录后操作');
      return;
    }

    try {
      if (action === 'like') {
        const isLiked = interactions.likedByMe;
        setInteractions(prev => ({ ...prev, likedByMe: !isLiked, likes: isLiked ? Math.max(0, prev.likes - 1) : prev.likes + 1 }));
        if (isLiked) await supabase.from('comment_likes').delete().match({ comment_id: comment.id, user_id: currentUserId });
        else await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: currentUserId });
      } 
      else if (action === 'mark') {
        const isMarked = interactions.markedByMe;
        setInteractions(prev => ({ ...prev, markedByMe: !isMarked, marks: isMarked ? Math.max(0, prev.marks - 1) : prev.marks + 1 }));
        if (isMarked) await supabase.from('comment_dislikes').delete().match({ comment_id: comment.id, user_id: currentUserId });
        else await supabase.from('comment_dislikes').insert({ comment_id: comment.id, user_id: currentUserId });
      }
      else if (action === 'repost') {
        const isReposted = interactions.repostedByMe;
        setInteractions(prev => ({ ...prev, repostedByMe: !isReposted, reposts: isReposted ? Math.max(0, prev.reposts - 1) : prev.reposts + 1 }));
        if (isReposted) await supabase.from('comment_reposts').delete().match({ comment_id: comment.id, user_id: currentUserId });
        else await supabase.from('comment_reposts').insert({ comment_id: comment.id, user_id: currentUserId });
      }
    } catch (err: any) {
      console.error('操作失败', err);
    }
  };

  // 提交子评论（回复）
  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !currentUserId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUserId,
        content: replyContent.trim(),
        parent_id: comment.id // 🌟 核心：记录这是回复哪条评论的
      });
      if (error) throw error;
      setReplyContent('');
      setIsReplying(false);
      onReplySuccess(); // 触发页面重新拉取整棵评论树
    } catch (err: any) {
      alert('回复失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4">
      {/* 评论头部 */}
      <div className="flex items-center space-x-2 mb-2">
        <Link href={`/user/${comment.user_id}`} className="flex items-center space-x-2 group">
          <img 
            src={comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${comment.user?.username || 'U'}&background=random`} 
            className="w-8 h-8 rounded-full bg-gray-100 group-hover:opacity-80 transition-opacity" 
            alt="avatar" 
          />
          <span className="text-sm font-bold text-gray-700 group-hover:text-octo-orange group-hover:underline transition-colors">
            {comment.user?.username || '未知用户'}
          </span>
        </Link>
        <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
      </div>
      
      {/* 评论内容 */}
      <p className="text-gray-800 text-sm mb-3">{comment.content}</p>

      {/* 评论互动区 */}
      <div className="flex items-center space-x-6 text-gray-400 mt-1">
        
        {/* 回复按钮 */}
        <button onClick={() => setIsReplying(!isReplying)} className="flex items-center space-x-1.5 group hover:text-blue-500 transition-colors">
          <div className="p-1.5 rounded-full group-hover:bg-blue-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
          </div>
          <span className="text-xs font-medium">回复</span>
        </button>

        {/* 转发按钮 */}
        <button onClick={() => handleInteraction('repost')} className={`flex items-center space-x-1.5 group transition-colors ${interactions.repostedByMe ? 'text-green-500' : 'hover:text-green-500'}`}>
          <div className={`p-1.5 rounded-full transition-colors ${interactions.repostedByMe ? 'bg-green-50' : 'group-hover:bg-green-50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
            </svg>
          </div>
          <span className="text-xs font-medium">{interactions.reposts > 0 ? interactions.reposts : '转发'}</span>
        </button>

        {/* 点赞按钮 */}
        <button onClick={() => handleInteraction('like')} className={`flex items-center space-x-1.5 group transition-colors ${interactions.likedByMe ? 'text-pink-500' : 'hover:text-pink-500'}`}>
          <div className={`p-1.5 rounded-full transition-colors ${interactions.likedByMe ? 'bg-pink-50' : 'group-hover:bg-pink-50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill={interactions.likedByMe ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <span className="text-xs font-medium">{interactions.likes > 0 ? interactions.likes : '点赞'}</span>
        </button>

        {/* 收藏按钮 */}
        <button onClick={() => handleInteraction('mark')} className={`flex items-center space-x-1.5 group transition-colors ${interactions.markedByMe ? 'text-orange-500' : 'hover:text-orange-500'}`}>
          <div className={`p-1.5 rounded-full transition-colors ${interactions.markedByMe ? 'bg-orange-50' : 'group-hover:bg-orange-50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill={interactions.markedByMe ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </div>
          <span className="text-xs font-medium">{interactions.marks > 0 ? interactions.marks : '收藏'}</span>
        </button>
      </div>

      {/* 回复输入框 */}
      {isReplying && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`回复 @${comment.user?.username}...`}
            className="flex-1 p-2 bg-gray-50 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
            autoFocus
          />
          <button 
            onClick={handleSubmitReply} 
            disabled={submitting || !replyContent.trim()} 
            className="bg-[#FF8C00] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#E67E00] transition-colors disabled:opacity-50 disabled:hover:bg-[#FF8C00]"
          >
            {submitting ? '发送中...' : '发送'}
          </button>
        </div>
      )}

      {/* 🌟 核心魔法：递归渲染子评论 (盖楼) */}
      {comment.children && comment.children.length > 0 && (
        <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-2 pt-2">
          {comment.children.map((child: any) => (
            <CommentItem 
              key={child.id} 
              comment={child} 
              postId={postId} 
              currentUserId={currentUserId} 
              onReplySuccess={onReplySuccess} 
            />
          ))}
        </div>
      )}
    </div>
  );
}