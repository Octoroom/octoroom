import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not defined in environment variables");
  }
  return new OpenAI({ apiKey });
};

export async function POST(request: Request) {
  try {
    const { transcript, buyerName } = await request.json();
    console.log("AI Summarize Request received for:", buyerName);

    if (!transcript) {
      console.error("AI Summarize: Missing transcript in request body");
      return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
    }


    const openai = getOpenAIClient();

    const prompt = `
      You are a high-end real estate assistant for Octoroom. 
      Summarize the following call transcript between an agent and a buyer named ${buyerName}.
      Provide a concise 4-5 point summary in Chinese (Traditional/Simplified as appropriate for the user).
      Also, recommend a short 2-4 word status in Chinese for the buyer's pipeline based on the conversation (e.g., "考虑中", "价格分歧", "准备签约", "需跟进").

      Focus on:
      1. Buyer Intent/Interest level.
      2. Key discussion points (Price, Conditions, Timeline).
      3. Specific concerns or positive feedback.
      4. Next actionable steps for the agent.

      Transcript:
      ${transcript}

      Format the output as a JSON object with the following fields:
      - summary: The bulleted list summary string.
      - recommendedStatus: The 2-4 word status recommendation.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional real estate assistant. Always respond in valid JSON format." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = JSON.parse(response.choices[0].message.content || '{}');
    const summary = content.summary;
    const recommendedStatus = content.recommendedStatus;

    return NextResponse.json({ summary, recommendedStatus });

  } catch (error: any) {
    console.error("AI Summarization Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
