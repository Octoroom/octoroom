// src/app/my-rooms/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

// 🌟 FIX 1: Import CSS statically (Next.js handles this safely)
import 'leaflet/dist/leaflet.css';

// 🌟 FIX 2: Import ONLY the types for TypeScript, avoiding the actual JS payload on the server
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

function formatDate(date: Date) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDatesInRange(startDate: string, endDate: string) {
  const dates = [];
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  let currentDate = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  while (currentDate < end) {
    dates.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

const getDisplayImages = (room: any) => {
  if (room?.cover_image) {
    const urls = room.cover_image.split(',').map((s:string) => s.trim()).filter((u:string) => u.startsWith('http'));
    if (urls.length > 0) return urls;
  }
  const fallbackId = room?.id || 'default';
  const roomImages = [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=400&q=80"
  ];
  const idx1 = fallbackId.charCodeAt(0) % roomImages.length;
  const idx2 = (idx1 + 1) % roomImages.length;
  const idx3 = (idx1 + 2) % roomImages.length;
  return [roomImages[idx1], roomImages[idx2], roomImages[idx3]];
};

const buildAwesomePostContent = (title: string, city: string, addressName: string, roomType: string, rentMode: string, price: string, amenities: string[], description: string) => {
  const facilityMap: Record<string, string> = {
    wifi: '高速网络', ac: '冷暖空调', kitchen: '全套厨房',
    washer: '洗衣机', bathroom: '独立卫浴', workspace: '专属办公区'
  };
  
  const translatedAmenities = amenities.slice(0, 5).map((item: string) => facilityMap[item] || item).join(' · ');
  const rentText = rentMode === 'entire' ? '独享整套' : `精品分租`;
  const addrText = addressName ? `${city} | ${addressName}` : city;
  
  const descText = description ? `\n\n❝ ${description.slice(0, 60)}${description.length > 60 ? '...' : ''} ❞` : '';

  return ` 精选房源  ${title}

 坐标位置：${addrText}
 房源类型：${roomType} (${rentText})
 专享特价：${price}
 核心亮点：${translatedAmenities || '设施齐全，拎包入住'}${descText}

查看下方专属卡片了解更多实拍细节，欢迎直接申请入住。`;
};

function RoomCardSlider({ images, viewMode, roomCity, className }: { images: string[], viewMode: string, roomCity: string, className?: string }) {
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
    <div className={`relative bg-gray-100 overflow-hidden group/slider ${className}`}>
      <div ref={sliderRef} className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" onScroll={handleScroll}>
        {images.map((img, idx) => (
          <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
            <img src={img} className="w-full h-full object-cover" alt={`cover-${idx}`} />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
          </div>
        ))}
      </div>

      {viewMode === 'grid' && (
        <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md text-white text-[11px] px-2 py-1 rounded-full z-10 pointer-events-none max-w-[80%] truncate">{roomCity}</div>
      )}
      {viewMode === 'list' && (
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-gray-900 font-bold text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm z-10 pointer-events-none max-w-[80%] truncate">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-blue-600 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
          <span className="truncate">{roomCity}</span>
        </div>
      )}

      {images.length > 1 && (
        <>
          <button onClick={scrollPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 hover:bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all duration-300 z-20 shadow-sm"><svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
          <button onClick={scrollNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 hover:bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all duration-300 z-20 shadow-sm"><svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
            {images.map((_, i) => (<div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-2.5 bg-white' : 'w-1 bg-white/60'}`} />))}
          </div>
        </>
      )}
    </div>
  );
}

export default function MyRoomsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'rooms' | 'orders' | 'payouts'>(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab === 'payouts') return 'payouts';
    }
    return 'rooms';
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [rooms, setRooms] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  // Stripe / Dashboard
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardYear, setDashboardYear] = useState(() => new Date().getFullYear());

  const [customAmenities, setCustomAmenities] = useState<{id: string, label: string}[]>([]);
  const [newAmenity, setNewAmenity] = useState('');

  const [formData, setFormData] = useState({
    city: '', title: '', availableDate: '', priceAmount: '', priceCurrency: 'NZD',
    roomType: '独立单间', amenities: [] as string[], description: '', rentMode: 'entire', totalRooms: 1,
    addressName: '', lat: 0, lng: 0, 
    imageMode: 'system' as 'system' | 'custom',
    coverImageFiles: [] as File[],        
    coverImagePreviews: [] as string[],
    syncToPost: true
  });

  const baseFacilityOptions = [
    { id: 'wifi', label: '高速网络' }, { id: 'ac', label: '冷暖空调' },
    { id: 'kitchen', label: '全套厨房' }, { id: 'washer', label: '洗衣机' },
    { id: 'bathroom', label: '独立卫浴' }, { id: 'workspace', label: '专属工作区' }
  ];

  // 🌟 动态计算出未读的订单数量
  const unreadOrdersCount = orders.filter(o => o.host_unread).length;

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: roomsData } = await supabase.from('octo_rooms').select('*').eq('author_id', user.id).order('created_at', { ascending: false });
      setRooms(roomsData || []);

      const { data: ordersData } = await supabase.from('octo_bookings').select('*, octo_rooms(id, title, city_name, address_name, price, cover_image, author_name, author_avatar)').eq('host_id', user.id).order('created_at', { ascending: false });
      setOrders(ordersData || []);

      // Stripe account
      const sid = user.user_metadata?.stripe_account_id;
      if (sid) setStripeAccountId(sid);

      const savedAmenities = localStorage.getItem('octo_custom_amenities');
      if (savedAmenities) setCustomAmenities(JSON.parse(savedAmenities));
    } catch (error) { console.error(t('alert.fetchFailed') || "获取数据失败", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // 🌟 核心：当用户切换到“订单”Tab，且存在未读订单时，秒清红点
  useEffect(() => {
    if (activeTab === 'orders' && unreadOrdersCount > 0) {
      // 1. 广播给侧边栏，瞬间擦除数字
      window.dispatchEvent(new CustomEvent('local_host_orders_read', { detail: { count: unreadOrdersCount } }));
      
      // 2. 本地状态抹平
      setOrders(prev => prev.map(o => o.host_unread ? { ...o, host_unread: false } : o));

      // 3. 后台静默将数据库更新为已读
      const unreadIds = orders.filter(o => o.host_unread).map(o => o.id);
      if (unreadIds.length > 0) {
        supabase.from('octo_bookings').update({ host_unread: false }).in('id', unreadIds).then();
      }
    }
  }, [activeTab, unreadOrdersCount]);

  // Stripe Connect
  const handleConnectStripe = async () => {
    setIsConnectingStripe(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch('/api/stripe/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, email: user.email }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(t('alert.stripeConnectFailed') + ': ' + (data.error || '未知错误'));
    } catch (err) { alert(t('alert.stripeConnectError')); }
    finally { setIsConnectingStripe(false); }
  };

  // Dashboard data fetch
  useEffect(() => {
    if (activeTab === 'payouts' && stripeAccountId && !dashboardData) {
      setDashboardLoading(true);
      fetch(`/api/stripe/dashboard?stripeAccountId=${stripeAccountId}`)
        .then(r => r.json()).then(d => { if (!d.error) setDashboardData(d); })
        .catch(() => {}).finally(() => setDashboardLoading(false));
    }
  }, [activeTab, stripeAccountId]);

  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation(); 
    
    try {
      const { data: relatedOrders, error: checkError } = await supabase
        .from('octo_bookings')
        .select('id, status')
        .eq('room_id', roomId);

      if (checkError) throw checkError;

      if (relatedOrders && relatedOrders.length > 0) {
        const hasActive = relatedOrders.some(o => ['pending', 'approved', 'paid'].includes(o.status));
        if (hasActive) {
          alert(t('host.listings.delete.active'));
        } else {
          alert(t('host.listings.delete.hasHistory'));
        }
        return; 
      }

      if (!window.confirm(t('host.listings.delete.confirm'))) return;

      setRooms(prev => prev.filter(r => r.id !== roomId));

      const { data, error } = await supabase
        .from('octo_rooms')
        .delete()
        .eq('id', roomId)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
         throw new Error("数据库无响应，可能是 RLS 权限拦截了删除操作。");
      }
      
    } catch (error: any) {
      alert("❌ 操作失败: " + error.message);
      fetchData();
    }
  };

  useEffect(() => {
    if (isPublishModalOpen && mapContainerRef.current && !mapInstanceRef.current) {
      (async () => {
        const L = (await import('leaflet')).default;

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        const initialLat = formData.lat || -36.8485;
        const initialLng = formData.lng || 174.7633;
        
        const map = L.map(mapContainerRef.current!).setView([initialLat, initialLng], formData.lat ? 15 : 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        if (formData.lat && formData.lng) {
          markerRef.current = L.marker([formData.lat, formData.lng]).addTo(map);
        }

        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setFormData(prev => ({ ...prev, lat, lng }));
          
          if (!markerRef.current) {
            markerRef.current = L.marker([lat, lng]).addTo(map);
          } else {
            markerRef.current.setLatLng([lat, lng]);
          }
        });

        mapInstanceRef.current = map;
      })();
    }

    return () => {
      if (!isPublishModalOpen && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isPublishModalOpen]);

  const handleGeocode = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (!formData.addressName.trim()) { alert("请先输入具体地址哦！"); return; }
    setIsGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.addressName)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) { 
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setFormData(prev => ({ ...prev, lat, lng })); 
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.5 });
          if (!markerRef.current) {
            const L = (await import('leaflet')).default;
            markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
          } else {
            markerRef.current.setLatLng([lat, lng]);
          }
        }
      } else { alert("找不到坐标，请尝试输入更详细的地址。"); }
    } catch (error) { alert("网络错误"); } finally { setIsGeocoding(false); }
  };

  const toggleFacility = (id: string) => {
    setFormData(prev => ({ ...prev, amenities: prev.amenities.includes(id) ? prev.amenities.filter(f => f !== id) : [...prev.amenities, id] }));
  };

  const handleAddCustomAmenity = () => {
    if (!newAmenity.trim()) return;
    const newId = newAmenity.trim();
    if (!customAmenities.find(a => a.id === newId) && !baseFacilityOptions.find(a => a.id === newId)) {
      const newList = [...customAmenities, { id: newId, label: newId }];
      setCustomAmenities(newList);
      localStorage.setItem('octo_custom_amenities', JSON.stringify(newList));
    }
    if (!formData.amenities.includes(newId)) toggleFacility(newId);
    setNewAmenity('');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setFormData(prev => ({
        ...prev, coverImageFiles: [...prev.coverImageFiles, ...files], coverImagePreviews: [...prev.coverImagePreviews, ...files.map(f => URL.createObjectURL(f))]
      }));
    }
    e.target.value = ''; 
  };

  const removeNewImage = (index: number) => {
    setFormData(prev => {
       const newFiles = [...prev.coverImageFiles]; const newPreviews = [...prev.coverImagePreviews];
       newFiles.splice(index, 1); newPreviews.splice(index, 1);
       return { ...prev, coverImageFiles: newFiles, coverImagePreviews: newPreviews };
    });
  };

  const handlePublish = async () => {
    if (!formData.title.trim() || !formData.city.trim() || !formData.priceAmount.trim()) { alert(t('alert.missingInfo')); return; }
    if (formData.imageMode === 'custom' && formData.coverImageFiles.length === 0) { alert(t('alert.noImages')); return; }
    
    setIsPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(); 

      let finalImageUrls: string[] = [];
      if (formData.imageMode === 'custom' && formData.coverImageFiles.length > 0) {
        const uploadPromises = formData.coverImageFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('rooms').upload(fileName, file);
          if (uploadError) throw new Error('图片上传失败: ' + uploadError.message);
          const { data: urlData } = supabase.storage.from('rooms').getPublicUrl(fileName);
          return urlData.publicUrl;
        });
        finalImageUrls = await Promise.all(uploadPromises);
      }

      const finalPrice = `${formData.priceAmount} ${formData.priceCurrency} / 晚`;
      const coverImageString = finalImageUrls.length > 0 ? finalImageUrls.join(',') : null;

      const { data: newRoom, error: insertError } = await supabase.from('octo_rooms').insert([{
        author_id: user.id, author_name: userProfile?.username || user.email?.split('@')[0] || '神秘房东', author_avatar: userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        title: formData.title, city_name: formData.city, available_date: formData.availableDate || null,
        price: finalPrice, room_type: formData.roomType, amenities: formData.amenities.join(','), 
        description: formData.description, rent_mode: formData.rentMode,
        total_rooms: formData.rentMode === 'entire' ? 1 : Number(formData.totalRooms), cover_image: coverImageString,
        address_name: formData.addressName, latitude: formData.lat || null, longitude: formData.lng || null
      }]).select().single();

      if (insertError) throw insertError;

      if (formData.syncToPost) {
        const postImage = finalImageUrls.length > 0 ? finalImageUrls[0] : `https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=80&random=${newRoom?.id}`;
        
        const postContent = buildAwesomePostContent(formData.title, formData.city, formData.addressName, formData.roomType, formData.rentMode, finalPrice, formData.amenities, formData.description);

        const { error: postError } = await supabase.from('posts').insert([{
          author_id: user.id, 
          octo_room_id: newRoom.id, 
          content: postContent,
          image_urls: [postImage],
        }]);

        if (postError) {
          console.error("同步动态报错详情:", postError);
          throw new Error("同步到日常动态失败：" + postError.message);
        }
      }

      setIsPublishModalOpen(false); 
      setFormData({ city: '', title: '', availableDate: '', priceAmount: '', priceCurrency: 'NZD', roomType: '独立单间', amenities: [], description: '', rentMode: 'entire', totalRooms: 1, addressName: '', lat: 0, lng: 0, imageMode: 'system', coverImageFiles: [], coverImagePreviews: [], syncToPost: true });
      fetchData();                 
    } catch (error: any) { alert("操作提示: " + error.message); } finally { setIsPublishing(false); }
  };

  const handleApproval = async (bookingId: string, newStatus: 'approved' | 'rejected') => {
    try {
      // 🌟 修改状态的同时，让房客的界面亮起红点 (guest_unread: true)
      const { error } = await supabase.from('octo_bookings')
        .update({ status: newStatus, guest_unread: true })
        .eq('id', bookingId);
      if (error) throw error;
      setOrders(prev => prev.map(order => order.id === bookingId ? { ...order, status: newStatus } : order));
    } catch (err: any) { alert('操作失败: ' + err.message); }
  };

  const handleSendReply = async (bookingId: string) => {
    const text = replyTexts[bookingId];
    if (!text?.trim()) return;

    const booking = orders.find(b => b.id === bookingId);
    const newMsg = { role: 'host', text: text.trim(), created_at: new Date().toISOString() };
    const updatedHistory = [...(booking.chat_history || []), newMsg];

    setOrders(prev => prev.map(b => b.id === bookingId ? { ...b, chat_history: updatedHistory } : b));
    setReplyTexts(prev => ({ ...prev, [bookingId]: '' }));

    try {
      // 🌟 回复消息的同时，让房客的界面亮起红点 (guest_unread: true)
      const { error } = await supabase.from('octo_bookings')
        .update({ chat_history: updatedHistory, guest_unread: true })
        .eq('id', bookingId);
      if (error) throw error;
    } catch (err: any) { alert("发送失败: " + err.message); }
  };

  const renderHostCalendar = (room: any) => {
    const year = calendarViewDate.getFullYear(); const month = calendarViewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    const roomOrders = orders.filter(o => o.room_id === room.id && ['pending', 'approved', 'paid'].includes(o.status));
    const dateCounts: Record<string, number> = {};

    roomOrders.forEach(booking => {
      const dates = getDatesInRange(booking.check_in, booking.check_out);
      dates.forEach(date => { dateCounts[date] = (dateCounts[date] || 0) + (booking.room_count || 1); });
    });

    const totalRooms = room.total_rooms || 1; const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-6 h-6 sm:w-7 sm:h-7"></div>);

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i); const dateStr = formatDate(d);
      const count = dateCounts[dateStr] || 0;
      let bgClass = "bg-white text-gray-800 border border-gray-100";
      if (count >= totalRooms) bgClass = "bg-red-50 text-red-600 font-bold border-red-200 shadow-sm"; 
      else if (count > 0) bgClass = "bg-orange-50 text-orange-600 font-bold border-orange-200 shadow-sm"; 

      days.push(
        <div key={dateStr} className={`w-6 h-6 sm:w-7 sm:h-7 flex flex-col items-center justify-center rounded-md text-[11px] relative ${bgClass}`}>
           <span>{i}</span>
           {count > 0 && totalRooms > 1 && <span className="text-[7px] absolute bottom-0 opacity-80">{count}/{totalRooms}</span>}
        </div>
      );
    }
    return days;
  };

  const renderRevenueChart = (room: any) => {
    const year = calendarViewDate.getFullYear(); const month = calendarViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const roomOrders = orders.filter(o => o.room_id === room.id && ['approved', 'paid'].includes(o.status));
    const dateCounts: Record<string, number> = {};

    roomOrders.forEach(booking => {
      const dates = getDatesInRange(booking.check_in, booking.check_out);
      dates.forEach(date => { dateCounts[date] = (dateCounts[date] || 0) + (booking.room_count || 1); });
    });

    const priceMatch = (room.price || '').match(/\d+(\.\d+)?/);
    const dailyPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
    const currency = (room.price || '').replace(/[^a-zA-Z]/g, '') || 'NZD';

    const dataPoints = []; let maxRev = 0;
    for(let i = 1; i <= daysInMonth; i++) {
      const d = formatDate(new Date(year, month, i));
      const rev = (dateCounts[d] || 0) * dailyPrice;
      dataPoints.push(rev);
      if (rev > maxRev) maxRev = rev;
    }

    const chartWidth = 100; const chartHeight = 40;
    const points = dataPoints.map((val, idx) => {
      const x = (idx / (daysInMonth - 1)) * chartWidth;
      const y = maxRev === 0 ? chartHeight - 2 : chartHeight - (val / maxRev) * (chartHeight - 8) - 2; 
      return `${x},${y}`;
    }).join(' ');

    const polygonPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;
    const totalRevenue = dataPoints.reduce((a,b) => a + b, 0);

    return (
      <div className="flex flex-col justify-center h-full pt-1 pb-1 w-full">
        <div className="flex justify-between items-end mb-2 px-1">
           <div className="flex items-center gap-1.5">
             <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-green-500"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
             <span className="text-[11px] font-bold text-gray-500">{t('host.payouts.revenue.estimate')}</span>
           </div>
           <span className="text-[14px] font-black text-green-600">{totalRevenue > 0 ? `+${totalRevenue.toLocaleString()} ${currency}` : '0'}</span>
        </div>
        <div className="relative w-full h-12 flex-1">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs><linearGradient id={`grad-${room.id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.25"/><stop offset="100%" stopColor="#22c55e" stopOpacity="0"/></linearGradient></defs>
            <polygon fill={`url(#grad-${room.id})`} points={polygonPoints} />
            <polyline fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
          </svg>
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-gray-400 font-bold px-1"><span>{month + 1}/1</span><span>{month + 1}/{daysInMonth}</span></div>
      </div>
    );
  };

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-gray-50 flex flex-col relative pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-40 gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">{t('host.header')}</h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">{t('host.header.hint')}</p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => router.push('/my-properties')} 
            className="flex-1 sm:flex-none bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 font-bold py-2 px-4 rounded-full shadow-sm flex items-center justify-center gap-1.5 text-[13px] transition-colors"
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>
            {t('host.sellHouse')}
          </button>

          <button 
            onClick={() => setIsPublishModalOpen(true)} 
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-sm flex items-center justify-center gap-1.5 text-[13px] transition-colors"
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            {t('host.publishListing')}
          </button>
        </div>
      </div>

      <div className="flex w-full bg-white border-b border-gray-100 sticky top-[69px] z-30">
        <button onClick={() => setActiveTab('rooms')} className={`flex-1 py-3 text-[14px] relative transition-colors ${activeTab === 'rooms' ? 'font-bold text-blue-600' : 'font-medium text-gray-500'}`}>{t('host.tab.listings')}</button>
        <button onClick={() => setActiveTab('orders')} className={`flex-1 py-3 text-[14px] relative transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'orders' ? 'font-bold text-blue-600' : 'font-medium text-gray-500'}`}>
          {t('host.tab.orders')}
          {unreadOrdersCount > 0 && (<span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center min-w-[18px] h-[18px] shadow-sm">{unreadOrdersCount > 99 ? '99+' : unreadOrdersCount}</span>)}
        </button>
        <button onClick={() => setActiveTab('payouts')} className={`flex-1 py-3 text-[14px] relative transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'payouts' ? 'font-bold text-blue-600' : 'font-medium text-gray-500'}`}>
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
          {t('host.tab.payouts')}
        </button>
        <div className="absolute bottom-0 h-[3px] bg-blue-600 rounded-full transition-all duration-300 w-16" style={{ left: activeTab === 'rooms' ? '16.67%' : activeTab === 'orders' ? '50%' : '83.33%', transform: 'translateX(-50%)' }}></div>
      </div>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : activeTab === 'payouts' ? (
          <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-300">
            {!stripeAccountId ? (
              <>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
                  <h2 className="text-xl font-black mb-2 flex items-center gap-2"><svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.88-3.12 3.16z"/></svg>{t('host.payouts.secure')}</h2>
                  <p className="text-blue-100 text-[13px] font-medium leading-relaxed my-2 max-w-[90%]">{t('host.payouts.secure.hint')}</p>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-200 mt-4"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{t('host.payouts.privacy')}</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                  <h3 className="text-[18px] font-black text-gray-900 mb-2">{t('host.payouts.connect.title')}</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm">{t('host.payouts.connect.hint')}</p>
                  <button onClick={handleConnectStripe} disabled={isConnectingStripe} className="w-full sm:w-auto px-8 py-3.5 bg-[#635BFF] hover:bg-[#5851E5] text-white rounded-xl font-bold shadow-md shadow-[#635BFF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isConnectingStripe ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>{t('common.loading')}</>) : (<>{t('host.payouts.connect.button')} <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></>)}
                  </button>
                </div>
              </>
            ) : (
              <>
                {dashboardLoading ? (
                  <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute -top-3 -right-3 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                        <div className="flex items-center gap-1.5 mb-2"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 opacity-80"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg><span className="text-[10px] font-bold opacity-80">{t('host.payouts.balance.available')}</span></div>
                        <div className="text-[20px] font-black leading-tight">{dashboardData ? `$${(dashboardData.balance.available / 100).toFixed(2)}` : '$0.00'}</div>
                        <div className="text-[10px] font-medium opacity-70 mt-1">{(dashboardData?.balance?.currency || 'nzd').toUpperCase()}</div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute -top-3 -right-3 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                        <div className="flex items-center gap-1.5 mb-2"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 opacity-80"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-[10px] font-bold opacity-80">{t('host.payouts.balance.pending')}</span></div>
                        <div className="text-[20px] font-black leading-tight">{dashboardData ? `$${(dashboardData.balance.pending / 100).toFixed(2)}` : '$0.00'}</div>
                        <div className="text-[10px] font-medium opacity-70 mt-1">{t('host.payouts.balance.processing')}</div>
                      </div>
                      {(() => { const now = new Date(); const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`; const mi = orders.filter((o:any) => o.status==='paid' && o.created_at?.startsWith(thisMonth)).reduce((s:number,o:any) => { const m = (o.octo_rooms?.price||'').match(/[\d.]+/); return s+(m?parseFloat(m[0]):0)*(o.room_count||1); },0); return (
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                          <div className="absolute -top-3 -right-3 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
                          <div className="flex items-center gap-1.5 mb-2"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 opacity-80"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg><span className="text-[10px] font-bold opacity-80">{t('host.payouts.revenue.monthly')}</span></div>
                          <div className="text-[20px] font-black leading-tight">${mi>0?mi.toLocaleString():'0'}</div>
                          <div className="text-[10px] font-medium opacity-70 mt-1">{t('host.payouts.revenue.stats')}</div>
                        </div>); })()}
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg><h3 className="text-[15px] font-black text-gray-900">{t('host.payouts.chart.title')}</h3></div>
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                          <button onClick={() => setDashboardYear(p => p-1)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 text-xs">&lt;</button>
                          <span className="text-[12px] font-bold text-gray-700 min-w-[36px] text-center">{dashboardYear}</span>
                          <button onClick={() => setDashboardYear(p => p+1)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 text-xs">&gt;</button>
                        </div>
                      </div>
                      {(() => { 
                        const ml = lang === 'en' ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] : ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
                        const md = Array(12).fill(0); 
                        orders.filter((o:any)=>o.status==='paid').forEach((o:any)=>{
                          const d = new Date(o.created_at);
                          if(d.getFullYear() === dashboardYear){
                            const pm = (o.octo_rooms?.price||'').match(/[\d.]+/);
                            md[d.getMonth()] += (pm?parseFloat(pm[0]):0)*(o.room_count||1);
                          }
                        }); 
                        const mx = Math.max(...md,1); 
                        const yt = md.reduce((a,b)=>a+b,0); 
                        return (<>
                          <div className="flex items-end gap-[6px] h-[140px] px-1">
                            {md.map((v,i)=>{
                              const hp = Math.max((v/mx)*100,3);
                              const ic = dashboardYear === new Date().getFullYear() && i === new Date().getMonth();
                              return(
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                                  {v>0 && <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">${v.toLocaleString()}</div>}
                                  <div className={`w-full rounded-t-md transition-all duration-500 ${ic?'bg-gradient-to-t from-blue-600 to-blue-400 shadow-sm shadow-blue-200':v>0?'bg-gradient-to-t from-gray-300 to-gray-200 group-hover:from-blue-500 group-hover:to-blue-300':'bg-gray-100'}`} style={{height:`${hp}%`}}></div>
                                  <span className={`text-[9px] font-bold ${ic?'text-blue-600':'text-gray-400'}`}>{ml[i]}</span>
                                </div>);
                            })}
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                            <span className="text-[12px] font-bold text-gray-400">{t('host.payouts.chart.total').replace('{year}', dashboardYear.toString())}</span>
                            <span className="text-[16px] font-black text-gray-900">${yt>0?yt.toLocaleString():'0'}</span>
                          </div>
                        </>); 
                      })()}
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg><h3 className="text-[15px] font-black text-gray-900">{t('host.payouts.transactions.title')}</h3></div>
                      {dashboardData?.transactions && dashboardData.transactions.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                          {dashboardData.transactions.slice(0,15).map((tx:any)=>{
                            const ip=tx.amount>0;
                            const tl:Record<string,string>={
                              charge:t('host.payouts.transactions.type.charge'),
                              payment:t('host.payouts.transactions.type.charge'),
                              payout:t('host.payouts.transactions.type.payout'),
                              refund:t('host.payouts.transactions.type.refund'),
                              transfer:t('host.payouts.transactions.type.transfer') || 'Transfer',
                              adjustment:t('host.payouts.transactions.type.adjustment') || 'Adjustment',
                              stripe_fee:t('host.payouts.transactions.type.fee') || 'Fee',
                              payment_refund:t('host.payouts.transactions.type.refund')
                            };
                            const tLabel=tl[tx.type]||tx.type;
                            const sc:Record<string,string>={available:'bg-green-50 text-green-600 border-green-100',pending:'bg-amber-50 text-amber-600 border-amber-100'};
                            const s=sc[tx.status]||'bg-gray-50 text-gray-500 border-gray-100';
                            return(
                              <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ip?'bg-green-50 text-green-500':'bg-red-50 text-red-400'}`}>
                                    {ip?<svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg>:<svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" /></svg>}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-bold text-gray-800 flex items-center gap-1.5">{tLabel}<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${s}`}>{tx.status==='available'?t('host.payouts.transactions.status.paid'):t('host.payouts.transactions.status.pending')}</span></div>
                                    <div className="text-[11px] text-gray-400 font-medium truncate">{new Date(tx.created*1000).toLocaleDateString(lang==='en'?'en-NZ':'zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-3">
                                  <div className={`text-[14px] font-black ${ip?'text-green-600':'text-red-500'}`}>{ip?'+':''}{(tx.amount/100).toFixed(2)}</div>
                                  {tx.fee>0&&<div className="text-[10px] text-gray-400 font-medium">{t('host.payouts.transactions.fee')} {(tx.fee/100).toFixed(2)}</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-gray-400">
                          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto mb-3 text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                          <div className="text-[13px] font-bold">{t('host.payouts.transactions.empty')}</div>
                          <div className="text-[11px] mt-1">{t('host.payouts.transactions.empty.hint')}</div>
                        </div>
                      )}
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center border border-green-100"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                          <div><div className="text-[14px] font-black text-gray-900">{t('host.payouts.stripe.connected')}</div><div className="text-[10px] font-mono text-gray-400 mt-0.5">ID: {stripeAccountId}</div></div>
                        </div>
                        <button onClick={handleConnectStripe} disabled={isConnectingStripe} className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg font-bold shadow-sm transition-all text-[12px] flex items-center gap-1.5">
                          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                          {isConnectingStripe ? t('common.loading') : t('host.payouts.stripe.dashboard')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'rooms' ? (
          rooms.length === 0 ? (
            <div className="text-center py-20 text-gray-400">{t('host.listings.empty')}</div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 px-1">
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                  <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))} className="w-6 h-6 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-200 text-gray-600 transition-colors text-xs">&lt;</button>
                  <div className="text-[13px] font-bold text-gray-800 min-w-[70px] text-center">{t('host.listings.dateRange').replace('{year}', calendarViewDate.getFullYear().toString()).replace('{month}', (calendarViewDate.getMonth() + 1).toString())}</div>
                  <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))} className="w-6 h-6 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-200 text-gray-600 transition-colors text-xs">&gt;</button>
                </div>
                <div className="flex bg-gray-200/50 p-1 rounded-lg">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"/></svg></button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/></svg></button>
                </div>
              </div>

              <div className={viewMode === 'grid' ? "columns-2 gap-3 space-y-3" : "flex flex-col gap-4"}>
                {rooms.map((room) => (
                  <div key={room.id} className={`relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all ${viewMode === 'list' ? 'flex flex-col sm:flex-row p-3 gap-4 items-stretch' : 'flex flex-col'}`}>
                    
                     <div className="absolute top-2 right-2 z-30 flex flex-col gap-2">
                       <button 
                         onClick={(e) => handleDeleteRoom(e, room.id)}
                         className="w-7 h-7 bg-white/70 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-600 shadow-sm transition-all text-gray-600"
                         title={t('host.listings.delete.title')}
                       >
                         <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                         </svg>
                       </button>
                    </div>

                    <div onClick={() => router.push(`/rooms/${room.id}`)} className={`cursor-pointer flex flex-col ${viewMode === 'list' ? "w-full sm:w-56 flex-shrink-0" : "w-full"}`}>
                      <RoomCardSlider 
                        images={getDisplayImages(room)} 
                        viewMode={viewMode} 
                        roomCity={room.address_name || room.city_name} 
                        className={viewMode === 'list' ? "w-full h-48 sm:h-36 rounded-xl" : "w-full aspect-[4/3] rounded-t-[12px]"} 
                      />
                      <div className={viewMode === 'list' ? "py-2" : "px-4 pt-3 pb-2"}>
                        {viewMode === 'list' && <div className="text-[11px] font-bold text-gray-400 mb-1">{room.room_type || t('rooms.rentMode.room')}</div>}
                        {viewMode !== 'list' && <div className="text-xs text-gray-400 font-bold mb-1 truncate">{room.address_name || room.city_name}</div>}
                        <h2 className="text-[15px] font-black text-gray-900 line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">{room.title}</h2>
                        <div className="text-[13px] font-bold text-blue-600">{room.price?.includes('晚') || room.price?.includes('night') ? room.price : `${room.price || t('common.notSet')} / ${t('rooms.price.perNight')}`}</div>
                      </div>
                    </div>

                    <div className={`flex-1 flex flex-col justify-center ${viewMode === 'list' ? "w-full min-w-0" : "px-4 pb-4"}`}>
                      {viewMode === 'grid' ? (
                        <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                          <div className="text-[11px] font-bold text-gray-500 mb-2 flex items-center justify-between"><div className="flex items-center gap-1.5"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>{t('host.listings.status')}</div></div>
                          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">{ (lang === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['日', '一', '二', '三', '四', '五', '六']).map(d => <div key={d} className="text-[10px] font-bold text-gray-400">{d}</div>)}</div>
                          <div className="grid grid-cols-7 gap-y-1 gap-x-1 justify-items-center">{renderHostCalendar(room)}</div>
                        </div>
                      ) : (
                        <div className="bg-green-50/30 rounded-xl p-3 border border-green-100/50 h-full min-h-[140px] flex items-center">{renderRevenueChart(room)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          orders.length === 0 ? <div className="text-center py-20 text-gray-400">{t('host.orders.empty')}</div> : (
            <div className="space-y-6">
              {orders.map(order => (
                <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative">
                  {order.status === 'paid' && <div className="absolute top-5 right-5 z-10 text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-md">{t('host.orders.status.paid')}</div>}
                  {order.status === 'rejected' && <div className="absolute top-5 right-5 z-10 text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-2.5 py-1 rounded-md">{t('host.orders.status.rejected')}</div>}
                  {order.status === 'approved' && <div className="absolute top-5 right-5 z-10 text-xs font-bold text-orange-500 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-md">{t('host.orders.status.awaiting')}</div>}
                  {order.status === 'pending' && <div className="absolute top-5 right-5 z-10 text-xs font-bold text-blue-500 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md shadow-sm animate-pulse">{t('host.orders.status.pending')}</div>}
                  {order.status === 'cancelled' && <div className="absolute top-5 right-5 z-10 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md">{t('host.orders.status.cancelled')}</div>}

                  <div className="flex gap-4 border-b border-gray-100 pb-4 mb-4 mt-1">
                    <img src={getDisplayImages(order.octo_rooms)[0]} className="w-[84px] h-[84px] rounded-xl object-cover shadow-sm flex-shrink-0 bg-gray-100" alt="room" />
                    <div className="flex flex-col justify-center w-full pr-16">
                      <div className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg><span className="truncate">{order.octo_rooms?.address_name || order.octo_rooms?.city_name}</span></div>
                      <div className="font-black text-[15px] text-gray-900 line-clamp-1 mb-1">{order.octo_rooms?.title}</div>
                      <div className="text-[13px] text-blue-600 font-bold">{order.octo_rooms?.price}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between mb-2">
                    <div onClick={() => router.push(`/user/${order.guest_id}`)} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-xl transition-colors group w-fit">
                      <img src={order.guest_avatar} className="w-10 h-10 rounded-full object-cover bg-gray-100 group-hover:shadow-md transition-shadow" alt="guest"/>
                      <div>
                        <div className="font-bold text-[14px] text-gray-900 group-hover:text-blue-600 transition-colors">{order.guest_name} <span className="text-[10px] text-gray-400 font-normal ml-1">{t('host.orders.applying')}</span></div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-1"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>{new Date(order.check_in).toLocaleDateString()} {t('host.orders.to')} {new Date(order.check_out).toLocaleDateString()}{order.room_count > 1 ? ` (${order.room_count} ${t('host.orders.rooms')})` : ''}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/50 rounded-2xl border border-gray-100 mt-2 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 font-bold text-[13px] text-gray-700 flex items-center gap-2 bg-white/50">
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>
                      {t('host.orders.chatHistory')}
                    </div>
                    
                    <div className="p-4 flex flex-col gap-4 max-h-[260px] overflow-y-auto">
                      {order.guest_message && (
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] font-bold text-gray-400 mb-1">{t('host.orders.guestNote')}</span>
                          <div className="bg-white border border-gray-200 text-gray-800 text-[13px] py-2 px-3.5 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed shadow-sm">
                            {order.guest_message}
                          </div>
                        </div>
                      )}
                      
                      {order.chat_history?.map((msg: any, idx: number) => {
                        const isMe = msg.role === 'host'; 
                        return (
                          <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] font-bold text-gray-400 mb-1">
                              {isMe ? t('host.orders.myReply') : t('host.orders.guestReply')} · {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                        value={replyTexts[order.id] || ''} 
                        onChange={(e) => setReplyTexts(prev => ({...prev, [order.id]: e.target.value}))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendReply(order.id)}
                        placeholder={t('host.orders.replyPlaceholder')} 
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" 
                      />
                      <button 
                        onClick={() => handleSendReply(order.id)} 
                        disabled={!replyTexts[order.id]?.trim()}
                        className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex-shrink-0"
                      >
                        <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 translate-x-[1px] translate-y-[1px]"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                      </button>
                    </div>
                  </div>

                  {order.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => handleApproval(order.id, 'rejected')} className="flex-1 py-3 rounded-xl text-[13px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition">{t('host.orders.decline')}</button>
                      <button onClick={() => handleApproval(order.id, 'approved')} className="flex-1 py-3 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md">{t('host.orders.approve')}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-black text-gray-900">{t('publish.title')}</h2>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-3">{t('publish.images.label')}</label>
                
                <div className="flex gap-3 mb-4">
                   <button onClick={() => setFormData({...formData, imageMode: 'system'})} className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold border transition-all flex items-center justify-center gap-2 ${formData.imageMode === 'system' ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                     <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
                     {t('publish.images.system')}
                   </button>
                   <button onClick={() => setFormData({...formData, imageMode: 'custom'})} className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold border transition-all flex items-center justify-center gap-2 ${formData.imageMode === 'custom' ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                     <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                     {t('publish.images.custom')}
                   </button>
                </div>
                
                {formData.imageMode === 'system' ? (
                  <div className="text-[12px] text-gray-400 bg-white p-3 rounded-lg border border-dashed border-gray-200 text-center">{t('publish.images.system.hint')}</div>
                ) : (
                  <div>
                     <div className="relative border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-6 text-center hover:bg-blue-50 transition-colors cursor-pointer group mb-4">
                       <input 
                         type="file" 
                         multiple 
                         accept="image/*" 
                         onChange={handleImageSelect} 
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                         title={t('publish.images.upload.title')}
                       />
                       <div className="pointer-events-none flex flex-col items-center gap-2 text-blue-500 group-hover:scale-105 transition-transform">
                         <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                         <span className="text-sm font-bold">{t('publish.images.upload.button')}</span>
                         <span className="text-xs text-blue-400 font-medium">{t('publish.images.upload.hint')}</span>
                       </div>
                     </div>
                     
                     {formData.coverImagePreviews.length > 0 && (
                       <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                         {formData.coverImagePreviews.map((url, idx) => (
                           <div key={idx} className="relative w-24 h-24 flex-shrink-0 snap-start group">
                             <img src={url} alt="preview" className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-200" />
                             <button type="button" onClick={() => removeNewImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm border-2 border-white shadow-sm hover:bg-red-600 transition-colors z-20">×</button>
                             <div className="absolute bottom-1 left-1 bg-black/50 backdrop-blur-md text-white text-[10px] px-1.5 rounded font-bold">{idx + 1}</div>
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
                )}
              </div>

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                <label className="block text-[13px] font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9z"/><circle cx="12" cy="9" r="2.5"/></svg>
                  {t('publish.location.label')}
                </label>
                
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    placeholder={t('publish.location.placeholder')} 
                    value={formData.addressName} 
                    onChange={(e) => setFormData({...formData, addressName: e.target.value})} 
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all" 
                  />
                  <button onClick={handleGeocode} disabled={isGeocoding} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black whitespace-nowrap disabled:opacity-50 transition-colors flex items-center gap-1">
                    {isGeocoding ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : t('publish.location.search')}
                  </button>
                </div>

                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                  <div ref={mapContainerRef} className="w-full h-full z-0"></div>
                  {!formData.lat && !isGeocoding && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                      <span className="bg-gray-900/80 text-white text-[12px] font-bold px-4 py-2 rounded-full shadow-lg">{t('publish.location.map.hint')}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" /></svg>
                    {t('publish.location.map.tip')}
                  </p>
                  {formData.lat !== 0 && <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-md">{t('publish.location.map.success')}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">{t('publish.details.city')}</label><input type="text" placeholder={t('publish.details.city.placeholder')} value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">{t('publish.details.date')}</label><input type="date" value={formData.availableDate} onChange={(e) => setFormData({...formData, availableDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              </div>

              <div><label className="block text-xs font-bold text-gray-700 mb-1">{t('publish.details.title')}</label><input type="text" placeholder={t('publish.details.title.placeholder')} value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" /></div>

              <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">{t('publish.details.rentMode')}</label><select value={formData.rentMode} onChange={(e) => setFormData({...formData, rentMode: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"><option value="entire">{t('rooms.rentMode.entire')}</option><option value="room">{t('rooms.rentMode.room')}</option></select></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">{t('publish.details.totalRooms')}</label><input type="number" min="1" disabled={formData.rentMode === 'entire'} value={formData.totalRooms} onChange={(e) => setFormData({...formData, totalRooms: Number(e.target.value)})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:text-gray-400" /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t('publish.details.price')}</label>
                  <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20">
                    <input type="number" placeholder="例如：150" value={formData.priceAmount} onChange={(e) => setFormData({...formData, priceAmount: e.target.value})} className="w-full px-3 py-2 text-sm outline-none bg-transparent" />
                    <select value={formData.priceCurrency} onChange={(e) => setFormData({...formData, priceCurrency: e.target.value})} className="bg-gray-100 border-l border-gray-200 px-2 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"><option value="NZD">NZD</option><option value="AUD">AUD</option><option value="CNY">CNY</option><option value="USD">USD</option></select>
                  </div>
                </div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">{t('publish.details.roomType')}</label><select value={formData.roomType} onChange={(e) => setFormData({...formData, roomType: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"><option>{t('rooms.rentMode.room')}</option><option>{t('rooms.rentMode.entire')}</option><option>{t('rooms.rentMode.flatmate') || 'Find Flatmate'}</option><option>{t('rooms.rentMode.couch') || 'Couchsurfer'}</option></select></div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <label className="block text-xs font-bold text-gray-700 mb-2">{t('publish.details.amenities')}</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[...baseFacilityOptions, ...customAmenities].map(option => (
                    <button key={option.id} type="button" onClick={() => toggleFacility(option.id)} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all duration-200 ${formData.amenities.includes(option.id) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                   <input type="text" placeholder={t('publish.details.amenities.customPlaceholder')} value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomAmenity())} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                   <button type="button" onClick={handleAddCustomAmenity} className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black">{t('publish.details.amenities.add')}</button>
                </div>
              </div>

              <div><label className="block text-xs font-bold text-gray-700 mb-1">{t('publish.details.description')}</label><textarea rows={3} placeholder={t('publish.details.description.placeholder')} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500/20"></textarea></div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 rounded-b-[24px]">
              <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border shadow-sm ${formData.syncToPost ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                  {formData.syncToPost && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[13px] font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{t('publish.sync.label')}</span>
                  <span className="text-[10px] text-gray-500 font-medium hidden sm:block">{t('publish.sync.hint')}</span>
                </div>
                <input type="checkbox" className="hidden" checked={formData.syncToPost} onChange={(e) => setFormData({...formData, syncToPost: e.target.checked})} />
              </label>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button onClick={() => setIsPublishModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition shadow-sm">{t('common.cancel')}</button>
                <button onClick={handlePublish} disabled={isPublishing} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition shadow-sm disabled:opacity-50">
                  {isPublishing ? t('common.publishing') : t('publish.submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-container { z-index: 10 !important; font-family: inherit; }
      `}} />
    </main>
  );
}