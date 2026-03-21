'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ContractContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const propertyId = params?.id as string;
  const urlOfferId = searchParams?.get('offerId') as string | null;
  const queryBuyerId = searchParams?.get('buyer') || searchParams?.get('buyer_id');
  const queryBuyerEmail = searchParams?.get('buyer_email');
  const queryBuyerName = searchParams?.get('buyer_name');
  const isAgentDraftingMode = !!(queryBuyerId || queryBuyerEmail || searchParams?.get('agent_id'));

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [propertyStatus, setPropertyStatus] = useState<string>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [offerStatus, setOfferStatus] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState<boolean>(false);
  const [isAgentDrafting, setIsAgentDrafting] = useState<boolean>(isAgentDraftingMode);
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [targetBuyerId, setTargetBuyerId] = useState<string | null>(queryBuyerId || null);

  // --- 📝 Offer Terms Form State (Mirrored from Prepare Page) ---
  const [purchaserName, setPurchaserName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [financeType, setFinanceType] = useState<'cash' | 'finance'>('finance');
  const [financeDays, setFinanceDays] = useState('15');
  const [deposit, setDeposit] = useState('10');
  const [needsLIM, setNeedsLIM] = useState(true);
  const [limDays, setLimDays] = useState('15');
  const [needsBuilding, setNeedsBuilding] = useState(true);
  const [buildingDays, setBuildingDays] = useState('15');
  const [needsTox, setNeedsTox] = useState(false);
  const [toxDays, setToxDays] = useState('15');
  const [settlementDate, setSettlementDate] = useState('');
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [selectedLawyerId, setSelectedLawyerId] = useState('');
  
  const [templates] = useState([
    { id: '9b6eeb8e-9cf7-4cf2-99e8-34d1c7782f14', title: '新西兰标准房屋买卖协议 (S&P)' },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);

  useEffect(() => {
    let channel: any = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('请先登录后再进行签署');
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const { data: propData } = await supabase
        .from('octo_properties')
        .select('status, author_id')
        .eq('id', propertyId)
        .single();
      if (propData) {
        setPropertyStatus(propData.status);
        setIsSeller(propData.author_id === user.id);
      }

      let offerQuery = supabase
        .from('octo_offers')
        .select('*')
        .eq('property_id', propertyId);

      if (urlOfferId) {
        offerQuery = offerQuery.eq('id', urlOfferId);
      } else if (isAgentDraftingMode && queryBuyerId) {
        offerQuery = offerQuery
          .eq('buyer_id', queryBuyerId)
          .order('created_at', { ascending: false })
          .limit(1);
      } else {
        offerQuery = offerQuery
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
      }
      
      const { data: offerData, error: offerError } = await offerQuery.maybeSingle();
      let offer = offerData;

      // --- 🌉 Fallback: Bridge CRM ID and Auth ID ---
      if (!offer && !urlOfferId && user.email) {
        console.log("[CONTRACT] No offer found by Auth ID, trying CRM ID fallback for:", user.email);
        const { data: contact } = await supabase
          .from('crm_contacts')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
          
        if (contact) {
          console.log("[CONTRACT] Found CRM Contact ID:", contact.id);
          const { data: crmOffer } = await supabase
            .from('octo_offers')
            .select('*')
            .eq('property_id', propertyId)
            .eq('buyer_id', contact.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (crmOffer) {
            console.log("[CONTRACT] Successfully found offer via CRM ID!");
            offer = crmOffer;
          }
        }
      }

      // --- 🔄 Load Terms Logic ---
      if (offer) {
        setOfferId(offer.id);
        setOfferStatus(offer.status);
        const isUserSeller = propData?.author_id === user.id;
        
        // If there's an offer, load terms from DB
        setPurchaserName(offer.legal_buyer_name || '');
        setBuyerAddress(offer.buyer_address || '');
        setContactNumber(offer.contact_number || '');
        setOfferPrice(offer.offer_price?.toString() || '');
        setFinanceType(offer.finance_type || 'cash');
        setFinanceDays(offer.finance_days?.toString() || '0');
        setDeposit(offer.deposit?.toString() || '10');
        setSettlementDate(offer.settlement_date || '');
        setSelectedLawyerId(offer.buyer_lawyer_id || '');
        
        if (offer.conditions) {
          setNeedsLIM(!!offer.conditions.lim);
          setLimDays(offer.conditions.lim?.toString() || '15');
          setNeedsBuilding(!!offer.conditions.building);
          setBuildingDays(offer.conditions.building?.toString() || '15');
          setNeedsTox(!!offer.conditions.toxicology);
          setToxDays(offer.conditions.toxicology?.toString() || '15');
        }

        if ((!isUserSeller && offer.status !== 'pending_buyer_signature') || offer.status === 'accepted' || offer.status === 'sold') {
          setStep(3);
        } else if (!isUserSeller && offer.status === 'pending_buyer_signature' && offer.signwell_doc_id) {
          // 🌟 核心逻辑：如果是买家，且有待签署的 Offer，直接获取签署链接并跳转到 Step 2
          setLoading(true);
          try {
            const res = await fetch('/api/signwell/get-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ documentId: offer.signwell_doc_id, role: 'buyer_id' })
            });
            const urlData = await res.json();
            if (urlData.signUrl) {
              setSignUrl(urlData.signUrl);
              setDocumentId(offer.signwell_doc_id);
              setStep(2);
            }
          } catch (err) {
            console.error("无法自动获取签署链接:", err);
          } finally {
            setLoading(false);
          }
        }
      } else if (!isSeller) {
        // New offer draft: load from session storage
        const termsStr = sessionStorage.getItem(`offer_terms_${propertyId}`);
        if (termsStr) {
          const t = JSON.parse(termsStr);
          setPurchaserName(t.purchaserName || '');
          setBuyerAddress(t.buyerAddress || '');
          setContactNumber(t.contactNumber || '');
          setOfferPrice(t.offerPrice?.toString() || '');
          setFinanceType(t.financeType || 'finance');
          setFinanceDays(t.financeDays?.toString() || '15');
          setDeposit(t.deposit?.toString() || '10');
          setSettlementDate(t.settlementDate || '');
          setSelectedLawyerId(t.buyerLawyerId || '');
          if (t.conditions) {
            setNeedsLIM(!!t.conditions.lim);
            setLimDays(t.conditions.lim?.toString() || '15');
            setNeedsBuilding(!!t.conditions.building);
            setBuildingDays(t.conditions.building?.toString() || '15');
            setNeedsTox(!!t.conditions.toxicology);
            setToxDays(t.conditions.toxicology?.toString() || '15');
          }
        }
      }
      
      // Fetch Lawyers
      const { data: lawyerProfiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url, bio').eq('role', 'LAWYER');
      if (lawyerProfiles) setLawyers(lawyerProfiles);

      // --- 🕵️ Agent Drafting Mode Detection ---
      // If targetBuyerId is present, the property owner (agent) is drafting for a buyer.
      if (isAgentDraftingMode) {
        setIsAgentDrafting(true);
        if (queryBuyerEmail) {
          setBuyerEmail(queryBuyerEmail);
        }
        if (queryBuyerName) {
          setPurchaserName(queryBuyerName);
        }

        // Fetch buyer details from CRM or Profile when we have an ID.
        if (targetBuyerId) {
          const { data: contact } = await supabase.from('crm_contacts').select('name, email, phone, address').eq('id', targetBuyerId).single();
          if (contact) {
            setPurchaserName(contact.name || queryBuyerName || '');
            setBuyerEmail(contact.email || queryBuyerEmail || '');
            setContactNumber(contact.phone || '');
            setBuyerAddress(contact.address || '');
          } else {
            // Fallback to profiles if not in CRM
            const { data: profile } = await supabase.from('profiles').select('full_name, username, email').eq('id', targetBuyerId).single();
            if (profile) {
              setPurchaserName(profile.full_name || profile.username || queryBuyerName || '');
              setBuyerEmail(profile.email || queryBuyerEmail || '');
            }
          }
        }
      } else if (!isSeller) {
          // Normal buyer flow: use their own email
          setBuyerEmail(user.email || '');
      }

      setLoading(false);

      channel = supabase
        .channel('offer-inserts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'octo_offers', filter: `property_id=eq.${propertyId}` },
          (payload: any) => {
            if (payload.new.buyer_id === user.id) {
              setOfferId(payload.new.id);
              setStep(3);
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [isAgentDraftingMode, propertyId, queryBuyerEmail, queryBuyerId, queryBuyerName, router, targetBuyerId, urlOfferId]);

  const handleVerifySignature = async (docIdToVerify: string) => {
    if (!userId) return;
    setVerifying(true);
    try {
      const termsStr = sessionStorage.getItem(`offer_terms_${propertyId}`);
      const offerTerms = termsStr ? JSON.parse(termsStr) : null;

      const response = await fetch('/api/signwell/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docIdToVerify,
          propertyId,
          buyerId: userId,
          agentId: searchParams?.get('agent_id') || null,
          isSeller,
          offerTerms
        })
      });
      const data = await response.json();
      if (data.signed) {
        setStep(3); 
      } else {
        alert("系统尚未检测到您的有效签字。如果您刚签完，请稍等几秒再试。");
      }
    } catch (error) {
      console.error("验证失败", error);
    } finally {
      setVerifying(false);
    }
  };

  const openSignPopup = (url: string, currentDocId: string) => {
    const width = 800; const height = 800;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const signWindow = window.open(url, 'SignWellRoom', `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,status=0,menubar=0`);

    const timer = setInterval(() => {
      if (signWindow?.closed) {
        clearInterval(timer);
        handleVerifySignature(currentDocId);
      }
    }, 1000);
  };

  const handleGenerateContract = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: property, error: pError } = await supabase
        .from('octo_properties')
        .select('id, author_id, author_name')
        .eq('id', propertyId)
        .single();

      if (pError || !property) throw new Error('找不到该房源信息');

      if (isSeller) {
        if (!offerId) throw new Error('未能找到对应的买家出价，请返回重试');
        const { data: offer } = await supabase.from('octo_offers').select('signwell_doc_id').eq('id', offerId).single();
        if (!offer || !offer.signwell_doc_id) throw new Error('未能找到此出价关联的签署文档');
          
        const response = await fetch('/api/signwell/get-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: offer.signwell_doc_id, role: 'seller_id' })
        });
        const data = await response.json();
        
        if (data.signUrl && data.documentId) {
          // 🌟 通知：买家已签署，等待卖家签字
          await supabase.from('notifications').insert({
            receiver_id: property.author_id,
            actor_id: userId,
            type: 'offer_pushed_seller',
            content: '买家已完成签署，等待卖家确认',
            reference_id: propertyId,
            metadata: { offer_id: offerId },
            is_read: false
          });

          setSignUrl(data.signUrl);
          setDocumentId(data.documentId); 
          setStep(2); 
          openSignPopup(data.signUrl, data.documentId); 
        } else {
          throw new Error(data.error || '获取签署链接失败');
        }
      } else {
        // Final terms gathered from the page state
        const selectedLawyer = lawyers.find(l => l.id === selectedLawyerId);
        const finalTerms = {
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
          buyerLawyerAddress: selectedLawyer ? `Professional Chambers, Level 2, Auckland CBD` : null,
          buyerLawyerContact: selectedLawyer ? `0800 LAWYER` : null
        };

        const response = await fetch('/api/signwell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId: selectedTemplate,
              propertyId: propertyId,
              buyerName: purchaserName,
              buyerEmail: isAgentDrafting ? buyerEmail : user.email,
              buyerId: isAgentDrafting ? targetBuyerId : user.id,
              agentId: isAgentDrafting ? user.id : (searchParams?.get('agent_id') || null),
              offerTerms: finalTerms,
              isAgentDrafting, // Flag for the API to send email instead of embedded url
              isAmendment: !!offerId
            }),
          });

          const data = await response.json();

          if (isAgentDrafting) {
            // If agent drafting, there's no popup. Just proceed to success.
            if (data.documentId) {
                setStep(3);
                // 🚀 Automatic redirection back to workspace after 4 seconds
                setTimeout(() => {
                  router.push('/provider-workspace');
                }, 4000);
            } else {
                throw new Error(data.error || '推送失败');
            }
          } else if (data.signUrl && data.documentId) {
            setSignUrl(data.signUrl);
            setDocumentId(data.documentId); 
            setStep(2); 
            openSignPopup(data.signUrl, data.documentId); 
          }
        }
      } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!offerId) return;
    if (!confirm('您确定要拒绝这份出价吗？此操作无法撤销。')) return;

    setRejecting(true);
    try {
      const response = await fetch('/api/signwell/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId,
          propertyId,
          rejectedBy: isSeller ? 'SELLER' : 'BUYER'
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('已成功拒绝该出价');
        router.push(isAgentDrafting ? '/provider-workspace' : `/property/${propertyId}?tab=WORKFLOW`);
      } else {
        throw new Error(data.error || '拒绝失败');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setRejecting(false);
    }
  };

  // Logic to show/hide the Reject Offer button
  const shouldShowRejectButton = offerId && !isAgentDrafting && (
    (isSeller && (offerStatus === 'pending_seller_signature' || !offerStatus)) || 
    (!isSeller && offerStatus === 'pending_buyer_signature')
  );

  if (loading && step === 1) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">正在加载签署环境...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <div className="mb-8 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Octoroom 签署中心</h1>
            <p className="text-gray-500 mt-1 font-mono text-sm">Property ID: {propertyId}</p>
          </div>
          <button onClick={() => router.back()} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-black transition-all">
            返回上一页
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {isSeller && !isAgentDrafting ? (
              /* --- 🌟 Seller's Role: Offer Summary View --- */
              <div className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-100 shadow-xl space-y-10 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-start border-b border-gray-100 pb-8">
                  <div>
                    <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2">Offer Summary</h3>
                    <h2 className="text-3xl font-black text-gray-900">购房出价详细摘要</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] text-gray-400 font-medium">出价时间</div>
                    <div className="text-[15px] font-bold text-gray-900">
                      {offerId ? '待审议' : '实时生成'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[12px] font-black text-gray-400 uppercase mb-2">买家主体 (Purchaser)</h4>
                      <p className="text-lg font-bold text-gray-900">{purchaserName || '未指定'}</p>
                      <p className="text-sm text-gray-500 mt-1">{buyerAddress}</p>
                    </div>
                    <div>
                      <h4 className="text-[12px] font-black text-gray-400 uppercase mb-2">出价总额 (Purchase Price)</h4>
                      <p className="text-3xl font-black text-black">
                        ${Number(offerPrice).toLocaleString()} <span className="text-sm font-bold text-gray-400">NZD</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                      <h4 className="text-[12px] font-black text-gray-400 uppercase mb-3">关键支付节点</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">定金比例:</span>
                          <span className="text-sm font-bold text-gray-900">{deposit}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">交割日期:</span>
                          <span className="text-sm font-bold text-gray-900">{settlementDate || '无条件'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[12px] font-black text-gray-400 uppercase border-b border-gray-50 pb-2">合同附加条件 (Special Conditions)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className={`w-3 h-3 rounded-full ${financeType === 'finance' ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                      <span className="text-sm font-bold text-gray-900">{financeType === 'finance' ? `贷款条款 (${financeDays}天)` : '无贷款条件 (Cash)'}</span>
                    </div>
                    {needsLIM && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-bold text-gray-900">政府档案审查 (LIM {limDays}天)</span>
                      </div>
                    )}
                    {needsBuilding && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-bold text-gray-900">建筑检测报告 (Building {buildingDays}天)</span>
                      </div>
                    )}
                    {needsTox && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-bold text-gray-900">毒检报告 (Tox {toxDays}天)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 flex items-center gap-5">
                   <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <div className="text-sm text-orange-800 leading-relaxed font-medium">
                     请仔细核对以上条款。点击下方按钮后，您将进入 SignWell 安全签署环境，对现有的 S&P 协议进行联署（Countersign）。一旦签署完成，合同将具有法律约束力。
                   </div>
                </div>
              </div>
            ) : (
              /* --- 🛒 Buyer/Agent Role: Interactive Form View --- */
              <>
                {/* Section 1: Basic Info */}
                <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[12px]">A</span> 
                    买方基础信息与价格 
                  </h2>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-1.5">买方全名 (Purchaser Legal Name)</label>
                      <input type="text" value={purchaserName} onChange={(e) => setPurchaserName(e.target.value)} disabled={isSeller && !isAgentDrafting} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-black focus:outline-none disabled:opacity-60" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">联系地址 (Address)</label>
                        <input type="text" value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} disabled={isSeller && !isAgentDrafting} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-black focus:outline-none disabled:opacity-60" />
                      </div>
                      <div>
                        <label className="block text-[13px] font-bold text-gray-700 mb-1.5">联系电话 (Phone)</label>
                        <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} disabled={isSeller && !isAgentDrafting} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-black focus:outline-none disabled:opacity-60" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-1.5">出价金额 (Offer Price)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                        <input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} disabled={isSeller && !isAgentDrafting} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-3 font-black text-lg focus:ring-2 focus:ring-black focus:outline-none disabled:opacity-60" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Conditions */}
                <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[12px]">B</span> 
                    特殊条款 (Conditions)
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-2">资金来源 (Finance)</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => !isSeller && setFinanceType('cash')} className={`py-3 rounded-xl font-bold text-[14px] border transition-all ${financeType === 'cash' ? 'bg-black text-white border-black' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>无条件全款 (Cash)</button>
                        <button type="button" onClick={() => !isSeller && setFinanceType('finance')} className={`py-3 rounded-xl font-bold text-[14px] border transition-all ${financeType === 'finance' ? 'bg-black text-white border-black' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>需要贷款 (Finance)</button>
                      </div>
                      {financeType === 'finance' && (
                        <div className="mt-3 flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="text-[13px] font-bold text-gray-700">所需工作日:</span>
                          <input type="number" value={financeDays} onChange={(e) => setFinanceDays(e.target.value)} disabled={isSeller} className="w-20 bg-white border border-gray-200 rounded-lg py-1.5 text-center font-bold" />
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-3">
                      {[
                        { label: '建检报告 (Building)', checked: needsBuilding, setChecked: setNeedsBuilding, days: buildingDays, setDays: setBuildingDays },
                        { label: '政府档案 (LIM)', checked: needsLIM, setChecked: setNeedsLIM, days: limDays, setDays: setLimDays },
                        { label: '毒检报告 (Tox)', checked: needsTox, setChecked: setNeedsTox, days: toxDays, setDays: setToxDays }
                      ].map((cond, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border transition-all ${cond.checked ? 'bg-blue-50/30 border-blue-100' : 'bg-gray-50 border-gray-200'}`}>
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="font-bold text-[14px] text-gray-900">{cond.label}</span>
                            <input type="checkbox" checked={cond.checked} onChange={(e) => !isSeller && cond.setChecked(e.target.checked)} disabled={isSeller} className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black" />
                          </label>
                          {cond.checked && (
                            <div className="flex items-center gap-3 mt-3">
                              <span className="text-[12px] text-gray-500 font-medium">批准时长 (Days):</span>
                              <input type="number" value={cond.days} onChange={(e) => cond.setDays(e.target.value)} disabled={isSeller} className="w-16 bg-white border border-gray-200 rounded-lg py-1 text-center font-bold text-[13px]" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 3: Deposit & Settlement */}
                <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[12px]">C</span> 
                    定金与交割 (Deposit & Settlement)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-1.5">定金比例 (%)</label>
                      <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} disabled={isSeller} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold disabled:opacity-60" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-1.5">最终交割日 (Settlement)</label>
                      <input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} disabled={isSeller} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold disabled:opacity-60" />
                    </div>
                  </div>
                </div>

                {/* Section 4: Lawyer */}
                <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[12px]">D</span> 
                    买方律师 (Solicitor) 
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lawyers.map(lawyer => (
                      <div 
                        key={lawyer.id} 
                        onClick={() => !isSeller && setSelectedLawyerId(lawyer.id)}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${selectedLawyerId === lawyer.id ? 'border-black bg-gray-50' : 'border-gray-100 opacity-60'}`}
                      >
                        <img src={lawyer.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${lawyer.username}`} className="w-10 h-10 rounded-full border" />
                        <div className="font-bold text-sm">{lawyer.full_name || lawyer.username}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col md:flex-row gap-4">
              {shouldShowRejectButton && (
                <button 
                  onClick={handleRejectOffer} 
                  disabled={loading || rejecting} 
                  className={`flex-1 py-5 rounded-2xl font-bold text-xl transition-all border-2 ${rejecting ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-red-600 border-red-100 hover:bg-red-50 active:scale-[0.98]'}`}
                >
                  {rejecting ? '正在处理...' : '拒绝该出价 (Reject Offer)'}
                </button>
              )}
              <button 
                onClick={handleGenerateContract} 
                disabled={loading || rejecting} 
                className={`flex-[2] py-5 rounded-2xl font-black text-xl shadow-2xl transition-all ${loading ? 'bg-gray-200 text-gray-400' : 'bg-black text-white hover:bg-gray-800 active:scale-[0.98]'}`}
              >
                {loading ? '正在同步数据...' : (isSeller && !isAgentDrafting ? '确认无误，进入补签 (Confirm & Go to Sign)' : (isAgentDrafting ? '推送给买家签署 (Send to Buyer)' : (isSeller ? '审核并接受出价 (Review & Accept Offer)' : '生成正式合同并开始出价 (Submit Offer)')))}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-[32px] shadow-2xl p-16 text-center border border-gray-100 animate-in zoom-in-95 duration-500">
             <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center z-10">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
             </div>
             <h2 className="text-3xl font-black text-gray-900 mb-4">正在等待您完成签署</h2>
             <p className="text-gray-500 mb-10 text-lg">
               请在弹出的加密窗口中完成签字。如果您已签完并看到绿色的页面，<br/>
               <span className="font-bold text-black">请直接关闭弹窗</span>，系统将自动核实并更新状态。
             </p>
             <div className="space-y-4 max-w-sm mx-auto">
                <button onClick={() => documentId && handleVerifySignature(documentId)} disabled={verifying} className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-gray-800 transition-all active:scale-95">
                  {verifying ? '正在联机核实...' : '我已完成签字，点击验证'}
                </button>
                <button onClick={() => openSignPopup(signUrl!, documentId!)} className="w-full bg-blue-50 text-blue-600 py-3 rounded-2xl font-bold hover:bg-blue-100 transition-all">
                  弹窗未弹出？点击重新打开
                </button>
                <button onClick={() => setStep(1)} className="block w-full text-gray-400 hover:text-gray-600 font-medium pt-2">放弃签署并返回</button>
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-[32px] shadow-2xl p-16 text-center border border-blue-100 animate-in zoom-in-95 duration-500 bg-gradient-to-b from-white to-blue-50">
             <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0116 0z" /></svg>
             </div>
             <h2 className="text-3xl font-black text-gray-900 mb-4">{isSeller ? 'Offer 已成功接受！' : (isAgentDrafting ? '出价已成功推送！' : 'Offer 已成功提交！')}</h2>
             <p className="text-blue-800 mb-10 text-lg font-medium">
               {isSeller ? (
                 <>您已成功签署接受该出价，合同已正式生效，<br/>系统将通知买家准备支付定金。</>
               ) : (
                 <>您的 S&P 协议签字已完成，我们已自动通知房东进行审核。<br/>在房东签字确认前，您可以在工作台随时查看 Offer 进度。</>
               )}
             </p>
             
             <button 
               onClick={() => router.push(isAgentDrafting ? '/provider-workspace' : `/property/${propertyId}?tab=WORKFLOW`)} 
               className="px-8 py-4 bg-black text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-gray-800 transition-all active:scale-95"
             >
               {isAgentDrafting ? '立即返回工作台' : '返回交易室查看 OA 进度'}
             </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ContractPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>}>
      <ContractContent />
    </Suspense>
  );
}
