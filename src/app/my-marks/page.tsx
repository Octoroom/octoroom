// src/app/my-marks/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// --- 矢量图标库 ---
const Icons = {
  wifi: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>,
  ac: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.296 0 .587-.013.873-.038M3.375 19.5a8.96 8.96 0 01-2.368-7.859M15 6.75h.008v.008H15V6.75zm-3 0h.008v.008H12V6.75zm-3 0h.008v.008H9V6.75zm-3 0h.008v.008H6V6.75z" /></svg>,
  kitchen: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  washer: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
  bathroom: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.375a1.875 1.875 0 01-1.875-1.875V8.625zM16.5 4.125c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v15.75c0 1.035-.84 1.875-1.875 1.875h-.375a1.875 1.875 0 01-1.875-1.875V4.125z" /></svg>,
  workspace: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>
};

// 房间/房产封面获取 (通用)
const getDisplayImages = (item: any) => {
  if (item?.cover_image) {
    const urls = item.cover_image.split(',').map((s:string) => s.trim()).filter((u:string) => u.startsWith('http'));
    if (urls.length > 0) return urls;
  }
  const fallbackId = item?.id || 'default';
  return [
    `https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80&random=${fallbackId}`,
    `https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80&random=${fallbackId}`
  ];
};

// 搭子封面获取
const getCompanionCoverImage = (room: any) => {
  if (room.image_urls && room.image_urls.length > 0) return room.image_urls[0];
  const keywords: Record<string, string> = { "旅行/探索": "landscape,travel", "看电影/追剧": "cinema,movie", "运动/健身": "fitness,gym", "Live/演出": "concert,stage", "探店/美食": "food,cafe", "音乐节/演唱会": "festival,music" };
  return `https://loremflickr.com/600/800/${keywords[room.category || "旅行/探索"] || "lifestyle"}?random=${room.id}`;
};

// 房间卡片组件 (用于列表展示)
function RoomCardSlider({ item, images, isMarked, toggleMark, accentColor = 'blue' }: { item: any, images: string[], isMarked: boolean, toggleMark: (e:any)=>void, accentColor?: 'blue' | 'orange' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const width = sliderRef.current.clientWidth;
    if (width > 0) setCurrentIndex(Math.round(e.currentTarget.scrollLeft / width));
  };

  const scrollNext = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); if (sliderRef.current) sliderRef.current.scrollBy({ left: sliderRef.current.clientWidth, behavior: 'smooth' }); };
  const scrollPrev = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); if (sliderRef.current) sliderRef.current.scrollBy({ left: -sliderRef.current.clientWidth, behavior: 'smooth' }); };

  return (
    <div className="relative bg-gray-100 overflow-hidden group/slider w-full h-56 sm:h-72 flex-shrink-0">
      <div ref={sliderRef} className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" onScroll={handleScroll}>
        {images.map((img, idx) => (
          <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
            <img src={img} className="w-full h-full object-cover" alt={`cover-${idx}`} />
            <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/30 to-transparent pointer-events-none"></div>
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
          </div>
        ))}
      </div>

      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-gray-900 font-bold text-[12px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm z-10 pointer-events-none">
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-3.5 h-3.5 ${accentColor === 'orange' ? 'text-orange-500' : 'text-blue-600'}`}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
        {item.city_name || item.address_name}
      </div>

      <button onClick={toggleMark} className={`absolute top-3 right-3 z-20 transition-all duration-300 hover:scale-110 active:scale-95 ${isMarked ? 'text-yellow-400' : 'text-white hover:text-gray-200'}`}>
        <svg fill={isMarked ? "currentColor" : "rgba(0,0,0,0.3)"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
           <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      </button>

      {images.length > 1 && (
        <>
          <button onClick={scrollPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 hover:bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all duration-300 z-20 shadow-sm"><svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
          <button onClick={scrollNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 hover:bg-white text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-all duration-300 z-20 shadow-sm"><svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">{images.map((_, i) => (<div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/60'}`} />))}</div>
        </>
      )}
    </div>
  );
}

