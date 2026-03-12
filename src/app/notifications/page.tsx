// src/app/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotificationsAndMarkAsRead();
  }, []);

  const fetchNotificationsAndMarkAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. 获取所有通知
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // 展示最近50条

      if (!notifs || notifs.length === 0) {
        setLoading(false);
        return;
      }

      // 2. 收集需要的相关人 ID
      const actorIds = [...new Set(notifs.map(n => n.actor_id))];
      
      // 3. 一次性查出这些人的资料 
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', actorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      // 4. 将用户信息拼装进通知
      const enrichedNotifs = notifs.map(n => ({
        ...n,
        actor: profileMap.get(n.actor_id) || { username: '神秘用户', avatar_url: '' }
      }));

      setNotifications(enrichedNotifs);

      // 5. 看后即焚：标记所有未读通知为已读，并触发全局红点消除
      const unreadCount = notifs.filter(n => !n.is_read).length;
      if (unreadCount > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        // 告诉侧边栏和小铃铛，红点归零！
        window.dispatchEvent(new CustomEvent('local_notifications_read', { detail: { count: unreadCount } }));
      }

    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-500 shrink-0">
            <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
        );
      case 'like':
        return (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-100 text-pink-500 shrink-0">
            <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
        );
      case 'bookmark':
        return (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-100 text-orange-500 shrink-0">
            <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
          </div>
        );
      case 'comment': // 🌟 新增：评论图标 (绿色)
        return (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 text-green-500 shrink-0">
            <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          </div>
        );
      case 'repost': // 🌟 新增：转发图标 (紫色)
        return (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 text-purple-500 shrink-0">
             <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M19 7a1 1 0 0 0-1-1h-8v2h7v5h-3l3.969 5L22 13h-3V8a2 2 0 0 0-2-2zM5 17a1 1 0 0 0 1 1h8v-2H7v-5h3L6 6l-4 5h3v6a2 2 0 0 0 2 2z"/></svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 shrink-0">
             <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 px-2">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">互动通知</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">查看谁在关注你、喜欢你的内容</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
        ) : notifications.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
            </div>
            <p className="text-[15px] font-bold text-gray-900 mb-1">暂无互动记录</p>
            <p className="text-[13px] text-gray-500">多发帖、多互动，自然会有回响。</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {notifications.map((notif, index) => (
              <div 
                key={notif.id} 
                onClick={() => notif.type === 'follow' ? router.push(`/user/${notif.actor_id}`) : router.push(`/post/${notif.reference_id}`)}
                className={`flex items-start gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.is_read ? 'bg-blue-50/30' : ''} ${index !== notifications.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                {/* 动作图标 */}
                {renderNotificationIcon(notif.type)}

                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <img src={notif.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.actor_id}`} className="w-6 h-6 rounded-full object-cover bg-gray-100 border border-gray-200" alt="avatar" />
                    <span className="font-bold text-[14px] text-gray-900 hover:underline">{notif.actor?.username}</span>
                  </div>
                  
                  {/* 🌟 补充了评论和转发的文案 */}
                  <p className="text-[14px] text-gray-600 mb-1">
                    {notif.type === 'follow' && '刚刚关注了你'}
                    {notif.type === 'like' && '喜欢了你的帖子'}
                    {notif.type === 'bookmark' && '收藏了你的内容'}
                    {notif.type === 'comment' && '评论了你的帖子'}
                    {notif.type === 'repost' && '转发了你的帖子'}
                  </p>
                  
                  <span className="text-[11px] font-bold text-gray-400">
                    {new Date(notif.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}