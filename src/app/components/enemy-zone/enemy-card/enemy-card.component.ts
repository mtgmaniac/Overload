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
import { enemyUnitFrameColor } from '../../../data/unit-frame-colors';

@Component({
  selector: 'app-enemy-card',
  standalone: true,
  imports: [HpBarComponent, PortraitFrameComponent, AbilityRowComponent, BadgeZoneComponent, UnitStatusRibbonComponent],
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
    return this.dice.getEnemyZone(this.enemy().effRoll) === zone;
  }

  onCardClick(): void {
    this.enemyClicked.emit();
  }
}
