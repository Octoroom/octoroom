'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

// 🌟 修复 1：只静态引入类型，避免在服务端加载真实的 Leaflet JS 代码
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
// 🌟 修复 2：将 CSS 放回顶部静态引入，Next.js 原生支持服务端加载 CSS，且不会触发 TS 报错
import 'leaflet/dist/leaflet.css';

interface CompanionRoom {
  id: string;
  category: string; 
  city_name: string;
  title: string;
  description: string;
  author_name: string;
  author_avatar: string;
  reply_count: number;
  created_at: string;
  author_id?: string; 
  budget?: string;
  gender?: string;
  transport?: string;
  image_urls?: string[]; 
  address_name?: string; 
}

const CITIES = [
  "不限（Any)", "奥克兰 (Auckland)", "惠灵顿 (Wellington)", "基督城 (Christchurch)", "皇后镇 (Queenstown)", 
  "悉尼 (Sydney)", "墨尔本 (Melbourne)", "东京 (Tokyo)", "大阪 (Osaka)", 
  "曼谷 (Bangkok)", "普吉岛 (Phuket)", "巴厘岛 (Bali)", "冰岛 (Iceland)", 
  "伦敦 (London)", "巴黎 (Paris)", "洛杉矶 (Los Angeles)", "纽约 (New York)"
];

const CATEGORIES = [
  "旅行/探索", "看电影/追剧", "运动/健身", "Live/演出", 
  "舞台剧/话剧", "音乐节/演唱会", "探店/美食", "游戏/电竞", "学习/自习", "其他"
];

