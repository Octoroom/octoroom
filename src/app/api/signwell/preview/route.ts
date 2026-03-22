import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    // 调用 SignWell 官方 API 获取文档详情
    const swResponse = await fetch(`https://www.signwell.com/api/v1/documents/${documentId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': process.env.SIGNWELL_API_KEY!,
        'Accept': 'application/json'
      }
    });

    const data = await swResponse.json();

    if (!swResponse.ok) {
      throw new Error(data.message || 'Failed to fetch from SignWell');
    }

    // SignWell 会返回一个可以直接嵌入预览的链接，或者下载链接. Prefer download_url to avoid iframe refusal (X-Frame-Options) on normal preview_urls
    const previewUrl = data.embedded_preview_url || data.download_url || data.preview_url;

    return NextResponse.json({ previewUrl });
  } catch (error: any) {
    console.error("❌ SignWell Preview Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}