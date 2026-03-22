'use client';

import React from 'react';

interface Lawyer {
  id: string;
  full_name: string;
  username: string;
}

interface AddBuyerModalProps {
  isOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  handleAddCustomerSubmit: (e: React.FormEvent) => Promise<void>;
  formData: {
    name: string;
    email: string;
    phone: string;
    address: string;
    budget_amount: string;
    type: string;
    solicitor_id: string;
  };
  setFormData: (data: any) => void;
  lawyers: Lawyer[];
  formLoading: boolean;
}

export const AddBuyerModal: React.FC<AddBuyerModalProps> = ({
  isOpen,
  setIsModalOpen,
  handleAddCustomerSubmit,
  formData,
  setFormData,
  lawyers,
  formLoading
}) => {
  if (!isOpen) return null;

  return (
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
          {formData.type === 'BUYER' && (
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Budget Amount</label>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 1200000"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition-all"
                value={formData.budget_amount}
                onChange={e => setFormData({...formData, budget_amount: e.target.value})}
              />
            </div>
          )}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[14px] font-black text-gray-500">取消</button>
            <button type="submit" disabled={formLoading} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-[14px] font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
              {formLoading ? '正在同步云端...' : '确认同步到数据库'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
