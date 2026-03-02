// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import InsforgeProviderWrapper from "@/components/InsforgeProviderWrapper";
import Sidebar from "@/components/Sidebar"; 
import PhotoAlbumFeed from "@/components/PhotoAlbumFeed"; 
import PopularRoomsFeed from "@/components/PopularRoomsFeed"; 

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
          
          {/* 🌟 核心修改 1：加上了 lg:pl-[140px] 2xl:pl-[280px]
              给外层容器加上左侧 padding，相当于告诉浏览器“左边有东西了，请把所有主体往右挪”。
              这样就能完美补齐那绝对定位的 280px，让画面在超大屏上实现绝对的视觉居中。 */}
          <div className="flex justify-center min-h-screen bg-white md:bg-octo-cream lg:pl-[140px] 2xl:pl-[280px]">
            
            {/* 🌟 核心修改 2：主容器稍微放大到 max-w-[1600px] 避免四列内容互相挤压 */}
            <div className="flex w-full max-w-[1600px] justify-center lg:justify-between gap-4 xl:gap-6 relative">
              
              {/* 第一列 (左侧)：全局侧边栏 */}
              <Sidebar />

              {/* 第二列 (中间)：动态内容区 */}
              <main className="w-full max-w-[600px] min-h-screen bg-white border-x border-gray-100 shadow-sm relative shrink-0">
                {children}
              </main>

              {/* 第三列和第四列容器 */}
              <div className="hidden lg:flex gap-4 xl:gap-6 shrink-0 h-screen sticky top-0">
                
                {/* 第三列 (右侧一)：相册瀑布流 */}
                <div className="w-[300px] shrink-0 p-4 overflow-y-auto pb-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <PhotoAlbumFeed />
                </div>

                {/* 第四列 (右侧二)：热门房间瀑布流 */}
                {/* 🌟 核心修改 3：改为 2xl:block (屏幕大于1536px才显示第四列)
                    这是为了保护笔记本电脑用户的体验，防止屏幕不够宽时把主界面挤变形。大显示器下则会四列全显。 */}
                <div className="hidden 2xl:block w-[300px] shrink-0 p-4 overflow-y-auto pb-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <PopularRoomsFeed />
                </div>

              </div>

            </div>

          </div>
          
        </InsforgeProviderWrapper>
      </body>
    </html>
  );
}