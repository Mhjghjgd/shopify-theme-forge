import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = 'claude-sonnet-4-5';

export async function generateWithClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<string> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  return content.text;
}

export async function generateWithClaudeVision(
  systemPrompt: string,
  userPrompt: string,
  imageUrls: string[],
  maxTokens = 4096
): Promise<string> {
  const imageContents = await Promise.all(
    imageUrls.map(async (url) => {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const mediaType = contentType.startsWith('image/png')
        ? 'image/png'
        : contentType.startsWith('image/webp')
        ? 'image/webp'
        : 'image/jpeg';

      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
          data: base64,
        },
      };
    })
  );

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContents,
          { type: 'text', content: userPrompt } as { type: 'text'; text: string; content?: string },
        ].map((c) => {
          if (c.type === 'text') return { type: 'text' as const, text: (c as { type: 'text'; content: string }).content || userPrompt };
          return c;
        }),
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  return content.text;
}
