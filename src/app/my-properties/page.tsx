// src/app/my-properties/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

function formatDate(date: Date) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const getDisplayImages = (property: any) => {
  if (property?.cover_image) {
    const urls = property.cover_image.split(',').map((s:string) => s.trim()).filter((u:string) => u.startsWith('http'));
    if (urls.length > 0) return urls;
  }
  const fallbackId = property?.id || 'default';
  // 替换为更符合新西兰本地大房子的网图
  const propertyImages = [
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80", // 现代独栋
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80", // 奢华大宅
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80", // 带泳池
    "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=600&q=80"  // 经典洋房
  ];
  const idx1 = fallbackId.charCodeAt(0) % propertyImages.length;
  const idx2 = (idx1 + 1) % propertyImages.length;
  const idx3 = (idx1 + 2) % propertyImages.length;
  return [propertyImages[idx1], propertyImages[idx2], propertyImages[idx3]];
};

// 🌟 企业级高级质感文案引擎 (售房版)
const buildAwesomePropertyContent = (
  title: string, city: string, addressName: string, propertyType: string, 
  saleMethod: string, priceAmount: string, 
  bedrooms: number, bathrooms: number, carParks: number,
  floorArea: string, landArea: string,
  features: string[], description: string
) => {
  const addrText = addressName ? `${city} | ${addressName}` : city;
  const priceDisplay = saleMethod === '一口价' ? `一口价 ${priceAmount}` 
                     : saleMethod === '议价' ? '面议 (By Negotiation)'
                     : saleMethod === '拍卖' ? '拍卖预告 (Auction)'
                     : `询价起点 (Enquiries Over) ${priceAmount}`;

  const specText = `${bedrooms}卧 · ${bathrooms}卫 · ${carParks}车位`;
  const areaText = `室内 ${floorArea || '--'}m² | 占地 ${landArea || '--'}m²`;
  
  const descText = description ? `\n\n❝ ${description.slice(0, 80)}${description.length > 80 ? '...' : ''} ❞` : '';

  return ` 独家直售房源  ${title}

 📍 核心地段：${addrText}
 🏠 房源户型：${propertyType} (${specText})
 📐 空间面积：${areaText}
 💰 交易方式：${priceDisplay}
 ✨ 亮点配置：${features.slice(0, 5).join(' · ') || '极佳状态，诚意出售'}${descText}

房东直售免中介费！查看下方专属卡片了解更多实拍细节与 Open Home 时间，欢迎直接联系咨询。`;
};

