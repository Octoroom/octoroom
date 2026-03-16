// src/app/my-bookings/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

// --- 矢量图标库 ---
const Icons = {
  wifi: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>,
  ac: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.296 0 .587-.013.873-.038M3.375 19.5a8.96 8.96 0 01-2.368-7.859M15 6.75h.008v.008H15V6.75zm-3 0h.008v.008H12V6.75zm-3 0h.008v.008H9V6.75zm-3 0h.008v.008H6V6.75z" /></svg>,
  kitchen: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  washer: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
  bathroom: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.375a1.875 1.875 0 01-1.875-1.875V8.625zM16.5 4.125c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v15.75c0 1.035-.84 1.875-1.875 1.875h-.375a1.875 1.875 0 01-1.875-1.875V4.125z" /></svg>,
  workspace: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>
};

const getDisplayImages = (room: any) => {
  if (room?.cover_image) {
    const urls = room.cover_image.split(',').map((s:string) => s.trim()).filter((u:string) => u.startsWith('http'));
    if (urls.length > 0) return urls;
  }
  const fallbackId = room?.id || 'default';
  const roomImages = [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=800&q=80"
  ];
  const idx1 = fallbackId.charCodeAt(0) % roomImages.length;
  const idx2 = (idx1 + 1) % roomImages.length;
  const idx3 = (idx1 + 2) % roomImages.length;
  return [roomImages[idx1], roomImages[idx2], roomImages[idx3]];
};

