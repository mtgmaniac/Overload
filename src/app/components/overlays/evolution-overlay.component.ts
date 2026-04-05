import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { EvolutionService, GroupedEvoPath } from '../../services/evolution.service';
import { CombatService } from '../../services/combat.service';

@Component({
  selector: 'app-evolution-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="evo-overlay" [class.show]="isVisible()">
      <div style="font-size:22px;font-weight:900;letter-spacing:5px;color:#fff;margin-bottom:14px;">
        ⬡ EVOLUTION AVAILABLE
      </div>
      <div class="evo-heroes-row">
        @for (pe of state.pendingEvolutions(); track pe.heroIdx; let ci = $index) {
          <div class="evo-hero-card">
            <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:8px;">
              {{ getHeroName(pe.heroIdx) }}
            </div>
            @for (path of getPaths(pe.heroIdx); track path.name; let ei = $index) {
              <div class="evo-path" [class.selected]="pe.chosen === ei" (click)="selectEvo(ci, ei)">
                <div class="evo-path-name">{{ path.name }}</div>
                <div class="evo-path-focus">{{ path.focus }}</div>
                <div style="font-size:9px;color:var(--muted);margin-top:4px;">
                  HP: {{ path.hp }}
                </div>
              </div>
            }
          </div>
        }
      </div>
      <button class="evo-confirm-btn" [disabled]="!allChosen()" (click)="confirm()">
        CONFIRM EVOLUTIONS
      </button>
    </div>
  `,
  styles: [`
    .evo-overlay {
      position: fixed; inset: 0; background: rgba(4, 6, 10, 0.97);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 600; opacity: 0; pointer-events: none; transition: opacity 0.15s steps(3, end); overflow-y: auto;
      padding: max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
    }
    .evo-overlay.show { opacity: 1; pointer-events: all; }
    .evo-heroes-row { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; max-width: 900px; width: 100%; }
    .evo-hero-card { flex: 1; min-width: 240px; max-width: 340px; background: var(--bg2); border: 2px solid var(--border); border-radius: var(--radius-pixel); padding: 14px; box-shadow: 4px 4px 0 rgba(0,0,0,.4); }
    .evo-path {
      border: 2px solid var(--border); border-radius: var(--radius-pixel); padding: 12px; cursor: pointer;
      transition: border-color 0.12s steps(2, end); background: var(--bg3); margin-bottom: 8px; touch-action: manipulation;
    }
    .evo-path:hover { border-color: #2e7dd4; }
    .evo-path:active { filter: brightness(1.06); }
    .evo-path.selected { border-color: #1d9e75; background: rgba(29,158,117,.08); }
    .evo-path-name { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 2px; }
    .evo-path-focus { font-family: var(--font-pixel); font-size: 10px; color: #4a6a8a; margin-bottom: 5px; }
    .evo-confirm-btn {
      font-family: var(--font-pixel); font-weight: 700; font-size: 13px; letter-spacing: 2px;
      text-transform: uppercase; padding: 12px 28px; min-height: 48px; border-radius: var(--radius-pixel); cursor: pointer;
      border: 2px solid var(--build); background: var(--build-bg); color: var(--build);
      box-shadow: 3px 3px 0 #000; margin-top: 18px; touch-action: manipulation;
    }
    .evo-confirm-btn:hover:not(:disabled) { background: rgba(29,158,117,.28); }
    .evo-confirm-btn:disabled { opacity: .3; cursor: not-allowed; }
  `],
})
export class EvolutionOverlayComponent {
  state = inject(GameStateService);
  private evo = inject(EvolutionService);
  private combat = inject(CombatService);

  isVisible = computed(() => this.state.pendingEvolutions().length > 0);

  allChosen = computed(() =>
    this.state.pendingEvolutions().every(pe => pe.chosen !== null)
  );

  getHeroName(heroIdx: number): string {
    return this.state.heroes()[heroIdx]?.name ?? '?';
  }

  getPaths(heroIdx: number): GroupedEvoPath[] {
    const hero = this.state.heroes()[heroIdx];
    if (!hero) return [];
    return this.evo.groupEvoPaths(hero.evolutions);
  }

  selectEvo(pendingIdx: number, pathIdx: number): void {
    this.state.pendingEvolutions.update(evos =>
      evos.map((pe, i) => i === pendingIdx ? { ...pe, chosen: pathIdx } : pe)
    );
  }

  confirm(): void {
    const pending = this.state.pendingEvolutions();
    for (const pe of pending) {
      if (pe.chosen !== null) {
        this.evo.confirmEvolution(pe.heroIdx, pe.chosen);
      }
    }
    this.state.pendingEvolutions.set([]);
    // Show next battle overlay
    this.combat.nextBattle();
  }
}
