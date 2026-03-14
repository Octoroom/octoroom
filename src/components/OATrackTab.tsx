'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// 传入 propertyId，让组件自己去查数据
export default function OATrackTab({ propertyId }: { propertyId: string }) {
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // 模拟倒计时：明天和下周
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

  useEffect(() => {
    let channel: any = null;

    const fetchOffer = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // 去查当前买家对这套房子的 Offer
      const { data, error } = await supabase
        .from('octo_offers')
        .select('*, octo_properties(id, author_name)')
        .eq('property_id', propertyId)
        .eq('buyer_id', user.id)
        .single();

      if (data) {
        setOffer(data);
        
        // 开启实时监听，房东一签字，UI 瞬间变绿
        channel = supabase
          .channel('oa-status-updates')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'octo_offers', filter: `id=eq.${data.id}` },
            (payload) => {
              setOffer((prev: any) => ({ ...prev, status: payload.new.status }));
            }
          )
          .subscribe();
      }
      setLoading(false);
    };

    fetchOffer();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [propertyId]);

  if (loading) return <div className="py-20 text-center text-gray-400 font-bold">同步交易数据中...</div>;
  if (!offer) return (
    <div className="py-20 text-center flex flex-col items-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      </div>
      <p className="text-gray-500 font-bold">暂无交易进程</p>
      <p className="text-sm text-gray-400 mt-1">您尚未对该房源提交有效 Offer</p>
    </div>
  );

  // 根据真实的数据库状态判定进度
  const isAccepted = offer.status === 'accepted' || offer.status === 'sold';

  // 构造步骤流数据 (完美适配你截图的文案)
  const steps = [
    {
      id: 'step_1',
      title: '签署 S&P 购房协议',
      desc: '买卖双方已完成线上电子签名。',
      role: 'SYSTEM',
      status: 'COMPLETED',
      dateStr: `完成于 ${new Date(offer.created_at).toLocaleDateString()}`
    },
    {
      id: 'step_2',
      title: '房东审核出价并签字',
      desc: `正在等待房东 ${offer.octo_properties?.author_name || ''} 审核您的出价并完成签名。`,
      role: 'SELLER',
      status: isAccepted ? 'COMPLETED' : 'IN_PROGRESS', 
      timeLeft: !isAccepted ? '23小时 59分' : null
    },
    {
      id: 'step_3',
      title: '买家支付 10% 定金',
      desc: '请将定金打入中介或律师的 Trust Account (信托账户)。',
      role: 'BUYER',
      status: isAccepted ? 'IN_PROGRESS' : 'PENDING',
      timeLeft: isAccepted ? '23小时 59分' : null
    },
    {
      id: 'step_4',
      title: '律师审查 Title & LIM 报告',
      desc: '买方律师需确认房屋产权无瑕疵，并审查政府档案。',
      role: 'LAWYER',
      status: 'PENDING',
      timeLeft: '6天 23小时 59分'
    }
  ];

  // 渲染不同的角色 Tag 和左侧图标
  const renderRoleHeader = (role: string) => {
    switch(role) {
      case 'SYSTEM': return <div className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-t-xl">系统节点</div>;
      case 'BUYER': return <div className="bg-blue-100/50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-t-xl">买家任务</div>;
      case 'SELLER': return <div className="bg-purple-100/50 text-purple-600 text-xs font-bold px-3 py-1.5 rounded-t-xl">卖家任务</div>;
      case 'LAWYER': return <div className="bg-green-100/50 text-green-600 text-xs font-bold px-3 py-1.5 rounded-t-xl">律师跟进</div>;
    }
  };

  const renderIcon = (role: string, status: string) => {
    if (status === 'COMPLETED') {
      return (
        <div className="w-12 h-12 bg-emerald-500 rounded-full border-4 border-emerald-100 flex items-center justify-center shadow-sm z-10">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
      );
    }
    if (role === 'BUYER' || role === 'SELLER') {
      return (
        <div className={`w-12 h-12 rounded-full border-4 z-10 overflow-hidden ${status === 'IN_PROGRESS' ? 'border-orange-500 ring-4 ring-orange-100' : 'border-gray-200'}`}>
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`} alt="avatar" className="w-full h-full bg-orange-50" />
        </div>
      );
    }
    if (role === 'LAWYER') {
      return (
        <div className={`w-12 h-12 rounded-full border-4 z-10 overflow-hidden ${status === 'IN_PROGRESS' ? 'border-green-500' : 'border-gray-200 opacity-50'}`}>
           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Lawyer`} alt="lawyer" className="w-full h-full bg-gray-100" />
        </div>
      );
    }
    return <div className="w-12 h-12 rounded-full border-4 border-gray-200 bg-white z-10"></div>;
  };

  return (
    <div className="pt-6 pb-24">
      <h2 className="text-xl font-black text-gray-900 mb-8 px-2">交易流追踪 (OA)</h2>
      
      {/* 相对定位的容器，左侧画一条贯穿的垂直灰线 */}
      <div className="relative before:absolute before:inset-y-0 before:left-6 before:w-0.5 before:bg-gray-100 ml-2 space-y-10">
        
        {steps.map((step) => (
          <div key={step.id} className="relative flex gap-4 pl-0 pr-4">
            {/* 左侧图标 */}
            <div className="shrink-0 -ml-[22px]">
              {renderIcon(step.role, step.status)}
            </div>

            {/* 右侧卡片 (完全复刻你的截图UI) */}
            <div className={`flex-1 rounded-xl bg-white border ${
              step.status === 'IN_PROGRESS' ? 'border-orange-200 shadow-md ring-1 ring-orange-50' : 'border-gray-100 shadow-sm'
            }`}>
              {/* 顶部 Tag */}
              {renderRoleHeader(step.role)}
              
              {/* 卡片主体 */}
              <div className={`p-4 ${step.status === 'PENDING' ? 'opacity-50' : ''}`}>
                <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">{step.desc}</p>
                
                {/* 底部状态行 */}
                <div className="flex items-center justify-between">
                  {step.status === 'COMPLETED' && step.dateStr && (
                    <span className="text-sm font-bold text-emerald-500">{step.dateStr}</span>
                  )}
                  
                  {step.status === 'IN_PROGRESS' && step.timeLeft && (
                    <span className="text-sm font-bold text-orange-500 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      剩余: {step.timeLeft}
                    </span>
                  )}

                  {step.status === 'PENDING' && step.timeLeft && (
                    <span className="text-sm font-bold text-gray-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      剩余: {step.timeLeft}
                    </span>
                  )}

                  {/* 行动按钮 */}
                  {step.status === 'IN_PROGRESS' && step.role === 'BUYER' && (
                    <button className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors shadow-md shadow-orange-200">
                      去处理 &rarr;
                    </button>
                  )}
                  {step.status === 'IN_PROGRESS' && step.role === 'SELLER' && (
                    <span className="text-xs font-bold text-orange-500 animate-pulse bg-orange-50 px-2 py-1 rounded">等待对方</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}