'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// --- 🌟 类型定义 ---
type TaskStatus = 'WORKING' | 'TODO' | 'STUCK' | 'DONE';
type TabType = 'TIME' | 'PROPERTY' | 'STATUS' | 'CERTIFICATION';

interface ProviderTask {
  id: string;
  propertyAddress: string;
  clientName: string;
  clientAvatar: string;
  taskTitle: string;
  taskDesc: string;
  dateStr: string;
  timeSlot: string;
  status: TaskStatus;
  timeGroup: 'urgent' | 'next' | 'done';
}

interface RenderGroup {
  id: string;
  title: string;
  themeColor: string;
  tasks: ProviderTask[];
}

// --- 🎨 Monday 风格状态标签 ---
function MondayStatusBadge({ status }: { status: TaskStatus }) {
  const statusConfig = {
    WORKING: { text: '处理中', color: 'bg-[#fdab3d] text-white' },
    TODO: { text: '待开始', color: 'bg-[#c4c4c4] text-white' },
    STUCK: { text: '卡住了', color: 'bg-[#e2445c] text-white' },
    DONE: { text: '已完成', color: 'bg-[#00c875] text-white' },
  };
  const config = statusConfig[status];
  return (
    <div className={`flex items-center justify-center w-[68px] h-[28px] rounded-[4px] text-[12px] font-bold tracking-wide shadow-sm transition-all hover:opacity-90 cursor-pointer ${config.color}`}>
      {config.text}
    </div>
  );
}

