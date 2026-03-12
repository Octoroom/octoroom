'use client';
import Script from 'next/script';
import { useState } from 'react';

const tracks = [
  { 
    id: 1, 
    name: 'Alan Walker - Faded', 
    url: 'https://soundcloud.com/alanwalker/alan-walker-faded' 
  },
  { 
    id: 2, 
    name: 'Chillhop Essentials', 
    url: 'https://soundcloud.com/chillhopmusic/chillhop-essentials-spring-2023' 
  },
  { 
    id: 3, 
    name: 'Leszek Muzyka - Bloom', 
    url: 'https://soundcloud.com/chillhopmusic/leszek-muzyka-bloom' 
  },
  // ← 这里随便加你喜欢的 SoundCloud 链接（从官网 Share → Embed 复制 url 部分）
];

export default function MusicBot() {
  const [activeId, setActiveId] = useState(1);

  const activeTrack = tracks.find(t => t.id === activeId)!;
  const embedSrc = `https://w.soundcloud.com/player/?url=${encodeURIComponent(activeTrack.url)}&color=%23f97316&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=true`;

  return (
    <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl max-w-md mx-auto">
      {/* 章鱼标题 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-2xl">🐙</div>
        <div>
          <h3 className="font-bold text-xl">章鱼音乐机器人</h3>
          <p className="text-sm text-gray-400">点击切换曲目 • SoundCloud 官方嵌入</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2 hide-scrollbar border-b border-gray-700">
        {tracks.map((track) => (
          <button
            key={track.id}
            onClick={() => setActiveId(track.id)}
            className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              activeId === track.id
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            {track.name}
          </button>
        ))}
      </div>

      {/* 音乐播放器（切换时自动刷新） */}
      <iframe
        key={activeId}                     // 关键：切换时强制重新加载
        width="100%"
        height="300"
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        src={embedSrc}
        title={activeTrack.name}
      />

      <p className="text-xs text-gray-500 mt-4 text-center">
        官方嵌入 • 免登录播放 • 公开曲目即可
      </p>
    </div>
  );
}