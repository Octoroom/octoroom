'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, FileEdit, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AgentOfferReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerId = searchParams.get('offerId');
  const propertyId = params.id;

  const [loading, setLoading] = useState(true);
  const [offerDetails, setOfferDetails] = useState<any>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!offerId) return;

      // 0. 获取当前 Agent 的身份
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
      
      try {
        // 1. 调用专属的后端 API 来获取 Offer 核心信息，绕过 RLS 限制
        const offerRes = await fetch(`/api/workspace/offer-details?offerId=${offerId}&propertyId=${propertyId}&agentId=${session?.user?.id || ''}`);
        
        if (!offerRes.ok) throw new Error("API 响应失败");
        
        const offerData = await offerRes.json();
        if (offerData.error) throw new Error(offerData.error);
        
        const offer = offerData;

        // 3. 把数据喂给前端
        setOfferDetails(offer);

        // 4. 调取真实 PDF 预览
        if (offer.signwell_doc_id) {
          const res = await fetch(`/api/signwell/preview?documentId=${offer.signwell_doc_id}`);
          const previewData = await res.json();
          if (previewData.previewUrl) {
            setPdfPreviewUrl(previewData.previewUrl);
          } else {
            console.error("未能获取到 PDF 预览链接", previewData);
          }
        }
      } catch (err) {
        // 👇 如果这里打印了错，按 F12 就能看到具体原因！
        console.error('Failed to load offer data:', err); 
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [offerId]);

  // 🚀 核心大招：推送给卖家
  const handlePushToSeller = async () => {
    if (!offerId || !propertyId) return;
    setIsPushing(true);
    
    try {
      const res = await fetch('/api/signwell/push-to-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offerId,
          propertyId: propertyId,
          agentId: currentUserId
        })
      });

      if (!res.ok) throw new Error('推送失败');

      // 完美闭环，跳回工作台
      router.push('/provider-workspace'); 
      
    } catch (error) {
      console.error(error);
      alert('推送失败，请检查网络或联系管理员');
    } finally {
      setIsPushing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-bold text-gray-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
        <p>Loading Offer Data...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="bg-white px-6 py-4 border-b border-gray-100 sticky top-0 z-30 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-[18px] font-black text-gray-900">Offer 审核控制台</h1>
            <p className="text-[12px] text-gray-500 font-medium">
              {offerDetails?.properties?.address_name || 'Property Address'} 
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[12px] font-bold">
             等待中介确认
           </span>
        </div>
      </div>

      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6">
        
        <div className="flex-[2] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-[13px] font-bold text-gray-700">合同源文件预览 (PDF)</span>
          </div>
          <div className="flex-1 w-full bg-gray-100/50 min-h-[600px]">
            {pdfPreviewUrl ? (
              <iframe 
                src={pdfPreviewUrl} 
                className="w-full h-full border-none"
                title="Contract Preview"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 font-bold text-sm gap-2">
                <AlertCircle className="w-6 h-6 text-gray-300" />
                <p>无法加载 PDF 预览</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-[16px] font-black text-gray-900 mb-4">交易核心信息</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">出价金额 (Offer Price)</label>
                <p className="text-[24px] font-black text-gray-900">${offerDetails?.offer_price?.toLocaleString() || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">定金 (Deposit)</label>
                  <p className="text-[14px] font-bold text-gray-800">${offerDetails?.deposit?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">交割日 (Settlement)</label>
                  <p className="text-[14px] font-bold text-gray-800">{offerDetails?.settlement_date || 'TBD'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-3">
            <h2 className="text-[14px] font-black text-gray-900 mb-2">中介审核操作</h2>
            
            <button 
              onClick={handlePushToSeller}
              disabled={isPushing}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-black text-white rounded-xl font-black text-[14px] hover:bg-gray-800 active:scale-[0.98] transition-all shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isPushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isPushing ? '正在推送...' : '审核无误，推送给卖家签署'}
            </button>

            <button 
              onClick={() => router.push(`/contract/${propertyId}/prepare?offerId=${offerId}&mode=amend`)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-black text-[14px] hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              <FileEdit className="w-4 h-4" />
              退回修改 / 调整合同 (Amend)
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}