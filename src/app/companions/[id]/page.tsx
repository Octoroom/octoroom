// src/app/companions/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// 🌟 引入 Leaflet 地图核心库与样式 (用于编辑模式)
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 修复 Next.js 中 Leaflet 默认标记图标丢失的问题
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

const CITIES = ["不限（Any)", "奥克兰 (Auckland)", "悉尼 (Sydney)", "墨尔本 (Melbourne)", "东京 (Tokyo)"]; 
const CATEGORIES = ["旅行/探索", "看电影/追剧", "运动/健身", "Live/演出", "探店/美食", "其他"];

interface RoomDetail {
  id: string; category: string; title: string; city_name: string;
  departure: string; start_date: string; end_date: string;
  budget: string; gender: string; transport: string; plan_details: string;
  author_id: string; author_name: string; author_avatar: string; created_at: string;
  reply_count: number; image_urls?: string[]; address_name?: string; 
  latitude?: number; longitude?: number;    
}

interface Participant {
  id: string; user_id: string; user_name: string; user_avatar: string;
}

// 🌟 企业级美学升级：精选高质感氛围图库 (按活动类型分类)
const getCoverImage = (id: string, category?: string) => {
  if (!id) return '';
  const numId = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  
  const PREMIUM_IMAGES: Record<string, string[]> = {
    "旅行/探索": [
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80", // 绝美公路旅行
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80", // 壮丽雪山
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80"  // 宁静湖泊背影
    ],
    "看电影/追剧": [
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80", // 复古电影院
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80", // 温馨投影仪
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80"  // 爆米花场板
    ],
    "运动/健身": [
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80", // 高级健身房光影
      "https://images.unsplash.com/photo-1526506443428-2ce8bc8a9ed5?auto=format&fit=crop&w=800&q=80", // 晨跑背影
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80"  // 拳击手套氛围
    ],
    "Live/演出": [
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80", // 演唱会狂欢人群
      "https://images.unsplash.com/photo-1540039155732-61128d8b8990?auto=format&fit=crop&w=800&q=80", // 舞台镭射灯光
      "https://images.unsplash.com/photo-1470229722913-7c090be5c5a4?auto=format&fit=crop&w=800&q=80"  // 音乐节背影
    ],
    "探店/美食": [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80", // 高级感咖啡店
      "https://images.unsplash.com/photo-1414235077428-33898ed1e813?auto=format&fit=crop&w=800&q=80", // 法式摆盘
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80"  // 阳光下午茶
    ],
    "default": [
      "https://images.unsplash.com/photo-1529156069898-49953eb1b5ce?auto=format&fit=crop&w=800&q=80", // 随性生活方式
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80", // 碰杯聚餐
      "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=800&q=80"  // 霓虹夜景
    ]
  };
  
  const images = PREMIUM_IMAGES[category || ""] || PREMIUM_IMAGES["default"];
  return images[numId % images.length];
};

