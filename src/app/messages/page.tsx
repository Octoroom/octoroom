'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const chatWithId = searchParams?.get('chatWith');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const activeConvoRef = useRef<Conversation | null>(null);
  useEffect(() => { activeConvoRef.current = activeConvo; }, [activeConvo]);

  // 1. 初始化并【强力去重】会话列表
  useEffect(() => {
    let isMounted = true;

    async function initChat() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (isMounted) setLoading(false); return; }
      if (isMounted) setCurrentUserId(user.id);

      const { data: convos } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      const { data: unreadMsgs } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('is_read', false)
        .neq('sender_id', user.id);

      const unreadMap: Record<string, number> = {};
      unreadMsgs?.forEach(msg => {
        unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1;
      });

      if (convos) {
        const enrichedConvos = await Promise.all(convos.map(async (c) => {
          const partnerId = c.user1_id === user.id ? c.user2_id : c.user1_id;
          const { data: partnerProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', partnerId).single();
          return {
            id: c.id,
            partner_id: partnerId,
            partner_name: partnerProfile?.username || '神秘用户',
            partner_avatar: partnerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`,
            last_message: c.last_message || '开始聊天吧',
            updated_at: c.updated_at,
            unread_count: unreadMap[c.id] || 0,
            all_convo_ids: [c.id] 
          };
        }));
        
        if (!isMounted) return;

        // 🌟 核心：企业级 Map 智能聚合去重 (消灭列表里的重复头像)
        const uniqueMap = new Map<string, Conversation>();
        enrichedConvos.forEach(c => {
          if (uniqueMap.has(c.partner_id)) {
            const existing = uniqueMap.get(c.partner_id)!;
            existing.unread_count += c.unread_count; 
            if (!existing.all_convo_ids.includes(c.id)) {
                existing.all_convo_ids.push(c.id);       
            }
            if (new Date(c.updated_at) > new Date(existing.updated_at)) {
              existing.updated_at = c.updated_at;
              existing.last_message = c.last_message;
              existing.id = c.id; 
            }
          } else {
            uniqueMap.set(c.partner_id, c);
          }
        });

        let finalConvos = Array.from(uniqueMap.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        if (chatWithId && chatWithId !== user.id) {
          const existingConvo = finalConvos.find(c => c.partner_id === chatWithId);
          if (existingConvo) {
            handleSelectConvo(existingConvo); 
          } else {
            const { data: partnerProfile } = await supabase.from('profiles').select('username, avatar_url').eq('id', chatWithId).single();
            const tempConvo: Conversation = {
              id: 'temp_new', partner_id: chatWithId, partner_name: partnerProfile?.username || '神秘用户',
              partner_avatar: partnerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chatWithId}`,
              last_message: '新对话', updated_at: new Date().toISOString(), unread_count: 0, all_convo_ids: ['temp_new']
            };
            finalConvos = [tempConvo, ...finalConvos];
            setActiveConvo(tempConvo);
          }
        } else if (finalConvos.length > 0 && !chatWithId) {
          const firstConvo = finalConvos[0];
          handleSelectConvo(firstConvo); 
        }
        
        setConversations(finalConvos);
      }
      if (isMounted) setLoading(false);
    }
    
    initChat();
    return () => { isMounted = false; };
  }, [chatWithId]);

  // 2. 拉取消息 (支持从多个幽灵会话中汇总聊天记录)
  useEffect(() => {
    async function fetchMessages() {
      if (!activeConvo || activeConvo.id === 'temp_new') {
        setMessages([]); return;
      }
      const { data } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', activeConvo.all_convo_ids) 
        .order('created_at', { ascending: true });
        
      if (data) setMessages(data);
    }
    fetchMessages();
  }, [activeConvo]);

  // 🌟 3. 核心扫荡机制：0 延迟消灭红点
  const handleSelectConvo = (convo: Conversation) => {
    setActiveConvo(convo);

    if (convo.unread_count > 0 && currentUserId) {
      const countToClear = convo.unread_count;

      // 1. 本地状态秒清 (列表红点瞬间消失)
      setConversations(prev => prev.map(c => 
        c.partner_id === convo.partner_id ? { ...c, unread_count: 0 } : c
      ));

      // 2. 发送带参数的广播，侧边栏立刻扣除红点数字
      window.dispatchEvent(new CustomEvent('local_messages_read', { detail: { readCount: countToClear } }));

      // 3. 后台静默处理数据库 (有了上面添加的 SQL 权限，就不会被拦截了)
      supabase.from('messages')
        .update({ is_read: true })
        .in('conversation_id', convo.all_convo_ids)
        .eq('sender_id', convo.partner_id)
        .eq('is_read', false)
        .then(({ error }) => {
            if (error) console.error("标记已读失败:", error);
        });
    }
  };

  // 4. WebSocket 实时监听新消息
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

            updatedConvos[convoIndex] = {
              ...updatedConvos[convoIndex],
              last_message: newMsg.content,
              updated_at: newMsg.created_at,
              unread_count: isCurrentlyChatting ? 0 : updatedConvos[convoIndex].unread_count + 1
            };

            if (isCurrentlyChatting) {
              setMessages(mPrev => [...mPrev, newMsg]);
              supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then();
            }

            const [targetConvo] = updatedConvos.splice(convoIndex, 1);
            updatedConvos.unshift(targetConvo);
          }
          return updatedConvos;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 5. 发送消息
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeConvo || !currentUserId) return;

    const contentToSend = inputMsg.trim();
    setInputMsg(''); 

    try {
      let finalConvoId = activeConvo.id;

      if (finalConvoId === 'temp_new') {
        const sortedIds = [currentUserId, activeConvo.partner_id].sort();
        const { data: existingDbConvo } = await supabase.from('conversations').select('id').eq('user1_id', sortedIds[0]).eq('user2_id', sortedIds[1]).single();

        if (existingDbConvo) {
           finalConvoId = existingDbConvo.id;
        } else {
           const { data: newConvoData } = await supabase.from('conversations').insert([{ user1_id: sortedIds[0], user2_id: sortedIds[1], last_message: contentToSend }]).select().single();
           if(newConvoData) finalConvoId = newConvoData.id;
        }
        
        setActiveConvo(prev => prev ? { ...prev, id: finalConvoId, all_convo_ids: [...prev.all_convo_ids, finalConvoId] } : null);
        setConversations(prev => prev.map(c => c.partner_id === activeConvo.partner_id ? { ...c, id: finalConvoId, all_convo_ids: [...c.all_convo_ids, finalConvoId] } : c));
      }

      const tempMessage: Message = { id: uuidv4(), sender_id: currentUserId, content: contentToSend, created_at: new Date().toISOString() };
      setMessages(prev => [...prev, tempMessage]);

      setConversations(prev => prev.map(c => 
        c.partner_id === activeConvo.partner_id ? { ...c, last_message: contentToSend, updated_at: new Date().toISOString() } : c
      ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));

      await supabase.from('messages').insert([{ conversation_id: finalConvoId, sender_id: currentUserId, content: contentToSend }]);
      await supabase.from('conversations').update({ last_message: contentToSend, updated_at: new Date().toISOString() }).eq('id', finalConvoId);

    } catch (err) { alert("消息发送失败"); }
  };

  const handleGoToProfile = (partnerId: string) => { router.push(`/profile/${partnerId}`); };

  if (loading) return <div className="flex-1 min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>;

  if (!currentUserId) return (
    <div className="flex-1 min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center p-8">
      <h2 className="text-xl font-bold text-gray-800">请先登录</h2>
    </div>
  );

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full min-h-screen bg-white flex overflow-hidden border-x border-gray-100">
      
      <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col ${activeConvo ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          <h1 className="text-[18px] font-black text-gray-900">全部私信</h1>
          <button onClick={() => router.push('/companions')} className="text-sm font-bold text-orange-500 hover:underline">去找搭子</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm font-medium">暂时没有新消息~</div>
          ) : (
            conversations.map(convo => (
              <div 
                key={convo.partner_id} 
                onClick={() => handleSelectConvo(convo)}
                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-gray-50 ${activeConvo?.partner_id === convo.partner_id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
              >
                <div className="relative">
                  <img 
                    src={convo.partner_avatar} 
                    className="w-12 h-12 rounded-full object-cover border border-gray-200 hover:opacity-80 transition-opacity" 
                    alt="avatar" 
                    onClick={(e) => { e.stopPropagation(); handleGoToProfile(convo.partner_id); }}
                  />
                  {convo.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white shadow-sm">
                      {convo.unread_count > 99 ? '99+' : convo.unread_count}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-[14px] text-gray-900 truncate">{convo.partner_name}</h3>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                      {new Date(convo.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-[13px] truncate ${convo.unread_count > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                    {convo.last_message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col bg-gray-50/30 relative ${!activeConvo ? 'hidden md:flex' : 'flex'}`}>
        {activeConvo ? (
          <>
            <div className="h-16 border-b border-gray-100 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
              <div className="flex items-center">
                <button onClick={() => setActiveConvo(null)} className="md:hidden mr-3 p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                
                <div className="flex items-center cursor-pointer group px-2 py-1 -ml-2 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => handleGoToProfile(activeConvo.partner_id)}>
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
                        <img 
                          src={activeConvo.partner_avatar} 
                          alt="avatar" 
                          className="w-8 h-8 rounded-full object-cover cursor-pointer border border-gray-100 hover:opacity-80 transition-opacity flex-shrink-0 mb-0.5"
                          onClick={() => handleGoToProfile(activeConvo.partner_id)}
                        />
                      )}
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-[18px] text-[14.5px] leading-relaxed shadow-sm ${isMe ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input type="text" placeholder="说点什么..." value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3 text-[14px] outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all" />
                <button type="submit" disabled={!inputMsg.trim()} className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                  <svg fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 ml-1"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-20 h-20 mb-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
            <p className="text-sm font-medium">点击左侧好友开始聊天</p>
          </div>
        )}
      </div>

    </main>
  );
}