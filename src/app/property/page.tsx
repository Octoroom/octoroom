'use client';

import { useState, useEffect } from 'react';
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
  
  // 模拟数据加载
  useEffect(() => {
    setLoading(true);
    // 这里未来替换为 Supabase 的真实请求
    setTimeout(() => {
      setProperties([
        {
          id: 'prop_123',
          title: '北岸全海景，校网覆盖',
          address: '12 Marine Parade, Takapuna',
          city: 'Auckland',
          price: '1,250,000 NZD',
          cvPrice: '1,100,000 NZD',
          type: 'NEGOTIATION',
          status: 'VIEWING',
          bedrooms: 3,
          bathrooms: 2,
          carparks: 2,
          coverImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
          authorName: 'Alex.W (房东直售)',
          authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
          views: 342
        },
        {
          id: 'prop_456',
          title: '全新联排，首套房首选，随时交割',
          address: '45 Hobsonville Point Rd',
          city: 'Auckland',
          price: 'Auction (拍卖)',
          type: 'AUCTION',
          status: 'PRE_LAUNCH',
          bedrooms: 2,
          bathrooms: 1,
          carparks: 1,
          coverImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
          authorName: 'Sarah.J (房东直售)',
          authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
          views: 890,
          biddersCount: 12
        },
        {
          id: 'prop_789',
          title: '中区大地潜力盘，带资源许可(RC)',
          address: '88 Remuera Rd, Remuera',
          city: 'Auckland',
          price: '2,800,000 NZD',
          type: 'FIXED_PRICE',
          status: 'UNDER_CONTRACT',
          bedrooms: 4,
          bathrooms: 3,
          carparks: 4,
          coverImage: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80',
          authorName: 'David.M (房东直售)',
          authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
          views: 1205
        }
      ]);
      setLoading(false);
    }, 600);
  }, []);

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
              // 注意：点击卡片本身依然是跳转到详情页
              onClick={() => router.push(`/property/${property.id}`)}
              className="bg-white rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 group"
            >
              {/* 图片区域 */}
              <div className="relative w-full h-56 bg-gray-200 overflow-hidden">
                <img src={property.coverImage} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 flex gap-2">
                  {getStatusBadge(property.status)}
                  {getTypeBadge(property.type)}
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-white">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  <span className="text-[11px] font-medium">{property.views}</span>
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
                  {/* 🚨 核心修改点：加入 onClick 并阻止冒泡 */}
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
        onClick={() => alert('发布房源 Modal 可以接在这里')}
        className="fixed bottom-6 right-1/2 translate-x-[240px] md:translate-x-[260px] lg:translate-x-[280px] z-40 bg-orange-500 hover:bg-orange-600 text-white shadow-xl px-5 py-3 rounded-full flex items-center gap-2 transition-transform hover:scale-105"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        <span className="text-[14px] font-bold">无中介卖房</span>
      </button>

    </main>
  );
}