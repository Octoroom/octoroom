// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import InsforgeProviderWrapper from "@/components/InsforgeProviderWrapper";
import Sidebar from "@/components/Sidebar"; 
import PhotoAlbumFeed from "@/components/PhotoAlbumFeed"; 
import PopularRoomsFeed from "@/components/PopularRoomsFeed"; 
import { LanguageProvider } from "@/lib/i18n";
// 🌟 引入刚建好的移动端导航组件
import MobileNav from "@/components/MobileNav"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "章鱼房间 OctoRoom",
  description: "基于 Next.js 与 Insforge 构建的 Agent-Native 社区",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <InsforgeProviderWrapper>
          <LanguageProvider>
          {/* 🌟 核心修改 1：同步侧边栏宽度，加上了 lg:pl-[280px] */}
          <div className="flex justify-center min-h-screen bg-white md:bg-octo-cream lg:pl-[280px]">
            
            {/* 🌟 核心修改 2：主容器稍微放大到 max-w-[1600px] 避免四列内容互相挤压 */}
            <div className="flex w-full max-w-[1600px] justify-center lg:justify-between gap-4 xl:gap-6 relative">
              
              {/* 第一列 (左侧)：全局侧边栏 */}
              {/* 🌟 核心修改：加上 hidden md:block，在手机端隐藏原本固定的侧边栏 */}
              {/* 第一列 (左侧)：全局侧边栏 */}
              <div className="hidden md:block w-[280px] sticky top-0 h-screen border-r border-gray-100">
                <Sidebar />
              </div>

              {/* 第二列 (中间)：动态内容区 */}
              <main className="w-full max-w-[600px] min-h-screen bg-white border-x border-gray-100 shadow-sm relative shrink-0 flex flex-col">
                {/* 🌟 核心修改：把移动端汉堡菜单导航插在内容区最上面 */}
                <MobileNav />
                
                {/* 原本的主内容区 */}
                <div className="flex-1">
                  {children}
                </div>
              </main>

              {/* 第三列和第四列容器 */}
              <div className="hidden lg:flex gap-4 xl:gap-6 shrink-0 h-screen sticky top-0">
                
                {/* 第三列 (右侧一)：相册瀑布流 */}
                <div className="w-[300px] shrink-0 p-4 overflow-y-auto pb-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <PhotoAlbumFeed />
                </div>

                {/* 第四列 (右侧二)：热门房间瀑布流 */}
                <div className="hidden 2xl:block w-[300px] shrink-0 p-4 overflow-y-auto pb-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <PopularRoomsFeed />
                </div>

              </div>

            </div>

          </div>
          
          </LanguageProvider>
        </InsforgeProviderWrapper>
      </body>
    </html>
  );
}