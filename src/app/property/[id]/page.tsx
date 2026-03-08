'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import React from 'react';

// --- 🌟 矢量图标库 ---
const Icons = {
  wifi: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>,
  ac: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.296 0 .587-.013.873-.038M3.375 19.5a8.96 8.96 0 01-2.368-7.859M15 6.75h.008v.008H15V6.75zm-3 0h.008v.008H12V6.75zm-3 0h.008v.008H9V6.75zm-3 0h.008v.008H6V6.75z" /></svg>,
  kitchen: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  washer: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>,
  bathroom: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.375a1.875 1.875 0 01-1.875-1.875V8.625zM16.5 4.125c0-1.036.84-1.875 1.875-1.875h.375c1.036 0 1.875.84 1.875 1.875v15.75c0 1.035-.84 1.875-1.875 1.875h-.375a1.875 1.875 0 01-1.875-1.875V4.125z" /></svg>,
  workspace: <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>
};

// --- 🌟 核心状态与类型定义 ---
type Role = 'BUYER' | 'SELLER' | 'LAWYER' | 'SYSTEM';
type StepStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'OVERDUE';

interface OAStep {
  id: string; title: string; description: string; role: Role; status: StepStatus; dueDate?: string; completedAt?: string;
}

interface ServiceProvider {
  id: string; role: 'BROKER' | 'INSPECTOR' | 'LAWYER'; name: string; avatar: string; quote: number | string; pitch: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

// --- ⏱️ 倒计时组件 ---
function CountdownBadge({ dueDate, status }: { dueDate: string; status: StepStatus }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (status === 'COMPLETED') return;
    const timer = setInterval(() => {
      const distance = new Date(dueDate).getTime() - new Date().getTime();
      if (distance < 0) { clearInterval(timer); setIsOverdue(true); setTimeLeft('已逾期'); return; }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${days}天 ${hours}小时 ${mins}分`);
    }, 1000);
    return () => clearInterval(timer);
  }, [dueDate, status]);

  if (status === 'COMPLETED') return null;
  return (
    <div className={`flex items-center gap-1 mt-2 px-2.5 py-1 w-max rounded-md text-[12px] font-bold ${isOverdue ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      {isOverdue ? '逾期' : '剩余: '} {timeLeft}
    </div>
  );
}

// --- 🌟 专业级房产地图组件 ---
const PropertyMap = ({ lat, lng, address }: { lat: number, lng: number, address: string }) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstance = React.useRef<any>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || !lat || !lng) return;
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!isMounted || mapInstance.current) return;
        const map = L.map(mapRef.current!).setView([lat, lng], 19);

        const standardMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 20, attribution: '&copy; OpenStreetMap' });
        const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, attribution: '&copy; Esri' });
        const linzStyleVector = L.tileLayer('https://tiles-a.data-cdn.linz.govt.nz/services;key=db81bf95b3c447608a8bcf4cb35f50ec/tiles/v4/layer=50772/EPSG:3857/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '&copy; LINZ CC BY 4.0' });
        const aucklandFloodLayer = L.tileLayer.wms('https://geomapspublic.aucklandcouncil.govt.nz/arcgis/services/Environment/Hazardous_areas/MapServer/WMSServer', { layers: '0,1,2,3', format: 'image/png32', transparent: true, version: '1.3.0', attribution: '&copy; Auckland Council' });
        const aucklandPipesLayer = L.tileLayer.wms('https://geomapspublic.aucklandcouncil.govt.nz/arcgis/services/Water/Water_Infrastructure/MapServer/WMSServer', { layers: '0,1,2,3,4', format: 'image/png32', transparent: true, version: '1.3.0', attribution: '&copy; Auckland Council' });

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        standardMap.addTo(map);
        linzStyleVector.addTo(map);
        L.marker([lat, lng]).addTo(map).bindPopup(`<div class="font-bold text-[13px] text-gray-900">${address}</div>`).openPopup();

        L.control.layers(
          { "🗺️ 普通街道图 (Standard)": standardMap, "🛰️ 高清卫星图 (Satellite)": esriSatellite }, 
          { "📐 LINZ 产权边界线": linzStyleVector, "🌊 洪水 / 积水区 (Flood)": aucklandFloodLayer, "🚰 地下管网 (雨水/污水)": aucklandPipesLayer }
        ).addTo(map);

        mapInstance.current = map;

        resizeObserver = new ResizeObserver(() => { if (mapInstance.current) mapInstance.current.invalidateSize(); });
        resizeObserver.observe(mapRef.current!);
      } catch (error) { console.error("Leaflet map load error:", error); }
    };

    initMap();

    return () => {
      isMounted = false;
      if (resizeObserver && mapRef.current) { resizeObserver.unobserve(mapRef.current); resizeObserver.disconnect(); }
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [lat, lng, address]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="w-full h-full relative z-10 bg-gray-100" style={{ minHeight: '350px' }}></div>
    </>
  );
};

