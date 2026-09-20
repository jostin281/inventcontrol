import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-barcode-scanner-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
  ],
  template: `
    <div class="scanner-container">
      <div class="scanner-header">
        <h2 mat-dialog-title>
          <mat-icon color="primary">qr_code_scanner</mat-icon>
          Escanear Código (Laptop / Móvil)
        </h2>
        <div class="header-actions">
          <button
            *ngIf="availableCameras.length > 1"
            mat-icon-button
            color="primary"
            (click)="cambiarCamara()"
            matTooltip="Cambiar Cámara (Laptop/Frontal/Trasera)"
            type="button"
          >
            <mat-icon>cameraswitch</mat-icon>
          </button>
          <button mat-icon-button (click)="cerrar()" class="close-btn" type="button">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <mat-dialog-content class="dialog-content">
        <!-- Vista previa de cámara (funciona en Laptop y Teléfonos) -->
        <div class="video-wrapper">
          <video #videoElement autoplay playsinline muted class="camera-video" [class.hidden]="!cameraActive()"></video>

          <div *ngIf="cameraActive()" class="scan-overlay">
            <div class="scan-box">
              <div class="corner top-left"></div>
              <div class="corner top-right"></div>
              <div class="corner bottom-left"></div>
              <div class="corner bottom-right"></div>
              <div class="laser-line"></div>
            </div>
            <p class="scan-hint">
              {{ isMobile ? 'Apunta la cámara de tu teléfono al código' : 'Apunta la cámara de la laptop al código' }}
            </p>
          </div>

          <div *ngIf="!cameraActive()" class="no-camera-box">
            <mat-icon class="large-icon">videocam_off</mat-icon>
            <p>{{ cameraStatus() }}</p>
            <button mat-stroked-button color="primary" (click)="iniciarCamara()">
              <mat-icon>videocam</mat-icon> Reintentar Cámara
            </button>
          </div>
        </div>

        <!-- Entrada manual / Lector físico USB o Bluetooth -->
        <div class="manual-input-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Código de barras / SKU manual o lector USB</mat-label>
            <input
              matInput
              #manualInput
              [(ngModel)]="manualCode"
              placeholder="Ej: 7501234567890 o PROD-001"
              (keyup.enter)="confirmarManual()"
              autofocus
            />
            <mat-icon matPrefix>barcode_reader</mat-icon>
            <button *ngIf="manualCode" matSuffix mat-icon-button aria-label="Limpiar" (click)="manualCode = ''" type="button">
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button (click)="cerrar()" type="button">Cancelar</button>
        <button mat-flat-button color="primary" [disabled]="!manualCode.trim()" (click)="confirmarManual()" type="button">
          <mat-icon>check</mat-icon> Usar Código
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .scanner-container {
      padding: 8px;
      max-width: 480px;
    }
    .scanner-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .scanner-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1.15rem;
      font-weight: 600;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0 4px !important;
      overflow: hidden;
    }
    .video-wrapper {
      position: relative;
      width: 100%;
      height: 260px;
      background: #0f172a;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .camera-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .camera-video.hidden {
      display: none;
    }
    .scan-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.35);
    }
    .scan-box {
      position: relative;
      width: 230px;
      height: 140px;
      border: 1px dashed rgba(255, 255, 255, 0.4);
      border-radius: 8px;
    }
    .corner {
      position: absolute;
      width: 18px;
      height: 18px;
      border-color: #6366f1;
      border-style: solid;
    }
    .top-left { top: -2px; left: -2px; border-width: 3px 0 0 3px; border-top-left-radius: 6px; }
    .top-right { top: -2px; right: -2px; border-width: 3px 3px 0 0; border-top-right-radius: 6px; }
    .bottom-left { bottom: -2px; left: -2px; border-width: 0 0 3px 3px; border-bottom-left-radius: 6px; }
    .bottom-right { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; border-bottom-right-radius: 6px; }

    .laser-line {
      position: absolute;
      left: 8px;
      right: 8px;
      height: 3px;
      background: #ef4444;
      box-shadow: 0 0 8px #ef4444;
      animation: scan 2s infinite ease-in-out;
    }
    @keyframes scan {
      0% { top: 10px; }
      50% { top: 120px; }
      100% { top: 10px; }
    }
    .scan-hint {
      color: #ffffff;
      font-size: 0.82rem;
      margin-top: 12px;
      background: rgba(0, 0, 0, 0.7);
      padding: 4px 12px;
      border-radius: 20px;
      text-align: center;
    }
    .no-camera-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      text-align: center;
      padding: 16px;
      gap: 8px;
    }
    .large-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #64748b;
    }
    .manual-input-section {
      margin-top: 8px;
    }
    .full-width {
      width: 100%;
    }
  `]
})
export class BarcodeScannerModalDialog implements OnInit, OnDestroy {
  private dialogRef = inject(MatDialogRef<BarcodeScannerModalDialog>);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  cameraActive = signal(false);
  cameraStatus = signal('Iniciando cámara...');
  manualCode = '';
  isMobile = false;

