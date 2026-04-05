import { Injectable, computed, inject } from '@angular/core';
import { GameStateService } from './game-state.service';
import { DiceService } from './dice.service';
import { TutorialUiHighlight } from '../models/game-state.interface';
import { HeroState } from '../models/hero.interface';
import { EnemyState } from '../models/enemy.interface';
import { HeroAbility } from '../models/ability.interface';
import {
  TUTORIAL_INTRO_STEPS,
  TUTORIAL_HERO_ROLLS_R1,
  TUTORIAL_HERO_ROLLS_R2,
  TUTORIAL_ENEMY_PRE_R1,
  TUTORIAL_ENEMY_PRE_R2,
} from '../data/tutorial-steps.data';

const MEDIC_IDX = 2;

@Injectable({ providedIn: 'root' })
export class TutorialService {
  private state = inject(GameStateService);
  private dice = inject(DiceService);

  readonly introSteps = TUTORIAL_INTRO_STEPS;

  readonly highlightZone = computed((): TutorialUiHighlight => {
    const t = this.state.tutorial();
    if (!t?.active || t.introComplete || t.showComplete) return null;
    const step = TUTORIAL_INTRO_STEPS[t.introStep];
    return step?.highlight ?? null;
  });

  readonly coachPanelVisible = computed(() => {
    const t = this.state.tutorial();
    if (!t?.active || !t.introComplete || t.showTurn2Modal || t.showComplete) return false;
    const r1 = t.resolutions === 0 && t.coachStep >= 1 && t.coachStep <= 3;
    const r2 = t.resolutions === 1 && t.r2CoachStep >= 1 && t.r2CoachStep <= 4;
    return r1 || r2;
  });

  /**
   * Selectors whose bounding boxes are unioned for the spotlight hole.
   * Order: intro / modals / coach / default.
   */
  readonly spotlightSelectors = computed((): string[] => {
    const t = this.state.tutorial();
    if (!t?.active) return ['#tut-drone-card'];
    if (t.showComplete) return ['#tut-drone-card'];
    if (t.showTurn2Modal) return ['#tut-protocol-strip'];

    if (t.introComplete && t.resolutions === 0) {
      if (t.coachStep === 1) return ['#tut-hero-pulse', '#tut-drone-card'];
      if (t.coachStep === 2) return ['#tut-hero-shield', '#tut-hero-pulse', '#tut-hero-medic'];
      if (t.coachStep === 3) return ['#tut-hero-medic', '#tut-hero-pulse', '#tut-hero-shield'];
    }

    if (t.introComplete && t.resolutions === 1 && !t.showTurn2Modal) {
      switch (t.r2CoachStep) {
        case 1:
          return ['#tut-protocol-strip', '#protocol-nudge-btn', '#protocol-reroll-btn', '#tut-hero-medic'];
        case 2:
          return ['#tut-hero-medic', '#tut-hero-pulse', '#tut-hero-shield'];
        case 3:
          return ['#tut-hero-pulse', '#tut-drone-card'];
        case 4:
          return ['#tut-hero-shield', '#tut-drone-card'];
        default:
          break;
      }
    }

    if (!t.introComplete) {
      const h: TutorialUiHighlight = TUTORIAL_INTRO_STEPS[t.introStep]?.highlight ?? null;
      switch (h) {
        case 'enemy':
          return ['#tut-drone-card'];
        case 'heroes':
          return ['#tut-heroes-zone'];
        case 'dice':
          return ['#tut-dice-tray'];
        case 'protocol':
          return ['#tut-protocol-strip'];
        case 'mainRoll':
          return ['#tut-main-action'];
        default:
          return ['#tut-drone-card'];
      }
    }
    return ['#tut-drone-card'];
  });

  readonly tutorialModalOpen = computed(() => {
    const t = this.state.tutorial();
    if (!t?.active) return false;
    if (!t.introComplete) return true;
    if (t.showTurn2Modal) return true;
    if (t.showComplete) return true;
    return false;
  });

  readonly tutorialPointerWall = computed(() => {
    const t = this.state.tutorial();
    if (!t?.active) return false;
    if (!t.introComplete) return true;
    if (t.showTurn2Modal) return true;
    if (t.showComplete) return true;
    return false;
  });

  createInitialState() {
    return {
      active: true,
      introStep: 0,
      introComplete: false,
      resolutions: 0,
      showTurn2Modal: false,
      showComplete: false,
      coachStep: 0,
      r2CoachStep: 0,
    };
  }

  launch(): void {
    this.state.tutorial.set(this.createInitialState());
  }

