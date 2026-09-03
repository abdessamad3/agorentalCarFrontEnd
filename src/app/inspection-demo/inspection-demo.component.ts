import {
  Component, ElementRef, ViewChild, AfterViewInit,
  OnDestroy, NgZone, ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface DamageMarker {
  id: number;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  label: string;
  mesh: THREE.Mesh;
}

const CAMERA_PRESETS: Record<string, { pos: [number,number,number]; target: [number,number,number] }> = {
  front:  { pos: [0, 1.2, 5],   target: [0, 0.5, 0] },
  rear:   { pos: [0, 1.2, -5],  target: [0, 0.5, 0] },
  left:   { pos: [-5, 1.2, 0],  target: [0, 0.5, 0] },
  right:  { pos: [5, 1.2, 0],   target: [0, 0.5, 0] },
  top:    { pos: [0, 6, 0.001], target: [0, 0, 0]   },
};

@Component({
  selector: 'app-inspection-demo',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="inspection-wrap">

  <!-- Header -->
  <div class="insp-header">
    <div class="d-flex align-items-center gap-2">
      <i class="bi bi-car-front-fill text-warning fs-5"></i>
      <span class="fw-bold">Inspection 3D — Dacia Logan</span>
      <span class="badge bg-warning text-dark ms-2">Démo</span>
    </div>
    <div class="d-flex align-items-center gap-2">
      <span class="text-muted small">{{ markers.length }} dommage(s) placé(s)</span>
      <button class="btn btn-sm btn-outline-danger" (click)="clearAll()" [disabled]="markers.length === 0">
        <i class="bi bi-trash3"></i> Tout effacer
      </button>
    </div>
  </div>

  <!-- Main layout -->
  <div class="insp-body">

    <!-- 3D viewer -->
    <div class="viewer-col">
      <div class="viewer-wrap" [class.picking]="pickMode">
        <canvas #canvas></canvas>

        <!-- Loading overlay -->
        <div class="viewer-overlay" *ngIf="loading">
          <div class="text-center text-white">
            <div class="spinner-border text-warning mb-3" role="status"></div>
            <div class="fw-semibold">Chargement du modèle 3D…</div>
            <div class="text-muted small mt-1">{{ loadPercent }}%</div>
          </div>
        </div>

        <!-- Error overlay -->
        <div class="viewer-overlay" *ngIf="loadError">
          <div class="text-center text-white">
            <i class="bi bi-exclamation-triangle-fill text-danger fs-1 mb-3 d-block"></i>
            <div class="fw-semibold mb-2">Impossible de charger le modèle</div>
            <button class="btn btn-sm btn-warning" (click)="loadModel()">
              <i class="bi bi-arrow-clockwise"></i> Réessayer
            </button>
          </div>
        </div>

        <!-- Pick mode instruction -->
        <div class="pick-hint" *ngIf="pickMode">
          <i class="bi bi-cursor-fill"></i>
          Cliquez sur le véhicule pour placer un dommage
          <button class="btn btn-sm btn-outline-light ms-3" (click)="cancelPick()">Annuler</button>
        </div>

        <!-- Viewer controls -->
        <div class="viewer-controls" *ngIf="!loading && !loadError">
          <button class="ctrl-btn" title="Réinitialiser caméra" (click)="resetCamera()">
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
          <button class="ctrl-btn" title="Zoom +" (click)="zoom(0.8)">
            <i class="bi bi-plus-lg"></i>
          </button>
          <button class="ctrl-btn" title="Zoom -" (click)="zoom(1.25)">
            <i class="bi bi-dash-lg"></i>
          </button>
          <button class="ctrl-btn" title="Plein écran" (click)="toggleFullscreen()">
            <i class="bi bi-fullscreen"></i>
          </button>
        </div>
      </div>

      <!-- View presets -->
      <div class="view-bar" *ngIf="!loading && !loadError">
        <span class="text-muted small me-2">Vue :</span>
        <button *ngFor="let v of viewKeys" class="view-btn"
                [class.active]="activeView === v"
                (click)="setView(v)">
          {{ viewLabel(v) }}
        </button>
      </div>
    </div>

    <!-- Damage panel -->
    <div class="panel-col">
      <div class="panel-header">
        <span class="fw-semibold">Dommages</span>
        <button class="btn btn-sm btn-warning" (click)="startPick()" [disabled]="pickMode || loading">
          <i class="bi bi-plus-lg"></i> Ajouter
        </button>
      </div>

      <div class="panel-body">

        <!-- Empty state -->
        <div *ngIf="markers.length === 0" class="empty-state">
          <i class="bi bi-shield-check fs-1 text-success d-block mb-2"></i>
          <div class="fw-semibold">Aucun dommage</div>
          <div class="text-muted small">Cliquez sur « Ajouter » puis<br>cliquez sur le véhicule</div>
        </div>

        <!-- Marker list -->
        <div *ngFor="let m of markers; let i = index"
             class="marker-item"
             [class.selected]="selectedId === m.id"
             (click)="selectMarker(m)">
          <div class="marker-dot">{{ i + 1 }}</div>
          <div class="marker-info">
            <div class="fw-semibold small">Dommage #{{ m.id }}</div>
            <div class="text-muted" style="font-size:11px">
              x={{ m.position.x.toFixed(3) }}
              y={{ m.position.y.toFixed(3) }}
              z={{ m.position.z.toFixed(3) }}
            </div>
          </div>
          <button class="btn btn-sm btn-link text-danger p-0 ms-auto"
                  (click)="$event.stopPropagation(); removeMarker(m.id)">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

      </div>

      <!-- Selected detail -->
      <div class="marker-detail" *ngIf="selectedMarker">
        <div class="detail-title">
          <i class="bi bi-geo-alt-fill text-danger me-1"></i>
          Dommage #{{ selectedMarker.id }}
        </div>
        <table class="table table-sm table-borderless mb-0 small">
          <tbody>
            <tr><td class="text-muted">Position X</td><td class="fw-semibold font-monospace">{{ selectedMarker.position.x.toFixed(4) }}</td></tr>
            <tr><td class="text-muted">Position Y</td><td class="fw-semibold font-monospace">{{ selectedMarker.position.y.toFixed(4) }}</td></tr>
            <tr><td class="text-muted">Position Z</td><td class="fw-semibold font-monospace">{{ selectedMarker.position.z.toFixed(4) }}</td></tr>
            <tr><td class="text-muted">Normal X</td><td class="fw-semibold font-monospace">{{ selectedMarker.normal.x.toFixed(4) }}</td></tr>
            <tr><td class="text-muted">Normal Y</td><td class="fw-semibold font-monospace">{{ selectedMarker.normal.y.toFixed(4) }}</td></tr>
            <tr><td class="text-muted">Normal Z</td><td class="fw-semibold font-monospace">{{ selectedMarker.normal.z.toFixed(4) }}</td></tr>
          </tbody>
        </table>
        <div class="text-muted" style="font-size:10px">
          Ces coordonnées seront sauvegardées en base de données.<br>
          Le marqueur restera à cet endroit exact après rotation.
        </div>
      </div>

    </div>
  </div>
</div>
  `,
  styles: [`
.inspection-wrap {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  background: #0f1623;
  color: #e2e8f0;
  font-family: 'Inter', system-ui, sans-serif;
}
.insp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #1a2744;
  border-bottom: 1px solid rgba(245,158,11,.2);
  flex-shrink: 0;
}
.insp-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.viewer-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.viewer-wrap {
  flex: 1;
  position: relative;
  background: #0a0f1e;
  overflow: hidden;
}
.viewer-wrap.picking { cursor: crosshair; }
canvas { width: 100% !important; height: 100% !important; display: block; }

.viewer-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(10,15,30,.85);
  z-index: 10;
}
.pick-hint {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  background: rgba(245,158,11,.92);
  color: #0f1623;
  font-weight: 600;
  font-size: 13px;
  padding: 8px 18px;
  border-radius: 999px;
  display: flex; align-items: center; gap: 8px;
  z-index: 20;
  white-space: nowrap;
}
.viewer-controls {
  position: absolute; bottom: 14px; left: 14px;
  display: flex; flex-direction: column; gap: 6px;
  z-index: 10;
}
.ctrl-btn {
  width: 36px; height: 36px;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(26,39,68,.85);
  color: #e2e8f0;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 14px;
  transition: all .18s;
}
.ctrl-btn:hover { background: rgba(245,158,11,.25); border-color: rgba(245,158,11,.5); color: #f59e0b; }

.view-bar {
  display: flex; align-items: center;
  padding: 8px 14px;
  background: #131d35;
  border-top: 1px solid rgba(255,255,255,.06);
  gap: 4px;
  flex-shrink: 0;
}
.view-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,.12);
  background: transparent;
  color: #94a3b8;
  font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all .15s;
}
.view-btn:hover { background: rgba(245,158,11,.15); color: #f59e0b; border-color: rgba(245,158,11,.4); }
.view-btn.active { background: rgba(245,158,11,.2); color: #f59e0b; border-color: #f59e0b; }

.panel-col {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255,255,255,.07);
  background: #111827;
  overflow: hidden;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
}
.panel-body { flex: 1; overflow-y: auto; padding: 8px; }

.empty-state {
  text-align: center;
  padding: 40px 16px;
}
.marker-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all .15s;
}
.marker-item:hover { background: rgba(255,255,255,.05); }
.marker-item.selected { background: rgba(245,158,11,.1); border-color: rgba(245,158,11,.4); }
.marker-dot {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700;
  flex-shrink: 0;
}
.marker-info { flex: 1; min-width: 0; }

