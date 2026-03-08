'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// --- 🌟 核心状态与类型定义 ---
type OaStage = 
  | 'VIEWING' // 预约看房
  | 'AUCTION_PREP' // 拍卖资质认证 (如果是拍卖)
  | 'CONDITIONAL' // 签订 Conditional 合同
  | 'DUE_DILIGENCE' // Broker贷款 & Inspector屋检
  | 'UNCONDITIONAL' // Condition 满足，合同生效
  | 'SETTLEMENT' // 律师交割
  | 'COMPLETED'; // 交易完成

interface ServiceProvider {
  id: string;
  role: 'BROKER' | 'INSPECTOR' | 'LAWYER';
  name: string;
  avatar: string;
  quote: number; // 报价
  pitch: string; // 留言/优势
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export default function PropertyTradeRoom() {
  const router = useRouter();
  
  // 模拟当前用户身份 (实际从 Supabase Auth 获取)
  const currentUserRole = 'BUYER'; // 可选: 'SELLER', 'BUYER', 'BROKER', 'LAWYER', 'INSPECTOR'
  
  // 模拟房间数据
  const [property] = useState({
    id: 'prop_123',
    title: '奥克兰北岸 3房2卫 全海景别墅',
    address: 'Takapuna, Auckland',
    price: '1,250,000 NZD',
    type: 'NEGOTIATION', // 'AUCTION' 或 'NEGOTIATION'
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80']
  });

  // 核心 OA 状态
  const [currentStage, setCurrentStage] = useState<OaStage>('VIEWING');
  
  // 选项卡状态：详情 | 进度流 | 服务商竞标
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'WORKFLOW' | 'PROVIDERS'>('WORKFLOW');

  // 模拟服务商竞标数据
  const [providers, setProviders] = useState<ServiceProvider[]>([
    { id: 'p1', role: 'INSPECTOR', name: 'John Doe', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', quote: 600, pitch: '拥有15年奥克兰北岸持牌屋检经验，提供加急报告。', status: 'PENDING' },
    { id: 'p2', role: 'BROKER', name: 'Sarah Smith', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', quote: 0, pitch: '熟悉四大行最新利率，可申请高额返现。', status: 'ACCEPTED' },
  ]);

  // --- 🎨 UI 组件：OA 进度时间轴 ---
  const renderWorkflowTimeline = () => {
    const stages: { key: OaStage; label: string; desc: string }[] = [
      { key: 'VIEWING', label: '预约看房', desc: '买家实地考察房屋' },
      ...(property.type === 'AUCTION' ? [{ key: 'AUCTION_PREP' as OaStage, label: '资质认证', desc: '拍卖前资金与身份核验' }] : []),
      { key: 'CONDITIONAL', label: 'Conditional 合同', desc: '买卖双方签署意向与条件' },
      { key: 'DUE_DILIGENCE', label: '尽职调查', desc: 'Broker 贷款审批 & 屋检' },
      { key: 'UNCONDITIONAL', label: 'Unconditional', desc: '条件均满足，合同正式生效' },
      { key: 'SETTLEMENT', label: '律师交割', desc: '处理产权转移与尾款' }
    ];

    const currentIndex = stages.findIndex(s => s.key === currentStage);

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-black text-gray-900 mb-6">交易进度追踪 (OA)</h3>
        <div className="relative border-l-2 border-orange-200 ml-3 space-y-8">
          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isActive = index === currentIndex;
            
            return (
              <div key={stage.key} className="relative pl-6">
                {/* 状态指示节点 */}
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-white ${isCompleted ? 'border-orange-500 bg-orange-500' : isActive ? 'border-orange-500' : 'border-gray-300'}`}>
                  {isCompleted && <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                
                <div>
                  <h4 className={`text-[15px] font-bold ${isActive ? 'text-orange-500' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {stage.label}
                  </h4>
                  <p className="text-[13px] text-gray-500 mt-1">{stage.desc}</p>
                  
                  {/* 当前阶段的操作面板 */}
                  {isActive && currentUserRole === 'BUYER' && (
                    <div className="mt-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100 animate-in fade-in duration-300">
                      {stage.key === 'VIEWING' && (
                         <button onClick={() => setCurrentStage('CONDITIONAL')} className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-full hover:bg-black transition-colors">申请起草合同</button>
                      )}
                      {stage.key === 'DUE_DILIGENCE' && (
                         <div className="flex gap-2">
                           <button onClick={() => setActiveTab('PROVIDERS')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-full hover:border-orange-500 transition-colors">前往大厅选择屋检/贷款</button>
                         </div>
                      )}
                      {/* 根据不同阶段展示不同按钮，触发后端 Supabase 状态更新 */}
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

  // --- 🎨 UI 组件：服务商竞标大厅 ---
  const renderProvidersRoom = () => {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-gray-50 flex flex-col relative pb-20">
      
      {/* 顶部房源概览 */}
      <div className="bg-white pt-10 pb-6 px-5 border-b border-gray-100">
        <button onClick={() => router.back()} className="mb-4 text-gray-400 hover:text-gray-900"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
        <div className="flex gap-4">
          <img src={property.images[0]} className="w-24 h-24 rounded-2xl object-cover shadow-sm" alt="cover" />
          <div className="flex flex-col justify-center">
            <h1 className="text-lg font-black text-gray-900 leading-tight mb-1">{property.title}</h1>
            <p className="text-[13px] text-gray-500 mb-2">{property.address}</p>
            <p className="text-[16px] font-bold text-orange-500">{property.price}</p>
          </div>
        </div>
      </div>

      {/* 选项卡导航 */}
      <div className="flex bg-white border-b border-gray-100 sticky top-0 z-20">
        {[
          { id: 'DETAILS', label: '房源详情' },
          { id: 'WORKFLOW', label: '交易进度' },
          { id: 'PROVIDERS', label: '服务商大厅' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3.5 text-[14px] font-bold transition-colors relative ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-400'}`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-orange-500 rounded-t-full"></div>}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {activeTab === 'DETAILS' && <div className="p-6 bg-white rounded-2xl text-center text-gray-500 text-sm">这里复用你之前的地图和图文详情组件...</div>}
        {activeTab === 'WORKFLOW' && renderWorkflowTimeline()}
        {activeTab === 'PROVIDERS' && renderProvidersRoom()}
      </div>

    </main>
  );
}