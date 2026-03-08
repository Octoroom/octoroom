'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';

// 🌟 核心修复：直接引入全局 CSS，如果你依然看到 preload 警告，请忽略，这是 Next.js 开发环境特有现象
import 'leaflet/dist/leaflet.css';

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
type OaStage = 'VIEWING' | 'AUCTION_PREP' | 'CONDITIONAL' | 'DUE_DILIGENCE' | 'UNCONDITIONAL' | 'SETTLEMENT' | 'COMPLETED';

interface ServiceProvider {
  id: string; role: 'BROKER' | 'INSPECTOR' | 'LAWYER'; name: string; avatar: string; quote: number; pitch: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

// --- 🌟 专业级房产地图组件 (修复版) ---
const PropertyMap = ({ lat, lng, address }: { lat: number, lng: number, address: string }) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstance = React.useRef<any>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || !lat || !lng) return;

    let isMounted = true;

    // 采用 async 函数动态加载核心，确保对象完全可用
    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        
        if (!isMounted || mapInstance.current) return;

        // 设置极高精度 (19) 凸显房产边界
        const map = L.map(mapRef.current!).setView([lat, lng], 19);

        // 1. 高清卫星图 (Esri)
        const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 20,
          attribution: '&copy; Esri'
        });

        // 2. 真实 LINZ 官方边界图 (使用了你的 Key)
        const linzStyleVector = L.tileLayer('https://tiles-a.data-cdn.linz.govt.nz/services;key=db81bf95b3c447608a8bcf4cb35f50ec/tiles/v4/layer=50772/EPSG:3857/{z}/{x}/{y}.png', {
          maxZoom: 20,
          attribution: '&copy; <a href="https://www.linz.govt.nz/">LINZ CC BY 4.0</a>'
        });

        // 强制修复 Leaflet 在 React 中图标找不到的经典 Bug
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // 先把卫星图铺底
        esriSatellite.addTo(map);
        // 再把 LINZ 红黑线条叠加在上方
        linzStyleVector.addTo(map);

        L.marker([lat, lng]).addTo(map)
          .bindPopup(`<div class="font-bold text-[13px] text-gray-900">${address}</div><div class="text-[11px] text-orange-500 font-bold mt-1">LINZ 边界线已加载</div>`)
          .openPopup();

        // 将图层控制器放在右上角
        L.control.layers(
          { "🛰️ 高清卫星图": esriSatellite }, // 底图
          { "🗺️ LINZ 产权边界线": linzStyleVector } // 可开关叠加层
        ).addTo(map);

        mapInstance.current = map;

        // 延迟触发 resize，保证宽度 100% 充满，修复灰屏问题
        setTimeout(() => { if (mapInstance.current) mapInstance.current.invalidateSize(); }, 300);

      } catch (error) {
        console.error("Leaflet map load error:", error);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [lat, lng, address]);

  // 这里的 relative 和 z-10 非常重要，不然会被隐藏
  return <div ref={mapRef} className="w-full h-full relative z-10"></div>;
};

