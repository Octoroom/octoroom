'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// --- 🌟 Types & Interfaces ---
type ProviderStatus = 'WORKING' | 'PENDING' | 'LOOKING' | 'DONE';

interface Condition {
  id: string;
  name: string;
  dueDate: string;
  status: 'PENDING' | 'WAITING' | 'MET' | 'FAILED';
}

interface ActivityLog {
  id: string;
  type: 'CALL' | 'VIEWING' | 'EMAIL' | 'OFFER' | 'NOTE';
  content: string;
  timestamp: string;
  agentName: string;
}

interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  maxBudget: string;
  financeStatus: 'CASH' | 'CONDITIONAL' | 'UNAPPROVED';
  status: ProviderStatus;
  conditions: Condition[];
  offerHistory: {
    status: 'DRAFT' | 'SENT' | 'INITIALED' | 'NEGOTIATING' | 'ACCEPTED';
    date: string;
    price: string;
  }[];
  lastFollowUp: string;
  nextAction: string;
  roleDescription?: string;
  company?: string;
}

interface ManagedProperty {
  id: string;
  address: string;
  vendor: string;
  image: string;
  status: 'ACTIVE' | 'SOLD' | 'WITHDRAWN';
  activeBuyers: number;
  scheduledViewings: number;
  themeColor: string;
}

interface Lawyer {
  id: string;
  full_name: string;
  username: string;
}

// --- 🎨 Components from Providers Page Style ---
function CategoryIcon({ id, className = "w-4 h-4" }: { id: string, className?: string }) {
  switch (id) {
    case 'PROPERTIES':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'BUYERS':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'STATS':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    default:
      return null;
  }
}

