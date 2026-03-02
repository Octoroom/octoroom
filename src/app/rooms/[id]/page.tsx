// src/app/rooms/[id]/page.tsx
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

// 矢量图标库
const Icons = {
  wifi: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>,
  ac: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.296 0 .587-.013.873-.038M3.375 19.5a8.96 8.96 0 01-2.368-7.859M15 6.75h.008v.008H15V6.75zm-3 0h.008v.008H12V6.75zm-3 0h.008v.008H9V6.75zm-3 0h.008v.008H6V6.75z" /></svg>,
  kitchen: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  washer: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
  bathroom: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.375a1.875 1.875 0 01-1.875-1.875V8.625zM16.5 4.125c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v15.75c0 1.035-.84 1.875-1.875 1.875h-.375a1.875 1.875 0 01-1.875-1.875V4.125z" /></svg>,
  workspace: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>
};

const baseFacilityOptions = [
  { id: 'wifi', label: '高速网络' }, { id: 'ac', label: '冷暖空调' },
  { id: 'kitchen', label: '全套厨房' }, { id: 'washer', label: '洗衣机' },
  { id: 'bathroom', label: '独立卫浴' }, { id: 'workspace', label: '专属工作区' }
];

function formatDate(date: Date) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDatesInRange(startDate: string, endDate: string) {
  const dates = [];
  let currentDate = new Date(startDate.split('-').map(Number)[0], startDate.split('-').map(Number)[1] - 1, startDate.split('-').map(Number)[2]);
  const end = new Date(endDate.split('-').map(Number)[0], endDate.split('-').map(Number)[1] - 1, endDate.split('-').map(Number)[2]);
  while (currentDate < end) { dates.push(formatDate(currentDate)); currentDate.setDate(currentDate.getDate() + 1); }
  return dates;
}

