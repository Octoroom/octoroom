'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import React from 'react';
import { supabase } from '@/lib/supabase';

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
  id: string; 
  role: 'BROKER' | 'INSPECTOR' | 'LAWYER' | 'VALUER' | 'PHOTOGRAPHER' | 'STAGER'; 
  name: string; 
  avatar: string; 
  quote: number | string; 
  pitch: string; 
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
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
      setTimeLeft(`${days > 0 ? days + '天 ' : ''}${hours}小时 ${mins}分`);
    }, 1000);
    return () => clearInterval(timer);
  }, [dueDate, status]);

  if (status === 'COMPLETED') return null;
  return (
    <span className={`text-[12px] font-bold flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      {isOverdue ? '已逾期' : `剩余: ${timeLeft}`}
    </span>
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
          { "📐 LINZ 产权边界线": linzStyleVector }
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
// 🌟 核心：基于真实数据的 OA 流业务组件
// ==========================================
const WorkflowTimelineTab = ({ propertyId, property, setActiveTab, currentUserRole }: { propertyId: string, property: any, setActiveTab: (tab: any) => void, currentUserRole: Role }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<any>(null);
  const [buyerProfile, setBuyerProfile] = useState<{username: string, avatar_url: string} | null>(null);

  // 用于倒计时的演示基准时间
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

  useEffect(() => {
    let channel: any = null;
    
    const fetchOffer = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query: any = supabase.from('octo_offers').select('*').eq('property_id', propertyId);

      // 🌟 核心逻辑：买卖双方获取 Offer 的逻辑不同
      if (currentUserRole === 'BUYER') {
        // 买家：看自己最新的 Offer
        query = query.eq('buyer_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      } else {
        // 卖家：获取被正式接受的 Offer，或者如果没有，则获取最新的一个作为待办展示
        query = query.order('status', { ascending: true }).order('created_at', { ascending: false }).limit(1).maybeSingle();
      }

      const { data, offerError } = await query;

      if (data) {
        setOffer(data);
        
        // 🌟 动态获取买家信息
        if (data.buyer_id) {
          const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', data.buyer_id).maybeSingle();
          if (profile) setBuyerProfile(profile);
        }

        // 开启实时监听，当状态改变时瞬间更新
        channel = supabase
          .channel('oa-status-updates')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'octo_offers', filter: `id=eq.${data.id}` },
            (payload) => setOffer((prev: any) => ({ ...prev, status: payload.new.status }))
          ).subscribe();
      }
      setLoading(false);
    };

    fetchOffer();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [propertyId, currentUserRole]);

  if (loading) return <div className="py-20 text-center text-gray-400 font-bold">同步加密网络中...</div>;
  
  // 🌟 空状态：根据角色显示不同文案
  const isAccepted = offer?.status === 'accepted' || offer?.status === 'sold';
  const isPendingBuyer = offer?.status === 'pending_buyer_signature';

  if (!offer || (currentUserRole === 'SELLER' && !isAccepted)) {
    return (
      <div className="py-24 text-center flex flex-col items-center animate-in fade-in zoom-in-95">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
          <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">
          {currentUserRole === 'SELLER' ? '等待确认出价 ⏳' : '暂无交易数据'}
        </h3>
        <p className="text-[15px] text-gray-500 mb-8 max-w-[280px] leading-relaxed">
          {currentUserRole === 'SELLER' 
            ? '您需要先前往"出价大厅"审核并接受买家提交的 Offer，之后系统将为您自动在此生成完整交易流 (OA)。' 
            : '您尚未对该房源发起意向，起草并签署合同后即可解锁控制台。'}
        </p>
        {currentUserRole === 'SELLER' && (
          <button 
            onClick={() => router.push(`/property/${propertyId}/offers`)}
            className="px-6 py-2.5 bg-black text-white rounded-xl font-bold text-[14px] shadow-md hover:bg-gray-800 transition-colors"
          >
            前往出价管理大厅 →
          </button>
        )}
      </div>
    );
  }

  const buyerName = buyerProfile?.username || '买家';
  const buyerAvatar = buyerProfile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';

  // 🌟 动态构建步骤数组
  const oaSteps: OAStep[] = [
    { 
      id: 'step_1', 
      title: isPendingBuyer ? '签署购房协议 (S&P)' : `${buyerName} 签署 S&P 购房协议`, 
      description: isPendingBuyer ? `代理商已为您准备好合规的 S&P 协议，请核对条款并完成签名。` : `${buyerName} 已完成线上电子签名，Offer 正式生成。`, 
      role: 'BUYER', 
      status: isPendingBuyer ? 'IN_PROGRESS' : 'COMPLETED', 
      completedAt: isPendingBuyer ? undefined : offer.created_at,
      dueDate: isPendingBuyer ? tomorrow : undefined
    },
    { id: 'step_2', title: '房东审核出价并签字确认', description: `正在等待房东 ${property?.author_name || ''} 审核 ${buyerName} 的出价并完成签名。`, role: 'SELLER', status: isAccepted ? 'COMPLETED' : 'PENDING', dueDate: (!isAccepted && !isPendingBuyer) ? tomorrow : undefined },
    { id: 'step_3', title: `${buyerName} 支付 10% 定金`, description: '请将定金打入中介或律师的 Trust Account (信托账户)。', role: 'BUYER', status: isAccepted ? 'IN_PROGRESS' : 'PENDING', dueDate: isAccepted ? tomorrow : undefined },
    { id: 'step_4', title: '律师审查 Title & LIM 报告', description: '买方律师需确认房屋产权无瑕疵，并审查政府档案。', role: 'LAWYER', status: 'PENDING', dueDate: nextWeek },
    { id: 'step_5', title: '无条件交割日 (Unconditional)', description: '所有购房条件满足，合同正式生效。', role: 'SYSTEM', status: 'PENDING' }
  ];

  // 真实的律师信息来自于 Offer 记录
  const lawyer = offer?.buyer_lawyer_id ? {
    name: offer.buyer_lawyer_name || '代理律师',
    role: '买方过户律师',
    firm: offer.buyer_lawyer_address || '未提供律所地址',
    // 这里因为我们的 offer 表没有直接存律师头像，我们可以再次请求 profile 或直接用首字母代替
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${offer.buyer_lawyer_name || 'Lawyer'}`,
  } : {
    name: '尚未指派',
    role: '买方过户律师',
    firm: '等待买家确认代表律师',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pending',
  };

  const getRoleBadge = (role: Role) => {
    switch(role) {
      case 'BUYER': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black">{buyerName}任务</span>;
      case 'SELLER': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black">卖家任务</span>;
      case 'LAWYER': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black">律师跟进</span>;
      case 'SYSTEM': return <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-black">系统节点</span>;
    }
  };

  const getRoleAvatar = (role: Role) => {
    switch(role) {
      case 'BUYER': return buyerAvatar;
      case 'SELLER': return property?.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Seller`;
      case 'LAWYER': return lawyer.avatar;
      case 'SYSTEM': return 'https://api.dicebear.com/7.x/bottts/svg?seed=System';
      default: return 'https://api.dicebear.com/7.x/avataaars/svg?seed=Default';
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* 🌟 “我的法律代表” 卡片完美植入 */}
      <div className="bg-white rounded-[16px] p-4 border border-gray-200 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-[13px] font-black text-gray-900">当前法律代表</h2>
          <button className="text-[12px] text-orange-500 font-bold hover:underline">更换律师</button>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <img src={lawyer.avatar} alt="Lawyer" className="w-12 h-12 rounded-full border border-gray-100 bg-gray-50" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-gray-900">{lawyer.name}</span>
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-bold">已就绪</span>
            </div>
            <p className="text-[12px] text-gray-500 mt-0.5">{lawyer.firm}</p>
          </div>
          <button className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          </button>
        </div>
      </div>

      {/* 🌟 交易流时间轴 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-lg font-black text-gray-900">交易流追踪 (OA)</h3>
           {currentUserRole === 'SELLER' && offer && <span className="text-[12px] bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold">买家出价: <span className="text-purple-900">${offer.offer_price?.toLocaleString() || '---'}</span></span>}
        </div>
        
        <div className="relative border-l-2 border-gray-100 ml-5 space-y-8">
          {oaSteps.map((step) => (
            <div key={step.id} className="relative pl-8">
              
              {/* 头像圆点 */}
              <div className={`absolute -left-[21px] top-0 w-10 h-10 rounded-full border-4 bg-white flex items-center justify-center z-10 overflow-hidden transition-all ${
                step.status === 'COMPLETED' ? 'border-green-500' : 
                step.status === 'IN_PROGRESS' ? 'border-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.1)]' : 
                'border-gray-200 opacity-60'
              }`}>
                <img src={getRoleAvatar(step.role)} alt={step.role} className="w-full h-full object-cover bg-gray-50" />
                
                {step.status === 'COMPLETED' && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-[1px]">
                     <svg className="w-5 h-5 text-green-600 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                  </div>
                )}
              </div>

              {/* 状态卡片 */}
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
                    <span className="text-[12px] font-medium text-gray-400 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      等待前置任务解锁
                    </span>
                  )}
                  
                  {/* 🌟 核心修改：动态识别身份并渲染对应的按钮 */}
                  {step.status === 'IN_PROGRESS' && step.role === currentUserRole ? (
                    <button 
                      onClick={() => {
                        if (step.id === 'step_1' && isPendingBuyer) {
                          // 买家去签署
                          router.push(`/contract/${propertyId}`);
                        } else if (step.role === 'SELLER') {
                          // 卖家点击，带上 offerId 去合同页签署
                          router.push(`/contract/${propertyId}?offerId=${offer.id}`);
                        } else if (step.title.includes('律师')) {
                          setActiveTab('PROVIDERS');
                        } else {
                          alert('跳转至处理页面...');
                        }
                      }} 
                      className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold hover:bg-orange-600 transition-colors shadow-sm shadow-orange-200"
                    >
                      {isPendingBuyer && step.id === 'step_1' ? '去核对并签名 →' : step.role === 'SELLER' ? '去审核并签署 →' : step.title.includes('律师') ? '去大厅选律师 →' : '去处理 →'}
                    </button>
                  ) : step.status === 'IN_PROGRESS' ? (
                    <span className="text-[12px] font-bold text-orange-500 animate-pulse bg-orange-50 px-2 py-1 rounded">正在等待对方处理...</span>
                  ) : null}
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 🌟 主组件：交易室页面
// ==========================================
export default function PropertyTradeRoom() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams(); // 🌟 引入查询参数 hook
  const propertyId = params?.id as string;
  
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 🌟 动态判断当前用户是卖家还是买家
  const isSeller = property && currentUserId === property.author_id;
  const currentUserRole: Role = isSeller ? 'SELLER' : 'BUYER';

  // 🌟 根据 URL 参数动态设置默认 Tab
  const defaultTab = (searchParams?.get('tab') as 'DETAILS' | 'WORKFLOW' | 'PROVIDERS') || 'DETAILS';
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'WORKFLOW' | 'PROVIDERS'>(defaultTab);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // --- 🌟 点赞和收藏相关状态 ---
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();
  }, []);
  
  const handleToggleLike = async () => {
    if (!currentUserId) { alert('请先登录后再进行点赞操作！'); return; }
    const previousState = isLiked;
    setIsLiked(!isLiked); 
    try {
      if (previousState) {
        const { error } = await supabase.from('octo_property_likes').delete().match({ property_id: propertyId, user_id: currentUserId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('octo_property_likes').insert({ property_id: propertyId, user_id: currentUserId });
        if (error) throw error;
      }
    } catch (error: any) {
      setIsLiked(previousState); 
      alert('网络开小差了，点赞失败');
    }
  };

  const handleToggleSave = async () => {
    if (!currentUserId) { alert('请先登录后再收藏房源！'); return; }
    const previousState = isSaved;
    setIsSaved(!isSaved); 
    try {
      if (previousState) {
        const { error } = await supabase.from('octo_property_saves').delete().match({ property_id: propertyId, user_id: currentUserId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('octo_property_saves').insert({ property_id: propertyId, user_id: currentUserId });
        if (error) throw error;
      }
    } catch (error: any) {
      setIsSaved(previousState); 
      alert('网络开小差了，收藏失败');
    }
  };

  // 🌟 从 Supabase 获取房源详情 + 用户点赞收藏状态
  useEffect(() => {
    const fetchProperty = async () => {
      setIsLoading(true);
      try {
        if (!propertyId) return;

        const { data: item, error } = await supabase
          .from('octo_properties')
          .select('*')
          .eq('id', propertyId)
          .single();

        if (error) {
          setProperty(null);
          return;
        }

        if (item) {
          const featureMap: Record<string, string> = {
            double_glazing: '双层玻璃',
            heat_pump: '热泵空调',
            fully_fenced: '全围栏院子',
            internal_garage: '内进式车库',
            ensuite: '主人套房',
            new_renovation: '近期翻新',
            freehold: '永久产权'
          };
          
          const formattedAmenities = item.features 
            ? item.features.split(',').map((f: string) => featureMap[f.trim()] || f.trim()).join(',') 
            : '';

          let uiType = 'FIXED_PRICE';
          if (item.sale_method === '拍卖') uiType = 'AUCTION';
          if (item.sale_method === '议价') uiType = 'NEGOTIATION';
          
          let coverImages = ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'];
          if (item.cover_image) {
            const urls = item.cover_image.split(',').map((s: string) => s.trim());
            if (urls.length > 0 && urls[0]) coverImages = urls;
          }

          setProperty({
            id: item.id,
            title: item.title,
            address_name: item.address_name || item.city_name,
            price: item.price_display || '面议',
            type: uiType,
            images: coverImages,
            author_id: item.author_id,
            author_name: item.author_name || '房东直售',
            author_avatar: item.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id}`,
            description: item.description || '',
            amenities: formattedAmenities,
            bedrooms: item.bedrooms || 0,
            bathrooms: item.bathrooms || 0,
            carparks: item.car_parks || 0,
            land_area: item.land_area ? `${item.land_area} m²` : '',
            latitude: item.latitude,
            longitude: item.longitude
          });
        }

        if (currentUserId && propertyId) {
          const { data: likeData } = await supabase.from('octo_property_likes').select('id').eq('property_id', propertyId).eq('user_id', currentUserId).maybeSingle();
          if (likeData) setIsLiked(true);

          const { data: saveData } = await supabase.from('octo_property_saves').select('id').eq('property_id', propertyId).eq('user_id', currentUserId).maybeSingle();
          if (saveData) setIsSaved(true);
        }
      } catch (err: any) {
        setProperty(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId, currentUserId]); 

  // 服务商数据
  const [providers, setProviders] = useState<ServiceProvider[]>([]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('/api/test-fetch');
        const { data: rawData, mapped: profiles } = await response.json();
        
        if (profiles && profiles.length > 0) {
          // 过滤我们需要的角色
          const allowedRoles = ['LAWYER', 'INSPECTOR', 'BROKER', 'VALUER', 'PHOTOGRAPHER', 'STAGER'];
          const filtered = profiles.filter((p: any) => allowedRoles.includes(p.role));
      
          const mapped = filtered.map((p: any) => {
            // we need to find the raw data to get bio and avatar
            const raw = rawData?.find((r: any) => r.id === p.id) || {};

            let quote: string | number = '咨询报价';
            let status: 'PENDING' | 'ACCEPTED' | 'REJECTED' = 'PENDING';
            if (p.role === 'LAWYER') quote = '1,500 + GST';
            if (p.role === 'INSPECTOR') quote = 600;
            if (p.role === 'BROKER') { quote = '免费'; status = 'ACCEPTED'; }
            if (p.role === 'VALUER') quote = 850;
            if (p.role === 'PHOTOGRAPHER') quote = 350;
            if (p.role === 'STAGER') quote = '2,200起 (5周)';

            return {
              id: p.id,
              role: p.role,
              name: p.name,
              avatar: raw.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`,
              quote: quote,
              pitch: raw.bio || '提供专业对口服务。',
              status: status
            };
          });
          
          const roleOrder = ['LAWYER', 'INSPECTOR', 'BROKER', 'VALUER', 'PHOTOGRAPHER', 'STAGER'];
          mapped.sort((a: any, b: any) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));

          setProviders(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch providers", err);
      }
    };

    fetchProviders();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 max-w-[640px] w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

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
              <div className="text-[15px] font-bold text-gray-900">{isSeller ? '您是屋主' : `屋主: ${property.author_name}`}</div>
              <div className="text-[12px] text-green-600 font-bold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                产权证已核验
              </div>
            </div>
          </div>
          <button 
            onClick={() => router.push(`/messages?chatWith=${property.author_id}`)} 
            className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 hover:scale-105 transition-all shadow-sm"
          >
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

  const renderProvidersRoom = () => {
    const getProviderRoleConfig = (role: string) => {
      switch(role) {
        case 'LAWYER': return { label: '过户律师', color: 'bg-emerald-100 text-emerald-700' };
        case 'INSPECTOR': return { label: '屋检师', color: 'bg-blue-100 text-blue-700' };
        case 'BROKER': return { label: '贷款Broker', color: 'bg-indigo-100 text-indigo-700' };
        case 'VALUER': return { label: '注册估价师', color: 'bg-purple-100 text-purple-700' };
        case 'PHOTOGRAPHER': return { label: '房屋摄影', color: 'bg-pink-100 text-pink-700' };
        case 'STAGER': return { label: 'Home Staging', color: 'bg-amber-100 text-amber-700' };
        default: return { label: role, color: 'bg-gray-100 text-gray-700' };
      }
    };

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-gray-900">服务商入驻大厅</h3>
          <button className="px-4 py-1.5 bg-orange-500 text-white text-sm font-bold rounded-full shadow-md hover:bg-orange-600 transition-colors">我是服务商，提交报价</button>
        </div>
        
        {providers.length === 0 ? (
           <div className="py-12 text-center text-gray-400 font-bold">加载服务商网络...</div>
        ) : (
          <div className="space-y-4">
            {providers.map(provider => {
              const roleConfig = getProviderRoleConfig(provider.role);
              return (
                <div key={provider.id} className={`p-4 border rounded-xl transition-colors bg-white shadow-sm hover:border-orange-200 ${provider.role === 'LAWYER' ? 'border-emerald-200' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <img src={provider.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-gray-100 shadow-sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-[15px]">{provider.name}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${roleConfig.color}`}>
                            {roleConfig.label}
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
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-white md:bg-gray-50 flex flex-col relative pb-20">
      
      {/* 顶部标题栏 */}
      <div className="bg-white pt-6 pb-4 px-5 border-b border-gray-100 sticky top-0 z-30">
        <button onClick={() => router.back()} className="mb-4 w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col justify-center">
            <h1 className="text-[20px] font-black text-gray-900 leading-tight mb-1 line-clamp-2">{property.title}</h1>
            <p className="text-[16px] font-black text-orange-500 mt-1">{property.price}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleToggleSave}
              className={`shrink-0 p-2 rounded-full transition-colors ${isSaved ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
            >
              <svg fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            </button>
            <button 
              onClick={handleToggleLike}
              className={`shrink-0 p-2 rounded-full transition-colors ${isLiked ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
            >
              <svg fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
          </div>
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
        
        {/* 🌟 传入 currentUserRole */}
        {activeTab === 'WORKFLOW' && (
          <WorkflowTimelineTab 
            propertyId={propertyId} 
            property={property} 
            setActiveTab={setActiveTab} 
            currentUserRole={currentUserRole}
          />
        )}
        
        {activeTab === 'PROVIDERS' && renderProvidersRoom()}
      </div>
      
      {/* 🌟 底部悬浮行动条：买卖双方完全不同！ */}
      <div className="fixed bottom-0 left-0 md:left-auto md:w-[640px] w-full p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
        {activeTab === 'DETAILS' && (
          currentUserRole === 'BUYER' ? (
            <button 
              onClick={() => router.push(`/contract/${propertyId}/prepare`)} 
              className="w-full py-3.5 rounded-xl font-bold text-[15px] bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors flex justify-center items-center gap-2"
            >
              起草买卖协议 (S&P Contract)
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
          ) : (
            <button 
              onClick={() => router.push(`/property/${propertyId}/offers`)} 
              className="w-full py-3.5 rounded-xl font-bold text-[15px] bg-purple-600 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-700 transition-colors flex justify-center items-center gap-2"
            >
              前往出价大厅 (Offers Hub)
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          )
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

export default function PropertyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center shadow-lg border border-gray-100/50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <PropertyContent />
    </Suspense>
  );
}
