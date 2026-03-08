'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// --- 🌟 类型定义 ---
type Role = 'BUYER' | 'SELLER' | 'LAWYER' | 'SYSTEM';
type StepStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'OVERDUE';

interface OAStep {
  id: string;
  title: string;
  description: string;
  role: Role;
  status: StepStatus;
  dueDate?: string; // ISO 格式时间
  completedAt?: string;
}

// --- ⏱️ 倒计时组件 ---
function CountdownBadge({ dueDate, status }: { dueDate: string; status: StepStatus }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (status === 'COMPLETED') return;

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

  if (status === 'COMPLETED') return null;

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
  
  // 模拟数据：今天之后的日期，用于演示倒计时
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

  // 模拟律师数据
  const lawyer = {
    name: 'Jessica Chen',
    role: '买方过户律师',
    firm: 'Auckland Legal Partners',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
    phone: '09 123 4567'
  };

  // 模拟 OA 流程节点
  const steps: OAStep[] = [
    {
      id: 'step_1',
      title: '签署 S&P 购房协议',
      description: '买卖双方已完成线上电子签名。',
      role: 'SYSTEM',
      status: 'COMPLETED',
      completedAt: '2026-03-08T10:00:00Z'
    },
    {
      id: 'step_2',
      title: '买家支付 10% 定金',
      description: '请将定金打入中介或律师的 Trust Account (信托账户)。',
      role: 'BUYER',
      status: 'IN_PROGRESS',
      dueDate: tomorrow
    },
    {
      id: 'step_3',
      title: '律师审查 Title & LIM 报告',
      description: '买方律师需确认房屋产权无瑕疵，并审查政府档案。',
      role: 'LAWYER',
      status: 'PENDING',
      dueDate: nextWeek
    },
    {
      id: 'step_4',
      title: '无条件交割日 (Unconditional)',
      description: '所有购房条件（如贷款、屋检）满足，合同正式生效。',
      role: 'SYSTEM',
      status: 'PENDING'
    },
    {
      id: 'step_5',
      title: '房屋交割 (Settlement)',
      description: '尾款结清，律师完成 LINZ 产权转移，买家拿钥匙。',
      role: 'SYSTEM',
      status: 'PENDING'
    }
  ];

  const getRoleBadge = (role: Role) => {
    switch(role) {
      case 'BUYER': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black">买家任务</span>;
      case 'SELLER': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black">卖家任务</span>;
      case 'LAWYER': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black">律师跟进</span>;
      case 'SYSTEM': return <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-black">系统节点</span>;
    }
  };

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-gray-50 flex flex-col relative">
      
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-30 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-50 rounded-full">
          <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-[16px] font-black text-gray-900 leading-tight">交易控制台 (OA)</h1>
          <p className="text-[12px] text-gray-500 font-medium">12 Marine Parade, Takapuna</p>
        </div>
      </div>

      {/* 律师信息卡片 (服务商大厅选定后的结果) */}
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
        <h2 className="text-[15px] font-black text-gray-900 mb-6">交易进度</h2>
        
        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
          {steps.map((step, index) => (
            <div key={step.id} className="relative pl-6">
              {/* 时间轴圆点 */}
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center
                ${step.status === 'COMPLETED' ? 'border-green-500 bg-green-500' : 
                  step.status === 'IN_PROGRESS' ? 'border-orange-500 ring-4 ring-orange-100' : 
                  'border-gray-300'}
              `}>
                {step.status === 'COMPLETED' && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                )}
              </div>

              {/* 卡片内容 */}
              <div className={`bg-white rounded-[16px] p-4 border transition-all ${
                step.status === 'IN_PROGRESS' ? 'border-orange-200 shadow-md ring-1 ring-orange-50' : 'border-gray-100 shadow-sm opacity-90'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1.5">
                    {getRoleBadge(step.role)}
                    <h3 className={`text-[15px] font-black ${step.status === 'PENDING' ? 'text-gray-500' : 'text-gray-900'}`}>
                      {step.title}
                    </h3>
                  </div>
                </div>
                
                <p className="text-[13px] text-gray-500 leading-relaxed mb-3">
                  {step.description}
                </p>

                {/* 状态与倒计时显示 */}
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-50">
                  {step.status === 'COMPLETED' ? (
                    <span className="text-[12px] font-bold text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      完成于 {new Date(step.completedAt!).toLocaleDateString()}
                    </span>
                  ) : step.dueDate ? (
                    <CountdownBadge dueDate={step.dueDate} status={step.status} />
                  ) : (
                    <span className="text-[12px] font-medium text-gray-400">等待前置任务完成</span>
                  )}

                  {/* 行动按钮 */}
                  {step.status === 'IN_PROGRESS' && step.role === 'BUYER' && (
                    <button className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold hover:bg-orange-600 transition-colors">
                      去处理 &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部悬浮操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[640px] mx-auto bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 pb-8 z-40">
        <button className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-transform active:scale-[0.98] shadow-lg flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          在交易群内联系各方
        </button>
      </div>

    </main>
  );
}