'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ContractPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id as string;

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [signUrl, setSignUrl] = useState<string | null>(null);
  
  // SignWell 模板列表
  const [templates] = useState([
    { id: '9b6eeb8e-9cf7-4cf2-99e8-34d1c7782f14', title: '新西兰标准房屋买卖协议 (S&P)' },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);

  const handleGenerateContract = async () => {
    console.log("🚀 开始生成合同流程, 房源ID:", propertyId);
    setLoading(true);
    try {
      // 0. 检查用户登录状态
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('请先登录后再进行签署');
        router.push('/login');
        return;
      }

      // 1. 获取房源信息
      const { data: property, error: pError } = await supabase
        .from('octo_properties')
        .select('id, author_id, author_name')
        .eq('id', propertyId)
        .single();

      if (pError || !property) {
        console.error("查询房源失败:", pError);
        throw new Error(`找不到 ID 为 ${propertyId} 的房源信息，请检查数据库。`);
      }

      console.log("✅ 找到房源，作者 ID 为:", property.author_id);

      // 2. 调用后端 API 生成合同链接 (后端现已负责获取卖家邮箱)
      const response = await fetch('/api/signwell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          propertyId: propertyId,
          buyerName: user.user_metadata?.full_name || user.email?.split('@')[0],
          buyerEmail: user.email,
        }),
      });

      const data = await response.json();

      if (data.signUrl) {
        console.log("🔗 成功拿到签署链接:", data.signUrl);
        setSignUrl(data.signUrl);
        setStep(2); // 切换到等待页
        
        // 🌟 核心升级：打开居中安全弹窗
        const width = 800;
        const height = 800;
        // 计算居中位置
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const signWindow = window.open(
          data.signUrl, 
          'SignWellRoom', 
          `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,status=0,menubar=0`
        );

        if (!signWindow) {
           console.warn("浏览器弹窗被拦截，需用户手动点击打开");
        }
      } else {
        throw new Error(data.error || '生成失败');
      }

    } catch (error: any) {
      console.error('❌ 合同生成流程中断:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Octoroom 签署中心</h1>
            <p className="text-gray-500 mt-1 font-mono text-sm">Property ID: {propertyId}</p>
          </div>
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-black transition-all"
          >
            取消返回
          </button>
        </div>

        {step === 1 ? (
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
                  <p className="text-xs text-gray-400 font-bold uppercase mb-2">签署状态</p>
                  <p className="font-bold text-gray-800 text-green-600">等待生成链接</p>
                </div>
              </div>

              <button
                onClick={handleGenerateContract}
                disabled={loading}
                className={`w-full py-5 rounded-2xl font-black text-xl shadow-2xl transition-all ${
                  loading ? 'bg-gray-200 text-gray-400' : 'bg-black text-white hover:bg-gray-800 active:scale-[0.98]'
                }`}
              >
                {loading ? '正在与加密网络建立连接...' : '生成正式合同并签署'}
              </button>
            </div>
          </div>
        ) : (
          /* 🌟 Step 2: 专业弹窗等待页面 (彻底移除 Iframe) */
          <div className="bg-white rounded-[32px] shadow-2xl p-16 text-center border border-gray-100 animate-in zoom-in-95 duration-500">
             <div className="relative w-24 h-24 mx-auto mb-8">
                {/* 旋转的雷达动画，营造正在通信的安全感 */}
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center z-10">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
             </div>
             
             <h2 className="text-3xl font-black text-gray-900 mb-4">正在安全窗口中签署</h2>
             <p className="text-gray-500 mb-10 text-lg">
               请在弹出的加密窗口中完成 S&P 协议的查阅与签字。<br/>
               <span className="text-sm">浏览器可能会拦截弹窗，如果未自动打开，请点击下方按钮。</span>
             </p>
             
             <div className="space-y-6 max-w-sm mx-auto">
                <button 
                  onClick={() => {
                    // 手动触发打开，浏览器绝对不会拦截用户的显式点击
                    const width = 800; const height = 800;
                    const left = window.screenX + (window.outerWidth - width) / 2;
                    const top = window.screenY + (window.outerHeight - height) / 2;
                    window.open(signUrl!, 'SignWellRoom', `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,status=0,menubar=0`);
                  }}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                >
                  未看到弹窗？点击重新打开
                </button>
                
                <button 
                  onClick={() => setStep(1)}
                  className="block w-full text-gray-400 hover:text-gray-600 font-medium"
                >
                  取消签署并返回修改
                </button>
             </div>

             <div className="mt-16 pt-8 border-t border-gray-50 flex flex-col items-center">
                <div className="flex items-center gap-6 mb-4">
                  <img src="https://www.signwell.com/assets/images/logo.svg" alt="SignWell" className="h-5 opacity-20 grayscale" />
                  <span className="text-gray-200">|</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Global Legal Compliance</span>
                </div>
                <p className="text-[11px] text-gray-300 max-w-xs uppercase">
                  This document is encrypted using SSL/TLS and compliant with NZ Electronic Transactions Act.
                </p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}