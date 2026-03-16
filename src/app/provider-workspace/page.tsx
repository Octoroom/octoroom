'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// --- 🌟 Types & Interfaces ---
type WorkspaceTab = 'DEALS' | 'CRM' | 'DOCUMENTS' | 'PROVIDERS';
type DealStatus = 'NEGOTIATION' | 'CONDITIONAL' | 'UNCONDITIONAL' | 'SETTLED';
type ConditionStatus = 'PENDING' | 'WAITING' | 'MET' | 'FAILED';

interface Condition {
  id: string;
  name: string;
  dueDate: string;
  status: ConditionStatus;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'BUYER' | 'SELLER';
  status: 'ACTIVE' | 'ARCHIVED';
  lastActivity: string;
}

interface Document {
  id: string;
  title: string;
  type: 'S&P' | 'DISCLOSURE' | 'CONSENT' | 'OTHER';
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'EXPIRED';
  customerName: string;
  updatedAt: string;
}

interface Deal {
  id: string;
  propertyId: string;
  address: string;
  vendor: string;
  purchaser: string;
  price: string;
  deposit: string;
  status: DealStatus;
  conditions: Condition[];
  lawyerName: string;
  lawyerEmail: string;
  updatedAt: string;
}

// --- 🎨 Premium UI Components ---

