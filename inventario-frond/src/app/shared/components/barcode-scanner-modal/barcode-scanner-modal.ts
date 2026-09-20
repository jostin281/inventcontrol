import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

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
    MatSelectModule,
  ],
  template: `
    <div class="scanner-container">
      <div class="scanner-header">
        <h2 mat-dialog-title>
          <mat-icon color="primary">qr_code_scanner</mat-icon>
          Escanear Código
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
        <!-- Selector de Cámara si hay múltiples -->
        <div *ngIf="availableCameras.length > 1" class="camera-select-row">
          <mat-form-field appearance="outline" class="full-width compact-field">
            <mat-label>Seleccionar Cámara</mat-label>
            <mat-select [ngModel]="selectedCameraId" (ngModelChange)="onSelectCamera($event)">
              <mat-option *ngFor="let cam of availableCameras" [value]="cam.deviceId">
                {{ cam.label || 'Cámara (' + cam.deviceId.substring(0, 6) + '...)' }}
              </mat-option>
            </mat-select>
            <mat-icon matPrefix>videocam</mat-icon>
          </mat-form-field>
        </div>

        <!-- Vista previa de cámara (funciona en Laptop y Teléfonos) -->
        <div class="video-wrapper">
          <video #videoElement playsinline muted class="camera-video" [class.hidden]="!cameraActive()"></video>

          <div *ngIf="cameraActive()" class="scan-overlay">
            <div class="scan-box">
              <div class="corner top-left"></div>
              <div class="corner top-right"></div>
              <div class="corner bottom-left"></div>
              <div class="corner bottom-right"></div>
              <div class="laser-line"></div>
            </div>
            <p class="scan-hint">
              {{ isMobile ? 'Apunta la cámara del teléfono al código de barras' : 'Apunta el código de barras a la cámara' }}
            </p>
          </div>

          <div *ngIf="!cameraActive()" class="no-camera-box">
            <mat-icon class="large-icon">videocam_off</mat-icon>
            <p class="status-msg">{{ cameraStatus() }}</p>
            <button mat-flat-button color="primary" (click)="iniciarCamara()">
              <mat-icon>videocam</mat-icon> Activar Cámara
            </button>
          </div>
        </div>

        <!-- Entrada manual / Lector físico USB o Bluetooth -->
        <div class="manual-input-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Código manual o lector USB/Bluetooth</mat-label>
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
    :host {
      display: block;
      width: 100%;
    }
    .scanner-container {
      padding: 8px 12px;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
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
      gap: 6px;
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 0 !important;
      max-height: 80vh;
      overflow-x: hidden;
    }
    .camera-select-row {
      margin-bottom: -4px;
    }
    .compact-field {
      font-size: 0.85rem;
    }
    .video-wrapper {
      position: relative;
      width: 100%;
      height: clamp(200px, 38vh, 280px);
      background: #0f172a;
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
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
      background: rgba(0, 0, 0, 0.3);
      pointer-events: none;
    }
    .scan-box {
      position: relative;
      width: 240px;
      height: 140px;
      border: 1px dashed rgba(255, 255, 255, 0.4);
      border-radius: 12px;
    }
    .corner {
      position: absolute;
      width: 20px;
      height: 20px;
      border-color: #6366f1;
      border-style: solid;
    }
    .top-left { top: -2px; left: -2px; border-width: 3.5px 0 0 3.5px; border-top-left-radius: 8px; }
    .top-right { top: -2px; right: -2px; border-width: 3.5px 3.5px 0 0; border-top-right-radius: 8px; }
    .bottom-left { bottom: -2px; left: -2px; border-width: 0 0 3.5px 3.5px; border-bottom-left-radius: 8px; }
    .bottom-right { bottom: -2px; right: -2px; border-width: 0 3.5px 3.5px 0; border-bottom-right-radius: 8px; }

    .laser-line {
      position: absolute;
      left: 10px;
      right: 10px;
      height: 3px;
      background: #ef4444;
      box-shadow: 0 0 10px #ef4444;
      border-radius: 2px;
      animation: scan 2.2s infinite ease-in-out;
    }
    @keyframes scan {
      0% { top: 12px; }
      50% { top: 120px; }
      100% { top: 12px; }
    }
    .scan-hint {
      color: #ffffff;
      font-size: 0.8rem;
      font-weight: 500;
      margin-top: 14px;
      background: rgba(15, 23, 42, 0.85);
      padding: 5px 14px;
      border-radius: 20px;
      text-align: center;
      backdrop-filter: blur(4px);
    }
    .no-camera-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      text-align: center;
      padding: 20px;
      gap: 10px;
    }
    .status-msg {
      font-size: 0.85rem;
      color: #cbd5e1;
      margin: 0;
      max-width: 280px;
      line-height: 1.4;
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
    .dialog-actions {
      margin-top: 4px;
      padding: 8px 0 0 0 !important;
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

  private codeReader: BrowserMultiFormatReader | null = null;
  private isScanning = false;
  private hasScanned = false;

  ngOnInit(): void {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.initZXingReader();
    this.iniciarCamara();
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }

  private initZXingReader(): void {
    const hints = new Map<DecodeHintType, any>();
    const formats = [
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);

    this.codeReader = new BrowserMultiFormatReader(hints);
  }

  async cargarDispositivos(): Promise<void> {
    try {
      if (this.codeReader) {
        const devices = await this.codeReader.listVideoInputDevices();
        this.availableCameras = devices;
      }
    } catch (e) {
      console.warn('No se pudieron listar cámaras con ZXing:', e);
    }
  }

  async onSelectCamera(deviceId: string): Promise<void> {
    this.selectedCameraId = deviceId;
    await this.iniciarCamara(deviceId);
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

    await this.cargarDispositivos();

    // Preferir cámara trasera ('environment') en móvil si no hay deviceId específico
    let targetDeviceId = deviceId || this.selectedCameraId;
    if (!targetDeviceId && this.availableCameras.length > 0) {
      const backCam = this.availableCameras.find(
        d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera') || d.label.toLowerCase().includes('environment')
      );
      targetDeviceId = backCam ? backCam.deviceId : this.availableCameras[0].deviceId;
    }

    this.selectedCameraId = targetDeviceId || null;
    this.cameraActive.set(true);

    setTimeout(() => {
      if (!this.videoElement || !this.videoElement.nativeElement || !this.codeReader) return;
      const videoEl = this.videoElement.nativeElement;

      this.isScanning = true;
      this.hasScanned = false;

      const constraints: MediaStreamConstraints = targetDeviceId
        ? { video: { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }
        : { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } };

      this.codeReader.decodeFromConstraints(constraints, videoEl, (result, error) => {
        if (result && !this.hasScanned && this.isScanning) {
          const barcodeText = result.getText();
          if (barcodeText) {
            this.hasScanned = true;
            this.reproducirBeep();
            this.detenerCamara();
            this.dialogRef.close(barcodeText);
          }
        }
        if (error && error.name !== 'NotFoundException') {
          // Errores normales de lectura frame-by-frame se ignoran silenciosamente
        }
      }).catch(err => {
        console.warn('Error al iniciar stream de cámara ZXing:', err);
        this.cameraActive.set(false);
        this.cameraStatus.set('No se pudo acceder a la cámara. Revisa los permisos de tu navegador o aplicación.');
      });
    }, 100);
  }

  private reproducirBeep(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // Ignorar restricciones de audio
    }
  }

  detenerCamara(): void {
    this.isScanning = false;
    if (this.codeReader) {
      try {
        this.codeReader.reset();
      } catch (e) {
        // Reset silencioso
      }
    }
    this.cameraActive.set(false);
  }

  confirmarManual(): void {
    if (this.manualCode.trim()) {
      this.detenerCamara();
      this.dialogRef.close(this.manualCode.trim());
    }
  }

  cerrar(): void {
    this.detenerCamara();
    this.dialogRef.close(null);
  }
}