export default function CompanionsPage() {
  const [rooms, setRooms] = useState<CompanionRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recommend' | 'mine'>('recommend');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // 1. 弹窗状态管理
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // 2. 筛选器数据状态
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [advancedFilters, setAdvancedFilters] = useState({
    budget: 'all',
    gender: 'all',
    transport: 'all'
  });

  // 3. 点赞和收藏的独立状态管理
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userMarks, setUserMarks] = useState<Set<string>>(new Set());

  const router = useRouter();

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    category: '旅行/探索',
    destination: '',
    addressName: '', 
    lat: 0,          
    lng: 0,
    departure: '',
    title: '',
    startDate: '',
    endDate: '',
    gender: '性别不限',
    budget: 'AA制 / 适中',
    transport: '公共交通',
    planDetails: ''
  });

  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // 使用引入的 Leaflet 类型替代 any
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  // 页面加载时，拉取当前用户所有点赞和收藏的房间 ID
  const fetchUserInteractions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const [likesRes, marksRes] = await Promise.all([
        supabase.from('companion_likes').select('room_id').eq('user_id', user.id),
        supabase.from('companion_marks').select('room_id').eq('user_id', user.id)
      ]);

      if (likesRes.data) {
        setUserLikes(new Set(likesRes.data.map(d => d.room_id)));
      }
      if (marksRes.data) {
        setUserMarks(new Set(marksRes.data.map(d => d.room_id)));
      }
    } catch (error) {
      console.error("拉取互动数据失败", error);
    }
  };

  useEffect(() => {
    fetchUserInteractions();
  }, []);

  const handleToggleLike = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation(); 
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("请先登录后再操作哦！");
      return;
    }

    const isAlreadyLiked = userLikes.has(roomId);

    setUserLikes(prev => {
      const next = new Set(prev);
      if (isAlreadyLiked) next.delete(roomId);
      else next.add(roomId);
      return next;
    });

    try {
      if (isAlreadyLiked) {
        await supabase.from('companion_likes').delete().eq('room_id', roomId).eq('user_id', user.id);
      } else {
        await supabase.from('companion_likes').insert([{ room_id: roomId, user_id: user.id }]);
      }
    } catch (error) {
      console.error("点赞同步失败", error);
      setUserLikes(prev => {
        const next = new Set(prev);
        if (isAlreadyLiked) next.add(roomId);
        else next.delete(roomId);
        return next;
      });
    }
  };

  const handleToggleMark = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation(); 
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("请先登录后再操作哦！");
      return;
    }

    const isAlreadyMarked = userMarks.has(roomId);

    setUserMarks(prev => {
      const next = new Set(prev);
      if (isAlreadyMarked) next.delete(roomId);
      else next.add(roomId);
      return next;
    });

    try {
      if (isAlreadyMarked) {
        await supabase.from('companion_marks').delete().eq('room_id', roomId).eq('user_id', user.id);
      } else {
        await supabase.from('companion_marks').insert([{ room_id: roomId, user_id: user.id }]);
      }
    } catch (error) {
      console.error("收藏同步失败", error);
      setUserMarks(prev => {
        const next = new Set(prev);
        if (isAlreadyMarked) next.add(roomId);
        else next.delete(roomId);
        return next;
      });
    }
  };

  // 🌟 修复 3：在客户端 useEffect 中异步动态加载 Leaflet JS 核心
  useEffect(() => {
    if (isPublishModalOpen && mapContainerRef.current && !mapInstanceRef.current) {
      (async () => {
        // 仅动态导入 leaflet 的 JS
        const L = (await import('leaflet')).default;

        // 在客户端环境下安全修复图标
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        const initialLat = formData.lat || -36.8485;
        const initialLng = formData.lng || 174.7633;
        
        // 注意加上 `!` 断言 mapContainerRef.current 不为空
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (images.length + filesArray.length > 6) { alert("最多只能上传6张照片哦！"); return; }
      setImages(prev => [...prev, ...filesArray]);
      const previews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...previews]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images]; newImages.splice(index, 1); setImages(newImages);
    const newPreviews = [...imagePreviews]; newPreviews.splice(index, 1); setImagePreviews(newPreviews);
  };

  const handleGeocode = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (!formData.addressName.trim()) { alert("请先输入聚集地点的名称哦！"); return; }
    
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
            // 🌟 修复 4：如果 marker 为空，在这里也要动态获取一次 L
            const L = (await import('leaflet')).default;
            markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
          } else {
            markerRef.current.setLatLng([lat, lng]);
          }
        }
      } else {
        alert("找不到该地点的坐标，请尝试输入更详细的地址或加上城市名（如：奥克兰天空塔）。");
      }
    } catch (error) {
      console.error("检索失败", error);
      alert("网络请求失败，请稍后再试。");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handlePublish = async () => {
    if (!formData.title.trim() || (!formData.destination.trim() && formData.category === '旅行/探索')) {
      alert("请填写关键信息和招募标题哦！");
      return;
    }

    setIsPublishing(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { alert("请先登录后再发布！"); setIsPublishing(false); return; }

      const { data: userProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(); 

      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        const uploadPromises = images.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}_${uuidv4()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('companion-images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('companion-images').getPublicUrl(fileName);
          return publicUrl;
        });
        uploadedUrls = await Promise.all(uploadPromises);
      }

      const { data: newRoom, error: insertError } = await supabase
        .from('companion_rooms')
        .insert([{
            author_id: user.id,
            author_name: userProfile?.username || user.email?.split('@')[0] || '神秘旅行家',
            author_avatar: userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
            category: formData.category,
            title: formData.title,
            city_name: formData.destination || '同城',
            address_name: formData.addressName, 
            image_urls: uploadedUrls,           
            latitude: formData.lat || null,
            longitude: formData.lng || null,
            departure: formData.departure,
            start_date: formData.startDate || null, 
            end_date: formData.endDate || null,
            budget: formData.budget,
            gender: formData.gender,
            transport: formData.transport,
            plan_details: formData.planDetails
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase.from('posts').insert([{
        author_id: user.id,
        companion_room_id: newRoom.id, 
        content: `【寻找${formData.category}搭子】🚀 坐标/目的地：${formData.destination || '同城'}\n标题：${formData.title}\n预算：${formData.budget}\n快来“章鱼房间”找我报名吧！`,
        image_urls: uploadedUrls.length > 0 ? [uploadedUrls[0]] : [`https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&q=80&random=${newRoom?.id}`],
      }]);
        
      setIsPublishModalOpen(false); 
      setFormData({                 
        category: '旅行/探索', destination: '', addressName: '', lat: 0, lng: 0, departure: '', title: '', startDate: '', endDate: '',
        gender: '性别不限', budget: 'AA制 / 适中', transport: '公共交通', planDetails: ''
      });
      setImages([]);
      setImagePreviews([]);
      fetchRooms();                 

    } catch (error: any) {
      console.error("发布失败:", error);
      alert("发布失败: " + error.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const fetchRooms = async (cityQuery?: string) => {
    setLoading(true);
    try {
      let query = supabase.from('companion_rooms').select('*').order('created_at', { ascending: false });
      
      if (cityQuery) query = query.ilike('city_name', `%${cityQuery}%`);
      if (filterCategory !== 'all') query = query.eq('category', filterCategory);
      
      if (advancedFilters.budget !== 'all') query = query.eq('budget', advancedFilters.budget);
      if (advancedFilters.gender !== 'all') query = query.eq('gender', advancedFilters.gender);
      if (advancedFilters.transport !== 'all') query = query.eq('transport', advancedFilters.transport);

      if (activeTab === 'mine') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setRooms([]); setLoading(false); return; }
        query = query.eq('author_id', user.id); 
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) setRooms(data);
    } catch (error) {
      console.error("获取搭子房间失败", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms(searchQuery);
  }, [activeTab, filterCategory, advancedFilters]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') fetchRooms(searchQuery);
  };

  const getAspectClass = (id: string) => {
    const ratios = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-[3/4]', 'aspect-[2/3]', 'aspect-[1/1]'];
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return ratios[index % ratios.length];
  };

  const getCoverImage = (room: CompanionRoom) => {
    if (room.image_urls && room.image_urls.length > 0) return room.image_urls[0];
    const keywords: Record<string, string> = { "旅行/探索": "landscape,travel", "看电影/追剧": "cinema,movie", "运动/健身": "fitness,gym", "Live/演出": "concert,live", "探店/美食": "food,cafe", "音乐节/演唱会": "festival,music" };
    return `https://loremflickr.com/600/800/${keywords[room.category || "旅行/探索"] || "lifestyle"}?random=${room.id}`;
  };

  const isFilterActive = advancedFilters.budget !== 'all' || advancedFilters.gender !== 'all' || advancedFilters.transport !== 'all';

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-white flex flex-col relative">
      
      <div className="flex w-full border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-40 relative">
        <button onClick={() => setActiveTab('recommend')} className={`flex-1 py-3.5 text-[15px] transition-colors duration-300 relative z-10 ${activeTab === 'recommend' ? 'font-bold text-gray-900' : 'font-medium text-gray-400 hover:text-gray-700'}`}>搭子推荐</button>
        <button onClick={() => setActiveTab('mine')} className={`flex-1 py-3.5 text-[15px] transition-colors duration-300 relative z-10 ${activeTab === 'mine' ? 'font-bold text-gray-900' : 'font-medium text-gray-400 hover:text-gray-700'}`}>我的招募</button>
        <div className="absolute bottom-0 h-[3px] bg-orange-500 rounded-full transition-all duration-500 ease-in-out w-8" style={{ left: activeTab === 'recommend' ? '25%' : '75%', transform: 'translateX(-50%)' }}></div>
      </div>

      <div className="bg-white px-4 pt-4 pb-2 flex items-center justify-between gap-3 shadow-sm z-10 relative">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            </div>
            <input type="text" placeholder="搜城市、演出、运动..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearch} className="w-full bg-gray-50 border border-gray-100 text-[14px] font-medium text-gray-900 rounded-full pl-10 pr-4 py-2 outline-none transition-all focus:border-orange-500/40 focus:bg-white focus:ring-4 focus:ring-orange-500/10" />
          </div>
          <button onClick={() => fetchRooms(searchQuery)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full text-[14px] font-bold shadow-sm transition-colors flex-shrink-0">
            搜索
          </button>
        </div>
        <button onClick={() => setIsPublishModalOpen(true)} className="flex-shrink-0 bg-white border border-gray-200 hover:border-orange-500 hover:text-orange-500 text-gray-700 font-bold py-2 px-4 rounded-full shadow-sm hover:shadow transition-all flex items-center gap-1.5 text-[14px]">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          <span>搭子招募</span>
        </button>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 pb-3 flex items-center gap-2 overflow-x-auto custom-scrollbar z-10 relative">
        <button 
          onClick={() => setIsFilterModalOpen(true)} 
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border text-[12px] font-bold transition-colors ${isFilterActive ? 'bg-orange-50 border-orange-500 text-orange-600' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
          高级筛选 {isFilterActive && <span className="w-2 h-2 bg-orange-500 rounded-full ml-0.5"></span>}
        </button>
        
        <button onClick={() => setFilterCategory('all')} className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${filterCategory === 'all' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}`}>全部</button>
        {CATEGORIES.slice(0, 6).map(cat => (
          <button key={cat} onClick={() => setFilterCategory(prev => prev === cat ? 'all' : cat)} className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${filterCategory === cat ? 'bg-orange-50 border-orange-500 text-orange-600' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}`}>
            {cat.split('/')[0]}
          </button>
        ))}
        
        <div className="ml-auto flex bg-gray-100 p-0.5 rounded-full flex-shrink-0 border border-gray-200/50">
          <button onClick={() => setViewMode('grid')} className={`p-1 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/></svg></button>
          <button onClick={() => setViewMode('list')} className={`p-1 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-3 relative">
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-bold text-gray-900">{activeTab === 'recommend' ? '没有找到符合条件的招募' : '你还没有发布过招募'}</h3>
            <button onClick={() => { setFilterCategory('all'); setAdvancedFilters({budget: 'all', gender: 'all', transport: 'all'}); setSearchQuery(''); }} className="mt-4 text-orange-500 text-sm font-bold hover:underline">清除筛选条件</button>
          </div>
        ) : (
          <div key={`${activeTab}-${viewMode}`} className={viewMode === 'grid' ? "columns-2 gap-3 space-y-3 animate-in fade-in duration-500" : "flex flex-col gap-3 animate-in fade-in duration-500"}>
            {rooms.map((room) => (
              <div 
                key={room.id} 
                onClick={() => router.push(`/companions/${room.id}`)}
                className={`bg-white rounded-[12px] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100/80 group break-inside-avoid ${viewMode === 'list' ? 'flex flex-row p-3 gap-3' : 'flex flex-col'}`}
              >
                <div className={`relative bg-gray-100 overflow-hidden shrink-0 ${viewMode === 'list' ? 'w-[100px] h-[100px] rounded-lg' : `w-full ${getAspectClass(room.id)}`}`}>
                  <img src={getCoverImage(room)} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className={`absolute top-2 left-2 flex flex-col gap-1 ${viewMode === 'list' && 'scale-[0.85] origin-top-left'}`}>
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

                <div className={`flex flex-col flex-1 min-w-0 ${viewMode === 'grid' ? 'p-3' : 'py-1 justify-between'}`}>
                  <div>
                    <h2 className={`font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-orange-500 transition-colors ${viewMode === 'list' ? 'text-[15px]' : 'text-[13px] mb-2'}`}>
                      {room.title}
                    </h2>
                  </div>
                  <div className={`flex items-center justify-between mt-auto pt-2`}>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <img src={room.author_avatar} alt="avatar" className="w-5 h-5 rounded-full bg-gray-100 object-cover flex-shrink-0" />
                      <span className="text-[11px] text-gray-500 truncate">{room.author_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2.5 flex-shrink-0 pl-2">
                      <div 
                        className={`flex items-center gap-1 cursor-pointer group transition-colors ${userLikes.has(room.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                        onClick={(e) => handleToggleLike(e, room.id)}
                      >
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3.5 h-3.5 transition-transform active:scale-75 ${userLikes.has(room.id) ? 'fill-red-500 text-red-500' : 'fill-none'}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                        <span className="text-[11px] font-medium">
                          {Math.floor(Math.random() * 50) + 1 + (userLikes.has(room.id) ? 1 : 0)}
                        </span>
                      </div>
                      <div 
                        className={`flex items-center gap-1 cursor-pointer group transition-colors ${userMarks.has(room.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                        onClick={(e) => handleToggleMark(e, room.id)}
                      >
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3.5 h-3.5 transition-transform active:scale-75 ${userMarks.has(room.id) ? 'fill-yellow-500 text-yellow-500' : 'fill-none'}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                        </svg>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isPublishModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">发起结伴 / 组局</h2>
              <button onClick={() => setIsPublishModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <datalist id="city-list">
                {CITIES.map(city => <option key={city} value={city} />)}
              </datalist>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-2">你想组个什么局？ <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setFormData({...formData, category: cat})}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all border ${formData.category === cat ? 'bg-gray-900 border-gray-900 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-2">上传活动照片 / 场地截图 (最多6张)</label>
                <div className="flex flex-wrap gap-3">
                  {imagePreviews.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm group">
                      <img src={url} alt="preview" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  {images.length < 6 && (
                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors text-gray-400 hover:text-orange-500">
                      <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <span className="text-[10px] font-medium">添加照片</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>

              <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 shadow-sm">
                <label className="block text-[14px] font-black text-gray-900 mb-3 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9z"/><circle cx="12" cy="9" r="2.5"/></svg>
                  智能地图定位
                </label>
                
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    placeholder="例如：奥克兰天空塔 / 悉尼歌剧院" 
                    value={formData.addressName} 
                    onChange={(e) => setFormData({...formData, addressName: e.target.value})} 
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all" 
                  />
                  <button onClick={handleGeocode} disabled={isGeocoding} className="px-5 py-2 bg-gray-900 text-white text-[13px] font-bold rounded-xl hover:bg-black whitespace-nowrap disabled:opacity-50 transition-colors flex items-center gap-1.5">
                    {isGeocoding ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>}
                    搜索并锁定
                  </button>
                </div>

                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                  <div ref={mapContainerRef} className="w-full h-full z-0"></div>
                  {!formData.lat && !isGeocoding && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                      <span className="bg-gray-900/80 text-white text-[12px] font-bold px-4 py-2 rounded-full shadow-lg">请先在上方搜索大致位置</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" /></svg>
                    提示：在地图上点击可精准修改插眼位置
                  </p>
                  {formData.lat !== 0 && <span className="text-[11px] text-green-600 font-bold bg-green-50 px-2.5 py-1 rounded-md">坐标已获取</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">出发地 / 坐标</label>
                  <input type="text" list="city-list" placeholder="例如：奥克兰" value={formData.departure} onChange={(e) => setFormData({...formData, departure: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:bg-white focus:border-orange-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">目的地城市 / 场馆</label>
                  <input type="text" list="city-list" placeholder="非旅行类可填 '同城'" value={formData.destination} onChange={(e) => setFormData({...formData, destination: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:bg-white focus:border-orange-500 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">招募标题 <span className="text-red-500">*</span></label>
                <input type="text" placeholder="一句话概括，例如：周五晚脱口秀差一人！" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:bg-white focus:border-orange-500 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">开始时间</label>
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">结束时间</label>
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-orange-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">预算分配</label>
                  <select value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-orange-500 appearance-none">
                    <option>AA制 / 适中</option><option>穷游 / 经济</option><option>轻奢 / 舒适</option><option>我买单</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">期望搭子</label>
                  <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-orange-500 appearance-none">
                    <option>性别不限</option><option>限女生</option><option>限男生</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">交通方式</label>
                  <select value={formData.transport} onChange={(e) => setFormData({...formData, transport: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-orange-500 appearance-none">
                    <option>公共交通</option><option>自驾/打车</option><option>步行/骑行</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">详细说明</label>
                <textarea rows={3} placeholder="详细说说你的计划..." value={formData.planDetails} onChange={(e) => setFormData({...formData, planDetails: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-orange-500 resize-none"></textarea>
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 shrink-0 flex justify-end gap-3 bg-gray-50/50 rounded-b-[24px]">
              <button onClick={() => setIsPublishModalOpen(false)} disabled={isPublishing} className="px-6 py-2.5 text-[14px] font-bold text-gray-500 hover:bg-gray-200 rounded-full transition-colors">取消</button>
              <button onClick={handlePublish} disabled={isPublishing} className="px-8 py-2.5 text-[14px] font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-full shadow-md transition-colors flex items-center gap-2">
                {isPublishing ? '发布中...' : '发布招募'}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white rounded-t-[24px] sm:rounded-[24px] w-full max-w-md flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-[18px] font-black text-gray-900">高级筛选</h2>
              <button onClick={() => setIsFilterModalOpen(false)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div>
                <label className="block text-[14px] font-bold text-gray-900 mb-3">预算偏好</label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'AA制 / 适中', '穷游 / 经济', '轻奢 / 舒适', '我买单'].map(opt => (
                    <button 
                      key={opt}
                      onClick={() => setAdvancedFilters({...advancedFilters, budget: opt})}
                      className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${advancedFilters.budget === opt ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      {opt === 'all' ? '不限预算' : opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-gray-900 mb-3">性别要求</label>
                <div className="flex flex-wrap gap-2">
                  {['all', '性别不限', '限女生', '限男生'].map(opt => (
                    <button 
                      key={opt}
                      onClick={() => setAdvancedFilters({...advancedFilters, gender: opt})}
                      className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${advancedFilters.gender === opt ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      {opt === 'all' ? '全部' : opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-gray-900 mb-3">交通方式</label>
                <div className="flex flex-wrap gap-2">
                  {['all', '公共交通', '自驾/打车', '步行/骑行'].map(opt => (
                    <button 
                      key={opt}
                      onClick={() => setAdvancedFilters({...advancedFilters, transport: opt})}
                      className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${advancedFilters.transport === opt ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                      {opt === 'all' ? '不限方式' : opt}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-5 border-t border-gray-100 flex gap-3 bg-white rounded-b-[24px]">
              <button 
                onClick={() => setAdvancedFilters({ budget: 'all', gender: 'all', transport: 'all' })}
                className="w-1/3 py-3.5 text-[14px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                重置
              </button>
              <button 
                onClick={() => setIsFilterModalOpen(false)}
                className="w-2/3 py-3.5 text-[14px] font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                查看结果
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 0px; height: 0px; display: none; }
        .leaflet-container { z-index: 10 !important; font-family: inherit; }
      `}} />

    </main>
  );
}