function StatusBadge({ status }: { status: DealStatus }) {
  const configs = {
    NEGOTIATION: { text: '谈判中 (Offer Stage)', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    CONDITIONAL: { text: '有条件 (Conditional)', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    UNCONDITIONAL: { text: '无条件 (Unconditional)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    SETTLED: { text: '已交割 (Settled)', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  };
  const config = configs[status];
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-tight border ${config.color}`}>
      {config.text}
    </span>
  );
}

function ConditionItem({ condition }: { condition: Condition }) {
  const statusColors = {
    PENDING: 'bg-gray-200',
    WAITING: 'bg-blue-400 animate-pulse',
    MET: 'bg-emerald-500',
    FAILED: 'bg-rose-500',
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${statusColors[condition.status]}`} />
        <span className="text-[13px] font-bold text-gray-700">{condition.name}</span>
      </div>
      <div className="text-right">
        <p className="text-[11px] font-medium text-gray-400">Due: {condition.dueDate}</p>
        <p className={`text-[10px] font-black ${condition.status === 'MET' ? 'text-emerald-600' : 'text-gray-500'}`}>
          {condition.status === 'MET' ? '✓ 已满足' : '进行中'}
        </p>
      </div>
    </div>
  );
}

export default function AgentWorkspacePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('DEALS');
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [targetPropertyId] = useState('17419957-de38-4e16-ba44-3fadf6c468c1'); // 110 Tihi Street
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // CRM & Document States
  const [customers, setCustomers] = useState<Customer[]>([
    { id: 'cust1', name: 'Alice Johnson', email: 'alice@example.com', phone: '021 000 1111', type: 'BUYER', status: 'ACTIVE', lastActivity: '2h ago' },
    { id: 'cust2', name: 'Bob Smith', email: 'bob@example.com', phone: '022 111 2222', type: 'BUYER', status: 'ACTIVE', lastActivity: '1d ago' },
    { id: 'cust3', name: 'Charlie Davis', email: 'charlie@example.com', phone: '027 333 4444', type: 'SELLER', status: 'ACTIVE', lastActivity: '5h ago' },
  ]);

  const [documents, setDocuments] = useState<Document[]>([
    { id: 'doc1', title: 'S&P Agreement - 110 Tihi Street', type: 'S&P', status: 'SIGNED', customerName: 'Alice Johnson', updatedAt: '2h ago' },
    { id: 'doc2', title: 'Bright-line Disclosure', type: 'DISCLOSURE', status: 'SENT', customerName: 'Alice Johnson', updatedAt: '3h ago' },
    { id: 'doc3', title: 'Client Consent Form', type: 'CONSENT', status: 'DRAFT', customerName: 'Bob Smith', updatedAt: 'Yesterday' },
  ]);

  // Offer Form States
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [purchaserName, setPurchaserName] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [settlementDate, setSettlementDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setUserRole(profile?.role || 'BUYER');
      setLoading(false);
    };

    checkRole();
  }, []);

  useEffect(() => {
    // When a customer is selected, auto-fill the purchaser name
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (customer) {
      setPurchaserName(customer.name);
    }
  }, [selectedCustomerId, customers]);

  // 模拟成交数据 (Real NZ Context)
  const deals: Deal[] = [
    {
      id: 'd1',
      propertyId: targetPropertyId,
      address: '110 Tihi Street, Stonefields',
      vendor: 'Current Owner',
      purchaser: 'Alice & Bob Johnson',
      price: '$1,850,000',
      deposit: '$185,000 (Pending)',
      status: 'CONDITIONAL',
      lawyerName: 'Jessica Chen',
      lawyerEmail: 'jessica.chen.law@octoroom.com',
      updatedAt: '2小时前',
      conditions: [
        { id: 'c1', name: 'Finance (贷款条件)', dueDate: '3月25日', status: 'WAITING' },
        { id: 'c2', name: 'Building Report (屋检)', dueDate: '3月20日', status: 'MET' },
        { id: 'c3', name: 'LIM Report (土地报告)', dueDate: '3月30日', status: 'PENDING' },
      ]
    },
    {
      id: 'd2',
      propertyId: 'other-id',
      address: '15/22 Albert Street, Auckland CBD',
      vendor: 'H. Zhang',
      purchaser: 'First Home Buyer Ltd',
      price: '$680,000',
      deposit: '$68,000 (Paid)',
      status: 'UNCONDITIONAL',
      lawyerName: 'Mark Wilson',
      lawyerEmail: 'mark@wilsonlegal.co.nz',
      updatedAt: '昨天 15:30',
      conditions: [
        { id: 'c4', name: 'All Conditions Met', dueDate: '-', status: 'MET' }
      ]
    }
  ];

  const handleInitiateOffer = () => {
    if (!purchaserName || !offerPrice || !settlementDate) {
      alert('请填入基本出价信息');
      return;
    }
    
    setIsSubmitting(true);
    
    const offerTerms = {
      purchaserName,
      offerPrice: Number(offerPrice),
      financeType: 'finance',
      financeDays: 15,
      deposit: 10,
      conditions: { lim: 15, building: 15, toxicology: false },
      settlementDate,
    };

    sessionStorage.setItem(`offer_terms_${targetPropertyId}`, JSON.stringify(offerTerms));
    router.push(`/contract/${targetPropertyId}`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">Loading Workspace...</div>;
  }

  // If user is not an AGENT, show a blank or simplified view as requested
  if (userRole !== 'AGENT') {
    return (
      <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-white flex flex-col relative mx-auto p-8 items-center justify-center text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 text-3xl">🏜️</div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Workspace Unavailable</h2>
        <p className="text-gray-400 font-bold text-sm">此工作台仅对持牌代理 (Licensed Agent) 开放。<br/>如果您是房东或买家，请前往房源中�  return (
    <main className="flex-1 max-w-[900px] w-full min-h-screen border-r border-gray-100 bg-[#F8FAFC] flex flex-col relative mx-auto font-sans tracking-tight">
      
      {/* 🏙️ Property Executive Summary */}
      <section className="bg-white border-b border-gray-100 p-8 pt-10 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white">
              <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80" alt="property" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black text-gray-900">{property.address}</h1>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[11px] font-black rounded-full uppercase tracking-widest border border-emerald-100">Live Pipeline</span>
              </div>
              <p className="text-gray-400 font-bold text-[14px] uppercase tracking-wider">{property.suburb} · <span className="text-gray-900 font-black">{property.askingPrice}</span></p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="h-12 px-6 bg-gray-50 text-gray-900 font-black text-sm rounded-2xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all">Property Assets</button>
            <button className="h-12 w-12 bg-black text-white flex items-center justify-center rounded-2xl hover:scale-110 transition-transform active:scale-95 shadow-lg shadow-black/10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-6 mt-10">
          <div className="p-5 rounded-3xl bg-[#F8FAFC] border border-gray-50">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Managed Pipeline</p>
            <p className="text-2xl font-black text-gray-900">{property.buyerCount} Active Buyers</p>
          </div>
          <div className="p-5 rounded-3xl bg-[#F8FAFC] border border-gray-100">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Highest Offer</p>
            <p className="text-2xl font-black text-emerald-600">$1,850,000</p>
          </div>
          <div className="p-5 rounded-3xl bg-indigo-50 border border-indigo-100">
            <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Avg. Conversion Time</p>
            <p className="text-2xl font-black text-indigo-700">14.2 Days</p>
          </div>
        </div>
      </section>

      {/* 📊 Comparison Table: The Pipeline Engine */}
      <section className="p-8 pb-32">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Buyer Pipeline Analysis
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-ping" />
          </h2>
          <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
            <span>Filter: High Budget</span>
            <span className="w-px h-3 bg-gray-200" />
            <span>Sort: Last Follow-up</span>
          </div>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-gray-50">
                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-tighter">Candidate / Buyer</th>
                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-tighter">Budget Capacity</th>
                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-tighter">Finance / conditions</th>
                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-tighter">Engagement</th>
                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-tighter">Offer Path</th>
                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-tighter">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map((buyer) => (
                <tr key={buyer.id} className="border-b border-gray-50 hover:bg-[#F8FAFC] transition-colors group">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <img src={buyer.avatar} className="w-10 h-10 rounded-2xl shadow-md" alt="avatar" />
                      <div>
                        <p className="text-[14px] font-black text-gray-900">{buyer.name}</p>
                        <p className="text-[11px] font-bold text-gray-400">Verified Identity</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-[15px] font-black text-gray-900 leading-none">{buyer.budget}</p>
                    <p className="text-[11px] font-bold text-indigo-500 mt-1 uppercase">Max Potential</p>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md inline-block max-w-fit ${buyer.financeStatus === 'CASH' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {buyer.financeStatus}
                      </span>
                      <div className="flex gap-1">
                        {buyer.conditions.finance && <span className="w-4 h-4 bg-orange-100 text-orange-600 flex items-center justify-center text-[8px] rounded font-black" title="Finance Needed">F</span>}
                        {buyer.conditions.building && <span className="w-4 h-4 bg-blue-100 text-blue-600 flex items-center justify-center text-[8px] rounded font-black" title="Building Report">B</span>}
                        {buyer.conditions.lim && <span className="w-4 h-4 bg-purple-100 text-purple-600 flex items-center justify-center text-[8px] rounded font-black" title="LIM Report">L</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <p className="text-[13px] font-black text-gray-900">{buyer.lastFollowUp}</p>
                    <p className="text-[11px] font-medium text-amber-600 italic mt-0.5 truncate max-w-[120px]">{buyer.nextAction}</p>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${
                      buyer.currentOfferStatus === 'SENT' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 
                      buyer.currentOfferStatus === 'DRAFT' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {buyer.currentOfferStatus === 'NONE' ? 'NO OFFER' : buyer.currentOfferStatus}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <button 
                      onClick={() => setSelectedBuyerId(buyer.id)}
                      className="w-10 h-10 rounded-xl bg-gray-50 text-gray-900 flex items-center justify-center hover:bg-black hover:text-white transition-all group-hover:shadow-xl"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 📋 Follow-up Activity & Quick Actions (Docked Bottom) */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[900px] p-6 pb-10 pointer-events-none">
        <div className="bg-gray-900 rounded-[40px] shadow-2xl p-6 pointer-events-auto flex items-center justify-between border border-white/10 ring-8 ring-gray-900/5">
          <div className="flex items-center gap-8 pl-4">
             <div className="text-white">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pipeline Health</p>
                <div className="flex items-center gap-2 mt-1">
                   {[1, 2, 3, 4, 5].map(i => <div key={i} className={`h-1.5 w-6 rounded-full ${i <= 4 ? 'bg-[#FF8C00]' : 'bg-white/10'}`} />)}
                   <span className="text-[13px] font-black text-[#FF8C00] ml-2">High Engagement</span>
                </div>
             </div>
             <div className="h-10 w-px bg-white/10" />
             <div className="text-white">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Next Critical Deadline</p>
                <p className="text-[13px] font-black text-white mt-1">24 Mar - Finance Approval (Johnson)</p>
             </div>
          </div>
          <div className="flex gap-4 pr-2">
            <button className="h-14 px-8 bg-white/5 hover:bg-white/10 text-white font-black rounded-3xl transition-all border border-white/10">Broadcast Update</button>
            <button className="h-14 px-10 bg-[#FF8C00] text-white font-black rounded-3xl transition-all shadow-xl shadow-orange-500/20 active:scale-95">Initiate Master S&P</button>
          </div>
        </div>
      </div>

      {/* 📝 Interaction Panel (Buyer Focus Side Panel) */}
      {selectedBuyerId && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedBuyerId(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-10 flex flex-col animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-gray-900">Buyer Management</h3>
              <button 
                onClick={() => setSelectedBuyerId(null)}
                className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide">
              {/* Buyer Profile Header */}
              {pipeline.find(b => b.id === selectedBuyerId) && (
                <>
                  <div className="flex items-center gap-6 mb-10">
                    <img src={pipeline.find(b => b.id === selectedBuyerId)?.avatar} className="w-24 h-24 rounded-[40px] shadow-2xl" alt="profile" />
                    <div>
                      <h4 className="text-3xl font-black text-gray-900 leading-tight">{pipeline.find(b => b.id === selectedBuyerId)?.name}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-orange-600 font-bold text-sm">Verified Premium Buyer</span>
                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-gray-400 font-bold text-sm">Member since 2022</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Offer History</p>
                      <div className="space-y-3">
                         {pipeline.find(b => b.id === selectedBuyerId)?.offerHistory.map((off, idx) => (
                           <div key={idx} className="flex justify-between items-center">
                             <span className="text-[13px] font-bold text-gray-700">{off.amount}</span>
                             <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${off.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>{off.status}</span>
                           </div>
                         ))}
                         {pipeline.find(b => b.id === selectedBuyerId)?.offerHistory.length === 0 && <p className="text-[12px] font-medium text-gray-400 italic">No offers recorded</p>}
                      </div>
                    </div>
                    <div className="p-6 bg-emerald-50 rounded-[32px] border border-emerald-100 flex flex-col justify-center items-center">
                      <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Budget Index</p>
                      <p className="text-2xl font-black text-emerald-700">{pipeline.find(b => b.id === selectedBuyerId)?.budget}</p>
                    </div>
                  </div>

                  <div className="mb-10">
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Activity Log / Follow-up History</p>
                    <div className="space-y-4 border-l-2 border-orange-100 pl-6 pb-2">
                        <div className="relative">
                          <div className="absolute -left-[31px] top-1.5 w-3 h-3 bg-[#FF8C00] rounded-full border-2 border-white" />
                          <p className="text-[14px] font-black text-gray-900 leading-none">Phone call with Michael</p>
                          <p className="text-gray-500 text-[12px] font-medium mt-1">Discussed their building inspector availability for tomorrow morning.</p>
                          <p className="text-[10px] font-black text-gray-300 mt-2 uppercase">2 Hours Ago</p>
                        </div>
                        <div className="relative opacity-60">
                          <div className="absolute -left-[31px] top-1.5 w-3 h-3 bg-gray-300 rounded-full border-2 border-white" />
                          <p className="text-[14px] font-black text-gray-900 leading-none">Private Viewing (Evening)</p>
                          <p className="text-gray-500 text-[12px] font-medium mt-1">Second viewing with their parents. Highly impressed with the kitchen.</p>
                          <p className="text-[10px] font-black text-gray-300 mt-2 uppercase">2 Days Ago</p>
                        </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-8 grid grid-cols-2 gap-4">
              <button className="h-16 bg-gray-900 text-white font-black rounded-2xl shadow-xl shadow-black/10 hover:scale-[1.02] transition-transform">Log Follow-up</button>
              <button 
                onClick={() => {
                  const buyer = pipeline.find(b => b.id === selectedBuyerId);
                  if (buyer) {
                    sessionStorage.setItem(`offer_terms_${property.id}`, JSON.stringify({ purchaserName: buyer.name, offerPrice: parseInt(buyer.budget.replace(/[^0-9]/g, '')), settlementDate: '2024-05-01' }));
                    router.push(`/contract/${property.id}`);
                  }
                }}
                className="h-16 bg-[#FF8C00] text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 hover:scale-[1.02] transition-transform"
              >
                Draft Offer (S&P)
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
w-lg shadow-orange-500/20 hover:bg-[#FF8C00]/90 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? '正在准备 S&P...' : '生成 S&P 并发送签署 →'}
                </button>
                <p className="text-[11px] text-center text-gray-400 font-medium px-4">
                  点击按钮将根据上述条款自动生成标准新西兰房屋买卖协议，并进入正式线上签署中心。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}