'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    status: 'active',
    saleMethod: '一口价',
    priceAmount: '',
    priceDisplay: '',
    description: '',
    features: ''
  });

  const [propertyInfo, setPropertyInfo] = useState<any>(null);
  const [isInWorkspace, setIsInWorkspace] = useState(false);

  useEffect(() => {
    fetchProperty();
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      // 1. 检查有没有拿到 URL 里的 ID
      if (!propertyId) {
        throw new Error("路由参数为空！请检查文件夹是否被正确命名为了 [id]");
      }

      // 2. 检查登录状态
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("登录状态失效，请重新登录");
        router.push('/');
        return;
      }

      // 3. 去数据库查这个房源 (暂时把 author_id 的强制过滤去掉，用来排错)
      const { data, error } = await supabase
        .from('octo_properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) throw error; // 抛出 Supabase 的原生报错

      // 4. 检查权限
      if (data.author_id !== user.id) {
         throw new Error(`权限不足: 当前登录账号(${user.id})不是此房源的发布者(${data.author_id})`);
      }

      // 5. 数据赋值
      if (data) {
        const workspaceRes = await fetch(`/api/workspace/properties?agentId=${user.id}`);
        const workspaceData = await workspaceRes.json();
        setIsInWorkspace(Array.isArray(workspaceData.propertyIds) ? workspaceData.propertyIds.includes(propertyId) : false);
        setPropertyInfo(data);
        setFormData({
          title: data.title || '',
          status: data.status || 'active',
          saleMethod: data.sale_method || '一口价',
          priceAmount: data.raw_price || '',
          priceDisplay: data.price_display || '',
          description: data.description || '',
          features: data.features || ''
        });
      }
    } catch (error: any) {
      console.error("加载失败详情:", error);
      // 把最核心的报错信息直接弹到屏幕上！
      alert(`无法加载房源 🚨\n\n原因: ${error.message}\n当前房源ID: ${propertyId}`);
      router.push('/my-properties');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      // 重新组装展示价格
      let newPriceDisplay = formData.saleMethod;
      if (formData.saleMethod === '一口价' || formData.saleMethod === '询价起点') {
        newPriceDisplay = `${formData.saleMethod} $${Number(formData.priceAmount).toLocaleString()} NZD`;
      }

      const { error } = await supabase
        .from('octo_properties')
        .update({
          title: formData.title,
          status: formData.status,
          sale_method: formData.saleMethod,
          raw_price: formData.priceAmount,
          price_display: newPriceDisplay,
          description: formData.description
        })
        .eq('id', propertyId);

      if (error) throw error;
      
      alert("房源信息更新成功！");
      router.push('/my-properties');
    } catch (error: any) {
      alert("更新失败: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWorkspace = async (visible: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("登录状态失效，请重新登录");
        return;
      }

      const res = await fetch('/api/workspace/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: user.id,
          propertyId,
          visible,
          source: 'author_posted'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Workspace update failed');

      setIsInWorkspace(visible);
    } catch (error: any) {
      alert("Workspace 更新失败: " + error.message);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm("🚨 确定要永久下架并删除该房源吗？此操作不可逆！");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('octo_properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;
      alert("房源已成功删除。");
      router.push('/my-properties');
    } catch (error: any) {
      alert("删除失败: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-[640px] w-full min-h-screen border-r border-gray-100 bg-gray-50 flex flex-col relative pb-20">
      
      {/* 头部导航 */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <div>
          <h1 className="text-lg font-black text-gray-900 line-clamp-1">管理: {propertyInfo?.address_name || '房源详情'}</h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">房东专属管理面板</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        
        {/* 只读概览卡片 */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-4">
           {propertyInfo?.cover_image && (
             <img src={propertyInfo.cover_image.split(',')[0]} alt="cover" className="w-24 h-24 rounded-xl object-cover bg-gray-100 border border-gray-200" />
           )}
           <div className="flex flex-col justify-center">
             <div className="text-xs font-bold text-gray-500 mb-1">{propertyInfo?.property_type} · {propertyInfo?.bedrooms}卧{propertyInfo?.bathrooms}卫</div>
             <div className="text-[15px] font-black text-gray-900 line-clamp-2">{propertyInfo?.title}</div>
           </div>
        </div>

        {/* 核心状态管理 (新西兰特色) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <label className="block text-[13px] font-bold text-gray-900 mb-3 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            修改房屋交易状态
          </label>
          <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
            <div>
              <div className="text-[13px] font-black text-gray-900">Workspace</div>
              <div className="text-[11px] text-gray-500 font-medium mt-1">Control whether this property appears in the agent workspace.</div>
            </div>
            <button
              onClick={() => handleToggleWorkspace(!isInWorkspace)}
              className={`px-4 py-2 rounded-full text-[12px] font-black transition-colors ${isInWorkspace ? 'bg-black text-white hover:bg-gray-800' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            >
              {isInWorkspace ? 'Remove' : 'Add'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button 
              onClick={() => setFormData({...formData, status: 'active'})}
              className={`py-2.5 px-3 rounded-xl border text-[13px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${formData.status === 'active' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
            >
              <span>正在售卖</span>
              <span className="text-[10px] font-medium opacity-80">(Active)</span>
            </button>
            <button 
              onClick={() => setFormData({...formData, status: 'under_contract'})}
              className={`py-2.5 px-3 rounded-xl border text-[13px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${formData.status === 'under_contract' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
            >
              <span>OA交割中</span>
              <span className="text-[10px] font-medium opacity-80">(Under Contract)</span>
            </button>
            <button 
              onClick={() => setFormData({...formData, status: 'sold'})}
              className={`py-2.5 px-3 rounded-xl border text-[13px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${formData.status === 'sold' ? 'bg-gray-900 border-gray-900 text-white shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
            >
              <span>已售出无条件</span>
              <span className="text-[10px] font-medium opacity-80">(Unconditional)</span>
            </button>
          </div>
        </div>

        {/* 基础信息修改 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">房源大标题 (Headline)</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={(e) => setFormData({...formData, title: e.target.value})} 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-gray-900/20 font-medium" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">出售方式</label>
              <select 
                value={formData.saleMethod} 
                onChange={(e) => setFormData({...formData, saleMethod: e.target.value})} 
                className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 text-[13px] font-medium focus:ring-2 focus:ring-gray-900/20 outline-none"
              >
                <option value="一口价">一口价 (Asking Price)</option>
                <option value="询价起点">询价起点 (Enquiries Over)</option>
                <option value="拍卖">拍卖预告 (Auction)</option>
                <option value="议价">面议 (By Negotiation)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">预期金额 (NZD)</label>
              <input 
                type="number" 
                disabled={formData.saleMethod === '拍卖' || formData.saleMethod === '议价'} 
                value={formData.priceAmount} 
                onChange={(e) => setFormData({...formData, priceAmount: e.target.value})} 
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-[13px] font-medium outline-none focus:ring-2 disabled:bg-gray-100 disabled:text-gray-400" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">房源详情描述 (可更新 Open Home 时间等)</label>
            <textarea 
              rows={6} 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none resize-none focus:ring-2 focus:ring-gray-900/20 leading-relaxed"
            ></textarea>
          </div>
        </div>

        {/* 危险操作区 */}
        <div className="pt-4 flex justify-between items-center">
           <button 
             onClick={handleDelete}
             className="text-[13px] font-bold text-red-500 hover:text-red-600 px-2 flex items-center gap-1"
           >
             <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
             永久删除房源
           </button>

           <button 
             onClick={handleUpdate} 
             disabled={saving}
             className="bg-gray-900 hover:bg-black text-white font-bold py-2.5 px-6 rounded-full shadow-sm flex items-center gap-2 text-[14px] transition-colors disabled:opacity-50"
           >
             {saving ? '保存中...' : '保存更改'}
           </button>
        </div>
      </div>
    </main>
  );
}
