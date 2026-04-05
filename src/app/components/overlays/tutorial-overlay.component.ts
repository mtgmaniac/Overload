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
            <div class="tut-title">You're ready</div>
            <p class="tut-body">
              That was a full two-turn drill: damage, shield, enemy hitback, Protocol, and a heal.
              Start a regular match when you're set — random squad, full campaign rules.
            </p>
            <button type="button" class="tut-btn tut-btn-primary" (click)="exitRegular.emit()">
              START REGULAR MATCH
            </button>
          } @else if (state.tutorial()!.showTurn2Modal) {
            <div class="tut-k">ROUND 2</div>
            <div class="tut-title">Back to the drone</div>
            <p class="tut-body">
              Continue, then <strong>ROLL ALL DICE</strong> again. Step-by-step prompts will appear <em>after</em> the roll:
              spending <strong>Protocol</strong> on <strong>Systems Medic</strong>, then their heal, then the other heroes’ targets.
            </p>
            <button type="button" class="tut-btn tut-btn-primary" (click)="tutorial.dismissTurn2Modal()">
              CONTINUE
            </button>
          } @else if (tutorial.coachPanelVisible()) {
            @let t = state.tutorial()!;
            @if (t.resolutions === 0) {
              @let cs = t.coachStep;
              <div class="tut-k">AFTER ROLL · {{ cs }} / 3</div>
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
                    <strong>{{ tutorial.coachShieldHero()?.name ?? 'Aegis Disruptor' }}</strong> rolled
                    <strong>{{ tutorial.coachShieldAbilityName() }}</strong> — a shield ability. Tap
                    <strong>{{ tutorial.coachShieldHero()?.name ?? 'Aegis Disruptor' }}</strong>, then an
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
              }
            } @else {
              @let r2 = t.r2CoachStep;
              <div class="tut-k">ROUND 2 · {{ r2 }} / 4</div>
              @switch (r2) {
                @case (1) {
                  <div class="tut-title">Spend Protocol on Medic</div>
                  <p class="tut-body">
                    You now have <strong>Protocol</strong> to spend. Tap the <strong>nudge</strong> (↑, 1) or
                    <strong>reroll</strong> (dice, 2) icons in the strip (hover for full labels), then tap
                    <strong>Systems Medic</strong> so the cost applies to their die.
                  </p>
                }
                @case (2) {
                  <div class="tut-title">Medic heal</div>
                  <p class="tut-body">
                    <strong>{{ tutorial.coachMedicHero()?.name ?? 'Systems Medic' }}</strong> rolled
                    <strong>{{ tutorial.coachMedicAbilityName() }}</strong>. Tap <strong>Systems Medic</strong>, then an
                    <strong>ally who is hurt</strong> (not at full HP) to heal them.
                  </p>
                }
                @case (3) {
                  <div class="tut-title">Pulse Tech</div>
                  <p class="tut-body">
                    <strong>{{ tutorial.coachPulseHero()?.name ?? 'Pulse Tech' }}</strong> rolled
                    <strong>{{ tutorial.coachPulseAbilityName() }}</strong>. Tap their card, then the
                    <strong>Scrap Drone</strong> to finish the ability.
                  </p>
                }
                @case (4) {
                  <div class="tut-title">Aegis Disruptor</div>
                  <p class="tut-body">
                    <strong>{{ tutorial.coachShieldHero()?.name ?? 'Aegis Disruptor' }}</strong> rolled
                    <strong>{{ tutorial.coachShieldAbilityName() }}</strong>. Tap their card, then the
                    <strong>Scrap Drone</strong> to apply the debuff.
                  </p>
                }
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
    if (t.showTurn2Modal) return true;
    if (t.showComplete) return true;
    if (t.resolutions === 0 && t.coachStep >= 1 && t.coachStep <= 3) return true;
    if (t.resolutions === 1 && !t.showTurn2Modal && !t.showComplete && t.r2CoachStep >= 1 && t.r2CoachStep <= 4) {
      return true;
    }
    return false;
  });

  constructor() {
    const relayout = () => {
      if (!this.visible()) {
        this.spotRect.set(null);
        this.panelRect.set(null);
        return;
      }
      const drone =
        (document.querySelector('#tut-drone-card') as HTMLElement | null) ??
        (document.querySelector('#tut-enemy-zone') as HTMLElement | null);
      const sels = this.tutorial.spotlightSelectors();
      const ur = unionClientRect(sels);
      if (!drone || !ur) {
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
      const dr = drone.getBoundingClientRect();
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
