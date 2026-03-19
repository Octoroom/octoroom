'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PrepareOfferPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const propertyId = params?.id as string;
  const draftBuyerId = searchParams?.get('buyer') || '';
  const draftBuyerEmail = searchParams?.get('buyer_email') || '';
  const draftBuyerName = searchParams?.get('buyer_name') || '';
  const draftAgentId = searchParams?.get('agent_id') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [property, setProperty] = useState<any>(null);

  // Form State
  const [purchaserName, setPurchaserName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [financeType, setFinanceType] = useState<'cash' | 'finance'>('finance');
  const [financeDays, setFinanceDays] = useState('15');
  const [deposit, setDeposit] = useState('10');
  
  // DD Conditions
  const [needsLIM, setNeedsLIM] = useState(true);
  const [limDays, setLimDays] = useState('15');
  const [needsBuilding, setNeedsBuilding] = useState(true);
  const [buildingDays, setBuildingDays] = useState('15');
  const [needsTox, setNeedsTox] = useState(false);
  const [toxDays, setToxDays] = useState('15');
  
  // Settlement
  const [settlementDate, setSettlementDate] = useState('');

  // Lawyer Selection
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [selectedLawyerId, setSelectedLawyerId] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('请先登录后再进行出价');
        router.push('/login');
        return;
      }

      // Agent drafting keeps the selected buyer identity; normal buyer flow defaults to self.
      if (draftBuyerName) {
        setPurchaserName(draftBuyerName);
      } else if (user.user_metadata?.full_name) {
        setPurchaserName(user.user_metadata.full_name);
      } else if (user.email) {
        setPurchaserName(user.email.split('@')[0]);
      }

      // Default settlement date to 1 month from now
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 1);
      setSettlementDate(defaultDate.toISOString().split('T')[0]);

      const { data: propData } = await supabase
        .from('octo_properties')
        .select('id, title, address_name, cover_image')
        .eq('id', propertyId)
        .single();
        
      if (propData) {
        setProperty({
          ...propData,
          coverImage: propData.cover_image ? propData.cover_image.split(',')[0].trim() : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'
        });
      }

      // Fetch possible lawyers (users with role = 'LAWYER' or specific tags)
      // For this MVP, we query profiles where role is 'LAWYER'
      try {
        const { data: lawyerProfiles, error: lawyerErr } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio')
          .eq('role', 'LAWYER');

        if (!lawyerErr && lawyerProfiles) {
           setLawyers(lawyerProfiles);
        }
      } catch (err) {
        console.error("查无律师或 role 列不存在。");
      }
      
      setLoading(false);
    };

    init();
  }, [draftBuyerName, propertyId, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaserName || !offerPrice || !settlementDate) {
      alert('请填写必填项（买家姓名、出价金额、交割日期）');
      return;
    }

    setSubmitting(true);

    const selectedLawyer = lawyers.find(l => l.id === selectedLawyerId);

    const offerTerms = {
      purchaserName,
      buyerAddress,
      contactNumber,
      offerPrice: Number(offerPrice),
      financeType,
      financeDays: financeType === 'finance' ? Number(financeDays) : 0,
      deposit: Number(deposit),
      conditions: {
        lim: needsLIM ? Number(limDays) : false,
        building: needsBuilding ? Number(buildingDays) : false,
        toxicology: needsTox ? Number(toxDays) : false,
      },
      settlementDate,
      buyerLawyerId: selectedLawyer?.id || null,
      buyerLawyerName: selectedLawyer?.full_name || selectedLawyer?.username || null,
      // For MVP without real address/phone columns in profiles, we create realistic mock data based on the ID or just map available data. Ideally, these are in profiles.
      buyerLawyerAddress: selectedLawyer ? `Professional Chambers, Level 2, Auckland CBD` : null,
      buyerLawyerContact: selectedLawyer ? `0800 LAWYER` : null
    };

    // Store terms securely in sessionStorage for the next step to read
    sessionStorage.setItem(`offer_terms_${propertyId}`, JSON.stringify(offerTerms));

    // Navigate to the central signing console and preserve agent-drafting context.
    const nextParams = new URLSearchParams();
    if (draftBuyerId) nextParams.set('buyer', draftBuyerId);
    if (draftBuyerEmail) nextParams.set('buyer_email', draftBuyerEmail);
    if (draftBuyerName) nextParams.set('buyer_name', draftBuyerName);
    if (draftAgentId) nextParams.set('agent_id', draftAgentId);

    router.push(`/contract/${propertyId}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col p-4 md:p-8 pb-24">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
        
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4">
          <div>
            <button onClick={() => router.back()} className="mb-4 w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">起草 S&P 买卖协议</h1>
            <p className="text-gray-500 mt-1 text-[15px]">请仔细确认您的所有出价条款，这些信息将被自动填入正式司法合同 (Agreement for Sale and Purchase of Real Estate)。</p>
          </div>
        </div>

        {property && (
          <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 mb-6 animate-in fade-in">
            <img src={property.coverImage} alt="Cover" className="w-20 h-20 rounded-xl object-cover" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-[15px] truncate">{property.title}</h3>
              <p className="text-gray-500 text-[13px] truncate">{property.address_name}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          
          {/* Section 1: Basic Info */}
          <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[12px]">1</span> 
              买方基础信息与价格 
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">买方全名 (Purchaser Legal Name) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={purchaserName}
                  onChange={(e) => setPurchaserName(e.target.value)}
                  placeholder="与 ID 或护照一致拼写" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none focus:bg-white transition-all"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1.5">如果有多个买家(如伴侣/信托)，请使用 "and" 连接全名。</p>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">联系地址 (Address) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="例如: 123 Example Street, Auckland" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">联系电话 (Contact Number) <span className="text-red-500">*</span></label>
                <input 
                  type="tel" 
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="例如: 021 123 4567" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">出价金额 (Offer Price) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input 
                    type="number" 
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="例如: 1200000" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-3 font-black text-[16px] focus:ring-2 focus:ring-orange-500 focus:outline-none focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Conditions */}
          <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[12px]">2</span> 
              特殊条款 (Conditions)
            </h2>
            
            <div className="space-y-6">
              
              {/* Finance */}
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-2">资金来源 (Finance)</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button type="button" onClick={() => setFinanceType('cash')} className={`py-3 rounded-xl font-bold text-[14px] border transition-all ${financeType === 'cash' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>无条件全款 (Cash)</button>
                  <button type="button" onClick={() => setFinanceType('finance')} className={`py-3 rounded-xl font-bold text-[14px] border transition-all ${financeType === 'finance' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>需要申请贷款 (Finance)</button>
                </div>
                {financeType === 'finance' && (
                   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                     <span className="text-[13px] font-bold text-gray-700 whitespace-nowrap">贷款审批所需工作日:</span>
                     <div className="relative flex-1 max-w-[120px]">
                        <input type="number" value={financeDays} onChange={(e) => setFinanceDays(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg pr-12 pl-3 py-2 font-bold text-center focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-bold">Days</span>
                     </div>
                   </div>
                )}
              </div>

              {/* DD */}
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-[13px] font-bold text-gray-700 mb-3">尽职调查 (Due Diligence)</label>
                
                <div className="space-y-3">
                  {/* Building */}
                  <div className={`p-4 rounded-xl border transition-all ${needsBuilding ? 'bg-orange-50/50 border-orange-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                       <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={needsBuilding} onChange={(e) => setNeedsBuilding(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                          <span className="font-bold text-[14px] text-gray-900">建检报告 (Building Report)</span>
                       </label>
                    </div>
                    {needsBuilding && (
                      <div className="flex items-center gap-3 mt-3 pl-8">
                         <span className="text-[12px] text-gray-500 font-medium">批准时长:</span>
                         <div className="relative w-[100px]">
                           <input type="number" value={buildingDays} onChange={(e) => setBuildingDays(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg pr-10 pl-2 py-1.5 text-[13px] font-bold text-center focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                           <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">Days</span>
                         </div>
                      </div>
                    )}
                  </div>

                  {/* LIM */}
                  <div className={`p-4 rounded-xl border transition-all ${needsLIM ? 'bg-orange-50/50 border-orange-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                       <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={needsLIM} onChange={(e) => setNeedsLIM(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                          <span className="font-bold text-[14px] text-gray-900">政府档案 (LIM Report)</span>
                       </label>
                    </div>
                    {needsLIM && (
                      <div className="flex items-center gap-3 mt-3 pl-8">
                         <span className="text-[12px] text-gray-500 font-medium">批准时长:</span>
                         <div className="relative w-[100px]">
                           <input type="number" value={limDays} onChange={(e) => setLimDays(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg pr-10 pl-2 py-1.5 text-[13px] font-bold text-center focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                           <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">Days</span>
                         </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Tox */}
                  <div className={`p-4 rounded-xl border transition-all ${needsTox ? 'bg-orange-50/50 border-orange-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                       <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={needsTox} onChange={(e) => setNeedsTox(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                          <span className="font-bold text-[14px] text-gray-900">毒检报告 (Toxicology)</span>
                       </label>
                    </div>
                    {needsTox && (
                      <div className="flex items-center gap-3 mt-3 pl-8">
                         <span className="text-[12px] text-gray-500 font-medium">批准时长:</span>
                         <div className="relative w-[100px]">
                           <input type="number" value={toxDays} onChange={(e) => setToxDays(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg pr-10 pl-2 py-1.5 text-[13px] font-bold text-center focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                           <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">Days</span>
                         </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Deposit & Settlement */}
          <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[12px]">3</span> 
              定金与交割 (Deposit & Settlement)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">定金比例 (Deposit) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 py-3 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none focus:bg-white transition-all" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">在协议所有条件满足成为 Unconditional 后支付。</p>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">最终交割日 (Settlement Date) <span className="text-red-500">*</span></label>
                <input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none focus:bg-white transition-all text-gray-900" />
                <p className="text-[11px] text-gray-500 mt-1.5">支付尾款及钥匙移交日期。</p>
              </div>
            </div>
          </div>

          {/* Section 4: Lawyer Selection */}
          <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[12px]">4</span> 
              选择买方代理律师 (Solicitor) 
            </h2>
            
            <div className="space-y-4">
              {lawyers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lawyers.map(lawyer => (
                    <div 
                      key={lawyer.id} 
                      onClick={() => setSelectedLawyerId(lawyer.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${selectedLawyerId === lawyer.id ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100/50' : 'border-gray-100 hover:border-orange-200 hover:bg-gray-50'}`}
                    >
                      <img src={lawyer.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${lawyer.username || 'Lawyer'}`} alt={lawyer.username} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-[15px] text-gray-900 line-clamp-1">{lawyer.full_name || lawyer.username}</div>
                        <div className="text-[12px] text-gray-500 font-medium line-clamp-1 mt-0.5">{lawyer.bio || '专注于新西兰房产交割业务'}</div>
                        {selectedLawyerId === lawyer.id && <div className="mt-2 text-[12px] font-bold text-orange-600 flex items-center gap-1"><svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> 已选择</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <p className="text-[13px] text-gray-500 font-medium">系统中尚未配置代理律师账号，或者缺失 `role` 表字段。<br/>(MVP 测试阶段此项可暂时留空)</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button type="submit" disabled={submitting} className={`w-full py-5 rounded-2xl font-black text-[18px] shadow-2xl transition-all ${submitting ? 'bg-gray-200 text-gray-400' : 'bg-black text-white hover:bg-gray-800 active:scale-[0.98]'}`}>
              {submitting ? '正在生成条款...' : '条款确认无误，进入线上签署环节 →'}
            </button>
            <p className="text-center text-[12px] text-gray-400 mt-4 font-medium flex items-center justify-center gap-1.5">
               <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
               您的数据将受到 Octoroom 银行级加密保护
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}
