// src/app/rooms/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

// --- 矢量图标库 ---
const Icons = {
  wifi: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"></path></svg>,
  ac: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.296 0 .587-.013.873-.038M3.375 19.5a8.96 8.96 0 01-2.368-7.859M15 6.75h.008v.008H15V6.75zm-3 0h.008v.008H12V6.75zm-3 0h.008v.008H9V6.75zm-3 0h.008v.008H6V6.75z"></path></svg>,
  kitchen: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"></path></svg>,
  washer: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"></path></svg>,
  bathroom: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.375a1.875 1.875 0 01-1.875-1.875V8.625zM16.5 4.125c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v15.75c0 1.035-.84 1.875-1.875 1.875h-.375a1.875 1.875 0 01-1.875-1.875V4.125z"></path></svg>,
  workspace: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"></path></svg>
};

const baseFacilityOptions = [
  { id: 'wifi', labelZh: '高速网络', labelEn: 'High-Speed Wi-Fi' }, { id: 'ac', labelZh: '冷暖空调', labelEn: 'Heating & Cooling' },
  { id: 'kitchen', labelZh: '全套厨房', labelEn: 'Full Kitchen' }, { id: 'washer', labelZh: '洗衣机', labelEn: 'Washing Machine' },
  { id: 'bathroom', labelZh: '独立卫浴', labelEn: 'Private Ensuite' }, { id: 'workspace', labelZh: '专属工作区', labelEn: 'Workspace' }
];

// 🌟 扩充接口属性以支持地图字段
interface OctoRoom {
  id: string; city_name: string; title: string; description: string;
  author_name: string; author_avatar: string; reply_count: number;
  created_at: string; author_id?: string; cover_image?: string; 
  price?: string; amenities?: string; room_type?: string; rent_mode?: string;
  address_name?: string; latitude?: number; longitude?: number; 
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

const extractPrice = (priceStr?: string) => {
  if (!priceStr) return 0;
  const match = priceStr.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
};

// 🌟 卡片组件
function RoomCardSlider({ images, viewMode, roomCity, isMarked, toggleMark, aspectClass }: { images: string[], viewMode: string, roomCity: string, isMarked: boolean, toggleMark: (e: React.MouseEvent) => void, aspectClass?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const width = sliderRef.current.clientWidth;
    if (width > 0) setCurrentIndex(Math.round(e.currentTarget.scrollLeft / width));
  };

  const scrollNext = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    e.preventDefault(); 
    if (sliderRef.current) sliderRef.current.scrollBy({ left: sliderRef.current.clientWidth, behavior: 'smooth' }); 
  };
  
