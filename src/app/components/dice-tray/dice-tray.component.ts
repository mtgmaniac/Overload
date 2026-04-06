import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  viewChildren,
  ElementRef,
  afterNextRender,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GameStateService } from '../../services/game-state.service';
import { DiceService } from '../../services/dice.service';
import { CombatService } from '../../services/combat.service';
import { ProtocolService } from '../../services/protocol.service';
import {
  RerollAnimationRequestService,
  RerollAnimationPayload,
} from '../../services/reroll-animation-request.service';
import { HeroState } from '../../models/hero.interface';
import { EnemyState } from '../../models/enemy.interface';
import { DieComponent } from './die/die.component';
import { D20_ROLL_CELLS } from './die/d20-sprite';
import { TutorialService } from '../../services/tutorial.service';

const ANIM_TICK_MS = 72;
const PIXEL_SNAP = 4;
const ANIM_STEPS = 8;
const ANIM_REVEAL_STEP = 6;
/** Default / max reference width; roll jitter uses measured tray width. */
const TRAY_INNER_W = 736;
/** Row height for dice band; slack matches frame + mid-bar padding for even vertical rhythm. */
const ROW_H = 80;
const DIE_W = 78;
const DIE_H = 78;
/** Horizontal drift during tumble (px); snaps back to slot on reveal. */
const ROLL_DRIFT_TOTAL = 43;

interface PrecomputedRoll {
  heroIdx: number;
  finalRoll: number;
}

interface PrecomputedEnemyRoll {
  enemyIdx: number;
  preRoll: number;
  /** Effective roll after enemy rfe (for face during reveal) */
  displayEff: number;
}

interface JitterPos {
  left: string;
  top: string;
}

