import { Controller, Post, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  @Post('chat')
  async proxyChat(
    @Body() body: {
      provider: 'gemini' | 'openai';
      apiKey: string;
      model: string;
      systemPrompt: string;
      historial: any[];
      userMsg: string;
    }
  ) {
    const { provider, apiKey, model, systemPrompt, historial, userMsg } = body;

    if (!apiKey) {
      throw new HttpException('API Key is required', HttpStatus.BAD_REQUEST);
    }

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const contents = historial.map(turn => ({
        role: turn.role === 'model' ? 'model' : 'user',
        parts: [{ text: turn.parts[0].text }]
      }));
      contents.push({ role: 'user', parts: [{ text: userMsg }] });

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Google API error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return { text };
      } catch (err) {
        throw new HttpException(err.message, HttpStatus.BAD_GATEWAY);
      }
    } else {
      // OpenAI Proxy
      const url = 'https://api.openai.com/v1/chat/completions';
      const messages = [{ role: 'system', content: systemPrompt }];
      for (const turn of historial) {
        messages.push({
          role: turn.role === 'model' ? 'assistant' : 'user',
          content: turn.parts[0].text
        });
      }
      messages.push({ role: 'user', content: userMsg });

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.8,
            max_tokens: 1024
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI API error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content ?? '';
        return { text };
      } catch (err) {
        throw new HttpException(err.message, HttpStatus.BAD_GATEWAY);
      }
    }
  }
}
