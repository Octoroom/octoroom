'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocalAuth } from '@/components/InsforgeProviderWrapper';
import { supabase } from '@/lib/supabase';

interface PopularCity {
  id: string;
  slug: string;          
  nameZh: string;        
  nameEn: string;        
  coverImage: string;    
  companionCount: number;
  roomCount: number;     
}

// 🌟 新增 onMenuClick 属性，用于移动端点击后收起侧边栏
export default function Sidebar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { isSignedIn } = useLocalAuth();
  
  const [popularCities, setPopularCities] = useState<PopularCity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

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

  // 🌟 企业级优化：WebSocket + 乐观 UI 事件
  useEffect(() => {
    let isMounted = true;
    
    const fetchUnreadCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (!error && count !== null && isMounted) {
        setUnreadMsgCount(count);
      }
    };

    if (isSignedIn) {
      fetchUnreadCount();

      const channel = supabase.channel('global_unread_badge')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          fetchUnreadCount();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
          fetchUnreadCount(); 
        })
        .subscribe();

      // 🌟 核心修复：接收本地广播，直接做数学减法，0 延迟消红点！
      const handleLocalRead = (e: any) => {
        const countToClear = e.detail?.readCount || 0;
        setUnreadMsgCount(prev => Math.max(0, prev - countToClear));
      };
      
      window.addEventListener('local_messages_read', handleLocalRead);

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
        window.removeEventListener('local_messages_read', handleLocalRead);
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

  return (
    // 🌟 核心修改：去掉了 hidden md:flex w-[240px] sticky 等，让它在移动端和PC端都能自适应外层容器
    <nav className="flex flex-col p-4 h-full w-full bg-octo-cream/50 md:bg-transparent relative z-50">
      
      {/* 热门城市推荐部分 */}
      {isSignedIn && (
        <div className="md:absolute md:top-0 md:right-full md:w-[280px] md:h-screen md:overflow-y-auto md:scrollbar-hide md:pr-8 md:pt-4 md:pb-10 flex flex-col hidden md:flex">
          <div className="mb-6 px-1 pt-2 flex-shrink-0">
            <h2 className="text-[17px] font-bold text-gray-900">热门城市推荐</h2>
          </div>
          
          <div className="flex flex-col space-y-6">
            {isLoadingCities ? (
              <div className="text-sm text-gray-400 px-1 font-medium">正在寻找热门城市...</div>
            ) : popularCities.length > 0 ? (
              popularCities.map((city, index) => (
                <Link key={city.id} href={`/companions?city=${city.slug}`} onClick={onMenuClick} className={`flex flex-col group cursor-pointer px-1 flex-shrink-0 ${index === popularCities.length - 1 ? 'pb-8' : ''}`}>
                  <div className="relative w-full aspect-[4/5] rounded-[16px] overflow-hidden bg-gray-100 mb-2 shadow-sm border border-black/5">
                    <img 
                      src={city.coverImage} 
                      alt={city.nameZh} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md text-white text-[12px] px-2 py-1 rounded-md flex items-center gap-1 font-medium tracking-wide">
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                      <span>{city.roomCount}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-gray-900 leading-tight">{city.nameZh} {city.nameEn}</h3>
                    <p className="text-[13px] text-gray-500 font-medium mt-1">{city.companionCount}位搭子 · {city.roomCount}个神秘房间</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-sm text-gray-400 px-1 font-medium">暂无城市数据，请在后台添加。</div>
            )}
          </div>
        </div>
      )}

      <div className="mb-6 px-4 py-2 flex-shrink-0">
        <h1 className="text-2xl font-black text-[#FF8C00] italic tracking-tighter">OctoRoom</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pb-4 scrollbar-hide relative z-10">
        <Link href="/" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
          <span>主页</span>
        </Link>
        
        {isSignedIn && (
          <>
            <Link href="/discover" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <span>发现博主</span>
            </Link>
            <Link href="/companions" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
              <span>城市搭子</span>
            </Link>
            <Link href="/rooms" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6.75h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>
              <span>章鱼房间</span>
            </Link>
            <Link href="/profile" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              <span>我的主页</span>
            </Link>
            <Link href="/albums" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              <span>我的相册</span>
            </Link>

            <Link href="/my-rooms" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <span>我的房源</span>
            </Link>

            <Link href="/my-comments" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <span>我的评论</span>
            </Link>

            <Link href="/my-marks" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              <span>我的收藏</span>
            </Link>

            <Link href="/my-bookings" onClick={onMenuClick} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-gray-200/50 transition-all text-[16px] font-medium text-gray-900 w-fit pr-6">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span>我的预定</span>
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
              <span className={unreadMsgCount > 0 ? 'font-bold text-gray-900' : ''}>私信</span>
            </Link>
          </>
        )}
      </div>

      {isSignedIn && (
        <div className="pt-4 mt-auto flex-shrink-0 relative z-10">
          <button onClick={() => { handleSignOut(); onMenuClick?.(); }} className="flex items-center space-x-4 px-4 py-2.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-all text-base font-medium text-gray-500 group w-fit pr-6">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 group-hover:text-red-600 transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
            <span>退出登录</span>
          </button>
        </div>
      )}
    </nav>
  );
}