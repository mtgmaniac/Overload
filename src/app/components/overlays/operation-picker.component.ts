import { Component, ChangeDetectionStrategy, inject, signal, computed, output } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { HeroContentService } from '../../services/hero-content.service';
import { CombatService } from '../../services/combat.service';
import { BATTLE_MODES, BATTLE_MODE_ORDER } from '../../data/battle-modes.data';
import type { BattleModeId, HeroId } from '../../models/types';
import type { HeroDefinition, HeroPickerCategory } from '../../models/hero.interface';

@Component({
  selector: 'app-operation-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="op-overlay">
      <div class="op-box">
        <div class="op-title">Choose operation</div>
        <div class="op-top-actions">
          <button type="button" class="op-tut-btn" (click)="startTutorial.emit()">TUTORIAL</button>
        </div>

        <div class="op-section">
          <div class="op-sec-lbl">Operation</div>
          <div class="squad-mode-row" role="group" aria-label="Operation track mode">
            <button
              type="button"
              class="squad-mode-btn"
              [class.squad-mode-btn-on]="operationRandom()"
              (click)="setOperationRandom(true)">
              Random
            </button>
            <button
              type="button"
              class="squad-mode-btn"
              [class.squad-mode-btn-on]="!operationRandom()"
              (click)="setOperationRandom(false)">
              Pick track
            </button>
          </div>
          @if (!operationRandom()) {
            <div class="op-modes" role="list">
              @for (id of modeOrder; track id) {
                <button
                  type="button"
                  class="op-card"
                  [class.op-card-on]="state.battleModeId() === id"
                  (click)="selectMode(id)"
                  role="listitem">
                  <span class="op-card-label">{{ modes[id].label }}</span>
                  <span class="op-card-blurb">{{ modes[id].blurb }}</span>
                </button>
              }
            </div>
          }
        </div>

        <div class="op-section">
          <div class="op-sec-lbl">Squad</div>
          <div class="squad-mode-row" role="group" aria-label="Squad selection mode">
            <button
              type="button"
              class="squad-mode-btn"
              [class.squad-mode-btn-on]="squadRandom()"
              (click)="setSquadRandom(true)">
              Random
            </button>
            <button
              type="button"
              class="squad-mode-btn"
              [class.squad-mode-btn-on]="!squadRandom()"
              (click)="setSquadRandom(false)">
              Pick 3
            </button>
          </div>
          @if (!squadRandom()) {
            <p class="squad-hint">Select exactly three heroes.</p>
            @for (sec of heroesByPickerSection(); track sec.key) {
              @if (sec.heroes.length) {
                <div class="op-hero-cat" [attr.data-cat]="sec.key">
                  <div class="op-hero-cat-hdr">
                    <span class="op-hero-cat-lbl">{{ sec.label }}</span>
                  </div>
                  <div class="op-hero-cards">
                    @for (h of sec.heroes; track h.id) {
                      <button
                        type="button"
                        class="op-hero-card"
                        [class.op-hero-card-on]="isPicked(h.id)"
                        [disabled]="!canToggle(h.id)"
                        (click)="toggleHero(h.id)">
                        <span class="op-hero-card-name">{{ h.name }}</span>
                        <span class="op-hero-card-cls">{{ h.cls }}</span>
                        <span class="op-hero-card-desc">{{ h.pickerBlurb }}</span>
                      </button>
                    }
                  </div>
                </div>
              }
            }
            <div class="squad-count">{{ pickedOrder().length }} / 3</div>
          }
        </div>

        <button
          type="button"
          class="op-begin"
          [disabled]="!canBegin()"
          (click)="begin()">
          BEGIN RUN
        </button>
      </div>
    </div>
  `,
  styles: [`
    .op-overlay {
      position: fixed;
      inset: 0;
      z-index: 600;
      padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right))
        max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
      background: rgba(4, 6, 10, 0.97);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .op-box {
      background: var(--bg2);
      border: 2px solid var(--border);
      box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.55);
      border-radius: var(--radius-pixel);
      padding: clamp(16px, 4vw, 28px) clamp(18px, 5vw, 36px);
      max-width: min(560px, calc(100vw - 24px - env(safe-area-inset-left) - env(safe-area-inset-right)));
      width: 100%;
      max-height: min(92vh, 720px);
      overflow-y: auto;
    }
    .op-title {
      font-size: clamp(16px, 4.5vw, 22px);
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      text-align: center;
      margin-bottom: 6px;
      color: #fff;
    }
    .op-top-actions {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    .op-tut-btn {
      font-family: var(--font-pixel);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 8px 18px;
      border-radius: var(--radius-pixel);
      border: 2px solid rgba(46, 125, 212, 0.5);
      background: rgba(46, 125, 212, 0.12);
      color: #cfe6ff;
      cursor: pointer;
      box-shadow: 2px 2px 0 #000;
      touch-action: manipulation;
    }
    .op-tut-btn:hover {
      border-color: #7ab8ff;
      color: #fff;
    }
    .op-section {
      margin-bottom: 16px;
    }
    .op-sec-lbl {
      font-family: var(--font-pixel);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #6f95b3;
      margin-bottom: 8px;
    }
    .op-modes {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .op-card {
      text-align: left;
      font-family: inherit;
      background: var(--bg3);
      border: 2px solid var(--border);
      border-radius: var(--radius-pixel);
      padding: 12px 14px;
      cursor: pointer;
      color: var(--text);
      box-shadow: 2px 2px 0 #000;
      transition: border-color 0.1s ease, filter 0.1s ease;
    }
    .op-card:hover {
      border-color: var(--strike);
      filter: brightness(1.05);
    }
    .op-card-on {
      border-color: var(--overload);
      box-shadow: 2px 2px 0 rgba(216, 74, 42, 0.35);
    }
    .op-card-label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .op-card-blurb {
      display: block;
      font-family: var(--font-pixel);
      font-size: 9px;
      color: var(--muted);
      line-height: 1.45;
    }
    .squad-mode-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }
    .squad-mode-btn {
      flex: 1;
      font-family: var(--font-pixel);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 8px 10px;
      border-radius: var(--radius-pixel);
      border: 2px solid var(--border);
      background: var(--bg3);
      color: var(--muted);
      cursor: pointer;
      box-shadow: 2px 2px 0 #000;
    }
    .squad-mode-btn:hover {
      filter: brightness(1.06);
    }
    .squad-mode-btn-on {
      border-color: var(--strike);
      color: #fff;
      background: rgba(46, 125, 212, 0.2);
    }
    .squad-hint {
      font-family: var(--font-pixel);
      font-size: 9px;
      color: var(--muted);
      margin: 0 0 10px;
      line-height: 1.4;
    }
    .op-hero-cat {
      margin-bottom: 14px;
    }
    .op-hero-cat-hdr {
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .op-hero-cat-lbl {
      font-family: var(--font-pixel);
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #8aa8c4;
    }
    .op-hero-cat[data-cat='damage'] .op-hero-cat-lbl {
      color: #e07060;
    }
    .op-hero-cat[data-cat='defense'] .op-hero-cat-lbl {
      color: #5dade2;
    }
    .op-hero-cat[data-cat='support'] .op-hero-cat-lbl {
      color: #58d68d;
    }
    .op-hero-cat[data-cat='control'] .op-hero-cat-lbl {
      color: #c39bd3;
    }
    .op-hero-cards {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    @media (min-width: 440px) {
      .op-hero-cards {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .op-hero-card {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 5px;
      text-align: left;
      font-family: inherit;
      padding: 10px 10px;
      border-radius: var(--radius-pixel);
      border: 2px solid var(--border);
      background: var(--bg3);
      color: var(--text);
      cursor: pointer;
      box-shadow: 2px 2px 0 #000;
      touch-action: manipulation;
    }
    .op-hero-card:hover:not(:disabled) {
      border-color: var(--strike);
      filter: brightness(1.05);
    }
    .op-hero-card-on {
      border-color: #2ec46a;
      background: rgba(46, 196, 106, 0.1);
      box-shadow: 2px 2px 0 rgba(46, 196, 106, 0.25);
    }
    .op-hero-card:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .op-hero-card-name {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #fff;
      line-height: 1.2;
    }
    .op-hero-card-cls {
      font-family: var(--font-pixel);
      font-size: 7px;
      color: #6f95b3;
      letter-spacing: 0.4px;
      line-height: 1.25;
    }
    .op-hero-card-desc {
      font-family: var(--font-pixel);
      font-size: 8px;
      color: var(--muted);
      line-height: 1.45;
    }
    .squad-count {
      font-family: var(--font-pixel);
      font-size: 9px;
      color: #6f95b3;
      text-align: center;
    }
    .op-begin {
      width: 100%;
      background: var(--strike);
      border: 2px solid #0a0e14;
      color: #fff;
      font-family: var(--font-pixel);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 10px 16px;
      border-radius: var(--radius-pixel);
      cursor: pointer;
      box-shadow: 3px 3px 0 #000;
      margin-top: 4px;
    }
    .op-begin:hover:not(:disabled) {
      filter: brightness(1.08);
    }
    .op-begin:active:not(:disabled) {
      transform: translate(1px, 1px);
      box-shadow: 2px 2px 0 #000;
    }
    .op-begin:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      filter: grayscale(0.2);
    }
  `],
})
export class OperationPickerComponent {
  readonly startTutorial = output<void>();

  readonly state = inject(GameStateService);
  private readonly combat = inject(CombatService);
  private readonly heroContent = inject(HeroContentService);

  readonly modes = BATTLE_MODES;
  readonly modeOrder = BATTLE_MODE_ORDER;

  readonly roster = computed(() => this.heroContent.heroes());

  readonly pickerSectionOrder: readonly HeroPickerCategory[] = ['damage', 'defense', 'support', 'control'];
  readonly pickerSectionLabels: Record<HeroPickerCategory, string> = {
    damage: 'Damage',
    defense: 'Defense',
    support: 'Support',
    control: 'Control',
  };

  readonly heroesByPickerSection = computed(() => {
    const roster = this.roster();
    const buckets = new Map<HeroPickerCategory, HeroDefinition[]>();
    for (const k of this.pickerSectionOrder) buckets.set(k, []);
    for (const h of roster) {
      const list = buckets.get(h.pickerCategory);
      if (list) list.push(h);
    }
    return this.pickerSectionOrder.map(key => ({
      key,
      label: this.pickerSectionLabels[key],
      heroes: buckets.get(key) ?? [],
    }));
  });

  /** Default: roll facility / hive / veil on BEGIN RUN. */
  readonly operationRandom = signal(true);
  readonly squadRandom = signal(true);
  /** Selection order preserved for party slot order. */
  readonly pickedOrder = signal<HeroId[]>([]);

  readonly canBegin = computed(() => {
    if (this.squadRandom()) return true;
    return this.pickedOrder().length === 3;
  });

  setOperationRandom(random: boolean): void {
    this.operationRandom.set(random);
  }

  selectMode(id: BattleModeId): void {
    this.operationRandom.set(false);
    this.state.battleModeId.set(id);
  }

  setSquadRandom(random: boolean): void {
    this.squadRandom.set(random);
    if (random) this.pickedOrder.set([]);
  }

  isPicked(id: HeroId): boolean {
    return this.pickedOrder().includes(id);
  }

  /** Can click: either already picked (to deselect) or fewer than 3 picked. */
  canToggle(id: HeroId): boolean {
    if (this.isPicked(id)) return true;
    return this.pickedOrder().length < 3;
  }

  toggleHero(id: HeroId): void {
    if (this.squadRandom()) return;
    this.pickedOrder.update(arr => {
      const i = arr.indexOf(id);
      if (i >= 0) return arr.filter((_, j) => j !== i);
      if (arr.length >= 3) return arr;
      return [...arr, id];
    });
  }

  begin(): void {
    if (!this.canBegin()) return;
    if (this.operationRandom()) {
      const order = BATTLE_MODE_ORDER;
      this.state.battleModeId.set(order[Math.floor(Math.random() * order.length)]!);
    }
    this.state.showOperationPicker.set(false);
    if (this.squadRandom()) {
      this.state.initHeroes();
    } else {
      this.state.initHeroes(this.pickedOrder());
    }
    this.combat.initBattle();
  }
}
