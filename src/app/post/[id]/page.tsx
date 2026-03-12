// src/app/post/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import PostList from '@/components/PostList';

const renderContentWithMentions = (text: string, router: any) => {
  if (!text) return null;
  const handleMentionClick = async (e: React.MouseEvent, username: string) => {
    e.stopPropagation(); 
    try {
      const { data } = await supabase.from('profiles').select('id').eq('username', username).limit(1).maybeSingle();
      if (data && data.id) {
        router.push(`/user/${data.id}`);
      } else {
        alert('该用户不存在或已改名');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const parts = text.split(/(@[a-zA-Z0-9_\u4e00-\u9fa5]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <span 
          key={i} 
          className="text-blue-500 hover:text-blue-600 font-bold cursor-pointer hover:underline transition-colors"
          onClick={(e) => handleMentionClick(e, username)}
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 🌟 新增：评论区的 @ 用户联想状态
  const [mentionState, setMentionState] = useState<{ query: string, start: number, end: number, type: 'comment' | 'reply' } | null>(null);
  const [mentionUsers, setMentionUsers] = useState<any[]>([]);

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    initUser();
  }, []);

  const handleMentionCheck = async (e: React.ChangeEvent<HTMLTextAreaElement>, val: string, type: 'comment' | 'reply') => {
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\u4e00-\u9fa5]*)$/);

    if (match) {
      const query = match[1];
      setMentionState({ query, start: cursor - match[0].length, end: cursor, type });
      if (query) {
        const { data } = await supabase.from('profiles').select('id, username, avatar_url').ilike('username', `%${query}%`).limit(5);
        setMentionUsers(data || []);
      } else {
        const { data } = await supabase.from('profiles').select('id, username, avatar_url').limit(5);
        setMentionUsers(data || []);
      }
    } else {
      setMentionState(null);
      setMentionUsers([]);
    }
  };

  const insertMention = (username: string) => {
    if (!mentionState) return;
    if (mentionState.type === 'comment') {
      const before = newComment.slice(0, mentionState.start);
      const after = newComment.slice(mentionState.end);
      setNewComment(`${before}@${username} ${after}`);
    } else {
      const before = replyText.slice(0, mentionState.start);
      const after = replyText.slice(mentionState.end);
      setReplyText(`${before}@${username} ${after}`);
    }
    setMentionState(null);
    setMentionUsers([]);
  };

  const fetchPostDetails = useCallback(async () => {
    if (!postId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const localUserId = user?.id || null;

    const { data: postData, error } = await supabase
      .from('posts')
      .select('*, quote_post:quote_post_id(id, content, image_urls, username), likes(count), comments(count), bookmarks(count), reposts(count)')
      .eq('id', postId)
      .maybeSingle();

    if (error) { console.error('获取帖子失败:', error); setLoading(false); return; }

    if (postData) {
      const { data: authorProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', postData.author_id).maybeSingle();
      let likedByMe = false, markedByMe = false, repostedByMe = false, isFollowingAuthor = false;
      if (localUserId) {
        const [l, m, r, f] = await Promise.all([
          supabase.from('likes').select('post_id').eq('user_id', localUserId).eq('post_id', postId),
          supabase.from('bookmarks').select('post_id').eq('user_id', localUserId).eq('post_id', postId),
          supabase.from('reposts').select('post_id').eq('user_id', localUserId).eq('post_id', postId),
          supabase.from('follows').select('following_id').eq('follower_id', localUserId).eq('following_id', postData.author_id)
        ]);
        likedByMe = (l.data || []).length > 0; markedByMe = (m.data || []).length > 0; repostedByMe = (r.data || []).length > 0; isFollowingAuthor = (f.data || []).length > 0;
      }
      setPost({
        ...postData, username: authorProfile?.username || '未知用户', avatar_url: authorProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${postData.author_id}`,
        _interactions: { likes: Array.isArray(postData.likes) ? postData.likes[0]?.count : (postData.likes?.count || 0), comments: Array.isArray(postData.comments) ? postData.comments[0]?.count : (postData.comments?.count || 0), marks: Array.isArray(postData.bookmarks) ? postData.bookmarks[0]?.count : (postData.bookmarks?.count || 0), reposts: Array.isArray(postData.reposts) ? postData.reposts[0]?.count : (postData.reposts?.count || 0), likedByMe, markedByMe, repostedByMe, isFollowingAuthor }
      });
    }
    setLoading(false);
  }, [postId]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    const { data: commentsData } = await supabase.from('comments').select('id, user_id, content, created_at').eq('post_id', postId).order('created_at', { ascending: true });
    if (commentsData && commentsData.length > 0) {
      const userIds = Array.from(new Set(commentsData.map((c: any) => c.user_id)));
      const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
      const profileMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);
      setComments(commentsData.map((c: any) => ({ ...c, user: profileMap.get(c.user_id) || { username: '未知用户', avatar_url: null } })));
    } else setComments([]);
  }, [postId]);

  useEffect(() => { fetchPostDetails(); fetchComments(); }, [fetchPostDetails, fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUserId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: currentUserId, content: newComment.trim() });
      if (error) throw error;
      setNewComment(''); setMentionState(null); fetchComments(); fetchPostDetails(); 
    } catch (err: any) { alert('评论失败: ' + err.message); } finally { setSubmitting(false); }
  };

  const handleSubmitReply = async (targetComment: any) => {
    if (!replyText.trim() || !currentUserId) return;
    setSubmittingReply(true);
    try {
      const finalContent = `回复 @${targetComment.user?.username || '未知用户'}：${replyText.trim()}`;
      const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: currentUserId, content: finalContent });
      if (error) throw error;
      setReplyingToId(null); setReplyText(''); setMentionState(null); fetchComments(); fetchPostDetails(); 
    } catch (err: any) { alert('回复失败: ' + err.message); } finally { setSubmittingReply(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    const isConfirmed = window.confirm('确定要删除这条评论吗？此操作不可撤销。');
    if (!isConfirmed) return;
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== commentId)); fetchPostDetails(); 
    } catch (err: any) { alert('删除失败: ' + err.message); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF8C00]"></div></div>;
  if (!post) return <div className="text-center py-20 text-gray-500">帖子不存在或已被删除</div>;

  return (
    <div className="p-4 sm:p-6 pb-20">
      
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/80 backdrop-blur-md z-10 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-gray-100">
        <h1 className="text-2xl font-black text-gray-900">动态详情</h1>
        <button onClick={() => router.back()} className="text-sm font-bold text-[#FF8C00] hover:bg-orange-50 px-3 py-1.5 rounded-full transition-colors">← 返回</button>
      </div>

      <div className="-mt-8">
        <PostList posts={[post]} currentUserId={currentUserId} fetching={false} />
      </div>

      <div className="mt-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm focus-within:border-[#FF8C00] focus-within:ring-1 focus-within:ring-[#FF8C00] transition-all relative">
        {/* 🌟 主评论的 @ 联想浮窗 */}
        {mentionState?.type === 'comment' && mentionUsers.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500">选择要 @ 的用户</div>
            {mentionUsers.map(user => (
              <div key={user.id} onClick={() => insertMention(user.username)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors">
                <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="avatar" className="w-8 h-8 rounded-full bg-gray-100 object-cover" />
                <span className="text-sm font-bold text-gray-800">{user.username}</span>
              </div>
            ))}
          </div>
        )}
        <textarea
          value={newComment}
          onChange={(e) => { setNewComment(e.target.value); handleMentionCheck(e, e.target.value, 'comment'); }}
          placeholder="写下你的评论... (输入 @ 提及别人)"
          className="w-full p-2 bg-transparent outline-none resize-none text-[15px] text-gray-800 placeholder-gray-400"
          rows={3}
        />
        <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400 font-medium tracking-wider">{newComment.length} / 500</span>
          <button onClick={handleSubmitComment} disabled={submitting || !newComment.trim()} className="bg-[#FF8C00] text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-[#E67E00] transition-colors disabled:opacity-50 disabled:hover:bg-[#FF8C00]">{submitting ? '发送中...' : '发评论'}</button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4 pl-2 border-l-4 border-[#FF8C00]">全部评论 ({comments.length})</h3>
        
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 font-medium text-sm border-2 border-dashed border-gray-200 rounded-2xl">还没有人评论，快来抢沙发吧！</div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: any) => (
              <div key={comment.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:border-orange-100 group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF8C00] to-yellow-400 flex items-center justify-center text-white text-[15px] font-bold shrink-0 overflow-hidden mt-0.5">
                    {comment.user?.avatar_url ? <img src={comment.user.avatar_url} className="w-full h-full object-cover" alt="avatar" /> : (comment.user?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-gray-900 truncate">{comment.user?.username || '未知用户'}</span>
                        <span className="text-[11px] text-gray-400 font-medium shrink-0 ml-1">{new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setReplyingToId(replyingToId === comment.id ? null : comment.id); setReplyText(''); setMentionState(null); }} className="text-[12px] font-bold text-gray-500 hover:text-[#FF8C00] bg-gray-50 hover:bg-orange-50 px-2.5 py-1 rounded-full transition-colors">回复</button>
                        {currentUserId === comment.user_id && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="text-gray-400 hover:text-red-500 bg-transparent hover:bg-red-50 p-1 rounded-full transition-colors shrink-0" title="删除评论">
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-800 text-[14px] mt-1.5 leading-relaxed break-words">
                      {comment.content.startsWith('回复 @') ? (
                        <><span className="text-[#FF8C00] font-medium mr-1">{comment.content.split('：')[0]}：</span>{renderContentWithMentions(comment.content.split('：').slice(1).join('：'), router)}</>
                      ) : renderContentWithMentions(comment.content, router)}
                    </p>

                    {replyingToId === comment.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 relative">
                        {/* 🌟 子回复框的 @ 联想浮窗 */}
                        {mentionState?.type === 'reply' && mentionUsers.length > 0 && (
                          <div className="absolute bottom-full left-0 mb-1 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500">选择要 @ 的用户</div>
                            {mentionUsers.map(user => (
                              <div key={user.id} onClick={() => insertMention(user.username)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors">
                                <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="avatar" className="w-8 h-8 rounded-full bg-gray-100 object-cover" />
                                <span className="text-sm font-bold text-gray-800">{user.username}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <textarea
                          autoFocus
                          value={replyText}
                          onChange={(e) => { setReplyText(e.target.value); handleMentionCheck(e, e.target.value, 'reply'); }}
                          placeholder={`回复 @${comment.user?.username || '用户'}... (输入 @ 提及别人)`}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-[13px] text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#FF8C00]/20 focus:border-[#FF8C00]/50 transition-all resize-none"
                          rows={2}
                        />
                        <div className="flex justify-end mt-2 gap-2">
                          <button onClick={() => { setReplyingToId(null); setReplyText(''); setMentionState(null); }} className="px-4 py-1.5 rounded-full text-[12px] font-bold text-gray-500 hover:bg-gray-100 transition-colors">取消</button>
                          <button onClick={() => handleSubmitReply(comment)} disabled={!replyText.trim() || submittingReply} className="px-4 py-1.5 rounded-full text-[12px] font-bold text-white bg-[#FF8C00] hover:bg-[#e07b00] disabled:opacity-50 transition-colors shadow-sm min-w-[60px]">{submittingReply ? '发送中...' : '发送'}</button>
                        </div>
                      </div>
                    )}

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