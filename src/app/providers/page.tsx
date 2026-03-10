'use client';

import { useState, useMemo } from 'react';
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
  themeColor: string; 
  providers: Provider[];
}

// --- 🎨 图标映射组件 ---
// 根据分类 ID 返回对应的矢量图标
function CategoryIcon({ id, className = "w-4 h-4" }: { id: string, className?: string }) {
  switch (id) {
    case 'group_lawyer': // 过户律师 (天平)
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      );
    case 'group_inspector': // 屋检师 (带勾的检查板)
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case 'group_broker': // 贷款broker (货币符号)
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'group_valuer': // 估价师 (价格标签)
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      );
    case 'group_photographer': // 房屋摄影师 (相机)
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'group_staging': // Homestaging (火花/闪亮，寓意美化)
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    case 'ALL': // 全部分类 (网格)
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    default:
      return null;
  }
}

// --- 🎨 Monday 风格的状态标签组件 ---
function MondayStatusBadge({ status }: { status: ProviderStatus }) {
  const statusConfig = {
    WORKING: { text: '服务中', color: 'bg-[#00c875] text-white' }, 
    DONE: { text: '已完成', color: 'bg-[#0086c0] text-white' }, 
    PENDING: { text: '待确认', color: 'bg-[#fdab3d] text-white' }, 
    LOOKING: { text: '寻找中', color: 'bg-[#c4c4c4] text-white' }, 
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

  // 搜索与高级过滤状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // 配置包含 6 个核心分类的分组数据
  const [groups] = useState<ServiceGroup[]>([
    {
      id: 'group_lawyer',
      title: '过户律师',
      themeColor: '#a25ddc', // 经典紫
      providers: [
        {
          id: 'p1',
          name: 'Jessica Chen',
          firm: 'Auckland Legal Partners',
          role: 'Property Lawyer',
          status: 'WORKING',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
        }
      ]
    },
    {
      id: 'group_inspector',
      title: '屋检师',
      themeColor: '#0086c0', // 经典蓝
      providers: [
        {
          id: 'p2',
          name: 'David Smith',
          firm: 'BuildSafe NZ',
          role: 'Registered Inspector',
          status: 'PENDING',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
        }
      ]
    },
    {
      id: 'group_broker',
      title: '贷款broker',
      themeColor: '#00c875', // 经典绿
      providers: [
        {
          id: 'p3',
          name: 'Michael Wong',
          firm: 'Apex Mortgage NZ',
          role: 'Mortgage Advisor',
          status: 'DONE',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
        }
      ]
    },
    {
      id: 'group_valuer',
      title: '估价师',
      themeColor: '#ff7575', // 红色
      providers: [
        {
          id: 'p4',
          name: '待分配',
          firm: '需注册估价机构',
          role: 'Registered Valuer',
          status: 'LOOKING',
        }
      ]
    },
    {
      id: 'group_photographer',
      title: '房屋摄影师',
      themeColor: '#fdab3d', // 橙黄
      providers: [] // 模拟空状态
    },
    {
      id: 'group_staging',
      title: 'Homestaging',
      themeColor: '#e2445c', // 玫瑰红
      providers: [
        {
          id: 'p5',
          name: 'Sophie Taylor',
          firm: 'Elegance Staging',
          role: 'Interior Stylist',
          status: 'PENDING',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
        }
      ]
    }
  ]);

  // 提取所有分类用于顶部过滤选项
  const categories = [
    { id: 'ALL', title: '全部分类' },
    ...groups.map(g => ({ id: g.id, title: g.title }))
  ];

  // 过滤逻辑
  const filteredGroups = useMemo(() => {
    return groups.map(group => {
      // 分类过滤
      if (selectedCategory !== 'ALL' && group.id !== selectedCategory) {
        return { ...group, providers: [] };
      }

      // 文本过滤
      const filteredProviders = group.providers.filter(p => {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.firm.toLowerCase().includes(query) ||
          p.role.toLowerCase().includes(query)
        );
      });

      return { ...group, providers: filteredProviders };
    }).filter(group => group.providers.length > 0); // 隐藏没有数据的分组
  }, [groups, searchQuery, selectedCategory]);

  return (
    <div className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-[#f5f6f8] flex flex-col relative mx-auto">
      
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-30 flex items-center justify-between">
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

      {/* 🔍 高级搜索与过滤区 */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 shadow-sm z-20 sticky top-[73px]">
        {/* 搜索框 */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="搜索姓名、公司或角色..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            </button>
          )}
        </div>

        {/* 分类标签 (Pills) - 改为自动换行 */}
        <div className="flex flex-wrap gap-2 pb-1">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                // 移除了 shrink-0，保留 whitespace-nowrap 确保文字本身不折行
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <CategoryIcon id={category.id} className="w-3.5 h-3.5" />
                {category.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Monday 风格的分组列表 */}
      <div className="p-4 space-y-6 pb-28">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-gray-900 font-bold text-sm">暂无相关服务商</h3>
            <p className="text-gray-500 text-xs mt-1">您可以调整搜索或直接去大厅寻找</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              
              {/* 分组头部：带有主题色和独立图标 */}
              <div className="flex items-center gap-2 mb-1 pl-1">
                <div 
                  className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: group.themeColor }}
                >
                  <CategoryIcon id={group.id} className="w-3.5 h-3.5 text-white" />
                </div>
                <h2 className="text-[15px] font-black" style={{ color: group.themeColor }}>
                  {group.title}
                </h2>
                <span className="text-gray-400 text-xs ml-1 font-medium">{group.providers.length}</span>
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
                      className="w-1.5 h-10 rounded-full shrink-0" 
                      style={{ backgroundColor: group.themeColor }}
                    />

                    {/* 头像与信息 */}
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      {provider.avatar ? (
                        <img src={provider.avatar} alt={provider.name} className="w-10 h-10 rounded-full border border-gray-100 bg-gray-50 shrink-0 object-cover" />
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
          ))
        )}
      </div>

      {/* 底部悬浮：寻找新服务商 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[640px] mx-auto bg-gradient-to-t from-[#f5f6f8] via-[#f5f6f8] p-4 pb-8 z-40">
        <button className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-700 font-bold py-3.5 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          在服务商大厅寻找更多专家
        </button>
      </div>

    </div>
  );
}