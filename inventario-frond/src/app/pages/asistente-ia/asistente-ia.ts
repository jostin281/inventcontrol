import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatRippleModule } from '@angular/material/core';

import { PlanService, PlanType, PLANES } from '../../core/services/plan.service';
import { AiProviderService, ConversationTurn } from '../../core/services/ai-provider.service';
import { AiActionsService, ActionResult } from '../../core/services/ai-actions.service';
import { IntentParserService } from '../../core/services/intent-parser.service';
import { GeminiConfigService } from '../../core/services/gemini-config.service';
import { ProveedoresService } from '../../core/services/proveedores.service';
import { CategoriasService } from '../../core/services/categorias.service';
import { MovimientosService } from '../../core/services/movimientos.service';

export type MessageRole = 'user' | 'assistant';
export type MessageVariant = 'text' | 'action-card' | 'confirmation' | 'upgrade-prompt' | 'error';

export interface ActionCard {
  icon: string;
  label: string;
  ruta: string;
}

export interface ConfirmationData {
  pregunta: string;
  accion: () => void;
}

export interface ChatMessage {
  id: number;
  role: MessageRole;
  text: string;
  timestamp: Date;
  variant: MessageVariant;
  actionCard?: ActionCard;
  confirmationData?: ConfirmationData;
  confirmationResolved?: boolean;
}

const SUGERENCIAS_FREE = [
  '¿Qué debo reabastecer?',
  'Productos con stock bajo',
  'Estado de proveedores',
  'Salud del inventario',
];

const SUGERENCIAS_PRO = [
  '¿Qué debo reabastecer?',
  'Crea un proveedor',
  'Crea una categoría',
  'Estado de proveedores',
  'Genera orden de compra',
];

let MSG_ID = 0;

@Component({
  selector: 'app-asistente-ia',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatRippleModule,
  ],
  templateUrl: './asistente-ia.html',
  styleUrl: './asistente-ia.css',
})
export class AsistenteIa {
  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef<HTMLDivElement>;

