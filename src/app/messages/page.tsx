'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
// 🌟 引入 Emoji 选择器
import EmojiPicker from 'emoji-picker-react';

interface Conversation {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_avatar: string;
  last_message: string;
  updated_at: string;
  unread_count: number;
  all_convo_ids: string[]; 
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  conversation_id: string;
  is_read?: boolean;
  image_url?: string; 
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const chatWithId = searchParams?.get('chatWith');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImages, setSelectedImages] = useState<{file: File; previewUrl: string}[]>([]);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvoRef = useRef<Conversation | null>(null);
  
  // 🌟 新增：最外层滑动容器的 Ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  
  const emojiRef = useRef<HTMLDivElement>(null);
  const gifRef = useRef<HTMLDivElement>(null);

  useEffect(() => { activeConvoRef.current = activeConvo; }, [activeConvo]);

  // 点击外部关闭表情/GIF面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
      if (gifRef.current && !gifRef.current.contains(e.target as Node)) setShowGifPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // GIF 搜索逻辑
  useEffect(() => {
    if (!showGifPicker) return;
    const fetchGifs = async () => {
      setLoadingGifs(true);
      try {
        const apiKey = 'GlVGYHqc3SyCEw02A0BcbXUOW3aFm7hB';
        const endpoint = gifSearch.trim()
          ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(gifSearch)}&limit=20`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20`;
        const res = await fetch(endpoint);
        const data = await res.json();
        setGifs(data.data || []);
      } catch (e) {
        console.error("GIF加载失败", e);
      } finally {
        setLoadingGifs(false);
      }
    };
    const timer = setTimeout(fetchGifs, 500);
    return () => clearTimeout(timer);
  }, [gifSearch, showGifPicker]);

  // 1. 初始化会话列表
  useEffect(() => {
    let isMounted = true;
    async function initChat() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (isMounted) setLoading(false); return; }
      if (isMounted) setCurrentUserId(user.id);

      const { data: convos } = await supabase.from('conversations').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).order('updated_at', { ascending: false });
      const { data: unreadMsgs } = await supabase.from('messages').select('conversation_id').eq('is_read', false).neq('sender_id', user.id);

      const unreadMap: Record<string, number> = {};
      unreadMsgs?.forEach(msg => { unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1; });

      if (convos) {
        const enrichedConvos = await Promise.all(convos.map(async (c) => {
          const partnerId = c.user1_id === user.id ? c.user2_id : c.user1_id;
          const { data: partnerProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', partnerId).single();
          return {
            id: c.id, partner_id: partnerId, partner_name: partnerProfile?.username || '神秘用户',
            partner_avatar: partnerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`,
            last_message: c.last_message || '开始聊天吧', updated_at: c.updated_at,
            unread_count: unreadMap[c.id] || 0, all_convo_ids: [c.id] 
          };
        }));
        
        if (!isMounted) return;

        const uniqueMap = new Map<string, Conversation>();
        enrichedConvos.forEach(c => {
          if (uniqueMap.has(c.partner_id)) {
            const existing = uniqueMap.get(c.partner_id)!;
            existing.unread_count += c.unread_count; 
            if (!existing.all_convo_ids.includes(c.id)) existing.all_convo_ids.push(c.id);       
            if (new Date(c.updated_at) > new Date(existing.updated_at)) {
              existing.updated_at = c.updated_at; existing.last_message = c.last_message; existing.id = c.id; 
            }
          } else { uniqueMap.set(c.partner_id, c); }
        });

        let finalConvos = Array.from(uniqueMap.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        if (chatWithId && chatWithId !== user.id) {
          const existingConvo = finalConvos.find(c => c.partner_id === chatWithId);
          if (existingConvo) { handleSelectConvo(existingConvo, user.id); } 
          else {
            const { data: partnerProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', chatWithId).single();
            const tempConvo: Conversation = {
              id: 'temp_new', partner_id: chatWithId, partner_name: partnerProfile?.username || '神秘用户',
              partner_avatar: partnerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chatWithId}`,
              last_message: '新对话', updated_at: new Date().toISOString(), unread_count: 0, all_convo_ids: ['temp_new']
            };
            finalConvos = [tempConvo, ...finalConvos]; setActiveConvo(tempConvo);
          }
        } else if (finalConvos.length > 0 && !chatWithId) { handleSelectConvo(finalConvos[0], user.id); }
        setConversations(finalConvos);
      }
      if (isMounted) setLoading(false);
    }
    initChat(); return () => { isMounted = false; };
  }, [chatWithId]);

  // 2. 拉取消息
  useEffect(() => {
    async function fetchMessages() {
      if (!activeConvo || activeConvo.id === 'temp_new') { setMessages([]); return; }
      const { data } = await supabase.from('messages').select('*').in('conversation_id', activeConvo.all_convo_ids).order('created_at', { ascending: true });
      if (data) setMessages(data);
    }
    fetchMessages();
  }, [activeConvo]);

  // 🌟 滑动到左侧列表
  const scrollToLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  // 🌟 滑动到右侧聊天
  const scrollToRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: scrollContainerRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  // 3. 选中用户并处理滑动逻辑
  const handleSelectConvo = (convo: Conversation, overrideUserId?: string) => {
    // 🌟 核心小巧思：如果用户点击的是【当前正在聊天的对象】，则展开左侧列表供其查看其他好友
    if (activeConvo?.partner_id === convo.partner_id) {
      scrollToLeft();
      return;
    }

    setActiveConvo(convo);
    const activeUserId = overrideUserId || currentUserId;
    if (convo.unread_count > 0 && activeUserId) {
      const countToClear = convo.unread_count;
      setConversations(prev => prev.map(c => c.partner_id === convo.partner_id ? { ...c, unread_count: 0 } : c));
      window.dispatchEvent(new CustomEvent('local_messages_read', { detail: { readCount: countToClear } }));
      supabase.from('messages').update({ is_read: true }).in('conversation_id', convo.all_convo_ids).eq('sender_id', convo.partner_id).eq('is_read', false).then();
    }
    
    // 🌟 选中新用户后，自动滑出右侧聊天界面
    setTimeout(scrollToRight, 100);
  };

  // 4. WebSocket 实时监听
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase.channel('realtime_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id === currentUserId) return;
        setConversations(prev => {
          let updatedConvos = [...prev];
          const convoIndex = updatedConvos.findIndex(c => c.all_convo_ids.includes(newMsg.conversation_id) || c.partner_id === newMsg.sender_id);
          if (convoIndex > -1) {
            const currentActive = activeConvoRef.current;
            const isCurrentlyChatting = currentActive && currentActive.partner_id === newMsg.sender_id;
            updatedConvos[convoIndex] = { ...updatedConvos[convoIndex], last_message: newMsg.content, updated_at: newMsg.created_at, unread_count: isCurrentlyChatting ? 0 : updatedConvos[convoIndex].unread_count + 1 };
            if (isCurrentlyChatting) { setMessages(mPrev => [...mPrev, newMsg]); supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then(); }
            const [targetConvo] = updatedConvos.splice(convoIndex, 1); updatedConvos.unshift(targetConvo);
          }
          return updatedConvos;
        });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // 核心消息发送逻辑
  const performSend = async (contentStr: string, imgUrlStr?: string) => {
    if (!activeConvo || !currentUserId) return;
    let finalConvoId = activeConvo.id;

    if (finalConvoId === 'temp_new') {
      const sortedIds = [currentUserId, activeConvo.partner_id].sort();
      const { data: existingDbConvo } = await supabase.from('conversations').select('id').eq('user1_id', sortedIds[0]).eq('user2_id', sortedIds[1]).single();
      if (existingDbConvo) {
         finalConvoId = existingDbConvo.id;
      } else {
         const { data: newConvoData } = await supabase.from('conversations').insert([{ user1_id: sortedIds[0], user2_id: sortedIds[1], last_message: contentStr }]).select().single();
         if(newConvoData) finalConvoId = newConvoData.id;
      }
      setActiveConvo(prev => prev ? { ...prev, id: finalConvoId, all_convo_ids: [...prev.all_convo_ids, finalConvoId] } : null);
      setConversations(prev => prev.map(c => c.partner_id === activeConvo.partner_id ? { ...c, id: finalConvoId, all_convo_ids: [...c.all_convo_ids, finalConvoId] } : c));
    }

    const tempMessage: Message = { id: uuidv4(), sender_id: currentUserId, content: contentStr, created_at: new Date().toISOString(), conversation_id: finalConvoId, image_url: imgUrlStr };
    setMessages(prev => [...prev, tempMessage]);
    setConversations(prev => prev.map(c => c.partner_id === activeConvo.partner_id ? { ...c, last_message: contentStr, updated_at: new Date().toISOString() } : c).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));

    await supabase.from('messages').insert([{ conversation_id: finalConvoId, sender_id: currentUserId, content: contentStr, image_url: imgUrlStr }]);
    await supabase.from('conversations').update({ last_message: contentStr, updated_at: new Date().toISOString() }).eq('id', finalConvoId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const msg = inputMsg.trim();
    setInputMsg(''); 
    setShowEmojiPicker(false);
    try { await performSend(msg); } catch (err) { alert("消息发送失败"); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    const newSelected = files.map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
    setSelectedImages(prev => [...prev, ...newSelected]);
    setShowEmojiPicker(false); setShowGifPicker(false);
  };

  const handleRemovePreview = (index: number) => {
    setSelectedImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleCancelAllPreviews = () => {
    selectedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setSelectedImages([]);
  };

  const handleConfirmSendImages = async () => {
    if (selectedImages.length === 0 || !currentUserId) return;
    setIsUploading(true);
    try {
      for (const img of selectedImages) {
        const fileExt = img.file.name.split('.').pop();
        const filePath = `${currentUserId}/${uuidv4()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('chat-images').upload(filePath, img.file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(filePath);
        await performSend('[图片]', publicUrl);
      }
      setSelectedImages([]);
    } catch (err) { 
      alert("图片上传失败"); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    setShowGifPicker(false);
    try { await performSend('[GIF动图]', gifUrl); } catch (err) { alert("GIF发送失败"); }
  };

  const handleGoToProfile = (partnerId: string) => { router.push(`/user/${partnerId}`); };

  if (loading) return <div className="flex-1 min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>;

  if (!currentUserId) return (
    <div className="flex-1 min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center p-8">
      <h2 className="text-xl font-bold text-gray-800">请先登录</h2>
    </div>
  );

  return (
    // 🌟 外层滚动容器：恢复 max-w-4xl，增加 overflow-x-auto, snap-x 及 隐藏滚动条样式
    <main 
      ref={scrollContainerRef}
      className="flex-1 max-w-4xl mx-auto w-full min-h-screen bg-white flex overflow-x-auto snap-x snap-mandatory border-x border-gray-100 shadow-sm relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      style={{ scrollBehavior: 'smooth' }}
    >
      
      {/* 🌟 左侧：私信列表 -> 锁死 320px，点击任何空白处向左滑到底 */}
      <div 
        onClick={scrollToLeft}
        className="w-[320px] shrink-0 border-r border-gray-100 flex flex-col snap-start bg-white"
      >
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          <h1 className="text-[18px] font-black text-gray-900">全部私信</h1>
          <button onClick={(e) => { e.stopPropagation(); router.push('/companions'); }} className="text-sm font-bold text-orange-500 hover:underline">去找搭子</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm font-medium">暂时没有新消息~</div>
          ) : (
            conversations.map(convo => (
              <div 
                key={convo.partner_id} 
                onClick={(e) => {
                  e.stopPropagation(); // 阻止触发父级的 scrollToLeft
                  handleSelectConvo(convo);
                }}
                className={`flex items-center gap-3 py-4 pr-4 cursor-pointer transition-all border-b border-gray-50 ${
                  activeConvo?.partner_id === convo.partner_id 
                    ? 'bg-orange-50 border-l-4 border-orange-500 pl-3' 
                    : 'hover:bg-gray-50 border-l-4 border-transparent pl-3'
                }`}
              >
                <div className="relative shrink-0">
                  <img src={convo.partner_avatar} className="w-12 h-12 rounded-full object-cover border border-gray-200" alt="avatar" />
                  {convo.unread_count > 0 && <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white shadow-sm">{convo.unread_count > 99 ? '99+' : convo.unread_count}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-[14px] text-gray-900 truncate">{convo.partner_name}</h3>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">{new Date(convo.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className={`text-[13px] truncate ${convo.unread_count > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>{convo.last_message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 🌟 右侧：聊天主界面 -> 宽度使用魔法公式 calc(100% - 80px)，确保永远露出 80px 的左侧用于返回 */}
      <div 
        onClick={scrollToRight}
        className="w-[calc(100%-80px)] shrink-0 flex flex-col bg-gray-50/30 relative snap-end"
      >
        {activeConvo ? (
          <>
            <div className="h-16 border-b border-gray-100 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
              <div className="flex items-center">
                {/* 🌟 将返回按钮的逻辑改为滑动到左侧 */}
                <button 
                  onClick={(e) => { e.stopPropagation(); scrollToLeft(); }} 
                  className="mr-3 p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" 
                  title="展开列表"
                >
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <div className="flex items-center cursor-pointer group px-2 py-1 -ml-2 rounded-lg hover:bg-gray-50 transition-colors" onClick={(e) => { e.stopPropagation(); handleGoToProfile(activeConvo.partner_id); }}>
                  <img src={activeConvo.partner_avatar} className="w-8 h-8 rounded-full object-cover mr-2.5 border border-gray-200" alt="avatar" />
                  <h2 className="font-bold text-[15px] text-gray-900 group-hover:text-orange-500 transition-colors">{activeConvo.partner_name}</h2>
                  <svg className="w-4 h-4 ml-1 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-10">打个招呼吧，例如：“嗨，我对你的搭子招募很感兴趣！”</div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex items-end ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                      {!isMe && (
                        <img src={activeConvo.partner_avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover cursor-pointer border border-gray-100 hover:opacity-80 transition-opacity flex-shrink-0 mb-0.5" onClick={(e) => { e.stopPropagation(); handleGoToProfile(activeConvo.partner_id); }} />
                      )}
                      
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-[18px] text-[14.5px] leading-relaxed shadow-sm ${isMe ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                        {msg.image_url ? (
                          <img 
                            src={msg.image_url} 
                            alt="chat-image" 
                            className="max-w-full rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity" 
                            style={{ maxHeight: '200px', objectFit: 'contain' }} 
                            onClick={(e) => { e.stopPropagation(); setViewerImageUrl(msg.image_url!); }} 
                          />
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0 relative">
              {selectedImages.length > 0 && (
                <div className="absolute bottom-full mb-2 left-4 right-4 z-50 bg-white p-3 rounded-2xl shadow-xl border border-gray-200 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                    {selectedImages.map((img, index) => (
                      <div key={index} className="relative group shrink-0">
                        <img src={img.previewUrl} alt={`Preview ${index}`} className="h-24 w-24 object-cover rounded-lg bg-gray-50 border border-gray-100" />
                        <button onClick={(e) => { e.stopPropagation(); handleRemovePreview(index); }} className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1 shadow-md hover:bg-red-500 transition-colors">
                          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between items-center border-t border-gray-50 pt-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleCancelAllPreviews(); }} className="text-sm text-gray-400 hover:text-gray-600 font-medium">全部取消</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleConfirmSendImages(); }}
                      disabled={isUploading}
                      className="bg-orange-500 text-white px-5 py-1.5 rounded-full text-[13px] font-bold shadow-md hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {isUploading ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> 发送中...</> : <>发送 {selectedImages.length} 张图片</>}
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} disabled={isUploading} className="p-2.5 text-gray-500 hover:bg-gray-100 hover:text-orange-500 rounded-full transition-colors disabled:opacity-50" title="发送图片">
                   <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                </button>

                <div className="relative">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }} className={`p-2.5 rounded-full transition-colors flex items-center justify-center ${showGifPicker ? 'bg-orange-50 text-orange-500' : 'text-gray-500 hover:bg-gray-100 hover:text-orange-500'}`} title="发送动图">
                    <span className="text-[11px] font-black border-2 border-current rounded-[4px] px-1 py-0.5 leading-none tracking-tighter">GIF</span>
                  </button>
                  {showGifPicker && (
                    <div ref={gifRef} className="absolute bottom-14 left-0 md:-left-12 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col h-[350px]">
                      <div className="p-3 border-b border-gray-100 bg-gray-50/80">
                         <input type="text" placeholder="搜索 Giphy 动图..." value={gifSearch} onChange={(e) => setGifSearch(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-sm" />
                      </div>
                      <div className="flex-1 overflow-y-auto p-2">
                        {loadingGifs ? (
                           <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div></div>
                        ) : (
                           <div className="grid grid-cols-2 gap-2">
                             {gifs.map(gif => (
                               <img key={gif.id} src={gif.images.fixed_width.url} alt="gif" onClick={(e) => { e.stopPropagation(); handleSendGif(gif.images.fixed_width.url); }} className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-orange-500 transition-all" />
                             ))}
                           </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }} className={`p-2.5 rounded-full transition-colors flex items-center justify-center ${showEmojiPicker ? 'bg-orange-50 text-orange-500' : 'text-gray-500 hover:bg-gray-100 hover:text-orange-500'}`} title="发送表情">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm3.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" /></svg>
                  </button>
                  {showEmojiPicker && (
                    <div ref={emojiRef} onClick={(e) => e.stopPropagation()} className="absolute bottom-14 left-0 md:-left-24 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
                      <EmojiPicker onEmojiClick={(e) => setInputMsg(prev => prev + e.emoji)} theme="light" />
                    </div>
                  )}
                </div>

                <input type="text" placeholder="说点什么..." value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} onClick={(e) => e.stopPropagation()} className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3 text-[14px] outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all" />
                
                <button type="submit" disabled={!inputMsg.trim() || isUploading} onClick={(e) => e.stopPropagation()} className="w-11 h-11 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 ml-1"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-20 h-20 mb-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
            <p className="text-sm font-medium">点击左侧缝隙展开列表</p>
          </div>
        )}
      </div>

      {viewerImageUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setViewerImageUrl(null)}
        >
          <button onClick={() => setViewerImageUrl(null)} className="absolute top-6 right-6 md:top-8 md:right-8 text-white/60 hover:text-white bg-black/40 hover:bg-black/80 rounded-full p-2.5 transition-all z-50">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center">
            <img src={viewerImageUrl} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl select-none" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex-1 min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>}>
      <MessagesContent />
    </Suspense>
  );
}