  applyBattleTuning(): void {
    const t = this.state.tutorial();
    if (!t?.active) return;
    this.state.enemies.update(es =>
      es.map((e, i) =>
        i === 0 ? { ...e, maxHp: 160, currentHp: 160 } : e,
      ),
    );
    this.state.updateEnemy(0, {
      targeting: 'medic',
      dumbStickyId: 'medic',
    });
  }

  introNext(): void {
    this.state.tutorial.update(t => {
      if (!t?.active || t.introComplete) return t;
      const next = t.introStep + 1;
      if (next >= TUTORIAL_INTRO_STEPS.length) {
        return { ...t, introComplete: true, introStep: t.introStep };
      }
      return { ...t, introStep: next };
    });
  }

  introBack(): void {
    this.state.tutorial.update(t => {
      if (!t?.active || t.introComplete) return t;
      return { ...t, introStep: Math.max(0, t.introStep - 1) };
    });
  }

  dismissTurn2Modal(): void {
    this.state.tutorial.update(t => (t?.active ? { ...t, showTurn2Modal: false } : t));
  }

  /** After END TURN passes validation: clear any coach overlay still showing. */
  finishCoachOnEndTurn(): void {
    this.state.tutorial.update(t => {
      if (!t?.active) return t;
      let coachStep = t.coachStep;
      let r2CoachStep = t.r2CoachStep;
      if (t.resolutions === 0 && coachStep === 3) coachStep = 4;
      if (t.resolutions === 1 && r2CoachStep >= 1 && r2CoachStep <= 4) r2CoachStep = 5;
      if (coachStep === t.coachStep && r2CoachStep === t.r2CoachStep) return t;
      return { ...t, coachStep, r2CoachStep };
    });
  }

  notifyRollAllFinished(): void {
    const t = this.state.tutorial();
    if (!t?.active || !t.introComplete) return;
    if (t.resolutions === 0 && t.coachStep === 0) {
      this.state.tutorial.update(x => (x?.active ? { ...x, coachStep: 1 } : x));
      return;
    }
    if (t.resolutions === 1 && t.r2CoachStep === 0 && !t.showTurn2Modal) {
      this.state.tutorial.update(x => (x?.active ? { ...x, r2CoachStep: 1 } : x));
    }
  }

  /** Call after NUDGE or REROLL resolves on Medic during round 2 coach step 1. */
  recordR2ProtocolOnMedic(heroIdx: number): void {
    const t = this.state.tutorial();
    if (!t?.active || heroIdx !== MEDIC_IDX) return;
    if (t.resolutions !== 1 || t.showTurn2Modal || t.r2CoachStep !== 1) return;
    this.state.tutorial.update(x => (x?.active ? { ...x, r2CoachStep: 2 } : x));
    this.syncR2CoachProgress();
  }

  syncCoachAfterTargeting(): void {
    const t = this.state.tutorial();
    if (!t?.active || !t.introComplete) return;
    const heroes = this.state.heroes();
    const enemies = this.state.enemies();

    if (t.resolutions === 0) {
      if (t.coachStep === 1 && this.pulseDamageTargetSatisfied(heroes, enemies)) {
        this.state.tutorial.update(x => (x?.active ? { ...x, coachStep: 2 } : x));
      } else if (t.coachStep === 2 && this.shieldAllyTargetSatisfied(heroes)) {
        this.state.tutorial.update(x => (x?.active ? { ...x, coachStep: 3 } : x));
      } else if (t.coachStep === 3 && this.medicRollBuffTargetSatisfied(heroes)) {
        this.state.tutorial.update(x => (x?.active ? { ...x, coachStep: 4 } : x));
      }
    }

    this.syncR2CoachProgress();
  }

  syncR2CoachProgress(): void {
    const t = this.state.tutorial();
    if (!t?.active || t.resolutions !== 1 || t.showTurn2Modal) return;
    let s = t.r2CoachStep;
    for (let i = 0; i < 12; i++) {
      const prev = s;
      if (s === 2 && this.r2MedicHealSatisfied()) s = 3;
      if (s === 3 && this.r2PulseEnemySatisfied()) s = 4;
      if (s === 4 && this.r2ShieldEnemySatisfied()) s = 5;
      if (s === prev) break;
    }
    if (s !== t.r2CoachStep) {
      this.state.tutorial.update(x => (x ? { ...x, r2CoachStep: s } : x));
    }
  }

