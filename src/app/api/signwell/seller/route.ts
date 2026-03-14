import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { documentId } = await request.json();

    if (!process.env.SIGNWELL_API_KEY) {
       return NextResponse.json({ error: "服务器未能读取到 API Key" }, { status: 500 });
    }

    if (!documentId) {
       return NextResponse.json({ error: "必须提供要获取的 documentId" }, { status: 400 });
    }

    const response = await fetch(`https://www.signwell.com/api/v1/documents/${documentId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': process.env.SIGNWELL_API_KEY,
        'Accept': 'application/json'
      }
    });

    const textData = await response.text();
    if (!response.ok) return NextResponse.json({ error: `无法获取文档详情: ${textData}` }, { status: 500 });

    const data = JSON.parse(textData);
    const sellerSignUrl = data.recipients?.find((r: any) => r.id === 'seller_id')?.embedded_signing_url;

    if (!sellerSignUrl) {
      return NextResponse.json({ error: '无法从文档中找到卖家的嵌入式签署链接，可能是您还没有被配置为 seller_id，或者文档已归档。' }, { status: 404 });
    }

    return NextResponse.json({ signUrl: sellerSignUrl, documentId });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部代码错误: " + error.message }, { status: 500 });
  }
}