export default function CompanionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null); 

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [formData, setFormData] = useState({
    category: '', destination: '', addressName: '', lat: 0, lng: 0, 
    departure: '', title: '', startDate: '', endDate: '',
    gender: '', budget: '', transport: '', planDetails: ''
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const fetchRoomDetailAndUser = async () => {
    if (!roomId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        setCurrentUserProfile(profile);

        const { data: likeData } = await supabase.from('companion_likes').select('id').eq('room_id', roomId).eq('user_id', user.id).single();
        if (likeData) setIsLiked(true);

        const { data: markData } = await supabase.from('companion_marks').select('id').eq('room_id', roomId).eq('user_id', user.id).single();
        if (markData) setIsBookmarked(true);
      }

      const { data: roomData, error: roomError } = await supabase.from('companion_rooms').select('*').eq('id', roomId).single();
      if (roomError) throw roomError;
      setRoom(roomData);

      const { data: partsData } = await supabase.from('companion_participants').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
      if (partsData) {
        setParticipants(partsData);
        if (user && partsData.some(p => p.user_id === user.id)) setIsJoined(true);
      }

    } catch (error) {
      console.error('获取详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomDetailAndUser();
  }, [roomId]);

  useEffect(() => {
    if (isEditModalOpen && mapContainerRef.current && !mapInstanceRef.current) {
      const initialLat = formData.lat || -36.8485;
      const initialLng = formData.lng || 174.7633;
      
      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], formData.lat ? 15 : 12);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      if (formData.lat && formData.lng) {
        markerRef.current = L.marker([formData.lat, formData.lng]).addTo(map);
      }

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setFormData(prev => ({ ...prev, lat, lng }));
        
        if (!markerRef.current) {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        } else {
          markerRef.current.setLatLng([lat, lng]);
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (!isEditModalOpen && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isEditModalOpen]);

  const handleChatWith = (targetUserId: string) => {
    if (!currentUserId) { alert("请先登录后再发起私聊哦！"); return; }
    if (currentUserId === targetUserId) { alert("不能和自己聊天哦！"); return; }
    router.push(`/messages?chatWith=${targetUserId}`);
  };

  const handleToggleLike = async () => {
    if (!currentUserId) { alert("请先登录！"); return; }
    const nextState = !isLiked;
    setIsLiked(nextState); 
    try {
      if (nextState) await supabase.from('companion_likes').insert([{ room_id: roomId, user_id: currentUserId }]);
      else await supabase.from('companion_likes').delete().eq('room_id', roomId).eq('user_id', currentUserId);
    } catch (error) { setIsLiked(!nextState); }
  };

  const handleToggleMark = async () => {
    if (!currentUserId) { alert("请先登录！"); return; }
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    try {
      if (nextState) await supabase.from('companion_marks').insert([{ room_id: roomId, user_id: currentUserId }]);
      else await supabase.from('companion_marks').delete().eq('room_id', roomId).eq('user_id', currentUserId);
    } catch (error) { setIsBookmarked(!nextState); }
  };

  const handleToggleJoin = async () => {
    if (!currentUserId || !currentUserProfile) { alert("请先登录后再报名！"); return; }
    setIsJoining(true);
    try {
      if (isJoined) {
        await supabase.from('companion_participants').delete().eq('room_id', roomId).eq('user_id', currentUserId);
        setParticipants(prev => prev.filter(p => p.user_id !== currentUserId));
        setIsJoined(false);
      } else {
        const newPart = {
          room_id: roomId, user_id: currentUserId,
          user_name: currentUserProfile.username || '神秘旅行家',
          user_avatar: currentUserProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`
        };
        const { data, error } = await supabase.from('companion_participants').insert([newPart]).select().single();
        if (error) throw error;
        setParticipants(prev => [...prev, data]);
        setIsJoined(true);

        if (room && currentUserId !== room.author_id) {
          await supabase.from('notifications').insert([{
            user_id: room.author_id, sender_id: currentUserId, type: 'companion_signup',
            content: `${newPart.user_name} 刚刚报名了你的招募：『${room.title}』`, link: `/companions/${room.id}`
          }]);
        }
      }
    } catch (error: any) { alert("操作失败: " + error.message); } finally { setIsJoining(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("确定要删除这条招募吗？删除后不可恢复哦！")) return;
    setIsDeleting(true);
    try {
      await supabase.from('posts').delete().eq('companion_room_id', room?.id);
      const { error } = await supabase.from('companion_rooms').delete().eq('id', room?.id);
      if (error) throw error;
      alert("删除成功！");
      router.refresh();
      router.replace('/companions');
    } catch (error: any) { alert("删除失败: " + error.message); setIsDeleting(false); }
  };

  const handleOpenEdit = () => {
    setFormData({
      category: room?.category || '旅行/探索', title: room?.title || '', destination: room?.city_name || '', addressName: room?.address_name || '', lat: room?.latitude || 0, lng: room?.longitude || 0,
      departure: room?.departure || '', startDate: room?.start_date || '', endDate: room?.end_date || '', budget: room?.budget || 'AA制 / 适中', gender: room?.gender || '不限', transport: room?.transport || '公共交通', planDetails: room?.plan_details || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!formData.title.trim()) { alert("标题不能为空哦！"); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('companion_rooms').update({
        category: formData.category, title: formData.title, city_name: formData.destination, address_name: formData.addressName, latitude: formData.lat || null, longitude: formData.lng || null, departure: formData.departure,
        start_date: formData.startDate || null, end_date: formData.endDate || null, budget: formData.budget, gender: formData.gender, transport: formData.transport, plan_details: formData.planDetails
      }).eq('id', room?.id);
      if (error) throw error;

      // 🌟 企业级极简几何排版模板：摒弃 Emoji，提升专业感
      const elegantPostContent = `✦ 寻找${formData.category}搭子 ✦

❖ 招募标题：${formData.title}
❖ 目的地 / 坐标：${formData.destination || '同城'}${formData.addressName ? ` · ${formData.addressName}` : ''}
❖ 行程预算：${formData.budget}
❖ 出行交通：${formData.transport}

❝ ${formData.planDetails ? formData.planDetails.slice(0, 60) + (formData.planDetails.length > 60 ? '...' : '') : '有趣的灵魂在路上，期待与你同行！'} ❞

查看下方专属卡片了解招募详情，快来报名加入我的计划吧！`;

      await supabase.from('posts').update({ content: elegantPostContent }).eq('companion_room_id', room?.id);
      
      setIsEditModalOpen(false);
      fetchRoomDetailAndUser(); 
    } catch (error: any) { alert("修改失败：" + error.message); } finally { setIsSaving(false); }
  };

  const handleGeocode = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (!formData.addressName.trim()) { alert("请先输入地址哦！"); return; }
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
            markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
          } else {
            markerRef.current.setLatLng([lat, lng]);
          }
        }
      } else { alert("找不到坐标，请尝试输入更详细的地址。"); }
    } catch (error) { alert("网络错误"); } finally { setIsGeocoding(false); }
  };

  if (loading) return <div className="flex-1 min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>;
  
  // 🌟 优雅的空状态：替换掉以前的“龙卷风”Emoji，改用高级感 SVG
  if (!room) return (
    <div className="flex-1 min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 text-gray-300 shadow-sm border border-gray-100">
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.166 1.318m6.332-6.332A4.486 4.486 0 0012.016 8.68a4.486 4.486 0 00-3.166 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-black text-gray-800">招募贴不存在或已被删除</h2>
      <button onClick={() => router.replace('/companions')} className="mt-6 px-8 py-2.5 bg-gray-900 text-white font-bold rounded-full hover:bg-black transition-colors shadow-md">返回搭子大厅</button>
    </div>
  );

  const displayImages = room.image_urls && room.image_urls.length > 0 ? room.image_urls : [getCoverImage(room.id, room.category)];
  const osmBbox = room.latitude && room.longitude ? `${room.longitude - 0.008},${room.latitude - 0.008},${room.longitude + 0.008},${room.latitude + 0.008}` : '';

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-white flex flex-col relative pb-28">
      
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 via-black/20 to-transparent">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/50 transition-colors">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
      </div>

      <div className="w-full h-[320px] sm:h-[400px] relative bg-black shrink-0 overflow-hidden group">
        <img src={displayImages[currentImageIndex]} alt="Cover" className="w-full h-full object-cover transition-opacity duration-300" />
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white text-[12px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm z-10 border border-white/10">
          <svg fill="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          {room.city_name || '同城'}
        </div>
        {displayImages.length > 1 && (
          <>
            <button onClick={() => setCurrentImageIndex(prev => prev === 0 ? displayImages.length - 1 : prev - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/50"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
            <button onClick={() => setCurrentImageIndex(prev => prev === displayImages.length - 1 ? 0 : prev + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/50"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
          </>
        )}
      </div>

      <div className="p-5 flex-1 bg-white rounded-t-[24px] -mt-6 relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="inline-flex items-center justify-center px-2.5 py-1 mb-3 rounded-md bg-orange-50 text-orange-600 text-[12px] font-black tracking-wide border border-orange-100">
          {room.category || '组局招募'}
        </div>

        <div className="mb-6">
          <h1 className="text-[22px] font-black text-gray-900 leading-snug mb-5">{room.title}</h1>
          <div className="flex items-center justify-between bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
            
            <div 
              onClick={() => router.push(`/user/${room.author_id}`)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <img src={room.author_avatar} alt="avatar" className="w-11 h-11 rounded-full bg-white object-cover shadow-sm group-hover:shadow-md transition-shadow" />
              <div>
                <div className="text-[15px] font-bold text-gray-900 group-hover:text-orange-500 transition-colors">{room.author_name}</div>
                <div className="text-[12px] text-gray-400 font-medium">发布于 {new Date(room.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            
            {currentUserId === room.author_id ? (
              <div className="flex gap-2">
                <button onClick={handleOpenEdit} className="px-4 py-1.5 bg-gray-100 text-gray-700 font-bold text-[13px] rounded-full hover:bg-gray-200 transition-colors shadow-sm">编辑</button>
                <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-100 font-bold text-[13px] rounded-full hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50">
                  {isDeleting ? '删除中...' : '删除'}
                </button>
              </div>
            ) : (
              <button className="px-4 py-1.5 bg-white border border-gray-200 text-gray-700 font-bold text-[13px] rounded-full hover:border-orange-500 hover:text-orange-500 transition-colors shadow-sm">关注</button>
            )}
          </div>
        </div>

        {(room.address_name || room.city_name) && (
          <div className="mb-6">
            <h3 className="text-[16px] font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="w-1.5 h-4 bg-orange-500 rounded-full"></span>聚集地点</h3>
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-white flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-gray-900 truncate">{room.address_name || `${room.city_name} (未提供具体地址)`}</div>
                </div>
                <button onClick={() => { window.open(room.latitude && room.longitude ? `https://www.openstreetmap.org/?mlat=${room.latitude}&mlon=${room.longitude}#map=16/${room.latitude}/${room.longitude}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent(room.address_name || room.city_name)}`, '_blank'); }} className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 hover:bg-orange-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                </button>
              </div>
              <div className="h-44 bg-gray-100 relative w-full overflow-hidden border-t border-gray-100">
                {room.latitude && room.longitude ? (
                  <iframe width="100%" height="100%" style={{ border: 0 }} src={`https://www.openstreetmap.org/export/embed.html?bbox=${osmBbox}&layer=mapnik&marker=${room.latitude}%2C${room.longitude}`}></iframe>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm"><span className="text-white text-[13px] font-bold px-4 py-2 bg-black/50 rounded-full">未提供精准坐标</span></div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-y-4 gap-x-2 border border-gray-100/50">
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium">时间计划</span><span className="text-[14px] font-bold text-gray-800">{room.start_date ? new Date(room.start_date).toLocaleDateString() : '待定'}</span></div>
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium">集合地</span><span className="text-[14px] font-bold text-gray-800">{room.departure || '不限'}</span></div>
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium">预算分配</span><span className="text-[14px] font-bold text-gray-800">{room.budget || '未填'}</span></div>
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium">期望搭子</span><span className="text-[14px] font-bold text-gray-800">{room.gender || '不限'}</span></div>
        </div>

        <div className="mb-8">
          <h3 className="text-[16px] font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="w-1.5 h-4 bg-orange-500 rounded-full"></span>计划详情</h3>
          <div className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap break-words bg-gray-50/30 p-4 rounded-2xl border border-gray-100/50">{room.plan_details || '博主很懒，没有留下说明哦~'}</div>
        </div>

        <div className="mb-6 pt-4 border-t border-gray-100">
          <h3 className="text-[16px] font-bold text-gray-900 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-orange-500 rounded-full"></span>
              已报名搭子 <span className="text-gray-400 font-medium text-[13px]">({participants.length}人)</span>
            </div>
            {participants.length > 0 && <span className="text-[11px] text-orange-500 font-medium bg-orange-50 px-2 py-0.5 rounded-full">点击头像查看主页</span>}
          </h3>
          
          {participants.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {participants.map(p => (
                <div key={p.id} onClick={() => router.push(`/user/${p.user_id}`)} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                  <div className="relative">
                    <img src={p.user_avatar} alt={p.user_name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-orange-200 transition-colors" />
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white"></div>
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium w-14 truncate text-center group-hover:text-orange-500 transition-colors">{p.user_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-300 shadow-sm mb-2">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              </div>
              <p className="text-[13px] font-medium text-gray-500">还没有人报名</p>
              <p className="text-[11px] text-gray-400 mt-1">快来抢占第一个沙发吧！</p>
            </div>
          )}
        </div>
      </div>

      <div className="fixed sm:absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-lg border-t border-gray-100 flex items-center justify-between gap-4 z-30 w-full pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-5 px-2">
          <button onClick={handleToggleLike} className="flex flex-col items-center gap-1 transition-all group">
            <svg viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 transition-transform active:scale-75 ${isLiked ? 'fill-red-500 text-red-500' : 'fill-none text-gray-400 group-hover:text-red-400'}`}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            <span className={`text-[10px] font-medium ${isLiked ? 'text-red-500' : 'text-gray-400'}`}>{isLiked ? '已赞' : '点赞'}</span>
          </button>
          <button onClick={handleToggleMark} className="flex flex-col items-center gap-1 transition-all group">
             <svg viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 transition-transform active:scale-75 ${isBookmarked ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-gray-400 group-hover:text-yellow-400'}`}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.148.621-.531 1.065-1.058.736l-4.71-2.95a.563.563 0 00-.584 0l-4.71 2.95c-.527.329-1.206-.115-1.058-.736l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602a.563.563 0 00.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
            <span className={`text-[10px] font-medium ${isBookmarked ? 'text-yellow-500' : 'text-gray-400'}`}>{isBookmarked ? '已收藏' : '收藏'}</span>
          </button>
        </div>
        
        <div className="flex-1 flex gap-2">
          {currentUserId === room.author_id ? (
            <button className="flex-1 py-3.5 rounded-full font-bold text-[14px] bg-gray-100 text-gray-400 cursor-not-allowed">
              这是你发布的招募
            </button>
          ) : (
            <>
              <button 
                onClick={() => handleChatWith(room.author_id)}
                className="flex-1 py-3.5 rounded-full font-bold text-[14px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                私聊博主
              </button>
              <button 
                onClick={handleToggleJoin}
                disabled={isJoining}
                className={`flex-1 py-3.5 rounded-full font-bold text-[14px] shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  isJoined ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100' : 'bg-gray-900 text-white hover:bg-black'
                }`}
              >
                {isJoining ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : isJoined ? <><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> 已报名 (取消)</> : '立即报名'}
              </button>
            </>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-black text-gray-900">编辑招募信息</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <datalist id="city-list">{CITIES.map(city => <option key={city} value={city} />)}</datalist>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-2">你想组个什么局？ *</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setFormData({...formData, category: cat})} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border ${formData.category === cat ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}>{cat}</button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 shadow-sm">
                <label className="block text-[14px] font-black text-gray-900 mb-3 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9z"/><circle cx="12" cy="9" r="2.5"/></svg>
                  智能地图定位 (修改)
                </label>
                
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    placeholder="输入详细地址以重新定位..." 
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
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" /></svg>
                    提示：在地图上点击可精准修改插眼位置
                  </p>
                  {formData.lat !== 0 && <span className="text-[11px] text-green-600 font-bold bg-green-50 px-2.5 py-1 rounded-md">坐标已更新</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">出发地</label>
                  <input type="text" list="city-list" value={formData.departure} onChange={(e) => setFormData({...formData, departure: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px]" />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">目的地城市 / 场馆</label>
                  <input type="text" list="city-list" value={formData.destination} onChange={(e) => setFormData({...formData, destination: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px]" />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">招募标题 *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[13px] font-bold text-gray-700 mb-1.5">开始时间</label><input type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px]" /></div>
                <div><label className="block text-[13px] font-bold text-gray-700 mb-1.5">结束时间</label><input type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px]" /></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">预算</label>
                  <select value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px]"><option>AA制 / 适中</option><option>穷游 / 经济</option><option>轻奢 / 舒适</option><option>我买单</option></select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">搭子</label>
                  <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px]"><option>性别不限</option><option>限女生</option><option>限男生</option></select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">交通</label>
                  <select value={formData.transport} onChange={(e) => setFormData({...formData, transport: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px]"><option>公共交通</option><option>自驾/打车</option><option>步行/骑行</option></select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">详细说明</label>
                <textarea rows={3} value={formData.planDetails} onChange={(e) => setFormData({...formData, planDetails: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] resize-none"></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-[24px]">
              <button onClick={() => setIsEditModalOpen(false)} disabled={isSaving} className="px-6 py-2.5 text-[14px] font-bold text-gray-500 hover:bg-gray-200 rounded-full">取消</button>
              <button onClick={handleSaveEdit} disabled={isSaving} className="px-8 py-2.5 text-[14px] font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-full shadow-md">
                {isSaving ? '保存中...' : '保存修改'}
              </button>
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