  private pulseDamageTargetSatisfied(heroes: HeroState[], enemies: EnemyState[]): boolean {
    for (let i = 0; i < heroes.length; i++) {
      const h = heroes[i];
      if (h.currentHp <= 0 || h.id !== 'pulse') continue;
      const er = this.dice.effRoll(h);
      if (er === null) continue;
      const ab = this.dice.getAbility(h, er);
      if (!ab || (ab.dmg || 0) <= 0) continue;
      const ei = h.lockedTarget;
      const tgtOk =
        ei !== undefined &&
        ei !== null &&
        enemies[ei] &&
        !enemies[ei].dead;
      return tgtOk;
    }
    return false;
  }

  private shieldAllyTargetSatisfied(heroes: HeroState[]): boolean {
    for (let i = 0; i < heroes.length; i++) {
      const h = heroes[i];
      if (h.currentHp <= 0 || h.id !== 'shield') continue;
      const er = this.dice.effRoll(h);
      if (er === null) continue;
      const ab = this.dice.getAbility(h, er);
      if (!ab || !ab.shTgt || (ab.shield || 0) <= 0) continue;
      return h.shTgtIdx != null;
    }
    return false;
  }

  private medicRollBuffTargetSatisfied(heroes: HeroState[]): boolean {
    for (let i = 0; i < heroes.length; i++) {
      const h = heroes[i];
      if (h.currentHp <= 0 || h.id !== 'medic') continue;
      const er = this.dice.effRoll(h);
      if (er === null) continue;
      const ab = this.dice.getAbility(h, er);
      if (!ab || !ab.rfmTgt || (ab.rfm || 0) <= 0) continue;
      return h.rfmTgtIdx != null;
    }
    return false;
  }

  private r2MedicHealSatisfied(): boolean {
    const heroes = this.state.heroes();
    for (let i = 0; i < heroes.length; i++) {
      const h = heroes[i];
      if (h.currentHp <= 0 || h.id !== 'medic') continue;
      const er = this.dice.effRoll(h);
      if (er === null) continue;
      const ab = this.dice.getAbility(h, er);
      if (!ab?.healTgt || (ab.heal || 0) <= 0 || h.healTgtIdx == null) continue;
      const ally = heroes[h.healTgtIdx];
      if (ally && ally.currentHp < ally.maxHp) return true;
    }
    return false;
  }

  private r2PulseEnemySatisfied(): boolean {
    return this.pulseDamageTargetSatisfied(this.state.heroes(), this.state.enemies());
  }

  /** Mirror of targeting needsEnemyPick for tutorial checks (no TargetingService dependency). */
  private abilityNeedsEnemyPick(ab: HeroAbility): boolean {
    if (ab.blastAll || ab.multiHit) return false;
    if (ab.splitDmg) return false;
    if ((ab.dmg || 0) > 0) return true;
    if ((ab.dot || 0) > 0) return true;
    if ((ab.rfe || 0) > 0 && !ab.rfeAll) return true;
    return false;
  }

  private r2ShieldEnemySatisfied(): boolean {
    const heroes = this.state.heroes();
    const enemies = this.state.enemies();
    for (let i = 0; i < heroes.length; i++) {
      const h = heroes[i];
      if (h.currentHp <= 0 || h.id !== 'shield') continue;
      const er = this.dice.effRoll(h);
      if (er === null) continue;
      const ab = this.dice.getAbility(h, er);
      if (!ab || !this.abilityNeedsEnemyPick(ab)) continue;
      const ei = h.lockedTarget;
      if (
        ei !== undefined &&
        ei !== null &&
        enemies[ei] &&
        !enemies[ei].dead
      ) {
        return true;
      }
    }
    return false;
  }

  readonly coachPulseHero = computed(() => this.state.heroes().find(h => h.id === 'pulse'));
  readonly coachShieldHero = computed(() => this.state.heroes().find(h => h.id === 'shield'));
  readonly coachMedicHero = computed(() => this.state.heroes().find(h => h.id === 'medic'));
  readonly coachPulseAbilityName = computed(() => {
    const h = this.coachPulseHero();
    if (!h || h.roll === null) return 'Arc Burst';
    return this.dice.getAbilityOrNull(h)?.name ?? 'Arc Burst';
  });
  readonly coachShieldAbilityName = computed(() => {
    const h = this.coachShieldHero();
    if (!h || h.roll === null) return 'Enforce';
    return this.dice.getAbilityOrNull(h)?.name ?? 'Enforce';
  });
  readonly coachMedicAbilityName = computed(() => {
    const h = this.coachMedicHero();
    if (!h || h.roll === null) return 'Diagnostic Pulse';
    return this.dice.getAbilityOrNull(h)?.name ?? 'Diagnostic Pulse';
  });
  readonly coachMedicRfmValue = computed(() => {
    const h = this.coachMedicHero();
    if (!h || h.roll === null) return 3;
    const ab = this.dice.getAbilityOrNull(h);
    return ab?.rfm ?? 3;
  });

