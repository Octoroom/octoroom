// src/app/profile/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PostList from '@/components/PostList'; 
import Cropper from 'react-easy-crop'; // 🌟 引入裁剪库

type TabType = 'posts' | 'replies';

// 🌟 新增：将 Canvas 转换为 File 的辅助函数 (用于生成最终的裁剪图片)
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any, fileName: string): Promise<File | null> {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas is empty'));
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });
  } catch (e) {
    console.error(e);
    return null;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [posts, setPosts] = useState<any[]>([]); 
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [hasFetchedReplies, setHasFetchedReplies] = useState(false);

  const [stats, setStats] = useState({ following: 0, followers: 0, likesGiven: 0, marksGiven: 0, postsCount: 0 });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editForm, setEditForm] = useState({ 
    username: '', bio: '', location: '', website: '', avatar_url: '', banner_url: '', profession: '' 
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // 🌟 新增：裁剪器相关状态
  const [cropType, setCropType] = useState<'avatar' | 'banner' | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const fetchProfileAndStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUser(user);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      // 🌟 自动托底修复：如果 profile 表里没邮箱，但 auth 里有，自动同步过去 (Fix for legacy users missing emails)
      if (profileData && !profileData.email && user.email) {
        const { error: syncError } = await supabase
          .from('profiles')
          .update({ email: user.email })
          .eq('id', user.id);
        if (!syncError) {
          profileData.email = user.email;
        }
      }
      
      setProfile(profileData);

      const [ followingRes, followersRes, likesRes, bookmarksRes, postsRes, myPostsRes ] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
        supabase.from('posts').select('*, quote_post:quote_post_id(id, content, image_urls, username), likes(count), comments(count), bookmarks(count), reposts(count)').eq('author_id', user.id).order('created_at', { ascending: false })
      ]);

      setStats({
        following: followingRes.count || 0, followers: followersRes.count || 0,
        likesGiven: likesRes.count || 0, marksGiven: bookmarksRes.count || 0, postsCount: postsRes.count || 0
      });

      if (myPostsRes.data && myPostsRes.data.length > 0) {
        const postIds = myPostsRes.data.map((p: any) => p.id);
        const [l, m, r] = await Promise.all([
          supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          supabase.from('bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          supabase.from('reposts').select('post_id').eq('user_id', user.id).in('post_id', postIds)
        ]);
        
        const myLikes = l.data?.map(i => i.post_id) || [];
        const myMarks = m.data?.map(i => i.post_id) || [];
        const myReposts = r.data?.map(i => i.post_id) || [];

        const enrichedPosts = myPostsRes.data.map((p: any) => ({
          ...p, username: profileData?.username || '未知用户', avatar_url: profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author_id}`,
          _interactions: {
            likes: p.likes?.[0]?.count || 0, comments: p.comments?.[0]?.count || 0, marks: p.bookmarks?.[0]?.count || 0, reposts: p.reposts?.[0]?.count || 0,
            likedByMe: myLikes.includes(p.id), markedByMe: myMarks.includes(p.id), repostedByMe: myReposts.includes(p.id), isFollowingAuthor: false 
          }
        }));
        setPosts(enrichedPosts);
      } else { setPosts([]); }
    } catch (error) { console.error('获取个人信息失败:', error); } finally { setLoading(false); }
  };

  const fetchUserReplies = useCallback(async () => {
    if (!user || hasFetchedReplies) return;
    setLoadingReplies(true);
    try {
      const { data: comments, error } = await supabase.from('comments').select('id, content, created_at, post_id').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;

      if (!comments || comments.length === 0) { setReplies([]); } else {
        const postIds = [...new Set(comments.map(c => c.post_id))];
        const { data: postsData } = await supabase.from('posts').select('id, content, image_urls, author_id').in('id', postIds);
        const authorIds = [...new Set(postsData?.map(p => p.author_id) || [])];
        const { data: profilesData } = await supabase.from('profiles').select('id, username').in('id', authorIds);

        const profileMap = new Map(profilesData?.map(p => [p.id, p]));
        const postMap = new Map(postsData?.map(p => [p.id, { ...p, username: profileMap.get(p.author_id)?.username || '神秘用户' }]));

        const enrichedReplies = comments.map(c => {
          const originalPost = postMap.get(c.post_id);
          return {
            ...c,
            original_post: originalPost ? { content: originalPost.content, image_urls: originalPost.image_urls, username: originalPost.username } : null,
            user: { username: profile?.username || user.email?.split('@')[0] || '我', avatar_url: profile?.avatar_url }
          };
        });
        setReplies(enrichedReplies);
      }
      setHasFetchedReplies(true);
    } catch (error) { console.error('获取回复失败:', error); } finally { setLoadingReplies(false); }
  }, [user, profile, hasFetchedReplies]);

  useEffect(() => { if (activeTab === 'replies') fetchUserReplies(); }, [activeTab, fetchUserReplies]);

  const handleDeleteReply = async (e: React.MouseEvent, replyId: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条回复吗？')) return;
    const prevReplies = [...replies];
    setReplies(replies.filter(r => r.id !== replyId));
    try {
      const { error } = await supabase.from('comments').delete().eq('id', replyId);
      if (error) throw error;
    } catch (err: any) { alert('删除失败: ' + err.message); setReplies(prevReplies); }
  };

  const handleOpenEditModal = () => {
    setEditForm({
      username: profile?.username || '', bio: profile?.bio || '',
      location: profile?.location || '', website: profile?.website || '',
      avatar_url: profile?.avatar_url || '', banner_url: profile?.banner_url || '',
      profession: profile?.profession || ''
    });
    setAvatarPreview(profile?.avatar_url || '');
    setBannerPreview(profile?.banner_url || '/profile-banner.jpg');
    setIsEditModalOpen(true);
  };

  // 🌟 修改：选择图片后不再直接预览，而是打开全屏裁剪器
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    setCropType(type);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    
    // 清空 input，允许重复选择同一张图
    e.target.value = '';
  };

  // 🌟 新增：用户在裁剪器点击“确定”
  const handleCropConfirm = async () => {
    if (!croppedAreaPixels) return;
    try {
      // 通过辅助函数，将裁剪框里的内容变成一个新的 File 对象
      const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels, `${cropType}_cropped.jpg`);
      if (!croppedFile) return;
      
      const previewUrl = URL.createObjectURL(croppedFile);
      if (cropType === 'avatar') {
        setAvatarFile(croppedFile);
        setAvatarPreview(previewUrl);
      } else {
        setBannerFile(croppedFile);
        setBannerPreview(previewUrl);
      }
    } catch (e) {
      console.error(e);
      alert("裁剪失败，请重试");
    }
    setCropType(null); // 关闭裁剪器
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      let finalAvatarUrl = editForm.avatar_url;
      let finalBannerUrl = editForm.banner_url;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const fileName = `avatar_${user.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('profiles').upload(fileName, avatarFile);
        if (uploadError) throw new Error('头像上传失败: ' + uploadError.message);
        finalAvatarUrl = supabase.storage.from('profiles').getPublicUrl(fileName).data.publicUrl;
      }

      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop();
        const fileName = `banner_${user.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('profiles').upload(fileName, bannerFile);
        if (uploadError) throw new Error('背景图上传失败: ' + uploadError.message);
        finalBannerUrl = supabase.storage.from('profiles').getPublicUrl(fileName).data.publicUrl;
      }

      const updates = {
        username: editForm.username,
        bio: editForm.bio,
        location: editForm.location,
        website: editForm.website,
        profession: editForm.profession,
        avatar_url: finalAvatarUrl,
        banner_url: finalBannerUrl,
        // 🌟 修复：已删除 updated_at 字段，解决保存失败报错问题
      };

      const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (updateError) throw updateError;

      setProfile({ ...profile, ...updates });
      setAvatarFile(null); setBannerFile(null);
      setIsEditModalOpen(false);
      
      setPosts(posts.map(p => ({ ...p, username: updates.username, avatar_url: updates.avatar_url })));
    } catch (error: any) {
      alert("保存失败: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <p className="text-sm font-medium text-gray-500 mb-6">请先登录查看个人主页</p>
        <Link href="/" className="bg-gray-900 text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-sm hover:bg-black transition-colors">返回首页</Link>
      </div>
    );
  }

  const displayName = profile?.username || user.email?.split('@')[0];

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full min-h-screen bg-gray-50 border-x border-gray-100 flex flex-col relative">
      
      {/* 吸顶导航栏 */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-40 flex items-center gap-6 px-4 py-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors -ml-2">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-900"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <div>
          <h1 className="text-[17px] font-black text-gray-900 leading-tight">{displayName}</h1>
          <p className="text-[12px] text-gray-500 font-medium">{stats.postsCount} posts</p>
        </div>
      </div>

      {/* 沉浸式全景背景区 */}
      <div className="relative w-full flex flex-col shrink-0 bg-white pb-3">
        <div className="absolute inset-x-0 top-0 h-32 sm:h-44 z-0 overflow-hidden bg-gray-200">
          <img
            src={profile?.banner_url || '/profile-banner.jpg'}
            alt="Profile Banner"
            className="w-full h-full object-cover object-center"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none"></div>
        </div>

        <div className="relative z-10 h-32 sm:h-44 w-full"></div>

        <div className="relative z-10 px-4 sm:px-6">
          <div className="flex justify-between items-end">
            <div className="-mt-12 sm:-mt-16 relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-white shrink-0 shadow-sm overflow-hidden z-20">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#FF8C00] text-4xl font-black bg-gray-100">
                  {(user.email?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
            <div className="mb-2 sm:mb-3">
               <button onClick={handleOpenEditModal} className="px-5 py-1.5 rounded-full bg-white border border-gray-300 text-[14px] font-bold text-gray-900 hover:bg-gray-50 transition-all shadow-sm">
                 编辑资料
               </button>
            </div>
          </div>

          <div className="mt-3 mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] sm:text-[22px] font-black text-gray-900 leading-tight">
                {displayName}
              </h2>
              {profile?.profession && (
                <span className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md text-[11px] font-bold border border-orange-100/50 relative top-[1px]">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.527-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  {profile.profession}
                </span>
              )}
            </div>
            
            <p className="text-[14px] text-gray-500 font-medium mt-0.5">
              @{user.email?.split('@')[0]}
            </p>
            
            <div className="mt-3 text-[14px] text-gray-900 leading-relaxed whitespace-pre-wrap break-words max-w-lg">
              {profile?.bio || '这个人很懒，还没有写简介...'}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[13px] text-gray-500 font-medium">
              {profile?.location && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {profile.location}
                </span>
              )}
              {profile?.website && (
                <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-500 hover:underline">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                加入于 {new Date(user.created_at || Date.now()).getFullYear()}年{new Date(user.created_at || Date.now()).getMonth() + 1}月
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 pt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/profile/following" className="hover:underline flex items-center gap-1.5 transition-opacity">
            <span className="text-[14px] font-black text-gray-900">{stats.following}</span>
            <span className="text-[14px] text-gray-500">正在关注</span>
          </Link>
          <Link href="/profile/followers" className="hover:underline flex items-center gap-1.5 transition-opacity">
            <span className="text-[14px] font-black text-gray-900">{stats.followers}</span>
            <span className="text-[14px] text-gray-500">关注者</span>
          </Link>
        </div>
      </div>

      <div className="flex border-b border-gray-200 bg-white shrink-0 sticky top-[52px] z-30 mt-1">
        <button onClick={() => setActiveTab('posts')} className="flex-1 py-3.5 text-center transition-all relative hover:bg-gray-50">
          <span className={`font-bold text-[15px] ${activeTab === 'posts' ? 'text-gray-900' : 'text-gray-500'}`}>帖子</span>
          {activeTab === 'posts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#FF8C00] rounded-t-full"></div>}
        </button>
        <button onClick={() => setActiveTab('replies')} className="flex-1 py-3.5 text-center transition-all relative hover:bg-gray-50">
          <span className={`font-bold text-[15px] ${activeTab === 'replies' ? 'text-gray-900' : 'text-gray-500'}`}>回复</span>
          {activeTab === 'replies' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#FF8C00] rounded-t-full"></div>}
        </button>
      </div>

      <div className="flex-1 bg-white pt-2 pb-20">
        {activeTab === 'posts' ? (
          <PostList posts={posts} fetching={false} currentUserId={user.id} onDelete={(deletedId) => setPosts(prev => prev.filter(p => p.id !== deletedId))} />
        ) : (
          <div className="px-0 sm:px-0 space-y-0">
            {loadingReplies ? (
              <div className="text-center py-10"><div className="w-5 h-5 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin mx-auto"></div></div>
            ) : replies.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center">
                <p className="text-[15px] font-bold text-gray-900">还没有留下任何回复</p>
                <p className="text-[13px] text-gray-500 mt-1">当您回复别人的帖子时，它们会显示在这里。</p>
              </div>
            ) : (
              replies.map(reply => (
                <div key={reply.id} onClick={() => router.push(`/post/${reply.post_id}`)} className="bg-white p-4 border-b border-gray-100 hover:bg-gray-50 transition-all cursor-pointer group relative">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold overflow-hidden shrink-0">
                        {reply.user?.avatar_url ? <img src={reply.user.avatar_url} className="w-full h-full object-cover" alt="avatar" /> : (reply.user?.username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[15px] font-bold text-gray-900 hover:underline">{reply.user?.username}</span>
                        <span className="text-[14px] text-gray-500">· {new Date(reply.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button onClick={(e) => handleDeleteReply(e, reply.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100" title="删除">
                      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                  <p className="text-gray-900 text-[15px] mb-3 pl-[50px] leading-relaxed">{reply.content}</p>
                  <div className="ml-[50px]">
                    {reply.original_post ? (
                      <div className="border border-gray-200 rounded-2xl overflow-hidden hover:bg-gray-50 transition-colors flex flex-col sm:flex-row">
                        {reply.original_post.image_urls?.[0] && (
                          <div className="w-full sm:w-32 h-32 shrink-0 bg-gray-100 overflow-hidden"><img src={reply.original_post.image_urls[0]} className="w-full h-full object-cover" alt="原帖" /></div>
                        )}
                        <div className="p-3 flex-1 min-w-0 flex flex-col justify-center">
                          <span className="text-[13px] font-bold text-gray-900 mb-1">@{reply.original_post.username} 的原帖</span>
                          <p className="text-[13px] text-gray-500 line-clamp-2">{reply.original_post.content || '分享了图片'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-400 flex items-center gap-2">抱歉，该原帖已被作者删除</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 🌟 修改：编辑弹窗区大幅优化 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4">
          <div className="bg-white sm:rounded-2xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-xl flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            
            <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-6">
                <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-[18px] font-black text-gray-900">编辑个人资料</h2>
              </div>
              <button onClick={handleSaveProfile} disabled={isSaving} className="px-5 py-1.5 bg-gray-900 text-white font-bold rounded-full hover:bg-black transition-colors disabled:opacity-50">
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-10">
              {/* 背景图编辑区 */}
              <div className="relative w-full h-40 sm:h-48 bg-gray-200 group cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
                <img src={bannerPreview || '/profile-banner.jpg'} alt="banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm shadow-sm"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg></div>
                </div>
                <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={(e) => handleImageSelect(e, 'banner')} />
              </div>

              {/* 头像编辑区 */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 -mt-16 ml-4 rounded-full border-[5px] border-white bg-white group cursor-pointer shadow-sm z-10" onClick={() => avatarInputRef.current?.click()}>
                {avatarPreview ? (
                   <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-full text-4xl font-black text-gray-400">U</div>
                )}
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm shadow-sm"><svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg></div>
                </div>
                <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={(e) => handleImageSelect(e, 'avatar')} />
              </div>

              {/* 表单输入区 */}
              <div className="px-4 py-4 space-y-5">
                <div className="group relative rounded-md border border-gray-300 focus-within:border-[#FF8C00] focus-within:ring-1 focus-within:ring-[#FF8C00] transition-all">
                  <label className="absolute -top-2 left-2 bg-white px-1 text-[11px] font-medium text-gray-500 group-focus-within:text-[#FF8C00]">名字</label>
                  <input type="text" value={editForm.username} onChange={(e) => setEditForm({...editForm, username: e.target.value})} className="w-full px-3 py-3 text-[15px] text-gray-900 outline-none bg-transparent" placeholder="填写你的昵称" maxLength={50} />
                </div>

                <div className="group relative rounded-md border border-gray-300 focus-within:border-[#FF8C00] focus-within:ring-1 focus-within:ring-[#FF8C00] transition-all">
                  <label className="absolute -top-2 left-2 bg-white px-1 text-[11px] font-medium text-gray-500 group-focus-within:text-[#FF8C00]">职业 / 身份</label>
                  <input type="text" value={editForm.profession} onChange={(e) => setEditForm({...editForm, profession: e.target.value})} className="w-full px-3 py-3 text-[15px] text-gray-900 outline-none bg-transparent" placeholder="例如：高级架构师、独立设计师..." maxLength={30} />
                </div>

                <div className="group relative rounded-md border border-gray-300 focus-within:border-[#FF8C00] focus-within:ring-1 focus-within:ring-[#FF8C00] transition-all">
                  <label className="absolute -top-2 left-2 bg-white px-1 text-[11px] font-medium text-gray-500 group-focus-within:text-[#FF8C00]">个人简介</label>
                  <textarea value={editForm.bio} onChange={(e) => setEditForm({...editForm, bio: e.target.value})} className="w-full px-3 py-3 text-[15px] text-gray-900 outline-none bg-transparent resize-none h-24" placeholder="介绍一下你自己..." maxLength={160} />
                </div>

                <div className="group relative rounded-md border border-gray-300 focus-within:border-[#FF8C00] focus-within:ring-1 focus-within:ring-[#FF8C00] transition-all">
                  <label className="absolute -top-2 left-2 bg-white px-1 text-[11px] font-medium text-gray-500 group-focus-within:text-[#FF8C00]">位置</label>
                  <input type="text" value={editForm.location} onChange={(e) => setEditForm({...editForm, location: e.target.value})} className="w-full px-3 py-3 text-[15px] text-gray-900 outline-none bg-transparent" placeholder="例如：Auckland, NZ" maxLength={30} />
                </div>

                <div className="group relative rounded-md border border-gray-300 focus-within:border-[#FF8C00] focus-within:ring-1 focus-within:ring-[#FF8C00] transition-all">
                  <label className="absolute -top-2 left-2 bg-white px-1 text-[11px] font-medium text-gray-500 group-focus-within:text-[#FF8C00]">网站</label>
                  <input type="text" value={editForm.website} onChange={(e) => setEditForm({...editForm, website: e.target.value})} className="w-full px-3 py-3 text-[15px] text-gray-900 outline-none bg-transparent" placeholder="例如：https://github.com/..." />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 核心功能：全屏裁剪器覆盖层 */}
      {cropType && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black/90 text-white z-10 shrink-0">
            <button onClick={() => setCropType(null)} className="px-4 py-2 text-sm font-bold">取消</button>
            <span className="text-base font-bold">移动和缩放</span>
            <button onClick={handleCropConfirm} className="px-4 py-1.5 bg-white text-black rounded-full text-sm font-bold">确定</button>
          </div>
          
          <div className="relative flex-1 bg-black">
            <Cropper
              image={cropImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={cropType === 'avatar' ? 1 : 3} // 头像 1:1，背景图 3:1
              cropShape={cropType === 'avatar' ? 'round' : 'rect'}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels as any)}
            />
          </div>
          
          <div className="p-8 bg-black/90 shrink-0 flex items-center justify-center gap-4">
            <span className="text-white">−</span>
            <input 
              type="range" min={1} max={3} step={0.1} value={zoom} 
              onChange={e => setZoom(Number(e.target.value))} 
              className="w-full max-w-xs accent-white" 
            />
            <span className="text-white">+</span>
          </div>
        </div>
      )}

    </main>
  );
}