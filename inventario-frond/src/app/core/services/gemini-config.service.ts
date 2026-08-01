import { Injectable, signal } from '@angular/core';

const STORAGE_KEY_OPENAI = 'ic_openai_key';
const STORAGE_KEY_GEMINI = 'ic_gemini_key';

@Injectable({ providedIn: 'root' })
export class GeminiConfigService {
  // OpenAI key (Plan Pro)
  private _openAiKey = signal<string>(
    localStorage.getItem(STORAGE_KEY_OPENAI) ?? ''
  );
  readonly apiKey = this._openAiKey.asReadonly();

  // Gemini key (Plan Gratis)
  private _geminiKey = signal<string>(
    localStorage.getItem(STORAGE_KEY_GEMINI) ?? ''
  );
  readonly geminiApiKey = this._geminiKey.asReadonly();

  readonly hasKey = () => this._openAiKey().trim().length > 10;
  readonly hasGeminiKey = () => this._geminiKey().trim().length > 10;

  // OpenAI
  setKey(key: string): void {
    const trimmed = key.trim();
    this._openAiKey.set(trimmed);
    localStorage.setItem(STORAGE_KEY_OPENAI, trimmed);
  }

  clearKey(): void {
    this._openAiKey.set('');
    localStorage.removeItem(STORAGE_KEY_OPENAI);
  }

  // Gemini
  setGeminiKey(key: string): void {
    const trimmed = key.trim();
    this._geminiKey.set(trimmed);
    localStorage.setItem(STORAGE_KEY_GEMINI, trimmed);
  }

  clearGeminiKey(): void {
    this._geminiKey.set('');
    localStorage.removeItem(STORAGE_KEY_GEMINI);
  }
}
