'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLocalAuth } from '@/components/InsforgeProviderWrapper';

export default function NotificationBell() {
  const { isSignedIn } = useLocalAuth();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [msgCount, setMsgCount] = useState(0);
  const [hostCount, setHostCount] = useState(0);
  const [guestCount, setGuestCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);

  const totalUnread = msgCount + hostCount + guestCount + activityCount;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    if (!isSignedIn) return;

    const fetchCounts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      supabase.from('messages').select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id)
        .then(({ count }) => isMounted && count !== null && setMsgCount(count));

      supabase.from('octo_bookings').select('*', { count: 'exact', head: true })
        .eq('host_id', user.id)
        .eq('host_unread', true)
        .then(({ count }) => isMounted && count !== null && setHostCount(count));

      supabase.from('octo_bookings').select('*', { count: 'exact', head: true })
        .eq('guest_id', user.id)
        .eq('guest_unread', true)
        .then(({ count }) => isMounted && count !== null && setGuestCount(count));

      supabase.from('notifications').select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)
        .then(({ count }) => isMounted && count !== null && setActivityCount(count));
    };

    fetchCounts();

    const channel = supabase.channel('global_bell_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'octo_bookings' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchCounts)
      .subscribe();

    const handleLocalMsg = (e: any) => setMsgCount(prev => Math.max(0, prev - (e.detail?.readCount || 0)));
    const handleLocalHost = (e: any) => setHostCount(prev => Math.max(0, prev - (e.detail?.count || 0)));
    const handleLocalGuest = (e: any) => setGuestCount(prev => Math.max(0, prev - (e.detail?.count || 0)));
    const handleLocalNotifications = (e: any) => setActivityCount(prev => Math.max(0, prev - (e.detail?.count || 0)));

    window.addEventListener('local_messages_read', handleLocalMsg);
    window.addEventListener('local_host_orders_read', handleLocalHost);
    window.addEventListener('local_guest_orders_read', handleLocalGuest);
    window.addEventListener('local_notifications_read', handleLocalNotifications);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('local_messages_read', handleLocalMsg);
      window.removeEventListener('local_host_orders_read', handleLocalHost);
      window.removeEventListener('local_guest_orders_read', handleLocalGuest);
      window.removeEventListener('local_notifications_read', handleLocalNotifications);
    };
  }, [isSignedIn]);

  if (!isSignedIn) return null;

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
      >
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>

        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center min-w-[16px] h-[16px] border-2 border-white shadow-sm">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2 transform origin-top-right transition-all">
          <div className="px-4 py-2 border-b border-gray-50 mb-1">
            <span className="text-[11px] font-bold text-gray-400">消息通知</span>
          </div>

          {totalUnread === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400 font-medium">
              暂无新消息
            </div>
          ) : (
            <div className="flex flex-col">
              <Link href="/messages" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group">
                <span className="text-[14px] font-bold text-gray-700 group-hover:text-blue-600">我的私信</span>
                {msgCount > 0 && <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{msgCount}</span>}
              </Link>
              <Link href="/my-rooms" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group">
                <span className="text-[14px] font-bold text-gray-700 group-hover:text-blue-600">收到的订单</span>
                {hostCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{hostCount}</span>}
              </Link>
              <Link href="/my-bookings" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group">
                <span className="text-[14px] font-bold text-gray-700 group-hover:text-blue-600">发出的预定</span>
                {guestCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{guestCount}</span>}
              </Link>
              <Link href="/notifications" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group">
                <span className="text-[14px] font-bold text-gray-700 group-hover:text-blue-600">互动与 OA</span>
                {activityCount > 0 && <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{activityCount}</span>}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
