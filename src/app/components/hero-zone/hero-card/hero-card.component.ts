import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { HeroState } from '../../../models/hero.interface';
import { HeroAbility } from '../../../models/ability.interface';
import { DiceService } from '../../../services/dice.service';
import { GameStateService } from '../../../services/game-state.service';
import { TargetingService } from '../../../services/targeting.service';
import { GearService } from '../../../services/gear.service';
import type { GearDefinition } from '../../../models/gear.interface';
import { HpBarComponent } from '../../shared/hp-bar/hp-bar.component';
import { PortraitFrameComponent } from '../../shared/portrait-frame/portrait-frame.component';
import { AbilityRowComponent } from '../../shared/ability-row/ability-row.component';
import { BadgeZoneComponent } from '../../shared/badge-zone/badge-zone.component';
import type { UnitStatusRibbonLine } from '../../shared/unit-status-ribbon/unit-status-ribbon.component';
import { heroPortraitSvg } from '../../../data/sprites.data';
import { HERO_UNIT_FRAME_COLOR } from '../../../data/unit-frame-colors';

@Component({
  selector: 'app-hero-card',
  standalone: true,
  imports: [HpBarComponent, PortraitFrameComponent, AbilityRowComponent, BadgeZoneComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-card.component.html',
  styleUrl: './hero-card.component.scss',
})
export class HeroCardComponent {
  private dice = inject(DiceService);
  private state = inject(GameStateService);
  private targeting = inject(TargetingService);
  private gearService = inject(GearService);

  hero = input.required<HeroState>();
  index = input.required<number>();
  isSelected = input<boolean>(false);
  pickMode = input<string | null>(null);
  hideRoll = input<boolean>(false);

  heroClicked = output<void>();
  allyPickClicked = output<void>();

  heroSvg = computed(() => heroPortraitSvg(this.hero().id, this.hero().portraitPath));

  gearDef = computed((): GearDefinition | null => this.gearService.getHeroGearDef(this.index()));

  gearTooltip = computed((): string => {
    const g = this.gearDef();
    return g ? `GEAR: ${g.name} — ${g.desc}` : 'No gear equipped';
  });

  /** Status chips beside HP; full text on hover. */
  heroStatusLines = computed((): UnitStatusRibbonLine[] => {
    this.state.tauntHeroId();
    const h = this.hero();
    const out: UnitStatusRibbonLine[] = [];
    if (h.currentHp <= 0) return out;
    if ((h.rampageCharges || 0) > 0) {
      const n = h.rampageCharges;
      out.push({
        key: 'rampage',
        tag: 'RAMPAGE',
        detail: `Deals double damage on next ${n} attack${n > 1 ? 's' : ''} (${n} charge${n > 1 ? 's' : ''}).`,
      });
    }
    if ((h.cowerTurns || 0) > 0) {
      out.push({
        key: 'cower',
        tag: 'COWER',
        detail: 'You skip your actions this player round.',
      });
    }
    if (h.cloaked) {
      out.push({
        key: 'cloak',
        tag: 'CLOAK',
        detail: 'Enemy attacks may miss; cloak clears after the next attack resolves (hit or miss).',
      });
    }
    if (this.state.tauntHeroId() === h.id) {
      out.push({
        key: 'taunt',
        tag: 'TAUNT',
        detail: 'Enemies target you with attacks this turn.',
      });
    }
    if (h.cursed) {
      out.push({
        key: 'cursed',
        tag: 'CURSED',
        detail: '',
        tooltip:
          h.roll !== null
            ? 'Cursed dice resolved this turn (lower roll kept).'
            : 'You roll twice and keep the lower result.',
      });
    }
    return out;
  });

  cardBorderColor = computed(() => {
    if (this.isSelected()) return 'rgba(100, 175, 255, 0.95)';
    return HERO_UNIT_FRAME_COLOR;
  });

  /** Stable DOM ids for tutorial spotlights (tutorial squad uses each id at most once). */
  tutorialDomId = computed((): string | null => {
    switch (this.hero().id) {
      case 'pulse':
        return 'tut-hero-pulse';
      case 'shield':
        return 'tut-hero-shield';
      case 'medic':
        return 'tut-hero-medic';
      default:
        return null;
    }
  });

  targetLine = computed(() => {
    this.state.heroes();
    this.state.enemies();
    this.hero();
    return this.targeting.getHeroTargetLineView(this.index());
  });

  xpWidth = computed(() => {
    const pct = Math.min(100, (this.hero().xp / 18) * 100);
    return pct + '%';
  });

  /** After the d20 is set, non-matching ability rows dim; before roll, the whole panel stays lit. */
  abilityHighlightLocked = computed(() => this.dice.effRoll(this.hero()) !== null);

  isCurrentAbility(ab: HeroAbility): boolean {
    const h = this.hero();
    const er = this.dice.effRoll(h);
    if (er === null) return false;
    return er >= ab.range[0] && er <= ab.range[1];
  }

  getRangeStr(ab: HeroAbility): string {
    return ab.range[0] === ab.range[1] ? `${ab.range[0]}` : `${ab.range[0]}-${ab.range[1]}`;
  }

  onClick(): void {
    const hi = this.index();
    const pm = this.pickMode();
    if (
      pm === 'heal' ||
      pm === 'shield' ||
      pm === 'rollBuff' ||
      pm === 'revive' ||
      pm === 'freezeDice' ||
      pm === 'itemAlly' ||
      pm === 'itemAllyDead'
    ) {
      this.allyPickClicked.emit();
      return;
    }
    if (this.targeting.shouldCasterRetapResetTargeting(hi)) {
      this.heroClicked.emit();
      return;
    }
    this.heroClicked.emit();
  }
}