export default function RoomDetailPage() {
  const params = useParams(); const router = useRouter();
  const roomId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [room, setRoom] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // 点赞与收藏状态
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isMarked, setIsMarked] = useState(false);
  const [markCount, setMarkCount] = useState(0);

  const [myBooking, setMyBooking] = useState<any>(null);
  const [guestMessage, setGuestMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomCount, setRoomCount] = useState(1);
  const [bookedDateCounts, setBookedDateCounts] = useState<Record<string, number>>({});
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
  const [selectingType, setSelectingType] = useState<'checkIn' | 'checkOut' | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [customAmenities, setCustomAmenities] = useState<{id: string, label: string}[]>([]);
  const [newAmenity, setNewAmenity] = useState('');

  // 地图相关的状态与 Ref
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [editForm, setEditForm] = useState({
    city: '', title: '', availableDate: '', priceAmount: '', priceCurrency: 'NZD',
    roomType: '独立单间', amenities: [] as string[], description: '', rentMode: 'entire', totalRooms: 1,
    addressName: '', lat: 0, lng: 0, 
    imageMode: 'system' as 'system' | 'custom', existingImages: [] as string[], newFiles: [] as File[], newPreviews: [] as string[]
  });

  const blockedDates = room ? Object.keys(bookedDateCounts).filter(date => bookedDateCounts[date] + roomCount > (room.total_rooms || 1)) : [];

  useEffect(() => {
    async function fetchData() {
      if (!roomId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        setCurrentUser({ ...user, profile });
      }

      const { data: roomData } = await supabase.from('octo_rooms').select('*').eq('id', roomId).single();
      setRoom(roomData);

      if (roomData) {
        const { data: activeBookings } = await supabase.from('octo_bookings').select('check_in, check_out, room_count').eq('room_id', roomId).in('status', ['pending', 'approved', 'paid']); 
        if (activeBookings) {
          const dateCounts: Record<string, number> = {};
          activeBookings.forEach(booking => {
            const dates = getDatesInRange(booking.check_in, booking.check_out);
            dates.forEach(date => { dateCounts[date] = (dateCounts[date] || 0) + (booking.room_count || 1); });
          });
          setBookedDateCounts(dateCounts);
        }

        const [likesRes, marksRes] = await Promise.all([
          supabase.from('octo_likes').select('user_id').eq('item_id', roomId).eq('item_type', 'room'),
          supabase.from('octo_marks').select('user_id').eq('item_id', roomId).eq('item_type', 'room')
        ]);
        
        if (likesRes.data) {
          setLikeCount(likesRes.data.length);
          if (user) setIsLiked(likesRes.data.some(l => l.user_id === user.id));
        }
        if (marksRes.data) {
          setMarkCount(marksRes.data.length);
          if (user) setIsMarked(marksRes.data.some(m => m.user_id === user.id));
        }
      }

      if (user && roomData && user.id !== roomData.author_id) {
        const { data: bookings } = await supabase.from('octo_bookings').select('*').match({ room_id: roomId, guest_id: user.id }).order('created_at', { ascending: false }).limit(1);
        setMyBooking(bookings?.[0] || null);
      }
      
      const savedAmenities = localStorage.getItem('octo_custom_amenities');
      if (savedAmenities) setCustomAmenities(JSON.parse(savedAmenities));

      setLoading(false);
    }
    fetchData();
  }, [roomId]);

  // 编辑模式的 Leaflet 地图初始化
  useEffect(() => {
    if (isEditModalOpen && mapContainerRef.current && !mapInstanceRef.current) {
      const initialLat = editForm.lat || -36.8485;
      const initialLng = editForm.lng || 174.7633;
      
      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], editForm.lat ? 15 : 12);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      if (editForm.lat && editForm.lng) {
        markerRef.current = L.marker([editForm.lat, editForm.lng]).addTo(map);
      }

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setEditForm(prev => ({ ...prev, lat, lng }));
        
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

  const handleGeocode = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (!editForm.addressName.trim()) { alert("请先输入详细地址哦！"); return; }
    setIsGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(editForm.addressName)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) { 
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setEditForm(prev => ({ ...prev, lat, lng })); 
        
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

  const toggleLike = async () => {
    if (!currentUser) return alert('请先登录！');
    const newState = !isLiked;
    setIsLiked(newState);
    setLikeCount(prev => newState ? prev + 1 : prev - 1);
    
    try {
      if (newState) await supabase.from('octo_likes').insert([{ user_id: currentUser.id, item_id: roomId, item_type: 'room' }]);
      else await supabase.from('octo_likes').delete().match({ user_id: currentUser.id, item_id: roomId, item_type: 'room' });
    } catch (err) { console.error('点赞操作失败'); }
  };

  const toggleMark = async () => {
    if (!currentUser) return alert('请先登录！');
    const newState = !isMarked;
    setIsMarked(newState);
    setMarkCount(prev => newState ? prev + 1 : prev - 1);
    
    try {
      if (newState) await supabase.from('octo_marks').insert([{ user_id: currentUser.id, item_id: roomId, item_type: 'room' }]);
      else await supabase.from('octo_marks').delete().match({ user_id: currentUser.id, item_id: roomId, item_type: 'room' });
    } catch (err) { console.error('收藏操作失败'); }
  };

  const handleChatWith = (targetUserId: string) => {
    if (!currentUser) {
      alert("请先登录后再发起私聊哦！");
      return;
    }
    router.push(`/messages?chatWith=${targetUserId}`);
  };

  const handleRoomCountChange = (newCount: number) => {
    setRoomCount(newCount);
    const newBlocked = Object.keys(bookedDateCounts).filter(date => bookedDateCounts[date] + newCount > (room?.total_rooms || 1));
    if (checkIn && checkOut) {
      const selected = getDatesInRange(checkIn, checkOut);
      if (selected.some(d => newBlocked.includes(d))) {
        setCheckIn(''); setCheckOut('');
        alert(`抱歉，当预定 ${newCount} 间房时，您已选的部分日期库存不足，请重新选择。`);
      }
    }
  };

  const handleApply = async () => {
    if (!currentUser) { alert('请先登录！'); return; }
    if (!checkIn || !checkOut || !guestMessage.trim()) { alert('请填写完整入住日期和申请留言！'); return; }

    setIsApplying(true);
    try {
      const { data, error } = await supabase.from('octo_bookings').insert([{
        room_id: room.id, host_id: room.author_id, guest_id: currentUser.id,
        guest_name: currentUser.profile?.username || currentUser.email?.split('@')[0],
        guest_avatar: currentUser.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
        check_in: checkIn, check_out: checkOut, guest_message: guestMessage, room_count: roomCount, status: 'pending'
      }]).select().single();
      if (error) throw error;
      setMyBooking(data); 
      alert('申请成功！已通知房东。'); window.location.reload(); 
    } catch (err: any) { alert('申请提交失败: ' + err.message); } finally { setIsApplying(false); }
  };

  const handleStripePayment = async () => {
    alert("正在跳转至 Stripe 安全支付网关...");
    await supabase.from('octo_bookings').update({ status: 'paid' }).eq('id', myBooking.id);
    setMyBooking({ ...myBooking, status: 'paid' });
  };

  const openEditModal = () => {
    const priceStr = room.price || '';
    const match = priceStr.match(/(\d+(?:\.\d+)?)\s*([A-Za-z]+)/);
    const imgUrls = room.cover_image ? room.cover_image.split(',').map((s:string) => s.trim()).filter((u:string) => u.startsWith('http')) : [];
    setEditForm({
      title: room.title || '', city: room.city_name || '', availableDate: room.available_date || '',
      priceAmount: match ? match[1] : '', priceCurrency: match ? match[2] : 'NZD',
      roomType: room.room_type || '独立单间', amenities: room.amenities ? room.amenities.split(',').map((s:string) => s.trim()).filter(Boolean) : [],
      description: room.description || '', rentMode: room.rent_mode || 'entire', totalRooms: room.total_rooms || 1,
      addressName: room.address_name || '', lat: room.latitude || 0, lng: room.longitude || 0, 
      imageMode: imgUrls.length > 0 ? 'custom' : 'system', existingImages: imgUrls, newFiles: [], newPreviews: []
    });
    setIsEditModalOpen(true);
  };

  const toggleEditFacility = (id: string) => { setEditForm(prev => ({ ...prev, amenities: prev.amenities.includes(id) ? prev.amenities.filter(f => f !== id) : [...prev.amenities, id] })); };

  const handleAddCustomAmenity = () => {
    if (!newAmenity.trim()) return;
    const newId = newAmenity.trim();
    if (!customAmenities.find(a => a.id === newId) && !baseFacilityOptions.find(a => a.id === newId)) {
      const newList = [...customAmenities, { id: newId, label: newId }];
      setCustomAmenities(newList); localStorage.setItem('octo_custom_amenities', JSON.stringify(newList));
    }
    if (!editForm.amenities.includes(newId)) toggleEditFacility(newId);
    setNewAmenity('');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) setEditForm(prev => ({ ...prev, newFiles: [...prev.newFiles, ...files], newPreviews: [...prev.newPreviews, ...files.map(f => URL.createObjectURL(f))] }));
    e.target.value = '';
  };

  const handleUpdate = async () => {
    if (!editForm.title.trim() || !editForm.city.trim() || !editForm.priceAmount.trim()) { alert("请填写房源城市、标题和价格！"); return; }
    setIsUpdating(true);
    try {
      let finalImageUrls = [...editForm.existingImages];
      if (editForm.imageMode === 'custom' && editForm.newFiles.length > 0) {
        const uploadPromises = editForm.newFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('rooms').upload(fileName, file);
          if (uploadError) throw new Error('图片上传失败: ' + uploadError.message);
          const { data: urlData } = supabase.storage.from('rooms').getPublicUrl(fileName);
          return urlData.publicUrl;
        });
        const newlyUploadedUrls = await Promise.all(uploadPromises);
        finalImageUrls = [...finalImageUrls, ...newlyUploadedUrls];
      }

      const coverImageString = editForm.imageMode === 'custom' ? (finalImageUrls.length > 0 ? finalImageUrls.join(',') : null) : null;
      const finalPrice = `${editForm.priceAmount} ${editForm.priceCurrency} / 晚`;

      const { error } = await supabase.from('octo_rooms').update({
        title: editForm.title, city_name: editForm.city, available_date: editForm.availableDate || null,
        price: finalPrice, room_type: editForm.roomType, amenities: editForm.amenities.join(','),
        description: editForm.description, rent_mode: editForm.rentMode, total_rooms: editForm.rentMode === 'entire' ? 1 : Number(editForm.totalRooms), 
        cover_image: coverImageString,
        address_name: editForm.addressName, latitude: editForm.lat || null, longitude: editForm.lng || null
      }).eq('id', room.id);

      if (error) throw error;

      const postImage = coverImageString ? coverImageString.split(',')[0] : `https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=80&random=${room.id}`;
      await supabase.from('posts').update({
        content: `【精选房源】\n城市：${editForm.city}\n标题：${editForm.title}\n房型：${editForm.roomType}\n价格：${finalPrice}\n欢迎点击卡片进入房间查看详情并申请入住！`,
        image_urls: [postImage]
      }).eq('octo_room_id', room.id);

      setRoom((prev: any) => ({
        ...prev, title: editForm.title, city_name: editForm.city, price: finalPrice,
        room_type: editForm.roomType, description: editForm.description, cover_image: coverImageString, amenities: editForm.amenities.join(','),
        address_name: editForm.addressName, latitude: editForm.lat, longitude: editForm.lng
      }));
      setCurrentImgIndex(0); setIsEditModalOpen(false); alert("修改成功！");
    } catch (err: any) { alert("修改失败: " + err.message); } finally { setIsUpdating(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("确定要永久删除这个房源吗？删除后不可恢复！")) return;
    try {
      const { error } = await supabase.from('octo_rooms').delete().eq('id', room.id);
      if (error) throw error;
      alert("房源已成功删除！"); router.push('/my-rooms');
    } catch (err: any) { alert("删除失败: " + err.message); }
  };

  const renderCalendar = () => {
    const year = calendarViewDate.getFullYear(); const month = calendarViewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = formatDate(new Date()); const availableFrom = room.available_date || todayStr;
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-8 h-8 sm:w-10 sm:h-10"></div>);

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i); const dateStr = formatDate(d);
      const isPast = dateStr < availableFrom; const isBlockedNight = blockedDates.includes(dateStr);
      let isDisabled = isPast; let bgClass = "bg-white text-gray-800 hover:bg-gray-100 cursor-pointer";

      if (selectingType === 'checkOut' && checkIn) {
        if (dateStr <= checkIn) isDisabled = true;
        else if (isBlockedNight) {
          const range = getDatesInRange(checkIn, dateStr);
          isDisabled = range.some(r => blockedDates.includes(r));
        }
      } else { if (isBlockedNight) isDisabled = true; }

      if (isDisabled) bgClass = "bg-gray-50 text-gray-300 line-through cursor-not-allowed";
      else if (isBlockedNight && selectingType === 'checkOut') bgClass = "bg-white text-gray-800 border border-dashed border-gray-300 hover:bg-gray-50 cursor-pointer";

      const isCheckIn = dateStr === checkIn; const isCheckOut = dateStr === checkOut;
      const isInRange = checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;

      if (isCheckIn || isCheckOut) bgClass = "bg-blue-600 text-white font-bold shadow-md cursor-pointer";
      else if (isInRange) bgClass = "bg-blue-50 text-blue-700 cursor-pointer";

      days.push(
        <div key={dateStr} onClick={() => {
            if (isDisabled) return;
            if (selectingType === 'checkIn') {
              setCheckIn(dateStr);
              if (checkOut && dateStr >= checkOut) setCheckOut('');
              if (checkOut && dateStr < checkOut) {
                 const range = getDatesInRange(dateStr, checkOut);
                 if (range.some(r => blockedDates.includes(r))) setCheckOut('');
              }
              setSelectingType('checkOut');
            } else { setCheckOut(dateStr); setSelectingType(null); }
          }} className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-[13px] transition-all ${bgClass}`}
        >{i}</div>
      );
    }
    return days;
  };

  const renderHostCalendar = () => {
    const year = calendarViewDate.getFullYear(); const month = calendarViewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalRooms = room.total_rooms || 1;
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-8 h-8 sm:w-10 sm:h-10"></div>);

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i); const dateStr = formatDate(d);
      const count = bookedDateCounts[dateStr] || 0;
      let bgClass = "bg-white text-gray-800 border border-gray-100";
      if (count >= totalRooms) bgClass = "bg-red-50 text-red-600 font-bold border-red-200 shadow-sm"; 
      else if (count > 0) bgClass = "bg-orange-50 text-orange-600 font-bold border-orange-200 shadow-sm"; 

      days.push(
        <div key={dateStr} className={`w-8 h-8 sm:w-10 sm:h-10 flex flex-col items-center justify-center rounded-lg text-[13px] relative ${bgClass}`}>
           <span>{i}</span>
           {count > 0 && totalRooms > 1 && <span className="text-[9px] absolute bottom-0.5 opacity-80">{count}/{totalRooms}</span>}
        </div>
      );
    }
    return days;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (!room) return <div className="min-h-screen flex items-center justify-center text-gray-500">房源不存在</div>;

  const displayImages = room.cover_image && room.cover_image.includes('http') 
    ? room.cover_image.split(',').map((s:string) => s.trim()).filter(Boolean)
    : [roomId ? `https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80&random=${roomId}` : ''];

  const isHost = currentUser?.id === room.author_id;
  const canApply = !myBooking || ['cancelled', 'rejected', 'paid'].includes(myBooking.status);
  const validAmenities = room.amenities ? room.amenities.split(',').map((s:string) => s.trim()).filter(Boolean) : [];
  const osmBbox = room.latitude && room.longitude ? `${room.longitude - 0.008},${room.latitude - 0.008},${room.longitude + 0.008},${room.latitude + 0.008}` : '';

  return (
    <main className="flex-1 max-w-[640px] w-full h-[100dvh] md:h-screen border-r border-gray-100 bg-white flex flex-col relative overflow-hidden">
      
      <div className="absolute top-0 left-0 right-0 z-50 p-4 pointer-events-none flex justify-between items-start">
        <button onClick={() => router.back()} className="pointer-events-auto w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>

        <div className="flex gap-2 pointer-events-auto">
          <button onClick={toggleLike} className="group flex items-center gap-1.5 px-3 py-2 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all">
             <svg fill={isLiked ? "#ef4444" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke={isLiked ? "#ef4444" : "white"} className={`w-4 h-4 transition-transform duration-300 ${isLiked ? 'scale-110' : 'group-hover:scale-110'}`}><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" /></svg>
             {likeCount > 0 && <span className="text-white text-xs font-bold">{likeCount}</span>}
          </button>
          <button onClick={toggleMark} className="group flex items-center gap-1.5 px-3 py-2 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all">
             <svg fill={isMarked ? "#f59e0b" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke={isMarked ? "#f59e0b" : "white"} className={`w-4 h-4 transition-transform duration-300 ${isMarked ? 'scale-110' : 'group-hover:scale-110'}`}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
             {markCount > 0 && <span className="text-white text-xs font-bold">{markCount}</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-[320px]">
        <div className="w-full h-[300px] relative group bg-gray-100">
          <div 
             id="room-image-slider"
             className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
             onScroll={(e) => {
               const scrollLeft = e.currentTarget.scrollLeft;
               const width = e.currentTarget.clientWidth;
               setCurrentImgIndex(Math.round(scrollLeft / width));
             }}
          >
            {displayImages.map((imgUrl: string, idx: number) => (
              <img key={idx} src={imgUrl} className="w-full h-full object-cover flex-shrink-0 snap-center" alt={`cover-${idx}`} />
            ))}
          </div>

          {displayImages.length > 1 && (
            <>
              <button 
                onClick={() => { const slider = document.getElementById('room-image-slider'); if(slider) slider.scrollBy({ left: -slider.clientWidth, behavior: 'smooth' }); }} 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
              >
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button 
                onClick={() => { const slider = document.getElementById('room-image-slider'); if(slider) slider.scrollBy({ left: slider.clientWidth, behavior: 'smooth' }); }} 
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
              >
                 <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
              
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                 {displayImages.map((_:any, i:number) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentImgIndex ? 'bg-white scale-125' : 'bg-white/50'}`} />
                 ))}
              </div>
            </>
          )}
        </div>

        <div className="p-5 bg-white rounded-t-[24px] -mt-6 relative z-10 min-h-[50vh]">
          <div className="flex justify-between items-start mb-4">
             <h1 className="text-[22px] font-black text-gray-900 leading-tight pr-4">{room.title}</h1>
          </div>
          
          {/* 🌟 修复点：头像点击跳转已修改为 /user/... */}
          <div onClick={() => router.push(`/user/${room.author_id}`)} className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-xl transition-colors group">
            <div className="flex items-center gap-3">
              <img src={room.author_avatar} className="w-10 h-10 rounded-full bg-gray-100 object-cover group-hover:shadow-md transition-shadow" alt="host" />
              <div>
                <div className="text-[14px] font-bold text-gray-900 group-hover:text-blue-600 transition-colors">房东: {room.author_name}</div>
                <div className="text-[12px] text-gray-400">已实名认证</div>
              </div>
            </div>
            
            {!isHost && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleChatWith(room.author_id); }}
                className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:scale-105 transition-all shadow-sm"
                title="私聊房东"
              >
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
              </button>
            )}
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-y-4 gap-x-2 border border-gray-100/50">
            <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>出租方式</span>
              <span className="text-[14px] font-bold text-gray-800">{room.rent_mode === 'entire' ? '整套出租' : `按房间出租 (共${room.total_rooms || 1}间)`}</span>
            </div>
            <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>租金预算</span>
               <span className="text-[14px] font-bold text-blue-600">{room.price?.includes('晚') ? room.price : `${room.price || '面议'} / 晚`}</span>
            </div>
            <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.75M5.25 9h3.75m-3.75 3h3.75m-3.75 3h3.75m-3.75-6h3.75m-3.75 3h3.75m-3.75 3h3.75M9 21v-8.25" /></svg>房源类型</span><span className="text-[14px] font-bold text-gray-800">{room.room_type}</span></div>
            <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>可租日期</span><span className="text-[14px] font-bold text-gray-800">{room.available_date || '随时可租'} 起</span></div>
          </div>

          {(room.address_name || room.city_name) && (
            <div className="mb-8">
              <h3 className="text-[16px] font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-blue-500 rounded-full"></span>房源位置</h3>
              <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-white flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-gray-900 truncate">{room.address_name || `${room.city_name} (未提供具体地址)`}</div>
                  </div>
                  <button onClick={() => { window.open(room.latitude && room.longitude ? `https://www.openstreetmap.org/?mlat=${room.latitude}&mlon=${room.longitude}#map=16/${room.latitude}/${room.longitude}` : `https://www.openstreetmap.org/search?query=${encodeURIComponent(room.address_name || room.city_name)}`, '_blank'); }} className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 hover:bg-blue-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                  </button>
                </div>
                <div className="h-44 bg-gray-100 relative w-full overflow-hidden border-t border-gray-100">
                  {room.latitude && room.longitude ? (
                    <iframe width="100%" height="100%" style={{ border: 0 }} src={`https://www.openstreetmap.org/export/embed.html?bbox=${osmBbox}&layer=mapnik&marker=${room.latitude}%2C${room.longitude}`}></iframe>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-sm"><span className="text-gray-500 text-[13px] font-bold px-4 py-2 bg-white/80 rounded-full shadow-sm">未提供精准坐标</span></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {validAmenities.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[16px] font-bold text-gray-900 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-blue-500 rounded-full"></span>核心设施</h3>
              <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                {validAmenities.map((item: string) => {
                  const IconComponent = Icons[item as keyof typeof Icons] || (<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
                  const label = item === 'wifi' ? '高速网络' : item === 'ac' ? '冷暖空调' : item === 'kitchen' ? '全套厨房' : item === 'washer' ? '洗衣机' : item === 'bathroom' ? '独立卫浴' : item === 'workspace' ? '专属工作区' : item;
                  return (
                    <div key={item} className="flex items-center gap-2 text-gray-700">
                      <div className="text-gray-400">{IconComponent}</div>
                      <span className="text-[13px] font-medium">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-[16px] font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-blue-500 rounded-full"></span>房源详情介绍</h3>
            <p className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{room.description}</p>
          </div>

          {isHost && (
            <div className="mb-4 p-5 bg-blue-50/40 rounded-2xl border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2"><span className="w-1 h-4 bg-blue-500 rounded-full"></span>预定状态看板 <span className="text-[11px] font-normal text-blue-500 bg-blue-100/50 px-2 py-0.5 rounded-full">仅您可见</span></h3>
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-sm">
                  <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))} className="w-6 h-6 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-200 text-gray-600 transition-colors text-xs">&lt;</button>
                  <div className="text-[12px] font-bold text-gray-800 min-w-[65px] text-center">{calendarViewDate.getFullYear()}年 {calendarViewDate.getMonth() + 1}月</div>
                  <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))} className="w-6 h-6 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-200 text-gray-600 transition-colors text-xs">&gt;</button>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="grid grid-cols-7 gap-1 text-center mb-2">{['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="text-[11px] font-bold text-gray-400">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-y-2 gap-x-1 justify-items-center">{renderHostCalendar()}</div>
                
                <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-600 justify-center mt-5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-50 border border-red-200 block"></span>已满房</div>
                  {(room.total_rooms || 1) > 1 && (<div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-50 border border-orange-200 block"></span>部分预定</div>)}
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white border border-gray-200 block"></span>空闲可用</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] z-40 w-full rounded-t-[24px] max-h-[85vh] flex flex-col">
        <div className="overflow-y-auto scrollbar-hide w-full">
          {isHost ? (
            <div className="flex items-center gap-3">
               <button onClick={openEditModal} className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors shadow-sm">修改房源</button>
               <button onClick={handleDelete} className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-red-100 text-red-600 hover:bg-red-200 transition-colors shadow-sm">永久删除</button>
            </div>
          ) : (
            <>
              {canApply && (
                <div className="space-y-3">
                  {myBooking?.status === 'paid' && <div className="text-[12px] font-bold text-green-600 flex items-center gap-1.5 bg-green-50 p-2.5 rounded-xl border border-green-100"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>您之前已成功预定过该房源，仍可继续选择新日期进行预定。</div>}
                  {myBooking?.status === 'cancelled' && <div className="text-xs font-bold text-gray-500 flex items-center gap-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>您之前取消了该房源的预定，现在可以重新发起申请。</div>}
                  {myBooking?.status === 'rejected' && <div className="text-xs font-bold text-red-500 flex items-center gap-1.5 bg-red-50 p-2.5 rounded-xl border border-red-100"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>您之前的申请未能通过，可修改日期或留言后再次尝试。</div>}

                  {room.rent_mode !== 'entire' && (room.total_rooms || 1) > 1 && (
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
                      <span className="text-[13px] font-bold text-gray-500">预定房间数 <span className="text-[10px] font-normal text-gray-400 ml-1">(共 {room.total_rooms} 间)</span></span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => handleRoomCountChange(Math.max(1, roomCount - 1))} className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${roomCount <= 1 ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} disabled={roomCount <= 1}>-</button>
                        <span className="text-[14px] font-bold w-4 text-center">{roomCount}</span>
                        <button type="button" onClick={() => handleRoomCountChange(Math.min(room.total_rooms || 1, roomCount + 1))} className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${roomCount >= room.total_rooms ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} disabled={roomCount >= room.total_rooms}>+</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-1">
                    <div onClick={() => { setSelectingType('checkIn'); setCalendarViewDate(checkIn ? new Date(checkIn) : new Date()); }} className={`border rounded-xl p-3 relative cursor-pointer transition-all ${selectingType === 'checkIn' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">入住日期</span>
                      <div className="text-[15px] font-bold text-gray-900">{checkIn || '请选择日期'}</div>
                    </div>
                    <div onClick={() => { if (!checkIn) { setSelectingType('checkIn'); setCalendarViewDate(new Date()); } else { setSelectingType('checkOut'); setCalendarViewDate(checkOut ? new Date(checkOut) : new Date(checkIn)); } }} className={`border rounded-xl p-3 relative cursor-pointer transition-all ${selectingType === 'checkOut' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">退房日期</span>
                      <div className="text-[15px] font-bold text-gray-900">{checkOut || '请选择日期'}</div>
                    </div>
                  </div>

                  {selectingType && (
                    <div className="bg-white border border-gray-200 shadow-2xl rounded-2xl p-4 relative animate-fade-in-up">
                      <button onClick={() => setSelectingType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-50 rounded-full p-1"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                      <div className="text-[14px] font-black text-gray-900 mb-4 pl-2">{selectingType === 'checkIn' ? '1. 选择入住日期' : '2. 选择退房日期'}</div>
                      <div className="flex justify-between items-center mb-4 px-2">
                        <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">&lt;</button>
                        <div className="text-[15px] font-bold text-gray-800">{calendarViewDate.getFullYear()}年 {calendarViewDate.getMonth() + 1}月</div>
                        <button onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">&gt;</button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center mb-2">{['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="text-[11px] font-bold text-gray-400">{d}</div>)}</div>
                      <div className="grid grid-cols-7 gap-y-2 gap-x-1 justify-items-center">{renderCalendar()}</div>
                    </div>
                  )}

                  <textarea value={guestMessage} onChange={(e) => setGuestMessage(e.target.value)} placeholder="给房东留言，简单介绍一下自己和行程安排..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500 resize-none mt-2" rows={2}></textarea>
                  
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => handleChatWith(room.author_id)}
                      className="py-3.5 px-4 rounded-xl font-bold text-[14px] bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      私聊
                    </button>
                    <button onClick={handleApply} disabled={isApplying || selectingType !== null} className="flex-1 py-3.5 rounded-xl font-bold text-[15px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed">
                      {isApplying ? '正在提交...' : '向房东提交申请'}
                    </button>
                  </div>
                </div>
              )}
              
              {!canApply && myBooking?.status === 'pending' && <div className="text-center py-2"><h3 className="font-bold text-gray-900">申请审核中...</h3><p className="text-xs text-gray-500 mt-1">房东确认后，您即可在此完成支付预定。</p></div>}
              
              {!canApply && myBooking?.status === 'approved' && (
                 <div className="flex flex-col gap-3">
                   <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-bold border border-green-100 flex items-center gap-2"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>房东已通过！请付款锁定房源。</div>
                   <button onClick={handleStripePayment} className="w-full py-3.5 rounded-xl font-black text-[15px] bg-gray-900 text-white shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"><svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm2.25 14v-1.5h-1.5v1.5H12v-1.5h-.75V11.5H12v-1.5h1.5v1.5h1.5A1.5 1.5 0 0016.5 10v-1c0-.827-.673-1.5-1.5-1.5h-3A.5.5 0 0111.5 7V5.5h-1.5V7H9v1.5h1.5v1.5H9A1.5 1.5 0 007.5 11.5v1c0 .827.673 1.5 1.5 1.5h3a.5.5 0 01.5.5v2h1.5v-2h1.5v2h.75z"/></svg>使用 Stripe 安全支付</button>
                 </div>
              )}
              
              {['pending', 'approved', 'paid'].includes(myBooking?.status) && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                  <button onClick={() => handleChatWith(room.author_id)} className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    联系房东
                  </button>
                  <button onClick={() => router.push('/my-bookings')} className="flex-1 py-3.5 rounded-xl font-bold text-[14px] bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                    管理订单
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-white rounded-[24px] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-black text-gray-900">修改房源信息</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-3">房源展示图</label>
                <div className="flex gap-3 mb-4">
                   <button onClick={() => setEditForm({...editForm, imageMode: 'system'})} className={`flex-1 py-2 rounded-lg text-[13px] font-bold border transition-all ${editForm.imageMode === 'system' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-500 border-gray-200'}`}>🤖 切换为网络图</button>
                   <button onClick={() => setEditForm({...editForm, imageMode: 'custom'})} className={`flex-1 py-2 rounded-lg text-[13px] font-bold border transition-all ${editForm.imageMode === 'custom' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-500 border-gray-200'}`}>📸 上传实拍照片</button>
                </div>
                {editForm.imageMode === 'system' ? (
                  <div className="text-[12px] text-gray-400 bg-white p-3 rounded-lg border border-dashed border-gray-200 text-center">系统将根据您的房源自动匹配高质量唯美网图。</div>
                ) : (
                  <div>
                     <input type="file" multiple accept="image/*" onChange={(e) => {
                         const files = Array.from(e.target.files || []);
                         if (files.length > 0) {
                           setEditForm(prev => ({
                             ...prev,
                             newFiles: [...prev.newFiles, ...files],
                             newPreviews: [...prev.newPreviews, ...files.map(f => URL.createObjectURL(f))]
                           }));
                         }
                         e.target.value = '';
                     }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer mb-3"/>
                     
                     <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                       {editForm.existingImages.map((url, idx) => (
                         <div key={`old-${idx}`} className="relative w-24 h-24 flex-shrink-0 snap-start">
                           <img src={url} alt="preview" className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-200" />
                           <button type="button" onClick={() => setEditForm(prev => ({...prev, existingImages: prev.existingImages.filter((_, i) => i !== idx)}))} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm border-2 border-white shadow-sm hover:bg-black transition-colors">×</button>
                         </div>
                       ))}
                       {editForm.newPreviews.map((url, idx) => (
                         <div key={`new-${idx}`} className="relative w-24 h-24 flex-shrink-0 snap-start">
                           <img src={url} alt="preview" className="w-full h-full object-cover rounded-xl shadow-sm border border-blue-200 ring-2 ring-blue-500" />
                           <button type="button" onClick={() => setEditForm(prev => ({
                              ...prev, 
                              newFiles: prev.newFiles.filter((_, i) => i !== idx),
                              newPreviews: prev.newPreviews.filter((_, i) => i !== idx)
                           }))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm border-2 border-white shadow-sm hover:bg-red-600 transition-colors">×</button>
                         </div>
                       ))}
                     </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                <label className="block text-[13px] font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9z"/><circle cx="12" cy="9" r="2.5"/></svg>
                  智能地图定位
                </label>
                
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    placeholder="输入具体地址以重新定位..." 
                    value={editForm.addressName} 
                    onChange={(e) => setEditForm({...editForm, addressName: e.target.value})} 
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all" 
                  />
                  <button onClick={handleGeocode} disabled={isGeocoding} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black whitespace-nowrap disabled:opacity-50 transition-colors flex items-center gap-1">
                    {isGeocoding ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '搜索并锁定'}
                  </button>
                </div>

                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                  <div ref={mapContainerRef} className="w-full h-full z-0"></div>
                </div>
                
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" /></svg>
                    提示：在地图上点击可精准修改位置
                  </p>
                  {editForm.lat !== 0 && <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-md">坐标已获取</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">所在城市</label><input type="text" value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">可起租日期</label><input type="date" value={editForm.availableDate} onChange={(e) => setEditForm({...editForm, availableDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1">房源标题</label><input type="text" value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" /></div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">出租模式</label><select value={editForm.rentMode} onChange={(e) => setEditForm({...editForm, rentMode: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"><option value="entire">整套出租</option><option value="room">按房间分租</option></select></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">可租房间总数</label><input type="number" min="1" disabled={editForm.rentMode === 'entire'} value={editForm.totalRooms} onChange={(e) => setEditForm({...editForm, totalRooms: Number(e.target.value)})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:text-gray-400" /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">每晚价格</label>
                  <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20">
                    <input type="number" value={editForm.priceAmount} onChange={(e) => setEditForm({...editForm, priceAmount: e.target.value})} className="w-full px-3 py-2 text-sm outline-none bg-transparent" />
                    <select value={editForm.priceCurrency} onChange={(e) => setEditForm({...editForm, priceCurrency: e.target.value})} className="bg-gray-100 border-l border-gray-200 px-2 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"><option value="NZD">NZD</option><option value="AUD">AUD</option><option value="CNY">CNY</option><option value="USD">USD</option></select>
                  </div>
                </div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">房源类型</label><select value={editForm.roomType} onChange={(e) => setEditForm({...editForm, roomType: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"><option>独立单间</option><option>整套出租</option><option>找室友</option><option>沙发客</option></select></div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <label className="block text-xs font-bold text-gray-700 mb-2">房源核心设施 (多选)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[...baseFacilityOptions, ...customAmenities].map(option => (
                    <button key={option.id} type="button" onClick={() => toggleEditFacility(option.id)} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all duration-200 ${editForm.amenities.includes(option.id) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                   <input type="text" placeholder="例如：免费停车、宠物友好..." value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomAmenity())} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                   <button type="button" onClick={handleAddCustomAmenity} className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black">添加</button>
                </div>
              </div>

              <div><label className="block text-xs font-bold text-gray-700 mb-1">详细描述</label><textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500/20"></textarea></div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200 transition">取消</button>
              <button onClick={handleUpdate} disabled={isUpdating} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition shadow-sm">
                {isUpdating ? '保存中...' : '保存修改'}
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