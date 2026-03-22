'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, FileEdit, Eye, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    async function loadOffer() {
      if (!offerId) return;
      
      // 1. 从数据库获取 Offer 信息
      const { data: offer, error } = await supabase
        .from('octo_offers')
        .select('*, properties:property_id(title, address_name)')
        .eq('id', offerId)
        .single();

      if (error) {
        console.error('Failed to load offer:', error);
        setLoading(false);
        return;
      }

      setOfferDetails(offer);

      // 2. 调用你的 API 获取 SignWell 的 PDF 预览链接
      // 这里你需要写一个后端的 GET 接口去向 SignWell 请求 document_url 或 preview_url
      // 例如：const res = await fetch(`/api/signwell/preview?documentId=${offer.signwell_doc_id}`);
      // const data = await res.json();
      // setPdfPreviewUrl(data.previewUrl);
      
      // 临时用一个假链接占位，等你接好 API 替换
      setPdfPreviewUrl(`https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`);
      setLoading(false);
    }

    loadOffer();
  }, [offerId]);

  // 推送给卖家的核心逻辑
  const handlePushToSeller = async () => {
    setIsPushing(true);
    try {
      // 在这里调用你的 /api/signwell/route.ts 或专门的 push 接口
      // 触发向卖家发送签名邮件，并更新数据库状态为 pending_seller_signature
      alert('已成功推送给卖家！');
      router.push('/provider-workspace'); // 推送完返回工作台
    } catch (error) {
      alert('推送失败，请重试');
    } finally {
      setIsPushing(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">Loading Offer...</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* 顶部导航 */}
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
        
        {/* 左侧：PDF 预览区 */}
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
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                无法加载预览文件
              </div>
            )}
          </div>
        </div>

        {/* 右侧：操作控制面板 */}
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

              <div className="border-t border-gray-100 pt-4">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2 block">附加条件 (Conditions)</label>
                {offerDetails?.conditions?.length > 0 ? (
                  <ul className="list-disc pl-4 text-[13px] font-medium text-gray-600 space-y-1">
                    {offerDetails.conditions.map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                ) : (
                  <p className="text-[13px] text-gray-400 italic font-medium">无条件 (Unconditional)</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-3">
            <h2 className="text-[14px] font-black text-gray-900 mb-2">中介审核操作</h2>
            
            <button 
              onClick={handlePushToSeller}
              disabled={isPushing}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-black text-white rounded-xl font-black text-[14px] hover:bg-gray-800 active:scale-[0.98] transition-all shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isPushing ? '正在推送...' : '审核无误，推送给卖家签署'}
            </button>

            <button 
              onClick={() => router.push(`/contract/${propertyId}/prepare?offerId=${offerId}&mode=amend`)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-black text-[14px] hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              <FileEdit className="w-4 h-4" />
              退回修改 / 调整合同 (Amend)
            </button>
            
            <p className="text-[11px] font-medium text-gray-400 flex items-start gap-1 mt-2">
               <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
               推送给卖家后，系统将自动向卖家发送带有签字链接的邮件。
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}