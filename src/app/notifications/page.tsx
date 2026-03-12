// src/app/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type TabType = 'comments' | 'interactions';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🌟 新增：控制当前激活的 Tab
  const [activeTab, setActiveTab] = useState<TabType>('comments');
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set()); // 我关注了谁
  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set());   // 谁关注了我

  useEffect(() => {
    fetchNotificationsAndMarkAsRead();
  }, []);

  const fetchNotificationsAndMarkAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // 1. 获取所有通知
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100); 

      if (!notifs || notifs.length === 0) {
        setLoading(false);
        return;
      }

      // 2. 收集需要的相关人 ID
      const actorIds = [...new Set(notifs.map(n => n.actor_id))];
      
      // 3. 一次性并发请求：获取用户资料 + 获取我关注的人 + 获取关注我的人
      const [profilesRes, followingRes, followersRes] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url').in('id', actorIds),
        supabase.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', actorIds),
        supabase.from('follows').select('follower_id').eq('following_id', user.id).in('follower_id', actorIds)
      ]);

      setFollowingIds(new Set(followingRes.data?.map(f => f.following_id) || []));
      setFollowerIds(new Set(followersRes.data?.map(f => f.follower_id) || []));

      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]));

      // 4. 将用户信息拼装进通知
      const enrichedNotifs = notifs.map(n => ({
        ...n,
        actor: profileMap.get(n.actor_id) || { username: '神秘用户', avatar_url: '' }
      }));

      setNotifications(enrichedNotifs);

      // 5. 看后即焚：标记所有未读通知为已读，并触发全局红点消除
      const unreadCount = notifs.filter(n => !n.is_read).length;
      if (unreadCount > 0) {
        await supabase.from('notifications').update({ is_read: true }).eq('receiver_id', user.id).eq('is_read', false);
        window.dispatchEvent(new CustomEvent('local_notifications_read', { detail: { count: unreadCount } }));
      }

    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation(); 
    if (!currentUserId) return;

    const isFollowing = followingIds.has(targetId);
    const newFollowingIds = new Set(followingIds);

    if (isFollowing) {
      newFollowingIds.delete(targetId);
      setFollowingIds(newFollowingIds);
      await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: targetId });
    } else {
      newFollowingIds.add(targetId);
      setFollowingIds(newFollowingIds);
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetId });
    }
  };

  // 🌟 小红书风：右下角动作小角标
  const renderBadge = (type: string) => {
    switch (type) {
      case 'like':
        return <div className="bg-pink-500 text-white rounded-full p-[3px] shadow-sm"><svg fill="currentColor" viewBox="0 0 24 24" className="w-2.5 h-2.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>;
      case 'bookmark':
        return <div className="bg-yellow-500 text-white rounded-full p-[3px] shadow-sm"><svg fill="currentColor" viewBox="0 0 24 24" className="w-2.5 h-2.5"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg></div>;
      case 'follow':
        return <div className="bg-blue-500 text-white rounded-full p-[3px] shadow-sm"><svg fill="currentColor" viewBox="0 0 24 24" className="w-2.5 h-2.5"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>;
      case 'comment':
        return <div className="bg-green-500 text-white rounded-full p-[3px] shadow-sm"><svg fill="currentColor" viewBox="0 0 24 24" className="w-2.5 h-2.5"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div>;
      case 'repost':
        return <div className="bg-purple-500 text-white rounded-full p-[3px] shadow-sm"><svg fill="currentColor" viewBox="0 0 24 24" className="w-2.5 h-2.5"><path d="M19 7a1 1 0 0 0-1-1h-8v2h7v5h-3l3.969 5L22 13h-3V8a2 2 0 0 0-2-2zM5 17a1 1 0 0 0 1 1h8v-2H7v-5h3L6 6l-4 5h3v6a2 2 0 0 0 2 2z"/></svg></div>;
      default: return null;
    }
  };

  // 🌟 核心：根据 Tab 过滤数据
  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'comments') return ['comment', 'repost'].includes(n.type);
    return ['like', 'bookmark', 'follow'].includes(n.type);
  });

  return (
    <div className="min-h-screen bg-gray-50/50 sm:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-2xl bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-200 overflow-hidden flex flex-col min-h-screen sm:min-h-[80vh]">
        
        {/* 顶部标题 */}
        <div className="hidden sm:block px-6 py-5 border-b border-gray-100">
          <h1 className="text-[20px] font-black text-gray-900 tracking-tight">消息通知</h1>
        </div>

        {/* 🌟 小红书风：顶部切换 Tabs */}
        <div className="flex border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-30 pt-1 shrink-0">
          <button onClick={() => setActiveTab('comments')} className="flex-1 py-3 text-center transition-all relative hover:bg-gray-50">
            <span className={`font-bold text-[15px] ${activeTab === 'comments' ? 'text-gray-900' : 'text-gray-500'}`}>评论和转发</span>
            {activeTab === 'comments' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-[#FF8C00] rounded-t-full transition-all"></div>}
          </button>
          <button onClick={() => setActiveTab('interactions')} className="flex-1 py-3 text-center transition-all relative hover:bg-gray-50">
            <span className={`font-bold text-[15px] ${activeTab === 'interactions' ? 'text-gray-900' : 'text-gray-500'}`}>赞和收藏</span>
            {activeTab === 'interactions' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-[#FF8C00] rounded-t-full transition-all"></div>}
          </button>
        </div>

        {/* 列表内容区 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
          ) : filteredNotifs.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              </div>
              <p className="text-[14px] text-gray-500">这里暂时空空如也~</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredNotifs.map((notif, index) => {
                const isFollowing = followingIds.has(notif.actor_id);
                const isFollower = followerIds.has(notif.actor_id);
                const isSelf = notif.actor_id === currentUserId;

                return (
                  <div 
                    key={notif.id} 
                    onClick={() => notif.type === 'follow' ? router.push(`/user/${notif.actor_id}`) : router.push(`/post/${notif.reference_id}`)}
                    className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors bg-white ${!notif.is_read ? 'bg-orange-50/20' : ''} ${index !== filteredNotifs.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    {/* 左侧：头像 + 角标 */}
                    <div className="relative shrink-0">
                      <img src={notif.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.actor_id}`} className="w-11 h-11 rounded-full object-cover bg-gray-100 border border-gray-100" alt="avatar" />
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[2px]">
                        {renderBadge(notif.type)}
                      </div>
                    </div>

                    {/* 中间：信息 */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center pl-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-[14.5px] text-gray-900 hover:underline truncate">{notif.actor?.username}</span>
                        <span className="text-[11px] font-medium text-gray-400 shrink-0">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-[13px] text-gray-500">
                        {notif.type === 'follow' && '开始关注你'}
                        {notif.type === 'like' && '赞了你的帖子'}
                        {notif.type === 'bookmark' && '收藏了你的帖子'}
                        {notif.type === 'comment' && '评论了你的帖子'}
                        {notif.type === 'repost' && '转发了你的帖子'}
                      </p>
                    </div>

                    {/* 右侧：互相关注按钮 */}
                    {!isSelf && (
                      <button
                        onClick={(e) => handleToggleFollow(e, notif.actor_id)}
                        className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all border ${
                          isFollowing 
                            ? 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100' 
                            : 'bg-white text-[#FF8C00] border-[#FF8C00] hover:bg-orange-50 shadow-sm' 
                        }`}
                      >
                        {isFollowing 
                          ? (isFollower ? '互相关注' : '已关注') 
                          : (isFollower ? '回关' : '关注')}
                      </button>
                    )}
                  </div>
                );
              })}
              
              {/* 触底提示 */}
              <div className="text-center py-6 text-[12px] text-gray-300 font-medium">
                - 到底了 -
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}