  private planService = inject(PlanService);
  private aiProvider = inject(AiProviderService);
  private aiActions = inject(AiActionsService);
  private intentParser = inject(IntentParserService);
  private geminiConfig = inject(GeminiConfigService);
  private proveedoresService = inject(ProveedoresService);
  private categoriasService = inject(CategoriasService);
  private movimientosService = inject(MovimientosService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // ── Plan signals ──────────────────────────────────────────────────────────
  readonly plan = this.planService.plan;
  readonly planInfo = this.planService.planInfo;
  readonly mensajesHoy = this.planService.mensajesHoy;
  readonly mensajesRestantes = this.planService.mensajesRestantes;
  readonly puedeEnviar = this.planService.puedeEnviar;
  readonly PLANES = PLANES;

  // ── API Key signals ───────────────────────────────────────────────────────
  readonly hasOpenAiKey = this.geminiConfig.hasKey;
  readonly hasGeminiKey = this.geminiConfig.hasGeminiKey;
  readonly hasApiKey = () => this.plan() === 'free' ? this.geminiConfig.hasGeminiKey() : this.geminiConfig.hasKey();
  apiKeyInput = signal('');
  showKeyPanel = signal(false);

  // ── Chat signals ──────────────────────────────────────────────────────────
  messages = signal<ChatMessage[]>([
    {
      id: MSG_ID++,
      role: 'assistant',
      text: '¡Hola! Soy **InvenControl AI** 🤖. Estoy aquí para ayudarte a gestionar tu inventario. Puedes preguntarme lo que quieras sobre stock, proveedores, categorías, o pedirme que realice acciones (en Plan Pro).\n\n¿En qué te puedo ayudar hoy?',
      timestamp: new Date(),
      variant: 'text',
    },
  ]);

  isTyping = signal(false);
  inputText = signal('');

  /** Historial en el formato que Gemini necesita para mantener contexto */
  private conversationHistory: ConversationTurn[] = [];

  readonly sugerencias = computed(() =>
    this.plan() === 'pro' ? SUGERENCIAS_PRO : SUGERENCIAS_FREE
  );

  readonly saludInventario = computed(() => {
    const cats = this.categoriasService.categorias();
    const conStockBajo = cats.filter(c => (c.stockBajo ?? 0) > 0).length;
    return Math.round(((cats.length - conStockBajo) / Math.max(cats.length, 1)) * 100);
  });

  readonly tendenciaInventario = computed(() => {
    const salud = this.saludInventario();
    if (salud >= 85) return { icon: 'trending_up', label: 'Excelente', color: '#006b5c' };
    if (salud >= 65) return { icon: 'trending_flat', label: 'Estable', color: '#8a6000' };
    return { icon: 'trending_down', label: 'Requiere atención', color: '#ba1a1a' };
  });

  readonly capacidades = computed(() => {
    const esPro = this.plan() === 'pro';
    return [
      { label: 'Consultar stock y proveedores', disponible: true },
      { label: 'Sugerir reabastecimiento', disponible: true },
      { label: 'Crear proveedor, categoría o producto', disponible: esPro },
      { label: 'Editar o eliminar registros', disponible: esPro },
    ];
  });

  // ── API Key panel ─────────────────────────────────────────────────────────
  toggleKeyPanel(): void {
    this.showKeyPanel.update(v => !v);
    if (this.showKeyPanel()) {
      const currentKey = this.plan() === 'free'
        ? this.geminiConfig.geminiApiKey()
        : this.geminiConfig.apiKey();
      this.apiKeyInput.set(currentKey);
    }
  }

  saveApiKey(): void {
    const key = this.apiKeyInput().trim();
    if (!key) {
      this.snackBar.open(`Ingresa una API key válida de ${this.plan() === 'free' ? 'Gemini' : 'OpenAI'}.`, '', { duration: 2500 });
      return;
    }

    if (this.plan() === 'free') {
      this.geminiConfig.setGeminiKey(key);
      this.showKeyPanel.set(false);
      this.snackBar.open('✅ API key de Gemini guardada. ¡Plan Gratis listo!', '', { duration: 3000 });
      this._pushAssistantMessage('🔑 API key de Gemini configurada. ¡Ahora puedes usar el chat gratuito de Google Gemini Flash! ¿Qué necesitas?', 'text');
    } else {
      this.geminiConfig.setKey(key);
      this.showKeyPanel.set(false);
      this.snackBar.open('✅ API key de OpenAI guardada. ¡Plan Pro listo!', '', { duration: 3000 });
      this._pushAssistantMessage('🔑 API key de OpenAI configurada. ¡Ahora tengo acceso completo al Plan Pro! ¿Qué necesitas?', 'text');
    }
    this.cdr.markForCheck();
  }

  clearApiKey(): void {
    if (this.plan() === 'free') {
      this.geminiConfig.clearGeminiKey();
      this.apiKeyInput.set('');
      this.snackBar.open('API key de Gemini eliminada.', '', { duration: 2000 });
    } else {
      this.geminiConfig.clearKey();
      this.apiKeyInput.set('');
      this.snackBar.open('API key de OpenAI eliminada.', '', { duration: 2000 });
    }
    this.cdr.markForCheck();
  }

  // ── Plan switcher ─────────────────────────────────────────────────────────
  onPlanChange(plan: PlanType): void {
    this.planService.setPlan(plan);
    this.conversationHistory = [];
    if (plan === 'pro') {
      this.showKeyPanel.set(!this.geminiConfig.hasKey());
      this.apiKeyInput.set(this.geminiConfig.apiKey());
    } else {
      this.showKeyPanel.set(!this.geminiConfig.hasGeminiKey());
      this.apiKeyInput.set(this.geminiConfig.geminiApiKey());
    }
    this._pushAssistantMessage(
      plan === 'pro'
        ? `🚀 ¡Cambiaste al **Plan Pro** (OpenAI GPT)! ${this.hasOpenAiKey() ? 'Ahora puedo ejecutar acciones sobre el sistema: crear proveedores, categorías, generar órdenes y más.' : '🔑 Configura tu API key de OpenAI para activar todas las funciones avanzadas.'} ¿Qué necesitas?`
        : `✅ Cambiaste al **Plan Gratis** (Gemini). ${this.hasGeminiKey() ? 'La IA de Google está activa y lista para responder.' : '🔑 Configura tu API key gratuita de Gemini para comenzar a usar el chat.'} ¿En qué te ayudo?`,
      'text'
    );
  }

  // ── Send message ──────────────────────────────────────────────────────────
  sendMessage(text?: string): void {
    const userText = (text ?? this.inputText()).trim();
    if (!userText) return;

    if (!this.puedeEnviar() && this.plan() === 'free') {
      this.snackBar.open('Alcanzaste el límite diario. Mejora a Pro para continuar.', 'Mejorar', {
        duration: 5000,
      });
      return;
    }

    // Push user bubble
    this.messages.update(msgs => [
      ...msgs,
      {
        id: MSG_ID++,
        role: 'user',
        text: userText,
        timestamp: new Date(),
        variant: 'text',
      },
    ]);
    this.inputText.set('');
    this.planService.registrarMensaje();
    this._scrollToBottom();

    // Parse intent
    const intent = this.intentParser.parse(userText);

    if (intent.action === 'upgrade_plan') {
      this._scheduleAssistant(() => {
        this._pushUpgradePrompt('¿Te gustaría mejorar al Plan Pro para acceder a todas las funcionalidades de IA?');
      });
      return;
    }

    // Write actions require Pro plan
    if (this.intentParser.isWriteAction(intent.action) && this.plan() === 'free') {
      this._scheduleAssistant(() => {
        this._pushUpgradePrompt(
          `La función **${this._actionLabel(intent.action)}** requiere el **Plan Pro**. Con él podrás ejecutar acciones directamente sobre el sistema mediante lenguaje natural.`
        );
      });
      return;
    }

    // Destructive actions require confirmation
    if (this.intentParser.isDestructiveAction(intent.action) && this.plan() === 'pro') {
      const nombreEntidad = intent.nombre ? `"${intent.nombre}"` : 'este elemento';
      this._scheduleAssistant(() => {
        this._pushConfirmation(
          `⚠️ ¿Confirmas **eliminar** el ${intent.entidad} ${nombreEntidad}? Esta acción no se puede deshacer.`,
          () => {
            if (intent.action === 'eliminar_proveedor') {
              const prov = this.proveedoresService.getAll()
                .find(p => p.nombre.toLowerCase().includes((intent.nombre ?? '').toLowerCase()));
              if (prov) {
                this.aiActions.eliminarProveedor(prov.id).subscribe(result => {
                  if (result.success) { this._pushActionCard(result); this._addToHistory('model', result.mensaje ?? ''); }
                  else { this._pushAssistantMessage(result.mensaje ?? 'Error.', 'error'); }
                });
              } else {
                this._pushAssistantMessage('No encontré un proveedor con ese nombre.', 'error');
              }
            } else {
              const cat = this.categoriasService.getAll()
                .find(c => c.nombre.toLowerCase().includes((intent.nombre ?? '').toLowerCase()));
              if (cat) {
                this.aiActions.eliminarCategoria(cat.id).subscribe(result => {
                  if (result.success) { this._pushActionCard(result); this._addToHistory('model', result.mensaje ?? ''); }
                  else { this._pushAssistantMessage(result.mensaje ?? 'Error.', 'error'); }
                });
              } else {
                this._pushAssistantMessage('No encontré una categoría con ese nombre.', 'error');
              }
            }
          }
        );
      });
      return;
    }

    if (intent.action === 'generar_reporte' && this.plan() === 'pro') {
      this._scheduleAssistant(() => {
        const result = this.aiActions.generarReporte(intent.categoriaReporte ?? 'rotacion');
        if (result.success) {
          const url = result.ruta ?? '/reportes';
          this.router.navigateByUrl(url);
          this._pushActionCard(result);
          this._addToHistory('model', result.mensaje ?? '');
        } else {
          this._pushAssistantMessage(result.mensaje ?? 'No pude generar el reporte.', 'error');
        }
      });
      return;
    }

    // Creation actions (Pro)
    if (intent.action === 'crear_proveedor' && this.plan() === 'pro') {
      const nombre = intent.nombre ?? `Proveedor ${new Date().getTime()}`;
      this._scheduleAssistant(() => {
        this.aiActions.crearProveedor({
          nombre,
          contacto: intent.contacto,
          correo: intent.correo,
        }).subscribe(result => {
          if (result.success) { this._pushActionCard(result); this._addToHistory('model', result.mensaje ?? ''); }
          else { this._pushAssistantMessage(result.mensaje ?? 'Error al crear proveedor.', 'error'); }
        });
      });
      return;
    }

    if (intent.action === 'crear_categoria' && this.plan() === 'pro') {
      const nombre = intent.nombre ?? `Categoría ${new Date().getTime()}`;
      this._scheduleAssistant(() => {
        this.aiActions.crearCategoria({ nombre, descripcion: intent.descripcion }).subscribe(result => {
          if (result.success) { this._pushActionCard(result); this._addToHistory('model', result.mensaje ?? ''); }
          else { this._pushAssistantMessage(result.mensaje ?? 'Error al crear categoría.', 'error'); }
        });
      });
      return;
    }

    if (intent.action === 'crear_producto' && this.plan() === 'pro') {
      const nombre = intent.nombre ?? `Producto ${new Date().getTime()}`;
      this._scheduleAssistant(() => {
        this.aiActions.crearProducto({
          nombre,
          categoria: intent.entidad === 'producto' ? intent.descripcion : undefined,
          precio: intent.precio,
          stock: intent.stock,
          stockMax: intent.stockMax,
          proveedor: intent.proveedor,
          sku: intent.sku,
          descripcion: intent.descripcion,
        }).subscribe(result => {
          if (result.success) { this._pushActionCard(result); this._addToHistory('model', result.mensaje ?? ''); }
          else { this._pushAssistantMessage(result.mensaje ?? 'Error al crear producto.', 'error'); }
        });
      });
      return;
    }

    // Default: delegate to real AI with full conversation history
    this.isTyping.set(true);
    this._scrollToBottom();
    this.cdr.markForCheck();

    // Pass the current history (without the message we just added — it goes via sendMessage)
    this.aiProvider.sendMessage(userText, this.conversationHistory).subscribe({
      next: response => {
        this.isTyping.set(false);
        // Add both turns to local history for next request
        this._addToHistory('user', userText);
        this._addToHistory('model', response);
        this._pushAssistantMessage(response, 'text');
        this.cdr.markForCheck();
      },
      error: () => {
        this.isTyping.set(false);
        this._pushAssistantMessage('Ocurrió un error al procesar tu mensaje. Intenta de nuevo.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  useSuggestion(sug: string): void {
    this.sendMessage(sug);
  }

  confirmAction(msg: ChatMessage): void {
    msg.confirmationResolved = true;
    msg.confirmationData?.accion();
    this.messages.update(msgs => [...msgs]);
    this._scrollToBottom();
  }

  rejectAction(msg: ChatMessage): void {
    msg.confirmationResolved = true;
    this.messages.update(msgs => [...msgs]);
    this._pushAssistantMessage('Acción cancelada. No se realizó ningún cambio. ¿En qué más te puedo ayudar?', 'text');
  }

  navigateTo(ruta: string): void {
    this.router.navigate([ruta]);
  }

  upgradeFromBubble(): void {
    this.planService.upgrade();
    this.conversationHistory = [];
    this.snackBar.open('¡Plan Pro activado!', '✓', { duration: 3000 });
    this._pushAssistantMessage('🚀 ¡Plan Pro activado! Ahora puedo ejecutar acciones reales sobre el sistema. ¿Qué necesitas?', 'text');
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  renderMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• (.+)$/gm, '<span class="md-bullet">• $1</span>')
      .replace(/\n/g, '<br>');
  }

  trackById(_: number, msg: ChatMessage): number {
    return msg.id;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _addToHistory(role: 'user' | 'model', text: string): void {
    this.conversationHistory.push({ role, parts: [{ text }] });
    // Keep max 20 turns to avoid token overflow
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  private _scheduleAssistant(fn: () => void): void {
    this.isTyping.set(true);
    this.cdr.markForCheck();
    this._scrollToBottom();
    const delay = 900 + Math.random() * 600;
    setTimeout(() => {
      this.isTyping.set(false);
      fn();
      this.cdr.markForCheck();
    }, delay);
  }

  private _pushAssistantMessage(text: string, variant: MessageVariant): void {
    this.messages.update(msgs => [
      ...msgs,
      { id: MSG_ID++, role: 'assistant', text, timestamp: new Date(), variant },
    ]);
    this._scrollToBottom();
    this.cdr.markForCheck();
  }

  private _pushActionCard(result: ActionResult): void {
    this.messages.update(msgs => [
      ...msgs,
      {
        id: MSG_ID++,
        role: 'assistant',
        text: result.mensaje ?? '',
        timestamp: new Date(),
        variant: 'action-card',
        actionCard: {
          icon: 'check_circle',
          label: `Ver en ${this._rutaLabel(result.ruta ?? '')}`,
          ruta: result.ruta ?? '/',
        },
      },
    ]);
    this._scrollToBottom();
    this.cdr.markForCheck();
  }

  private _pushConfirmation(pregunta: string, accion: () => void): void {
    this.messages.update(msgs => [
      ...msgs,
      {
        id: MSG_ID++,
        role: 'assistant',
        text: pregunta,
        timestamp: new Date(),
        variant: 'confirmation',
        confirmationData: { pregunta, accion },
        confirmationResolved: false,
      },
    ]);
    this._scrollToBottom();
    this.cdr.markForCheck();
  }

  private _pushUpgradePrompt(text: string): void {
    this.messages.update(msgs => [
      ...msgs,
      {
        id: MSG_ID++,
        role: 'assistant',
        text,
        timestamp: new Date(),
        variant: 'upgrade-prompt',
      },
    ]);
    this._scrollToBottom();
    this.cdr.markForCheck();
  }

  private _scrollToBottom(): void {
    setTimeout(() => {
      this.scrollAnchor?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  }

  private _actionLabel(action: string): string {
    const map: Record<string, string> = {
      crear_proveedor: 'Crear proveedor',
      crear_categoria: 'Crear categoría',
      crear_producto: 'Crear producto',
      generar_reporte: 'Generar reporte',
      editar_proveedor: 'Editar proveedor',
      eliminar_proveedor: 'Eliminar proveedor',
      eliminar_categoria: 'Eliminar categoría',
      orden_compra: 'Generar orden de compra',
    };
    return map[action] ?? action;
  }

  private _rutaLabel(ruta: string): string {
    const map: Record<string, string> = {
      '/proveedores': 'Proveedores',
      '/categorias': 'Categorías',
      '/productos': 'Productos',
      '/movimientos': 'Movimientos',
    };
    return map[ruta] ?? ruta;
  }
}