  playerRound(): number {
    const t = this.state.tutorial();
    if (!t?.active) return 0;
    return t.resolutions === 0 ? 1 : 2;
  }

  getHeroRollPreset(heroIdx: number): number | null {
    const t = this.state.tutorial();
    if (!t?.active || !t.introComplete) return null;
    const map = t.resolutions === 0 ? TUTORIAL_HERO_ROLLS_R1 : TUTORIAL_HERO_ROLLS_R2;
    const v = map[heroIdx];
    return v === undefined ? null : v;
  }

  forcedRerollForHero(heroIdx: number): { rawRoll: number; displayRoll: number } | null {
    const t = this.state.tutorial();
    if (!t?.active || !t.introComplete) return null;
    if (this.playerRound() !== 2 || heroIdx !== MEDIC_IDX) return null;
    const h = this.state.heroes()[heroIdx];
    if (!h || h.id !== 'medic') return null;
    return { rawRoll: 5, displayRoll: 5 };
  }

  getTutorialEnemyPreRoll(): number | null {
    const t = this.state.tutorial();
    if (!t?.active || !t.introComplete) return null;
    return t.resolutions === 0 ? TUTORIAL_ENEMY_PRE_R1 : TUTORIAL_ENEMY_PRE_R2;
  }

  validateBeforePlayerResolve(): string | null {
    const t = this.state.tutorial();
    if (!t?.active || !t.introComplete) return null;

    const heroes = this.state.heroes();
    const enemies = this.state.enemies();
    const dice = this.dice;

    const round = this.playerRound();

    if (round === 1) {
      let hasDmg = false;
      let hasShield = false;
      let hasMedicRfm = false;
      for (let i = 0; i < heroes.length; i++) {
        const h = heroes[i];
        if (h.currentHp <= 0) continue;
        const er = dice.effRoll(h);
        if (er === null) continue;
        const ab = dice.getAbility(h, er);
        if (!ab) continue;
        const ei = h.lockedTarget;
        const tgtOk =
          ei !== undefined &&
          ei !== null &&
          enemies[ei] &&
          !enemies[ei].dead;
        if (h.id === 'pulse' && (ab.dmg || 0) > 0 && tgtOk) hasDmg = true;
        if (h.id === 'shield' && ab.shTgt && (ab.shield || 0) > 0 && h.shTgtIdx != null) hasShield = true;
        if (h.id === 'medic' && ab.rfmTgt && (ab.rfm || 0) > 0 && h.rfmTgtIdx != null) hasMedicRfm = true;
      }
      if (!hasDmg) return 'Tutorial: deal damage to the drone with Pulse Tech (strike roll).';
      if (!hasShield) return 'Tutorial: shield an ally with Aegis Disruptor (strike roll).';
      if (!hasMedicRfm) {
        return 'Tutorial: assign Systems Medic’s +roll (Diagnostic Pulse) to an ally.';
      }
      return null;
    }

    if (round === 2) {
      if (t.r2CoachStep === 1) {
        return 'Tutorial: spend Protocol on Systems Medic — tap NUDGE (+5 roll, 1 Protocol) or REROLL (2 Protocol), then their card.';
      }
      let hasHeal = false;
      let hasPulse = false;
      let hasShieldTgt = false;
      for (let i = 0; i < heroes.length; i++) {
        const h = heroes[i];
        if (h.currentHp <= 0) continue;
        const er = dice.effRoll(h);
        if (er === null) continue;
        const ab = dice.getAbility(h, er);
        if (!ab) continue;
        const ei = h.lockedTarget;
        const tgtOk =
          ei !== undefined &&
          ei !== null &&
          enemies[ei] &&
          !enemies[ei].dead;
        if (h.id === 'medic' && ab.healTgt && (ab.heal || 0) > 0 && h.healTgtIdx != null) {
          const ally = heroes[h.healTgtIdx];
          if (ally && ally.currentHp < ally.maxHp) hasHeal = true;
        }
        if (h.id === 'pulse' && (ab.dmg || 0) > 0 && tgtOk) hasPulse = true;
        if (h.id === 'shield' && this.abilityNeedsEnemyPick(ab) && tgtOk) hasShieldTgt = true;
      }
      if (!hasHeal) {
        return 'Tutorial: Systems Medic needs Infusion — heal an ally who is not at full HP.';
      }
      if (!hasPulse) return 'Tutorial: finish Pulse Tech’s ability with a target on the drone.';
      if (!hasShieldTgt) return 'Tutorial: finish Aegis Disruptor’s ability with a target on the drone.';
      return null;
    }

    return null;
  }
}
