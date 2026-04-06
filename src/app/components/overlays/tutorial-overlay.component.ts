import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  output,
  signal,
  effect,
  afterNextRender,
  DestroyRef,
} from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { TutorialService } from '../../services/tutorial.service';

const PANEL_W = 300;
const PANEL_GAP = 10;
const SPOT_PAD = 6;

function unionClientRect(selectors: string[]): {
  left: number;
  top: number;
  width: number;
  height: number;
} | null {
  let minL = Infinity;
  let minT = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  let ok = false;
  for (const sel of selectors) {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;
    ok = true;
    minL = Math.min(minL, r.left);
    minT = Math.min(minT, r.top);
    maxR = Math.max(maxR, r.right);
    maxB = Math.max(maxB, r.bottom);
  }
  if (!ok) return null;
  return { left: minL, top: minT, width: maxR - minL, height: maxB - minT };
}

@Component({
  selector: 'app-tutorial-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="tut-root" role="dialog" aria-modal="true">
        @if (tutorial.tutorialPointerWall()) {
          <div class="tut-clickwall" aria-hidden="true"></div>
        }
        @if (spotRect(); as r) {
          <div
            class="tut-spot"
            [style.left.px]="r.left"
            [style.top.px]="r.top"
            [style.width.px]="r.width"
            [style.height.px]="r.height"></div>
        }
        <div class="tut-panel" [style.left.px]="panelRect()?.left" [style.top.px]="panelRect()?.top">
          @if (state.tutorial()!.showComplete) {
            <div class="tut-k">DONE</div>
            <div class="tut-title">First turn complete</div>
            <p class="tut-body">
              You finished a full player turn — dice, targets, <strong>END TURN</strong> — and watched the drone act. You’re
              set to leave this drill: go home, pick an operation, and start a real game whenever you like. Run the tutorial
              again from <strong>HELP</strong> if you want another walkthrough.
            </p>
            <button type="button" class="tut-btn tut-btn-primary" (click)="exitRegular.emit()">
              BACK TO HOME
            </button>
          } @else if (tutorial.coachPanelVisible()) {
            @let t = state.tutorial()!;
            @let cs = t.coachStep;
            <div class="tut-k">AFTER ROLL · {{ cs }} / 4</div>
            @switch (cs) {
              @case (1) {
                <div class="tut-title">Damage target</div>
                <p class="tut-body">
                  <strong>{{ tutorial.coachPulseHero()?.name ?? 'Pulse Tech' }}</strong> rolled
                  <strong>{{ tutorial.coachPulseAbilityName() }}</strong> — a damage ability. Tap
                  <strong>{{ tutorial.coachPulseHero()?.name ?? 'Pulse Tech' }}</strong>, then the
                  <strong>Scrap Drone</strong> to assign damage.
                </p>
              }
              @case (2) {
                <div class="tut-title">Shield target</div>
                <p class="tut-body">
                  <strong>{{ tutorial.coachShieldHero()?.name ?? 'Spite Guard' }}</strong> rolled
                  <strong>{{ tutorial.coachShieldAbilityName() }}</strong> — a shield ability. Tap
                  <strong>{{ tutorial.coachShieldHero()?.name ?? 'Spite Guard' }}</strong>, then an
                  <strong>ally</strong> (Pulse Tech or Systems Medic) to apply it.
                </p>
              }
              @case (3) {
                <div class="tut-title">Systems Medic</div>
                <p class="tut-body">
                  <strong>{{ tutorial.coachMedicHero()?.name ?? 'Systems Medic' }}</strong> rolled
                  <strong>{{ tutorial.coachMedicAbilityName() }}</strong> — a support ability. Tap
                  <strong>Systems Medic</strong>, then an <strong>ally</strong> to grant the
                  <strong>+{{ tutorial.coachMedicRfmValue() }} roll</strong> on their next roll.
                </p>
              }
              @case (4) {
                <div class="tut-title">End the round</div>
                <p class="tut-body">
                  Targets are set. Tap <strong>END TURN</strong> to resolve abilities and let the drone act.
                </p>
              }
            }
          } @else {
            @let step = tutorial.introSteps[state.tutorial()!.introStep];
            <div class="tut-k">TUTORIAL · {{ step.k }}</div>
            <div class="tut-title">{{ step.title }}</div>
            <p class="tut-body">{{ step.body }}</p>
            <div class="tut-actions">
              @if (state.tutorial()!.introStep > 0) {
                <button type="button" class="tut-btn" (click)="tutorial.introBack()">BACK</button>
              }
              <button type="button" class="tut-btn tut-btn-primary" (click)="tutorial.introNext()">
                {{ state.tutorial()!.introStep >= tutorial.introSteps.length - 1 ? 'BEGIN DRILL' : 'NEXT' }}
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .tut-root {
      position: fixed; inset: 0; z-index: 850; pointer-events: none;
    }
    .tut-clickwall {
      position: absolute; inset: 0; pointer-events: auto; z-index: 0;
      background: transparent;
    }
    .tut-spot {
      position: fixed; z-index: 1; pointer-events: none;
      border-radius: var(--radius-pixel);
      box-shadow: 0 0 0 9999px rgba(4, 6, 10, 0.82);
    }
    .tut-panel {
      position: fixed; z-index: 2; pointer-events: auto;
      width: min(${PANEL_W}px, calc(100vw - 20px));
      max-height: min(420px, calc(100vh - 24px));
      overflow: auto;
      background: var(--bg2); border: 2px solid var(--border); border-radius: var(--radius-pixel);
      padding: 14px 16px 16px;
      box-shadow: 6px 6px 0 rgba(0,0,0,.55);
    }
    .tut-k {
      font-family: var(--font-pixel); font-size: 9px; font-weight: 800; letter-spacing: 2px;
      color: var(--muted); margin-bottom: 6px;
    }
    .tut-title {
      font-size: 16px; font-weight: 800; color: #fff; letter-spacing: .5px; margin-bottom: 10px;
    }
    .tut-body {
      font-family: var(--font-pixel); font-size: 10px; line-height: 1.5; color: var(--muted);
      margin: 0 0 14px;
    }
    .tut-body strong { color: #fff; font-weight: 800; }
    .tut-body em { color: #9bc0dd; font-style: normal; font-weight: 700; }
    .tut-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .tut-btn {
      font-family: var(--font-pixel); font-size: 10px; font-weight: 700; letter-spacing: 1px;
      color: var(--text); background: var(--bg3); border: 2px solid var(--border);
      padding: 8px 14px; min-height: 40px; border-radius: var(--radius-pixel); cursor: pointer; touch-action: manipulation;
      box-shadow: 2px 2px 0 #000;
    }
    .tut-btn:hover { border-color: var(--strike); color: var(--strike); }
    .tut-btn-primary {
      border-color: rgba(46,125,212,.55); color: #cfe6ff; background: rgba(46,125,212,.15);
    }
    .tut-btn-primary:hover { border-color: #7ab8ff; color: #fff; }
  `],
})
export class TutorialOverlayComponent {
  state = inject(GameStateService);
  tutorial = inject(TutorialService);
  private destroyRef = inject(DestroyRef);
  exitRegular = output<void>();

  spotRect = signal<{ left: number; top: number; width: number; height: number } | null>(null);
  panelRect = signal<{ left: number; top: number } | null>(null);

  visible = computed(() => {
    const t = this.state.tutorial();
    if (!t?.active) return false;
    if (!t.introComplete) return true;
    if (t.showComplete) return true;
    if (t.resolutions === 0 && t.coachStep >= 1 && t.coachStep <= 4) return true;
    return false;
  });

  constructor() {
    const relayout = () => {
      if (!this.visible()) {
        this.spotRect.set(null);
        this.panelRect.set(null);
        return;
      }
      const tut = this.state.tutorial();
      const drone =
        (document.querySelector('#tut-drone-card') as HTMLElement | null) ??
        (document.querySelector('#tut-enemy-zone') as HTMLElement | null);
      const anchorEl = drone;
      const sels = this.tutorial.spotlightSelectors();
      const ur = unionClientRect(sels);
      if (!anchorEl || !ur) {
        this.spotRect.set(null);
        this.panelRect.set(null);
        return;
      }
      const pad = SPOT_PAD;
      this.spotRect.set({
        left: ur.left - pad,
        top: ur.top - pad,
        width: Math.max(24, ur.width + pad * 2),
        height: Math.max(24, ur.height + pad * 2),
      });
      const dr = anchorEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pw = Math.min(PANEL_W, vw - 20);
      let left = dr.right + PANEL_GAP;
      let top = dr.top;
      if (left + pw > vw - 8) {
        left = dr.left - pw - PANEL_GAP;
      }
      if (left < 8) {
        left = Math.max(8, (vw - pw) / 2);
        top = dr.bottom + PANEL_GAP;
      }
      top = Math.max(8, Math.min(top, vh - 100));
      this.panelRect.set({ left, top });
    };

    effect(() => {
      this.visible();
      this.state.tutorial();
      this.tutorial.spotlightSelectors();
      queueMicrotask(() => relayout());
    });

    afterNextRender(() => {
      const onWin = () => relayout();
      window.addEventListener('resize', onWin);
      window.addEventListener('scroll', onWin, true);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', onWin);
        window.removeEventListener('scroll', onWin, true);
      });
      relayout();
    });
  }
}
