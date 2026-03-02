// src/app/my-comments/page.tsx
import MyCommentsClient from './MyCommentsClient';

export const metadata = {
  title: '我的评论 - OctoRoom',
  description: '查看我发出的评论和我收到的回复',
};

export default function MyCommentsPage() {
  return (
    <div className="max-w-[600px] mx-auto min-h-screen border-x border-gray-100 bg-white shadow-sm">
      <MyCommentsClient />
    </div>
  );
}