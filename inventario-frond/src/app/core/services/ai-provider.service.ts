import { Injectable, inject } from '@angular/core';
import { Observable, from, of, lastValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PlanService } from './plan.service';
import { ProveedoresService } from './proveedores.service';
import { MovimientosService } from './movimientos.service';
import { CategoriasService } from './categorias.service';
import { GeminiConfigService } from './gemini-config.service';

export interface AiContext {
  proveedoresCount: number;
  categoriasCount: number;
  stockBajoCount: number;
  movimientosHoy: number;
  saludInventario: number;
  listaProveedores: string;
  listaCategorias: string;
}

export interface AiProvider {
  nombre: string;
  sendMessage(userMsg: string, context: AiContext, historial: ConversationTurn[]): Observable<string>;
  getTypingDelay(): number;
}

export interface ConversationTurn {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

// ── Prompts del sistema ────────────────────────────────────────────────────────

function buildSystemPromptFree(ctx: AiContext): string {
  return `Eres InvenControl AI, el asistente inteligente del sistema de gestión de inventario "InvenControl". 
Responde SIEMPRE en español de México, de forma amable, concisa y profesional.
Usa emojis con moderación para hacer las respuestas más visuales.
Usa formato markdown: **negrita** para datos importantes, listas con •.

CONTEXTO ACTUAL DEL INVENTARIO:
- Proveedores activos: ${ctx.proveedoresCount}
- Categorías: ${ctx.categoriasCount}
- Categorías con stock bajo: ${ctx.stockBajoCount}
- Movimientos de hoy: ${ctx.movimientosHoy}
- Salud del inventario: ${ctx.saludInventario}%
- Proveedores: ${ctx.listaProveedores}
- Categorías: ${ctx.listaCategorias}

CAPACIDADES (Plan Gratis):
- Puedes responder preguntas sobre el inventario, stock, proveedores y categorías.
- Puedes sugerir estrategias de reabastecimiento (pero NO ejecutar acciones).
- Si el usuario te pide crear, editar o eliminar algo, explica amablemente que eso requiere el Plan Pro.
- Mantén el contexto de la conversación para respuestas coherentes.

IMPORTANTE: Sé conversacional y natural. Si te preguntan algo fuera del inventario, responde brevemente y regresa al tema del sistema.`;
}

function buildSystemPromptPro(ctx: AiContext): string {
  return `Eres InvenControl AI Pro, el asistente avanzado del sistema de gestión de inventario "InvenControl".
Responde SIEMPRE en español de México, de forma amable, concisa y profesional.
Usa emojis con moderación. Usa formato markdown: **negrita** para datos importantes, listas con •.

CONTEXTO ACTUAL DEL INVENTARIO:
- Proveedores activos: ${ctx.proveedoresCount}
- Categorías: ${ctx.categoriasCount}
- Categorías con stock bajo: ${ctx.stockBajoCount}
- Movimientos de hoy: ${ctx.movimientosHoy}
- Salud del inventario: ${ctx.saludInventario}%
- Proveedores: ${ctx.listaProveedores}
- Categorías: ${ctx.listaCategorias}

CAPACIDADES (Plan Pro — todas activas):
- Responder consultas sobre inventario, stock, proveedores y categorías.
- Sugerir Y ejecutar reabastecimiento.
- Crear proveedores y categorías mediante lenguaje natural.
- Editar y eliminar registros (siempre pidiendo confirmación para eliminaciones).
- Generar análisis avanzados y reportes del inventario.

Cuando el usuario pida una acción (crear/editar/eliminar), responde de forma natural confirmando que la procesaste.
Mantén el contexto de la conversación completo para dar respuestas coherentes y personalizadas.

IMPORTANTE: Eres el asistente más capaz del sistema. Muestra proactividad: si ves oportunidades de mejora en el inventario, menciónalo.`;
}

@Injectable()
export class GeminiFreeProvider implements AiProvider {
  nombre = 'Gemini Flash (Plan Gratis)';
  private geminiConfig = inject(GeminiConfigService);

