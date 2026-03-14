'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ContractPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const propertyId = params?.id as string;
  const urlOfferId = searchParams?.get('offerId') as string | null;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [propertyStatus, setPropertyStatus] = useState<string>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState<boolean>(false);
  
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
        .select('id, status, signwell_doc_id')
        .eq('property_id', propertyId);

      if (urlOfferId) {
        offerQuery = offerQuery.eq('id', urlOfferId);
      } else {
        offerQuery = offerQuery.eq('buyer_id', user.id);
      }
      
      const { data: offer } = await offerQuery.single();
        
      if (offer) {
        setOfferId(offer.id);
        const isUserSeller = propData?.author_id === user.id;
        if (!isUserSeller || offer.status === 'accepted' || offer.status === 'sold') {
          setStep(3);
        }
      }
      setLoading(false);

      channel = supabase
        .channel('offer-inserts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'octo_offers', filter: `property_id=eq.${propertyId}` },
          (payload) => {
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
  }, [propertyId, router]);

  const handleVerifySignature = async (docIdToVerify: string) => {
    if (!userId) return;
    setVerifying(true);
    try {
      const termsStr = sessionStorage.getItem(`offer_terms_${propertyId}`);
      const offerTerms = termsStr ? JSON.parse(termsStr) : null;

      const response = await fetch('/api/signwell/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docIdToVerify, propertyId, buyerId: userId, isSeller, offerTerms })
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
          
        const response = await fetch('/api/signwell/seller', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: offer.signwell_doc_id })
        });
        const data = await response.json();
        
        if (data.signUrl && data.documentId) {
          setSignUrl(data.signUrl);
          setDocumentId(data.documentId); 
          setStep(2); 
          openSignPopup(data.signUrl, data.documentId); 
        } else {
          throw new Error(data.error || '获取签署链接失败');
        }
      } else {
        // Read terms from sessionStorage established in the prepare page
        const termsStr = sessionStorage.getItem(`offer_terms_${propertyId}`);
        const terms = termsStr ? JSON.parse(termsStr) : null;
        
        const finalBuyerName = terms?.purchaserName 
          ? terms.purchaserName 
          : (user.user_metadata?.full_name || user.email?.split('@')[0]);

        const response = await fetch('/api/signwell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: selectedTemplate,
            propertyId: propertyId,
            buyerName: finalBuyerName,
            buyerEmail: user.email,
            buyerId: user.id,
            offerTerms: terms
          }),
        });

        const data = await response.json();

        if (data.signUrl && data.documentId) {
          setSignUrl(data.signUrl);
          setDocumentId(data.documentId); 
          setStep(2); 
          openSignPopup(data.signUrl, data.documentId); 
        } else {
          throw new Error(data.error || '生成失败');
        }
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

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
          <div className="bg-white rounded-[32px] shadow-2xl p-10 border border-gray-100 animate-in fade-in zoom-in-95">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <span className="bg-black text-white w-10 h-10 rounded-xl flex items-center justify-center">1</span>
              确认买卖协议条款
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-2">文件类型</p>
                  <p className="font-bold text-gray-800">{templates[0].title}</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-2">当前房源状态</p>
                  <p className="font-bold text-blue-600 uppercase">{propertyStatus}</p>
                </div>
              </div>
              <button onClick={handleGenerateContract} disabled={loading} className={`w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all ${loading ? 'bg-gray-200 text-gray-400' : 'bg-black text-white hover:bg-gray-800 active:scale-[0.98]'}`}>
                {loading ? '正在与加密网络建立连接...' : (isSeller ? '审核并接受出价 (Review & Accept Offer)' : '生成正式合同并开始出价 (Submit Offer)')}
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
             <h2 className="text-3xl font-black text-gray-900 mb-4">{isSeller ? 'Offer 已成功接受！' : 'Offer 已成功提交！'}</h2>
             <p className="text-blue-800 mb-10 text-lg font-medium">
               {isSeller ? (
                 <>您已成功签署接受该出价，合同已正式生效，<br/>系统将通知买家准备支付定金。</>
               ) : (
                 <>您的 S&P 协议签字已完成，我们已自动通知房东进行审核。<br/>在房东签字确认前，您可以在工作台随时查看 Offer 进度。</>
               )}
             </p>
             
             {/* 🌟 核心修改点：带上 tab 参数，直接跳转回房源室的 OA 面板 */}
             <button 
               onClick={() => router.push(`/property/${propertyId}?tab=WORKFLOW`)} 
               className="px-8 py-4 bg-black text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-gray-800 transition-all active:scale-95"
             >
               返回交易室查看 OA 进度
             </button>
          </div>
        )}

      </div>
    </div>
  );
}