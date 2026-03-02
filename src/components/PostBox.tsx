// src/components/PostBox.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import useSWR from 'swr';
import PostList from './PostList';
import EmojiPicker, { Theme } from 'emoji-picker-react'; 

const fetcher = async (tab: string) => {
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('octo_room_user_id') : null;
  
  // 🌟 修复：拉取 bookmarks(count) 而不是 dislikes
  let query = supabase
    .from('posts')
    .select('*, quote_post:quote_post_id(id, content, image_urls, username), likes(count), comments(count), bookmarks(count), reposts(count)')
    .order('created_at', { ascending: false });

  let myFollows: string[] = [];
  if (currentUserId && tab === 'following') {
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', currentUserId);
    myFollows = follows?.map(f => f.following_id) || [];
    query = query.in('author_id', [...myFollows, currentUserId]);
  }
  
  const { data: postsData, error } = await query;
  if (error) {
    console.error("获取帖子失败:", error);
    throw error;
  }
  if (!postsData || postsData.length === 0) return { posts: [], currentUserId };

  const authorIds = Array.from(new Set(postsData.map(p => p.author_id)));
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', authorIds);
    
  const profileMap = new Map(profilesData?.map(pr => [pr.id, pr]) || []);
  
  let myLikes: string[] = [], myMarks: string[] = [], myReposts: string[] = [];
  if (currentUserId && postsData.length > 0) {
    const postIds = postsData.map(p => p.id);
    const [l, m, r] = await Promise.all([
      supabase.from('likes').select('post_id').eq('user_id', currentUserId).in('post_id', postIds),
      supabase.from('bookmarks').select('post_id').eq('user_id', currentUserId).in('post_id', postIds), // 🌟 修复：去 bookmarks 表查询
      supabase.from('reposts').select('post_id').eq('user_id', currentUserId).in('post_id', postIds)
    ]);
    myLikes = l.data?.map(i => i.post_id) || [];
    myMarks = m.data?.map(i => i.post_id) || [];
    myReposts = r.data?.map(i => i.post_id) || [];
  }
  
  return { 
    posts: postsData.map((p: any) => {
      const userProfile = profileMap.get(p.author_id);
      return { 
        ...p, 
        username: userProfile?.username || '未知用户',
        avatar_url: userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author_id}`,
        _interactions: { 
          likes: p.likes?.[0]?.count || 0, 
          comments: p.comments?.[0]?.count || 0, 
          marks: p.bookmarks?.[0]?.count || 0, // 🌟 修复：读取 bookmarks 的 count
          reposts: p.reposts?.[0]?.count || 0, 
          likedByMe: myLikes.includes(p.id), 
          markedByMe: myMarks.includes(p.id), 
          repostedByMe: myReposts.includes(p.id), 
          isFollowingAuthor: myFollows.includes(p.author_id) 
        } 
      };
    }), 
    currentUserId 
  };
};

const MOCK_GIFS = [
  "https://media.tenor.com/P1i1Y2yR4_EAAAAC/yay-minions.gif", "https://media.tenor.com/2Xy1W1Gnd5wAAAAC/crying-crying-meme.gif", "https://media.tenor.com/7gK1_4iRzZEAAAAC/wow-omg.gif", "https://media.tenor.com/RVD_A6w6xXIAAAAC/cat-funny.gif", "https://media.tenor.com/y1vO4j924t0AAAAC/clapping-leonardo-dicaprio.gif", "https://media.tenor.com/9v4Jq_XyA3sAAAAC/yes-hell-yes.gif", "https://media.tenor.com/tYt6GOfaOqkAAAAC/shrug-idk.gif", "https://media.tenor.com/1DtdgM1K88kAAAAC/angry-mad.gif"
];

export default function PostBox() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'for_you' | 'following'>('for_you');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [gifs, setGifs] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [quotePost, setQuotePost] = useState<any>(null); 
  const [isDraggingOver, setIsDraggingOver] = useState(false); 

  const TAGS = ['#日常动态', '#城市搭子', '#章鱼房间'];
  const [selectedTag, setSelectedTag] = useState('#日常动态');
  const [city, setCity] = useState('');
  const [title, setTitle] = useState('');
  const [showTagPicker, setShowTagPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const gifRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null); 

  const { data, isLoading, mutate } = useSWR(activeTab, fetcher, { revalidateOnFocus: false, dedupingInterval: 5000 });
  const posts = data?.posts || [];
  const currentUserId = data?.currentUserId || null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) setShowEmojiPicker(false);
      if (gifRef.current && !gifRef.current.contains(event.target as Node)) setShowGifPicker(false);
      if (tagRef.current && !tagRef.current.contains(event.target as Node)) setShowTagPicker(false); 
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingOver(true); };
  const handleDragLeave = () => setIsDraggingOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingOver(false);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) setQuotePost(JSON.parse(data)); 
    } catch (err) { console.error('拖拽解析失败', err); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImages(prev => [...prev, ...filesArray]);
      setPreviews(prev => [...prev, ...filesArray.map(file => URL.createObjectURL(file))]);
    }
    setShowEmojiPicker(false); setShowGifPicker(false); setShowTagPicker(false);
  };

  const onEmojiClick = (emojiObject: any) => setContent(prev => prev + emojiObject.emoji);
  const handleGifSelect = (gifUrl: string) => { setGifs(prev => [...prev, gifUrl]); setShowGifPicker(false); };
  const removeMedia = (idx: number) => { const localFilesCount = previews.length; if (idx < localFilesCount) { setImages(prev => prev.filter((_, i) => i !== idx)); setPreviews(prev => prev.filter((_, i) => i !== idx)); } else { const gifIdx = idx - localFilesCount; setGifs(prev => prev.filter((_, i) => i !== gifIdx)); } };

  // 🔥 带路由分发与真实 author_id 写入的发布逻辑
  const handlePost = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('请先登录');

      const authorName = user.user_metadata?.username || user.user_metadata?.full_name || '神秘章鱼';
      const authorAvatar = user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id}`;

      let uploadedUrls: string[] = [...gifs];
      if (images.length > 0) {
        for (const file of images) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('octo-albums').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('octo-albums').getPublicUrl(fileName);
          uploadedUrls.push(publicUrl);
        }
      }
      
      // 🌟 智能路由分发 & 漏洞修补
      if (selectedTag === '#城市搭子') {
        const { error: postError } = await supabase.from('companion_rooms').insert({ 
          author_id: user.id, // 🌟 核心修复：强制绑定房东 ID
          city_name: city, 
          title: title, 
          description: content.trim(), 
          author_name: authorName, 
          author_avatar: authorAvatar,
          reply_count: 0 
        });
        if (postError) throw postError;
        alert('搭子招募发布成功！请前往左侧【城市搭子】板块查看。');

      } else if (selectedTag === '#章鱼房间') {
        const { error: postError } = await supabase.from('octo_rooms').insert({ 
          author_id: user.id, // 🌟 核心修复：强制绑定房东 ID
          city_name: city, 
          title: title, 
          description: content.trim(), 
          author_name: authorName, 
          author_avatar: authorAvatar,
          reply_count: 0 
        });
        if (postError) throw postError;
        alert('章鱼房间发布成功！请前往左侧【章鱼房间】板块查看。');

      } else {
        const { error: postError } = await supabase.from('posts').insert({ 
          content: content.trim(), 
          author_id: user.id, 
          username: authorName, 
          image_urls: uploadedUrls,
          quote_post_id: quotePost ? quotePost.id : null 
        });
        if (postError) throw postError;
      }
      
      setContent(''); setImages([]); setPreviews([]); setGifs([]); setQuotePost(null); 
      setCity(''); setTitle(''); setSelectedTag('#日常动态'); 
      if (fileInputRef.current) fileInputRef.current.value = ''; 
      setShowEmojiPicker(false); setShowGifPicker(false); setShowTagPicker(false);
      mutate(); 
    } catch (err: any) { alert('发布失败: ' + err.message); } finally { setLoading(false); }
  };

  const handleDeletePost = async (deletedId: string) => mutate({ posts: posts.filter((p: any) => p.id !== deletedId), currentUserId }, false);
  const allMediaPreviews = [...previews, ...gifs];

  const isPostDisabled = loading || (
    selectedTag === '#日常动态' 
      ? (!content.trim() && images.length === 0 && gifs.length === 0 && !quotePost) 
      : (!content.trim() || !city.trim() || !title.trim())
  );

  return (
    <div className="space-y-2">
      <div className="flex border-b border-gray-100 mb-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={() => setActiveTab('for_you')} className={`flex-1 py-4 text-center font-bold transition-all relative hover:bg-gray-50 ${activeTab === 'for_you' ? 'text-black' : 'text-gray-400'}`}>发现 (For you){activeTab === 'for_you' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#FF8C00] rounded-full"></div>}</button>
        <button onClick={() => setActiveTab('following')} className={`flex-1 py-4 text-center font-bold transition-all relative hover:bg-gray-50 ${activeTab === 'following' ? 'text-black' : 'text-gray-400'}`}>关注 (Following){activeTab === 'following' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#FF8C00] rounded-full"></div>}</button>
      </div>

      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white p-4 rounded-2xl border transition-all mx-2 relative ${isDraggingOver ? 'border-[#FF8C00] bg-orange-50/50 shadow-lg scale-[1.01]' : 'border-gray-100 shadow-sm focus-within:border-[#FF8C00] focus-within:ring-1 focus-within:ring-[#FF8C00]'}`}
      >
        {selectedTag !== '#日常动态' && (
          <div className="flex gap-3 mb-3 pb-3 border-b border-gray-100 animate-in fade-in slide-in-from-top-2">
            <input 
              type="text" placeholder="目的地城市 (必填)" value={city} onChange={(e) => setCity(e.target.value)}
              className="w-1/3 bg-gray-50 rounded-xl px-3 py-2 text-[14px] font-medium text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#FF8C00]/20 border border-transparent focus:border-[#FF8C00]/50 transition-all placeholder:font-normal"
            />
            <input 
              type="text" placeholder="一句话标题 (必填)" value={title} onChange={(e) => setTitle(e.target.value)}
              className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-[14px] font-medium text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#FF8C00]/20 border border-transparent focus:border-[#FF8C00]/50 transition-all placeholder:font-normal"
            />
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={quotePost ? "写下你的转发评论..." : selectedTag === '#日常动态' ? "在章鱼房间说点什么或拖拽右侧相册到这里..." : "详细描述一下你的计划、预算或对搭子的要求..."}
          className="w-full p-2 bg-transparent outline-none resize-none h-24 font-medium text-gray-800 placeholder-gray-400"
          maxLength={500}
        />
        
        {quotePost && (
          <div className="mx-2 mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl relative flex items-center gap-3 group">
            <button onClick={() => setQuotePost(null)} className="absolute -top-2 -right-2 bg-black text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] shadow-md hover:bg-red-500 z-10">✕</button>
            {quotePost.image_urls?.[0] && (
              <img src={quotePost.image_urls[0]} alt="cover" className="w-12 h-12 object-cover rounded-lg shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800">@{quotePost.username}</p>
              <p className="text-xs text-gray-500 truncate">{quotePost.content || '分享了一组图片'}</p>
            </div>
          </div>
        )}

        {allMediaPreviews.length > 0 && (
          <div className="flex gap-3 mt-2 mb-2 overflow-x-auto pb-2">
            {allMediaPreviews.map((src, idx) => (
              <div key={idx} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img src={src} alt="preview" className="w-full h-full object-cover" />
                <button onClick={() => removeMedia(idx)} className="absolute top-1 right-1 bg-black/60 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] hover:bg-red-500">✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-100 relative">
          <div className="flex items-center gap-1 sm:gap-1.5 relative">
            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" multiple className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 flex items-center justify-center text-gray-400 rounded-full hover:bg-orange-50 hover:text-[#FF8C00] transition-colors shrink-0" title="添加图片">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            </button>

            <div className="relative shrink-0" ref={gifRef}>
              <button onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); setShowTagPicker(false); }} className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors font-bold text-[13px] tracking-tight ${showGifPicker ? 'bg-[#FF8C00] text-white' : 'text-gray-400 hover:bg-orange-50 hover:text-[#FF8C00]'}`} title="添加 GIF">GIF</button>
              {showGifPicker && (
                <div className="absolute top-12 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-72 p-3">
                  <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-gray-700">热门 GIF</span><span className="text-[10px] text-gray-400">Powered by Tenor</span></div>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {MOCK_GIFS.map((url, i) => (<img key={i} src={url} alt="gif" onClick={() => handleGifSelect(url)} className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity bg-gray-100" />))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative shrink-0" ref={emojiRef}>
              <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); setShowTagPicker(false); }} className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0 ${showEmojiPicker ? 'bg-[#FF8C00] text-white' : 'text-gray-400 hover:bg-orange-50 hover:text-[#FF8C00]'}`} title="添加表情">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm3.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" /></svg>
              </button>
              {showEmojiPicker && (
                <div className="absolute top-12 left-0 z-50 shadow-2xl rounded-xl overflow-hidden border border-gray-100">
                  <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.LIGHT} searchDisabled={true} skinTonesDisabled={true} width={300} height={350} />
                </div>
              )}
            </div>

            <div className="relative shrink-0 ml-1" ref={tagRef}>
              <button 
                onClick={() => { setShowTagPicker(!showTagPicker); setShowEmojiPicker(false); setShowGifPicker(false); }}
                className={`flex items-center gap-1 text-[13px] font-bold px-3 py-1.5 rounded-full transition-colors ${selectedTag !== '#日常动态' ? 'bg-[#FF8C00] text-white' : 'text-[#FF8C00] bg-orange-50 hover:bg-orange-100'}`}
              >
                <span>{selectedTag}</span>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3 h-3 transition-transform ${showTagPicker ? 'rotate-180' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </button>

              {showTagPicker && (
                <div className="absolute top-10 left-0 mt-1 w-32 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  {TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => { setSelectedTag(tag); setShowTagPicker(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] font-medium hover:bg-orange-50 hover:text-[#FF8C00] transition-colors ${selectedTag === tag ? 'bg-orange-50/50 text-[#FF8C00]' : 'text-gray-700'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handlePost}
            disabled={isPostDisabled}
            className="bg-[#FF8C00] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#E67E00] transition-colors disabled:opacity-40 disabled:hover:bg-[#FF8C00] shadow-sm flex items-center justify-center min-w-[80px]"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '发 布'}
          </button>
        </div>
      </div>

      <PostList posts={posts} currentUserId={currentUserId} fetching={isLoading} onDelete={handleDeletePost} />
    </div>
  );
}