  private readonly GEMINI_MODEL = 'gemini-3.1-flash-lite';
  private readonly GEMINI_API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${this.GEMINI_MODEL}:generateContent`;

  getTypingDelay(): number {
    return 300;
  }

  sendMessage(
    userMsg: string,
    context: AiContext,
    historial: ConversationTurn[]
  ): Observable<string> {
    const apiKey = this.geminiConfig.geminiApiKey();

    if (!apiKey) {
      return of(
        '🔑 **Configura tu API key de Gemini** para activar el Plan Gratis.\n\n' +
        'Haz clic en el ícono de **Configurar API key** a la derecha para ingresar tu clave gratuita de [Google AI Studio](https://aistudio.google.com/).'
      );
    }

    const systemPrompt = buildSystemPromptFree(context);
    return from(this._callGeminiFree(apiKey, systemPrompt, historial, userMsg)).pipe(
      catchError(err => {
        console.error('Gemini Free API error:', err);
        const errMsg = err?.message || 'Error desconocido';
        return of(`⚠️ Gemini API Error: ${errMsg}. Revisa tu API key e intenta de nuevo.`);
      })
    );
  }

  private async _callGeminiFree(
    apiKey: string,
    systemPrompt: string,
    historial: ConversationTurn[],
    userMsg: string
  ): Promise<string> {
    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'gemini',
        apiKey,
        model: this.GEMINI_MODEL,
        systemPrompt,
        historial,
        userMsg,
      }),
    });

    if (!response.ok) {
      let errText = '';
      try {
        const errJson = await response.json();
        errText = errJson.message || JSON.stringify(errJson);
      } catch {
        errText = await response.text();
      }
      console.error('Gemini proxy response error:', errText);
      throw new Error(errText);
    }

    const data = await response.json();
    return data.text;
  }
}

// ── OPENAI PRO PROVIDER ───────────────────────────────────────────────────────

@Injectable()
export class OpenAiProProvider implements AiProvider {
  nombre = 'OpenAI GPT (Plan Pro)';
  private geminiConfig = inject(GeminiConfigService);

  private readonly OPENAI_MODEL = 'gpt-4o-mini';

  getTypingDelay(): number {
    return 300;
  }

  sendMessage(
    userMsg: string,
    context: AiContext,
    historial: ConversationTurn[]
  ): Observable<string> {
    const apiKey = this.geminiConfig.apiKey();

    if (!apiKey) {
      return of(
        '🔑 **Configura tu API key de OpenAI** para activar el Plan Pro.\n\n' +
        'Haz clic en el ícono de **configuración (⚙️)** en la esquina superior derecha para ingresar tu clave de [OpenAI Platform](https://platform.openai.com/api-keys).'
      );
    }

    const systemPrompt = buildSystemPromptPro(context);
    return from(this._callOpenAI(apiKey, systemPrompt, historial, userMsg)).pipe(
      catchError(err => {
        console.error('OpenAI API error:', err);
        const errMsg = err?.message || 'Error desconocido';
        return of(`⚠️ OpenAI API Error: ${errMsg}. Revisa tu API key e intenta de nuevo.`);
      })
    );
  }

  private async _callOpenAI(
    apiKey: string,
    systemPrompt: string,
    historial: ConversationTurn[],
    userMsg: string
  ): Promise<string> {
    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'openai',
        apiKey,
        model: this.OPENAI_MODEL,
        systemPrompt,
        historial,
        userMsg,
      }),
    });

    if (!response.ok) {
      let errText = '';
      try {
        const errJson = await response.json();
        errText = errJson.message || JSON.stringify(errJson);
      } catch {
        errText = await response.text();
      }
      console.error('OpenAI proxy response error:', errText);
      throw new Error(errText);
    }

    const data = await response.json();
    return data.text;
  }
}

// ── AI PROVIDER SERVICE (STRATEGY) ───────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AiProviderService {
  private planService = inject(PlanService);
  private proveedoresService = inject(ProveedoresService);
  private movimientosService = inject(MovimientosService);
  private categoriasService = inject(CategoriasService);

  private freeProvider = inject(GeminiFreeProvider);
  private proProvider = inject(OpenAiProProvider);

  get currentProvider(): AiProvider {
    return this.planService.plan() === 'pro'
      ? this.proProvider
      : this.freeProvider;
  }

  getTypingDelay(): number {
    return this.currentProvider.getTypingDelay();
  }

  sendMessage(userMsg: string, historial: ConversationTurn[]): Observable<string> {
    const ctx = this._buildContext();
    return this.currentProvider.sendMessage(userMsg, ctx, historial);
  }

  async testFreeConnection(): Promise<{ provider: string; ok: boolean; message: string }> {
    try {
      const ctx = this._buildContext();
      const resp = await lastValueFrom(this.freeProvider.sendMessage('Prueba de conexión (ping)', ctx, []));
      return { provider: this.freeProvider.nombre, ok: true, message: resp };
    } catch (err) {
      return { provider: this.freeProvider.nombre, ok: false, message: String(err) };
    }
  }

  private _buildContext(): AiContext {
    const proveedores = this.proveedoresService.proveedores();
    const categorias = this.categoriasService.categorias();
    const movimientos = this.movimientosService.movimientos();
    const hoy = new Date().toDateString();
    const movimientosHoy = movimientos.filter(
      m => new Date(m.fecha).toDateString() === hoy
    ).length;
    const stockBajoCount = categorias.filter(c => (c.stockBajo ?? 0) > 0).length;
    const saludInventario = Math.round(
      ((categorias.length - stockBajoCount) / Math.max(categorias.length, 1)) * 100
    );

    const listaProveedores = proveedores
      .filter(p => p.activo)
      .map(p => `${p.nombre} (⭐${p.calificacion}, ${p.tiempoEntregaDias}d)`)
      .join(', ');

    const listaCategorias = categorias
      .map(c => `${c.nombre} (${c.totalProductos} productos, stock bajo: ${c.stockBajo})`)
      .join(', ');

    return {
      proveedoresCount: proveedores.filter(p => p.activo).length,
      categoriasCount: categorias.length,
      stockBajoCount,
      movimientosHoy,
      saludInventario,
      listaProveedores,
      listaCategorias,
    };
  }
}

// Provide implementations
export function provideAiProviders() {
  return [GeminiFreeProvider, OpenAiProProvider];
}
