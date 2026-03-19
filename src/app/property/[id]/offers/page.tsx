'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface OfferWithBuyer {
  id: string;
  property_id: string;
  buyer_id: string;
  status: string;
  created_at: string;
  offer_price: number | null;
  buyer_profile: {
    username: string;
    avatar_url: string;
  } | null;
}

export default function SellerOffersPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id as string;

  const [offers, setOffers] = useState<OfferWithBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);

  useEffect(() => {
    const fetchOffers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Verify the user is the author of this property
      const { data: propData, error: propError } = await supabase
        .from('octo_properties')
        .select('id, title, author_id')
        .eq('id', propertyId)
        .single();
        
      if (propError || !propData) {
        alert('找不到房源信息');
        router.back();
        return;
      }

      if (propData.author_id !== user.id) {
        alert('您不是该房源的发布者，无权查看收到的出价');
        router.back();
        return;
      }
      
      setProperty(propData);

      // Fetch all offers for this property
      const { data: offersData, error: offersError } = await supabase
        .from('octo_offers')
        .select('*')
        .eq('property_id', propertyId)
        .in('status', ['pending_seller_signature', 'accepted', 'sold', 'rejected'])
        .order('created_at', { ascending: false });

      if (offersError) {
        console.error('获取出价失败', offersError);
        setLoading(false);
        return;
      }

      if (offersData && offersData.length > 0) {
        // Fetch buyer profiles
        const buyerIds = [...new Set(offersData.map((o: any) => o.buyer_id))].filter(Boolean);
        let profilesMap: Record<string, { username: string, avatar_url: string }> = {};

        if (buyerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', buyerIds);
            
          if (profiles) {
             profiles.forEach((p: any) => {
               profilesMap[p.id] = { username: p.username, avatar_url: p.avatar_url };
             });
          }
        }

        const formattedOffers: OfferWithBuyer[] = offersData.map((offer: any) => ({
          ...offer,
          buyer_profile: offer.buyer_id ? profilesMap[offer.buyer_id] : null
        }));
        
        setOffers(formattedOffers);
      }
      
      setLoading(false);
    };

    fetchOffers();
  }, [propertyId, router]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': 
      case 'sold': 
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[12px] font-bold border border-green-200 shadow-sm">已接受合意</span>;
      case 'rejected': 
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[12px] font-bold border border-red-200 shadow-sm">已婉拒</span>;
      case 'pending_seller_signature':
      default:
        return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[12px] font-bold border border-orange-200 shadow-sm animate-pulse">待您审核签字</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 max-w-[640px] mx-auto w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-[640px] mx-auto w-full min-h-screen bg-gray-50 flex flex-col relative pb-20">
      
      {/* 顶部导航 */}
      <div className="bg-white pt-6 pb-4 px-5 border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <button onClick={() => router.back()} className="mb-4 w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <div className="flex flex-col">
          <h1 className="text-[22px] font-black text-gray-900 leading-tight mb-1">出价管理大厅</h1>
          <p className="text-[14px] font-bold text-gray-500 mt-1 line-clamp-1">{property?.title || '加载中...'}</p>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-5 flex-1">
        {offers.length === 0 ? (
          <div className="mt-16 text-center flex flex-col items-center animate-in fade-in zoom-in-95">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-md border border-gray-100">
               <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
             </div>
             <h3 className="text-xl font-black text-gray-900 mb-2">暂未收到出价</h3>
             <p className="text-[15px] text-gray-500 mb-8 max-w-[260px] leading-relaxed">耐心等待，买家对您的房源提交 Offer 后，会立刻显示在这里。</p>
          </div>
        ) : (
          <div className="space-y-5">
            <h3 className="text-[15px] font-black text-gray-900 mb-2 px-1">收到的 Offer 列表 ({offers.length})</h3>
            
            {offers.map((offer) => {
              const buyerName = offer.buyer_profile?.username || '神秘买家';
              const buyerAvatar = offer.buyer_profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';
              const isAccepted = offer.status === 'accepted' || offer.status === 'sold';
              const isPending = offer.status === 'pending_seller_signature' || !offer.status;

              return (
                <div key={offer.id} className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-4 ${isAccepted ? 'border-green-200 ring-1 ring-green-50' : isPending ? 'border-gray-100' : 'border-gray-200 opacity-75'}`}>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                       <img src={buyerAvatar} alt="Buyer" className="w-12 h-12 rounded-full border border-gray-100 bg-gray-50 shadow-sm object-cover" />
                       <div>
                         <div className="font-black text-[16px] text-gray-900">{buyerName}</div>
                         <div className="text-[12px] text-gray-500 font-medium mt-0.5">{new Date(offer.created_at).toLocaleString()} 提交</div>
                       </div>
                    </div>
                    {getStatusBadge(offer.status)}
                  </div>

                  {offer.offer_price && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100/50 flex items-center justify-between">
                       <span className="text-[13px] font-bold text-gray-500">买方出价金额</span>
                       <span className="text-[18px] font-black text-purple-600">${offer.offer_price.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100">
                    {isPending ? (
                      <button 
                        onClick={() => router.push(`/contract/${propertyId}?offerId=${offer.id}`)}
                        className="w-full py-3 bg-black text-white rounded-xl font-bold text-[14px] shadow-lg shadow-black/20 hover:bg-gray-800 transition-colors active:scale-95 flex items-center justify-center gap-2"
                      >
                        去审核并签署协议
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                    ) : isAccepted ? (
                      <button 
                        onClick={() => router.push(`/property/${propertyId}?tab=WORKFLOW`)}
                        className="w-full py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold text-[14px] hover:bg-green-100 transition-colors active:scale-95 flex items-center justify-center gap-2"
                      >
                        已接受，进入交易大厅 (OA)
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </button>
                    ) : (
                      <button disabled className="w-full py-3 bg-gray-100 text-gray-400 rounded-xl font-bold text-[14px]">
                        该出价已失效
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </main>
  );
}
