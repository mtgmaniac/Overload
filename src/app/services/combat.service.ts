import { Injectable } from '@angular/core';
import { EnemyAbility } from '../models/ability.interface';
import {
  type EnemyDefinition,
  EnemyState,
  createEnemyState,
  enemyRfeFromStacks,
  tickEnemyRfeStacks,
} from '../models/enemy.interface';
import { HeroState } from '../models/hero.interface';
import { Zone } from '../models/types';
import {
  battleModeConfig,
  battleCountForMode,
  battlesForMode,
  DEFAULT_SUMMON_GRUNTS,
} from '../data/battle-modes.data';
import { GameStateService } from './game-state.service';
import { EnemyContentService } from './enemy-content.service';
import { DiceService } from './dice.service';
import { TargetingService } from './targeting.service';
import { AnimationService, STEP_MS, SUBFLASH_MS } from './animation.service';
import { LogService } from './log.service';
import { ProtocolService } from './protocol.service';
import { EvolutionService } from './evolution.service';
import { TutorialService } from './tutorial.service';
import { ItemService } from './item.service';
import { PortraitPreloadService } from './portrait-preload.service';

@Injectable({ providedIn: 'root' })
export class CombatService {
  constructor(
    private state: GameStateService,
    private dice: DiceService,
    private targeting: TargetingService,
    private anim: AnimationService,
    private log: LogService,
    private protocol: ProtocolService,
    private evolution: EvolutionService,
    private tutorial: TutorialService,
    private enemyContent: EnemyContentService,
    private items: ItemService,
    private portraitPreload: PortraitPreloadService,
  ) {}

  // ── Enemy ability resolution ──

  getEnemyAbility(e: EnemyState, zone: Zone): EnemyAbility {
    const suite = this.enemyContent.suiteFor(e.type);
    const base = suite[zone];
    if (!base) return { name: '?', eff: '—', dmg: 0, dot: 0, dT: 0, heal: 0, rfe: 0, shield: 0 };
    const ab: EnemyAbility = { ...base };
    const scale = e.dmgScale || 1;
    if (ab.dmg > 0) ab.dmg = Math.round(ab.dmg * scale);
    if (ab.dmgP2 && ab.dmgP2 > 0) ab.dmgP2 = Math.round(ab.dmgP2 * scale);
    if (ab.dot > 0) ab.dot = Math.round(ab.dot * scale);
    if (ab.heal > 0) ab.heal = Math.round(ab.heal * scale);
    if (ab.shield > 0) ab.shield = Math.round(ab.shield * scale);
    if (ab.rfm && ab.rfm > 0) ab.rfm = Math.round(ab.rfm * scale);
    if ((ab.shieldAlly || 0) > 0) ab.shieldAlly = Math.round((ab.shieldAlly || 0) * scale);
    // Phase 2 boss damage override
    if (e.p2 && ab.dmgP2) ab.dmg = ab.dmgP2;
    return ab;
  }

  /** Commit a raw d20 for one enemy (after debuff); updates zone + plan. */
  applyEnemyAbilityRoll(idx: number, preRoll: number): void {
    const e = this.state.enemies()[idx];
    if (!e || e.dead) return;
    const effR = Math.min(20, Math.max(1, preRoll - (e.rfe || 0) + (e.rollBuff || 0)));
    const zone = this.dice.getEnemyZone(effR);
    const plan = this.getEnemyAbility(e, zone);
    plan.zone = zone;
    this.state.updateEnemy(idx, {
      preRoll,
      effRoll: effR,
      curZone: zone,
      plan,
    });
  }

  rollEnemyAbility(idx: number): void {
    this.applyEnemyAbilityRoll(idx, this.dice.d20());
  }

  /** Clear queued enemy abilities until the squad roll reveals them. */
  clearEnemyPlansForNextPlayerRound(): void {
    this.state.enemies().forEach((e, i) => {
      if (e.dead) return;
      this.state.updateEnemy(i, {
        preRoll: 0,
        effRoll: 0,
        curZone: 'recharge',
        plan: null,
      });
    });
  }

  /** Roll fresh enemy plans when all squad dice are set (individual clicks, no tray anim). */
  rollFreshEnemyPlansForReveal(): void {
    const enemies = this.state.enemies();
    for (let i = 0; i < enemies.length; i++) {
      if (!enemies[i].dead) this.applyEnemyAbilityRoll(i, this.dice.d20());
    }
    this.targeting.assignTargets();
  }

  /** Apply precomputed d20s from the tray animation, then refresh targeting. */
  applyEnemyAbilityRollsFromPreRolls(pairs: { enemyIndex: number; preRoll: number }[]): void {
    for (const { enemyIndex, preRoll } of pairs) {
      this.applyEnemyAbilityRoll(enemyIndex, preRoll);
    }
    this.targeting.assignTargets();
  }

  recomputeEnemy(idx: number): void {
    const e = this.state.enemies()[idx];
    const effR = Math.min(20, Math.max(1, e.preRoll - (e.rfe || 0) + (e.rollBuff || 0)));
    const zone = this.dice.getEnemyZone(effR);
    const plan = this.getEnemyAbility(e, zone);
    plan.zone = zone;
    this.state.updateEnemy(idx, { effRoll: effR, curZone: zone, plan });
    this.targeting.assignTargets();
  }

  private async pulseHeroPortrait(i: number, cls: string): Promise<void> {
    const el = this.anim.heroPortraitEl(i);
    if (!el || !this.state.animOn()) return;
    await this.anim.pfPulse(el, cls, SUBFLASH_MS);
    await this.anim.paceBetweenSteps();
  }

  private async pulseEnemyPortrait(i: number, cls: string): Promise<void> {
    const el = this.anim.enemyPortraitEl(i);
    if (!el || !this.state.animOn()) return;
    await this.anim.pfPulse(el, cls, SUBFLASH_MS);
    await this.anim.paceBetweenSteps();
  }

  /** True if this hero’s rolled ability zone is counterspelled (ability fizzles — no damage, heal, etc.). */
  private heroAbilityCounterspelled(h: HeroState, abilityZone: Zone): boolean {
    return (h.counterspellStacks || []).some(s => s.zone === abilityZone && s.turnsLeft > 0);
  }

