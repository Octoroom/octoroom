import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 严重错误: Supabase 环境变量未找到！请检查 .env.local 文件并重启服务器。');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');