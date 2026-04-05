import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { EnemyState } from '../../../models/enemy.interface';
import { EnemyAbility } from '../../../models/ability.interface';
import { Zone, ZONES } from '../../../models/types';
import { GameStateService } from '../../../services/game-state.service';
import { DiceService } from '../../../services/dice.service';
import { CombatService } from '../../../services/combat.service';
import { TargetingService } from '../../../services/targeting.service';
import { HpBarComponent } from '../../shared/hp-bar/hp-bar.component';
import { PortraitFrameComponent } from '../../shared/portrait-frame/portrait-frame.component';
import { AbilityRowComponent } from '../../shared/ability-row/ability-row.component';
import { BadgeZoneComponent } from '../../shared/badge-zone/badge-zone.component';
import {
  UnitStatusRibbonComponent,
  UnitStatusRibbonLine,
} from '../../shared/unit-status-ribbon/unit-status-ribbon.component';
import { enemyPortraitSvg } from '../../../data/sprites.data';
import { ENEMY_FRAME_COLORS } from '../../../data/unit-frame-colors';

@Component({
  selector: 'app-enemy-card',
  standalone: true,
  imports: [HpBarComponent, PortraitFrameComponent, AbilityRowComponent, BadgeZoneComponent, UnitStatusRibbonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ec-col">
      <div class="ec-card"
           [attr.id]="index() === 0 ? 'tut-drone-card' : null"
           [class.is-dead]="enemy().dead"
           [class.selectable-enemy-pick]="isPickable()"
           [style.border-color]="unitFrameColor()"
           (click)="onCardClick()">
        <!-- Ability panel (matches hero card) -->
        <div class="ap">
          <div class="ap-title">ABILITIES</div>
          @for (zone of zones; track zone) {
            @if (getAbilityForZone(zone); as ab) {
              <app-ability-row
                [ability]="ab"
                [zone]="zone"
                [rangeStr]="enemyRangeStr(zone)"
                [isCurrent]="isCurrentZone(zone)"
                effectVariant="enemy" />
            }
          }
        </div>
        <!-- Bottom section: info + portrait (matches hero card) -->
        <div class="hbot">
          <div class="info-col">
            <div>
              <div class="hname">{{ enemy().name }}</div>
              <div class="hero-target-line">
                <span class="hero-target-text">
                  @for (seg of targetLine().segments; track $index) {
                    @switch (seg.t) {
                      @case ('plain') { <span>{{ seg.text }}</span> }
                      @case ('muted') { <span class="tgt-muted">{{ seg.text }}</span> }
                      @case ('all') { <span class="tgt-all">{{ seg.text }}</span> }
                      @case ('self') { <span class="tgt-self">{{ seg.text }}</span> }
                      @case ('enemy') { <span class="tgt-enemy">{{ seg.text }}</span> }
                      @case ('ally') { <span class="tgt-ally">{{ seg.text }}</span> }
                    }
                  }
                </span>
              </div>
            </div>
            <div>
              <app-hp-bar [current]="enemy().currentHp" [max]="enemy().maxHp">
                <div data-hp-aside>
                  <app-unit-status-ribbon [lines]="enemyStatusLines()" />
                </div>
              </app-hp-bar>
              <app-badge-zone kind="enemy" [index]="index()" />
            </div>
          </div>
          <div class="sprite">
            <app-portrait-frame
              [svg]="enemySvg()"
              [anchorId]="'action-enemy-' + index()"
              [rampageGlow]="(enemy().rampageCharges || 0) > 0"
              [rampageTip]="rampagePortraitTip()" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
      width: 240px;
      align-self: stretch;
      height: 100%;
      min-height: 0;
    }
    .ec-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100%;
      flex-shrink: 0;
      touch-action: manipulation;
    }
    .ec-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100%;
      border-radius: var(--radius-pixel);
      background: var(--bg2);
      border-width: 1px;
      border-style: solid;
      box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.4);
      touch-action: manipulation;
    }
    .ec-card.is-dead { opacity: .28; }
    .selectable-enemy-pick {
      cursor: pointer;
      box-shadow: inset 0 0 0 2px rgba(232, 90, 58, 0.65), inset 0 0 20px rgba(232, 90, 58, 0.08);
    }
    .ap {
      flex-shrink: 0;
      background: var(--bg);
      padding: 5px 8px;
      border-bottom: 2px solid var(--border);
    }
    .ap-title {
      font-size: clamp(7px, 2.1vw, 8px);
      letter-spacing: 2px;
      color: #4a6a8a;
    }
    .hbot {
      flex: 1;
      min-height: 0;
      padding: 6px 7px;
      display: flex;
      align-items: flex-end;
      gap: 6px;
    }
    .info-col {
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-self: stretch;
    }
    .hname {
      font-size: clamp(10px, 3.2vw, 12px);
      font-weight: 800;
      color: #fff;
    }
    .hero-target-line {
      font-size: clamp(7px, 2.4vw, 9px);
      line-height: 1.35;
      color: #6f95b3;
      margin-top: 4px;
      display: flex;
      align-items: flex-start;
      min-width: 0;
    }
    .hero-target-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tgt-muted { color: #4a6a8a; }
    .tgt-self { color: #7dcea0; font-weight: 700; }
    .tgt-ally { color: #2ec46a; font-weight: 700; }
    .tgt-enemy { color: #e07060; font-weight: 700; }
    .tgt-all { color: #c8ddf0; font-weight: 700; }
    .sprite {
      flex-shrink: 0;
      display: flex;
      align-items: flex-end;
      position: relative;
      border-radius: var(--radius-pixel);
    }
  `],
})
export class EnemyCardComponent {
  private state = inject(GameStateService);
  private dice = inject(DiceService);
  private combat = inject(CombatService);
  private targeting = inject(TargetingService);

  enemy = input.required<EnemyState>();
  index = input.required<number>();
  isPickable = input(false);
  hideRoll = input(false);

  enemyClicked = output<void>();

  zones = ZONES;

  unitFrameColor = computed(() => ENEMY_FRAME_COLORS[this.enemy().type]);

  rampagePortraitTip = computed((): string | null => {
    const e = this.enemy();
    const n = e.rampageCharges || 0;
    if (n <= 0) return null;
    return `${e.name} is rampaging — the next ${n} direct hit${n > 1 ? 's' : ''} deal ×2 damage (one charge per hit).`;
  });

  enemyStatusLines = computed((): UnitStatusRibbonLine[] => {
    const e = this.enemy();
    if (e.dead) return [];
    const n = e.rampageCharges || 0;
    if (n <= 0) return [];
    return [
      {
        key: 'rampage',
        tag: 'RAMPAGE',
        detail: `The next ${n} direct hit${n > 1 ? 's' : ''} deal ×2 damage (one charge per hit).`,
      },
    ];
  });

  enemySvg = computed(() => enemyPortraitSvg(this.enemy().type));

  targetLine = computed(() => {
    this.state.heroes();
    this.state.enemies();
    this.enemy();
    if (this.hideRoll()) {
      return {
        segments: [
          { t: 'plain' as const, text: 'Target: ' },
          { t: 'muted' as const, text: '—' },
        ],
      };
    }
    return this.targeting.getEnemyTargetLineView(this.index());
  });

  getAbilityForZone(zone: Zone): EnemyAbility | null {
    const e = this.enemy();
    const ab = this.combat.getEnemyAbility(e, zone);
    return ab?.name === '?' ? null : ab;
  }

  enemyRangeStr(zone: Zone): string {
    return this.dice.enemyZoneRanges()[zone];
  }

  isCurrentZone(zone: Zone): boolean {
    if (this.hideRoll()) return false;
    if (this.enemy().dead) return false;
    return this.dice.getEnemyZone(this.enemy().effRoll) === zone;
  }

  onCardClick(): void {
    this.enemyClicked.emit();
  }
}
