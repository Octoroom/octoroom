// src/app/user/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import PostList from '@/components/PostList';

type TabType = 'posts' | 'replies';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter(); 
  
  const id = params?.id;
  const targetId = Array.isArray(id) ? id[0] : id;
  
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, likes: 0, marks: 0 });
  
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [hasFetchedReplies, setHasFetchedReplies] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    const fetchBaseData = async () => {
      if (!targetId) return;

      const { data: { user: activeUser } } = await supabase.auth.getUser();
      const localUserId = activeUser?.id || null;
      setCurrentUserId(localUserId);

      if (localUserId === targetId) {
        router.replace('/profile');
        return;
      }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', targetId).single();
      let resolvedProfile = profileData || { id: targetId };
      
      let bestName = profileData?.username;
      let bestAvatar = profileData?.avatar_url;

      const { data: postsData } = await supabase
        .from('posts')
        .select('*, quote_post:quote_post_id(id, content, image_urls, username), likes(count), comments(count), bookmarks(count), reposts(count)')
        .eq('author_id', targetId)
        .order('created_at', { ascending: false });

      if (!bestName && postsData && postsData.length > 0) {
        const fallbackPost = postsData.find((p: any) => p.username && p.username !== '未知用户');
        if (fallbackPost) { bestName = fallbackPost.username; bestAvatar = bestAvatar || fallbackPost.avatar_url; }
      }
      if (!bestName) {
        const { data: cr } = await supabase.from('companion_rooms').select('author_name, author_avatar').eq('author_id', targetId).limit(1);
        if (cr && cr.length > 0 && cr[0].author_name) { bestName = cr[0].author_name; bestAvatar = bestAvatar || cr[0].author_avatar; }
      }
      if (!bestName) {
        const { data: or } = await supabase.from('octo_rooms').select('author_name, author_avatar').eq('author_id', targetId).limit(1);
        if (or && or.length > 0 && or[0].author_name) { bestName = or[0].author_name; bestAvatar = bestAvatar || or[0].author_avatar; }
      }
      if (!bestName) {
        const { data: cp } = await supabase.from('companion_participants').select('user_name, user_avatar').eq('user_id', targetId).limit(1);
        if (cp && cp.length > 0 && cp[0].user_name) { bestName = cp[0].user_name; bestAvatar = bestAvatar || cp[0].user_avatar; }
      }
      if (!bestName) {
        const { data: ob } = await supabase.from('octo_bookings').select('guest_name, guest_avatar').eq('guest_id', targetId).limit(1);
        if (ob && ob.length > 0 && ob[0].guest_name) { bestName = ob[0].guest_name; bestAvatar = bestAvatar || ob[0].guest_avatar; }
      }

      const finalName = bestName || '神秘用户';
      const finalAvatar = bestAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetId}`;

      resolvedProfile.username = finalName;
      resolvedProfile.avatar_url = finalAvatar;
      resolvedProfile.bio = profileData?.bio || '这个人很神秘，什么都没写...';
      setProfile(resolvedProfile);

      const [fings, fwers, likesRes, marksRes] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId),
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', targetId),
        supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', targetId)
      ]);
      
      setStats({
        following: fings.count || 0,
        followers: fwers.count || 0,
        likes: likesRes.count || 0,
        marks: marksRes.count || 0
      });

      let myLikes: string[] = [], myMarks: string[] = [], myReposts: string[] = [];
      let isFollowingAuthor = false;

      if (localUserId && postsData && postsData.length > 0) {
        const postIds = postsData.map((p: any) => p.id);
        const [l, m, r, f] = await Promise.all([
          supabase.from('likes').select('post_id').eq('user_id', localUserId).in('post_id', postIds),
          supabase.from('bookmarks').select('post_id').eq('user_id', localUserId).in('post_id', postIds),
          supabase.from('reposts').select('post_id').eq('user_id', localUserId).in('post_id', postIds),
          // 🌟 修复点 1：将 select('id') 改为 select('follower_id')
          supabase.from('follows').select('follower_id').match({ follower_id: localUserId, following_id: targetId }).maybeSingle()
        ]);
        myLikes = l.data?.map((i: any) => i.post_id) || [];
        myMarks = m.data?.map((i: any) => i.post_id) || [];
        myReposts = r.data?.map((i: any) => i.post_id) || [];
        isFollowingAuthor = !!f.data;
      } else if (localUserId) {
        // 🌟 修复点 2：将 select('id') 改为 select('follower_id')
        const { data: followData } = await supabase.from('follows').select('follower_id').match({ follower_id: localUserId, following_id: targetId }).maybeSingle();
        isFollowingAuthor = !!followData;
      }
      
      setIsFollowing(isFollowingAuthor);

      if (!postsData || postsData.length === 0) {
        setPosts([]);
      } else {
        const enrichedPosts = postsData.map((p: any) => ({
          ...p,
          username: (p.username && p.username !== '未知用户') ? p.username : finalName,
          avatar_url: p.avatar_url || finalAvatar,
          _interactions: {
            likes: p.likes?.[0]?.count || 0,
            comments: p.comments?.[0]?.count || 0,
            marks: p.bookmarks?.[0]?.count || 0,
            reposts: p.reposts?.[0]?.count || 0,
            likedByMe: myLikes.includes(p.id),
            markedByMe: myMarks.includes(p.id),
            repostedByMe: myReposts.includes(p.id),
            isFollowingAuthor: isFollowingAuthor 
          }
        }));
        setPosts(enrichedPosts);
      }
      setLoading(false);
    };

    fetchBaseData();
  }, [targetId]);

  const fetchUserReplies = useCallback(async () => {
    if (!targetId || hasFetchedReplies) return;
    
    setLoadingReplies(true);
    try {
      const { data: comments, error } = await supabase.from('comments').select('id, content, created_at, post_id').eq('user_id', targetId).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      if (!comments || comments.length === 0) {
        setReplies([]);
      } else {
        const postIds = [...new Set(comments.map(c => c.post_id))];
        const { data: postsData } = await supabase.from('posts').select('id, content, image_urls, author_id').in('id', postIds);
        const authorIds = [...new Set(postsData?.map(p => p.author_id) || [])];
        const { data: profilesData } = await supabase.from('profiles').select('id, username').in('id', authorIds);

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
            } : null
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
  }, [targetId, hasFetchedReplies]);

  useEffect(() => {
    if (activeTab === 'replies') {
      fetchUserReplies();
    }
  }, [activeTab, fetchUserReplies]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId) {
      alert('请先登录后操作哦！');
      return;
    }

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .match({ follower_id: currentUserId, following_id: targetId });
          
        if (error) throw new Error(error.message || JSON.stringify(error));
        
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
        setPosts(prev => prev.map(p => ({ ...p, _interactions: { ...p._interactions, isFollowingAuthor: false } })));
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([{ follower_id: currentUserId, following_id: targetId }]);
          
        // 🌟 修复点 3：忽略 23505 错误（重复插入）。因为如果已存在，我们只需强制同步 UI 状态即可
        if (error && error.code !== '23505') {
           throw new Error(error.message || JSON.stringify(error));
        }
        
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        setPosts(prev => prev.map(p => ({ ...p, _interactions: { ...p._interactions, isFollowingAuthor: true } })));
      }
    } catch (err: any) {
      console.error('关注操作报错详情:', err);
      const errorMsg = err.message || JSON.stringify(err);
      if (errorMsg.includes('row-level security')) {
         alert('关注失败：数据库安全策略 (RLS) 拦截了请求，请去 Supabase 后台开启 follows 表的 Insert/Delete 权限。');
      } else {
         alert('操作失败: ' + errorMsg);
      }
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) return null;
  const displayName = profile.username;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full min-h-screen bg-gray-50 border-x border-gray-100 flex flex-col">
      
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-40 flex items-center gap-6 px-4 py-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors -ml-2">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-900"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <div>
          <h1 className="text-[17px] font-black text-gray-900 leading-tight">{displayName}</h1>
          <p className="text-[12px] text-gray-500 font-medium">{stats.postsCount} posts</p>
        </div>
      </div>

      <div className="relative w-full flex flex-col shrink-0">
        <div className="absolute inset-0 z-0 overflow-hidden bg-gray-200 pointer-events-none">
          <img
            src="/profile-banner.jpg" 
            alt="Profile Banner"
            className="w-full h-full object-cover object-center"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white/50"></div>
        </div>

        <div className="relative z-10 h-32 sm:h-44 w-full pointer-events-none"></div>

        <div className="relative z-20 px-4 sm:px-6 pointer-events-auto">
          <div className="flex justify-between items-end">
            <div className="-mt-12 sm:-mt-16 relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[3px] border-white bg-white shrink-0 shadow-sm overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#FF8C00] text-4xl font-black bg-gray-100">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            {currentUserId !== targetId && (
              <div className="mb-2 sm:mb-3 flex items-center gap-2 relative z-[60] pointer-events-auto">
                 <button 
                   type="button"
                   onClick={() => router.push(`/messages?chatWith=${targetId}`)}
                   className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-white hover:text-[#FF8C00] hover:border-[#FF8C00]/30 hover:shadow-sm transition-all"
                 >
                   <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-[18px] h-[18px]">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                   </svg>
                 </button>

                 <button 
                   type="button"
                   onClick={handleFollowToggle}
                   disabled={isFollowLoading}
                   className={`px-5 py-1.5 rounded-full text-[13px] font-bold shadow-sm transition-all outline-none ${
                     isFollowing 
                       ? 'bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-gray-50' 
                       : 'bg-gray-900 text-white hover:bg-black hover:shadow-md'
                   }`}
                 >
                   {isFollowLoading ? '稍候...' : (isFollowing ? '已关注' : '关注')}
                 </button>
              </div>
            )}
          </div>

          <div className="mt-3 mb-4 relative z-10 pointer-events-none">
            <h2 className="text-[20px] sm:text-[22px] font-black text-gray-900 leading-tight drop-shadow-sm">
              {displayName}
            </h2>
            <div className="mt-3 text-[13px] text-gray-900 font-medium leading-relaxed whitespace-pre-wrap break-words max-w-lg drop-shadow-sm">
              {profile.bio}
            </div>
          </div>
        </div>

        <div className="relative z-[50] px-4 sm:px-6 py-3.5 bg-white/70 backdrop-blur-xl border-t border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.03)] pointer-events-auto">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <button onClick={() => router.push(`/user/${targetId}/following`)} className="hover:opacity-70 flex items-center gap-1.5 transition-opacity cursor-pointer outline-none">
              <span className="text-[15px] font-black text-gray-900">{stats.following}</span><span className="text-[13px] text-gray-600 font-medium">Following</span>
            </button>
            <button onClick={() => router.push(`/user/${targetId}/followers`)} className="hover:opacity-70 flex items-center gap-1.5 transition-opacity cursor-pointer outline-none">
              <span className="text-[15px] font-black text-gray-900">{stats.followers}</span><span className="text-[13px] text-gray-600 font-medium">Followers</span>
            </button>
            <button onClick={() => router.push(`/user/${targetId}/likes`)} className="hover:opacity-70 flex items-center gap-1.5 transition-opacity cursor-pointer outline-none">
              <span className="text-[15px] font-black text-pink-500">{stats.likes}</span><span className="text-[13px] text-gray-600 font-medium">Likes</span>
            </button>
            <button onClick={() => router.push(`/user/${targetId}/marks`)} className="hover:opacity-70 flex items-center gap-1.5 transition-opacity cursor-pointer outline-none">
              <span className="text-[15px] font-black text-[#FF8C00]">{stats.marks}</span><span className="text-[13px] text-gray-600 font-medium">Marks</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 bg-white shrink-0 sticky top-[52px] z-30">
        <button onClick={() => setActiveTab('posts')} className="flex-1 py-3.5 text-center transition-all relative hover:bg-gray-50">
          <span className={`font-bold text-[14px] ${activeTab === 'posts' ? 'text-gray-900' : 'text-gray-400'}`}>Ta 的动态</span>
          {activeTab === 'posts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#FF8C00] rounded-t-full"></div>}
        </button>
        <button onClick={() => setActiveTab('replies')} className="flex-1 py-3.5 text-center transition-all relative hover:bg-gray-50">
          <span className={`font-bold text-[14px] ${activeTab === 'replies' ? 'text-gray-900' : 'text-gray-400'}`}>回复</span>
          {activeTab === 'replies' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#FF8C00] rounded-t-full"></div>}
        </button>
      </div>

      <div className="flex-1 bg-gray-50 pt-2 pb-20">
        {activeTab === 'posts' ? (
          posts.length > 0 ? (
            <PostList posts={posts} fetching={false} currentUserId={currentUserId} />
          ) : (
            <div className="bg-white rounded-2xl mx-2 sm:mx-4 mt-4 p-8 text-center text-gray-400 border border-gray-100 shadow-sm text-sm font-medium">这个人还没有发过任何动态</div>
          )
        ) : (
          <div className="px-2 sm:px-4 space-y-3 pt-2">
            {loadingReplies ? (
              <div className="text-center py-10"><div className="w-5 h-5 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin mx-auto"></div></div>
            ) : replies.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3"><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg></div>
                <p className="text-[13px] font-medium text-gray-400">Ta 还没有留下任何回复</p>
              </div>
            ) : (
              replies.map(reply => (
                <div key={reply.id} onClick={() => router.push(`/post/${reply.post_id}`)} className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#FF8C00]/30 transition-all cursor-pointer group relative">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF8C00] to-yellow-400 flex items-center justify-center text-white font-bold overflow-hidden shrink-0 shadow-sm">
                        {profile.avatar_url ? (
                           <img src={profile.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                        ) : (
                           displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-gray-900 leading-tight">{displayName}</span>
                        <span className="text-[11px] text-gray-400 font-medium">{new Date(reply.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-800 text-[14.5px] mb-3 pl-11 leading-relaxed">{reply.content}</p>
                  <div className="ml-11">
                    {reply.original_post ? (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden hover:border-[#FF8C00]/30 transition-colors shadow-sm flex flex-col sm:flex-row">
                        {reply.original_post.image_urls?.[0] && (
                          <div className="w-full sm:w-28 h-28 shrink-0 bg-gray-100 overflow-hidden"><img src={reply.original_post.image_urls[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="原帖配图" /></div>
                        )}
                        <div className="p-3 flex-1 min-w-0 flex flex-col justify-center">
                          <span className="text-xs font-bold text-gray-900 mb-1">@{reply.original_post.username} 的帖子</span>
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{reply.original_post.content || '分享了图片'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-400 flex items-center gap-2"><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>抱歉，该原帖已被作者删除</div>
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