// --- 🏷️ 统一的任务卡片组件 ---
function TaskCard({ task, themeColor }: { task: ProviderTask; themeColor: string }) {
  return (
    <div className="bg-white rounded-[12px] border border-gray-200 shadow-sm overflow-hidden flex flex-col group hover:border-gray-300 transition-colors cursor-pointer">
      <div className="flex items-start justify-between p-3 pb-2 border-b border-gray-50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </div>
          <span className="text-[12px] font-bold text-gray-700 truncate">{task.propertyAddress}</span>
        </div>
        <div className="shrink-0 ml-2">
          <MondayStatusBadge status={task.status} />
        </div>
      </div>

      <div className="flex items-stretch relative">
        <div className="w-1.5 shrink-0" style={{ backgroundColor: themeColor }} />
        <div className="flex-1 p-3 pl-2.5">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 shrink-0 w-[72px]">
              <span className="text-[11px] font-medium text-gray-500">{task.dateStr.split(' ')[0]}</span>
              <span className="text-[13px] font-black text-gray-900 mt-0.5">{task.timeSlot.split('-')[0].trim()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-black text-gray-900 leading-tight mb-1">{task.taskTitle}</h3>
              <p className="text-[12px] text-gray-500 leading-snug line-clamp-2">{task.taskDesc}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-2.5 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <img src={task.clientAvatar} alt={task.clientName} className="w-5 h-5 rounded-full border border-gray-200 bg-white" />
          <span className="text-[11px] font-medium text-gray-600">{task.clientName}</span>
        </div>
        <button className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
          进入交易流 <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </div>
  );
}

export default function ProviderWorkspacePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('TIME');

  // 模拟全局任务数据
  const allTasks: ProviderTask[] = [
    { id: 't1', propertyAddress: '12 Marine Parade, Takapuna', clientName: '李雷 (买家)', clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lei', taskTitle: '审查 Title & LIM 报告', taskDesc: '需确认房屋产权无瑕疵，并告知买家潜在风险。', dateStr: '3月12日 (今天)', timeSlot: '14:00 - 16:00', status: 'WORKING', timeGroup: 'urgent' },
    { id: 't4', propertyAddress: '12 Marine Parade, Takapuna', clientName: '李雷 (买家)', clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lei', taskTitle: '信托账户开立与定金确认', taskDesc: '已确认买家 10% 定金进入律所 Trust Account。', dateStr: '3月10日 (周二)', timeSlot: '已完成', status: 'DONE', timeGroup: 'done' },
    { id: 't2', propertyAddress: '50 Albert St, Auckland CBD', clientName: '王梅 (卖家)', clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mei', taskTitle: '起草无条件交割声明', taskDesc: '买家已满足财务条件，需向对方律师发送确信函。', dateStr: '3月13日 (明天)', timeSlot: '09:00 - 10:30', status: 'STUCK', timeGroup: 'urgent' },
    { id: 't3', propertyAddress: '88 Hobsonville Point Rd', clientName: '张伟 (买家)', clientAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wei', taskTitle: '执行最终交割 (Settlement)', taskDesc: '确认尾款到账，操作 LINZ 产权转移。', dateStr: '3月18日 (周三)', timeSlot: '13:00 - 15:00', status: 'TODO', timeGroup: 'next' }
  ];

  const timeGroups: RenderGroup[] = [
    { id: 'g_urgent', title: '🚨 本周紧急任务', themeColor: '#e2445c', tasks: allTasks.filter(t => t.timeGroup === 'urgent') },
    { id: 'g_next', title: '📅 下周日程', themeColor: '#0086c0', tasks: allTasks.filter(t => t.timeGroup === 'next') },
    { id: 'g_done', title: '✅ 近期已完成', themeColor: '#00c875', tasks: allTasks.filter(t => t.timeGroup === 'done') },
  ];

  const propertyGroups: RenderGroup[] = [
    { id: 'p_1', title: '🏠 12 Marine Parade', themeColor: '#a25ddc', tasks: allTasks.filter(t => t.propertyAddress.includes('12 Marine')) },
    { id: 'p_2', title: '🏢 50 Albert St', themeColor: '#fdab3d', tasks: allTasks.filter(t => t.propertyAddress.includes('50 Albert')) },
    { id: 'p_3', title: '🏡 88 Hobsonville Point Rd', themeColor: '#0086c0', tasks: allTasks.filter(t => t.propertyAddress.includes('88 Hobsonville')) },
  ];

  const statusGroups: RenderGroup[] = [
    { id: 's_stuck', title: '⚠️ 卡住了 (Stuck)', themeColor: '#e2445c', tasks: allTasks.filter(t => t.status === 'STUCK') },
    { id: 's_working', title: '⏳ 处理中 (Working)', themeColor: '#fdab3d', tasks: allTasks.filter(t => t.status === 'WORKING') },
    { id: 's_todo', title: '📋 待开始 (To Do)', themeColor: '#c4c4c4', tasks: allTasks.filter(t => t.status === 'TODO') },
    { id: 's_done', title: '✅ 已完成 (Done)', themeColor: '#00c875', tasks: allTasks.filter(t => t.status === 'DONE') },
  ];

  const currentViewGroups = activeTab === 'TIME' ? timeGroups : activeTab === 'PROPERTY' ? propertyGroups : statusGroups;

  // 📝 渲染认证表单视图
  const renderCertificationView = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-2xl p-5 text-white shadow-sm relative overflow-hidden">
        <svg className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[11px] font-black tracking-wider">STATUS</span>
            <h2 className="text-[18px] font-black">已通过官方认证</h2>
          </div>
          <p className="text-[13px] text-emerald-100 font-medium">您的服务商主页已在“服务大厅”向买卖双方展示，可正常接单。</p>
        </div>
      </div>

      <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl p-5 shadow-sm space-y-5">
        <div>
          <h3 className="text-[14px] font-black text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
            基本服务信息
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1.5">真实姓名 / 机构名称</label>
              <input type="text" defaultValue="Jessica Chen (Auckland Legal Partners)" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[14px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1.5">服务角色</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[14px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option>⚖️ 注册过户律师</option>
                  <option>🔍 注册房屋检查师</option>
                  <option>💰 贷款经纪人</option>
                  <option>🔧 维修/清洁团队</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1.5">执业资格号 (选填)</label>
                <input type="text" defaultValue="NZLS-88392" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[14px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
           <h3 className="text-[14px] font-black text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-purple-500 rounded-full"></span>
            资质与证明文件
          </h3>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer group">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </div>
            <p className="text-[13px] font-bold text-gray-900">点击上传更新执业证书 (PDF/JPG)</p>
            <p className="text-[11px] text-gray-500 mt-1">当前已上传: Practicing_Certificate_2026.pdf</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-[#f5f6f8] flex flex-col relative mx-auto">
      
      {/* 顶部导航 */}
      <div className="bg-white pt-4 border-b border-gray-200 sticky top-0 z-30 shadow-sm shadow-black/5">
        <div className="px-4 flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors">
              <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-[18px] font-black text-gray-900 leading-tight">我的任务面板</h1>
              <p className="text-[12px] text-gray-500 font-medium mt-0.5">Jessica Chen (律师)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica" alt="User" />
            </div>
          </div>
        </div>

        {/* 🌟 均匀分布的 Tabs 栏 */}
        <div className="flex items-center justify-between text-[13px] sm:text-[14px] font-bold px-2 sm:px-4 w-full">
          <button 
            onClick={() => setActiveTab('TIME')}
            className={`flex-1 flex justify-center pb-2.5 transition-colors relative ${activeTab === 'TIME' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            时间排期
            {activeTab === 'TIME' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 rounded-t-full" />}
          </button>
          
          <button 
            onClick={() => setActiveTab('PROPERTY')}
            className={`flex-1 flex justify-center pb-2.5 transition-colors relative ${activeTab === 'PROPERTY' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            房产项目
            {activeTab === 'PROPERTY' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 rounded-t-full" />}
          </button>
          
          <button 
            onClick={() => setActiveTab('STATUS')}
            className={`flex-1 flex justify-center pb-2.5 transition-colors relative ${activeTab === 'STATUS' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            状态看板
            {activeTab === 'STATUS' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 rounded-t-full" />}
          </button>
          
          <button 
            onClick={() => setActiveTab('CERTIFICATION')}
            className={`flex-1 flex items-center justify-center gap-1 pb-2.5 transition-colors relative ${activeTab === 'CERTIFICATION' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <svg className="w-3.5 h-3.5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            资质认证
            {activeTab === 'CERTIFICATION' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 rounded-t-full" />}
          </button>
        </div>
      </div>

      {/* 动态渲染区域 */}
      <div className="p-4 space-y-6 pb-24">
        {activeTab === 'CERTIFICATION' ? renderCertificationView() : 
          currentViewGroups.map((group) => {
            if (group.tasks.length === 0) return null;
            return (
              <div key={group.id} className="flex flex-col gap-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 pl-1 sticky top-[108px] bg-[#f5f6f8]/95 backdrop-blur-md py-1.5 z-20 rounded-md">
                  <div 
                    className="w-3.5 h-3.5 rounded-[4px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: group.themeColor }}
                  >
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <h2 className="text-[14px] font-black" style={{ color: group.themeColor }}>
                    {group.title}
                  </h2>
                  <span className="text-[12px] text-gray-400 font-medium ml-1">({group.tasks.length})</span>
                </div>

                <div className="space-y-3">
                  {group.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} themeColor={group.themeColor} />
                  ))}
                </div>
              </div>
            );
          })
        }
      </div>

      {/* 底部悬浮操作按钮 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[640px] mx-auto bg-gradient-to-t from-[#f5f6f8] via-[#f5f6f8] p-4 pb-8 z-40">
        {activeTab === 'CERTIFICATION' ? (
          <button className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-colors shadow-lg shadow-gray-900/20 active:scale-[0.98]">
            保存并更新资料
          </button>
        ) : (
          <button className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-[0.98]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            新建日程或阻碍点 (Stuck)
          </button>
        )}
      </div>

    </main>
  );
}