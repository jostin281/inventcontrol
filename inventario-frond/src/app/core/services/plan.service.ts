import { Injectable, signal, computed, effect } from '@angular/core';

export type PlanType = 'free' | 'pro';

export interface PlanInfo {
  id: PlanType;
  nombre: string;
  proveedor: string;
  limitesMensajes: number | null; // null = ilimitado
  color: string;
  icon: string;
}

export const PLANES: Record<PlanType, PlanInfo> = {
  free: {
    id: 'free',
    nombre: 'Plan gratis',
    proveedor: 'Gemini',
    limitesMensajes: 30,
    color: '#757684',
    icon: 'auto_awesome',
  },
  pro: {
    id: 'pro',
    nombre: 'Plan pro',
    proveedor: 'OpenAI',
    limitesMensajes: null,
    color: '#24389c',
    icon: 'workspace_premium',
  },
};

const STORAGE_KEY_PLAN = 'ic_ai_plan';
const STORAGE_KEY_USAGE = 'ic_ai_usage';

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable({ providedIn: 'root' })
export class PlanService {
  private _plan = signal<PlanType>(
    (localStorage.getItem(STORAGE_KEY_PLAN) as PlanType) ?? 'free'
  );

  private _mensajesHoy = signal<number>(this._loadUsage());

  readonly plan = this._plan.asReadonly();

  readonly planInfo = computed(() => PLANES[this._plan()]);

  readonly mensajesHoy = this._mensajesHoy.asReadonly();

  readonly mensajesRestantes = computed(() => {
    const limite = this.planInfo().limitesMensajes;
    if (limite === null) return null;
    return Math.max(0, limite - this._mensajesHoy());
  });

  readonly puedeEnviar = computed(() => {
    const restantes = this.mensajesRestantes();
    return restantes === null || restantes > 0;
  });

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY_PLAN, this._plan());
    });
  }

  upgrade(): void {
    this._plan.set('pro');
  }

  downgrade(): void {
    this._plan.set('free');
  }

  setPlan(plan: PlanType): void {
    this._plan.set(plan);
  }

  registrarMensaje(): void {
    this._mensajesHoy.update(n => n + 1);
    this._saveUsage(this._mensajesHoy());
  }

  private _loadUsage(): number {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USAGE);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      if (parsed.fecha === getTodayKey()) return parsed.count;
    } catch {}
    return 0;
  }

  private _saveUsage(count: number): void {
    localStorage.setItem(
      STORAGE_KEY_USAGE,
      JSON.stringify({ fecha: getTodayKey(), count })
    );
  }
}