// --- 🌟 主页面组件 ---
export default function PropertyTradeRoom() {
  const router = useRouter();
  const currentUserRole = 'BUYER'; 
  
  const [property] = useState({
    id: 'prop_123',
    title: '奥克兰北岸 3房2卫 全海景别墅',
    address_name: '12 Marine Parade, Takapuna, Auckland',
    price: '1,250,000 NZD',
    type: 'NEGOTIATION',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    ],
    author_id: 'host_888',
    author_name: 'Alex.W',
    author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    description: '绝佳的北岸海景别墅，走路5分钟可达海滩。\n\n全屋刚刚完成翻新，双层玻璃，全新厨房电器。拥有无敌的 Rangitoto 火山海景，处于顶级双校网内（西湖男校、西湖女校）。\n\n房东由于工作调动急售，诚意议价。欢迎随时联系看房！',
    amenities: 'wifi,ac,kitchen,bathroom',
    bedrooms: 3,
    bathrooms: 2,
    carparks: 2,
    land_area: '650 sqm',
    floor_area: '180 sqm',
    latitude: -36.7885, // 这里的坐标要精准
    longitude: 174.7733
  });

  const [currentStage, setCurrentStage] = useState<OaStage>('VIEWING');
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'WORKFLOW' | 'PROVIDERS'>('DETAILS');
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const [providers] = useState<ServiceProvider[]>([
    { id: 'p1', role: 'INSPECTOR', name: 'John Doe', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', quote: 600, pitch: '拥有15年奥克兰北岸持牌屋检经验，提供加急报告。', status: 'PENDING' },
    { id: 'p2', role: 'BROKER', name: 'Sarah Smith', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', quote: 0, pitch: '熟悉四大行最新利率，可申请高额返现。', status: 'ACCEPTED' },
  ]);

  const validAmenities = property.amenities ? property.amenities.split(',').map((s:string) => s.trim()).filter(Boolean) : [];

  const renderDetailsTab = () => {
    return (
      <div className="animate-in fade-in duration-300">
        {/* 1. 图片轮播区 */}
        <div className="w-full h-[260px] relative group bg-gray-100 rounded-2xl overflow-hidden mb-6">
          <div 
             id="property-image-slider"
             className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
             onScroll={(e) => {
               const scrollLeft = e.currentTarget.scrollLeft;
               const width = e.currentTarget.clientWidth;
               setCurrentImgIndex(Math.round(scrollLeft / width));
             }}
          >
            {property.images.map((imgUrl: string, idx: number) => (
              <img key={idx} src={imgUrl} className="w-full h-full object-cover flex-shrink-0 snap-center" alt={`cover-${idx}`} />
            ))}
          </div>

          {property.images.length > 1 && (
            <>
              <button onClick={() => { const slider = document.getElementById('property-image-slider'); if(slider) slider.scrollBy({ left: -slider.clientWidth, behavior: 'smooth' }); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
              <button onClick={() => { const slider = document.getElementById('property-image-slider'); if(slider) slider.scrollBy({ left: slider.clientWidth, behavior: 'smooth' }); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                 {property.images.map((_:any, i:number) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentImgIndex ? 'bg-white scale-125' : 'bg-white/50'}`} />
                 ))}
              </div>
            </>
          )}
        </div>

        {/* 2. 房东卡片区 */}
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
          <button className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 hover:scale-105 transition-all shadow-sm">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
          </button>
        </div>

        {/* 3. 核心参数 */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2 border border-gray-100/50">
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/bed.png" className="w-4 h-4 opacity-50"/> 卧室</span><span className="text-[14px] font-bold text-gray-800">{property.bedrooms} 间</span></div>
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/bath.png" className="w-4 h-4 opacity-50"/> 卫浴</span><span className="text-[14px] font-bold text-gray-800">{property.bathrooms} 间</span></div>
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/car.png" className="w-4 h-4 opacity-50"/> 车位</span><span className="text-[14px] font-bold text-gray-800">{property.carparks} 个</span></div>
          <div className="flex flex-col gap-1.5"><span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5"><svg className="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h14v-8h3L12 2zm0 2.83l5 5V18H7v-8.17l5-5z"/></svg> 占地</span><span className="text-[14px] font-bold text-gray-800">{property.land_area}</span></div>
        </div>

        {/* 4. 详情描述 */}
        <div className="mb-8">
          <h3 className="text-[16px] font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-orange-500 rounded-full"></span>房源介绍</h3>
          <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{property.description}</p>
        </div>

        {/* 5. 配套设施 */}
        {validAmenities.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[16px] font-bold text-gray-900 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-orange-500 rounded-full"></span>配套设施</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2">
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

        {/* 🌟 6. 地图组件 */}
        {(property.address_name || property.latitude) && (
          <div className="mb-4">
            <h3 className="text-[16px] font-bold text-gray-900 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-orange-500 rounded-full"></span>产权位置与边界</h3>
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-white flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-gray-900 truncate">{property.address_name}</div>
                </div>
                <button onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${property.latitude}&mlon=${property.longitude}#map=16/${property.latitude}/${property.longitude}`)} className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 hover:bg-orange-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                </button>
              </div>
              <div className="h-[350px] bg-gray-100 relative w-full overflow-hidden border-t border-gray-200">
                {property.latitude && property.longitude ? (
                  <PropertyMap lat={property.latitude} lng={property.longitude} address={property.address_name} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-sm">
                    <span className="text-gray-500 text-[13px] font-bold px-4 py-2 bg-white/80 rounded-full shadow-sm">未提供精准坐标</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWorkflowTimeline = () => {
    const stages: { key: OaStage; label: string; desc: string }[] = [
      { key: 'VIEWING', label: '预约看房 / 意向沟通', desc: '买家实地考察房屋并沟通意向' },
      ...(property.type === 'AUCTION' ? [{ key: 'AUCTION_PREP' as OaStage, label: '资质认证', desc: '拍卖前资金与身份核验' }] : []),
      { key: 'CONDITIONAL', label: '签署 Conditional 合同', desc: '买卖双方通过平台起草并签署电子意向合同' },
      { key: 'DUE_DILIGENCE', label: '尽职调查 (Due Diligence)', desc: '贷款审批下发，屋检/地检完成' },
      { key: 'UNCONDITIONAL', label: '转为 Unconditional', desc: '所有条件满足，合同正式无条件生效' },
      { key: 'SETTLEMENT', label: '律师交割 (Settlement)', desc: '律师介入处理产权转移与尾款结算' }
    ];

    const currentIndex = stages.findIndex(s => s.key === currentStage);

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
        <h3 className="text-lg font-black text-gray-900 mb-6">交易流追踪 (OA)</h3>
        <div className="relative border-l-2 border-orange-200 ml-3 space-y-8">
          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;
            
            return (
              <div key={stage.key} className="relative pl-6">
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-white transition-colors ${isCompleted ? 'border-orange-500 bg-orange-500' : isActive ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-gray-300'}`}>
                  {isCompleted && <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                
                <div>
                  <h4 className={`text-[15px] font-bold ${isActive ? 'text-orange-500' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {stage.label}
                  </h4>
                  <p className="text-[13px] text-gray-500 mt-1">{stage.desc}</p>
                  
                  {isActive && currentUserRole === 'BUYER' && (
                    <div className="mt-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                      {stage.key === 'VIEWING' && (
                         <button onClick={() => setCurrentStage('CONDITIONAL')} className="px-4 py-2 bg-gray-900 text-white text-[13px] font-bold rounded-full hover:bg-black transition-colors w-full md:w-auto">向房东发起出价 / 拟定合同</button>
                      )}
                      {stage.key === 'DUE_DILIGENCE' && (
                         <div className="flex flex-col sm:flex-row gap-3">
                           <button onClick={() => setActiveTab('PROVIDERS')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-[13px] font-bold rounded-full hover:border-orange-500 hover:text-orange-600 transition-colors">前往大厅选择 屋检/贷款服务</button>
                           <button onClick={() => setCurrentStage('UNCONDITIONAL')} className="px-4 py-2 bg-green-500 text-white text-[13px] font-bold rounded-full hover:bg-green-600 transition-colors shadow-sm">报告无误，确认 Unconditional</button>
                         </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProvidersRoom = () => {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-gray-900">服务商入驻申请</h3>
          {['BROKER', 'INSPECTOR', 'LAWYER'].includes(currentUserRole) && (
            <button className="px-4 py-1.5 bg-orange-500 text-white text-sm font-bold rounded-full shadow-md">提交我的报价</button>
          )}
        </div>
        
        <div className="space-y-4">
          {providers.map(provider => (
            <div key={provider.id} className="p-4 border border-gray-100 rounded-xl hover:border-orange-200 transition-colors bg-gray-50/50">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <img src={provider.avatar} alt="avatar" className="w-10 h-10 rounded-full bg-white shadow-sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-[15px]">{provider.name}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-gray-900 text-white">{provider.role}</span>
                    </div>
                    <div className="text-[12px] text-gray-500 mt-0.5">报价: {provider.quote === 0 ? '免费/提佣' : `$${provider.quote} NZD`}</div>
                  </div>
                </div>
                {provider.status === 'ACCEPTED' ? (
                  <span className="text-[12px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">已中标</span>
                ) : (
                  currentUserRole === 'BUYER' && <button className="text-[12px] font-bold text-orange-500 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors">选择 Ta</button>
                )}
              </div>
              <p className="text-[13px] text-gray-600 bg-white p-3 rounded-lg border border-gray-100">“{provider.pitch}”</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-white md:bg-gray-50 flex flex-col relative pb-20">
      
      <div className="bg-white pt-6 pb-4 px-5 border-b border-gray-100 sticky top-0 z-30">
        <button onClick={() => router.back()} className="mb-4 w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col justify-center">
            <h1 className="text-[20px] font-black text-gray-900 leading-tight mb-1 line-clamp-2">{property.title}</h1>
            <p className="text-[16px] font-black text-orange-500 mt-1">{property.price}</p>
          </div>
        </div>
      </div>

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

      <div className="p-4 md:p-5 flex-1 bg-white md:bg-transparent">
        {activeTab === 'DETAILS' && renderDetailsTab()}
        {activeTab === 'WORKFLOW' && renderWorkflowTimeline()}
        {activeTab === 'PROVIDERS' && renderProvidersRoom()}
      </div>
      
      {activeTab === 'DETAILS' && (
        <div className="fixed bottom-0 left-0 md:left-auto md:w-[640px] w-full p-4 bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
           <button onClick={() => setActiveTab('WORKFLOW')} className="w-full py-3.5 rounded-xl font-bold text-[15px] bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors flex justify-center items-center gap-2">
             发起意向 / 起草合同
             <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
           </button>
        </div>
      )}

    </main>
  );
}