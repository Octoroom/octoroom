'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// --- 🌟 类型定义 ---
type ProviderStatus = 'WORKING' | 'PENDING' | 'LOOKING' | 'DONE';

interface Provider {
  id: string;
  name: string;
  firm: string;
  role: string;
  status: ProviderStatus;
  avatar?: string;
}

interface ServiceGroup {
  id: string;
  title: string;
  themeColor: string; // 用于 Monday 风格的左侧高亮边框
  providers: Provider[];
}

// --- 🎨 Monday 风格的状态标签组件 ---
function MondayStatusBadge({ status }: { status: ProviderStatus }) {
  const statusConfig = {
    WORKING: { text: '服务中', color: 'bg-[#00c875] text-white' }, // Monday 经典绿
    DONE: { text: '已完成', color: 'bg-[#0086c0] text-white' }, // Monday 经典蓝
    PENDING: { text: '待确认', color: 'bg-[#fdab3d] text-white' }, // Monday 经典橙黄
    LOOKING: { text: '寻找中', color: 'bg-[#c4c4c4] text-white' }, // Monday 经典灰
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center justify-center w-[72px] h-[30px] rounded-[4px] text-[12px] font-bold tracking-wide shadow-sm transition-all hover:opacity-90 cursor-pointer ${config.color}`}>
      {config.text}
    </div>
  );
}

export default function ProvidersPage() {
  const router = useRouter();

  // 模拟 Monday 风格的分组数据
  const [groups] = useState<ServiceGroup[]>([
    {
      id: 'group_legal',
      title: '⚖️ 法律服务 (Legal)',
      themeColor: '#a25ddc', // 紫色
      providers: [
        {
          id: 'p1',
          name: 'Jessica Chen',
          firm: 'Auckland Legal Partners',
          role: '买方过户律师',
          status: 'WORKING',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
        }
      ]
    },
    {
      id: 'group_inspection',
      title: '🔍 房屋检查 (Inspection)',
      themeColor: '#0086c0', // 蓝色
      providers: [
        {
          id: 'p2',
          name: 'David Smith',
          firm: 'BuildSafe NZ',
          role: '注册建筑师 (Builder)',
          status: 'PENDING',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
        },
        {
          id: 'p3',
          name: '待分配',
          firm: '毒物检测机构',
          role: 'Meth Testing',
          status: 'LOOKING',
        }
      ]
    },
    {
      id: 'group_finance',
      title: '💰 贷款与财务 (Finance)',
      themeColor: '#00c875', // 绿色
      providers: [
        {
          id: 'p4',
          name: 'Michael Wong',
          firm: 'Apex Mortgage NZ',
          role: '贷款经纪人 (Broker)',
          status: 'DONE',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
        }
      ]
    }
  ]);

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-[#f5f6f8] flex flex-col relative mx-auto">
      
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-4 border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[18px] font-black text-gray-900 leading-tight">服务商工作台</h1>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">管理您的购房服务团队</p>
          </div>
        </div>
        
        {/* 添加按钮 */}
        <button className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-700 shadow-sm transition-transform active:scale-95">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      {/* Monday 风格的分组列表 */}
      <div className="p-4 space-y-6 pb-24">
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            
            {/* 分组头部 */}
            <div className="flex items-center gap-2 mb-1 pl-1">
              <div 
                className="w-4 h-4 rounded-[4px] flex items-center justify-center"
                style={{ backgroundColor: group.themeColor }}
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <h2 className="text-[15px] font-black" style={{ color: group.themeColor }}>
                {group.title}
              </h2>
            </div>

            {/* 卡片容器 (模拟 Monday 的表格行) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {group.providers.map((provider, index) => (
                <div 
                  key={provider.id} 
                  className={`flex items-center gap-3 p-3 transition-colors hover:bg-gray-50 ${
                    index !== group.providers.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* Monday 风格的左侧颜色条指示器 */}
                  <div 
                    className="w-1.5 h-10 rounded-full" 
                    style={{ backgroundColor: group.themeColor }}
                  />

                  {/* 头像与信息 */}
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    {provider.avatar ? (
                      <img src={provider.avatar} alt={provider.name} className="w-10 h-10 rounded-full border border-gray-100 bg-gray-50 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                    )}
                    
                    <div className="flex flex-col truncate">
                      <span className="text-[14px] font-bold text-gray-900 truncate">
                        {provider.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mt-0.5 truncate">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded-md text-gray-600 shrink-0">
                          {provider.role}
                        </span>
                        <span className="truncate">{provider.firm}</span>
                      </div>
                    </div>
                  </div>

                  {/* 状态方块与操作 */}
                  <div className="flex items-center gap-3 shrink-0">
                    <MondayStatusBadge status={provider.status} />
                    
                    {/* 联系按钮 (仅当有具体人员时显示) */}
                    <button 
                      className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                        provider.status === 'LOOKING' 
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                          : 'border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      disabled={provider.status === 'LOOKING'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

      {/* 底部悬浮：寻找新服务商 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[640px] mx-auto bg-gradient-to-t from-[#f5f6f8] via-[#f5f6f8] p-4 pb-8 z-40">
        <button className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-700 font-bold py-3.5 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          在服务商大厅寻找更多专家
        </button>
      </div>

    </main>
  );
}