// ==========================================
// 🗄️ 模拟前端数据库 (Mock Database)
// ==========================================
const mockDatabase: Record<string, any> = {
  'prop_123': {
    id: 'prop_123',
    title: '奥克兰北岸 3房2卫 全海景别墅',
    address_name: '12 Marine Parade, Takapuna, Auckland',
    price: '1,250,000 NZD',
    type: 'NEGOTIATION',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'],
    author_name: 'Alex.W',
    author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    description: '绝佳的北岸海景别墅，走路5分钟可达海滩。处于顶级双校网内（西湖男校、西湖女校）。房东由于工作调动急售，诚意议价。',
    amenities: 'wifi,ac,kitchen,bathroom',
    bedrooms: 3, bathrooms: 2, carparks: 2, land_area: '650 sqm',
    latitude: -36.7885, longitude: 174.7733
  },
  'prop_456': {
    id: 'prop_456',
    title: '全新联排，首套房首选，随时交割',
    address_name: '45 Hobsonville Point Rd, Auckland',
    price: 'Auction (拍卖)',
    type: 'AUCTION',
    images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'],
    author_name: 'Sarah.J',
    author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    description: 'Hobsonville Point 核心区域全新联排，Master Build 10年质保。不走繁琐议价流程，直接公开拍卖，欢迎所有买家竞标！',
    amenities: 'wifi,kitchen,bathroom,washer',
    bedrooms: 2, bathrooms: 1, carparks: 1, land_area: '120 sqm',
    latitude: -36.7950, longitude: 174.6580 // Hobsonville 坐标
  },
  'prop_789': {
    id: 'prop_789',
    title: '中区大地潜力盘，带资源许可(RC)',
    address_name: '88 Remuera Rd, Remuera, Auckland',
    price: '2,800,000 NZD',
    type: 'FIXED_PRICE',
    images: ['https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80'],
    author_name: 'David.M',
    author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    description: 'Remuera 极品大地，已下发可分割3套的 Resource Consent。极其适合开发商或有建房计划的买家。一口价出售，先到先得。',
    amenities: 'wifi,ac,kitchen,bathroom,workspace',
    bedrooms: 4, bathrooms: 3, carparks: 4, land_area: '1012 sqm',
    latitude: -36.8810, longitude: 174.8010 // Remuera 坐标
  }
};


