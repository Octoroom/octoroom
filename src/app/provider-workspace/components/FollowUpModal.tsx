'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Square, Sparkles, Save, Loader2, Phone } from 'lucide-react';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyerName: string;
  onSave: (summary: string, transcript: string, recommendedStatus?: string) => Promise<void>;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({ isOpen, onClose, buyerName, onSave }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [recommendedStatus, setRecommendedStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Simulated transcription logic
  useEffect(() => {
    if (isRecording) {
      const phrases = [
        "你好，我是代理人，关于昨天的看房...",
        "买家想了解关于房产证办理的细节。",
        "我们讨论了首付比例，买家希望能控制在30%以内。",
        "买家对花园的朝向非常满意，但对二楼的层高有些顾虑。",
        "预计本周五会给出最终答复。",
        "通话非常顺利，买家意向度很高。"
      ];
      let i = 0;
      timerRef.current = setInterval(() => {
        setTranscript(prev => prev + (prev ? ' ' : '') + phrases[i % phrases.length]);
        i++;
      }, 2500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const handleSummarize = async () => {
    if (!transcript) return;
    setIsSummarizing(true);
    
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript, buyerName }),
      });

      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        if (data.recommendedStatus) {
          setRecommendedStatus(data.recommendedStatus);
        }
      } else {
        setSummary(data.error || "AI 摘要生成失败，请稍后重试。");
      }
    } catch (err) {
      console.error("Summarization error:", err);
      setSummary("连接 AI 服务失败。");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(summary, transcript, recommendedStatus);
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
      <style>{`
        @keyframes wave {
          0%, 100% { height: 8px; opacity: 0.3; }
          50% { height: 32px; opacity: 1; }
        }
        .wave-bar {
          width: 4px;
          background: #3b82f6;
          border-radius: 4px;
          margin: 0 2px;
        }
        .animate-wave-1 { animation: wave 1s ease-in-out infinite; }
        .animate-wave-2 { animation: wave 1s ease-in-out infinite 0.2s; }
        .animate-wave-3 { animation: wave 1s ease-in-out infinite 0.4s; }
        .animate-wave-4 { animation: wave 1s ease-in-out infinite 0.1s; }
        .animate-wave-5 { animation: wave 1s ease-in-out infinite 0.3s; }

        .glass-panel {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .ai-card {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%);
          border: 1px solid rgba(59, 130, 246, 0.1);
        }
      `}</style>

      <div className="glass-panel w-full max-w-[540px] rounded-[40px] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-500">
        
        {/* Header - Premium Minimalist */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 rotate-3">
                <Sparkles className="w-6 h-6 animate-pulse" />
             </div>
             <div>
                <h2 className="text-gray-900 text-[20px] font-black tracking-tight leading-none">AI 电话跟进助手</h2>
                <div className="flex items-center gap-2 mt-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                   <p className="text-gray-500 text-[12px] font-bold uppercase tracking-widest">正在与 <span className="text-blue-600">{buyerName}</span> 通话</p>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100/50 rounded-2xl text-gray-400 transition-all hover:rotate-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          
          {/* Main Visualization Center */}
          <div className="flex flex-col items-center justify-center py-6 relative">
            {/* Background Decorative Rings */}
            <div className={`absolute w-40 h-40 border-2 rounded-full transition-all duration-1000 ${isRecording ? 'border-blue-500/20 scale-125 opacity-100' : 'border-gray-100 scale-90 opacity-0'}`} />
            <div className={`absolute w-32 h-32 border-2 rounded-full transition-all duration-700 delay-100 ${isRecording ? 'border-blue-400/30 scale-110 opacity-100' : 'border-gray-50 scale-75 opacity-0'}`} />

            <div className="relative z-10 flex flex-col items-center gap-6">
              {!isRecording ? (
                <button 
                  onClick={() => setIsRecording(true)}
                  className="group flex flex-col items-center gap-4 transition-transform active:scale-95"
                >
                  <div className="w-24 h-24 rounded-[32px] bg-white shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] flex items-center justify-center text-blue-600 hover:text-blue-700 transition-all border border-gray-100 group-hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.2)]">
                    <Mic className="w-10 h-10" />
                  </div>
                  <span className="text-[14px] font-black text-gray-400 tracking-tight">点击开启 AI 智能监听</span>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  {/* Active Waveform */}
                  <div className="flex items-end h-12 gap-1 mb-2">
                    <div className="wave-bar animate-wave-1 bg-blue-500" />
                    <div className="wave-bar animate-wave-2 bg-indigo-500" />
                    <div className="wave-bar animate-wave-3 bg-purple-500" />
                    <div className="wave-bar animate-wave-4 bg-indigo-500" />
                    <div className="wave-bar animate-wave-5 bg-blue-500" />
                    <div className="wave-bar animate-wave-2 bg-blue-400" />
                    <div className="wave-bar animate-wave-4 bg-indigo-400" />
                  </div>
                  
                  <button 
                    onClick={() => setIsRecording(false)}
                    className="flex items-center gap-3 px-8 py-3 bg-red-500 text-white rounded-2xl font-black text-[14px] shadow-xl shadow-red-500/30 hover:bg-red-600 transition-all active:scale-95 group"
                  >
                    <Square className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                    结束监听并总结
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Transcript & Summary Side-by-Side like high-end CRM */}
            <div className="space-y-6">
              {/* Transcript Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">实时通话转录</label>
                  {isRecording && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-black animate-pulse">RECORDING LIVE</span>}
                </div>
                <div className="bg-white/50 border border-gray-100 rounded-[24px] p-5 h-44 overflow-y-auto text-gray-600 text-[14px] font-medium leading-relaxed shadow-sm scrollbar-hide">
                  {transcript || <span className="text-gray-300 italic">等待语音输入，AI 助手将实时转录通话内容...</span>}
                  {isRecording && <span className="inline-block w-1.5 h-4 bg-blue-500 ml-1 rounded-full animate-bounce"></span>}
                </div>
              </div>

              {/* AI Summary Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">AI 智能摘要 & 建议</label>
                  <button 
                    onClick={handleSummarize}
                    disabled={!transcript || isSummarizing}
                    className="group flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-[11px] font-black shadow-lg shadow-blue-500/20 disabled:opacity-20 transition-all hover:scale-105 active:scale-95"
                  >
                    {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    一键提炼
                  </button>
                </div>
                
                <div className="ai-card rounded-[24px] p-5 min-h-[160px] flex flex-col justify-between shadow-sm">
                  <div className="text-gray-800 text-[14px] font-bold leading-loose whitespace-pre-wrap">
                    {summary || <span className="text-blue-300/60 italic font-medium">生成的 AI 摘要将在此处显示，包含关键报价、意向评估等信息...</span>}
                  </div>
                  
                  {recommendedStatus && (
                    <div className="mt-6 flex items-center gap-3 p-3 bg-white/60 rounded-2xl border border-blue-100 animate-in slide-in-from-bottom-4 duration-700">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                         <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">建议管线状态</p>
                         <p className="text-[13px] font-black text-gray-900">{recommendedStatus}</p>
                      </div>
                      <div className="px-3 py-1 bg-orange-500 text-white rounded-full text-[10px] font-black shadow-lg shadow-orange-500/20">
                         UPDATE
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Minimalist Glass */}
        <div className="px-8 py-8 flex items-center justify-end gap-4 mt-auto">
          <button 
            onClick={onClose}
            className="px-6 py-4 rounded-2xl text-gray-400 font-black text-[14px] hover:text-gray-600 hover:bg-gray-100/50 transition-all"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            disabled={!summary || isSaving}
            className="group flex items-center gap-3 bg-gray-900 text-white px-10 py-4 rounded-[24px] font-black text-[14px] hover:bg-black transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-2xl shadow-gray-400/20"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            完成跟进并同步
          </button>
        </div>
      </div>
    </div>
  );
};