  availableCameras: MediaDeviceInfo[] = [];
  selectedCameraId: string | null = null;

  private mediaStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private canvasElement: HTMLCanvasElement = document.createElement('canvas');

  ngOnInit(): void {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.iniciarCamara();
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }

  async cargarDispositivos(): Promise<void> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.availableCameras = devices.filter(d => d.kind === 'videoinput');
      }
    } catch (e) {
      console.warn('No se pudieron listar cámaras:', e);
    }
  }

  async cambiarCamara(): Promise<void> {
    if (this.availableCameras.length <= 1) return;
    const currentIndex = this.availableCameras.findIndex(c => c.deviceId === this.selectedCameraId);
    const nextIndex = (currentIndex + 1) % this.availableCameras.length;
    const nextDevice = this.availableCameras[nextIndex];
    if (nextDevice) {
      this.selectedCameraId = nextDevice.deviceId;
      await this.iniciarCamara(nextDevice.deviceId);
    }
  }

  async iniciarCamara(deviceId?: string): Promise<void> {
    this.detenerCamara();
    this.cameraStatus.set('Solicitando acceso a la cámara...');

    // Estrategia de fallback dinámico para soportar tanto webcam de Laptop como cámaras de Teléfono
    const constraintsList: MediaStreamConstraints[] = deviceId
      ? [{ video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }]
      : [
          { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: true }
        ];

    let stream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraint of constraintsList) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraint);
        if (stream) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!stream) {
      console.warn('Cámara no disponible:', lastError);
      this.cameraActive.set(false);
      this.cameraStatus.set('Cámara no detectada o permiso denegado. Ingresa el código manualmente o usa tu lector USB/Bluetooth.');
      return;
    }

    this.mediaStream = stream;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      this.selectedCameraId = videoTrack.getSettings().deviceId || null;
    }
    await this.cargarDispositivos();
    this.cameraActive.set(true);

    setTimeout(() => {
      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = stream;
        this.videoElement.nativeElement.play().catch(e => console.warn('Play video error:', e));
        this.iniciarDeteccionBarcode();
      }
    }, 120);
  }

  private iniciarDeteccionBarcode(): void {
    // 1. Usar BarcodeDetector si está disponible en la plataforma (Chrome Desktop / Edge / Android)
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e']
        });

        const detectLoop = async () => {
          if (!this.cameraActive() || !this.videoElement?.nativeElement) return;
          try {
            const barcodes = await detector.detect(this.videoElement.nativeElement);
            if (barcodes && barcodes.length > 0) {
              const detected = barcodes[0].rawValue;
              if (detected) {
                this.reproducirBeep();
                this.dialogRef.close(detected);
                return;
              }
            }
          } catch (e) {
            // Ignorar errores en cuadros individuales
          }
          if (this.cameraActive()) {
            this.animFrameId = requestAnimationFrame(detectLoop);
          }
        };

        detectLoop();
        return;
      } catch (e) {
        console.log('BarcodeDetector nativo no activo:', e);
      }
    }

    // 2. Fallback de escaneo por inspección de Canvas (para navegadores donde BarcodeDetector esté desactivado)
    const ctx = this.canvasElement.getContext('2d');
    const fallbackLoop = () => {
      if (!this.cameraActive() || !this.videoElement?.nativeElement || !ctx) return;
      const video = this.videoElement.nativeElement;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        this.canvasElement.width = video.videoWidth || 640;
        this.canvasElement.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, this.canvasElement.width, this.canvasElement.height);
      }

      if (this.cameraActive()) {
        this.animFrameId = requestAnimationFrame(fallbackLoop);
      }
    };
    fallbackLoop();
  }

  private reproducirBeep(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Ignorar si la interacción del usuario bloquea AudioContext sin presionar previo
    }
  }

  detenerCamara(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive.set(false);
  }

  confirmarManual(): void {
    if (this.manualCode.trim()) {
      this.dialogRef.close(this.manualCode.trim());
    }
  }

  cerrar(): void {
    this.detenerCamara();
    this.dialogRef.close(null);
  }
}