  const scrollPrev = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    e.preventDefault(); 
    if (sliderRef.current) sliderRef.current.scrollBy({ left: -sliderRef.current.clientWidth, behavior: 'smooth' }); 
  };

  const containerClass = viewMode === 'grid' 
    ? `w-full ${aspectClass || 'aspect-[4/5]'} rounded-t-[16px]` 
    : 'w-full h-56 sm:h-72 flex-shrink-0';

  return (
    <div className={`relative bg-gray-100 overflow-hidden group/slider ${containerClass}`}>
      <div ref={sliderRef} className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" onScroll={handleScroll}>
        {images.map((img, idx) => {
          return (
            <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
              <img src={img} className="w-full h-full object-cover" alt={`cover-${idx}`} />
              <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
            </div>
          );
        })}
      </div>

      {viewMode === 'grid' && (
        <div className="absolute bottom-2 left-2 bg-black/30 backdrop-blur-md text-white text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1 z-10 pointer-events-none shadow-sm max-w-[80%] truncate">
          <svg fill="currentColor" viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg>
          <span className="truncate">{roomCity}</span>
        </div>
      )}
      
      {viewMode === 'list' && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-gray-900 font-bold text-[12px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm z-10 pointer-events-none max-w-[80%] truncate">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-blue-600 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"></path></svg>
          <span className="truncate">{roomCity}</span>
        </div>
      )}

      <button onClick={toggleMark} className={`absolute top-3 right-3 z-20 transition-all duration-300 hover:scale-110 active:scale-95 ${isMarked ? 'text-yellow-400' : 'text-white hover:text-gray-200'}`}>
        <svg fill={isMarked ? "currentColor" : "rgba(0,0,0,0.3)"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
           <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"></path>
        </svg>
      </button>

      {images.length > 1 && (
        <div>
          <button onClick={scrollPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 hover:bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all duration-300 z-20 shadow-sm"><svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"></path></svg></button>
          <button onClick={scrollNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 hover:bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all duration-300 z-20 shadow-sm"><svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"></path></svg></button>
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
            {images.map((_, i) => {
              return (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/60'}`}></div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoomsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'recommend' | 'bookings'>('recommend');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [allRooms, setAllRooms] = useState<OctoRoom[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<OctoRoom[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterSortBy, setFilterSortBy] = useState<'newest'|'price_asc'|'price_desc'>('newest');
  const [filterRoomType, setFilterRoomType] = useState<string>('all');
  const [filterAmenities, setFilterAmenities] = useState<string[]>([]);
  
  const [userMarks, setUserMarks] = useState<Set<string>>(new Set());
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Record<string, { likes: number, marks: number }>>({});

  const gridAspectRatios = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-[10/11]', 'aspect-[5/6]'];

  const fetchData = async (cityQuery?: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (activeTab === 'recommend') {
        let query = supabase.from('octo_rooms').select('*').order('created_at', { ascending: false });
        // 允许搜索地名也能匹配到结果
        if (cityQuery) {
          query = query.or(`city_name.ilike.%${cityQuery}%,address_name.ilike.%${cityQuery}%`);
        }
        
        const { data: roomsData, error } = await query;
        if (error) throw error;
        
        if (roomsData && roomsData.length > 0) {
           const roomIds = roomsData.map(r => r.id);
           const [likesRes, marksRes] = await Promise.all([
             supabase.from('octo_likes').select('item_id, user_id').in('item_id', roomIds).eq('item_type', 'room'),
             supabase.from('octo_marks').select('item_id, user_id').in('item_id', roomIds).eq('item_type', 'room')
           ]);

           const newStats: Record<string, { likes: number, marks: number }> = {};
           const newLikes = new Set<string>();
           const newMarks = new Set<string>();

           roomIds.forEach(id => {
             newStats[id] = { likes: 0, marks: 0 };
           });

           if (likesRes.data) {
             likesRes.data.forEach(l => {
                if (newStats[l.item_id]) newStats[l.item_id].likes += 1;
                if (user && l.user_id === user.id) newLikes.add(l.item_id);
             });
           }
           if (marksRes.data) {
             marksRes.data.forEach(m => {
                if (newStats[m.item_id]) newStats[m.item_id].marks += 1;
                if (user && m.user_id === user.id) newMarks.add(m.item_id);
             });
           }

           setStats(newStats);
           setUserLikes(newLikes);
           setUserMarks(newMarks);
        }
        setAllRooms(roomsData || []);
      } 
      else if (activeTab === 'bookings') {
        if (!user) { setBookings([]); setLoading(false); return; }
        // 🌟 更新联表查询包含经纬度和地名字段
        const { data, error } = await supabase.from('octo_bookings').select('*, octo_rooms(id, title, city_name, address_name, latitude, longitude, price, room_type, amenities, author_name, author_avatar, cover_image)').eq('guest_id', user.id).order('created_at', { ascending: false });
        if (error) throw error;
        setBookings(data || []);
      }
    } catch (error) { 
      console.error("获取数据失败", error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(searchQuery); }, [activeTab]);

  useEffect(() => {
    let result = [...allRooms];
    if (filterRoomType !== 'all') {
      if (filterRoomType === 'entire') {
        result = result.filter(r => r.rent_mode === 'entire' || r.room_type?.includes('整套'));
      } else {
        result = result.filter(r => r.room_type === filterRoomType);
      }
    }
    if (filterAmenities.length > 0) {
      result = result.filter(r => {
        if (!r.amenities) return false;
        const roomAms = r.amenities.split(',').map(s=>s.trim());
        return filterAmenities.every(am => roomAms.includes(am));
      });
    }
    if (filterSortBy === 'price_asc') {
      result.sort((a, b) => extractPrice(a.price) - extractPrice(b.price));
    } else if (filterSortBy === 'price_desc') {
      result.sort((a, b) => extractPrice(b.price) - extractPrice(a.price));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    setFilteredRooms(result);
  }, [allRooms, filterRoomType, filterAmenities, filterSortBy]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') fetchData(searchQuery); };

  const handleToggleLike = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation(); e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("请先登录后操作！");

    const isLiked = userLikes.has(roomId);
    const newLikes = new Set(userLikes);
    if (isLiked) newLikes.delete(roomId); else newLikes.add(roomId);
    
    setUserLikes(newLikes);
    setStats(prev => ({ ...prev, [roomId]: { ...prev[roomId], likes: (prev[roomId]?.likes || 0) + (isLiked ? -1 : 1) } }));

    try {
      if (!isLiked) await supabase.from('octo_likes').insert([{ user_id: user.id, item_id: roomId, item_type: 'room' }]);
      else await supabase.from('octo_likes').delete().match({ user_id: user.id, item_id: roomId, item_type: 'room' });
    } catch (err) { console.error("点赞失败", err); }
  };

  const handleToggleMark = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation(); e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("请先登录后操作！");

    const isMarked = userMarks.has(roomId);
    const newMarks = new Set(userMarks);
    if (isMarked) newMarks.delete(roomId); else newMarks.add(roomId);
    
    setUserMarks(newMarks); 
    setStats(prev => ({ ...prev, [roomId]: { ...prev[roomId], marks: (prev[roomId]?.marks || 0) + (isMarked ? -1 : 1) } }));

    try {
      if (!isMarked) await supabase.from('octo_marks').insert([{ user_id: user.id, item_id: roomId, item_type: 'room' }]);
      else await supabase.from('octo_marks').delete().match({ user_id: user.id, item_id: roomId, item_type: 'room' });
    } catch (err) { console.error("收藏失败", err); }
  };

  const handleCancelBooking = async (e: React.MouseEvent, bookingId: string) => {
    e.stopPropagation(); 
    if (!window.confirm(t('bookings.cancel.confirm'))) return;
    try {
      const { error } = await supabase.from('octo_bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      if (error) throw error;
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    } catch (err: any) { alert(t('alert.cancelFailed') + '：' + err.message); }
  };

  const toggleFilterAmenity = (id: string) => { setFilterAmenities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]); };
  const activeFilterCount = (filterRoomType !== 'all' ? 1 : 0) + filterAmenities.length + (filterSortBy !== 'newest' ? 1 : 0);

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-white flex flex-col relative pb-10">
      <div className="flex w-full border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-40 relative">
        <button onClick={() => setActiveTab('recommend')} className={`flex-1 py-3.5 text-[14px] transition-colors duration-300 relative z-10 ${activeTab === 'recommend' ? 'font-bold text-gray-900' : 'font-medium text-gray-400'}`}>{t('rooms.tab.discover')}</button>
        <button onClick={() => setActiveTab('bookings')} className={`flex-1 py-3.5 text-[14px] transition-colors duration-300 relative z-10 ${activeTab === 'bookings' ? 'font-bold text-gray-900' : 'font-medium text-gray-400'}`}>{t('rooms.tab.bookings')}</button>
        <div className="absolute bottom-0 h-[3px] bg-blue-600 rounded-full transition-all duration-500 ease-in-out w-12" style={{ left: activeTab === 'recommend' ? '25%' : '75%', transform: 'translateX(-50%)' }}></div>
      </div>

      <div className="bg-white px-4 pt-4 pb-2 flex items-center justify-between gap-3 relative z-30">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path></svg></div>
            <input type="text" placeholder={t('rooms.search.placeholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearch} className="w-full bg-gray-50 border border-gray-100 text-[14px] font-medium text-gray-900 rounded-full pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <button onClick={() => fetchData(searchQuery)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-full text-[14px] font-bold shadow-sm transition-colors flex-shrink-0">{t('rooms.search.button')}</button>
        </div>

        <button onClick={() => router.push('/my-rooms')} className="flex-shrink-0 bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-500 text-gray-700 font-bold py-2.5 px-4 rounded-full shadow-sm hover:shadow transition-all flex items-center gap-1.5 text-[13px]">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"></path></svg>
          <span className="hidden sm:inline">{t('rooms.myListings')}</span>
        </button>
      </div>

      {activeTab === 'recommend' ? (
        <div className="bg-white border-b border-gray-100 px-4 pb-3 pt-1 flex items-center gap-2 overflow-x-auto scrollbar-hide z-20 shadow-[0_4px_10px_rgba(0,0,0,0.02)]">
          <button onClick={() => setIsFilterModalOpen(true)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-gray-200 bg-white text-[13px] font-bold text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"></path></svg>
            {t('rooms.filter.advanced')}
            {activeFilterCount > 0 && <span className="ml-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          
          <button onClick={() => setFilterSortBy(prev => prev === 'price_asc' ? 'newest' : 'price_asc')} className={`flex-shrink-0 px-3 py-1.5 rounded-full border transition-all text-[13px] font-medium ${filterSortBy === 'price_asc' ? 'bg-blue-50 border-blue-500 text-blue-600 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{t('rooms.filter.lowest')}</button>
          <button onClick={() => setFilterRoomType(prev => prev === 'entire' ? 'all' : 'entire')} className={`flex-shrink-0 px-3 py-1.5 rounded-full border transition-all text-[13px] font-medium ${filterRoomType === 'entire' ? 'bg-blue-50 border-blue-500 text-blue-600 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{t('rooms.filter.entire')}</button>
          <button onClick={() => setFilterRoomType(prev => prev === '独立单间' ? 'all' : '独立单间')} className={`flex-shrink-0 px-3 py-1.5 rounded-full border transition-all text-[13px] font-medium ${filterRoomType === '独立单间' ? 'bg-blue-50 border-blue-500 text-blue-600 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{t('rooms.filter.single')}</button>

          <div className="ml-auto flex bg-gray-100 p-0.5 rounded-full flex-shrink-0">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"></path></svg></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"></path></svg></button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between z-20 shadow-[0_4px_10px_rgba(0,0,0,0.02)]">
          <span className="text-[13px] font-bold text-gray-500">{lang === 'en' ? `${bookings.length} bookings` : `共 ${bookings.length} 个预定行程`}</span>
          <div className="flex bg-gray-100 p-0.5 rounded-full flex-shrink-0">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"></path></svg></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"></path></svg></button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-3 relative">
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : activeTab === 'recommend' ? (
          filteredRooms.length === 0 ? (
            <div className="text-center py-20">
              <div className="flex justify-center mb-4 text-gray-300"><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.75M5.25 9h3.75m-3.75 3h3.75m-3.75-6h3.75m-3.75 3h3.75m-3.75 3h3.75M9 21v-8.25"></path></svg></div>
              <h3 className="text-lg font-bold text-gray-900">{t('rooms.empty')}</h3>
              <p className="text-sm text-gray-500 mt-2">{t('rooms.empty.hint')}</p>
              <button onClick={() => {setFilterRoomType('all'); setFilterAmenities([]); setFilterSortBy('newest');}} className="mt-4 text-blue-600 font-bold hover:underline">{t('rooms.empty.clear')}</button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "columns-2 gap-3 space-y-3" : "flex flex-col gap-5"}>
              {filteredRooms.map((room) => {
                const isLiked = userLikes.has(room.id);
                const isMarked = userMarks.has(room.id);
                const likesCount = stats[room.id]?.likes || 0;
                const marksCount = stats[room.id]?.marks || 0;
                
                const aspectClass = viewMode === 'grid' ? gridAspectRatios[room.id.charCodeAt(0) % gridAspectRatios.length] : '';

                return (
                  <div key={room.id} onClick={() => router.push(`/rooms/${room.id}`)} className={`bg-white overflow-hidden shadow-sm hover:shadow-md cursor-pointer border border-gray-100 group transition-all flex flex-col ${viewMode === 'grid' ? 'rounded-[16px] break-inside-avoid mb-3' : 'rounded-[20px]'}`}>
                    
                    {/* 🌟 优先将具体地名传给地图徽章 */}
                    <RoomCardSlider images={getDisplayImages(room)} viewMode={viewMode} roomCity={room.address_name || room.city_name} isMarked={isMarked} toggleMark={(e)=>handleToggleMark(e, room.id)} aspectClass={aspectClass} />
                    
                    <div className={`flex flex-col justify-between flex-1 ${viewMode === 'grid' ? 'p-3' : 'p-4 sm:p-5'}`}>
                      <div>
                        {viewMode === 'list' && (
                          <div className="text-[13px] font-bold text-gray-400 mb-1.5">{lang === 'en' ? (room.room_type === '独立单间' ? 'Private Room' : room.room_type === '整套出租' ? 'Entire Place' : room.room_type || 'Private Room') : (room.room_type || '独立单间')}</div>
                        )}
                        
                        <h2 className={`font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug ${viewMode === 'grid' ? 'text-[13.5px] line-clamp-2 mb-1.5' : 'text-[18px] line-clamp-1 mb-1.5'}`}>
                          {room.title}
                        </h2>
                        
                        {viewMode === 'grid' && (
                          <div className="text-[14px] font-black text-blue-600 mb-2.5">
                            {room.price?.includes('晚') ? room.price : `${room.price || t('rooms.negotiate')} ${t('rooms.perNight')}`}
                          </div>
                        )}

                        {viewMode === 'list' && room.amenities && (
                          <div className="flex flex-wrap items-center gap-2 mt-3 mb-1">
                             {room.amenities.split(',').map(s=>s.trim()).filter(Boolean).slice(0, 5).map(item => {
                                const Icon = Icons[item as keyof typeof Icons];
                                const label = item === 'wifi' ? 'Wi-Fi' : item === 'ac' ? t('amenity.ac') : item === 'kitchen' ? t('amenity.kitchen') : item === 'washer' ? t('amenity.washer') : item === 'bathroom' ? t('amenity.bathroom') : item === 'workspace' ? t('amenity.workspace') : item;
                                if (!Icon) return null;
                                return (
                                  <div key={item} className="flex items-center gap-1.5 text-gray-600 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg text-[11px] font-medium" title={item}>
                                    <div className="w-3.5 h-3.5 text-gray-400">{Icon}</div>
                                    <span>{label}</span>
                                  </div>
                                );
                             })}
                          </div>
                        )}
                      </div>
                      
                      {viewMode === 'list' ? (
                        <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-50">
                           <div className="flex items-center gap-5">
                              <button onClick={(e) => handleToggleLike(e, room.id)} className="flex items-center gap-1.5 group/btn">
                                <div className="p-1.5 rounded-full group-hover/btn:bg-red-50 transition-colors">
                                  <svg fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={isLiked ? 0 : 2} stroke="currentColor" className={`w-5 h-5 transition-transform duration-300 ${isLiked ? 'text-red-500 scale-110' : 'text-gray-400 group-hover/btn:text-red-500'}`}>
                                    {isLiked ? (
                                      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"></path>
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"></path>
                                    )}
                                  </svg>
                                </div>
                                <span className={`text-[13px] font-bold ${isLiked ? 'text-red-500' : 'text-gray-500 group-hover/btn:text-red-500'}`}>{likesCount}</span>
                              </button>

                              <button onClick={(e) => handleToggleMark(e, room.id)} className="flex items-center gap-1.5 group/btn hidden sm:flex">
                                <div className="p-1.5 rounded-full group-hover/btn:bg-yellow-50 transition-colors">
                                  <svg fill={isMarked ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={isMarked ? 0 : 2} stroke="currentColor" className={`w-5 h-5 transition-transform duration-300 ${isMarked ? 'text-yellow-500 scale-110' : 'text-gray-400 group-hover/btn:text-yellow-500'}`}>
                                    {isMarked ? (
                                      <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd"></path>
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"></path>
                                    )}
                                  </svg>
                                </div>
                                <span className={`text-[13px] font-bold ${isMarked ? 'text-yellow-500' : 'text-gray-500 group-hover/btn:text-yellow-500'}`}>{marksCount}</span>
                              </button>
                           </div>

                           <div className="flex items-center gap-4">
                             <div className="text-[17px] font-black text-blue-600">{room.price?.includes('晚') ? room.price : `${room.price || t('rooms.negotiate')} ${t('rooms.perNight')}`}</div>
                             <div className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${room.author_id}`); }}>
                               <span className="text-[13px] font-bold text-gray-700 hidden sm:block">{room.author_name}</span>
                               <img src={room.author_avatar} className="w-8 h-8 rounded-full bg-gray-200 object-cover shadow-sm border border-gray-100" alt="avatar" />
                             </div>
                           </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-auto pt-1">
                           <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-75 transition-opacity min-w-0 pr-2" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${room.author_id}`); }}>
                             <img src={room.author_avatar} className="w-4 h-4 rounded-full bg-gray-100 object-cover flex-shrink-0" alt="avatar" />
                             <span className="text-[11px] text-gray-500 font-medium truncate">{room.author_name}</span>
                           </div>
                           <button onClick={(e) => handleToggleLike(e, room.id)} className="flex items-center gap-1 hover:scale-110 active:scale-95 transition-transform z-20 flex-shrink-0">
                              <svg fill={isLiked ? "#ef4444" : "none"} viewBox="0 0 24 24" strokeWidth={isLiked ? 0 : 2} stroke={isLiked ? "#ef4444" : "currentColor"} className={`w-3.5 h-3.5 ${isLiked ? '' : 'text-gray-400'}`}>
                                {isLiked ? (
                                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"></path>
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"></path>
                                )}
                              </svg>
                              <span className={`text-[11px] font-medium ${isLiked ? 'text-red-500' : 'text-gray-400'}`}>{likesCount > 0 ? likesCount : t('rooms.like')}</span>
                           </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          bookings.length === 0 ? (
            <div className="text-center py-20">
              <div className="flex justify-center mb-4 text-gray-300"><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"></path></svg></div>
              <h3 className="text-lg font-bold text-gray-900">{t('rooms.noBookings')}</h3>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "columns-2 gap-3 space-y-3" : "flex flex-col gap-5"}>
              {bookings.map((booking) => {
                const room = booking.octo_rooms;
                if (!room) return null;

                const statusConf = {
                  'paid': { text: t('status.paid'), className: 'text-green-600 bg-green-50 border-green-100' },
                  'approved': { text: t('status.approved'), className: 'text-orange-500 bg-orange-50 border-orange-100' },
                  'rejected': { text: t('status.rejected'), className: 'text-red-500 bg-red-50 border-red-100' },
                  'cancelled': { text: t('status.cancelled'), className: 'text-gray-500 bg-gray-50 border-gray-200' },
                  'pending': { text: t('status.pending'), className: 'text-blue-500 bg-blue-50 border-blue-100' }
                }[booking.status as string] || { text: t('status.processing'), className: 'text-gray-500 bg-gray-50 border-gray-100' };
                
                const isMarked = userMarks.has(room.id);
                const aspectClass = viewMode === 'grid' ? gridAspectRatios[room.id.charCodeAt(0) % gridAspectRatios.length] : '';

                return (
                  <div key={booking.id} onClick={() => router.push(`/rooms/${room.id}`)} className={`bg-white overflow-hidden shadow-sm hover:shadow-md cursor-pointer border border-gray-100 group transition-all flex flex-col relative ${viewMode === 'grid' ? 'rounded-[16px] break-inside-avoid mb-3' : 'rounded-[20px]'}`}>
                    
                    <RoomCardSlider 
                      images={getDisplayImages(room)} 
                      viewMode={viewMode} 
                      roomCity={room.address_name || room.city_name} 
                      isMarked={isMarked} 
                      toggleMark={(e) => handleToggleMark(e, room.id)} 
                      aspectClass={aspectClass} 
                    />
                    
                    <div className={`flex flex-col justify-between flex-1 ${viewMode === 'grid' ? 'p-3' : 'p-4 sm:p-5'}`}>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                           <div className="text-[11px] sm:text-[13px] font-bold text-gray-400">{lang === 'en' ? (room.room_type === '独立单间' ? 'Private Room' : room.room_type === '整套出租' ? 'Entire Place' : room.room_type || 'Private Room') : (room.room_type || '独立单间')}</div>
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${statusConf.className}`}>{statusConf.text}</span>
                        </div>
                        
                        <h2 className={`font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug ${viewMode === 'grid' ? 'text-[13.5px] line-clamp-2 mb-1.5' : 'text-[18px] line-clamp-1 mb-1.5'}`}>
                          {room.title}
                        </h2>
                        
                        <div className={`text-gray-500 font-medium flex items-center gap-1.5 ${viewMode === 'grid' ? 'text-[11px] mb-2' : 'text-[13px] mb-3'}`}>
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"></path></svg>
                            <span className="truncate">{booking.check_in.substring(5)} 至 {booking.check_out.substring(5)}</span>
                        </div>

                        {viewMode === 'grid' && (
                          <div className="text-[14px] font-black text-blue-600 mb-1">
                            {room.price?.includes('晚') ? room.price : `${room.price || t('rooms.negotiate')} ${t('rooms.perNight')}`}
                          </div>
                        )}
                      </div>
                      
                      {viewMode === 'list' && (
                          <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-50">
                              <div className="flex items-center gap-4">
                                 <div className="text-[17px] font-black text-blue-600">{room.price?.includes('晚') ? room.price : `${room.price || t('rooms.negotiate')} ${t('rooms.perNight')}`}</div>
                                 <div className="text-[12px] text-gray-400">下单: {new Date(booking.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '-')}</div>
                              </div>
                              <div className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${room.author_id}`); }}>
                                   <span className="text-[13px] font-bold text-gray-700 hidden sm:block">{room.author_name}</span>
                                   <img src={room.author_avatar} className="w-8 h-8 rounded-full bg-gray-200 object-cover shadow-sm border border-gray-100" alt="avatar" />
                              </div>
                          </div>
                      )}

                      {viewMode === 'grid' && (
                         <div className="flex items-center justify-between mt-auto pt-1">
                             <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-75 transition-opacity min-w-0 pr-2" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${room.author_id}`); }}>
                                 <img src={room.author_avatar} className="w-4 h-4 rounded-full bg-gray-100 object-cover flex-shrink-0" alt="avatar" />
                                 <span className="text-[11px] text-gray-500 font-medium truncate">{room.author_name}</span>
                             </div>
                         </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-fade-in-up">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[24px] sm:rounded-[24px] flex flex-col max-h-[90vh] shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-[18px] font-black text-gray-900">{t('filter.title')}</h2>
              <button onClick={() => setIsFilterModalOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-8 flex-1">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-3">{t('filter.sort')}</h3>
                <div className="grid grid-cols-3 gap-2">
                   <button onClick={() => setFilterSortBy('newest')} className={`py-2 rounded-xl text-[13px] font-medium border transition-all ${filterSortBy === 'newest' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{t('filter.sort.newest')}</button>
                   <button onClick={() => setFilterSortBy('price_asc')} className={`py-2 rounded-xl text-[13px] font-medium border transition-all ${filterSortBy === 'price_asc' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{t('filter.sort.priceAsc')}</button>
                   <button onClick={() => setFilterSortBy('price_desc')} className={`py-2 rounded-xl text-[13px] font-medium border transition-all ${filterSortBy === 'price_desc' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{t('filter.sort.priceDesc')}</button>
                </div>
              </div>

              <div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-3">{t('filter.roomType')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['all', 'entire', '独立单间', '找室友', '沙发客'].map(type => {
                    const labelMap: Record<string,string> = lang === 'en' ? { all: 'Any', entire: 'Entire Place', '独立单间': 'Private Room', '找室友': 'Flatmate', '沙发客': 'Couch Surfing' } : { all: '不限', entire: '整套出租', '独立单间': '独立单间', '找室友': '找室友', '沙发客': '沙发客' };
                    const label = labelMap[type] || type;
                    const isActive = filterRoomType === type;
                    return (
                      <button key={type} onClick={() => setFilterRoomType(type)} className={`py-3 px-4 rounded-xl border text-left transition-all ${isActive ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600 shadow-sm' : 'bg-white border-gray-200 hover:border-blue-400'}`}>
                        <div className={`text-[14px] font-bold ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>{label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-3">{t('filter.amenities')}</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {baseFacilityOptions.map(option => {
                    const isActive = filterAmenities.includes(option.id);
                    return (
                      <label key={option.id} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 group-hover:border-blue-500'}`}>
                          {isActive && <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"></path></svg>}
                        </div>
                        <span className={`text-[14px] font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{lang === 'en' ? option.labelEn : option.labelZh}</span>
                        <input type="checkbox" className="hidden" checked={isActive} onChange={() => toggleFilterAmenity(option.id)} />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-[24px]">
              <button 
                onClick={() => { setFilterRoomType('all'); setFilterAmenities([]); setFilterSortBy('newest'); }}
                className="text-[14px] font-bold text-gray-600 underline hover:text-gray-900"
              >
                {t('filter.clearAll')}
              </button>
              <button 
                onClick={() => setIsFilterModalOpen(false)}
                className="px-8 py-3.5 bg-gray-900 text-white rounded-xl font-bold text-[15px] shadow-lg hover:bg-black hover:-translate-y-0.5 transition-all"
              >
                {lang === 'en' ? `Show ${filteredRooms.length} properties` : `查看 ${filteredRooms.length} 个房源`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}