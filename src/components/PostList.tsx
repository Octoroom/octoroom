// src/components/PostList.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface InteractionState {
  likes: number;
  comments: number;
  marks: number;
  reposts: number;
  likedByMe: boolean;
  markedByMe: boolean;
  repostedByMe: boolean;
  isFollowingAuthor: boolean;
}

interface PostListProps {
  posts: any[];
  currentUserId?: string | null;
  fetching: boolean;
  onDelete?: (id: string) => void;
}

// --- 🌟 Jira 风格的对话框组件 (Octoroom 品牌橙色版) ---
const DialogModal = ({ config }: { config: any }) => {
  const [inputValue, setInputValue] = useState(config?.defaultValue || '');

  if (!config) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
        </div>
        <div className="p-6">
          {config.type === 'prompt' ? (
            <textarea
              autoFocus
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent outline-none resize-none transition-shadow"
              rows={4}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="说点什么吧..."
            />
          ) : (
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{config.message}</p>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          {config.type !== 'alert' && (
            <button 
              onClick={config.onCancel} 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          )}
          <button 
            onClick={() => config.onConfirm(inputValue)} 
            className="px-4 py-2 text-sm font-medium text-white bg-[#FF8C00] rounded-lg hover:bg-[#e07b00] transition-colors shadow-sm"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PostList({ posts, currentUserId, fetching, onDelete }: PostListProps) {
  const router = useRouter();
  const [interactions, setInteractions] = useState<Record<string, InteractionState>>({});
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // --- 🌟 对话框状态与 Promise 封装 ---
  const [dialogConfig, setDialogConfig] = useState<any>(null);

  const asyncAlert = (title: string, message: string) => {
    return new Promise<void>((resolve) => {
      setDialogConfig({ type: 'alert', title, message, onConfirm: () => { resolve(); setDialogConfig(null); } });
    });
  };

  const asyncConfirm = (title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setDialogConfig({
        type: 'confirm', title, message,
        onConfirm: () => { resolve(true); setDialogConfig(null); },
        onCancel: () => { resolve(false); setDialogConfig(null); }
      });
    });
  };

  const asyncPrompt = (title: string, defaultValue: string) => {
    return new Promise<string | null>((resolve) => {
      setDialogConfig({
        type: 'prompt', title, defaultValue,
        onConfirm: (val: string) => { resolve(val); setDialogConfig(null); },
        onCancel: () => { resolve(null); setDialogConfig(null); }
      });
    });
  };
  // ----------------------------------------

  const handleMenuAction = async (action: string, post: any) => {
    setActiveMenuId(null);
    if (action === 'delete') {
      handleDelete(post);
      return;
    }
    
    // 🌟 登录拦截优化
    if (!currentUserId) { 
      const goToLogin = await asyncConfirm('需要登录', '操作前请先登录，是否现在前往登录页面？');
      if (goToLogin) {
        router.push('/login');
      }
      return; 
    }
    
    if (action === 'follow') {
      const current = interactions[post.id] || post._interactions;
      const newIsFollowing = !current.isFollowingAuthor;
      setInteractions(prev => ({ ...prev, [post.id]: { ...current, isFollowingAuthor: newIsFollowing } }));
      try {
        if (newIsFollowing) await supabase.from('follows').insert({ follower_id: currentUserId, following_id: post.author_id });
        else await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: post.author_id });
      } catch (e) {
        setInteractions(prev => ({ ...prev, [post.id]: { ...current, isFollowingAuthor: !newIsFollowing } }));
      }
    }
  };

  const handleInteraction = async (type: string, post: any) => {
    // 🌟 登录拦截优化
    if (!currentUserId) { 
      const goToLogin = await asyncConfirm('需要登录', '操作前请先登录，是否现在前往登录页面？');
      if (goToLogin) {
        router.push('/login');
      }
      return; 
    }

    const current = interactions[post.id] || post._interactions;
    let updates = { ...current };
    let table = '';
    
    if (type === '点赞') {
      updates.likedByMe = !current.likedByMe;
      updates.likes = current.likedByMe ? current.likes - 1 : current.likes + 1;
      table = 'likes';
    } else if (type === '收藏') {
      updates.markedByMe = !current.markedByMe;
      updates.marks = current.markedByMe ? current.marks - 1 : current.marks + 1;
      table = 'bookmarks';
    } else if (type === '转发') {
      if (!current.repostedByMe) {
        // 🌟 使用优雅的 Dialog 输入转发内容
        const quoteContent = await asyncPrompt('转发动态', `转发 @${post.username || '用户'} 的动态：\n`);
        if (quoteContent === null) return; // 用户点击了取消

        updates.repostedByMe = true;
        updates.reposts = current.reposts + 1;
        table = 'reposts';

        // 🌟 核心修复点：真正插入新帖子到 posts 表
        try {
          const { error: postError } = await supabase.from('posts').insert({
            author_id: currentUserId,
            content: quoteContent,
            quote_post_id: post.id // 关联原贴ID
          });
          if (postError) throw postError;
          await asyncAlert('成功', '转发成功！刷新页面后可见。');
        } catch (err: any) {
          await asyncAlert('错误', '生成转发动态失败: ' + err.message);
          return; 
        }
      } else {
        // 取消转发状态
        const isConfirmed = await asyncConfirm('取消转发', '确定要取消转发状态吗？\n(注: 已经生成的转发动态需手动前往主页删除)');
        if (!isConfirmed) return;
        
        updates.repostedByMe = false;
        updates.reposts = current.reposts - 1;
        table = 'reposts';
      }
    }

    setInteractions(prev => ({ ...prev, [post.id]: updates }));
    try {
      if (type === '点赞' ? updates.likedByMe : type === '收藏' ? updates.markedByMe : updates.repostedByMe) {
        await supabase.from(table).insert({ user_id: currentUserId, post_id: post.id });
      } else {
        await supabase.from(table).delete().match({ user_id: currentUserId, post_id: post.id });
      }
    } catch (e) {
      setInteractions(prev => ({ ...prev, [post.id]: current }));
    }
  };

  const handleDelete = async (post: any) => {
    // 🌟 删除帖子前使用自定义确认框
    const isConfirmed = await asyncConfirm('删除动态', '确定要删除这条动态吗？此操作不可撤销。');
    if (!isConfirmed) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      if (onDelete) onDelete(post.id);
    } catch (err: any) { 
      await asyncAlert('删除失败', err.message); 
    }
  };

  const handleNavigateToDetail = (post: any) => {
    if (post.companion_room_id) {
      router.push(`/companions/${post.companion_room_id}`);
    } else if (post.octo_room_id) {
      router.push(`/rooms/${post.octo_room_id}`); 
    } else {
      router.push(`/post/${post.id}`);
    }
  };

  if (fetching) return <div className="text-center py-10 text-gray-400">正在获取最新动态...</div>;
  if (!posts || posts.length === 0) return <div className="text-center py-10 text-gray-400">暂无动态</div>;

  return (
    <>
      {/* 🌟 挂载全局对话框组件 */}
      <DialogModal config={dialogConfig} />

      <div className="space-y-4">
        {posts.map((post) => {
          const state = interactions[post.id] || post._interactions || {
            likes: 0, comments: 0, marks: 0, reposts: 0,
            likedByMe: false, markedByMe: false, repostedByMe: false, isFollowingAuthor: false
          };

          return (
            <div 
              key={post.id} 
              onClick={() => handleNavigateToDetail(post)} 
              className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative group/card"
            >
              <div className="flex space-x-3 sm:space-x-4">
                <Link href={`/user/${post.author_id}`} onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#FF8C00] to-yellow-400 flex items-center justify-center text-white font-bold text-lg hover:ring-4 hover:ring-orange-100 transition-all">
                    {(post.username || 'U').charAt(0).toUpperCase()}
                  </div>
                </Link>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 sm:mb-2">
                    <div className="flex items-center space-x-2">
                      <Link href={`/user/${post.author_id}`} onClick={(e) => e.stopPropagation()}>
                        <span className="font-bold text-gray-900 hover:underline">{post.username || '未知用户'}</span>
                      </Link>
                      <span className="text-gray-400 text-xs sm:text-sm hidden sm:inline">· {new Date(post.created_at).toLocaleString()}</span>
                    </div>

                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === post.id ? null : post.id); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">•••</button>
                      {activeMenuId === post.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                          {currentUserId === post.author_id ? (
                            <button onClick={(e) => { e.stopPropagation(); handleMenuAction('delete', post); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">删除帖子</button>
                          ) : (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleMenuAction('follow', post); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">{state.isFollowingAuthor ? '取消关注' : '关注作者'}</button>
                              <button onClick={(e) => { e.stopPropagation(); handleMenuAction('block', post); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">屏蔽作者</button>
                              <button onClick={(e) => { e.stopPropagation(); handleMenuAction('report', post); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">举报帖子</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="block group-hover/card:bg-gray-50/50 rounded-lg -mx-2 px-2 py-1 transition-colors">
                    
                    {post.companion_room_id && (
                      <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-600 text-[11px] font-bold px-2.5 py-1 rounded-full mb-2 mt-1">
                        <svg fill="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M3 2.25a.75.75 0 01.75.75v.54l1.838-.46a9.75 9.75 0 016.725.738l.108.054a8.25 8.25 0 005.58.652l3.109-.732a.75.75 0 01.917.81 47.784 47.784 0 00.005 10.337.75.75 0 01-.574.812l-3.114.733a9.75 9.75 0 01-6.594-.77l-.108-.054a8.25 8.25 0 00-5.69-.625l-2.202.55V21a.75.75 0 01-1.5 0V3A.75.75 0 013 2.25z" clipRule="evenodd" />
                        </svg>
                        <span>结伴招募</span>
                      </div>
                    )}
                    {post.octo_room_id && (
                      <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold px-2.5 py-1 rounded-full mb-2 mt-1">
                        <svg fill="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5">
                          <path d="M11.47 3.84a.75.75 0 011.06 0l8.99 9a.75.75 0 11-1.06 1.06l-4.66-4.667V21a.75.75 0 01-.75.75h-3v-4.5a1.5 1.5 0 00-3 0V21h-3a.75.75 0 01-.75-.75v-11.76l-4.66 4.666a.75.75 0 11-1.06-1.06l8.99-9z" />
                        </svg>
                        <span>精选短租</span>
                      </div>
                    )}
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap mb-2">
                      {post.content}
                    </p>
                    
                    {post.image_urls && post.image_urls.length > 0 && (
                      <div className={`grid gap-2 mb-3 mt-1 ${post.image_urls.length === 1 ? 'grid-cols-1 sm:w-2/3' : post.image_urls.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {post.image_urls.map((url: string, idx: number) => (
                          <div key={idx} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                            <img src={url} alt="动态配图" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                          </div>
                        ))}
                      </div>
                    )}

                    {(() => {
                      if (!post.quote_post) return null;
                      
                      const quoteData = Array.isArray(post.quote_post) ? post.quote_post[0] : post.quote_post;
                      if (!quoteData) return null;
                      
                      return (
                        <div 
                          onClick={(e) => { e.stopPropagation(); router.push(`/post/${quoteData.id}`); }}
                          className="mt-3 border border-gray-200 rounded-xl overflow-hidden hover:border-[#FF8C00] transition-colors cursor-pointer bg-white group/quote shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row">
                            {quoteData.image_urls?.[0] && (
                              <div className="w-full sm:w-28 h-28 shrink-0 bg-gray-100 overflow-hidden">
                                 <img src={quoteData.image_urls[0]} className="w-full h-full object-cover group-hover/quote:scale-105 transition-transform duration-300" alt="quote" />
                              </div>
                            )}
                            <div className="p-3 flex-1 min-w-0 flex flex-col justify-center">
                              <span className="text-xs font-bold text-gray-900 mb-1">@{quoteData.username}</span>
                              <p className="text-xs text-gray-500 line-clamp-2">{quoteData.content || '分享了内容'}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between items-center mt-4 text-gray-400">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleNavigateToDetail(post); 
                      }} 
                      className="flex items-center space-x-1.5 hover:text-blue-500 group transition-colors"
                    >
                      <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                      </div>
                      <span className="text-xs font-medium">{state.comments > 0 ? state.comments : '评论'}</span>
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); handleInteraction('转发', post); }} className={`flex items-center space-x-1.5 group transition-colors ${state.repostedByMe ? 'text-green-500' : 'hover:text-green-500'}`}>
                      <div className={`p-2 rounded-full transition-colors ${state.repostedByMe ? 'bg-green-50' : 'group-hover:bg-green-50'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" /></svg>
                      </div>
                      <span className="text-xs font-medium">{state.reposts > 0 ? state.reposts : '转发'}</span>
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); handleInteraction('点赞', post); }} className={`flex items-center space-x-1.5 group transition-colors ${state.likedByMe ? 'text-pink-500' : 'hover:text-pink-500'}`}>
                      <div className={`p-2 rounded-full transition-colors ${state.likedByMe ? 'bg-pink-50' : 'group-hover:bg-pink-50'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill={state.likedByMe ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                      </div>
                      <span className="text-xs font-medium">{state.likes > 0 ? state.likes : '点赞'}</span>
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); handleInteraction('收藏', post); }} 
                      className={`flex items-center space-x-1.5 group transition-colors ${state.markedByMe ? 'text-yellow-500' : 'hover:text-yellow-500'}`}
                    >
                      <div className={`p-2 rounded-full transition-colors ${state.markedByMe ? 'bg-yellow-50' : 'group-hover:bg-yellow-50'}`}>
                        {state.markedByMe ? (
                          <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                            <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21l-8.25-4.665L3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs font-medium">{state.marks > 0 ? state.marks : '收藏'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}