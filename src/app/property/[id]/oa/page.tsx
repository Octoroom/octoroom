'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// --- 🌟 类型定义 ---
type Role = 'BUYER' | 'SELLER' | 'LAWYER' | 'SYSTEM';
type StepStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'OVERDUE';

interface OAStep {
  id: string;
  title: string;
  description: string;
  role: Role;
  status: StepStatus;
  dueDate?: string;
  completedAt?: string;
}

// --- ⏱️ 倒计时组件 ---
function CountdownBadge({ dueDate, status }: { dueDate: string; status: StepStatus }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (status === 'COMPLETED' || !dueDate) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(dueDate).getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setIsOverdue(true);
        setTimeLeft('已逾期');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${days}天 ${hours}小时 ${mins}分`);
    }, 1000);

    return () => clearInterval(timer);
  }, [dueDate, status]);

  if (status === 'COMPLETED' || !dueDate) return null;

  return (
    <div className={`flex items-center gap-1 mt-2 px-2.5 py-1 w-max rounded-md text-[12px] font-bold ${
      isOverdue ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
    }`}>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {isOverdue ? '逾期' : '剩余: '} {timeLeft}
    </div>
  );
}

export default function OAFlowPage() {
  const router = useRouter();
  const params = useParams();
  // 🌟 核心：现在的 ID 是房源 ID
  const propertyId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<any>(null);
  
  // 模拟数据：用于演示倒计时
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

  // 🌟 1. 核心获取数据逻辑 & 实时监听
  useEffect(() => {
    let channel: any = null;

    const fetchOffer = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      if (!propertyId) {
        console.error("URL 中没有获取到 propertyId");
        setLoading(false);
        return;
      }

      console.log(`🔎 正在尝试获取 OA 数据 | 房源ID: ${propertyId} | 买家ID: ${user.id}`);

      // 联表查询：通过 property_id 和 buyer_id 找到那条 Offer
      const { data, error } = await supabase
        .from('octo_offers')
        .select('*, octo_properties(id, author_name)')
        .eq('property_id', propertyId)
        .eq('buyer_id', user.id)
        .single();

      if (error) {
        console.error("❌ 查询数据库出错或者没找到数据:", error.message);
      }

      if (data) {
        console.log("✅ 成功拿到 Offer 数据:", data);
        setOffer(data);
        
        // 监听房东签字导致的状态变化，注意这里用的是真实的 offer.id
        channel = supabase
          .channel('oa-status-updates')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'octo_offers', filter: `id=eq.${data.id}` },
            (payload) => {
              console.log('🔥 收到房东操作，OA 节点状态更新:', payload);
              setOffer((prev: any) => ({ ...prev, status: payload.new.status }));
            }
          )
          .subscribe();
      }
      setLoading(false);
    };

    fetchOffer();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [propertyId, router]);


  // 🌟 2. 根据真实的数据库状态，动态生成 OA 节点！
  const isAccepted = offer?.status === 'accepted' || offer?.status === 'sold';

  const steps: OAStep[] = offer ? [
    {
      id: 'step_1',
      title: '买家签署 S&P 购房协议',
      description: '买方已完成线上电子签名，Offer 正式生成。',
      role: 'BUYER',
      status: 'COMPLETED',
      completedAt: offer.created_at
    },
    {
      id: 'step_2',
      title: '房东审核并签字确认',
      description: `正在等待房东 ${offer.octo_properties?.author_name || ''} 审核您的出价并完成签名。`,
      role: 'SELLER',
      status: isAccepted ? 'COMPLETED' : 'IN_PROGRESS', 
      dueDate: !isAccepted ? tomorrow : undefined
    },
    {
      id: 'step_3',
      title: '买家支付 10% 定金',
      description: '请将定金打入中介或律师的 Trust Account (信托账户)。',
      role: 'BUYER',
      status: isAccepted ? 'IN_PROGRESS' : 'PENDING', 
      dueDate: isAccepted ? nextWeek : undefined
    },
    {
      id: 'step_4',
      title: '律师审查 Title & LIM 报告',
      description: '买方律师需确认房屋产权无瑕疵，并审查政府档案。',
      role: 'LAWYER',
      status: 'PENDING'
    },
    {
      id: 'step_5',
      title: '无条件交割日 (Unconditional)',
      description: '所有购房条件满足，合同正式生效。',
      role: 'SYSTEM',
      status: 'PENDING'
    }
  ] : [];

  const lawyer = {
    name: 'Jessica Chen',
    role: '买方过户律师',
    firm: 'Auckland Legal Partners',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
  };

  const getRoleBadge = (role: Role) => {
    switch(role) {
      case 'BUYER': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black">买家任务</span>;
      case 'SELLER': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black">卖家任务</span>;
      case 'LAWYER': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black">律师跟进</span>;
      case 'SYSTEM': return <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-black">系统节点</span>;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400 font-bold">同步加密网络中...</div>;
  
  // 🌟 如果报错找不到，多加一句调试提示
  if (!offer) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-red-400 font-bold">
      <p>找不到该交易案卷</p>
      <p className="text-xs text-gray-400 mt-2 font-mono">Property ID: {propertyId}</p>
    </div>
  );

  return (
    <main className="flex-1 max-w-[640px] mx-auto w-full min-h-screen border-x border-gray-100 bg-gray-50 flex flex-col relative">
      
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-30 flex items-center gap-3">
        <button onClick={() => router.push('/')} className="p-2 -ml-2 hover:bg-gray-50 rounded-full">
          <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-[16px] font-black text-gray-900 leading-tight">交易控制台 (OA)</h1>
          <p className="text-[12px] text-gray-500 font-mono mt-0.5">Prop ID: {offer.property_id.slice(0,8)}...</p>
        </div>
      </div>

      {/* 律师信息卡片 */}
      <div className="p-4">
        <div className="bg-white rounded-[16px] p-4 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-[13px] font-black text-gray-900">我的法律代表</h2>
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
      </div>

      {/* OA 时间轴列表 */}
      <div className="px-5 pb-24 pt-2">
        <h2 className="text-[15px] font-black text-gray-900 mb-6">交易节点同步</h2>
        
        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
          {steps.map((step, index) => (
            <div key={step.id} className="relative pl-6">
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center
                ${step.status === 'COMPLETED' ? 'border-green-500 bg-green-500' : 
                  step.status === 'IN_PROGRESS' ? 'border-orange-500 ring-4 ring-orange-100' : 
                  'border-gray-300'}
              `}>
                {step.status === 'COMPLETED' && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                )}
              </div>

              <div className={`bg-white rounded-[16px] p-4 border transition-all duration-500 ${
                step.status === 'IN_PROGRESS' ? 'border-orange-200 shadow-lg ring-1 ring-orange-50 scale-[1.02]' : 'border-gray-100 shadow-sm opacity-90'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1.5">
                    {getRoleBadge(step.role)}
                    <h3 className={`text-[15px] font-black ${step.status === 'PENDING' ? 'text-gray-400' : 'text-gray-900'}`}>
                      {step.title}
                    </h3>
                  </div>
                </div>
                
                <p className={`text-[13px] leading-relaxed mb-3 ${step.status === 'PENDING' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {step.description}
                </p>

                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-50">
                  {step.status === 'COMPLETED' ? (
                    <span className="text-[12px] font-bold text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {step.completedAt ? `完成于 ${new Date(step.completedAt).toLocaleDateString()}` : '已完成'}
                    </span>
                  ) : step.dueDate ? (
                    <CountdownBadge dueDate={step.dueDate} status={step.status} />
                  ) : (
                    <span className="text-[12px] font-medium text-gray-400 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      等待前置任务解锁
                    </span>
                  )}

                  {step.status === 'IN_PROGRESS' && step.role === 'BUYER' && (
                    <button className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold shadow-md hover:bg-orange-600 active:scale-95 transition-all">
                      去处理 &rarr;
                    </button>
                  )}
                  {step.status === 'IN_PROGRESS' && step.role === 'SELLER' && (
                    <span className="text-[12px] font-bold text-orange-500 animate-pulse">正在等待对方处理...</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[640px] mx-auto bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 pb-8 z-40">
        <button className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-transform active:scale-[0.98] shadow-lg flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          在交易群内催办
        </button>
      </div>
    </main>
  );
}