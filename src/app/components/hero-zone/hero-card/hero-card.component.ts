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
import { HERO_FRAME_COLORS } from '../../../data/unit-frame-colors';

@Component({
  selector: 'app-hero-card',
  standalone: true,
  imports: [HpBarComponent, PortraitFrameComponent, AbilityRowComponent, BadgeZoneComponent, UnitStatusRibbonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hcard" [class.hcard-interactive]="hero().currentHp > 0 || pickMode() === 'revive' || pickMode() === 'itemAllyDead'"
         [class.hcard-cower]="(hero().cowerTurns || 0) > 0"
         [class.is-dead]="hero().currentHp <= 0"
         [class.hcard-selected]="isSelected()"
         [class.selectable-ally-pick]="pickMode() === 'heal' || pickMode() === 'shield' || pickMode() === 'rollBuff' || pickMode() === 'itemAlly'"
         [class.selectable-revive-pick]="pickMode() === 'revive' || pickMode() === 'itemAllyDead'"
         [attr.id]="tutorialDomId()"
         [style.border-color]="cardBorderColor()"
         (click)="onClick()">
      <!-- Ability panel -->
      <div class="ap">
        <div class="ap-title">ABILITIES</div>
        @for (ab of hero().abilities; track ab.name) {
          <app-ability-row [ability]="ab" [zone]="ab.zone" [rangeStr]="getRangeStr(ab)" [isCurrent]="isCurrentAbility(ab)" [tier]="hero().tier" />
        }
      </div>
      <!-- Bottom section: info + portrait -->
      <div class="hbot">
        <div class="info-col">
            <div>
            <div class="hname-row">
              <span class="hname">{{ hero().name }}</span>
            </div>
            <!-- Target line -->
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
            <app-hp-bar [current]="hero().currentHp" [max]="hero().maxHp">
              <div data-hp-aside>
                <app-unit-status-ribbon [lines]="heroStatusLines()" />
              </div>
            </app-hp-bar>
            <div class="xp-track" aria-hidden="true">
              @if (hero().tier === 1) {
                <div class="xp-bar"><div class="xp-f" [style.width]="xpWidth()"></div></div>
              }
            </div>
            <app-badge-zone kind="hero" [index]="index()" />
          </div>
        </div>
        <div class="sprite">
          <app-portrait-frame
            [svg]="heroSvg()"
            [isCloaked]="hero().cloaked"
            [anchorId]="'action-hero-' + index()" />
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
    .hcard {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100%;
      border-radius: var(--radius-pixel);
      background: var(--bg2);
      border-width: 1px;
      border-style: solid;
      border-color: var(--border);
      box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.4);
      touch-action: manipulation;
    }
    .hcard-interactive {
      cursor: pointer;
      z-index: 2;
    }
    .is-dead {
      opacity: .28;
    }
    .hcard-cower:not(.is-dead) {
      filter: saturate(0.72) brightness(0.92);
      box-shadow: inset 0 0 0 2px rgba(45, 40, 55, 0.85), 3px 3px 0 rgba(0, 0, 0, 0.4);
    }
    .selectable-ally-pick {
      cursor: pointer;
      box-shadow: inset 0 0 0 2px rgba(52, 210, 120, 0.65), inset 0 0 20px rgba(46, 196, 106, 0.1);
    }
    .selectable-revive-pick {
      cursor: pointer;
      box-shadow: inset 0 0 0 2px rgba(196, 140, 255, 0.7), inset 0 0 20px rgba(182, 123, 255, 0.12);
    }
    /* Selection uses inline border-color; inset ring stays visible */
    .hcard.hcard-selected {
      box-shadow: inset 0 0 0 2px rgba(100, 170, 255, 0.95), inset 0 0 28px rgba(46, 125, 212, 0.14);
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
    .hname-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      min-width: 0;
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
    }
    .xp-track {
      flex-shrink: 0;
      height: 11px;
      margin-top: 2px;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      box-sizing: border-box;
    }
    .xp-bar {
      width: 100%;
      height: 4px;
      background: #0a0e12;
      border: 1px solid #000;
      border-radius: var(--radius-pixel);
      overflow: hidden;
      margin: 0;
      box-sizing: border-box;
    }
    .xp-f {
      height: 100%;
      background: var(--cell);
      transition: width 0.25s steps(6, end);
    }
  `],
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
        detail: '80% dodge the next time an enemy hits you.',
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
    const h = this.hero();
    return h.frameColor ?? HERO_FRAME_COLORS[h.id];
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