function MondayStatusBadge({ status }: { status: ProviderStatus }) {
  const statusConfig = {
    WORKING: { text: '服务中', color: 'bg-[#00c875] text-white' }, 
    DONE: { text: '出价已推送', color: 'bg-[#0086c0] text-white' }, 
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

// --- 📊 Mock Data (Temporarily still used for pipeline while crm_contacts remains personal) ---
const MOCKED_PROPERTIES: ManagedProperty[] = [
  {
    id: '17419957-de38-4e16-ba44-3fadf6c468c1',
    address: '110 Tihi Street, Stonefields',
    vendor: 'John & Jane Doe',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    status: 'ACTIVE',
    activeBuyers: 4,
    scheduledViewings: 12,
    themeColor: '#ff7575',
  }
];

const MOCKED_PIPELINE: Record<string, Buyer[]> = {
  '17419957-de38-4e16-ba44-3fadf6c468c1': [
    {
      id: 'b1',
      name: 'Alice Johnson',
      email: 'alice.j@example.com',
      phone: '021 123 4567',
      maxBudget: '$1,950,000',
      financeStatus: 'CONDITIONAL',
      status: 'WORKING',
      roleDescription: 'Cash Buyer (Approved)',
      company: 'Auckland Real Estate Investors',
      conditions: [
        { id: 'c1', name: 'Finance', dueDate: '2026-03-25', status: 'WAITING' },
        { id: 'c2', name: 'Building', dueDate: '2026-03-20', status: 'MET' }
      ],
      offerHistory: [{ status: 'NEGOTIATING', date: '2h ago', price: '$1,850,000' }],
      lastFollowUp: 'Today, 10:00 AM',
      nextAction: 'Follow up on finance letter'
    },
    {
      id: 'b2',
      name: 'David Chen',
      email: 'david.c@example.com',
      phone: '022 987 6543',
      maxBudget: '$1,800,000',
      financeStatus: 'CASH',
      status: 'PENDING',
      roleDescription: 'First Home Buyer',
      company: 'Tech Professionals Coop',
      conditions: [],
      offerHistory: [{ status: 'SENT', date: 'Yesterday', price: '$1,780,000' }],
      lastFollowUp: 'Yesterday, 3:30 PM',
      nextAction: 'Private viewing scheduled for Sat'
    }
  ]
};

const MOCKED_ACTIVITY: Record<string, ActivityLog[]> = {
  'b1': [
    { id: 'a1', type: 'CALL', content: 'Discussed finance status. Bank letter expected by Friday.', timestamp: 'today 10:00 AM', agentName: 'Jerry Agent' },
  ]
};

export default function AgentWorkspacePage() {
  const router = useRouter();
  const [selectedPropertyId, setSelectedPropertyId] = useState(MOCKED_PROPERTIES[0].id);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [cloudBuyers, setCloudBuyers] = useState<Buyer[]>([]);
  const [loadingCloudData, setLoadingCloudData] = useState(false);

  // --- 📝 Add Customer Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    type: 'BUYER',
    solicitor_id: ''
  });

  const currentProperty = MOCKED_PROPERTIES.find(p => p.id === selectedPropertyId)!;
  // Combine mocked pipeline with cloud-synced buyers
  const pipeline = [...(MOCKED_PIPELINE[selectedPropertyId] || []), ...cloudBuyers];
  const selectedBuyer = pipeline.find(b => b.id === selectedBuyerId);
  const activities = selectedBuyerId ? (MOCKED_ACTIVITY[selectedBuyerId] || []) : [];

  useEffect(() => {
    async function fetchCloudBuyers(agentId: string) {
      setLoadingCloudData(true);
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('agent_id', agentId)
        .eq('type', 'BUYER');

      if (!error && data) {
        const mappedBuyers: Buyer[] = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone || '',
          maxBudget: '$0 (Synced)', // Can be extended if field exists
          financeStatus: 'UNAPPROVED',
          status: (c.status as ProviderStatus) || 'PENDING',
          conditions: [],
          offerHistory: [],
          lastFollowUp: 'N/A',
          nextAction: 'Synced from CRM',
          roleDescription: 'Cloud Client',
          company: c.address || 'Unknown Address'
        }));
        setCloudBuyers(mappedBuyers);
      }
      setLoadingCloudData(false);
    }

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAuthorizing(false);
        return;
      }
      setCurrentAgentId(session.user.id);
      fetchCloudBuyers(session.user.id); // Fetch real buyers here
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      setUserRole(profile?.role || null);
      setIsAuthorizing(false);
    }
    checkAuth();

    async function fetchLawyers() {
      const { data } = await supabase.from('profiles').select('id, full_name, username').eq('role', 'LAWYER');
      if (data) setLawyers(data);
    }
    fetchLawyers();
  }, []);

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgentId) {
      alert('请先登录。');
      return;
    }
    
    setFormLoading(true);
    
    const { error } = await supabase
      .from('crm_contacts')
      .insert({
        agent_id: currentAgentId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        type: formData.type,
        solicitor_id: formData.solicitor_id || null,
        status: 'PENDING'
      });

    if (error) {
      console.error('Persistence error:', error);
      alert('同步失败，请确保您已经在 Supabase 中创建了 crm_contacts 表。');
    } else {
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', address: '', type: 'BUYER', solicitor_id: '' });
      alert('客户已成功同步到云端 CRM！');
    }
    
    setFormLoading(false);
  };

  if (isAuthorizing) return <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center font-bold text-gray-400">Loading Workspace...</div>;

  if (userRole?.toLowerCase() !== 'agent' && userRole?.toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
          <h1 className="text-[18px] font-black text-gray-900 mb-2">Agent Access Only</h1>
          <button onClick={() => router.push('/')} className="mt-4 px-6 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-black transition-colors">
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-[#f5f6f8] flex flex-col relative mx-auto font-sans">
      
      {/* 顶部导航 (Providers Page Style) */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[18px] font-black text-gray-900 leading-tight">代理商工作台 (云同步)</h1>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">管线数据已实时接入 Supabase</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/provider-workspace/crm')}
            className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-full text-[13px] font-bold hover:bg-gray-100 transition-all shadow-sm"
          >
            <CategoryIcon id="BUYERS" className="w-3.5 h-3.5" />
            进入 CRM
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-700 shadow-sm transition-transform active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-8 pb-28">
        {/* --- Featured Property Section --- */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1 pl-1">
            <div className="w-[22px] h-[22px] rounded-[6px] bg-[#ff7575] flex items-center justify-center shadow-sm text-white">
              <CategoryIcon id="PROPERTIES" className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-[15px] font-black text-[#ff7575]">当前维护房源</h2>
            <span className="text-gray-400 text-xs ml-1 font-medium">1</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4">
               <div className="w-1.5 h-12 rounded-full shrink-0 bg-[#ff7575]" />
               <div className="w-16 h-16 rounded-lg bg-cover bg-center shrink-0 border border-gray-100" style={{ backgroundImage: `url(${currentProperty.image})` }} />
               <div className="flex-1 truncate">
                  <h3 className="text-[16px] font-black text-gray-900 truncate">{currentProperty.address}</h3>
                  <p className="text-[12px] font-bold text-gray-400 mt-0.5">业主: {currentProperty.vendor}</p>
               </div>
               <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                  <CategoryIcon id="STATS" className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[12px] font-black text-gray-600">{currentProperty.activeBuyers} 意向人</span>
               </div>
            </div>
          </div>
        </div>

        {/* --- Buyers Pipeline Section --- */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1 pl-1">
            <div className="w-[22px] h-[22px] rounded-[6px] bg-[#a25ddc] flex items-center justify-center shadow-sm text-white">
              <CategoryIcon id="BUYERS" className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-[15px] font-black text-[#a25ddc]">买家管线 (Pipeline)</h2>
            <span className="text-gray-400 text-xs ml-1 font-medium">{pipeline.length}</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {pipeline.map((buyer, index) => (
              <div 
                key={buyer.id} 
                className={`flex items-center gap-3 p-3 transition-colors hover:bg-gray-50 cursor-pointer ${
                  index !== pipeline.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                onClick={() => { setSelectedBuyerId(buyer.id); setIsDrawerOpen(true); }}
              >
                <div className="w-1.5 h-10 rounded-full shrink-0 bg-[#a25ddc]" />
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full border border-gray-100 shadow-sm bg-cover bg-center shrink-0" style={{ backgroundImage: `url(https://i.pravatar.cc/100?u=${buyer.id})` }} />
                  <div className="flex flex-col truncate">
                    <span className="text-[14px] font-bold text-gray-900 truncate">{buyer.name}</span>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mt-0.5 truncate">
                      <span className="bg-gray-50 px-1.5 py-0.5 rounded-md text-gray-600 shrink-0 border border-gray-100">{buyer.maxBudget}</span>
                      <span className="truncate">{buyer.roleDescription}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <MondayStatusBadge status={buyer.status} />
                  <button className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-100">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[640px] mx-auto bg-gradient-to-t from-[#f5f6f8] via-[#f5f6f8] p-4 pb-8 z-40">
        <button 
          onClick={() => router.push('/provider-workspace/crm')}
          className="w-full bg-white border-2 border-dashed border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
           <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
           查看全库 CRM 客户
        </button>
      </div>

      {/* --- 📝 Add Customer Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white w-full max-w-[480px] rounded-[24px] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-[17px] font-black text-gray-900">同步至云端 CRM</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddCustomerSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">姓名</label>
                <input 
                  type="text" required placeholder="Full Name"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">电子邮件</label>
                  <input type="email" required placeholder="Email" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">电话</label>
                  <input type="tel" required placeholder="Phone" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">客户类型</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold cursor-pointer"
                  value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="BUYER">买家 (Buyer)</option>
                  <option value="SELLER">卖家 (Seller)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">关联律师</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold cursor-pointer"
                  value={formData.solicitor_id} onChange={e => setFormData({...formData, solicitor_id: e.target.value})}
                >
                  <option value="">暂不指派</option>
                  {lawyers.map(l => ( <option key={l.id} value={l.id}>{l.full_name || l.username}</option> ))}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[14px] font-black text-gray-500">取消</button>
                <button type="submit" disabled={formLoading} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-[14px] font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
                  {formLoading ? '正在同步云端...' : '确认同步到数据库'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interaction Drawer */}
      {isDrawerOpen && selectedBuyer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-[450px] h-full bg-white shadow-2xl flex flex-col p-8">
            <div className="flex justify-between items-center mb-10">
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-cover bg-center border border-gray-100" style={{ backgroundImage: `url(https://i.pravatar.cc/100?u=${selectedBuyer.id})` }} />
                  <div className="text-left">
                    <h2 className="text-xl font-black text-gray-900">{selectedBuyer.name}</h2>
                    <p className="text-xs font-bold text-gray-400">{selectedBuyer.roleDescription}</p>
                  </div>
               </div>
               <button onClick={() => setIsDrawerOpen(false)} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            <div className="space-y-8 flex-1 overflow-y-auto text-left">
               <div>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">联系方式</h3>
                  <div className="space-y-2">
                     <p className="text-sm font-bold text-gray-700">Email: {selectedBuyer.email}</p>
                     <p className="text-sm font-bold text-gray-700">Phone: {selectedBuyer.phone}</p>
                  </div>
               </div>
               
               <div>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">快速操作</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <button 
                        onClick={() => router.push(`/contract/${selectedPropertyId}?buyer=${selectedBuyer.id}`)}
                        className="py-4 bg-orange-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-100"
                     >
                        生成出价 (S&P)
                     </button>
                     <button className="py-4 bg-gray-800 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-gray-100">
                        记录跟进
                     </button>
                  </div>
               </div>

               <div>
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">最近记录</h3>
                  <div className="space-y-4">
                     {activities.map(log => (
                        <div key={log.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-black text-orange-600 uppercase">{log.type}</span>
                              <span className="text-[10px] text-gray-400">{log.timestamp}</span>
                           </div>
                           <p className="text-sm font-medium text-gray-700">{log.content}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