// 复用您的轮播图组件 (名字微调)
function PropertyCardSlider({ images, viewMode, city, className }: { images: string[], viewMode: string, city: string, className?: string }) {
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-40 gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900">卖家中心 (出售)</h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">免中介费直售您的房产</p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 租房按钮 (跳转回租房页) */}
          <button 
            onClick={() => router.push('/my-rooms')} 
            className="flex-1 sm:flex-none bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 font-bold py-2 px-4 rounded-full shadow-sm flex items-center justify-center gap-1.5 text-[13px] transition-colors"
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
            去招租
          </button>

          {/* 卖房按钮 (当前页的主按钮，黑色强调，点击打开弹窗) */}
          <button 
            onClick={() => setIsPublishModalOpen(true)} 
            className="flex-1 sm:flex-none bg-gray-900 hover:bg-black text-white font-bold py-2 px-4 rounded-full shadow-sm flex items-center justify-center gap-1.5 text-[13px] transition-colors"
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            发布售房
          </button>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md text-white text-[11px] px-2 py-1 rounded-full z-10 pointer-events-none max-w-[80%] truncate">{city}</div>
      )}
      {viewMode === 'list' && (
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-gray-900 font-bold text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm z-10 pointer-events-none max-w-[80%] truncate">
          <span className="truncate">{city}</span>
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

export default function MyPropertiesPage() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'properties' | 'enquiries'>('properties');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [properties, setProperties] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [customFeatures, setCustomFeatures] = useState<{id: string, label: string}[]>([]);
  const [newFeature, setNewFeature] = useState('');

  // 🌟 为新西兰卖房定制的表单数据结构
  const [formData, setFormData] = useState({
    city: '', title: '', addressName: '', lat: 0, lng: 0,
    propertyType: '独立别墅 (House)', 
    bedrooms: 3, bathrooms: 1, carParks: 1,
    floorArea: '', landArea: '',
    saleMethod: '一口价', priceAmount: '', priceCurrency: 'NZD', 
    features: [] as string[], description: '', 
    imageMode: 'system' as 'system' | 'custom',
    coverImageFiles: [] as File[],        
    coverImagePreviews: [] as string[]    
  });

  // 新西兰特色房产亮点
  const baseFeatureOptions = [
    { id: 'double_glazing', label: '双层玻璃' }, { id: 'heat_pump', label: '热泵空调' },
    { id: 'fully_fenced', label: '全围栏院子' }, { id: 'internal_garage', label: '内进式车库' },
    { id: 'ensuite', label: '主人套房' }, { id: 'new_renovation', label: '近期翻新' },
    { id: 'freehold', label: '永久产权 (Freehold)' }
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // 假设我们有一个 octo_properties 表和 octo_property_enquiries 表
      const { data: propertiesData } = await supabase.from('octo_properties').select('*').eq('author_id', user.id).order('created_at', { ascending: false });
      setProperties(propertiesData || []);

      const { data: enquiriesData } = await supabase.from('octo_property_enquiries').select('*, octo_properties(id, title, city_name, address_name, price_display, cover_image)').eq('host_id', user.id).order('created_at', { ascending: false });
      setEnquiries(enquiriesData || []);

      const savedFeatures = localStorage.getItem('octo_custom_features');
      if (savedFeatures) setCustomFeatures(JSON.parse(savedFeatures));
    } catch (error) { 
      // 开发阶段如果表还没建，给一些假数据展示效果
      console.warn("未连接到真实表，使用演示数据", error); 
    } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // 地图初始化逻辑保持与原版一致
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

        const initialLat = formData.lat || -36.8485; // 奥克兰默认坐标
        const initialLng = formData.lng || 174.7633;
        
        const map = L.map(mapContainerRef.current!).setView([initialLat, initialLng], formData.lat ? 15 : 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

        if (formData.lat && formData.lng) markerRef.current = L.marker([formData.lat, formData.lng]).addTo(map);

        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setFormData(prev => ({ ...prev, lat, lng }));
          if (!markerRef.current) markerRef.current = L.marker([lat, lng]).addTo(map);
          else markerRef.current.setLatLng([lat, lng]);
        });

        mapInstanceRef.current = map;
      })();
    }
    return () => {
      if (!isPublishModalOpen && mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; markerRef.current = null; }
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
        const lat = parseFloat(data[0].lat); const lng = parseFloat(data[0].lon);
        setFormData(prev => ({ ...prev, lat, lng })); 
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.5 });
          if (!markerRef.current) {
            const L = (await import('leaflet')).default;
            markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
          } else markerRef.current.setLatLng([lat, lng]);
        }
      } else alert("找不到坐标，请尝试输入更详细的地址。");
    } catch (error) { alert("网络错误"); } finally { setIsGeocoding(false); }
  };

  const toggleFeature = (id: string) => {
    setFormData(prev => ({ ...prev, features: prev.features.includes(id) ? prev.features.filter(f => f !== id) : [...prev.features, id] }));
  };

  const handleAddCustomFeature = () => {
    if (!newFeature.trim()) return;
    const newId = newFeature.trim();
    if (!customFeatures.find(a => a.id === newId) && !baseFeatureOptions.find(a => a.id === newId)) {
      const newList = [...customFeatures, { id: newId, label: newId }];
      setCustomFeatures(newList);
      localStorage.setItem('octo_custom_features', JSON.stringify(newList));
    }
    if (!formData.features.includes(newId)) toggleFeature(newId);
    setNewFeature('');
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
    if (!formData.title.trim() || !formData.city.trim()) { alert("请填写城市和标题！"); return; }
    if (formData.saleMethod !== '议价' && formData.saleMethod !== '拍卖' && !formData.priceAmount.trim()) { alert("一口价或询价模式下请填写预估金额！"); return; }
    
    setIsPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(); 

      let finalImageUrls: string[] = [];
      if (formData.imageMode === 'custom' && formData.coverImageFiles.length > 0) {
        const uploadPromises = formData.coverImageFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `prop_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('properties').upload(fileName, file);
          if (uploadError) throw new Error('图片上传失败: ' + uploadError.message);
          const { data: urlData } = supabase.storage.from('properties').getPublicUrl(fileName);
          return urlData.publicUrl;
        });
        finalImageUrls = await Promise.all(uploadPromises);
      }

      // 组装最终展示的价格文本
      let finalPriceDisplay = formData.saleMethod;
      if (formData.saleMethod === '一口价' || formData.saleMethod === '询价起点') {
        finalPriceDisplay = `${formData.saleMethod} $${Number(formData.priceAmount).toLocaleString()} ${formData.priceCurrency}`;
      }

      const coverImageString = finalImageUrls.length > 0 ? finalImageUrls.join(',') : null;

      // 插入售房数据结构
      const { data: newProperty, error: insertError } = await supabase.from('octo_properties').insert([{
        author_id: user.id, author_name: userProfile?.username || user.email?.split('@')[0] || '直售房东', author_avatar: userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        title: formData.title, city_name: formData.city, address_name: formData.addressName,
        latitude: formData.lat || null, longitude: formData.lng || null,
        property_type: formData.propertyType, 
        bedrooms: formData.bedrooms, bathrooms: formData.bathrooms, car_parks: formData.carParks,
        floor_area: formData.floorArea, land_area: formData.landArea,
        sale_method: formData.saleMethod, price_display: finalPriceDisplay, raw_price: formData.priceAmount,
        features: formData.features.join(','), description: formData.description,
        cover_image: coverImageString, status: 'active'
      }]).select().single();

      if (insertError) throw insertError;

      const postImage = finalImageUrls.length > 0 ? finalImageUrls[0] : `https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=80&random=${newProperty?.id}`;
      
      const featureLabels = formData.features.map(f => baseFeatureOptions.find(b => b.id === f)?.label || f);
      const postContent = buildAwesomePropertyContent(formData.title, formData.city, formData.addressName, formData.propertyType, formData.saleMethod, formData.priceAmount, formData.bedrooms, formData.bathrooms, formData.carParks, formData.floorArea, formData.landArea, featureLabels, formData.description);

      await supabase.from('posts').insert([{
        author_id: user.id, octo_property_id: newProperty.id, 
        content: postContent,
        image_urls: [postImage],
      }]);

      setIsPublishModalOpen(false); 
      // 重置表单
      setFormData({ city: '', title: '', addressName: '', lat: 0, lng: 0, propertyType: '独立别墅 (House)', bedrooms: 3, bathrooms: 1, carParks: 1, floorArea: '', landArea: '', saleMethod: '一口价', priceAmount: '', priceCurrency: 'NZD', features: [], description: '', imageMode: 'system', coverImageFiles: [], coverImagePreviews: [] });
      fetchData();                 
    } catch (error: any) { alert("发布失败: " + error.message); } finally { setIsPublishing(false); }
  };

  const handleSendReply = async (enquiryId: string) => {
    const text = replyTexts[enquiryId];
    if (!text?.trim()) return;

    const enquiry = enquiries.find(e => e.id === enquiryId);
    const newMsg = { role: 'host', text: text.trim(), created_at: new Date().toISOString() };
    const updatedHistory = [...(enquiry.chat_history || []), newMsg];

    setEnquiries(prev => prev.map(e => e.id === enquiryId ? { ...e, chat_history: updatedHistory } : e));
    setReplyTexts(prev => ({ ...prev, [enquiryId]: '' }));

    try {
      const { error } = await supabase.from('octo_property_enquiries').update({ chat_history: updatedHistory }).eq('id', enquiryId);
      if (error) throw error;
    } catch (err: any) { alert("发送失败: " + err.message); }
  };

  // 售房数据监控看板 (替代原本的日历)
  const renderPropertyStats = (property: any) => {
    // 模拟数据展示
    const views = Math.floor(Math.random() * 500) + 50;
    const saves = Math.floor(views * 0.1);
    
    return (
      <div className="flex flex-col justify-center h-full w-full py-1">
        <div className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1.5 border-b border-gray-100 pb-2">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
          房源活跃数据
        </div>
        <div className="flex justify-between items-center mb-2">
           <span className="text-xs text-gray-600 font-medium">累计浏览</span>
           <span className="text-sm font-black text-gray-900">{views}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
           <span className="text-xs text-gray-600 font-medium">被收藏(Watchlist)</span>
           <span className="text-sm font-black text-blue-600">{saves}</span>
        </div>
        <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-100">
           <span className="text-[10px] text-gray-400">上架状态</span>
           <span className="text-[10px] bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded">挂牌中 (Active)</span>
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-gray-50 flex flex-col relative pb-10">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        <h1 className="text-xl font-black text-gray-900">售房卖家中心</h1>
        <button onClick={() => setIsPublishModalOpen(true)} className="bg-gray-900 hover:bg-black text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-1.5 text-[14px] transition-colors">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>发布新挂牌
        </button>
      </div>

      <div className="flex w-full bg-white border-b border-gray-100 sticky top-[69px] z-30">
        <button onClick={() => setActiveTab('properties')} className={`flex-1 py-3 text-[14px] relative transition-colors ${activeTab === 'properties' ? 'font-bold text-gray-900' : 'font-medium text-gray-400'}`}>我发布的房产</button>
        <button onClick={() => setActiveTab('enquiries')} className={`flex-1 py-3 text-[14px] relative transition-colors ${activeTab === 'enquiries' ? 'font-bold text-gray-900' : 'font-medium text-gray-400'}`}>收到的买家咨询</button>
        <div className="absolute bottom-0 h-[3px] bg-gray-900 rounded-full transition-all duration-300 w-16" style={{ left: activeTab === 'properties' ? '25%' : '75%', transform: 'translateX(-50%)' }}></div>
      </div>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
        ) : activeTab === 'properties' ? (
          properties.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" /></svg></div>
                <div className="text-gray-500 font-medium">您还没有发布任何出售房源<br/>点击右上角开始卖房，免去高昂中介费！</div>
             </div>
          ) : (
            <>
              <div className="flex justify-end mb-4 px-1">
                <div className="flex bg-gray-200/50 p-1 rounded-lg">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"/></svg></button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/></svg></button>
                </div>
              </div>

              <div className={viewMode === 'grid' ? "columns-2 gap-3 space-y-3" : "flex flex-col gap-4"}>
                {properties.map((prop) => (
                  <div key={prop.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all ${viewMode === 'list' ? 'flex flex-col sm:flex-row p-3 gap-4 items-stretch' : 'flex flex-col'}`}>
                    <div onClick={() => router.push(`/properties/${prop.id}`)} className={`cursor-pointer flex flex-col ${viewMode === 'list' ? "w-full sm:w-56 flex-shrink-0" : "w-full"}`}>
                      <PropertyCardSlider images={getDisplayImages(prop)} viewMode={viewMode} city={prop.address_name || prop.city_name} className={viewMode === 'list' ? "w-full h-48 sm:h-36 rounded-xl" : "w-full aspect-[4/3] rounded-t-[12px]"} />
                      <div className={viewMode === 'list' ? "py-2" : "px-4 pt-3 pb-2"}>
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{prop.property_type || '独立别墅'}</span>
                           <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> {prop.bedrooms} | {prop.bathrooms} | {prop.car_parks}</span>
                        </div>
                        <h2 className="text-[15px] font-black text-gray-900 line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">{prop.title}</h2>
                        <div className="text-[14px] font-black text-blue-600">{prop.price_display}</div>
                      </div>
                    </div>

                    <div className={`flex-1 flex flex-col justify-center ${viewMode === 'list' ? "w-full min-w-0" : "px-4 pb-4"}`}>
                        <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 h-full min-h-[120px]">
                          {renderPropertyStats(prop)}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          enquiries.length === 0 ? <div className="text-center py-20 text-gray-400">目前还没有收到任何买家咨询</div> : (
            <div className="space-y-6">
              {enquiries.map(enq => (
                <div key={enq.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm relative">
                  
                  <div className="flex gap-4 border-b border-gray-100 pb-4 mb-4 mt-1">
                    <img src={getDisplayImages(enq.octo_properties)[0]} className="w-[84px] h-[84px] rounded-xl object-cover shadow-sm flex-shrink-0 bg-gray-100" alt="property" />
                    <div className="flex flex-col justify-center w-full pr-4">
                      <div className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg><span className="truncate">{enq.octo_properties?.address_name || enq.octo_properties?.city_name}</span></div>
                      <div className="font-black text-[15px] text-gray-900 line-clamp-1 mb-1">{enq.octo_properties?.title}</div>
                      <div className="text-[13px] text-blue-600 font-bold">{enq.octo_properties?.price_display}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between mb-2">
                    <div onClick={() => router.push(`/user/${enq.buyer_id}`)} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-xl transition-colors group w-fit">
                      <img src={enq.buyer_avatar} className="w-10 h-10 rounded-full object-cover bg-gray-100 group-hover:shadow-md transition-shadow" alt="buyer"/>
                      <div>
                        <div className="font-bold text-[14px] text-gray-900 group-hover:text-blue-600 transition-colors">{enq.buyer_name} <span className="text-[10px] text-gray-400 font-normal ml-1">有意向购买</span></div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5">{enq.buyer_phone ? `联系电话: ${enq.buyer_phone}` : '尚未留存电话'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/50 rounded-2xl border border-gray-100 mt-2 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 font-bold text-[13px] text-gray-700 flex items-center gap-2 bg-white/50">
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>
                      在线沟通记录
                    </div>
                    
                    <div className="p-4 flex flex-col gap-4 max-h-[260px] overflow-y-auto">
                      {enq.initial_message && (
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] font-bold text-gray-400 mb-1">买家初次留言</span>
                          <div className="bg-white border border-gray-200 text-gray-800 text-[13px] py-2 px-3.5 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed shadow-sm">
                            {enq.initial_message}
                          </div>
                        </div>
                      )}
                      
                      {enq.chat_history?.map((msg: any, idx: number) => {
                        const isMe = msg.role === 'host'; 
                        return (
                          <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] font-bold text-gray-400 mb-1">
                              {isMe ? '我的回复' : '买家回复'} · {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <div className={`${isMe ? 'bg-gray-900 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'} text-[13px] py-2 px-3.5 rounded-2xl max-w-[85%] leading-relaxed shadow-sm`}>
                              {msg.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                      <input 
                        value={replyTexts[enq.id] || ''} 
                        onChange={(e) => setReplyTexts(prev => ({...prev, [enq.id]: e.target.value}))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendReply(enq.id)}
                        placeholder="回复买家 (例如发送LIM Report或者安排看房)..." 
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-[13px] outline-none focus:ring-2 focus:ring-gray-900/20 transition-all" 
                      />
                      <button onClick={() => handleSendReply(enq.id)} disabled={!replyTexts[enq.id]?.trim()} className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-black transition-colors shadow-sm disabled:opacity-50 flex-shrink-0">
                        <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 translate-x-[1px] translate-y-[1px]"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                      </button>
                    </div>
                  </div>
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
              <h2 className="text-xl font-black text-gray-900">直售房源登记</h2>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-3">房源展示图 (强烈建议上传高分辨率实拍图)</label>
                <div className="flex gap-3 mb-4">
                   <button onClick={() => setFormData({...formData, imageMode: 'system'})} className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold border transition-all flex items-center justify-center gap-2 ${formData.imageMode === 'system' ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>智能网络配图</button>
                   <button onClick={() => setFormData({...formData, imageMode: 'custom'})} className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold border transition-all flex items-center justify-center gap-2 ${formData.imageMode === 'custom' ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>上传实拍照片</button>
                </div>
                {formData.imageMode === 'system' ? (
                  <div className="text-[12px] text-gray-400 bg-white p-3 rounded-lg border border-dashed border-gray-200 text-center">系统将根据您选择的房源类型自动匹配展示用大图。</div>
                ) : (
                  <div>
                     <div className="relative border-2 border-dashed border-gray-300 bg-white rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer group mb-4">
                       <input type="file" multiple accept="image/*" onChange={handleImageSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                       <div className="pointer-events-none flex flex-col items-center gap-2 text-gray-600">
                         <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                         <span className="text-sm font-bold">点击此处添加外观与室内照片</span>
                       </div>
                     </div>
                     {formData.coverImagePreviews.length > 0 && (
                       <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                         {formData.coverImagePreviews.map((url, idx) => (
                           <div key={idx} className="relative w-24 h-24 flex-shrink-0 snap-start group">
                             <img src={url} alt="preview" className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-200" />
                             <button type="button" onClick={() => removeNewImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm border-2 border-white shadow-sm hover:bg-red-600 transition-colors z-20">×</button>
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <label className="block text-[13px] font-bold text-gray-900 mb-2 flex items-center gap-1.5"><svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9z"/><circle cx="12" cy="9" r="2.5"/></svg>位置地图定位</label>
                <div className="flex gap-2 mb-3">
                  <input type="text" placeholder="输入门牌号及街道名..." value={formData.addressName} onChange={(e) => setFormData({...formData, addressName: e.target.value})} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20" />
                  <button onClick={handleGeocode} disabled={isGeocoding} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black whitespace-nowrap disabled:opacity-50">
                    {isGeocoding ? '搜索中...' : '搜索'}
                  </button>
                </div>
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                  <div ref={mapContainerRef} className="w-full h-full z-0"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">所在城市/大区</label><input type="text" placeholder="例如：Auckland" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">房产类型</label><select value={formData.propertyType} onChange={(e) => setFormData({...formData, propertyType: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-gray-900/20"><option>独立别墅 (House)</option><option>联排别墅 (Townhouse)</option><option>公寓 (Apartment)</option><option>分割地块 (Section)</option><option>庄园 (Lifestyle)</option></select></div>
              </div>

              <div><label className="block text-xs font-bold text-gray-700 mb-1">吸引人的房源大标题 (Headline)</label><input type="text" placeholder="例如：Vendor Relocating - Must Be Sold!" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20" /></div>

              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div><label className="block text-xs font-bold text-gray-500 mb-1">卧室 (Bed)</label><input type="number" min="0" value={formData.bedrooms} onChange={(e) => setFormData({...formData, bedrooms: Number(e.target.value)})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none text-center" /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">卫浴 (Bath)</label><input type="number" min="0" value={formData.bathrooms} onChange={(e) => setFormData({...formData, bathrooms: Number(e.target.value)})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none text-center" /></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">车位 (Car)</label><input type="number" min="0" value={formData.carParks} onChange={(e) => setFormData({...formData, carParks: Number(e.target.value)})} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none text-center" /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">室内面积 (Floor Area)</label><div className="flex items-center"><input type="number" placeholder="例如：180" value={formData.floorArea} onChange={(e) => setFormData({...formData, floorArea: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-l-lg px-3 py-2 text-sm outline-none focus:ring-2" /><span className="bg-gray-100 border-y border-r border-gray-200 px-3 py-2 text-sm text-gray-500 rounded-r-lg">m²</span></div></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">占地面积 (Land Area)</label><div className="flex items-center"><input type="number" placeholder="例如：600" value={formData.landArea} onChange={(e) => setFormData({...formData, landArea: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-l-lg px-3 py-2 text-sm outline-none focus:ring-2" /><span className="bg-gray-100 border-y border-r border-gray-200 px-3 py-2 text-sm text-gray-500 rounded-r-lg">m²</span></div></div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">出售方式 (Sale Method)</label>
                  <select value={formData.saleMethod} onChange={(e) => setFormData({...formData, saleMethod: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm font-medium focus:ring-2 focus:ring-gray-900/20 outline-none">
                    <option value="一口价">一口价 (Asking Price)</option>
                    <option value="询价起点">询价起点 (Enquiries Over)</option>
                    <option value="拍卖">拍卖预告 (Auction)</option>
                    <option value="议价">面议 (By Negotiation)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">预期金额 (仅对一口价/起价有效)</label>
                  <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900/20">
                    <input type="number" disabled={formData.saleMethod === '拍卖' || formData.saleMethod === '议价'} placeholder="e.g. 1000000" value={formData.priceAmount} onChange={(e) => setFormData({...formData, priceAmount: e.target.value})} className="w-full px-3 py-2 text-sm outline-none bg-transparent disabled:bg-gray-100" />
                    <select value={formData.priceCurrency} onChange={(e) => setFormData({...formData, priceCurrency: e.target.value})} className="bg-gray-100 border-l border-gray-300 px-2 py-2 text-xs font-bold text-gray-700 outline-none"><option value="NZD">NZD</option></select>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <label className="block text-xs font-bold text-gray-700 mb-2">房屋亮点与设施 (Features)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[...baseFeatureOptions, ...customFeatures].map(option => (
                    <button key={option.id} type="button" onClick={() => toggleFeature(option.id)} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all duration-200 ${formData.features.includes(option.id) ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                   <input type="text" placeholder="输入自定义亮点例如: 近超市..." value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomFeature())} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1" />
                   <button type="button" onClick={handleAddCustomFeature} className="px-3 py-1.5 bg-gray-200 text-gray-800 text-xs font-bold rounded-lg hover:bg-gray-300">添加</button>
                </div>
              </div>

              <div><label className="block text-xs font-bold text-gray-700 mb-1">详尽的房源描述</label><textarea rows={5} placeholder="详细描述房屋的历史、CV估值、学区情况及 Open home 安排..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-gray-900/20"></textarea></div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsPublishModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200 transition">取消</button>
              <button onClick={handlePublish} disabled={isPublishing} className="px-6 py-2 text-sm font-bold text-white bg-gray-900 rounded-full hover:bg-black transition shadow-sm">
                {isPublishing ? '提交中...' : '确认挂牌发布'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `.leaflet-container { z-index: 10 !important; font-family: inherit; }`}} />
    </main>
  );
}