.marker-detail {
  padding: 14px 16px;
  border-top: 1px solid rgba(255,255,255,.07);
  background: #0f1623;
  flex-shrink: 0;
}
.detail-title {
  font-weight: 700; margin-bottom: 10px; font-size: 14px;
}
  `]
})
export class InspectionDemoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  loading    = true;
  loadError  = false;
  loadPercent = 0;
  pickMode   = false;
  markers: DamageMarker[] = [];
  selectedId: number | null = null;
  activeView = 'front';
  viewKeys   = Object.keys(CAMERA_PRESETS);
  private nextId = 1;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer   = new THREE.Vector2();
  private carMeshes: THREE.Object3D[] = [];
  private animId   = 0;
  private resizeObs!: ResizeObserver;

  constructor(private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  get selectedMarker() {
    return this.markers.find(m => m.id === this.selectedId) ?? null;
  }

  ngAfterViewInit() {
    this.initScene();
    this.loadModel();
    this.startLoop();
    this.watchResize();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.resizeObs?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
    this.scene?.clear();
  }

  private initScene() {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1e);
    this.scene.fog = new THREE.FogExp2(0x0a0f1e, 0.025);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 1.2, 5);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(5, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x8ab4f8, 0.6);
    fill.position.set(-5, 3, -5);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xfbbf24, 0.4);
    rim.position.set(0, -2, -6);
    this.scene.add(rim);

    // Ground grid
    const grid = new THREE.GridHelper(20, 30, 0x1e3a5f, 0x1e3a5f);
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);

    // Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance   = 1.5;
    this.controls.maxDistance   = 15;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    this.controls.target.set(0, 0.5, 0);
    this.controls.update();

    // Click handler
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
  }

  loadModel() {
    this.loading   = true;
    this.loadError = false;
    this.loadPercent = 0;
    this.carMeshes = [];

    const loader = new GLTFLoader();
    loader.load(
      '/assets/models/dacia_logan.glb',
      (gltf) => {
        const model = gltf.scene;

        // Center model
        const box    = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 3.5 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += size.y * scale * 0.5 - box.min.y * scale;

        model.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
            this.carMeshes.push(child);
          }
        });

        this.scene.add(model);
        this.loading = false;
        this.ngZone.run(() => this.cdr.markForCheck());
      },
      (progress) => {
        if (progress.total > 0) {
          this.loadPercent = Math.round((progress.loaded / progress.total) * 100);
          this.ngZone.run(() => this.cdr.markForCheck());
        }
      },
      (_err) => {
        this.loading   = false;
        this.loadError = true;
        this.ngZone.run(() => this.cdr.markForCheck());
      }
    );
  }

  private startLoop() {
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        this.animId = requestAnimationFrame(loop);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };
      loop();
    });
  }

  private watchResize() {
    this.resizeObs = new ResizeObserver(() => {
      const canvas = this.canvasRef.nativeElement;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    });
    this.resizeObs.observe(this.canvasRef.nativeElement.parentElement!);
  }

  private onPointerDown(event: PointerEvent) {
    if (!this.pickMode) return;

    const canvas  = this.canvasRef.nativeElement;
    const rect    = canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.carMeshes, true);
    if (!hits.length) return;

    const hit = hits[0];
    this.pickMode = false;
    this.ngZone.run(() => this.addMarker(hit));
  }

  private addMarker(hit: THREE.Intersection) {
    const pos    = hit.point.clone();
    const normal = hit.face ? hit.face.normal.clone().transformDirection(
      (hit.object as THREE.Mesh).matrixWorld
    ) : new THREE.Vector3(0, 1, 0);

    // Sphere marker
    const geo  = new THREE.SphereGeometry(0.06, 16, 16);
    const mat  = new THREE.MeshStandardMaterial({
      color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.4,
      roughness: 0.3, metalness: 0.1
    });
    const mesh = new THREE.Mesh(geo, mat);
    // Offset slightly along normal to sit above surface
    mesh.position.copy(pos).addScaledVector(normal, 0.04);
    this.scene.add(mesh);

    const marker: DamageMarker = { id: this.nextId++, position: pos, normal, label: '', mesh };
    this.markers = [...this.markers, marker];
    this.selectedId = marker.id;
    this.cdr.markForCheck();
  }

  removeMarker(id: number) {
    const m = this.markers.find(x => x.id === id);
    if (m) { this.scene.remove(m.mesh); m.mesh.geometry.dispose(); }
    this.markers = this.markers.filter(x => x.id !== id);
    if (this.selectedId === id) this.selectedId = null;
    this.cdr.markForCheck();
  }

  clearAll() {
    this.markers.forEach(m => { this.scene.remove(m.mesh); m.mesh.geometry.dispose(); });
    this.markers    = [];
    this.selectedId = null;
    this.cdr.markForCheck();
  }

  selectMarker(m: DamageMarker) {
    this.selectedId = m.id;
    // Animate camera toward marker
    const target = m.position.clone().addScaledVector(m.normal, 2.5);
    this.controls.target.copy(m.position);
    this.camera.position.copy(target);
    this.controls.update();
    this.cdr.markForCheck();
  }

  startPick()  { this.pickMode = true;  this.cdr.markForCheck(); }
  cancelPick() { this.pickMode = false; this.cdr.markForCheck(); }

  setView(key: string) {
    this.activeView = key;
    const p = CAMERA_PRESETS[key];
    this.camera.position.set(...p.pos);
    this.controls.target.set(...p.target);
    this.controls.update();
  }

  viewLabel(v: string): string {
    return { front:'Avant', rear:'Arrière', left:'Gauche', right:'Droite', top:'Dessus' }[v] ?? v;
  }

  resetCamera() { this.setView('front'); }

  zoom(factor: number) {
    const dir = this.camera.position.clone().sub(this.controls.target);
    dir.multiplyScalar(factor);
    this.camera.position.copy(this.controls.target).add(dir);
    this.controls.update();
  }

  toggleFullscreen() {
    const el = this.canvasRef.nativeElement.parentElement!;
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
  }
}
