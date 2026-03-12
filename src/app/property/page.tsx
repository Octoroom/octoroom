'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// --- 🌟 类型定义 ---
interface PropertyListing {
  id: string;
  title: string;
  address: string;
  city: string;
  price: string;
  cvPrice?: string; // 政府估价
  type: 'AUCTION' | 'NEGOTIATION' | 'FIXED_PRICE';
  status: 'PRE_LAUNCH' | 'VIEWING' | 'UNDER_CONTRACT' | 'SOLD';
  bedrooms: number;
  bathrooms: number;
  carparks: number;
  coverImage: string;
  authorName: string;
  authorAvatar: string;
  views: number;
  biddersCount?: number; // 如果是拍卖，显示竞标人数
}

export default function PropertyLobbyPage() {
  const router = useRouter();
  
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'AUCTION' | 'MINE'>('ALL');
  
  // 🌟 点赞和收藏状态管理
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [userSaves, setUserSaves] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [saveCounts, setSaveCounts] = useState<Record<string, number>>({});

  // 真实连接 Supabase 数据库拉取房源 
  useEffect(() => {
    const fetchRealProperties = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // 1. 获取所有房源
        const { data, error } = await supabase
          .from('octo_properties')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          alert("❌ 数据库请求报错：\n" + error.message);
          throw error;
        }

        if (data && data.length > 0) {
          const initialLikes: Record<string, boolean> = {};
          const initialSaves: Record<string, boolean> = {};
          const initialLikeCounts: Record<string, number> = {};
          const initialSaveCounts: Record<string, number> = {};

          // 2. 如果已登录，拉取该用户真实的"点赞"和"收藏"记录
          let myLikedPropertyIds: string[] = [];
          let mySavedPropertyIds: string[] = [];
          
          if (user) {
             const { data: likesData } = await supabase.from('octo_property_likes').select('property_id').eq('user_id', user.id);
             const { data: savesData } = await supabase.from('octo_property_saves').select('property_id').eq('user_id', user.id);
             
             if (likesData) myLikedPropertyIds = likesData.map(l => l.property_id);
             if (savesData) mySavedPropertyIds = savesData.map(s => s.property_id);
          }

          const formattedData: PropertyListing[] = data.map((item: any) => {
            let uiType: 'AUCTION' | 'NEGOTIATION' | 'FIXED_PRICE' = 'FIXED_PRICE';
            if (item.sale_method === '拍卖') uiType = 'AUCTION';
            if (item.sale_method === '议价') uiType = 'NEGOTIATION';

            let uiStatus: 'PRE_LAUNCH' | 'VIEWING' | 'UNDER_CONTRACT' | 'SOLD' = 'VIEWING';
            if (item.status === 'under_contract') uiStatus = 'UNDER_CONTRACT';
            if (item.status === 'sold') uiStatus = 'SOLD';
            
            let coverImg = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80';
            if (item.cover_image) {
              const urls = item.cover_image.split(',').map((s:string) => s.trim());
              if (urls.length > 0 && urls[0]) coverImg = urls[0];
            }

            // Mock 互动总数（这部分总数可以后续再改写为真实 count，目前为展示效果使用随机占位）
            initialLikeCounts[item.id] = Math.floor(Math.random() * 50) + 5; 
            initialSaveCounts[item.id] = Math.floor(Math.random() * 20) + 2;
            
            // 🌟 将当前用户的真实状态映射进来
            initialLikes[item.id] = myLikedPropertyIds.includes(item.id);
            initialSaves[item.id] = mySavedPropertyIds.includes(item.id);

            return {
              id: item.id,
              title: item.title,
              address: item.address_name || item.city_name,
              city: item.city_name,
              price: item.price_display || '面议',
              cvPrice: undefined, 
              type: uiType,
              status: uiStatus,
              bedrooms: item.bedrooms || 0,
              bathrooms: item.bathrooms || 0,
              carparks: item.car_parks || 0,
              coverImage: coverImg,
              authorName: item.author_name || '房东直售',
              authorAvatar: item.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id}`,
              views: Math.floor(Math.random() * 200) + 10
            };
          });
          
          setLikeCounts(initialLikeCounts);
          setSaveCounts(initialSaveCounts);
          setUserLikes(initialLikes);
          setUserSaves(initialSaves);
          setProperties(formattedData);
        }
      } catch (err: any) {
        console.error("加载真实房源失败:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRealProperties();
  }, []);

  // 🌟 真实数据库写入：处理点赞逻辑 
  const handleToggleLike = async (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation(); // 阻止卡片点击跳转
    const isCurrentlyLiked = userLikes[propertyId];
    
    // 乐观更新 UI：立马变色
    setUserLikes(prev => ({ ...prev, [propertyId]: !isCurrentlyLiked }));
    setLikeCounts(prev => ({ ...prev, [propertyId]: prev[propertyId] + (isCurrentlyLiked ? -1 : 1) }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("请先登录！");
        throw new Error("未登录");
      }

      if (!isCurrentlyLiked) {
        // 执行点赞
        const { error } = await supabase.from('octo_property_likes').insert({ user_id: user.id, property_id: propertyId });
        if (error) throw error;
      } else {
        // 取消点赞
        const { error } = await supabase.from('octo_property_likes').delete().match({ user_id: user.id, property_id: propertyId });
        if (error) throw error;
      }
    } catch (error) {
      // 如果报错，状态回滚到点击前
      setUserLikes(prev => ({ ...prev, [propertyId]: isCurrentlyLiked }));
      setLikeCounts(prev => ({ ...prev, [propertyId]: prev[propertyId] + (isCurrentlyLiked ? 1 : -1) }));
      console.error("操作失败", error);
    }
  };

  // 🌟 真实数据库写入：处理收藏逻辑 
  const handleToggleSave = async (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();
    const isCurrentlySaved = userSaves[propertyId];
    
    // 乐观更新 UI：立马变色
    setUserSaves(prev => ({ ...prev, [propertyId]: !isCurrentlySaved }));
    setSaveCounts(prev => ({ ...prev, [propertyId]: prev[propertyId] + (isCurrentlySaved ? -1 : 1) }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("请先登录！");
        throw new Error("未登录");
      }

      if (!isCurrentlySaved) {
        // 执行收藏
        const { error } = await supabase.from('octo_property_saves').insert({ user_id: user.id, property_id: propertyId });
        if (error) throw error;
      } else {
        // 取消收藏
        const { error } = await supabase.from('octo_property_saves').delete().match({ user_id: user.id, property_id: propertyId });
        if (error) throw error;
      }
    } catch (error) {
      // 如果报错，状态回滚到点击前
      setUserSaves(prev => ({ ...prev, [propertyId]: isCurrentlySaved }));
      setSaveCounts(prev => ({ ...prev, [propertyId]: prev[propertyId] + (isCurrentlySaved ? 1 : -1) }));
      console.error("操作失败", error);
    }
  };

  const getStatusBadge = (status: PropertyListing['status']) => {
    switch(status) {
      case 'PRE_LAUNCH': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[11px] font-bold">即将上市</span>;
      case 'VIEWING': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[11px] font-bold">看房/预约中</span>;
      case 'UNDER_CONTRACT': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[11px] font-bold">OA交割中 (Under Contract)</span>;
      case 'SOLD': return <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-[11px] font-bold">已售出</span>;
    }
  };

  const getTypeBadge = (type: PropertyListing['type']) => {
    switch(type) {
      case 'AUCTION': return <span className="flex items-center gap-1 text-[11px] font-black text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.83L19.5 19h-15L12 5.83zM11 10h2v5h-2v-5zm0 6h2v2h-2v-2z"/></svg> 拍卖大厅</span>;
      case 'NEGOTIATION': return <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">议价 (Negotiation)</span>;
      case 'FIXED_PRICE': return <span className="text-[11px] font-black text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-200">一口价</span>;
    }
  };

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-gray-50 flex flex-col relative pb-20">
      
      {/* 顶部 Banner 介绍 */}
      <div className="bg-white px-5 pt-8 pb-4 border-b border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-2 relative z-10">章鱼房产 <span className="text-orange-500">直飞大厅</span></h1>
        <p className="text-[13px] text-gray-500 font-medium relative z-10 leading-relaxed">
          告别高昂中介费。房东直卖，AI 辅助 OA 交易流，自由竞标律师/贷款/屋检服务。
        </p>
      </div>

      {/* 搜索与导航栏 */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
        <div className="px-4 py-3 flex gap-2 items-center">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            </div>
            <input 
              type="text" 
              placeholder="搜索区域 (例如: 北岸, Takapuna)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100/80 border-transparent text-[14px] font-medium text-gray-900 rounded-full pl-9 pr-4 py-2 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
            />
          </div>
        </div>

        <div className="flex px-2">
          {[
            { id: 'ALL', label: '全部房源' },
            { id: 'AUCTION', label: '🔥 拍卖大厅' },
            { id: 'MINE', label: '我的关注' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-[14px] font-bold transition-colors relative ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-orange-500 rounded-t-full"></div>}
            </button>
          ))}
        </div>
      </div>
     
      {/* 房产列表区 */}
      <div className="flex-1 p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 font-medium">暂无符合条件的房源</p>
          </div>
        ) : (
          properties.map(property => (
            <div 
              key={property.id} 
              onClick={() => router.push(`/property/${property.id}`)}
              className="bg-white rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 group relative"
            >
              {/* 图片区域 */}
              <div className="relative w-full h-56 bg-gray-200 overflow-hidden">
                <img src={property.coverImage} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                
                {/* 🌟 悬浮操作按钮组 (收藏 & 点赞) */}
                <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                  {/* 收藏按钮 */}
                  <button 
                    onClick={(e) => handleToggleSave(e, property.id)}
                    className="w-8 h-8 bg-white/70 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white shadow-sm transition-all group/btn"
                  >
                    <svg viewBox="0 0 24 24" fill={userSaves[property.id] ? "currentColor" : "none"} stroke="currentColor" strokeWidth={userSaves[property.id] ? "0" : "2"} className={`w-4 h-4 ${userSaves[property.id] ? 'text-blue-500' : 'text-gray-800'}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                    </svg>
                  </button>
                  
                  {/* 点赞按钮 */}
                  <button 
                    onClick={(e) => handleToggleLike(e, property.id)}
                    className="w-8 h-8 bg-white/70 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white shadow-sm transition-all group/btn"
                  >
                    <svg viewBox="0 0 24 24" fill={userLikes[property.id] ? "currentColor" : "none"} stroke="currentColor" strokeWidth={userLikes[property.id] ? "0" : "2"} className={`w-4 h-4 ${userLikes[property.id] ? 'text-red-500' : 'text-gray-800'}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </button>
                </div>

                <div className="absolute top-3 left-3 flex gap-2">
                  {getStatusBadge(property.status)}
                  {getTypeBadge(property.type)}
                </div>
                
                {/* 底部互动数据条 */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white">
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    <span className="text-[11px] font-medium">{property.views}</span>
                  </div>
                  <div className="w-px h-3 bg-white/30"></div>
                  <div className="flex items-center gap-1">
                     <svg className="w-3 h-3 opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                     <span className="text-[11px] font-medium">{likeCounts[property.id]}</span>
                  </div>
                </div>
              </div>

              {/* 详情区域 */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-[18px] font-black text-gray-900 leading-tight flex-1 pr-4 group-hover:text-orange-500 transition-colors line-clamp-2">
                    {property.title}
                  </h2>
                  <div className="text-right shrink-0">
                    <div className="text-[18px] font-black text-orange-500">{property.price}</div>
                    {property.cvPrice && <div className="text-[11px] text-gray-400 font-medium mt-0.5">CV: {property.cvPrice}</div>}
                  </div>
                </div>

                <p className="text-[13px] text-gray-500 mb-3 flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {property.address}
                </p>

                <div className="flex items-center gap-4 py-3 border-y border-gray-50 mb-3">
                  <div className="flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/bed.png" className="w-4 h-4 opacity-50" alt="bed" /><span className="text-[13px] font-bold text-gray-700">{property.bedrooms}</span></div>
                  <div className="flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/bath.png" className="w-4 h-4 opacity-50" alt="bath" /><span className="text-[13px] font-bold text-gray-700">{property.bathrooms}</span></div>
                  <div className="flex items-center gap-1.5"><img src="https://img.icons8.com/ios-filled/50/737373/car.png" className="w-4 h-4 opacity-50" alt="car" /><span className="text-[13px] font-bold text-gray-700">{property.carparks}</span></div>
                  
                  {property.biddersCount !== undefined && (
                    <div className="ml-auto flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-md">
                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                       <span className="text-[11px] font-bold">{property.biddersCount} 人已报名参与</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={property.authorAvatar} alt="owner" className="w-6 h-6 rounded-full border border-gray-200" />
                    <span className="text-[12px] font-medium text-gray-500">{property.authorName}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止触发外层卡片的跳转事件
                      router.push(`/property/${property.id}/oa`);
                    }}
                    className="px-4 py-1.5 bg-gray-900 text-white text-[12px] font-bold rounded-full hover:bg-black transition-colors"
                  >
                    进入交易室 &rarr;
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 悬浮发布按钮 */}
      <button 
        onClick={() => router.push('/my-properties')}
        className="fixed bottom-6 right-1/2 translate-x-[240px] md:translate-x-[260px] lg:translate-x-[280px] z-40 bg-orange-500 hover:bg-orange-600 text-white shadow-xl px-5 py-3 rounded-full flex items-center gap-2 transition-transform hover:scale-105"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        <span className="text-[14px] font-bold">无中介卖房</span>
      </button>

    </main>
  );
}