export default function MyMarksPage() {
  const router = useRouter();
  
  // 🌟 核心修改：新增 'properties' (买房) Tab
  const [activeTab, setActiveTab] = useState<'posts' | 'companions' | 'rooms' | 'properties'>('posts'); 
  const [viewMode, setViewMode] = useState<'list' | 'waterfall'>('waterfall');
  const [loading, setLoading] = useState(true);
  
  const [markedRooms, setMarkedRooms] = useState<any[]>([]);
  const [markedCompanions, setMarkedCompanions] = useState<any[]>([]);
  const [markedPosts, setMarkedPosts] = useState<any[]>([]); 
  const [markedProperties, setMarkedProperties] = useState<any[]>([]); // 🌟 房产收藏状态

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      if (activeTab === 'rooms') {
        const { data: marks, error: marksError } = await supabase.from('octo_marks').select('item_id').eq('user_id', user.id).eq('item_type', 'room');
        if (marksError) throw marksError;
        if (marks && marks.length > 0) {
          const itemIds = marks.map(m => m.item_id);
          const { data: roomsData } = await supabase.from('octo_rooms').select('*').in('id', itemIds).order('created_at', { ascending: false });
          setMarkedRooms(roomsData || []);
        } else { setMarkedRooms([]); }
      } 
      else if (activeTab === 'properties') {
        // 🌟 新增：拉取房产收藏 (octo_property_saves)
        const { data: marks, error: marksError } = await supabase.from('octo_property_saves').select('property_id').eq('user_id', user.id);
        if (marksError) throw marksError;
        if (marks && marks.length > 0) {
          const propIds = marks.map(m => m.property_id);
          const { data: propsData } = await supabase.from('octo_properties').select('*').in('id', propIds).order('created_at', { ascending: false });
          setMarkedProperties(propsData || []);
        } else { setMarkedProperties([]); }
      }
      else if (activeTab === 'companions') {
        const { data: compMarks, error: compMarksError } = await supabase.from('companion_marks').select('room_id').eq('user_id', user.id);
        if (compMarksError) throw compMarksError;
        if (compMarks && compMarks.length > 0) {
          const roomIds = compMarks.map(m => m.room_id);
          const { data: compData } = await supabase.from('companion_rooms').select('*').in('id', roomIds).order('created_at', { ascending: false });
          setMarkedCompanions(compData || []);
        } else { setMarkedCompanions([]); }
      }
      else if (activeTab === 'posts') {
        let postIds: string[] = [];
        const { data: bmData } = await supabase.from('bookmarks').select('post_id').eq('user_id', user.id);
        if (bmData && bmData.length > 0) postIds = bmData.map(m => m.post_id);
        else {
          const { data: oData } = await supabase.from('octo_marks').select('item_id').eq('user_id', user.id).eq('item_type', 'post');
          if (oData && oData.length > 0) postIds = oData.map(m => m.item_id);
        }

        if (postIds.length > 0) {
          const { data: postsData } = await supabase.from('posts').select('*').in('id', postIds).order('created_at', { ascending: false });
          if (postsData) {
            const authorIds = [...new Set(postsData.map(p => p.author_id))];
            const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url').in('id', authorIds);
            const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
            setMarkedPosts(postsData.map(post => ({ ...post, profiles: profileMap.get(post.author_id) })));
          }
        } else { setMarkedPosts([]); }
      }
    } catch (error) { 
      console.error("获取收藏失败", error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchMarks(); }, [activeTab]);

  const handleToggleMark = async (e: React.MouseEvent, itemId: string, type: 'rooms' | 'companions' | 'posts' | 'properties') => {
    e.stopPropagation(); e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      if (type === 'rooms') {
        setMarkedRooms(prev => prev.filter(r => r.id !== itemId));
        await supabase.from('octo_marks').delete().match({ user_id: user.id, item_id: itemId, item_type: 'room' });
      } else if (type === 'properties') {
        // 🌟 新增：取消收藏房产
        setMarkedProperties(prev => prev.filter(p => p.id !== itemId));
        await supabase.from('octo_property_saves').delete().match({ user_id: user.id, property_id: itemId });
      } else if (type === 'companions') {
        setMarkedCompanions(prev => prev.filter(c => c.id !== itemId));
        await supabase.from('companion_marks').delete().match({ user_id: user.id, room_id: itemId });
      } else if (type === 'posts') {
        setMarkedPosts(prev => prev.filter(p => p.id !== itemId));
        await supabase.from('bookmarks').delete().match({ user_id: user.id, post_id: itemId });
        await supabase.from('octo_marks').delete().match({ user_id: user.id, item_id: itemId, item_type: 'post' });
      }
    } catch (err) { 
      console.error("移除收藏失败"); 
    }
  };

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-gray-50 flex flex-col relative pb-10">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-yellow-400"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
          我的收藏夹
        </h1>
        <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-100">
          <button onClick={() => setViewMode('waterfall')} className={`p-1.5 rounded-md transition-all ${viewMode === 'waterfall' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`} title="瀑布流排版">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`} title="单页列表">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      <div className="flex w-full bg-white border-b border-gray-100 sticky top-[69px] z-30">
        <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 text-[14px] relative transition-colors ${activeTab === 'posts' ? 'font-bold text-gray-900' : 'font-medium text-gray-500'}`}>日常</button>
        <button onClick={() => setActiveTab('companions')} className={`flex-1 py-3 text-[14px] relative transition-colors ${activeTab === 'companions' ? 'font-bold text-gray-900' : 'font-medium text-gray-500'}`}>搭子</button>
        <button onClick={() => setActiveTab('rooms')} className={`flex-1 py-3 text-[14px] relative transition-colors ${activeTab === 'rooms' ? 'font-bold text-gray-900' : 'font-medium text-gray-500'}`}>租房</button>
        <button onClick={() => setActiveTab('properties')} className={`flex-1 py-3 text-[14px] relative transition-colors ${activeTab === 'properties' ? 'font-bold text-orange-500' : 'font-medium text-gray-500'}`}>买房</button>
        {/* 🌟 修改了导航条下面的动态线，以适应 4 个 Tab */}
        <div className="absolute bottom-0 h-[3px] bg-gray-900 rounded-full transition-all duration-300 w-10" 
             style={{ left: activeTab === 'posts' ? '12.5%' : activeTab === 'companions' ? '37.5%' : activeTab === 'rooms' ? '62.5%' : '87.5%', 
                      transform: 'translateX(-50%)', 
                      backgroundColor: activeTab === 'properties' ? '#f97316' : '#111827' // 房产特供橙色
                   }}></div>
      </div>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
        ) : activeTab === 'properties' ? (
          /* 🌟 新增：房产直飞收藏渲染区 */
          markedProperties.length === 0 ? (
            <div className="text-center py-32">
              <h3 className="text-lg font-bold text-gray-900">房产收藏夹空空如也</h3>
              <p className="text-sm text-gray-500 mt-2">去直飞大厅看看有没有心仪的房子吧！</p>
              <button onClick={() => router.push('/lobby')} className="mt-6 px-6 py-2.5 bg-orange-500 text-white rounded-full font-bold shadow-sm hover:bg-orange-600 transition">去挑房</button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col gap-5">
              {markedProperties.map((prop) => (
                <div key={prop.id} onClick={() => router.push(`/property/${prop.id}`)} className="bg-white overflow-hidden shadow-sm hover:shadow-md cursor-pointer border border-gray-100 group transition-all rounded-[20px] flex flex-col">
                  <RoomCardSlider images={getDisplayImages(prop)} item={prop} isMarked={true} toggleMark={(e)=>handleToggleMark(e, prop.id, 'properties')} accentColor="orange" />
                  <div className="flex flex-col justify-between p-4 sm:p-5">
                    <div>
                      <div className="text-[13px] font-bold text-gray-400 mb-1.5">{prop.property_type || '独立别墅'} · {prop.sale_method || '一口价'}</div>
                      <h2 className="font-bold text-gray-900 group-hover:text-orange-500 transition-colors text-[18px] line-clamp-1 mb-1.5">{prop.title}</h2>
                      <div className="flex items-center gap-4 py-2 border-y border-gray-50 mb-1 mt-2">
                        <div className="flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/bed.png" className="w-4 h-4 opacity-50" alt="bed" /><span className="text-[13px] font-bold text-gray-700">{prop.bedrooms}</span></div>
                        <div className="flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/bath.png" className="w-4 h-4 opacity-50" alt="bath" /><span className="text-[13px] font-bold text-gray-700">{prop.bathrooms}</span></div>
                        <div className="flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/car.png" className="w-4 h-4 opacity-50" alt="car" /><span className="text-[13px] font-bold text-gray-700">{prop.car_parks}</span></div>
                      </div>
                    </div>
                    <div className="flex items-end justify-between mt-3">
                       <div className="text-[18px] font-black text-orange-500">{prop.price_display}</div>
                       <div className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${prop.author_id}`); }}>
                         <span className="text-[13px] font-bold text-gray-700">{prop.author_name}</span>
                         <img src={prop.author_avatar} className="w-8 h-8 rounded-full bg-gray-200 object-cover shadow-sm border border-gray-100" alt="avatar" />
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="columns-2 gap-3 space-y-3">
              {markedProperties.map((prop) => (
                <div key={prop.id} onClick={() => router.push(`/property/${prop.id}`)} className="bg-white rounded-[16px] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 break-inside-avoid group relative">
                   <div className="relative w-full h-32 bg-gray-100 overflow-hidden">
                     <img src={getDisplayImages(prop)[0]} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     <div className="absolute top-1.5 left-1.5 bg-black/50 backdrop-blur-md text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                       {prop.property_type || '独立别墅'}
                     </div>
                   </div>
                   <div className="p-3">
                     <h2 className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-orange-500 mb-2">{prop.title}</h2>
                     <div className="text-[11px] text-gray-500 mb-1 flex items-center gap-2">
                        <span>🛏️ {prop.bedrooms}</span><span>🚿 {prop.bathrooms}</span>
                     </div>
                     <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                       <span className="text-[12px] font-black text-orange-500 truncate pr-2">{prop.price_display}</span>
                       <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-50 text-yellow-500 cursor-pointer flex-shrink-0" onClick={(e) => handleToggleMark(e, prop.id, 'properties')}>
                         <svg fill="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                       </div>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'rooms' ? (
          // ... 原有租房代码，未做更改
          markedRooms.length === 0 ? (
            <div className="text-center py-32">
              <h3 className="text-lg font-bold text-gray-900">租房收藏夹空空如也</h3>
              <p className="text-sm text-gray-500 mt-2">快去房源列表把心仪的房子收藏起来吧！</p>
              <button onClick={() => router.push('/rooms')} className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-full font-bold shadow-sm hover:bg-black transition">去逛逛</button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col gap-5">
              {markedRooms.map((room) => (
                <div key={room.id} onClick={() => router.push(`/rooms/${room.id}`)} className="bg-white overflow-hidden shadow-sm hover:shadow-md cursor-pointer border border-gray-100 group transition-all rounded-[20px] flex flex-col">
                  <RoomCardSlider images={getDisplayImages(room)} item={room} isMarked={true} toggleMark={(e)=>handleToggleMark(e, room.id, 'rooms')} />
                  <div className="flex flex-col justify-between p-4 sm:p-5">
                    <div>
                      <div className="text-[13px] font-bold text-gray-400 mb-1.5">{room.room_type || '独立单间'}</div>
                      <h2 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-[18px] line-clamp-1 mb-1.5">{room.title}</h2>
                      {room.amenities && (
                        <div className="flex flex-wrap items-center gap-2 mt-3 mb-1">
                           {room.amenities.split(',').map((s:string)=>s.trim()).filter(Boolean).slice(0, 5).map((item:string) => {
                              const Icon = Icons[item as keyof typeof Icons];
                              const label = item === 'wifi' ? 'Wi-Fi' : item === 'ac' ? '空调' : item === 'kitchen' ? '厨房' : item === 'washer' ? '洗衣机' : item === 'bathroom' ? '独立卫浴' : item === 'workspace' ? '工作区' : item;
                              return Icon ? (
                                <div key={item} className="flex items-center gap-1.5 text-gray-600 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg text-[11px] font-medium" title={item}>
                                  <div className="w-3.5 h-3.5 text-gray-400">{Icon}</div><span>{label}</span>
                                </div>
                              ) : null
                           })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-50">
                       <div className="text-[18px] font-black text-blue-600">{room.price?.includes('晚') ? room.price : `${room.price || '面议'} / 晚`}</div>
                       <div className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${room.author_id}`); }}>
                         <span className="text-[13px] font-bold text-gray-700">{room.author_name}</span>
                         <img src={room.author_avatar} className="w-8 h-8 rounded-full bg-gray-200 object-cover shadow-sm border border-gray-100" alt="avatar" />
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="columns-2 gap-3 space-y-3">
              {markedRooms.map((room) => (
                <div key={room.id} onClick={() => router.push(`/rooms/${room.id}`)} className="bg-white rounded-[16px] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 break-inside-avoid group relative">
                   <div className="relative w-full h-32 bg-gray-100 overflow-hidden">
                     <img src={getDisplayImages(room)[0]} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   </div>
                   <div className="p-3">
                     <div className="text-[10px] font-bold text-gray-400 mb-1">{room.room_type || '独立单间'}</div>
                     <h2 className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 mb-2">{room.title}</h2>
                     <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                       <span className="text-[12px] font-black text-blue-600">{room.price?.replace(' / 晚', '') || '面议'}</span>
                       <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-50 text-yellow-500 cursor-pointer" onClick={(e) => handleToggleMark(e, room.id, 'rooms')}>
                         <svg fill="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                       </div>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'companions' ? (
          // ... 原有搭子代码，未做更改
          markedCompanions.length === 0 ? (
            <div className="text-center py-32">
              <h3 className="text-lg font-bold text-gray-900">搭子收藏夹空空如也</h3>
              <p className="text-sm text-gray-500 mt-2">快去发现有趣的城市搭子局吧！</p>
              <button onClick={() => router.push('/companions')} className="mt-6 px-6 py-2.5 bg-orange-500 text-white rounded-full font-bold shadow-sm hover:bg-orange-600 transition">去结伴</button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col gap-3">
              {markedCompanions.map((room) => (
                <div key={room.id} onClick={() => router.push(`/companions/${room.id}`)} className="bg-white rounded-[16px] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100/80 group flex flex-row p-3 gap-3">
                  <div className="relative bg-gray-100 overflow-hidden shrink-0 w-[100px] h-[100px] rounded-[10px]">
                    <img src={getCompanionCoverImage(room)} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 scale-[0.85] origin-top-left">
                      <div className="bg-black/50 backdrop-blur-md text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-medium w-fit">
                        {room.category?.split('/')[0] || '旅行'}
                      </div>
                      {room.city_name && (
                        <div className="bg-white/90 backdrop-blur-md text-gray-900 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold w-fit shadow-sm">
                          <svg fill="currentColor" viewBox="0 0 24 24" className="w-2.5 h-2.5 text-orange-500"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                          {room.city_name}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0 py-1 justify-between">
                    <div>
                      <h2 className="font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-orange-500 transition-colors text-[15px] mb-2">{room.title}</h2>
                      {room.budget && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="bg-orange-50 text-orange-600 font-medium text-[10px] px-2 py-0.5 rounded-md">{room.budget}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <img src={room.author_avatar} alt="avatar" className="w-5 h-5 rounded-full bg-gray-100 object-cover flex-shrink-0" />
                        <span className="text-[11px] text-gray-500 truncate">{room.author_name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                         <div className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-50 text-yellow-500 hover:bg-yellow-100 transition-colors cursor-pointer" onClick={(e) => handleToggleMark(e, room.id, 'companions')}>
                            <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="columns-2 gap-3 space-y-3">
              {markedCompanions.map((room) => (
                <div key={room.id} onClick={() => router.push(`/companions/${room.id}`)} className="bg-white rounded-[16px] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 break-inside-avoid group relative">
                   <div className="relative w-full h-36 bg-gray-100 overflow-hidden">
                     <img src={getCompanionCoverImage(room)} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     <div className="absolute top-1.5 left-1.5 bg-black/50 backdrop-blur-md text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                       {room.category?.split('/')[0] || '旅行'}
                     </div>
                   </div>
                   <div className="p-3">
                     <h2 className="font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-orange-500 text-[13px] mb-2">{room.title}</h2>
                     <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                       {room.budget ? <span className="bg-orange-50 text-orange-600 font-medium text-[10px] px-1.5 py-0.5 rounded">{room.budget}</span> : <div/>}
                       <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-50 text-yellow-500 cursor-pointer" onClick={(e) => handleToggleMark(e, room.id, 'companions')}>
                         <svg fill="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                       </div>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // ... 原有动态代码，未做更改
          markedPosts.length === 0 ? (
            <div className="text-center py-32">
              <h3 className="text-lg font-bold text-gray-900">动态收藏夹空空如也</h3>
              <p className="text-sm text-gray-500 mt-2">快去主页把有趣的动态收藏起来吧！</p>
              <button onClick={() => router.push('/')} className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-full font-bold shadow-sm hover:bg-black transition">去逛逛</button>
            </div>
          ) : (
            <div className={viewMode === 'waterfall' ? "columns-2 gap-3 space-y-3" : "flex flex-col gap-4"}>
              {markedPosts.map((post) => (
                 <div key={post.id} onClick={() => router.push(`/post/${post.id}`)} className={`bg-white rounded-[16px] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 group relative ${viewMode === 'waterfall' ? 'break-inside-avoid' : 'flex flex-col'}`}>
                   {(() => {
                     let imgs = post.image_urls;
                     if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; } }
                     return imgs && imgs.length > 0 ? (
                       <div className="relative w-full bg-gray-100 overflow-hidden"><img src={imgs[0]} alt="post" className={`w-full object-cover group-hover:scale-105 transition-transform duration-500 ${viewMode === 'list' ? 'max-h-80' : ''}`} /></div>
                     ) : <div className="w-full h-24 bg-gradient-to-br from-gray-50 to-gray-100"></div>;
                   })()}
                   <div className="p-3">
                     <p className={`font-medium text-gray-800 leading-snug break-words mb-2 ${viewMode === 'list' ? 'text-[15px] line-clamp-3' : 'text-[13px] line-clamp-2'}`}>{post.content}</p>
                     <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                       <div className="flex items-center gap-1.5 flex-1 min-w-0">
                         <img src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author_id}`} alt="avatar" className="w-5 h-5 rounded-full bg-gray-100 object-cover flex-shrink-0" />
                         <span className="text-[11px] text-gray-500 truncate">{post.profiles?.username || '神秘用户'}</span>
                       </div>
                       <div className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-50 text-yellow-500 hover:bg-yellow-100 transition-colors cursor-pointer shrink-0" onClick={(e) => handleToggleMark(e, post.id, 'posts')}>
                         <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 transition-transform active:scale-75"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                       </div>
                     </div>
                   </div>
                 </div>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}