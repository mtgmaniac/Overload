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
import type { UnitStatusRibbonLine } from '../../shared/unit-status-ribbon/unit-status-ribbon.component';
import { enemyPortraitSvg } from '../../../data/sprites.data';
import { enemyUnitFrameColor } from '../../../data/unit-frame-colors';

@Component({
  selector: 'app-enemy-card',
  standalone: true,
  imports: [HpBarComponent, PortraitFrameComponent, AbilityRowComponent, BadgeZoneComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './enemy-card.component.html',
  styleUrl: './enemy-card.component.scss',
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

  unitFrameColor = computed(() => enemyUnitFrameColor(this.enemy().type));

  rampagePortraitTip = computed((): string | null => {
    const e = this.enemy();
    const n = e.rampageCharges || 0;
    if (n <= 0) return null;
    return n === 1
      ? 'Rampage: Next attack deals 2× damage'
      : `Rampage: Next ${n} attacks deal 2× damage`;
  });

  /** Word chips under status badges (mirrors hero badge zone ribbon). */
  enemyRibbonLines = computed((): UnitStatusRibbonLine[] => {
    const e = this.enemy();
    if (e.dead) return [];
    const out: UnitStatusRibbonLine[] = [];

    const n = e.rampageCharges || 0;
    if (n > 0) {
      out.push({
        key: 'rampage',
        tag: 'RAMPAGE',
        detail:
          n === 1
            ? 'Rampage: Next attack deals 2× damage'
            : `Rampage: Next ${n} attacks deal 2× damage`,
      });
    }

    const hasPackBonus = ZONES.some(z => this.getAbilityForZone(z)?.packBonus);
    if (hasPackBonus) {
      const packCount = this.state.enemies().filter(x => !x.dead && x.type === e.type && x.id !== e.id).length;
      if (packCount > 0) {
        out.push({
          key: 'pack',
          tag: 'PACK',
          detail: `+${packCount} dmg on strike (${packCount} packmate${packCount > 1 ? 's' : ''} alive).`,
        });
      }
    }

    if (this.state.forcedEnemyTargetIdx() === this.index()) {
      out.push({
        key: 'focus',
        tag: 'FOCUS',
        detail: 'Heroes must target this unit next player round.',
      });
    }

    const cr = e.counterReflectPct;
    if (cr != null && cr > 0) {
      const pct = Math.round(cr);
      out.push({
        key: 'counter',
        tag: `C ${pct}%`,
        detail: `${pct}% chance to reflect the next hero damage attempt to the attacker.`,
      });
    }

    return out;
  });

  enemySvg = computed(() => enemyPortraitSvg(this.enemy().type));

  /** Enemy tray not yet revealed: whole ability panel reads as lit (dead cards skip this glow). */
  enemyAbilityPanelAwaitingRoll = computed(() => this.hideRoll() && !this.enemy().dead);

  /** Revealed enemy roll: dim every row except the matching zone. */
  enemyAbilityHighlightLocked = computed(() => !this.hideRoll() && !this.enemy().dead);

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
    const er = this.enemy().effRoll;
    if (er <= 0) return false;
    return this.dice.getEnemyZone(er) === zone;
  }

  onCardClick(): void {
    this.enemyClicked.emit();
  }
}
