import {
  Component, ElementRef, ViewChild, AfterViewInit, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, OnDestroy, NgZone, ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { environment } from '../../environments/environment';

// ── Interfaces ─────────────────────────────────────────────────────────────

interface DamageMarker {
  id:            number;
  dbId:          number | null;
  position:      THREE.Vector3;
  normal:        THREE.Vector3;
  zone:          string;
  severity:      string;
  status:        'open' | 'repaired';
  description:   string | null;
  estimatedCost: string | null;
  mesh:          THREE.Mesh;
  source:        string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const ZONE_LABELS: Record<string, string> = {
  front_bumper:  'Pare-choc avant',
  hood:          'Capot',
  windshield:    'Pare-brise',
  roof:          'Toit',
  rear_window:   'Lunette arrière',
  trunk:         'Coffre',
  rear_bumper:   'Pare-choc arrière',
  fl_fender:     'Aile av. gauche',
  fr_fender:     'Aile av. droite',
  rl_fender:     'Aile ar. gauche',
  rr_fender:     'Aile ar. droite',
  fl_door:       'Portière av. gauche',
  fr_door:       'Portière av. droite',
  rl_door:       'Portière ar. gauche',
  rr_door:       'Portière ar. droite',
  left_mirror:   'Rétroviseur gauche',
  right_mirror:  'Rétroviseur droit',
  fl_wheel:      'Roue av. gauche',
  fr_wheel:      'Roue av. droite',
  rl_wheel:      'Roue ar. gauche',
  rr_wheel:      'Roue ar. droite',
};

const SEVERITY_LABELS: Record<string, string> = {
  scratch: 'Rayure',
  dent:    'Bosse',
  crack:   'Fissure',
  broken:  'Cassé',
};

const SEVERITY_COLORS: Record<string, number> = {
  scratch: 0xf59e0b,
  dent:    0xf97316,
  crack:   0xef4444,
  broken:  0x991b1b,
};

const SEVERITY_CSS: Record<string, string> = {
  scratch: '#f59e0b',
  dent:    '#f97316',
  crack:   '#ef4444',
  broken:  '#991b1b',
};

// Approximate 3D positions for each zone on the scaled Dacia Logan model
// Model length ~3.5 units along Z (front = +Z), width ~1.4 along X, height ~1.25 along Y (bottom at y=0)
const ZONE_POSITIONS: Record<string, [number, number, number]> = {
  front_bumper:  [ 0,     0.30,   1.75],
  hood:          [ 0,     0.95,   0.90],
  windshield:    [ 0,     1.15,   0.30],
  roof:          [ 0,     1.30,  -0.10],
  rear_window:   [ 0,     1.15,  -0.60],
  trunk:         [ 0,     0.90,  -1.10],
  rear_bumper:   [ 0,     0.30,  -1.75],
  fl_fender:     [-0.72,  0.80,   1.10],
  fr_fender:     [ 0.72,  0.80,   1.10],
  rl_fender:     [-0.72,  0.80,  -1.10],
  rr_fender:     [ 0.72,  0.80,  -1.10],
  fl_door:       [-0.78,  0.65,   0.25],
  fr_door:       [ 0.78,  0.65,   0.25],
  rl_door:       [-0.78,  0.65,  -0.55],
  rr_door:       [ 0.78,  0.65,  -0.55],
  left_mirror:   [-0.92,  0.95,   0.45],
  right_mirror:  [ 0.92,  0.95,   0.45],
  fl_wheel:      [-0.80,  0.22,   1.00],
  fr_wheel:      [ 0.80,  0.22,   1.00],
  rl_wheel:      [-0.80,  0.22,  -0.90],
  rr_wheel:      [ 0.80,  0.22,  -0.90],
};

const CAMERA_PRESETS: Record<string, { pos: [number,number,number]; target: [number,number,number] }> = {
  front:  { pos: [0, 1.2,  5],   target: [0, 0.5, 0] },
  rear:   { pos: [0, 1.2, -5],   target: [0, 0.5, 0] },
  left:   { pos: [-5, 1.2, 0],   target: [0, 0.5, 0] },
  right:  { pos: [5, 1.2, 0],    target: [0, 0.5, 0] },
  top:    { pos: [0, 6, 0.001],  target: [0, 0, 0]   },
};

const ALLOWED_ZONES = Object.keys(ZONE_POSITIONS);

// ── Component ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-inspection-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="inspection-wrap" [class.embedded]="embedded">

  <!-- ── Header ── -->
  <div class="insp-header">
    <div class="header-left">
      <i class="bi bi-car-front-fill text-warning fs-5"></i>
      <span class="fw-bold">Inspection 3D</span>

      <!-- Car selector (hidden when voitureId provided via @Input) -->
      <select *ngIf="!embedded" class="car-select" [(ngModel)]="selectedVoitureId" (ngModelChange)="onCarChange()" [disabled]="loadingCars">
        <option [ngValue]="null">{{ loadingCars ? 'Chargement…' : '— Sélectionner un véhicule —' }}</option>
        <option *ngFor="let v of voitures" [ngValue]="v.id">
          {{ v.marque }} {{ v.modele }} — {{ v.immatriculation }}
        </option>
      </select>
    </div>

    <div class="header-right" *ngIf="selectedVoitureId">
      <span class="stat-pill open">{{ openCount }} ouvert{{ openCount !== 1 ? 's' : '' }}</span>
      <span class="stat-pill repaired">{{ repairedCount }} réparé{{ repairedCount !== 1 ? 's' : '' }}</span>
    </div>
  </div>

  <!-- ── No car selected ── -->
  <div class="no-car" *ngIf="!selectedVoitureId">
    <i class="bi bi-car-front fs-1 mb-3 d-block" style="color:#f59e0b"></i>
    <div class="fw-semibold mb-1">Sélectionnez un véhicule</div>
    <div class="text-muted small">Choisissez un véhicule dans la liste pour afficher son inspection 3D</div>
  </div>

  <!-- ── Main body ── -->
  <div class="insp-body" *ngIf="selectedVoitureId">

    <!-- 3D viewer -->
    <div class="viewer-col">
      <div class="viewer-wrap" [class.picking]="pickMode">
        <canvas #canvas></canvas>

        <!-- Loading model overlay -->
        <div class="viewer-overlay" *ngIf="loading">
          <div class="text-center text-white">
            <div class="spinner-border text-warning mb-3" role="status"></div>
            <div class="fw-semibold">Chargement du modèle 3D…</div>
            <div class="text-muted small mt-1">{{ loadPercent }}%</div>
          </div>
        </div>

        <!-- Loading damages overlay -->
        <div class="viewer-overlay semi" *ngIf="!loading && loadingDamages">
          <div class="text-center text-white">
            <div class="spinner-border spinner-border-sm text-warning mb-2" role="status"></div>
            <div class="small">Chargement des dommages…</div>
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

        <!-- Pick mode hint -->
        <div class="pick-hint" *ngIf="pickMode">
          <i class="bi bi-cursor-fill"></i>
          Cliquez sur le véhicule pour placer un dommage
          <button class="btn btn-sm btn-outline-light ms-3" (click)="cancelPick()">Annuler</button>
        </div>

        <!-- Viewer controls -->
        <div class="viewer-controls" *ngIf="!loading && !loadError">
          <button class="ctrl-btn" title="Réinitialiser" (click)="resetCamera()">
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

        <!-- Legend -->
        <div class="legend" *ngIf="!loading && !loadError && markers.length > 0">
          <div class="legend-item"><span class="dot" style="background:#f59e0b"></span>Rayure</div>
          <div class="legend-item"><span class="dot" style="background:#f97316"></span>Bosse</div>
          <div class="legend-item"><span class="dot" style="background:#ef4444"></span>Fissure</div>
          <div class="legend-item"><span class="dot" style="background:#991b1b"></span>Cassé</div>
          <div class="legend-item"><span class="dot" style="background:#22c55e"></span>Réparé</div>
        </div>
      </div>

      <!-- View presets -->
      <div class="view-bar" *ngIf="!loading && !loadError">
        <span class="text-muted small me-2">Vue :</span>
        <button *ngFor="let v of viewKeys" class="view-btn" [class.active]="activeView === v" (click)="setView(v)">
          {{ viewLabel(v) }}
        </button>
      </div>
    </div>

    <!-- ── Side panel ── -->
    <div class="panel-col">

      <!-- Panel header -->
      <div class="panel-header">
        <span class="fw-semibold">Dommages</span>
        <button class="btn btn-sm btn-warning" (click)="startPick()" [disabled]="pickMode || loading">
          <i class="bi bi-plus-lg"></i> Ajouter
        </button>
      </div>

      <!-- Filter tabs -->
      <div class="filter-tabs" *ngIf="markers.length > 0">
        <button class="ftab" [class.active]="filterMode === 'all'"      (click)="filterMode = 'all'">Tous ({{ markers.length }})</button>
        <button class="ftab" [class.active]="filterMode === 'open'"     (click)="filterMode = 'open'">Ouverts ({{ openCount }})</button>
        <button class="ftab" [class.active]="filterMode === 'repaired'" (click)="filterMode = 'repaired'">Réparés ({{ repairedCount }})</button>
      </div>

      <!-- Damage list -->
      <div class="panel-body">

        <!-- Empty state -->
        <div *ngIf="filteredMarkers.length === 0 && !loadingDamages" class="empty-state">
          <i class="bi bi-shield-check fs-1 text-success d-block mb-2"></i>
          <div class="fw-semibold">Aucun dommage{{ filterMode !== 'all' ? ' ' + (filterMode === 'open' ? 'ouvert' : 'réparé') : '' }}</div>
          <div class="text-muted small" *ngIf="filterMode === 'all'">
            Cliquez sur « Ajouter » puis<br>cliquez sur le véhicule
          </div>
        </div>

        <!-- Marker list -->
        <div *ngFor="let m of filteredMarkers; let i = index"
             class="marker-item"
             [class.selected]="selectedId === m.id"
             (click)="selectMarker(m)">
          <div class="marker-dot"
               [style.background]="m.status === 'repaired' ? '#22c55e' : severityCss(m.severity)">
            {{ i + 1 }}
          </div>
          <div class="marker-info">
            <div class="fw-semibold small">{{ zoneLabel(m.zone) }}</div>
            <div class="d-flex align-items-center gap-1 mt-1">
              <span class="sev-badge" [style.background]="m.status === 'repaired' ? '#22c55e22' : severityCss(m.severity) + '22'"
                    [style.color]="m.status === 'repaired' ? '#22c55e' : severityCss(m.severity)">
                {{ m.status === 'repaired' ? 'Réparé' : severityLabel(m.severity) }}
              </span>
              <span *ngIf="m.estimatedCost" class="text-muted" style="font-size:10px">
                {{ m.estimatedCost | number:'1.0-0' }} MAD
              </span>
            </div>
          </div>
          <i *ngIf="m.status === 'repaired'" class="bi bi-check-circle-fill text-success ms-auto"></i>
          <i *ngIf="m.status === 'open'" class="bi bi-exclamation-circle text-warning ms-auto"></i>
        </div>

      </div>

      <!-- Selected detail -->
      <div class="marker-detail" *ngIf="selectedMarker">
        <div class="detail-title">
          <i class="bi bi-geo-alt-fill me-1" [style.color]="selectedMarker.status === 'repaired' ? '#22c55e' : severityCss(selectedMarker.severity)"></i>
          {{ zoneLabel(selectedMarker.zone) }}
        </div>

        <div class="detail-row">
          <span class="detail-label">Sévérité</span>
          <span class="sev-badge"
                [style.background]="severityCss(selectedMarker.severity) + '22'"
                [style.color]="severityCss(selectedMarker.severity)">
            {{ severityLabel(selectedMarker.severity) }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Statut</span>
          <span [style.color]="selectedMarker.status === 'repaired' ? '#22c55e' : '#f59e0b'">
            {{ selectedMarker.status === 'repaired' ? 'Réparé' : 'Ouvert' }}
          </span>
        </div>
        <div class="detail-row" *ngIf="selectedMarker.estimatedCost">
          <span class="detail-label">Coût estimé</span>
          <span class="fw-semibold">{{ selectedMarker.estimatedCost | number:'1.0-2' }} MAD</span>
        </div>
        <div class="detail-row" *ngIf="selectedMarker.description">
          <span class="detail-label">Description</span>
          <span class="text-muted small">{{ selectedMarker.description }}</span>
        </div>
        <div class="detail-row" *ngIf="!selectedMarker.dbId">
          <span class="text-muted small fst-italic">Dommage local (non sauvegardé)</span>
        </div>
        <!-- Pre-existing label -->
        <div class="detail-row" *ngIf="selectedMarker.source === 'pre_existing'" style="margin-top:.5rem">
          <span style="background:#6b7280;color:#fff;font-size:.72rem;padding:.2rem .55rem;border-radius:99px">
            🔒 Avant location
          </span>
        </div>

        <!-- Repair button (not for pre_existing) -->
        <button *ngIf="selectedMarker.status === 'open' && selectedMarker.dbId && selectedMarker.source !== 'pre_existing'"
                class="btn btn-sm btn-success w-100 mt-2"
                [disabled]="repairingId === selectedMarker.id"
                (click)="markRepaired(selectedMarker)">
          <span *ngIf="repairingId !== selectedMarker.id">
            <i class="bi bi-tools me-1"></i>Marquer comme réparé
          </span>
          <span *ngIf="repairingId === selectedMarker.id">
            <span class="spinner-border spinner-border-sm me-1"></span>En cours…
          </span>
        </button>

        <!-- Remove local marker (no dbId) -->
        <button *ngIf="!selectedMarker.dbId"
                class="btn btn-sm btn-outline-danger w-100 mt-2"
                (click)="removeMarker(selectedMarker.id)">
          <i class="bi bi-trash3 me-1"></i>Supprimer
        </button>
      </div>

    </div>
  </div>

  <!-- ── Damage form overlay ── -->
  <div class="dmg-form-overlay" *ngIf="showDamageForm" (click)="onOverlayClick($event)">
    <div class="dmg-form" (click)="$event.stopPropagation()">
      <div class="dmg-form-title">
        <i class="bi bi-plus-circle-fill text-warning me-2"></i>
        Nouveau dommage
      </div>

      <div class="form-group-row">
        <label class="form-lbl">Zone</label>
        <select class="form-ctrl" [(ngModel)]="formZone">
          <option *ngFor="let z of allowedZones" [value]="z">{{ zoneLabel(z) }}</option>
        </select>
      </div>

      <div class="form-group-row">
        <label class="form-lbl">Sévérité</label>
        <div class="sev-buttons">
          <button *ngFor="let s of severities" class="sev-opt" [class.active]="formSeverity === s"
                  [style.--sev-color]="severityCss(s)" (click)="formSeverity = s">
            {{ severityLabel(s) }}
          </button>
        </div>
      </div>

      <div class="form-group-row">
        <label class="form-lbl">Description</label>
        <input class="form-ctrl" type="text" [(ngModel)]="formDescription" placeholder="Optionnel…">
      </div>

      <div class="form-group-row">
        <label class="form-lbl">Coût estimé (MAD)</label>
        <input class="form-ctrl" type="number" [(ngModel)]="formCost" placeholder="0" min="0">
      </div>

      <div class="dmg-form-actions">
        <button class="btn btn-secondary btn-sm" (click)="cancelDamage()" [disabled]="savingDamage">Annuler</button>
        <button class="btn btn-warning btn-sm" (click)="confirmDamage()" [disabled]="savingDamage || !formZone">
          <span *ngIf="!savingDamage"><i class="bi bi-floppy me-1"></i>Enregistrer</span>
          <span *ngIf="savingDamage"><span class="spinner-border spinner-border-sm me-1"></span>Enregistrement…</span>
        </button>
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
  position: relative;
}

/* ── Header ── */
.insp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  background: #1a2744;
  border-bottom: 1px solid rgba(245,158,11,.2);
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.car-select {
  background: #0f1623;
  border: 1px solid rgba(255,255,255,.15);
  color: #e2e8f0;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 13px;
  max-width: 280px;
}
.car-select:focus { outline: none; border-color: #f59e0b; }

.stat-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
}
.stat-pill.open     { background: rgba(245,158,11,.15); color: #f59e0b; }
.stat-pill.repaired { background: rgba(34,197,94,.15);  color: #22c55e; }

/* ── No car ── */
.no-car {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

/* ── Main body ── */
.insp-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
.viewer-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
.viewer-wrap {
  flex: 1;
  position: relative;
  background: #0a0f1e;
  overflow: hidden;
  min-height: 0;
}
.viewer-wrap.picking { cursor: crosshair; }
canvas { width: 100% !important; height: 100% !important; display: block; }

.viewer-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(10,15,30,.85);
  z-index: 10;
}
.viewer-overlay.semi { background: rgba(10,15,30,.5); }

.pick-hint {
  position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
  background: rgba(245,158,11,.92);
  color: #0f1623;
  font-weight: 600; font-size: 12px;
  padding: 6px 14px; border-radius: 999px;
  display: flex; align-items: center; gap: 8px;
  z-index: 20; white-space: nowrap; max-width: 90%;
}

.viewer-controls {
  position: absolute; bottom: 10px; left: 10px;
  display: flex; flex-direction: column; gap: 5px; z-index: 10;
}
.ctrl-btn {
  width: 34px; height: 34px;
  border: 1px solid rgba(255,255,255,.15);
  background: rgba(26,39,68,.85); color: #e2e8f0;
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 14px; transition: all .18s;
}
.ctrl-btn:hover { background: rgba(245,158,11,.25); border-color: rgba(245,158,11,.5); color: #f59e0b; }

.legend {
  position: absolute; bottom: 10px; right: 10px;
  background: rgba(10,15,30,.8); border-radius: 8px;
  padding: 6px 10px; display: flex; flex-direction: column; gap: 3px; z-index: 10;
}
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #94a3b8; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

.view-bar {
  display: flex; align-items: center; flex-wrap: wrap;
  padding: 6px 10px; background: #131d35;
  border-top: 1px solid rgba(255,255,255,.06); gap: 4px; flex-shrink: 0;
}
.view-btn {
  padding: 3px 10px; border-radius: 6px;
  border: 1px solid rgba(255,255,255,.12); background: transparent;
  color: #94a3b8; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .15s;
}
.view-btn:hover  { background: rgba(245,158,11,.15); color: #f59e0b; border-color: rgba(245,158,11,.4); }
.view-btn.active { background: rgba(245,158,11,.2);  color: #f59e0b; border-color: #f59e0b; }

/* ── Panel ── */
.panel-col {
  width: 300px; flex-shrink: 0;
  display: flex; flex-direction: column;
  border-left: 1px solid rgba(255,255,255,.07);
  background: #111827; overflow: hidden;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,.07); flex-shrink: 0;
}
.filter-tabs {
  display: flex; border-bottom: 1px solid rgba(255,255,255,.07); flex-shrink: 0;
}
.ftab {
  flex: 1; padding: 6px 4px; font-size: 11px; font-weight: 600;
  background: transparent; border: none; color: #64748b; cursor: pointer; transition: all .15s;
  border-bottom: 2px solid transparent;
}
.ftab:hover { color: #e2e8f0; }
.ftab.active { color: #f59e0b; border-bottom-color: #f59e0b; }

.panel-body { flex: 1; overflow-y: auto; padding: 8px; }

.empty-state { text-align: center; padding: 24px 16px; }
.marker-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 8px;
  border: 1px solid transparent; margin-bottom: 4px;
  cursor: pointer; transition: all .15s;
}
.marker-item:hover    { background: rgba(255,255,255,.05); }
.marker-item.selected { background: rgba(245,158,11,.1); border-color: rgba(245,158,11,.4); }
.marker-dot {
  width: 24px; height: 24px; border-radius: 50%;
  color: white; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.marker-info { flex: 1; min-width: 0; }
.sev-badge {
  font-size: 10px; font-weight: 700; padding: 1px 7px;
  border-radius: 999px; display: inline-block;
}

.marker-detail {
  padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,.07);
  background: #0f1623; flex-shrink: 0;
}
.detail-title { font-weight: 700; margin-bottom: 8px; font-size: 13px; }
.detail-row {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 8px; margin-bottom: 5px; font-size: 12px;
}
.detail-label { color: #64748b; flex-shrink: 0; }

/* ── Damage form overlay ── */
.dmg-form-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
}
.dmg-form {
  background: #1a2744;
  border: 1px solid rgba(245,158,11,.3);
  border-radius: 14px; padding: 20px;
  width: 320px; max-width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
}
.dmg-form-title { font-weight: 700; font-size: 14px; margin-bottom: 14px; }
.form-group-row { margin-bottom: 12px; }
.form-lbl { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.form-ctrl {
  width: 100%; background: #0f1623; border: 1px solid rgba(255,255,255,.12);
  color: #e2e8f0; border-radius: 8px; padding: 6px 10px; font-size: 13px;
}
.form-ctrl:focus { outline: none; border-color: #f59e0b; }

.sev-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
.sev-opt {
  padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;
  border: 1px solid rgba(255,255,255,.12); background: transparent; color: #94a3b8; transition: all .15s;
}
.sev-opt.active, .sev-opt:hover {
  background: color-mix(in srgb, var(--sev-color) 20%, transparent);
  color: var(--sev-color);
  border-color: var(--sev-color);
}

.dmg-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

/* ── Embedded in a tab ── */
.inspection-wrap.embedded {
  height: max(480px, calc(100vh - 300px));
}

/* ── Tablet ── */
@media (max-width: 1024px) and (min-width: 641px) {
  .panel-col { width: 240px; }
  .inspection-wrap { height: calc(100vh - 60px); }
  .car-select { max-width: 200px; }
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .inspection-wrap { height: calc(100dvh - 60px); }
  .insp-body { flex-direction: column; }
  .viewer-col { flex: none; height: 55%; }
  .panel-col {
    width: 100%; border-left: none;
    border-top: 1px solid rgba(255,255,255,.1);
    height: 45%; flex-shrink: 0;
  }
  .insp-header { padding: 8px 12px; }
  .car-select { max-width: 160px; font-size: 12px; }
  .stat-pill { display: none; }
  .legend { display: none; }
  .empty-state { padding: 12px 16px; }
  .empty-state .fs-1 { font-size: 1.5rem !important; }
}
  `]
})
export class InspectionDemoComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  /** When provided, auto-selects this car and hides the car selector */
  @Input() voitureId: number | null = null;
  /** When true, uses compact height suitable for embedding in a tab */
  @Input() embedded = false;
  /** Pre-existing damages to show as grey spheres (read-only) */
  @Input() preExistingDamages: any[] = [];
  /** Emits each new damage record saved via the 3D form */
  @Output() newDamageAdded = new EventEmitter<any>();

  // Model state
  loading      = true;
  loadError    = false;
  loadPercent  = 0;

  // Car selection
  voitures:         any[]    = [];
  loadingCars       = false;
  selectedVoitureId: number | null = null;
  loadingDamages    = false;

  // Interaction
  pickMode   = false;
  markers:   DamageMarker[] = [];
  selectedId: number | null = null;
  filterMode: 'all' | 'open' | 'repaired' = 'all';
  repairingId: number | null = null;

  // Camera
  activeView = 'front';
  viewKeys   = Object.keys(CAMERA_PRESETS);

  // Damage form
  showDamageForm  = false;
  pendingHit:      THREE.Intersection | null = null;
  formZone        = '';
  formSeverity    = 'scratch';
  formDescription = '';
  formCost        = '';
  savingDamage    = false;

  readonly allowedZones  = ALLOWED_ZONES;
  readonly severities    = ['scratch', 'dent', 'crack', 'broken'];

  private nextId   = 1;
  private renderer!: THREE.WebGLRenderer;
  private scene!:    THREE.Scene;
  private camera!:   THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private raycaster  = new THREE.Raycaster();
  private pointer    = new THREE.Vector2();
  private carMeshes: THREE.Object3D[] = [];
  private animId     = 0;
  private resizeObs!: ResizeObserver;

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
  ) {}

  // ── Computed ─────────────────────────────────────────────────────────────

  get selectedMarker(): DamageMarker | null {
    return this.markers.find(m => m.id === this.selectedId) ?? null;
  }

  get filteredMarkers(): DamageMarker[] {
    if (this.filterMode === 'open')     return this.markers.filter(m => m.status === 'open');
    if (this.filterMode === 'repaired') return this.markers.filter(m => m.status === 'repaired');
    return this.markers;
  }

  get openCount():     number { return this.markers.filter(m => m.status === 'open').length; }
  get repairedCount(): number { return this.markers.filter(m => m.status === 'repaired').length; }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngAfterViewInit() {
    // If voitureId was provided via @Input, set selectedVoitureId first so the
    // *ngIf="selectedVoitureId" renders the canvas before initScene() runs.
    if (this.voitureId) {
      this.selectedVoitureId = this.voitureId;
      this.cdr.detectChanges(); // force DOM update so #canvas is present
    }
    this.initScene();
    this.loadModel();
    this.startLoop();
    this.watchResize();
    if (this.voitureId) {
      this.loadDamages(this.voitureId);
    } else {
      this.loadVoitures();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['voitureId'] && !changes['voitureId'].firstChange) {
      const newId = changes['voitureId'].currentValue as number | null;
      this.selectedVoitureId = newId;
      this.clearAllMarkers();
      this.selectedId = null;
      if (newId) this.loadDamages(newId);
      this.cdr.markForCheck();
    }
    if (changes['preExistingDamages'] && this.scene) {
      const list: any[] = changes['preExistingDamages'].currentValue ?? [];
      // Remove old pre_existing markers, then re-add
      this.markers
        .filter(m => m.source === 'pre_existing')
        .forEach(m => { this.scene.remove(m.mesh); m.mesh.geometry.dispose(); });
      this.markers = this.markers.filter(m => m.source !== 'pre_existing');
      list.filter(d => d.status !== 'repaired').forEach(d => this.addPreExistingMarker(d));
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animId);
    this.resizeObs?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
    this.scene?.clear();
  }

  // ── Car selector ──────────────────────────────────────────────────────────

  loadVoitures() {
    this.loadingCars = true;
    this.http.get<any>(`${environment.apiUrl}/voiture?page=1&limit=200`).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        this.voitures = list;
        this.loadingCars = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingCars = false; this.cdr.markForCheck(); }
    });
  }

  onCarChange() {
    this.clearAllMarkers();
    this.selectedId = null;
    this.filterMode = 'all';
    if (this.selectedVoitureId) {
      this.loadDamages(this.selectedVoitureId);
    }
    this.cdr.markForCheck();
  }

  // ── Damage loading ────────────────────────────────────────────────────────

  loadDamages(carId: number) {
    this.loadingDamages = true;
    this.http.get<any[]>(`${environment.apiUrl}/voiture/${carId}/damages`).subscribe({
      next: (damages) => {
        (damages ?? []).forEach(d => this.addDamageFromDB(d));
        this.loadingDamages = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingDamages = false; this.cdr.markForCheck(); }
    });
  }

  private addDamageFromDB(d: any) {
    const pos = ZONE_POSITIONS[d.zone];
    if (!pos) return;

    const position = new THREE.Vector3(...pos);
    const normal   = new THREE.Vector3(0, 1, 0);
    const mesh     = this.createMarkerMesh(d.severity, d.status);
    mesh.position.copy(position);
    this.scene.add(mesh);

    const marker: DamageMarker = {
      id:            this.nextId++,
      dbId:          d.id,
      position,
      normal,
      zone:          d.zone ?? 'hood',
      severity:      d.severity ?? 'scratch',
      status:        d.status === 'repaired' ? 'repaired' : 'open',
      description:   d.description ?? null,
      estimatedCost: d.estimatedCost ?? null,
      mesh,
      source:        d.source ?? 'manual',
    };
    this.markers = [...this.markers, marker];
  }

  private addPreExistingMarker(d: any) {
    const pos = ZONE_POSITIONS[d.zone];
    if (!pos) return;
    const position = new THREE.Vector3(...pos).add(new THREE.Vector3(0.05, 0, 0));
    const geo = new THREE.SphereGeometry(0.07, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af, emissive: 0x9ca3af, emissiveIntensity: 0.3,
      roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);
    const marker: DamageMarker = {
      id: this.nextId++, dbId: d.id, position, normal: new THREE.Vector3(0, 1, 0),
      zone: d.zone ?? 'hood', severity: d.severity ?? 'scratch',
      status: 'open', description: d.description ?? null,
      estimatedCost: d.estimatedCost ?? null, mesh, source: 'pre_existing',
    };
    this.markers = [...this.markers, marker];
  }

  // ── Add damage flow ───────────────────────────────────────────────────────

  startPick()  { this.pickMode = true;  this.cdr.markForCheck(); }
  cancelPick() { this.pickMode = false; this.cdr.markForCheck(); }

  private onPickHit(hit: THREE.Intersection) {
    const pos    = hit.point.clone();
    const normal = hit.face
      ? hit.face.normal.clone().transformDirection((hit.object as THREE.Mesh).matrixWorld)
      : new THREE.Vector3(0, 1, 0);

    this.pendingHit     = { ...hit, point: pos } as THREE.Intersection;
    this.formZone       = this.detectZone(pos);
    this.formSeverity   = 'scratch';
    this.formDescription = '';
    this.formCost        = '';
    this.showDamageForm  = true;
    this.cdr.markForCheck();
  }

  cancelDamage() {
    this.showDamageForm = false;
    this.pendingHit     = null;
    this.cdr.markForCheck();
  }

  onOverlayClick(event: MouseEvent) {
    if (!this.savingDamage) this.cancelDamage();
  }

  confirmDamage() {
    if (!this.selectedVoitureId || !this.formZone) return;
    this.savingDamage = true;

    const body: any = {
      zone:        this.formZone,
      severity:    this.formSeverity,
      description: this.formDescription || null,
    };
    if (this.formCost && parseFloat(this.formCost) > 0) {
      body.estimatedCost = parseFloat(this.formCost);
    }

    this.http.post<any>(`${environment.apiUrl}/voiture/${this.selectedVoitureId}/damage`, body).subscribe({
      next: (d) => {
        // Place marker at click position (or zone position if no pendingHit)
        const pos = this.pendingHit?.point
          ? this.pendingHit.point.clone()
          : new THREE.Vector3(...(ZONE_POSITIONS[this.formZone] ?? [0, 0.9, 0]));
        const normal = new THREE.Vector3(0, 1, 0);
        const mesh   = this.createMarkerMesh(d.severity ?? this.formSeverity, 'open');
        mesh.position.copy(pos).addScaledVector(normal, 0.04);
        this.scene.add(mesh);

        const marker: DamageMarker = {
          id:            this.nextId++,
          dbId:          d.id,
          position:      pos,
          normal,
          zone:          d.zone ?? this.formZone,
          severity:      d.severity ?? this.formSeverity,
          status:        'open',
          description:   d.description ?? (this.formDescription || null),
          estimatedCost: d.estimatedCost ?? (this.formCost || null),
          mesh,
          source:        'manual',
        };
        this.markers    = [...this.markers, marker];
        this.selectedId = marker.id;
        this.showDamageForm = false;
        this.pendingHit     = null;
        this.savingDamage   = false;
        this.newDamageAdded.emit(d);
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingDamage = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Repair ───────────────────────────────────────────────────────────────

  markRepaired(marker: DamageMarker) {
    if (!marker.dbId) return;
    this.repairingId = marker.id;

    this.http.post<any>(`${environment.apiUrl}/damage/${marker.dbId}/repair`, {}).subscribe({
      next: () => {
        marker.status = 'repaired';
        // Update mesh color to green
        const mat = marker.mesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x22c55e);
        mat.emissive.setHex(0x22c55e);

        this.markers      = [...this.markers];
        this.repairingId  = null;
        this.cdr.markForCheck();
      },
      error: () => { this.repairingId = null; this.cdr.markForCheck(); }
    });
  }

  // ── Marker helpers ────────────────────────────────────────────────────────

  private createMarkerMesh(severity: string, status: string): THREE.Mesh {
    const color = status === 'repaired' ? 0x22c55e : (SEVERITY_COLORS[severity] ?? 0xef4444);
    const geo   = new THREE.SphereGeometry(0.07, 16, 16);
    const mat   = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.5,
      roughness: 0.3, metalness: 0.1,
    });
    return new THREE.Mesh(geo, mat);
  }

  removeMarker(id: number) {
    const m = this.markers.find(x => x.id === id);
    if (m) { this.scene.remove(m.mesh); m.mesh.geometry.dispose(); }
    this.markers = this.markers.filter(x => x.id !== id);
    if (this.selectedId === id) this.selectedId = null;
    this.cdr.markForCheck();
  }

  private clearAllMarkers() {
    this.markers.forEach(m => { this.scene.remove(m.mesh); m.mesh.geometry.dispose(); });
    this.markers    = [];
    this.selectedId = null;
  }

  selectMarker(m: DamageMarker) {
    this.selectedId = m.id;
    this.controls.target.copy(m.position);
    const offset = m.position.clone().add(new THREE.Vector3(0, 1, 2.5));
    this.camera.position.copy(offset);
    this.controls.update();
    this.cdr.markForCheck();
  }

  // ── Zone detection ────────────────────────────────────────────────────────

  private detectZone(point: THREE.Vector3): string {
    const { x, y, z } = point;

    if (y < 0.35) {
      if (z > 0.5) return x < 0 ? 'fl_wheel' : 'fr_wheel';
      return x < 0 ? 'rl_wheel' : 'rr_wheel';
    }
    if (z > 1.5)  return 'front_bumper';
    if (z < -1.5) return 'rear_bumper';

    if (y > 1.05 && Math.abs(x) < 0.55) {
      if (z > 0.2)  return 'windshield';
      if (z < -0.4) return 'rear_window';
      return 'roof';
    }
    if (Math.abs(x) < 0.6 && y > 0.7) return z > 0 ? 'hood' : 'trunk';
    if (y > 0.8 && Math.abs(x) > 0.7 && z > 0.1) return x < 0 ? 'left_mirror' : 'right_mirror';
    if (z > 0.7  && Math.abs(x) > 0.5) return x < 0 ? 'fl_fender' : 'fr_fender';
    if (z < -0.7 && Math.abs(x) > 0.5) return x < 0 ? 'rl_fender' : 'rr_fender';
    if (Math.abs(x) > 0.55) {
      if (z >= 0) return x < 0 ? 'fl_door' : 'fr_door';
      return x < 0 ? 'rl_door' : 'rr_door';
    }
    return z > 0 ? 'hood' : 'trunk';
  }

  // ── Label helpers ─────────────────────────────────────────────────────────

  zoneLabel(zone: string):      string { return ZONE_LABELS[zone]     ?? zone; }
  severityLabel(sev: string):   string { return SEVERITY_LABELS[sev]  ?? sev; }
  severityCss(sev: string):     string { return SEVERITY_CSS[sev]     ?? '#ef4444'; }

  // ── Camera ────────────────────────────────────────────────────────────────

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

  // ── Three.js setup ────────────────────────────────────────────────────────

  private initScene() {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace   = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1e);
    this.scene.fog = new THREE.FogExp2(0x0a0f1e, 0.025);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 1.2, 5);

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

    const grid = new THREE.GridHelper(20, 30, 0x1e3a5f, 0x1e3a5f);
    (grid.material as THREE.Material).opacity    = 0.4;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping  = true;
    this.controls.dampingFactor  = 0.08;
    this.controls.minDistance    = 1.5;
    this.controls.maxDistance    = 15;
    this.controls.maxPolarAngle  = Math.PI / 2 + 0.1;
    this.controls.target.set(0, 0.5, 0);
    this.controls.update();

    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
  }

  loadModel() {
    this.loading    = true;
    this.loadError  = false;
    this.loadPercent = 0;
    this.carMeshes  = [];

    const loader = new GLTFLoader();
    loader.load(
      'assets/models/dacia_logan.glb',
      (gltf) => {
        const model = gltf.scene;
        const box    = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const scale  = 3.5 / Math.max(size.x, size.y, size.z);
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
      () => {
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
    const canvas = this.canvasRef.nativeElement;
    const rect   = canvas.getBoundingClientRect();
    this.pointer.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Click on existing damage marker → select it
    const markerMeshes = this.markers.map(m => m.mesh);
    const markerHits   = this.raycaster.intersectObjects(markerMeshes);
    if (markerHits.length > 0) {
      const hitMesh = markerHits[0].object as THREE.Mesh;
      const marker  = this.markers.find(m => m.mesh === hitMesh);
      if (marker) { this.ngZone.run(() => this.selectMarker(marker)); return; }
    }

    if (!this.pickMode) return;

    const hits = this.raycaster.intersectObjects(this.carMeshes, true);
    if (!hits.length) return;

    this.pickMode = false;
    this.ngZone.run(() => this.onPickHit(hits[0]));
  }
}