@Component({
  selector: 'app-dice-tray',
  standalone: true,
  imports: [DieComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dice-tray.component.html',
  styleUrl: './dice-tray.component.scss',
})
export class DiceTrayComponent {
  state = inject(GameStateService);
  private dice = inject(DiceService);
  private combat = inject(CombatService);
  private protocol = inject(ProtocolService);
  tutorial = inject(TutorialService);
  private rerollRequests = inject(RerollAnimationRequestService);
  private host = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);

  ANIM_REVEAL_STEP = ANIM_REVEAL_STEP;
  /** Visible tray width — drives roll jitter bounds on narrow screens. */
  trayWidth = signal(TRAY_INNER_W);

  heroDieRefs = viewChildren<DieComponent>('heroDie');

  constructor() {
    this.rerollRequests.requests$.pipe(takeUntilDestroyed()).subscribe(p => this.playRerollAnimation(p));

    afterNextRender(() => {
      const wrap = this.host.nativeElement.querySelector('.dice-tray-wrap') as HTMLElement | null;
      if (!wrap) return;
      const apply = () => {
        const w = Math.round(wrap.getBoundingClientRect().width);
        this.trayWidth.set(Math.max(240, w));
      };
      apply();
      const ro = new ResizeObserver(() => apply());
      ro.observe(wrap);
      this.destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  /** Stable id is not enough after evolution — include stats so tray rows reconcile with hero cards. */
  trayHeroTrack(hero: HeroState): string {
    return `${hero.id}:${hero.tier}:${hero.maxHp}:${hero.name}`;
  }

  // ── Animation state ──
  isAnimating = signal(false);
  animStep = signal(0);
  /** Protocol reroll: this slot jitters even though `roll` is already set */
  rerollingHeroIdx = signal<number | null>(null);

  heroAnimDisplays = signal<(string | null)[]>([]);
  enemyAnimDisplays = signal<(string | null)[]>([]);
  heroAnimSpriteCells = signal<({ c: number; r: number } | null)[]>([]);
  enemyAnimSpriteCells = signal<({ c: number; r: number } | null)[]>([]);

  /** Random positions for each hero die slot during jitter phase */
  heroJitter = signal<(JitterPos | null)[]>([]);
  /** Random positions for each enemy die slot during jitter phase */
  enemyJitter = signal<(JitterPos | null)[]>([]);

  /** Jitter/reveal layout for whole tray — off during protocol reroll so other dice stay in grid. */
  fullTrayRollPhase = computed(
    () => this.isAnimating() && this.animStep() < this.ANIM_REVEAL_STEP && this.rerollingHeroIdx() === null,
  );

  /** Match enemy-zone: hide enemy faces until squad is fully rolled, tray is revealed, and roll-all anim finished (not solo reroll). */
  hideEnemyRolls = computed(() => {
    if (this.state.phase() !== 'player') return false;
    if (!this.state.allHeroesRolled()) return true;
    if (this.isAnimating() && this.rerollingHeroIdx() === null) return true;
    return !this.state.enemyTrayRevealed();
  });

  /** Green pulse on END TURN only when squad is fully targeted (same gate as enabling the button). */
  endTurnReadyGlow = computed(
    () =>
      this.state.allHeroesReady() &&
      this.state.phase() === 'player' &&
      !this.isAnimating() &&
      !this.tutorial.tutorialModalOpen(),
  );

  // ── Roll animation ──

  onRollAll(): void {
    if (this.state.phase() !== 'player' || this.state.rollAllInProgress() || this.isAnimating()) return;

    const heroes = this.state.heroes();
    const enemies = this.state.enemies();

    const heroRolls: PrecomputedRoll[] = [];
    for (let i = 0; i < heroes.length; i++) {
      const h = heroes[i];
      if (h.currentHp <= 0 || (h.cowerTurns || 0) > 0 || h.roll !== null) continue;
      const preset = this.tutorial.getHeroRollPreset(i);
      let raw = preset ?? this.dice.d20();
      const rfmPen = this.state.combinedHeroRawRfmPenalty(i);
      if (rfmPen > 0) raw = Math.max(1, raw - rfmPen);
      heroRolls.push({ heroIdx: i, finalRoll: raw });
    }

    const tutEnemyPre = this.tutorial.getTutorialEnemyPreRoll();
    const enemyRolls: PrecomputedEnemyRoll[] = [];
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      const preRoll = tutEnemyPre ?? this.dice.d20();
      const displayEff = Math.min(20, Math.max(1, preRoll - (e.rfe || 0) + (e.rollBuff || 0)));
      enemyRolls.push({ enemyIdx: i, preRoll, displayEff });
    }

    if (!heroRolls.length && !enemyRolls.length) return;

    this.runMultiDieAnimation({
      heroes,
      enemies,
      heroRolls,
      enemyRolls,
      rerollHeroIdx: null,
      progressFlag: 'rollAll',
      onFinished: () => {
        for (const hr of heroRolls) {
          this.state.updateHero(hr.heroIdx, {
            roll: hr.finalRoll,
            rawRoll: hr.finalRoll,
            noRR: true,
          });
          this.combat.clearAndAutoTarget(hr.heroIdx);
        }
        if (enemyRolls.length) {
          this.combat.applyEnemyAbilityRollsFromPreRolls(
            enemyRolls.map(er => ({ enemyIndex: er.enemyIdx, preRoll: er.preRoll })),
          );
        }
        this.state.enemyTrayRevealed.set(true);
        this.tutorial.notifyRollAllFinished();
      },
    });
  }

  private playRerollAnimation(p: RerollAnimationPayload): void {
    if (this.state.phase() !== 'player' || this.isAnimating()) return;
    const rolled = this.protocol.drawRerollForAnimation(p.heroIdx);
    if (!rolled) return;
    const heroes = this.state.heroes();
    const enemies = this.state.enemies();
    const hi = p.heroIdx;

    this.runMultiDieAnimation({
      heroes,
      enemies,
      heroRolls: [{ heroIdx: hi, finalRoll: rolled.displayRoll }],
      enemyRolls: [],
      rerollHeroIdx: hi,
      progressFlag: 'rollAnim',
      onFinished: () => {
        this.protocol.commitReroll(hi, rolled.rawRoll, rolled.displayRoll);
        this.combat.clearAndAutoTarget(hi);
      },
    });
  }

  private runMultiDieAnimation(args: {
    heroes: HeroState[];
    enemies: EnemyState[];
    heroRolls: PrecomputedRoll[];
    enemyRolls: PrecomputedEnemyRoll[];
    rerollHeroIdx: number | null;
    progressFlag: 'rollAll' | 'rollAnim';
    onFinished: () => void;
  }): void {
    const { heroes, enemies, heroRolls, enemyRolls, rerollHeroIdx, progressFlag, onFinished } = args;
    if (this.isAnimating()) return;

    this.isAnimating.set(true);
    this.rerollingHeroIdx.set(rerollHeroIdx);
    if (progressFlag === 'rollAll') this.state.rollAllInProgress.set(true);
    else this.state.rollAnimInProgress.set(true);

    const rollingHeroSet = new Set(heroRolls.map(r => r.heroIdx));
    const rollingEnemySet = new Set(enemyRolls.map(r => r.enemyIdx));

    let step = 0;

    const interval = setInterval(() => {
      step++;
      this.animStep.set(step);

      const heroDisplays: (string | null)[] = heroes.map(() => null);
      const enemyDisplays: (string | null)[] = enemies.map(() => null);
      const heroSprites: ({ c: number; r: number } | null)[] = heroes.map(() => null);
      const enemySprites: ({ c: number; r: number } | null)[] = enemies.map(() => null);

      if (step < ANIM_REVEAL_STEP) {
        const rollPhaseSpan = ANIM_REVEAL_STEP - 1;
        const rollProgress = rollPhaseSpan > 0 ? (step - 1) / rollPhaseSpan : 0;
        const fi = Math.min(
          D20_ROLL_CELLS.length - 1,
          Math.round(rollProgress * (D20_ROLL_CELLS.length - 1)),
        );
        const [sc, sr] = D20_ROLL_CELLS[fi];
        const cell = { c: sc, r: sr };
        for (const hr of heroRolls) {
          heroDisplays[hr.heroIdx] = null;
          heroSprites[hr.heroIdx] = cell;
        }
        for (const er of enemyRolls) {
          enemyDisplays[er.enemyIdx] = null;
          enemySprites[er.enemyIdx] = cell;
        }

        const rowW = this.trayWidth();
        const drift = this.snapTrayPx(rollProgress * ROLL_DRIFT_TOTAL);
        const topPx = this.dieRollTopPx();

        const hJitter: (JitterPos | null)[] =
          rerollHeroIdx !== null
            ? heroes.map(() => null)
            : heroes.map((_, i) => {
                if (!rollingHeroSet.has(i)) return null;
                const home = this.heroDieHomeLeft(i, rowW);
                return { left: home + drift + 'px', top: topPx + 'px' };
              });

        const eJitter: (JitterPos | null)[] =
          rerollHeroIdx !== null
            ? enemies.map(() => null)
            : enemies.map((e, i) => {
                if (!rollingEnemySet.has(i) || e.dead) return null;
                const home = this.enemyDieHomeLeft(i, rowW, enemies);
                return { left: home + drift + 'px', top: topPx + 'px' };
              });

        this.heroJitter.set(hJitter);
        this.enemyJitter.set(eJitter);
      } else {
        for (const hr of heroRolls) {
          const hx = heroes[hr.heroIdx];
          const eff = Math.min(
            20,
            hr.finalRoll + (hx.rollBuff || 0) + (hx.rollNudge || 0),
          );
          heroDisplays[hr.heroIdx] = String(eff);
        }
        for (const er of enemyRolls) {
          enemyDisplays[er.enemyIdx] = String(er.displayEff);
        }

        this.heroJitter.set([]);
        this.enemyJitter.set([]);

        if (step === ANIM_REVEAL_STEP) {
          const dieRefs = this.heroDieRefs();
          for (const hr of heroRolls) {
            dieRefs[hr.heroIdx]?.triggerBounce();
          }
        }
      }

      this.heroAnimDisplays.set(heroDisplays);
      this.enemyAnimDisplays.set(enemyDisplays);
      this.heroAnimSpriteCells.set(heroSprites);
      this.enemyAnimSpriteCells.set(enemySprites);

      if (step >= ANIM_STEPS) {
        clearInterval(interval);

        setTimeout(() => {
          this.heroAnimDisplays.set([]);
          this.enemyAnimDisplays.set([]);
          this.heroAnimSpriteCells.set([]);
          this.enemyAnimSpriteCells.set([]);
          this.heroJitter.set([]);
          this.enemyJitter.set([]);
          this.rerollingHeroIdx.set(null);
          this.animStep.set(0);

          onFinished();

          if (progressFlag === 'rollAll') this.state.rollAllInProgress.set(false);
          else this.state.rollAnimInProgress.set(false);
          this.isAnimating.set(false);
        }, 150);
      }
    }, ANIM_TICK_MS);
  }

  onRollHero(i: number): void {
    if (this.isAnimating()) return;
    this.combat.rollHero(i);
  }

  onEndTurn(): void {
    if (this.isAnimating()) return;
    this.combat.endTurn();
  }

  private snapTrayPx(v: number): number {
    return Math.round(v / PIXEL_SNAP) * PIXEL_SNAP;
  }

  private dieRollTopPx(): number {
    return this.snapTrayPx(Math.max(0, (ROW_H - DIE_H) / 2));
  }

  /** Matches squad grid: three columns, die centered in each cell. */
  private heroDieHomeLeft(heroIdx: number, rowW: number): number {
    const cols = 3;
    const slotW = rowW / cols;
    const col = heroIdx % cols;
    return this.snapTrayPx(col * slotW + slotW / 2 - DIE_W / 2);
  }

  /** Matches enemy row layout (spread grid or centered pair/single). */
  private enemyDieHomeLeft(enemyIdx: number, rowW: number, enemies: EnemyState[]): number {
    const livingIndices = enemies
      .map((en, idx) => (!en.dead ? idx : -1))
      .filter((idx): idx is number => idx >= 0);
    const posInBand = livingIndices.indexOf(enemyIdx);
    if (posInBand < 0) return 0;

    if (enemies.length >= 3) {
      const cols = 3;
      const slotW = rowW / cols;
      const col = enemyIdx % cols;
      return this.snapTrayPx(col * slotW + slotW / 2 - DIE_W / 2);
    }

    const n = livingIndices.length;
    if (n === 1) {
      return this.snapTrayPx(rowW / 2 - DIE_W / 2);
    }
    const gap = 12;
    const totalW = DIE_W * n + gap * (n - 1);
    const start = rowW / 2 - totalW / 2;
    return this.snapTrayPx(start + posInBand * (DIE_W + gap));
  }

  // ── Display helpers ──

  getHeroDisplayRoll(hero: HeroState): number | null {
    if (hero.currentHp <= 0 || hero.roll === null) return null;
    return this.dice.effRoll(hero);
  }

  getHeroDisplayText(hero: HeroState): string | null {
    if (hero.currentHp <= 0 || hero.roll === null) return null;
    const er = this.dice.effRoll(hero);
    return er === null ? null : String(er);
  }

}
