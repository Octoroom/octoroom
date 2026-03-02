'use server';

import postgres from 'postgres';

// 初始化数据库连接
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

// 🌟 1. 获取推文列表 (服务端直接执行 SQL 关联查询)
export async function getPostsAction() {
  try {
    const posts = await sql`
      SELECT 
        p.id, 
        p.content, 
        p.created_at, 
        pr.username
      FROM posts p
      LEFT JOIN profiles pr ON p.author_id = pr.id
      ORDER BY p.created_at DESC
    `;
    return { success: true, data: posts };
  } catch (error: any) {
    console.error('数据库查询失败:', error);
    return { success: false, error: error.message };
  }
}

// 🌟 2. 发布新推文 (服务端直接插入)
export async function createPostAction(content: string, authorId: string) {
  try {
    await sql`
      INSERT INTO posts (content, author_id)
      VALUES (${content}, ${authorId})
    `;
    return { success: true };
  } catch (error: any) {
    console.error('数据库写入失败:', error);
    return { success: false, error: error.message };
  }
}