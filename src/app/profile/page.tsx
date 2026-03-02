// src/app/profile/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PostList from '@/components/PostList'; 

type TabType = 'posts' | 'replies';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [posts, setPosts] = useState<any[]>([]); 
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [hasFetchedReplies, setHasFetchedReplies] = useState(false);

  const [stats, setStats] = useState({
    following: 0,
    followers: 0,
    likesGiven: 0, 
    marksGiven: 0,
    postsCount: 0
  });

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  // 1. 获取基础信息和我的帖子 (首屏加载)
  const fetchProfileAndStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profileData);

      const [
        followingRes, followersRes, likesRes, bookmarksRes, postsRes, myPostsRes 
      ] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
        supabase.from('posts')
          .select('*, quote_post:quote_post_id(id, content, image_urls, username), likes(count), comments(count), bookmarks(count), reposts(count)')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      setStats({
        following: followingRes.count || 0,
        followers: followersRes.count || 0,
        likesGiven: likesRes.count || 0,
        marksGiven: bookmarksRes.count || 0, 
        postsCount: postsRes.count || 0
      });

      if (myPostsRes.data && myPostsRes.data.length > 0) {
        const postIds = myPostsRes.data.map((p: any) => p.id);
        const [l, m, r] = await Promise.all([
          supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          supabase.from('bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          supabase.from('reposts').select('post_id').eq('user_id', user.id).in('post_id', postIds)
        ]);
        
        const myLikes = l.data?.map(i => i.post_id) || [];
        const myMarks = m.data?.map(i => i.post_id) || [];
        const myReposts = r.data?.map(i => i.post_id) || [];

        const enrichedPosts = myPostsRes.data.map((p: any) => ({
          ...p,
          username: profileData?.username || '未知用户',
          avatar_url: profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author_id}`,
          _interactions: {
            likes: p.likes?.[0]?.count || 0,
            comments: p.comments?.[0]?.count || 0,
            marks: p.bookmarks?.[0]?.count || 0, 
            reposts: p.reposts?.[0]?.count || 0,
            likedByMe: myLikes.includes(p.id),
            markedByMe: myMarks.includes(p.id),
            repostedByMe: myReposts.includes(p.id),
            isFollowingAuthor: false 
          }
        }));
        setPosts(enrichedPosts);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('获取个人信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 2. 核心修复：按需懒加载，并采用“手动拆分查询”避免外键报错
  const fetchUserReplies = useCallback(async () => {
    if (!user || hasFetchedReplies) return;
    
    setLoadingReplies(true);
    try {
      const { data: comments, error } = await supabase
        .from('comments')
        .select('id, content, created_at, post_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!comments || comments.length === 0) {
        setReplies([]);
      } else {
        const postIds = [...new Set(comments.map(c => c.post_id))];
        
        // 步骤 A: 独立查询原帖内容
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, content, image_urls, author_id')
          .in('id', postIds);
          
        // 步骤 B: 独立查询原帖作者信息
        const authorIds = [...new Set(postsData?.map(p => p.author_id) || [])];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', authorIds);

        const profileMap = new Map(profilesData?.map(p => [p.id, p]));
        const postMap = new Map(postsData?.map(p => [p.id, { ...p, username: profileMap.get(p.author_id)?.username || '神秘用户' }]));

        const enrichedReplies = comments.map(c => {
          const originalPost = postMap.get(c.post_id);
          return {
            ...c,
            original_post: originalPost ? {
              content: originalPost.content,
              image_urls: originalPost.image_urls,
              username: originalPost.username
            } : null,
            user: { 
              username: profile?.username || user.email?.split('@')[0] || '我', 
              avatar_url: profile?.avatar_url 
            }
          };
        });
        setReplies(enrichedReplies);
      }
      setHasFetchedReplies(true);
    } catch (error) {
      console.error('获取回复失败:', error);
    } finally {
      setLoadingReplies(false);
    }
  }, [user, profile, hasFetchedReplies]);

  useEffect(() => {
    if (activeTab === 'replies') {
      fetchUserReplies();
    }
  }, [activeTab, fetchUserReplies]);

  // 3. 乐观删除回复
  const handleDeleteReply = async (e: React.MouseEvent, replyId: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条回复吗？')) return;

    const prevReplies = [...replies];
    setReplies(replies.filter(r => r.id !== replyId));

    try {
      const { error } = await supabase.from('comments').delete().eq('id', replyId);
      if (error) throw error;
    } catch (err: any) {
      alert('删除失败: ' + err.message);
      setReplies(prevReplies); 
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <p className="text-sm font-medium text-gray-500 mb-6">请先登录查看个人主页</p>
        <Link href="/" className="bg-gray-900 text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-sm hover:bg-black transition-colors">
          返回首页
        </Link>
      </div>
    );
  }

  const displayName = profile?.username || user.email?.split('@')[0];

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full min-h-screen bg-gray-50 border-x border-gray-100 flex flex-col">
      
      {/* 吸顶导航栏 */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-40 flex items-center gap-6 px-4 py-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors -ml-2">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-900"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <div>
          <h1 className="text-[17px] font-black text-gray-900 leading-tight">{displayName}</h1>
          <p className="text-[12px] text-gray-500 font-medium">{stats.postsCount} posts</p>
        </div>
      </div>

      {/* 沉浸式全景背景区 */}
      <div className="relative w-full flex flex-col shrink-0">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/profile-banner.jpg"
            alt="Profile Banner"
            className="w-full h-full object-cover object-center"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white/50 pointer-events-none"></div>
        </div>

        <div className="relative z-10 h-32 sm:h-44 w-full"></div>

        <div className="relative z-10 px-4 sm:px-6">
          <div className="flex justify-between items-end">
            <div className="-mt-12 sm:-mt-16 relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[3px] border-white bg-white shrink-0 shadow-sm overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#FF8C00] text-4xl font-black bg-gray-100">
                  {(user.email?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
            <div className="mb-2 sm:mb-3">
               <button className="px-5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 text-[13px] font-bold text-gray-900 hover:bg-white hover:shadow-sm transition-all">
                 编辑资料
               </button>
            </div>
          </div>

          <div className="mt-3 mb-4">
            <h2 className="text-[20px] sm:text-[22px] font-black text-gray-900 leading-tight drop-shadow-sm">
              {displayName}
            </h2>
            <p className="text-[13px] text-gray-700 font-medium mt-0.5 drop-shadow-sm">
              @{user.email?.split('@')[0]}
            </p>
            <div className="mt-3 text-[13px] text-gray-900 font-medium leading-relaxed whitespace-pre-wrap break-words max-w-lg drop-shadow-sm">
              {profile?.bio || '这个人很懒，还没有写简介...'}
            </div>
          </div>
        </div>

        {/* 数据统计栏 */}
        <div className="relative z-10 px-4 sm:px-6 py-3.5 bg-white/70 backdrop-blur-xl border-t border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/profile/following" className="hover:opacity-70 flex items-center gap-1.5 transition-opacity">
              <span className="text-[15px] font-black text-gray-900">{stats.following}</span>
              <span className="text-[13px] text-gray-600 font-medium">Following</span>
            </Link>
            <Link href="/profile/followers" className="hover:opacity-70 flex items-center gap-1.5 transition-opacity">
              <span className="text-[15px] font-black text-gray-900">{stats.followers}</span>
              <span className="text-[13px] text-gray-600 font-medium">Followers</span>
            </Link>
            <Link href="/profile/likes" className="hover:opacity-70 flex items-center gap-1.5 transition-opacity">
              <span className="text-[15px] font-black text-pink-500">{stats.likesGiven}</span>
              <span className="text-[13px] text-gray-600 font-medium">Likes</span>
            </Link>
            <Link href="/my-marks" className="hover:opacity-70 flex items-center gap-1.5 transition-opacity">
              <span className="text-[15px] font-black text-[#FF8C00]">{stats.marksGiven}</span>
              <span className="text-[13px] text-gray-600 font-medium">Marks</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 动态标签页切换 */}
      <div className="flex border-b border-gray-200 bg-white shrink-0 sticky top-[52px] z-30">
        <button 
          onClick={() => setActiveTab('posts')}
          className="flex-1 py-3.5 text-center transition-all relative hover:bg-gray-50"
        >
          <span className={`font-bold text-[14px] ${activeTab === 'posts' ? 'text-gray-900' : 'text-gray-400'}`}>我的动态</span>
          {activeTab === 'posts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#FF8C00] rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('replies')}
          className="flex-1 py-3.5 text-center transition-all relative hover:bg-gray-50"
        >
          <span className={`font-bold text-[14px] ${activeTab === 'replies' ? 'text-gray-900' : 'text-gray-400'}`}>回复</span>
          {activeTab === 'replies' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#FF8C00] rounded-t-full"></div>}
        </button>
      </div>

      {/* 瀑布流内容区：根据 activeTab 渲染不同列表 */}
      <div className="flex-1 bg-gray-50 pt-2 pb-20">
        {activeTab === 'posts' ? (
          <PostList 
            posts={posts} 
            fetching={false} 
            currentUserId={user.id} 
            onDelete={(deletedId) => setPosts(prev => prev.filter(p => p.id !== deletedId))}
          />
        ) : (
          <div className="px-2 sm:px-4 space-y-3 pt-2">
            {loadingReplies ? (
              <div className="text-center py-10">
                <div className="w-5 h-5 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-gray-400">还没有留下任何回复</p>
              </div>
            ) : (
              replies.map(reply => (
                <div 
                  key={reply.id}
                  onClick={() => router.push(`/post/${reply.post_id}`)}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#FF8C00]/30 transition-all cursor-pointer group relative"
                >
                  {/* 回复人信息 */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF8C00] to-yellow-400 flex items-center justify-center text-white font-bold overflow-hidden shrink-0 shadow-sm">
                        {reply.user?.avatar_url ? (
                          <img src={reply.user.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                        ) : (
                          (reply.user?.username || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-gray-900 leading-tight">
                          {reply.user?.username}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {new Date(reply.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => handleDeleteReply(e, reply.id)}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      title="删除回复"
                    >
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>

                  {/* 回复内容主体 */}
                  <p className="text-gray-800 text-[14.5px] mb-3 pl-11 leading-relaxed">
                    {reply.content}
                  </p>

                  {/* 原帖引用卡片 */}
                  <div className="ml-11">
                    {reply.original_post ? (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden hover:border-[#FF8C00]/30 transition-colors shadow-sm flex flex-col sm:flex-row">
                        {reply.original_post.image_urls?.[0] && (
                          <div className="w-full sm:w-28 h-28 shrink-0 bg-gray-100 overflow-hidden">
                            <img 
                              src={reply.original_post.image_urls[0]} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                              alt="原帖配图" 
                            />
                          </div>
                        )}
                        <div className="p-3 flex-1 min-w-0 flex flex-col justify-center">
                          <span className="text-xs font-bold text-gray-900 mb-1">
                            @{reply.original_post.username} 的帖子
                          </span>
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {reply.original_post.content || '分享了图片'}
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
        )}
      </div>
      
    </main>
  );
}