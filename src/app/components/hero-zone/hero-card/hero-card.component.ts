import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { HeroState } from '../../../models/hero.interface';
import { HeroAbility } from '../../../models/ability.interface';
import { DiceService } from '../../../services/dice.service';
import { GameStateService } from '../../../services/game-state.service';
import { TargetingService } from '../../../services/targeting.service';
import { HpBarComponent } from '../../shared/hp-bar/hp-bar.component';
import { PortraitFrameComponent } from '../../shared/portrait-frame/portrait-frame.component';
import { AbilityRowComponent } from '../../shared/ability-row/ability-row.component';
import { BadgeZoneComponent } from '../../shared/badge-zone/badge-zone.component';
import {
  UnitStatusRibbonComponent,
  UnitStatusRibbonLine,
} from '../../shared/unit-status-ribbon/unit-status-ribbon.component';
import { heroPortraitSvg } from '../../../data/sprites.data';
import { HERO_UNIT_FRAME_COLOR } from '../../../data/unit-frame-colors';

@Component({
  selector: 'app-hero-card',
  standalone: true,
  imports: [HpBarComponent, PortraitFrameComponent, AbilityRowComponent, BadgeZoneComponent, UnitStatusRibbonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-card.component.html',
  styleUrl: './hero-card.component.scss',
})
export class HeroCardComponent {
  private dice = inject(DiceService);
  private state = inject(GameStateService);
  private targeting = inject(TargetingService);

  hero = input.required<HeroState>();
  index = input.required<number>();
  isSelected = input<boolean>(false);
  pickMode = input<string | null>(null);
  hideRoll = input<boolean>(false);

  heroClicked = output<void>();
  allyPickClicked = output<void>();

  heroSvg = computed(() => heroPortraitSvg(this.hero().id, this.hero().portraitPath));

  /** Cower, cloak, taunt, counterspell seals — full text beside HP label. */
  heroStatusLines = computed((): UnitStatusRibbonLine[] => {
    this.state.tauntHeroId();
    const h = this.hero();
    const out: UnitStatusRibbonLine[] = [];
    if (h.currentHp <= 0) return out;
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
        detail: '',
      });
    }
    if (this.state.tauntHeroId() === h.id) {
      out.push({
        key: 'taunt',
        tag: 'TAUNT',
        detail: 'Enemies target you with attacks this turn.',
      });
    }
    const stacks = h.counterspellStacks || [];
    for (let i = 0; i < stacks.length; i++) {
      const s = stacks[i];
      if (!s || s.turnsLeft <= 0) continue;
      const z = s.zone.toUpperCase();
      out.push({
        key: `seal-${i}-${s.zone}`,
        tag: 'SEAL',
        detail: `${z} abilities fizzle this turn (${s.turnsLeft} player round${s.turnsLeft > 1 ? 's' : ''}).`,
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
    const pct = Math.min(100, (this.hero().hrs / 18) * 100);
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
      pm === 'itemAlly'
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
