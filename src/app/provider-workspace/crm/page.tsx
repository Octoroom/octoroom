'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// --- 🌟 Types ---
type ContactType = 'BUYER' | 'SELLER';
type ProviderStatus = 'WORKING' | 'PENDING' | 'DONE' | 'ARCHIVED';

interface Contact {
  id: string;
  name: string;
  type: ContactType;
  email: string;
  phone: string;
  address?: string;
  solicitor_id?: string;
  status: ProviderStatus;
  created_at: string;
}

interface Lawyer {
  id: string;
  full_name: string;
  username: string;
}

// --- 🎨 UI Components ---
function MondayStatusBadge({ status }: { status: ProviderStatus }) {
  const statusConfig = {
    WORKING: { text: '服务中', color: 'bg-[#00c875] text-white' }, 
    DONE: { text: '已完成', color: 'bg-[#0086c0] text-white' }, 
    PENDING: { text: '待确认', color: 'bg-[#fdab3d] text-white' }, 
    ARCHIVED: { text: '已归档', color: 'bg-[#c4c4c4] text-white' }, 
  };
  const config = statusConfig[status];
  return (
    <div className={`flex items-center justify-center w-[72px] h-[30px] rounded-[4px] text-[12px] font-bold tracking-wide shadow-sm transition-all hover:opacity-90 cursor-pointer ${config.color}`}>
      {config.text}
    </div>
  );
}

function CategoryIcon({ type, className = "w-4 h-4" }: { type: ContactType | 'ALL', className?: string }) {
  switch (type) {
    case 'BUYER':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'SELLER':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'ALL':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    default: return null;
  }
}

export default function CRMPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | ContactType>('ALL');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- 📝 Form State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    type: 'BUYER' as ContactType,
    solicitor_id: ''
  });

  // Fetch Current Agent & Lawyers
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setCurrentAgentId(session.user.id);

      // Fetch Lawyers
      const { data: lawyerData } = await supabase.from('profiles').select('id, full_name, username').eq('role', 'LAWYER');
      if (lawyerData) setLawyers(lawyerData);

      // Initial Fetch Contacts
      await fetchContacts(session.user.id);
      setLoading(false);
    }
    init();
  }, [router]);

  async function fetchContacts(agentId: string) {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setContacts(data as Contact[]);
    }
  }

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (c.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedType === 'ALL' || c.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, selectedType, contacts]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgentId) return;
    
    setFormLoading(true);
    
    const { data, error } = await supabase
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
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding contact:', error);
      alert('添加失败，请检查数据库连接或表结构。');
    } else if (data) {
      setContacts([data as Contact, ...contacts]);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', address: '', type: 'BUYER', solicitor_id: '' });
    }
    
    setFormLoading(false);
  };

  return (
    <div className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-[#f5f6f8] flex flex-col relative mx-auto font-sans">
      
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[18px] font-black text-gray-900 leading-tight">CRM 客户管理 (云同步)</h1>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">所有资料已加密并同步至 Supabase</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-700 shadow-sm transition-transform active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      {/* 🔍 搜索与过滤 */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 shadow-sm z-20 sticky top-[73px]">
        <div className="relative mb-3">
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm transition-colors"
            placeholder="搜索姓名或邮箱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <div className="flex gap-2">
          {(['ALL', 'BUYER', 'SELLER'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all ${
                selectedType === type ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <CategoryIcon type={type} className="w-3.5 h-3.5" />
              {type === 'ALL' ? '全部' : type === 'BUYER' ? '买家' : '卖家'}
            </button>
          ))}
        </div>
      </div>

      {/* 列表区域 */}
      <div className="p-4 space-y-6 pb-28">
        {loading ? (
          <div className="py-20 text-center font-bold text-gray-400">正在与数据库握手...</div>
        ) : contacts.length === 0 ? (
          <div className="py-20 bg-white rounded-2xl border border-dashed border-gray-200 text-center">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
             </div>
             <p className="text-gray-500 font-bold mb-4">您的库中还没有客户</p>
             <button onClick={() => setIsModalOpen(true)} className="px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg">录入第一位客户</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {filteredContacts.map((contact, index) => (
              <div key={contact.id} className={`flex items-center gap-3 p-3 transition-colors hover:bg-gray-50 ${index !== filteredContacts.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className={`w-1.5 h-10 rounded-full shrink-0 ${contact.type === 'BUYER' ? 'bg-[#a25ddc]' : 'bg-[#fdab3d]'}`} />
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                     <CategoryIcon type={contact.type} className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-[14px] font-bold text-gray-900 truncate">{contact.name}</span>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 mt-0.5 truncate">
                      <span className={`px-1 rounded text-white shrink-0 ${contact.type === 'BUYER' ? 'bg-[#a25ddc]' : 'bg-[#fdab3d]'}`}>{contact.type}</span>
                      <span className="truncate">{contact.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <MondayStatusBadge status={contact.status} />
                  <button className="w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors shadow-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部悬浮 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[640px] mx-auto bg-gradient-to-t from-[#f5f6f8] via-[#f5f6f8] p-4 pb-8 z-40">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-700 font-bold py-3.5 rounded-xl hover:border-gray-400 hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2"
        >
           <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
           同步录入到数据库
        </button>
      </div>

      {/* --- 📝 Add Customer Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white w-full max-w-[480px] rounded-[24px] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-[17px] font-black text-gray-900">云端客户同步录入</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">姓名 (Legal Name)</label>
                <input type="text" required placeholder="全名" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">邮箱</label>
                  <input type="email" required placeholder="Email" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">电话</label>
                  <input type="tel" required placeholder="Phone" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">地址 (Physical Address)</label>
                <input type="text" placeholder="Address" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">类型</label>
                  <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold cursor-pointer"
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as ContactType})}
                  >
                    <option value="BUYER">买家 (Buyer)</option>
                    <option value="SELLER">卖家 (Seller)</option>
                  </select>
                </div>
                <div>
                   <label className="block text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">关联律师</label>
                   <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold cursor-pointer"
                    value={formData.solicitor_id} onChange={e => setFormData({...formData, solicitor_id: e.target.value})}
                  >
                    <option value="">暂不指派</option>
                    {lawyers.map(l => ( <option key={l.id} value={l.id}>{l.full_name || l.username}</option> ))}
                  </select>
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={formLoading} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[14px] font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all text-center">
                  {formLoading ? '正在同步到云端...' : '确认同步到数据库'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
