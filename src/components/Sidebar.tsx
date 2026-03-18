'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocalAuth } from '@/components/InsforgeProviderWrapper';
import { supabase } from '@/lib/supabase';
import { useLanguage, LanguageToggle } from '@/lib/i18n';

interface PopularCity {
  id: string;
  slug: string;          
  nameZh: string;        
  nameEn: string;        
  coverImage: string;    
  companionCount: number;
  roomCount: number;     
}

// 🌟 硬编码你的三个专属测试账号
const TEST_ACCOUNTS = [
  { id: '655c3f63-7d68-4ef4-9baa-f0ac29291bd6', role: 'Buyer', icon: '👤', label: '买家 (Buyer)' },
  { id: '49635b9a-23b7-403a-b82f-515685c19816', role: 'Agent', icon: '👔', label: '中介 (Agent)' },
  { id: 'f83482f8-ecaa-4e06-8e6a-1c6698eb1f4e', role: 'Seller', icon: '🏠', label: '卖家 (Seller)' },
];

export default function Sidebar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { isSignedIn } = useLocalAuth();
  const { t, lang } = useLanguage();
  
  const [popularCities, setPopularCities] = useState<PopularCity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [hostUnreadCount, setHostUnreadCount] = useState(0);
  const [guestUnreadCount, setGuestUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  // 状态：记录当前登录的用户 ID 和 管理员状态
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  // 🌟 核心修复逻辑：判断当前用户是否是三个测试号之一
  const isTestAccount = TEST_ACCOUNTS.some(acc => acc.id === currentUserId);
  
  // 🌟 核心修复逻辑：只要是管理员【或者】是测试号，就显示切换面板！
  const showSwitcher = isAdmin || isTestAccount;

  useEffect(() => {
    async function fetchPopularCities() {
      setIsLoadingCities(true);
      try {
        const { data, error } = await supabase
          .from('cities')
          .select('id, slug, nameZh:name_zh, nameEn:name_en, coverImage:cover_image, companionCount:companion_count, roomCount:room_count');

        if (!error && data) {
          const sortedData = data.sort((a, b) => 
            (b.companionCount + b.roomCount) - (a.companionCount + a.roomCount)
          ).slice(0, 5); 
          setPopularCities(sortedData);
        }
      } catch (error) {
        console.error("获取热门城市失败", error);
      } finally {
        setIsLoadingCities(false);
      }
    }

    if (isSignedIn) {
      fetchPopularCities();
    }
  }, [isSignedIn]);

  useEffect(() => {
    let isMounted = true;
    
    // 获取当前用户信息并记录 ID
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isMounted) {
        setCurrentUserId(user.id);
      }
    };

    // 1. 查未读私信
    const fetchUnreadCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id);
      if (!error && count !== null && isMounted) setUnreadMsgCount(count);
    };

    // 2. 查房东未读的订单
    const fetchHostUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count, error } = await supabase
        .from('octo_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', user.id)
        .eq('host_unread', true);
      if (!error && count !== null && isMounted) setHostUnreadCount(count);
    };

    // 3. 查房客未读的订单
    const fetchGuestUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count, error } = await supabase
        .from('octo_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('guest_id', user.id)
        .eq('guest_unread', true);
      if (!error && count !== null && isMounted) setGuestUnreadCount(count);
    };

    // 4. 查互动通知未读
    const fetchNotificationUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      if (!error && count !== null && isMounted) setNotificationCount(count);
    };

    // 5. 查当前用户的权限和角色
    const fetchUserRoleAndAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      if (!error && data && isMounted) {
        setIsAdmin(!!data.is_admin);
      }
    };

    if (isSignedIn) {
      fetchCurrentUser();
      fetchUnreadCount();
      fetchHostUnread();
      fetchGuestUnread();
      fetchNotificationUnread(); 
      fetchUserRoleAndAdminStatus(); 

      const channel = supabase.channel('global_unread_badge')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchUnreadCount())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'octo_bookings' }, () => {
          fetchHostUnread();
          fetchGuestUnread();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchNotificationUnread())
        .subscribe();

      const handleLocalRead = (e: any) => setUnreadMsgCount(prev => Math.max(0, prev - (e.detail?.readCount || 0)));
      const handleHostOrdersRead = (e: any) => setHostUnreadCount(prev => Math.max(0, prev - (e.detail?.count || 0)));
      const handleGuestOrdersRead = (e: any) => setGuestUnreadCount(prev => Math.max(0, prev - (e.detail?.count || 0)));
      const handleNotificationsRead = (e: any) => setNotificationCount(prev => Math.max(0, prev - (e.detail?.count || 0))); 
      
      window.addEventListener('local_messages_read', handleLocalRead);
      window.addEventListener('local_host_orders_read', handleHostOrdersRead);
      window.addEventListener('local_guest_orders_read', handleGuestOrdersRead);
      window.addEventListener('local_notifications_read', handleNotificationsRead);

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
        window.removeEventListener('local_messages_read', handleLocalRead);
        window.removeEventListener('local_host_orders_read', handleHostOrdersRead);
        window.removeEventListener('local_guest_orders_read', handleGuestOrdersRead);
        window.removeEventListener('local_notifications_read', handleNotificationsRead);
      };
    }
  }, [isSignedIn]);

  const handleSignOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("登出API调用失败", e);
    } finally {
      localStorage.removeItem('octo_room_auth');
      localStorage.removeItem('octo_room_user_id');
      window.location.href = '/'; 
    }
  };

  // 一键切换测试账号
  const handleTestAccountSwitch = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === currentUserId) return;

    setIsSwitchingRole(true);
    try {
      const res = await fetch('/api/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      
      const data = await res.json();
      
      if (data.link) {
        await supabase.auth.signOut();
        localStorage.removeItem('octo_room_auth');
        localStorage.removeItem('octo_room_user_id');
        window.location.href = data.link; 
      } else {
        alert("切换失败: " + (data.error || "未知错误"));
        setIsSwitchingRole(false);
      }
    } catch (e) {
      console.error("模拟登录失败", e);
      alert("API 请求失败，请检查网络或后端的 /api/impersonate 接口");
      setIsSwitchingRole(false);
    }
  };

  return (
    <nav className="flex flex-col p-4 h-full w-full bg-octo-cream/50 md:bg-transparent relative z-50">
      
      {/* 热门城市推荐部分 */}
      {isSignedIn && (
        <div className="md:absolute md:top-0 md:right-full md:w-[280px] md:h-screen md:overflow-y-auto md:scrollbar-hide md:pr-8 md:pt-4 md:pb-10 flex flex-col hidden md:flex">
          <div className="mb-6 px-1 pt-2 flex-shrink-0">
            <h2 className="text-[17px] font-bold text-gray-900">{t('sidebar.popularCities')}</h2>
          </div>
          
          <div className="flex flex-col space-y-6">
            {isLoadingCities ? (
              <div className="text-sm text-gray-400 px-1 font-medium">{t('sidebar.loadingCities')}</div>
            ) : popularCities.length > 0 ? (
              popularCities.map((city, index) => (
                <Link key={city.id} href={`/companions?city=${city.slug}`} onClick={onMenuClick} className={`flex flex-col group cursor-pointer px-1 flex-shrink-0 ${index === popularCities.length - 1 ? 'pb-8' : ''}`}>
                  <div className="relative w-full aspect-[4/5] rounded-[16px] overflow-hidden bg-gray-100 mb-2 shadow-sm border border-black/5">
                    <img 
                      src={city.coverImage} 
                      alt={lang === 'en' ? city.nameEn : city.nameZh}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md text-white text-[12px] px-2 py-1 rounded-md flex items-center gap-1 font-medium tracking-wide">
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                      <span>{city.roomCount}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-gray-900 leading-tight">{lang === 'en' ? city.nameEn : city.nameZh}</h3>
                    <p className="text-[13px] text-gray-500 font-medium mt-1">{city.companionCount}{t('sidebar.companions')} · {city.roomCount}{t('sidebar.rooms')}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-sm text-gray-400 px-1 font-medium">{t('sidebar.noCities')}</div>
            )}
          </div>
        </div>
      )}

      <div className="mb-6 px-4 py-2 flex-shrink-0 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-black text-[#FF8C00] italic tracking-tighter flex-shrink-0">OctoRoom</h1>
        <LanguageToggle />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pb-4 scrollbar-hide relative z-10">
        <Link href="/" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
          <span>{t('nav.home')}</span>
        </Link>
        
        {isSignedIn && (
          <>
            <Link href="/discover" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <span>{t('nav.discover')}</span>
            </Link>
            <Link href="/companions" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
              <span>{t('nav.companions')}</span>
            </Link>
            <Link href="/rooms" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6.75h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>
              <span>{t('nav.rooms')}</span>
            </Link>
            <Link href="/profile" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              <span>{t('nav.profile')}</span>
            </Link>
            <Link href="/property" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
               <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.75M5.25 9h.008v.008H5.25V9zm0 3h.008v.008H5.25V12zm0 3h.008v.008H5.25V15zm0 3h.008v.008H5.25V18zm13.5-9h.008v.008H18.75V9zm0 3h.008v.008H18.75V12zm0 3h.008v.008H18.75V15zm0 3h.008v.008H18.75V18z" />
              </svg>
              <span>{t('nav.property')}</span>
            </Link>

            <Link href="/providers" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
               <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <span>{t('nav.providers')}</span>
            </Link>

            <Link href="/provider-workspace" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75v-.008z" />
              </svg>
              <span>{t('nav.workspace')}</span>
            </Link>

            <Link href="/albums" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              <span>{t('nav.albums')}</span>
            </Link>

            {/* 房东的红点：我的房源 */}
            <Link href="/my-rooms" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6 group relative">
              <div className="relative">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                {hostUnreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white shadow-sm flex items-center justify-center">
                    {hostUnreadCount > 99 ? '99+' : hostUnreadCount}
                  </div>
                )}
              </div>
              <span className={hostUnreadCount > 0 ? 'font-bold text-gray-900' : ''}>{t('nav.myRooms')}</span>
            </Link>

            <Link href="/my-comments" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <span>{t('nav.comments')}</span>
            </Link>

            <Link href="/my-marks" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              <span>{t('nav.myMarks')}</span>
            </Link>

            {/* 房客的红点：我的预定 */}
            <Link href="/my-bookings" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6 group relative">
              <div className="relative">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {guestUnreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white shadow-sm flex items-center justify-center">
                    {guestUnreadCount > 99 ? '99+' : guestUnreadCount}
                  </div>
                )}
              </div>
              <span className={guestUnreadCount > 0 ? 'font-bold text-gray-900' : ''}>{t('nav.myBookings')}</span>
            </Link>

            {/* 互动通知 */}
            <Link href="/notifications" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6 group relative">
              <div className="relative">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {notificationCount > 0 && (
                  <div className="absolute -top-1.5 -right-2 bg-[#FF8C00] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white shadow-sm flex items-center justify-center">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </div>
                )}
              </div>
              <span className={notificationCount > 0 ? 'font-bold text-gray-900' : ''}>{t('nav.notifications')}</span>
            </Link>

            <Link href="/messages" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6 group relative">
              <div className="relative">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {unreadMsgCount > 0 && (
                  <div className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white shadow-sm flex items-center justify-center">
                    {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                  </div>
                )}
              </div>
              <span className={unreadMsgCount > 0 ? 'font-bold text-gray-900' : ''}>{t('nav.messages')}</span>
            </Link>
          </>
        )}
      </div>

      {isSignedIn && (
        <div className="pt-4 mt-auto flex-shrink-0 relative z-10 w-full flex flex-col space-y-4">
          
          {/* 🌟 核心：只要是管理员 或 测试号其中之一，就展示这块面板！ */}
          {showSwitcher && (
            <div className="bg-white/60 backdrop-blur-sm border border-indigo-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <div className="flex items-center gap-2 mb-3">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-indigo-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <h3 className="text-[13px] font-bold text-gray-800 tracking-wide">测试号一键切换</h3>
              </div>
              
              <div className="flex flex-col space-y-2">
                {TEST_ACCOUNTS.map((account) => {
                  const isCurrent = account.id === currentUserId;
                  return (
                    <button
                      key={account.id}
                      disabled={isSwitchingRole || isCurrent}
                      onClick={() => handleTestAccountSwitch(account.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isCurrent 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-default'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50'
                      }`}
                    >
                      <span>{account.icon} {account.label}</span>
                      {isCurrent && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">当前</span>}
                    </button>
                  );
                })}
                {isSwitchingRole && <span className="text-[11px] text-indigo-500 animate-pulse mt-1 text-center">正在获取通行证...</span>}
              </div>
            </div>
          )}

          {/* 原有的退出登录按钮 */}
          <button onClick={() => { handleSignOut(); onMenuClick?.(); }} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-all text-base font-medium text-gray-500 group w-fit pr-6">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 group-hover:text-red-600 transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
            <span>{t('nav.signOut')}</span>
          </button>
        </div>
      )}
    </nav>
  );
}