  /** One hero’s END TURN resolution with staggered highlights (caster → targets, left → right). */
  private async resolveHeroEndTurnWithActionPacing(hi: number): Promise<void> {
    const h = this.state.heroes()[hi];
    if (h.currentHp <= 0) return;
    if ((h.cowerTurns || 0) > 0) {
      await this.anim.gapBetweenActors();
      this.log.log(`▸ ${h.name} is paralyzed by fear — no action.`, 'bl');
      return;
    }
    const er = this.dice.effRoll(h);
    if (er === null) return;
    const ab = this.dice.getAbility(h, er);
    if (!ab) return;

    await this.anim.gapBetweenActors();
    await this.anim.pfShake(this.anim.heroPortraitEl(hi));

    if (this.heroAbilityCounterspelled(h, ab.zone)) {
      const z = ab.zone.toUpperCase();
      this.log.log(`▸ ${h.name} → ${ab.name} fizzles! Counterspell (${z} tier sealed).`, 'bl');
      return;
    }

    const enemies = this.state.enemies();
    const tgtIdx = h.lockedTarget !== undefined && h.lockedTarget !== null ? h.lockedTarget : 0;
    const tgtE = enemies[tgtIdx];

    if (ab.revive) {
      const dead = this.state.heroes().map((x, idx) => ({ x, idx })).filter(z => z.x.currentHp <= 0);
      const ti = h.reviveTgtIdx != null ? h.reviveTgtIdx : (dead[0]?.idx ?? null);
      if (ti != null) {
        const tgt = this.state.heroes()[ti];
        if (tgt && tgt.currentHp <= 0) {
          await this.pulseHeroPortrait(ti, 'pf-flash-green');
          const revHp = Math.max(1, Math.round(tgt.maxHp * 0.5));
          this.state.updateHero(ti, {
            currentHp: revHp,
            dot: 0,
            dT: 0,
            shield: 0,
            shT: 0,
            roll: null,
            rawRoll: null,
            confirmed: false,
            lockedTarget: undefined,
            healTgtIdx: null,
            shTgtIdx: null,
            rfmTgtIdx: null,
            reviveTgtIdx: null,
            splitAlloc: {},
            cowerTurns: 0,
          });
          this.targeting.clearHeroTargetingOnRollChange(ti);
          this.log.log(`▸ ${h.name} → ${ab.name}. Revived ${tgt.name} at ${revHp}/${tgt.maxHp} HP.`, 'pl');
        }
      }
    }

    if (ab.shieldAll && (ab.shield || 0) > 0) {
      const n = this.state.heroes().length;
      for (let idx = 0; idx < n; idx++) {
        const x = this.state.heroes()[idx];
        if (x.currentHp <= 0) continue;
        await this.pulseHeroPortrait(idx, 'pf-flash-blue');
        this.state.updateHero(idx, { shield: (x.shield || 0) + (ab.shield || 0), shT: ab.shT || 2 });
      }
      this.log.log(`▸ ${h.name} → ${ab.name}. +${ab.shield} shield (all allies).`, 'pl');
    }

    if (ab.healAll && (ab.heal || 0) > 0) {
      const n = this.state.heroes().length;
      for (let idx = 0; idx < n; idx++) {
        const x = this.state.heroes()[idx];
        if (x.currentHp <= 0 || x.currentHp >= x.maxHp) continue;
        await this.pulseHeroPortrait(idx, 'pf-flash-green');
        this.state.updateHero(idx, { currentHp: Math.min(x.maxHp, x.currentHp + ab.heal) });
      }
      this.log.log(`▸ ${h.name} → ${ab.name}. +${ab.heal} HP (all allies).`, 'pl');
    }

    if (ab.shTgt && (ab.shield || 0) > 0 && h.shTgtIdx != null) {
      const si = h.shTgtIdx;
      const sH = this.state.heroes()[si];
      if (sH && sH.currentHp > 0) {
        await this.pulseHeroPortrait(si, 'pf-flash-blue');
        this.state.updateHero(si, { shield: (sH.shield || 0) + (ab.shield || 0), shT: ab.shT || 2 });
        this.log.log(`▸ ${h.name} → ${ab.name} on ${sH.name} (+${ab.shield} shield).`, 'pl');
      }
    }

    if ((ab.shield || 0) > 0 && !ab.shieldAll && !ab.shTgt) {
      await this.pulseHeroPortrait(hi, 'pf-flash-blue');
      const hs = this.state.heroes()[hi];
      this.state.updateHero(hi, { shield: (hs.shield || 0) + (ab.shield || 0), shT: ab.shT || 2 });
      this.log.log(`▸ ${h.name} → ${ab.name}. +${ab.shield} shield (self).`, 'pl');
    }

    if (ab.healLowest && (ab.heal || 0) > 0) {
      const alive = this.state.heroes().map((x, idx) => ({ x, idx })).filter(z => z.x.currentHp > 0);
      const best = alive.reduce((a, b) => (a.x.currentHp / a.x.maxHp) <= (b.x.currentHp / b.x.maxHp) ? a : b, alive[0]);
      if (best && best.x.currentHp < best.x.maxHp) {
        await this.pulseHeroPortrait(best.idx, 'pf-flash-green');
        this.state.updateHero(best.idx, { currentHp: Math.min(best.x.maxHp, best.x.currentHp + ab.heal) });
        this.log.log(`▸ ${h.name} → ${ab.name}. +${ab.heal} HP on ${best.x.name}.`, 'pl');
      }
    }

    if (ab.healTgt && (ab.heal || 0) > 0 && h.healTgtIdx != null) {
      const ti = h.healTgtIdx;
      const heroes = this.state.heroes();
      if (ti >= 0 && ti < heroes.length) {
        const tgt = heroes[ti];
        if (tgt && tgt.currentHp > 0 && tgt.currentHp < tgt.maxHp) {
          await this.pulseHeroPortrait(ti, 'pf-flash-green');
          this.state.updateHero(ti, { currentHp: Math.min(tgt.maxHp, tgt.currentHp + ab.heal) });
          this.log.log(`▸ ${h.name} → ${ab.name}. +${ab.heal} HP on ${tgt.name}.`, 'pl');
        }
      }
    }

    if (
      (ab.heal || 0) > 0 &&
      !ab.healTgt &&
      !ab.healLowest &&
      !ab.healAll &&
      !ab.shTgt &&
      (ab.dmg || 0) > 0
    ) {
      if (h.currentHp < h.maxHp) {
        await this.pulseHeroPortrait(hi, 'pf-flash-green');
        this.state.updateHero(hi, { currentHp: Math.min(h.maxHp, h.currentHp + ab.heal) });
        this.log.log(`▸ ${h.name} → ${ab.name}. +${ab.heal} HP (self).`, 'pl');
      }
    }

    if (
      (ab.heal || 0) > 0 &&
      !ab.healTgt &&
      !ab.healLowest &&
      !ab.healAll &&
      !ab.shTgt &&
      !(ab.dmg || 0)
    ) {
      if (h.currentHp < h.maxHp) {
        await this.pulseHeroPortrait(hi, 'pf-flash-green');
        this.state.updateHero(hi, { currentHp: Math.min(h.maxHp, h.currentHp + ab.heal) });
        this.log.log(`▸ ${h.name} → ${ab.name}. +${ab.heal} HP.`, 'pl');
      }
    }

    if ((ab.blastAll || ab.multiHit) && (ab.dmg || 0) > 0) {
      for (let idx = 0; idx < this.state.enemies().length; idx++) {
        const e = this.state.enemies()[idx];
        if (e.dead) continue;
        await this.pulseEnemyPortrait(idx, 'pf-flash-red');
        this.applyDamageToEnemy(idx, ab.dmg, h.name, !!(ab.ignSh));
      }
    } else if (ab.splitDmg) {
      const alloc = h.splitAlloc || {};
      let entries = Object.entries(alloc)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ ei: parseInt(k, 10), dmg: v }))
        .filter(x => this.state.enemies()[x.ei] && !this.state.enemies()[x.ei].dead);
      entries.sort((a, b) => a.ei - b.ei);
      if (entries.length) {
        for (const x of entries) {
          if (x.dmg > 0) {
            await this.pulseEnemyPortrait(x.ei, 'pf-flash-red');
            this.applyDamageToEnemy(x.ei, x.dmg, h.name, !!(ab.ignSh));
            this.log.log(`▸ ${h.name} splits ${x.dmg} dmg → ${this.state.enemies()[x.ei].name}.`, 'pl');
          }
        }
      } else if (tgtE && !tgtE.dead && (ab.dmg || 0) > 0) {
        await this.pulseEnemyPortrait(tgtIdx, 'pf-flash-red');
        this.applyDamageToEnemy(tgtIdx, ab.dmg, h.name, !!(ab.ignSh));
      }
    } else if ((ab.dmg || 0) > 0 && tgtE && !tgtE.dead) {
      await this.pulseEnemyPortrait(tgtIdx, 'pf-flash-red');
      this.applyDamageToEnemy(tgtIdx, ab.dmg, h.name, !!(ab.ignSh));
    }

    if (ab.rfm && ab.rfm > 0) {
      if (ab.rfmTgt) {
        const ti = h.rfmTgtIdx;
        const heroes = this.state.heroes();
        if (ti != null && ti >= 0 && ti < heroes.length) {
          const tgt = heroes[ti];
          if (tgt && tgt.currentHp > 0) {
            await this.pulseHeroPortrait(ti, 'pf-flash-green');
            this.state.updateHero(ti, {
              pendingRollBuff: (tgt.pendingRollBuff || 0) + ab.rfm,
              pendingRollBuffT: Math.max(tgt.pendingRollBuffT || 0, ab.rfmT || 1),
            });
            const rbt = ab.rfmT || 1;
            this.log.log(
              `▸ ${h.name} → ${ab.name}. +${ab.rfm} roll on ${tgt.name}'s next roll${rbt > 1 ? ` (${rbt}t)` : ''}.`,
              'pl',
            );
          }
        }
      } else if (ab.shTgt && (ab.shield || 0) > 0 && h.shTgtIdx != null) {
        const ti = h.shTgtIdx;
        const heroes = this.state.heroes();
        if (ti >= 0 && ti < heroes.length) {
          const tgt = heroes[ti];
          if (tgt && tgt.currentHp > 0) {
            await this.pulseHeroPortrait(ti, 'pf-flash-green');
            this.state.updateHero(ti, {
              pendingRollBuff: (tgt.pendingRollBuff || 0) + ab.rfm,
              pendingRollBuffT: Math.max(tgt.pendingRollBuffT || 0, ab.rfmT || 1),
            });
            const rbt = ab.rfmT || 1;
            this.log.log(
              `▸ ${h.name} → ${ab.name}. +${ab.rfm} roll on ${tgt.name}'s next roll${rbt > 1 ? ` (${rbt}t)` : ''} (shield target).`,
              'pl',
            );
          }
        }
      } else {
        await this.pulseHeroPortrait(hi, 'pf-flash-green');
        const hx = this.state.heroes()[hi];
        this.state.updateHero(hi, {
          rollBuff: (hx.rollBuff || 0) + ab.rfm,
          rollBuffT: Math.max(hx.rollBuffT || 0, ab.rfmT || 1),
        });
        const rbt = ab.rfmT || 1;
        this.log.log(
          `▸ ${h.name} → ${ab.name}. +${ab.rfm} roll${rbt > 1 ? ` (${rbt}t)` : ' next roll'}.`,
          'pl',
        );
      }
    }

    if (ab.cloak) {
      this.state.updateHero(hi, { cloaked: true });
      this.log.log(`▸ ${h.name} is cloaked.`, 'pl');
    }
    if (ab.taunt) {
      this.state.tauntHeroId.set(h.id);
      this.targeting.assignTargets();
      this.log.log(`▸ ${h.name} taunts — enemies will target ${h.name} this turn.`, 'pl');
    }

    if (ab.dot > 0) {
      if (ab.blastAll) {
        for (let idx = 0; idx < this.state.enemies().length; idx++) {
          const e = this.state.enemies()[idx];
          if (e.dead) continue;
          await this.pulseEnemyPortrait(idx, 'pf-flash-red');
          this.state.updateEnemy(idx, {
            dot: (e.dot || 0) + ab.dot,
            dT: Math.max(e.dT || 0, ab.dT || 0),
          });
        }
        this.log.log(
          `▸ Enemies poisoned (${ab.dot} DoT${ab.dT && ab.dT > 1 ? `, ${ab.dT}t` : ''}).`,
          'pl',
        );
      } else if (tgtE && !tgtE.dead) {
        await this.pulseEnemyPortrait(tgtIdx, 'pf-flash-red');
        this.state.updateEnemy(tgtIdx, {
          dot: (tgtE.dot || 0) + ab.dot,
          dT: Math.max(tgtE.dT || 0, ab.dT || 0),
        });
        this.log.log(
          `▸ ${tgtE.name} poisoned (${ab.dot} DoT${ab.dT && ab.dT > 1 ? `, ${ab.dT}t` : ''}).`,
          'pl',
        );
      }
    }

    if (ab.rfe > 0) {
      const dur = Math.max(1, ab.rfT || 1);
      if (ab.rfeAll) {
        for (let idx = 0; idx < this.state.enemies().length; idx++) {
          const e = this.state.enemies()[idx];
          if (e.dead) continue;
          await this.pulseEnemyPortrait(idx, 'pf-flash-amber');
          const nextStacks = [...(e.rfeStacks || []), { amt: ab.rfe, turnsLeft: dur }];
          const { rfe, rfT } = enemyRfeFromStacks(nextStacks);
          this.state.updateEnemy(idx, { rfeStacks: nextStacks, rfe, rfT });
          this.recomputeEnemy(idx);
        }
      } else if (tgtE && !tgtE.dead) {
        await this.pulseEnemyPortrait(tgtIdx, 'pf-flash-amber');
        const nextStacks = [...(tgtE.rfeStacks || []), { amt: ab.rfe, turnsLeft: dur }];
        const { rfe, rfT } = enemyRfeFromStacks(nextStacks);
        this.state.updateEnemy(tgtIdx, { rfeStacks: nextStacks, rfe, rfT });
        this.recomputeEnemy(tgtIdx);
      }
    }
  }

  private pickSummonGruntName(act: EnemyAbility): string {
    const n = act.summonName?.trim();
    if (n) return n;
    const pool = DEFAULT_SUMMON_GRUNTS[this.state.battleModeId()] ?? DEFAULT_SUMMON_GRUNTS.facility;
    return pool[Math.floor(Math.random() * pool.length)]!;
  }

  /** Veil Concord (summonElite) overload only: natural 20 + overload tier + explicit summonChance. */
  private async maybeEliteNaturalTwentySummon(ei: number, e: EnemyState, act: EnemyAbility): Promise<void> {
    if (e.ai !== 'smart' || e.summonElite !== true) return;
    if (e.preRoll !== 20 || e.curZone !== 'overload') return;
    const living = this.state.enemies().filter(x => !x.dead).length;
    if (living >= 3) return;
    const pct = act.summonChance;
    if (pct == null || pct <= 0) return;
    if (Math.random() * 100 >= pct) return;

    let unitName: string;
    try {
      unitName = this.pickSummonGruntName(act);
    } catch {
      return;
    }

    let rawDef;
    try {
      rawDef = this.enemyContent.expandFromSpawn({ name: unitName });
    } catch {
      this.log.log(`▸ Summon failed: unknown unit "${unitName}".`, 'sy');
      return;
    }
    if (rawDef.ai !== 'dumb') {
      this.log.log(`▸ Summon blocked: "${unitName}" must be a dumb unit.`, 'sy');
      return;
    }

    const battleIdx = this.state.battle();
    const scaled = this.enemyDefForCurrentBattle(rawDef, battleIdx);
    const nextId = Math.max(-1, ...this.state.enemies().map(x => x.id)) + 1;
    const spawned = createEnemyState(scaled, nextId);

    if (this.state.animOn()) await this.anim.paceBetweenSteps();
    this.state.appendEnemy(spawned);
    this.log.log(`▸ ${e.name} — SUMMON! ${spawned.name} joins (${pct}% on natural 20).`, 'en');
    this.targeting.assignTargets();
  }

  private async resolveEnemyTurnActionPacing(ei: number): Promise<void> {
    const e = this.state.enemies()[ei];
    if (e.dead) return;
    const act = e.plan;
    if (!act) return;

    await this.anim.gapBetweenActors();
    await this.anim.pfShake(this.anim.enemyPortraitEl(ei));

    if (act.dmg > 0) {
      const heroes = this.state.heroes();
      let hIdx = heroes.findIndex(h => h.id === e.targeting && h.currentHp > 0);
      if (hIdx < 0) {
        const fb = heroes.findIndex(h => h.currentHp > 0);
        if (fb >= 0) {
          hIdx = fb;
          this.log.log(`▸ ${e.name} — retargeted (lock lost).`, 'sy');
        }
      }
      if (hIdx >= 0) {
        const ht = heroes[hIdx];
        let dmg = act.dmg;
        if (ht.cloaked && Math.random() < 0.8) {
          this.state.updateHero(hIdx, { cloaked: false });
          this.log.log(`▸ ${e.name} attacks ${ht.name} — MISS! (Cloak)`, 'bl');
        } else {
          const exAtk = this.state.enemies()[ei];
          let rCh = exAtk.rampageCharges || 0;
          if (rCh > 0 && dmg > 0) {
            dmg *= 2;
            rCh -= 1;
            this.state.updateEnemy(ei, { rampageCharges: rCh });
            this.log.log(`▸ ${e.name} — RAMPAGE (×2).`, 'en');
          }
          await this.pulseHeroPortrait(hIdx, 'pf-flash-red');
          this.state.updateHero(hIdx, { cloaked: false });
          if (ht.shield > 0 && ht.shT > 0) {
            const absorbed = Math.min(ht.shield, dmg);
            dmg = Math.max(0, dmg - absorbed);
            const newSh = ht.shield - absorbed;
            this.state.updateHero(hIdx, { shield: newSh, shT: newSh <= 0 ? 0 : ht.shT });
            if (absorbed > 0) this.log.log(`▸ ${ht.name}'s shield absorbs ${absorbed}.`, 'sy');
          }
          const newHp = Math.max(0, this.state.heroes()[hIdx].currentHp - dmg);
          this.state.updateHero(hIdx, { currentHp: newHp });
          this.log.log(`▸ ${e.name} → ${ht.name}: ${dmg} dmg. (${newHp}/${ht.maxHp} HP)`, 'en');
          if (newHp <= 0) this.log.log(`▸ ${ht.name} is down.`, 'sy');
          const ls = act.lifestealPct;
          const hpDmg = dmg;
          if (hpDmg > 0 && ls != null && ls > 0) {
            const gain = Math.max(1, Math.round((hpDmg * ls) / 100));
            const ex = this.state.enemies()[ei];
            const nh = Math.min(ex.maxHp, ex.currentHp + gain);
            if (nh > ex.currentHp) {
              this.state.updateEnemy(ei, { currentHp: nh });
              this.log.log(`▸ ${e.name} drains +${nh - ex.currentHp} HP.`, 'en');
            }
          }
        }
      }
    }

    if (act.shield > 0) {
      await this.pulseEnemyPortrait(ei, 'pf-flash-blue');
      const ex = this.state.enemies()[ei];
      this.state.updateEnemy(ei, { shield: (ex.shield || 0) + act.shield, shT: act.shT || 2 });
      this.log.log(`▸ ${e.name} → ${act.name}! (+${act.shield} shield)`, 'en');
    }

    if ((act.shieldAlly || 0) > 0) {
      const others = this.state.enemies().filter(x => !x.dead && x.id !== e.id);
      if (others.length) {
        const tgt = others.reduce((a, b) => a.currentHp < b.currentHp ? a : b, others[0]);
        const tgtIdx = this.state.enemies().findIndex(x => x.id === tgt.id);
        await this.pulseEnemyPortrait(tgtIdx, 'pf-flash-blue');
        this.state.updateEnemy(tgtIdx, {
          shield: (tgt.shield || 0) + (act.shieldAlly || 0),
          shT: Math.max(tgt.shT || 0, act.shT || 2),
        });
        this.log.log(`▸ ${e.name} → ${tgt.name}: +${act.shieldAlly} shield (ally).`, 'en');
      }
    }

    if (act.heal > 0) {
      const alive = this.state.enemies().filter(x => !x.dead);
      const weakest = alive.reduce((a, b) => a.currentHp < b.currentHp ? a : b, alive[0]);
      if (weakest) {
        const wIdx = this.state.enemies().findIndex(x => x.id === weakest.id);
        await this.pulseEnemyPortrait(wIdx, 'pf-flash-green');
        const newHp = Math.min(weakest.maxHp, weakest.currentHp + act.heal);
        this.state.updateEnemy(wIdx, { currentHp: newHp });
        this.log.log(`▸ ${e.name} repairs ${weakest.name} +${act.heal} HP!`, 'en');
      }
    }

    if (act.rfm && act.rfm > 0) {
      const dur = act.rfmT || 2;
      if (
        e.type === 'rust' ||
        e.type === 'mite' ||
        e.type === 'beastMonkey' ||
        e.type === 'veilShard' ||
        e.type === 'voidWisp' ||
        e.type === 'signalSkimmer'
      ) {
        const hIdx = this.state.heroes().findIndex(h => h.id === e.targeting && h.currentHp > 0);
        if (hIdx >= 0) {
          const ht = this.state.heroes()[hIdx];
          await this.pulseHeroPortrait(hIdx, 'pf-flash-amber');
          this.state.pushHeroRfmStack(hIdx, act.rfm, dur);
          this.log.log(`▸ ${e.name} → ${ht.name}! -${act.rfm} roll${dur > 1 ? ` (${dur}t)` : ''}.`, 'en');
        }
      } else {
        const n = this.state.heroes().length;
        for (let hi = 0; hi < n; hi++) {
          const hx = this.state.heroes()[hi];
          if (hx.currentHp <= 0) continue;
          await this.pulseHeroPortrait(hi, 'pf-flash-amber');
        }
        this.state.pushSquadRfmStack(act.rfm, dur);
        this.log.log(`▸ ${e.name} → ${act.name}! -${act.rfm} roll${dur > 1 ? ` (${dur}t)` : ''}.`, 'en');
      }
    }

    if (act.wipeShields) {
      const n = this.state.heroes().length;
      for (let hi = 0; hi < n; hi++) {
        await this.pulseHeroPortrait(hi, 'pf-flash-red');
        this.state.updateHero(hi, { shield: 0, shT: 0 });
      }
      this.log.log(`▸ ${e.name} — all hero shields wiped!`, 'en');
    }

    if (act.dot > 0) {
      const hIdx = this.state.heroes().findIndex(h => h.id === e.targeting && h.currentHp > 0);
      if (hIdx >= 0) {
        const ht = this.state.heroes()[hIdx];
        await this.pulseHeroPortrait(hIdx, 'pf-flash-red');
        this.state.updateHero(hIdx, {
          dot: (ht.dot || 0) + act.dot,
          dT: Math.max(ht.dT || 0, act.dT || 2),
        });
      }
    }

    if ((act.erb || 0) > 0) {
      const amt = act.erb as number;
      const dur = Math.max(1, act.erbT || 2);
      if (act.erbAll) {
        const n = this.state.enemies().length;
        for (let i = 0; i < n; i++) {
          const ex = this.state.enemies()[i];
          if (ex.dead) continue;
          await this.pulseEnemyPortrait(i, 'pf-flash-green');
          const nb = (ex.rollBuff || 0) + amt;
          const nt = Math.max(ex.rollBuffT || 0, dur);
          this.state.updateEnemy(i, { rollBuff: nb, rollBuffT: nt });
        }
        this.log.log(`▸ ${e.name} → ${act.name}! +${amt} enemy roll all (${dur}t).`, 'en');
      } else {
        await this.pulseEnemyPortrait(ei, 'pf-flash-green');
        const ex = this.state.enemies()[ei];
        const nb = (ex.rollBuff || 0) + amt;
        const nt = Math.max(ex.rollBuffT || 0, dur);
        this.state.updateEnemy(ei, { rollBuff: nb, rollBuffT: nt });
        this.log.log(`▸ ${e.name} → ${act.name}! +${amt} enemy roll (${dur}t).`, 'en');
      }
    }

    if (act.counterspellZone && (act.counterspellT || 0) > 0) {
      const z = act.counterspellZone;
      const dur = Math.max(1, act.counterspellT || 1);
      const zLabel = z.toUpperCase();
      if (act.counterspellAll) {
        this.state.pushCounterspellAllLiving(z, dur);
        this.log.log(`▸ ${e.name} — COUNTERSPELL! All heroes: ${zLabel} tier sealed (${dur}t).`, 'en');
      } else {
        const hIdx = this.state.heroes().findIndex(h => h.id === e.targeting && h.currentHp > 0);
        if (hIdx >= 0) {
          const ht = this.state.heroes()[hIdx];
          await this.pulseHeroPortrait(hIdx, 'pf-flash-amber');
          this.state.pushHeroCounterspellStack(hIdx, z, dur);
          this.log.log(`▸ ${e.name} → ${ht.name}: counterspell ${zLabel} (${dur}t).`, 'en');
        }
      }
    }

    if ((act.grantRampage || 0) > 0) {
      await this.pulseEnemyPortrait(ei, 'pf-flash-red');
      const ex = this.state.enemies()[ei];
      const n = (ex.rampageCharges || 0) + (act.grantRampage as number);
      this.state.updateEnemy(ei, { rampageCharges: n });
      this.log.log(`▸ ${e.name} — blood up (+${act.grantRampage} rampage).`, 'en');
    }
    if ((act.grantRampageAll || 0) > 0) {
      const amt = act.grantRampageAll as number;
      const nEn = this.state.enemies().length;
      for (let i = 0; i < nEn; i++) {
        const ex = this.state.enemies()[i];
        if (ex.dead) continue;
        await this.pulseEnemyPortrait(i, 'pf-flash-red');
        this.state.updateEnemy(i, { rampageCharges: (ex.rampageCharges || 0) + amt });
      }
      this.log.log(`▸ ${e.name} — STAMPEDE! All beasts gain rampage (+${amt}).`, 'en');
    }

    if ((act.cowerT || 0) > 0) {
      const T = act.cowerT as number;
      const heroesNow = this.state.heroes();
      if (act.cowerAll) {
        for (let hi = 0; hi < heroesNow.length; hi++) {
          const hx = heroesNow[hi];
          if (hx.currentHp <= 0) continue;
          await this.pulseHeroPortrait(hi, 'pf-flash-amber');
          const nc = Math.max(hx.cowerTurns || 0, T);
          this.state.updateHero(hi, { cowerTurns: nc });
        }
        this.log.log(`▸ ${e.name} — dread takes the squad (${T} player round${T > 1 ? 's' : ''}).`, 'en');
      } else {
        const cIdx = heroesNow.findIndex(h => h.id === e.targeting && h.currentHp > 0);
        if (cIdx >= 0) {
          const hx = heroesNow[cIdx];
          await this.pulseHeroPortrait(cIdx, 'pf-flash-amber');
          const nc = Math.max(hx.cowerTurns || 0, T);
          this.state.updateHero(cIdx, { cowerTurns: nc });
          this.log.log(`▸ ${e.name} → ${hx.name}: cower (${T} player round${T > 1 ? 's' : ''}).`, 'en');
        }
      }
    }

    await this.maybeEliteNaturalTwentySummon(ei, e, act);
  }

  applyDamageToEnemy(idx: number, dmg: number, src: string, ignSh: boolean): void {
    const e = this.state.enemies()[idx];
    let actualDmg = dmg;
    if (e.shield > 0 && e.shT > 0 && !ignSh) {
      const absorbed = Math.min(e.shield, actualDmg);
      actualDmg = Math.max(0, actualDmg - absorbed);
      const newShield = e.shield - absorbed;
      this.state.updateEnemy(idx, {
        shield: newShield,
        shT: newShield <= 0 ? 0 : e.shT,
      });
      if (absorbed > 0) this.log.log(`▸ ${e.name}'s shield absorbs ${absorbed}.`, 'sy');
    }
    if (actualDmg <= 0) return;
    let newHp = Math.max(0, e.currentHp - actualDmg);
    if (this.state.tutorial()?.active && idx === 0) {
      newHp = Math.max(1, newHp);
    }
    this.state.updateEnemy(idx, { currentHp: newHp });
    this.log.log(`▸ ${src} → ${e.name}: ${actualDmg} dmg. (${newHp}/${e.maxHp} HP)`, 'pl');
    this.checkDead(idx);
  }

  checkDead(idx: number): void {
    const e = this.state.enemies()[idx];
    if (e.currentHp <= 0 && !e.dead) {
      this.state.updateEnemy(idx, { dead: true });
      this.log.log(`▸ ${e.name} destroyed.`, 'sy');
      const enemies = this.state.enemies();
      const nextAlive = enemies.findIndex(en => !en.dead);
      if (nextAlive >= 0) {
        this.state.target.set(nextAlive);
      }
    }
    // Boss phase 2
    const updated = this.state.enemies()[idx];
    if (
      (updated.type === 'boss' ||
      updated.type === 'hiveBoss' ||
      updated.type === 'veilBoss' ||
      updated.type === 'voidCircletBoss' ||
      updated.type === 'beastTyrant') &&
      !updated.p2 &&
      updated.pThr &&
      updated.currentHp <= updated.pThr
    ) {
      this.state.updateEnemy(idx, { p2: true });
      this.log.log(`▸ ⚠ ${updated.name} — PHASE 2.`, 'sy');
    }
  }

  // ── Battle initialization ──

  /** Per-battle index scale + operation `trackHpScale` on max HP / phase threshold. */
  private enemyDefForCurrentBattle(
    raw: EnemyDefinition,
    battleIdx: number,
  ): EnemyDefinition & { dmgScale: number } {
    const scaled = this.enemyContent.applyBattleScale(raw, battleIdx);
    const t = battleModeConfig(this.state.battleModeId()).trackHpScale;
    if (!t || t === 1) return scaled;
    return {
      ...scaled,
      hp: Math.max(1, Math.round(scaled.hp * t)),
      pThr: scaled.pThr != null ? Math.max(1, Math.round(scaled.pThr * t)) : scaled.pThr,
    };
  }

  initBattle(): void {
    const battleIdx = this.state.battle();
    const battles = battlesForMode(this.state.battleModeId());
    const battleDef = battles[battleIdx];
    if (!battleDef) return;

    const enemies: EnemyState[] = battleDef.enemies.map((spawn, i) => {
      const raw = this.enemyContent.expandFromSpawn(spawn);
      return createEnemyState(this.enemyDefForCurrentBattle(raw, battleIdx), i);
    });

    this.portraitPreload.warmBattle(this.state.heroes(), enemies);
    this.state.enemies.set(enemies);
    this.state.phase.set('player');
    this.state.target.set(0);
    this.state.clearSquadRfmStacks();
    this.state.clearAllHeroRfmStacks();
    this.state.tauntHeroId.set(null);
    this.state.selectedHeroIdx.set(null);
    this.state.pendingProtocol.set(null);
    this.state.pendingItemSelection.set(null);
    this.state.rollAllInProgress.set(false);
    this.state.rollAnimInProgress.set(false);
    this.state.squadDiceSettling.set(false);
    this.state.enemyDiceSettling.set(false);
    this.state.enemyTrayRevealed.set(false);
    this.state.endTurnHeroResolveCursor.set(null);
    this.state.showOverlay.set(false);

    // Fresh battle: no squad dice or locks until ROLL ALL / individual rolls (carries over from prior battle otherwise)
    this.state.heroes().forEach((_, i) => this.state.resetHeroForNewRound(i));
    this.state.heroes().forEach((_, i) => this.state.updateHero(i, { counterspellStacks: [], cowerTurns: 0 }));

    // Enemy abilities roll when the player reveals the tray (ROLL ALL / last squad die)
    this.targeting.assignTargets();

    // Protocol starts at 0; first gain is +1 when returning to the player phase after the first END TURN.
    this.state.protocol.set(0);

    this.log.log(`— ${battleModeConfig(this.state.battleModeId()).label.toUpperCase()} · BATTLE ${battleIdx + 1} START —`, 'sy');
  }

  // ── Roll helpers ──

  /** Called by DiceTray after animation applies the roll value to state */
  clearAndAutoTarget(heroIdx: number): void {
    this.targeting.clearHeroTargetingOnRollChange(heroIdx);
    this.targeting.runAutoTargetForHero(heroIdx);
  }

  /** Roll a single hero die (no animation — instant, for clicking individual dice) */
  rollHero(idx: number): void {
    const h = this.state.heroes()[idx];
    if (!h || h.currentHp <= 0 || (h.cowerTurns || 0) > 0 || h.roll !== null) return;
    if (this.state.phase() !== 'player') return;

    const preset = this.tutorial.getHeroRollPreset(idx);
    let raw = preset ?? this.dice.d20();
    const rfmPen = this.state.combinedHeroRawRfmPenalty(idx);
    if (rfmPen > 0) raw = Math.max(1, raw - rfmPen);
    this.state.updateHero(idx, { roll: raw, rawRoll: raw });
    this.targeting.clearHeroTargetingOnRollChange(idx);
    this.targeting.runAutoTargetForHero(idx);
    if (
      this.state.heroes().every(
        x =>
          x.currentHp <= 0 ||
          x.roll !== null ||
          ((x.cowerTurns || 0) > 0 && x.roll === null),
      )
    ) {
      this.rollFreshEnemyPlansForReveal();
      this.state.enemyTrayRevealed.set(true);
      this.tutorial.notifyRollAllFinished();
    }
  }

  // ── End turn (player turn resolution) ──

  async endTurn(): Promise<void> {
    if (this.state.phase() !== 'player') return;
    if (this.state.pendingItemSelection()) {
      this.state.pendingItemSelection.set(null);
    }

    // Auto-target any remaining heroes
    const heroes = this.state.heroes();
    heroes.forEach((_, i) => this.targeting.runAutoTargetForHero(i));
    if (!this.targeting.allHeroesReadyForEndTurn()) return;

    const tutErr = this.tutorial.validateBeforePlayerResolve();
    if (tutErr) {
      this.state.addLog(tutErr, 'sy');
      return;
    }

    this.tutorial.finishCoachOnEndTurn();

    // Tick roll buff durations
    heroes.forEach((h, i) => {
      if (h.rollBuffT > 0) {
        const newT = h.rollBuffT - 1;
        this.state.updateHero(i, {
          rollBuffT: newT,
          rollBuff: newT <= 0 ? 0 : h.rollBuff,
        });
      }
    });

    // Force-roll any unrolled alive heroes (cowering heroes skip — no roll this round)
    this.state.heroes().forEach((h, i) => {
      if (h.currentHp <= 0 || (h.cowerTurns || 0) > 0 || h.roll !== null) return;
      let raw = this.dice.d20();
      const pen = this.state.combinedHeroRawRfmPenalty(i);
      if (pen > 0) raw = Math.max(1, raw - pen);
      this.state.updateHero(i, { roll: raw, rawRoll: raw, noRR: true });
      this.targeting.clearHeroTargetingOnRollChange(i);
      this.targeting.runAutoTargetForHero(i);
    });

    this.state.endTurnHeroResolveCursor.set(0);
    try {
      // Tick enemy DoTs
      this.state.enemies().forEach((e, i) => {
        if (e.dead) return;
        if (e.dot > 0 && e.dT > 0) {
          this.applyDamageToEnemy(i, e.dot, 'DoT', false);
          const newDT = e.dT - 1;
          this.state.updateEnemy(i, { dT: newDT, dot: newDT <= 0 ? 0 : e.dot });
        }
        const stacks = e.rfeStacks?.length ? e.rfeStacks : [];
        if (stacks.length > 0) {
          const next = tickEnemyRfeStacks(stacks);
          const { rfe, rfT } = enemyRfeFromStacks(next);
          this.state.updateEnemy(i, { rfeStacks: next, rfe, rfT });
        }
      });

      // If DoT cleared the fight, still tick squad/hero roll debuffs before win (otherwise stacks never age this END TURN).
      if (this.state.enemies().every(e => e.dead)) {
        this.state.tickSquadRfmStacksForEndOfPlayerRound();
        this.state.tickHeroRfmStacksForEndOfPlayerRound();
        this.state.tickHeroCounterspellStacksForEndOfPlayerRound();
        this.won();
        return;
      }

      // Resolve each hero's ability (left → right), with optional action pacing / portrait flashes
      for (let hi = 0; hi < this.state.heroes().length; hi++) {
        await this.resolveHeroEndTurnWithActionPacing(hi);
        this.state.endTurnHeroResolveCursor.set(hi + 1);
      }

      // Squad / per-hero −roll debuff: one tick per END TURN after this round’s rolls and abilities resolve.
      this.state.tickSquadRfmStacksForEndOfPlayerRound();
      this.state.tickHeroRfmStacksForEndOfPlayerRound();
      this.state.tickHeroCounterspellStacksForEndOfPlayerRound();

      this.state.heroes().forEach((h, i) => {
        if (h.currentHp <= 0) return;
        const ct = h.cowerTurns || 0;
        if (ct > 0) this.state.updateHero(i, { cowerTurns: ct - 1 });
      });

      // Check win
      if (this.state.enemies().every(e => e.dead)) {
        this.won();
        return;
      }

      // Switch to enemy phase
      this.state.phase.set('enemy');
      setTimeout(() => this.enemyTurn(), 700);
    } finally {
      this.state.endTurnHeroResolveCursor.set(null);
    }
  }

  // ── Enemy turn ──

  async enemyTurn(): Promise<void> {
    this.log.log(`— ENEMY TURN —`, 'sy');
    this.state.tauntHeroId.set(null);

    // Tick hero DoTs
    this.state.heroes().forEach((h, i) => {
      if (h.dot > 0 && h.dT > 0) {
        const newHp = Math.max(0, h.currentHp - h.dot);
        const newDT = h.dT - 1;
        this.state.updateHero(i, {
          currentHp: newHp,
          dT: newDT,
          dot: newDT <= 0 ? 0 : h.dot,
        });
        this.log.log(`▸ ${h.name} takes ${h.dot} DoT damage.`, 'en');
      }
    });

    if (this.state.heroes().every(h => h.currentHp <= 0)) { this.lost(); return; }

    // Enemy actions (left → right), staggered like player resolution
    for (let ei = 0; ei < this.state.enemies().length; ei++) {
      await this.resolveEnemyTurnActionPacing(ei);
    }

    // Decay shields + enemy roll buff duration (used on the roll just revealed this round)
    this.state.enemies().forEach((e, i) => {
      if (e.dead) return;
      if (e.shT > 0) {
        const newT = e.shT - 1;
        this.state.updateEnemy(i, { shT: newT, shield: newT <= 0 ? 0 : e.shield });
      }
      if ((e.rollBuffT || 0) > 0) {
        const newBt = e.rollBuffT - 1;
        this.state.updateEnemy(i, {
          rollBuffT: newBt,
          rollBuff: newBt <= 0 ? 0 : e.rollBuff,
        });
      }
    });
    this.state.heroes().forEach((h, i) => {
      if (h.shT > 0) {
        const newT = h.shT - 1;
        this.state.updateHero(i, { shT: newT, shield: newT <= 0 ? 0 : h.shield });
      }
    });

    // Check loss
    if (this.state.heroes().every(h => h.currentHp <= 0)) { this.lost(); return; }

    const tut = this.state.tutorial();
    if (tut?.active) {
      const nextRes = (tut.resolutions ?? 0) + 1;
      this.state.tutorial.set({
        ...tut,
        resolutions: nextRes,
        showTurn2Modal: false,
        showComplete: true,
        coachStep: 5,
        r2CoachStep: 0,
      });
      this.state.phase.set('player');
      this.log.log(`— TUTORIAL COMPLETE —`, 'vi');
      return;
    }

    // Next player round: no squad rolls and no enemy plan until reveal
    this.clearEnemyPlansForNextPlayerRound();
    this.state.heroes().forEach((_, i) => this.state.resetHeroForNewRound(i));
    this.targeting.assignTargets();

    this.state.phase.set('player');
    this.state.selectedHeroIdx.set(null);
    this.state.pendingProtocol.set(null);
    this.state.pendingItemSelection.set(null);
    this.state.rollAllInProgress.set(false);
    this.state.squadDiceSettling.set(false);
    this.state.squadSettleHeroIdx.set(null);
    this.state.enemyTrayRevealed.set(false);

    this.protocol.grantForNewRound(); // +1 Protocol for the round you’re about to play (after prior END TURN)
    this.log.log(`— PLAYER TURN —`, 'sy');
  }

  // ── Win / Loss ──

  won(): void {
    if (this.state.tutorial()?.active) {
      return;
    }
    this.state.phase.set('over');
    this.log.log(`▸ All enemies down. Battle ${this.state.battle() + 1} complete.`, 'vi');

    const mode = battleModeConfig(this.state.battleModeId());
    const lastBattleIdx = battleCountForMode(this.state.battleModeId()) - 1;
    if (this.state.battle() >= lastBattleIdx) {
      this.showOverlay(mode.victoryTitle, mode.victorySub, 'NEW RUN ↺', true, () => this.newRun());
      return;
    }

    const nextBattleIdx = this.state.battle() + 1;
    const nextDef = battlesForMode(this.state.battleModeId())[nextBattleIdx];
    if (nextDef) {
      const types = nextDef.enemies.map(s => this.enemyContent.expandFromSpawn(s).type);
      this.portraitPreload.warmEnemyTypes(types);
    }

    // Item draft after every cleared battle (easier to test); skip when inventory full — see ItemService.
    this.items.startPostWinDraft(() => this.afterItemDraftWin());
  }

  private afterItemDraftWin(): void {
    this.evolution.awardHrs();
    const eligible = this.evolution.getEligibleHeroes();
    if (eligible.length > 0) {
      this.state.pendingEvolutions.set(eligible.map(i => ({ heroIdx: i, chosen: null })));
    } else {
      this.showOverlay('BATTLE CLEARED', `Battle ${this.state.battle() + 1} complete.`, 'NEXT BATTLE ▶', true, () => this.nextBattle());
    }
  }

  lost(): void {
    this.state.phase.set('over');
    this.log.log(`▸ Squad wiped. Run terminated.`, 'de');
    this.showOverlay('SQUAD WIPED', `Eliminated at battle ${this.state.battle() + 1}.`, 'NEW RUN ↺', false, () => this.newRun());
  }

  nextBattle(): void {
    this.state.showOverlay.set(false);
    this.state.battle.update(b => b + 1);

    // Restore hero HP: alive = 100%, dead = revive at 80% (single set so every card gets a fresh ref)
    const heroes = this.state.heroes();
    this.state.heroes.set(
      heroes.map(h =>
        h.currentHp > 0
          ? { ...h, currentHp: h.maxHp, shield: 0, shT: 0, dot: 0, dT: 0, cloaked: false }
          : {
              ...h,
              currentHp: Math.max(1, Math.round(h.maxHp * 0.8)),
              shield: 0,
              shT: 0,
              dot: 0,
              dT: 0,
              cloaked: false,
            },
      ),
    );

    this.initBattle();
  }

  newRun(): void {
    this.state.reset();
    this.state.initHeroes();
    this.state.battle.set(0);
    this.initBattle();
  }

  /** Wipe the run and return to operation selection (same session). */
  returnToOperationPicker(): void {
    this.state.reset();
    this.state.showOperationPicker.set(true);
  }

  private showOverlay(title: string, sub: string, btnText: string, isVictory: boolean, action: () => void): void {
    this.state.overlayTitle.set(title);
    this.state.overlaySub.set(sub);
    this.state.overlayBtnText.set(btnText);
    this.state.overlayIsVictory.set(isVictory);
    this.state.overlayBtnAction.set(action);
    this.state.showOverlay.set(true);
  }
}