function RoomCardSlider({ images, roomCity, statusConf }: { images: string[], roomCity: string, statusConf: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const width = sliderRef.current.clientWidth;
    if (width > 0) setCurrentIndex(Math.round(e.currentTarget.scrollLeft / width));
  };

  const scrollNext = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (sliderRef.current) sliderRef.current.scrollBy({ left: sliderRef.current.clientWidth, behavior: 'smooth' });
  };

  const scrollPrev = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (sliderRef.current) sliderRef.current.scrollBy({ left: -sliderRef.current.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full h-56 sm:h-64 bg-gray-100 overflow-hidden group/slider flex-shrink-0">
      <div ref={sliderRef} className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" onScroll={handleScroll}>
        {images.map((img, idx) => (
          <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
            <img src={img} className="w-full h-full object-cover" alt={`cover-${idx}`} />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
          </div>
        ))}
      </div>

      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-gray-900 font-bold text-[12px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm z-10 pointer-events-none">
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
        {roomCity}
      </div>

      <div className={`absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full text-xs font-bold shadow-md backdrop-blur-md border ${statusConf.badgeClass}`}>
        {statusConf.text}
      </div>

      {images.length > 1 && (
        <>
          <button onClick={scrollPrev} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all duration-300 z-20 shadow-sm"><svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
          <button onClick={scrollNext} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all duration-300 z-20 shadow-sm"><svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
            {images.map((_, i) => (<div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-3.5 bg-white' : 'w-1.5 bg-white/60'}`} />))}
          </div>
        </>
      )}
    </div>
  );
}

export default function MyBookingsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [refundingId, setRefundingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyBookings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('octo_bookings')
        .select('*, octo_rooms(id, title, city_name, price, room_type, rent_mode, amenities, cover_image, author_name, author_avatar)')
        .eq('guest_id', user.id)
        .order('created_at', { ascending: false });

      setBookings(data || []);
      setLoading(false);
    }
    fetchMyBookings();
  }, []);

  const handleStripePayment = async (bookingId: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingId,
          roomTitle: booking.octo_rooms?.title,
          price: booking.octo_rooms?.price,
          hostId: booking.host_id,
          customHostUrl: window.location.origin,
        })
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(t('alert.payFailed') + ": " + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert(t('alert.payError') + ": " + err.message);
    }
  };

  const handleRefund = async (bookingId: string) => {
    if (!window.confirm(t('bookings.refund.confirm'))) return;
    setRefundingId(bookingId);
    try {
      const res = await fetch('/api/stripe/refund', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId }) });
      const data = await res.json();
      if (data.success) {
        alert(data.message || t('bookings.refund.success'));
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled', payment_status: 'refunded' } : b));
      } else {
        alert(t('bookings.refund.failed') + ': ' + (data.message || data.error || 'Unknown'));
      }
    } catch { alert(t('bookings.refund.error')); }
    finally { setRefundingId(null); }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm(t('bookings.cancel.confirm'))) return;
    try {
      const { error } = await supabase.from('octo_bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      if (error) throw error;
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    } catch (err: any) { alert(t('alert.cancelFailed') + '：' + err.message); }
  };

  const handleSendReply = async (bookingId: string) => {
    const text = replyTexts[bookingId];
    if (!text?.trim()) return;

    const booking = bookings.find(b => b.id === bookingId);
    const newMsg = {
      role: 'guest',
      text: text.trim(),
      created_at: new Date().toISOString()
    };
    const updatedHistory = [...(booking.chat_history || []), newMsg];

    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, chat_history: updatedHistory } : b));
    setReplyTexts(prev => ({ ...prev, [bookingId]: '' }));

    try {
      const { error } = await supabase.from('octo_bookings').update({ chat_history: updatedHistory }).eq('id', bookingId);
      if (error) throw error;
    } catch (err: any) { alert("发送失败: " + err.message); }
  };

  const calculateNights = (inDate: string, outDate: string) => {
    const diff = new Date(outDate).getTime() - new Date(inDate).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid': return { text: t('bookings.confirmed'), badgeClass: 'bg-green-500/90 text-white border-green-400' };
      case 'approved': return { text: t('status.approved'), badgeClass: 'bg-orange-500/90 text-white border-orange-400' };
      case 'rejected': return { text: t('status.rejected'), badgeClass: 'bg-red-500/90 text-white border-red-400' };
      case 'cancelled': return { text: t('status.cancelled'), badgeClass: 'bg-gray-500/90 text-white border-gray-400' };
      default: return { text: t('status.pending'), badgeClass: 'bg-blue-500/90 text-white border-blue-400' };
    }
  };

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-gray-50 flex flex-col relative">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        <h1 className="text-xl font-black text-gray-900">{t('bookings.title')}</h1>
        <button onClick={() => router.push('/rooms')} className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full transition">{t('bookings.browseRooms')}</button>
      </div>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-32 text-gray-400 font-medium">{t('bookings.empty')}</div>
        ) : (
          <div className="flex flex-col gap-8">
            {bookings.map(booking => {
              const statusConf = getStatusConfig(booking.status);
              const nights = calculateNights(booking.check_in, booking.check_out);
              const room = booking.octo_rooms;

              return (
                <div key={booking.id} className="bg-white border border-gray-200 rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col relative">
                  
                  <RoomCardSlider images={getDisplayImages(room)} roomCity={room?.city_name || '神秘城市'} statusConf={statusConf} />

                  <div className="p-4 sm:p-5 flex flex-col">
                    
                    {/* 🌟 订单元信息：下单时间与短编号 */}
                    <div className="flex items-center justify-between bg-gray-50/80 px-3 py-2.5 rounded-xl mb-4 border border-gray-100">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {lang === 'en' ? 'Booked: ' : '下单时间：'}{new Date(booking.created_at).toLocaleString(lang === 'en' ? 'en-NZ' : 'zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '-')}
                      </div>
                      <div className="text-[10px] font-mono font-bold text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-100 shadow-sm">
                        ID: {booking.id.split('-')[0].toUpperCase()}
                      </div>
                    </div>

                    <div onClick={() => router.push(`/rooms/${booking.room_id}`)} className="cursor-pointer group mb-2">
                      <div className="text-[12px] font-bold text-gray-400 mb-1.5 flex items-center gap-1.5">
                        {lang === 'en' ? (room?.room_type === '独立单间' ? 'Private Room' : room?.room_type || 'Private Room') : (room?.room_type || '独立单间')} <span className="w-1 h-1 rounded-full bg-gray-300"></span> {lang === 'en' ? (room?.rent_mode === 'entire' ? 'Entire Place' : 'Per Room') : (room?.rent_mode === 'entire' ? '整套出租' : '按房间出租')}
                      </div>
                      <h2 className="text-[18px] font-black text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">{room?.title}</h2>
                      
                      {room?.amenities && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 mb-3 text-gray-400">
                           {room.amenities.split(',').map((s:string)=>s.trim()).filter(Boolean).slice(0, 5).map((item: string) => {
                              const Icon = Icons[item as keyof typeof Icons];
                              const label = item === 'wifi' ? 'Wi-Fi' : item === 'ac' ? t('amenity.ac') : item === 'kitchen' ? t('amenity.kitchen') : item === 'washer' ? t('amenity.washer') : item === 'bathroom' ? t('amenity.bathroom') : item === 'workspace' ? t('amenity.workspace') : item;
                              return Icon ? (
                                <div key={item} className="flex items-center gap-1 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded text-[10px] font-medium" title={item}>
                                  <div className="w-3 h-3 text-gray-400">{Icon}</div>
                                  <span>{label}</span>
                                </div>
                              ) : null
                           })}
                        </div>
                      )}
                      <div className="text-[16px] font-black text-blue-600">{room?.price?.includes('晚') ? room.price : `${room?.price || t('rooms.negotiate')} ${t('rooms.perNight')}`}</div>
                    </div>

                    <div className="w-full h-px bg-gray-100 my-4"></div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col gap-1">
                        <div className="text-[13px] font-bold text-gray-800 flex items-center gap-1.5">
                           <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                           {new Date(booking.check_in).toLocaleDateString(lang === 'en' ? 'en-NZ' : undefined)} {t('bookings.to')} {new Date(booking.check_out).toLocaleDateString(lang === 'en' ? 'en-NZ' : undefined)}
                        </div>
                        <div className="text-[12px] text-gray-500 font-medium ml-5.5">
                           {lang === 'en' ? `${nights} nights · ${booking.room_count || 1} rooms` : `共 ${nights} 晚 · 预定 ${booking.room_count || 1} 间房`}
                        </div>
                      </div>

                      <div onClick={() => router.push(`/user/${booking.host_id}`)} className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 p-1.5 rounded-xl transition-colors">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-gray-400">{t('bookings.host')}</span>
                          <span className="text-[12px] font-bold text-gray-700 max-w-[80px] truncate">{room?.author_name || (lang === 'en' ? 'Host' : '神秘房东')}</span>
                        </div>
                        <img src={room?.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.host_id}`} className="w-9 h-9 rounded-full object-cover bg-gray-100 border border-gray-200" alt="host" />
                      </div>
                    </div>

                    <div className="bg-gray-50/50 rounded-2xl border border-gray-100 mt-2 flex flex-col overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 font-bold text-[13px] text-gray-700 flex items-center gap-2 bg-white/50">
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>
                        {t('bookings.chat')}
                      </div>
                      
                      <div className="p-4 flex flex-col gap-4 max-h-[260px] overflow-y-auto">
                        {booking.guest_message && (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-gray-400 mb-1">{t('bookings.myMessage')}</span>
                            <div className="bg-blue-600 text-white text-[13px] py-2 px-3.5 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed shadow-sm">
                              {booking.guest_message}
                            </div>
                          </div>
                        )}
                        
                        {booking.chat_history?.map((msg: any, idx: number) => {
                          const isMe = msg.role === 'guest';
                          return (
                            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] font-bold text-gray-400 mb-1">
                                {isMe ? (lang === 'en' ? 'Me' : '我') : (lang === 'en' ? 'Host' : '房东回复')} · {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              <div className={`${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'} text-[13px] py-2 px-3.5 rounded-2xl max-w-[85%] leading-relaxed shadow-sm`}>
                                {msg.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                        <input 
                          value={replyTexts[booking.id] || ''} 
                          onChange={(e) => setReplyTexts(prev => ({...prev, [booking.id]: e.target.value}))}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendReply(booking.id)}
                          placeholder={t('bookings.chatPlaceholder')} 
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" 
                        />
                        <button 
                          onClick={() => handleSendReply(booking.id)} 
                          disabled={!replyTexts[booking.id]?.trim()}
                          className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:bg-gray-300 flex-shrink-0"
                        >
                          <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 translate-x-[1px] translate-y-[1px]"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                        </button>
                      </div>
                    </div>

                    {booking.status === 'pending' && (
                      <div className="mt-4 flex justify-end">
                        <button onClick={() => handleCancelBooking(booking.id)} className="px-5 py-2 rounded-xl text-[13px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 hover:text-red-500 transition">
                          {t('bookings.cancelApply')}
                        </button>
                      </div>
                    )}

                    {booking.status === 'approved' && (
                      <div className="mt-4">
                        <div className="text-xs text-green-600 font-bold mb-3 flex items-center gap-1.5">
                          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {t('bookings.ownerApproved')}
                        </div>
                        {(() => { const cp = room?.cancellation_policy || 'standard'; const pl:Record<string,string> = lang === 'en' ? { flexible: 'Flexible (Full refund up to 3 days before check-in)', standard: 'Standard (Full refund up to 7 days before check-in)', strict: 'Strict (Full refund up to 14 days before check-in)' } : { flexible: '灵活 (入住前3天可全额退款)', standard: '标准 (入住前7天可全额退款)', strict: '严格 (入住前14天可全额退款)' }; return (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-3 flex items-start gap-2">
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                            <div><div className="text-[11px] font-bold text-amber-700">{t('bookings.refundPolicy')}: {pl[cp] || cp}</div><div className="text-[10px] text-amber-600 mt-0.5">{t('bookings.refundPolicy.grace')}</div></div>
                          </div>); })()}
                        <div className="text-[10px] text-gray-400 mb-2 flex items-center gap-1"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{t('bookings.refundPolicy.agree')}</div>
                        <div className="flex gap-2">
                          <button onClick={() => handleCancelBooking(booking.id)} className="px-5 py-3.5 rounded-xl font-bold text-[14px] bg-gray-100 text-gray-500 hover:bg-gray-200 transition flex-shrink-0">
                            {t('bookings.cancel')}
                          </button>
                          <button onClick={() => handleStripePayment(booking.id)} className="flex-1 py-3.5 rounded-xl font-black text-[14px] bg-gray-900 text-white shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                            {t('bookings.pay')}
                          </button>
                        </div>
                      </div>
                    )}

                    {booking.status === 'paid' && booking.payment_status === 'held' && (
                      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[13px] font-bold text-blue-800 flex items-center gap-1.5"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m0-3a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" /></svg>{t('bookings.paid.held')}</div>
                          <div className="text-[10px] text-blue-500 font-medium">{t('bookings.paid.auto')}</div>
                        </div>
                        {(() => { const cp = booking.cancellation_policy || 'standard'; const pw:Record<string,number> = { flexible:3, standard:7, strict:14 }; const days = pw[cp]||7; const ci = new Date(booking.check_in); const dl = new Date(ci.getTime() - days*24*3600*1000); const now = new Date(); const canRefund = now < dl; return (
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] text-blue-600">{canRefund ? `${dl.toLocaleDateString(lang === 'en' ? 'en-NZ' : 'zh-CN')}${t('bookings.refund.before')}` : t('bookings.refund.expired')}</div>
                            <button onClick={() => handleRefund(booking.id)} disabled={!canRefund || refundingId === booking.id} className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5 ${canRefund ? 'bg-white text-red-500 border border-red-200 hover:bg-red-50 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                              {refundingId === booking.id ? <><div className="w-3 h-3 border-2 border-red-300 border-t-red-500 rounded-full animate-spin"></div>{t('bookings.refund.processing')}</> : <><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>{canRefund ? t('bookings.refund.apply') : t('bookings.refund.unavailable')}</>}
                            </button>
                          </div>); })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}