export default function PropertyTradeRoom() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id as string;
  const currentUserRole = 'BUYER'; 
  
  // 🌟 将静态数据替换为状态
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'WORKFLOW' | 'PROVIDERS'>('DETAILS');
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // 🌟 模拟从 Supabase 获取数据 (使用 useEffect)
  useEffect(() => {
    setIsLoading(true);
    // 模拟网络延迟 0.5 秒
    setTimeout(() => {
      if (propertyId && mockDatabase[propertyId]) {
        setProperty(mockDatabase[propertyId]);
      } else {
        setProperty(null); // 如果随便输入了一个不存在的 ID
      }
      setIsLoading(false);
    }, 500);
  }, [propertyId]);

  // OA 数据
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
  const [oaSteps] = useState<OAStep[]>([
    { id: 'step_1', title: '签署 S&P 购房协议', description: '买卖双方已完成线上电子签名。', role: 'SYSTEM', status: 'COMPLETED', completedAt: '2026-03-08T10:00:00Z' },
    { id: 'step_2', title: '买家支付 10% 定金', description: '请将定金打入中介或律师的 Trust Account (信托账户)。', role: 'BUYER', status: 'IN_PROGRESS', dueDate: tomorrow },
    { id: 'step_3', title: '律师审查 Title & LIM 报告', description: '买方律师需确认房屋产权无瑕疵，并审查政府档案。', role: 'LAWYER', status: 'PENDING', dueDate: nextWeek },
    { id: 'step_4', title: '无条件交割日 (Unconditional)', description: '所有购房条件满足，合同正式生效。', role: 'SYSTEM', status: 'PENDING' },
    { id: 'step_5', title: '房屋交割 (Settlement)', description: '尾款结清，律师完成 LINZ 产权转移。', role: 'SYSTEM', status: 'PENDING' }
  ]);

  // 服务商数据
  const [providers] = useState<ServiceProvider[]>([
    { id: 'p1', role: 'LAWYER', name: 'Jessica Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica', quote: '1,500 + GST', pitch: '专精房产交割，代办 LINZ 产权转移及信托账户(Trust Account)托管。', status: 'PENDING' },
    { id: 'p2', role: 'INSPECTOR', name: 'John Doe', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', quote: 600, pitch: '拥有15年奥克兰北岸持牌屋检经验，提供加急报告。', status: 'PENDING' },
    { id: 'p3', role: 'BROKER', name: 'Sarah Smith', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', quote: '免费', pitch: '熟悉四大行最新利率，可申请高额返现。', status: 'ACCEPTED' },
  ]);

  // 渲染 Loading 状态
  if (isLoading) {
    return (
      <div className="flex-1 max-w-[640px] w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // 渲染 404 状态
  if (!property) {
    return (
      <div className="flex-1 max-w-[640px] w-full min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">房源不存在</h2>
        <p className="text-gray-500 mb-6">您查找的房源可能已下架或链接错误。</p>
        <button onClick={() => router.push('/')} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-full">返回大厅</button>
      </div>
    );
  }

  const validAmenities = property.amenities ? property.amenities.split(',').map((s:string) => s.trim()).filter(Boolean) : [];

  // --- 🎨 UI 组件：房源图文详情 ---
  const renderDetailsTab = () => {
    return (
      <div className="animate-in fade-in duration-300">
        <div className="w-full h-[260px] relative group bg-gray-100 rounded-2xl overflow-hidden mb-6">
          <div id="property-image-slider" className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" onScroll={(e) => { const scrollLeft = e.currentTarget.scrollLeft; const width = e.currentTarget.clientWidth; setCurrentImgIndex(Math.round(scrollLeft / width)); }}>
            {property.images.map((imgUrl: string, idx: number) => (
              <img key={idx} src={imgUrl} className="w-full h-full object-cover flex-shrink-0 snap-center" alt={`cover-${idx}`} />
            ))}
          </div>
          {property.images.length > 1 && (
            <>
              <button onClick={() => { const slider = document.getElementById('property-image-slider'); if(slider) slider.scrollBy({ left: -slider.clientWidth, behavior: 'smooth' }); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
              <button onClick={() => { const slider = document.getElementById('property-image-slider'); if(slider) slider.scrollBy({ left: slider.clientWidth, behavior: 'smooth' }); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                 {property.images.map((_:any, i:number) => ( <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentImgIndex ? 'bg-white scale-125' : 'bg-white/50'}`} /> ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src={property.author_avatar} className="w-11 h-11 rounded-full bg-gray-100 object-cover shadow-sm" alt="host" />
            <div>
              <div className="text-[15px] font-bold text-gray-900">屋主: {property.author_name}</div>
              <div className="text-[12px] text-green-600 font-bold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                产权证已核验
              </div>
            </div>
          </div>
          <button onClick={() => alert('跳转私聊')} className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 hover:scale-105 transition-all shadow-sm">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
          </button>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2 border border-gray-100/50">
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/bed.png" className="w-4 h-4 opacity-50"/> 卧室</span><span className="text-[14px] font-bold text-gray-800">{property.bedrooms} 间</span></div>
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/bath.png" className="w-4 h-4 opacity-50"/> 卫浴</span><span className="text-[14px] font-bold text-gray-800">{property.bathrooms} 间</span></div>
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/car.png" className="w-4 h-4 opacity-50"/> 车位</span><span className="text-[14px] font-bold text-gray-800">{property.carparks} 个</span></div>
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><svg className="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h14v-8h3L12 2zm0 2.83l5 5V18H7v-8.17l5-5z"/></svg> 占地</span><span className="text-[14px] font-bold text-gray-800">{property.land_area}</span></div>
        </div>

        <div className="mb-8">
          <h3 className="text-[16px] font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-orange-500 rounded-full"></span>房源介绍</h3>
          <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{property.description}</p>
        </div>

        {validAmenities.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[16px] font-bold text-gray-900 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-orange-500 rounded-full"></span>配套设施</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2">
              {validAmenities.map((item: string) => {
                const IconComponent = Icons[item as keyof typeof Icons] || (<svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
                const label = item === 'wifi' ? '高速网络' : item === 'ac' ? '冷暖空调' : item === 'kitchen' ? '全套厨房' : item === 'washer' ? '洗衣机' : item === 'bathroom' ? '独立卫浴' : item === 'workspace' ? '专属工作区' : item;
                return ( <div key={item} className="flex items-center gap-2 text-gray-700"><div className="text-gray-400">{IconComponent}</div><span className="text-[13px] font-medium">{label}</span></div> );
              })}
            </div>
          </div>
        )}

        {(property.address_name || property.latitude) && (
          <div className="mb-4">
            <h3 className="text-[16px] font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-orange-500 rounded-full"></span>位置地图</h3>
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-white flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0"><div className="text-[14px] font-bold text-gray-900 truncate">{property.address_name}</div></div>
                <button onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${property.latitude}&mlon=${property.longitude}#map=16/${property.latitude}/${property.longitude}`)} className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 hover:bg-orange-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                </button>
              </div>
              <div className="h-[350px] bg-gray-100 relative w-full overflow-hidden border-t border-gray-100 rounded-b-2xl">
                {property.latitude && property.longitude ? (
                  <PropertyMap lat={property.latitude} lng={property.longitude} address={property.address_name} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-sm"><span className="text-gray-500 text-[13px] font-bold px-4 py-2 bg-white/80 rounded-full shadow-sm">未提供精准坐标</span></div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWorkflowTimeline = () => {
    const getRoleBadge = (role: Role) => {
      switch(role) {
        case 'BUYER': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black">买家任务</span>;
        case 'SELLER': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black">卖家任务</span>;
        case 'LAWYER': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black">律师跟进</span>;
        case 'SYSTEM': return <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-black">系统节点</span>;
      }
    };

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
        <h3 className="text-lg font-black text-gray-900 mb-6">交易流追踪 (OA)</h3>
        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
          {oaSteps.map((step) => (
            <div key={step.id} className="relative pl-6">
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${step.status === 'COMPLETED' ? 'border-green-500 bg-green-500' : step.status === 'IN_PROGRESS' ? 'border-orange-500 ring-4 ring-orange-100' : 'border-gray-300'}`}>
                {step.status === 'COMPLETED' && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <div className={`bg-white rounded-[16px] p-4 border transition-all ${step.status === 'IN_PROGRESS' ? 'border-orange-200 shadow-md ring-1 ring-orange-50' : 'border-gray-100 shadow-sm opacity-90'}`}>
                <div className="flex flex-col gap-1.5 mb-2">
                  {getRoleBadge(step.role)}
                  <h3 className={`text-[15px] font-black ${step.status === 'PENDING' ? 'text-gray-500' : 'text-gray-900'}`}>{step.title}</h3>
                </div>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-3">{step.description}</p>
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-50">
                  {step.status === 'COMPLETED' ? (
                    <span className="text-[12px] font-bold text-green-600 flex items-center gap-1">完成于 {new Date(step.completedAt!).toLocaleDateString()}</span>
                  ) : step.dueDate ? (
                    <CountdownBadge dueDate={step.dueDate} status={step.status} />
                  ) : (
                    <span className="text-[12px] font-medium text-gray-400">等待前置任务完成</span>
                  )}
                  {step.status === 'IN_PROGRESS' && step.role === 'BUYER' && (
                    <button onClick={() => step.title.includes('律师') ? setActiveTab('PROVIDERS') : alert('去处理')} className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold hover:bg-orange-600 transition-colors">
                      {step.title.includes('律师') ? '去大厅选律师 →' : '去处理 →'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProvidersRoom = () => {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-gray-900">服务商入驻大厅</h3>
          <button className="px-4 py-1.5 bg-orange-500 text-white text-sm font-bold rounded-full shadow-md">我是服务商，提交报价</button>
        </div>
        <div className="space-y-4">
          {providers.map(provider => (
            <div key={provider.id} className={`p-4 border rounded-xl transition-colors bg-white shadow-sm ${provider.role === 'LAWYER' ? 'border-emerald-200' : 'border-gray-100'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <img src={provider.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-gray-100 shadow-sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-[15px]">{provider.name}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${provider.role === 'LAWYER' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-900 text-white'}`}>
                        {provider.role === 'LAWYER' ? '过户律师' : provider.role === 'INSPECTOR' ? '屋检师' : '贷款Broker'}
                      </span>
                    </div>
                    <div className="text-[12px] text-gray-500 mt-0.5 font-medium">报价: <span className="text-orange-500 font-bold">{provider.quote === '免费' ? provider.quote : `$${provider.quote}`}</span></div>
                  </div>
                </div>
                {provider.status === 'ACCEPTED' ? (
                  <span className="text-[12px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">已就绪参与 OA</span>
                ) : (
                  currentUserRole === 'BUYER' && <button className="text-[12px] font-bold text-orange-500 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors border border-orange-100">邀请进入 OA</button>
                )}
              </div>
              <p className="text-[13px] text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100/80 leading-relaxed">“{provider.pitch}”</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-white md:bg-gray-50 flex flex-col relative pb-20">
      
      {/* 顶部标题栏 */}
      <div className="bg-white pt-6 pb-4 px-5 border-b border-gray-100 sticky top-0 z-30">
        <button onClick={() => router.back()} className="mb-4 w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col justify-center">
            <h1 className="text-[20px] font-black text-gray-900 leading-tight mb-1 line-clamp-2">{property.title}</h1>
            <p className="text-[16px] font-black text-orange-500 mt-1">{property.price}</p>
          </div>
          <button className="shrink-0 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-red-500 transition-colors">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
          </button>
        </div>
      </div>

      {/* 选项卡导航 */}
      <div className="flex bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-[130px] z-20">
        {[
          { id: 'DETAILS', label: '房源详情' },
          { id: 'WORKFLOW', label: '交易流 (OA)' },
          { id: 'PROVIDERS', label: '服务商大厅' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3.5 text-[14px] font-bold transition-colors relative ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-orange-500 rounded-t-full"></div>}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="p-4 md:p-5 flex-1 bg-white md:bg-transparent">
        {activeTab === 'DETAILS' && renderDetailsTab()}
        {activeTab === 'WORKFLOW' && renderWorkflowTimeline()}
        {activeTab === 'PROVIDERS' && renderProvidersRoom()}
      </div>
      
      {/* 底部悬浮行动条 */}
      <div className="fixed bottom-0 left-0 md:left-auto md:w-[640px] w-full p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
        {activeTab === 'DETAILS' && (
          <button onClick={() => setActiveTab('WORKFLOW')} className="w-full py-3.5 rounded-xl font-bold text-[15px] bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors flex justify-center items-center gap-2">
            发起意向 / 起草合同
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </button>
        )}
        {(activeTab === 'WORKFLOW' || activeTab === 'PROVIDERS') && (
          <button className="w-full py-3.5 rounded-xl font-bold text-[15px] bg-gray-900 text-white shadow-lg shadow-gray-900/30 hover:bg-black transition-colors flex justify-center items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            在交易室群内联系各方
          </button>
        )}
      </div>

    </main>
  );
}