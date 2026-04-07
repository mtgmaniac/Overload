import { Injectable, computed, signal } from '@angular/core';
import { HeroState, HeroRfmStack, createHeroState } from '../models/hero.interface';
import { EnemyState } from '../models/enemy.interface';
import { LogEntry, PendingEvolution, TutorialState } from '../models/game-state.interface';
import { BattleModeId, GamePhase, HeroId, LogClass, LogMode, ProtocolAction, Zone } from '../models/types';
import type { PendingItemSelection } from '../models/item.interface';
import { battleCountForMode, battleModeConfig, DEFAULT_BATTLE_MODE } from '../data/battle-modes.data';
import { HeroContentService } from './hero-content.service';
import { PortraitPreloadService } from './portrait-preload.service';

/** One enemy-applied squad roll debuff application; expires independently. */
export type SquadRfmStack = { amt: number; turnsLeft: number };

@Injectable({ providedIn: 'root' })
export class GameStateService {
  constructor(
    private readonly heroContent: HeroContentService,
    private readonly portraitPreload: PortraitPreloadService,
  ) {}

  // ── Primary state signals ──
  /** Which operation / battle track is active (facility, hive, …). */
  readonly battleModeId = signal<BattleModeId>(DEFAULT_BATTLE_MODE);
  /** Full reset + pick mode before heroes spawn. */
  readonly showOperationPicker = signal(true);
  readonly battle = signal(0);
  readonly phase = signal<GamePhase>('player');
  readonly heroes = signal<HeroState[]>([]);
  readonly enemies = signal<EnemyState[]>([]);
  readonly target = signal(0);
  readonly log = signal<LogEntry[]>([]);
  /** Independent stacks — sum of `amt` is the raw d20 penalty while any stack lives. */
  readonly squadRfmStacks = signal<SquadRfmStack[]>([]);
  readonly tauntHeroId = signal<HeroId | null>(null);
  /** Veil grunt self-taunt: index of enemy forcing itself as the only valid damage target. Null when inactive. */
  readonly forcedEnemyTargetIdx = signal<number | null>(null);
  readonly pendingEvolutions = signal<PendingEvolution[]>([]);
  readonly logMode = signal<LogMode>('min');
  readonly logOpen = signal(false);
  readonly animOn = signal(true);
  readonly tutorial = signal<TutorialState | null>(null);
  readonly protocol = signal(0);
  readonly selectedHeroIdx = signal<number | null>(null);
  readonly pendingProtocol = signal<ProtocolAction>(null);
  /** Up to 3 stashed item ids; null = empty slot (persists across battles in a run). */
  readonly inventory = signal<(string | null)[]>([null, null, null]);
  /** After winning a battle, pick one of these item ids (then cleared); skipped if inventory is full. */
  readonly itemDraftChoices = signal<string[] | null>(null);
  /** Using a consumable: pick target on board. */
  readonly pendingItemSelection = signal<PendingItemSelection | null>(null);
  readonly rollAllInProgress = signal(false);
  readonly rollAnimInProgress = signal(false);
  readonly squadDiceSettling = signal(false);
  readonly squadSettleHeroIdx = signal<number | null>(null);
  readonly enemyDiceSettling = signal(false);
  readonly enemyTrayRevealed = signal(false);
  /**
   * During END TURN resolution: heroes with index < this value have already applied abilities.
   * Used so enemy “Incoming” debuff/dmg previews drop in sync with “Status” as each hero resolves.
   */
  readonly endTurnHeroResolveCursor = signal<number | null>(null);

  /**
   * After a cursed roll resolves: both dice stay visible briefly; the higher (discarded) die is removed after 2s.
   */
  readonly cursedRollShowcase = signal<{
    heroIdx: number;
    low: number;
    high: number;
  } | null>(null);
  private cursedShowcaseTimer: ReturnType<typeof setTimeout> | null = null;

  beginCursedRollShowcase(heroIdx: number, low: number, high: number): void {
    if (this.cursedShowcaseTimer) {
      clearTimeout(this.cursedShowcaseTimer);
      this.cursedShowcaseTimer = null;
    }
    this.cursedRollShowcase.set({ heroIdx, low, high });
    this.cursedShowcaseTimer = setTimeout(() => {
      this.cursedShowcaseTimer = null;
      this.cursedRollShowcase.set(null);
    }, 2000);
  }

  private clearCursedRollShowcaseTimers(): void {
    if (this.cursedShowcaseTimer) {
      clearTimeout(this.cursedShowcaseTimer);
      this.cursedShowcaseTimer = null;
    }
    this.cursedRollShowcase.set(null);
  }

  // ── Overlay signals ──
  readonly showOverlay = signal(false);
  readonly overlayTitle = signal('');
  readonly overlaySub = signal('');
  readonly overlayBtnText = signal('');
  readonly overlayBtnAction = signal<(() => void) | null>(null);
  readonly overlayIsVictory = signal(false);

  // ── Computed signals ──
  readonly allHeroesRolled = computed(() =>
    this.heroes().every(
      h =>
        h.currentHp <= 0 ||
        h.roll !== null ||
        ((h.cowerTurns || 0) > 0 && h.roll === null),
    )
  );

  readonly allHeroesReady = computed(() =>
    this.heroes().every(h => {
      if (h.currentHp <= 0) return true;
      if ((h.cowerTurns || 0) > 0 && h.roll === null) return true;
      return h.roll !== null && h.confirmed;
    })
  );

  readonly livingHeroes = computed(() =>
    this.heroes().filter(h => h.currentHp > 0)
  );

  readonly livingEnemies = computed(() =>
    this.enemies().filter(e => !e.dead)
  );

  readonly battleCountTotal = computed(() => battleCountForMode(this.battleModeId()));

  readonly battleModeLabel = computed(() => battleModeConfig(this.battleModeId()).label);

  readonly isPlayerPhase = computed(() =>
    this.phase() === 'player'
  );

  /** Total −d20 applied to raw squad rolls from enemy abilities. */
  readonly squadRfmPenalty = computed(() =>
    this.squadRfmStacks().reduce((s, x) => s + x.amt, 0),
  );

  /** Squad-wide + this hero’s rust (etc.) stacks — raw d20 penalty for one hero’s roll. */
  combinedHeroRawRfmPenalty(heroIndex: number): number {
    return this.squadRfmPenalty() + this.heroRfmPenaltyFor(heroIndex);
  }

  heroRfmPenaltyFor(heroIndex: number): number {
    const h = this.heroes()[heroIndex];
    const st = h?.heroRfmStacks;
    if (!st?.length) return 0;
    return st.reduce((s, x) => s + x.amt, 0);
  }

  pushSquadRfmStack(amt: number, turns: number): void {
    const t = Math.max(1, Math.round(turns));
    const a = Math.max(1, Math.round(amt));
    this.squadRfmStacks.update(st => [...st, { amt: a, turnsLeft: t }]);
  }

  /** Call once per player END TURN after rolls for that round (same moment as enemy rfe tick). */
  tickSquadRfmStacksForEndOfPlayerRound(): void {
    this.squadRfmStacks.update(st =>
      st
        .map(x => ({
          amt: Math.max(0, Math.round(Number(x.amt) || 0)),
          turnsLeft: Math.max(0, Math.round(Number(x.turnsLeft) || 0) - 1),
        }))
        .filter(x => x.turnsLeft > 0 && x.amt > 0),
    );
  }

  clearSquadRfmStacks(): void {
    this.squadRfmStacks.set([]);
  }

  pushHeroCounterspellStack(heroIndex: number, zone: Zone, turns: number): void {
    const t = Math.max(1, Math.round(turns));
    this.heroes.update(heroes =>
      heroes.map((h, i) =>
        i !== heroIndex
          ? h
          : {
              ...h,
              counterspellStacks: [...(h.counterspellStacks || []), { zone, turnsLeft: t }],
            },
      ),
    );
  }

  /** Apply counterspell zone block to every living hero (enemy `counterspellAll`). */
  pushCounterspellAllLiving(zone: Zone, turns: number): void {
    const t = Math.max(1, Math.round(turns));
    this.heroes.update(heroes =>
      heroes.map(h =>
        h.currentHp <= 0
          ? h
          : {
              ...h,
              counterspellStacks: [...(h.counterspellStacks || []), { zone, turnsLeft: t }],
            },
      ),
    );
  }

  /** Same cadence as squad rfm — one tick per END TURN after that round’s hero abilities resolve. */
  tickHeroCounterspellStacksForEndOfPlayerRound(): void {
    this.heroes.update(heroes =>
      heroes.map(h => ({
        ...h,
        counterspellStacks: (h.counterspellStacks || [])
          .map(x => ({
            zone: x.zone,
            turnsLeft: Math.max(0, Math.round(Number(x.turnsLeft) || 0) - 1),
          }))
          .filter(x => x.turnsLeft > 0),
      })),
    );
  }

  pushHeroRfmStack(heroIndex: number, amt: number, turns: number): void {
    const t = Math.max(1, Math.round(turns));
    const a = Math.max(1, Math.round(amt));
    this.heroes.update(heroes =>
      heroes.map((h, i) =>
        i !== heroIndex
          ? h
          : { ...h, heroRfmStacks: [...(h.heroRfmStacks || []), { amt: a, turnsLeft: t } satisfies HeroRfmStack] },
      ),
    );
  }

  /** Same cadence as squad rfm tick — end of player round after that round’s rolls resolved. */
  tickHeroRfmStacksForEndOfPlayerRound(): void {
    this.heroes.update(heroes =>
      heroes.map(h => ({
        ...h,
        heroRfmStacks: (h.heroRfmStacks || [])
          .map(x => ({
            amt: Math.max(0, Math.round(Number(x.amt) || 0)),
            turnsLeft: Math.max(0, Math.round(Number(x.turnsLeft) || 0) - 1),
          }))
          .filter(x => x.turnsLeft > 0 && x.amt > 0),
      })),
    );
  }

  clearAllHeroRfmStacks(): void {
    this.heroes.update(heroes => heroes.map(h => ({ ...h, heroRfmStacks: [] })));
  }

  // ── Mutation methods ──
  updateHero(index: number, patch: Partial<HeroState>): void {
    this.heroes.update(heroes =>
      heroes.map((h, i) => i === index ? { ...h, ...patch } : h)
    );
  }

  updateEnemy(index: number, patch: Partial<EnemyState>): void {
    this.enemies.update(enemies =>
      enemies.map((e, i) => i === index ? { ...e, ...patch } : e)
    );
  }

  appendEnemy(enemy: EnemyState): void {
    this.enemies.update(enemies => [...enemies, enemy]);
  }

  addLog(msg: string, cls: LogClass = ''): void {
    this.log.update(log => [{ msg, cls }, ...log]);
  }

  // ── Initialization ──
  pick3(): HeroState[] {
    const pool = [...this.heroContent.heroes()];
    const picked: HeroState[] = [];
    while (picked.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(createHeroState(pool.splice(idx, 1)[0]));
    }
    return picked;
  }

  initHeroes(partyIds?: HeroId[]): void {
    let heroes: HeroState[];
    if (partyIds) {
      const defs = this.heroContent.heroes();
      heroes = partyIds
        .map(id => defs.find(h => h.id === id))
        .filter((h): h is (typeof defs)[number] => !!h)
        .map(h => createHeroState(h));
      this.heroes.set(heroes);
    } else {
      heroes = this.pick3();
      this.heroes.set(heroes);
    }
    this.portraitPreload.warmHeroPortraits(heroes);
  }

  resetHeroForNewRound(index: number): void {
    const h = this.heroes()[index];
    if (!h) return;
    const mergedBuff = (h.rollBuff || 0) + (h.pendingRollBuff || 0);
    const mergedT = Math.max(h.rollBuffT || 0, h.pendingRollBuffT || 0);
    const keepFrozenRoll =
      (h.dieFreezeRollsRemaining || 0) > 0 && h.roll !== null && h.currentHp > 0;
    this.updateHero(index, {
      roll: keepFrozenRoll ? h.roll : null,
      rawRoll: keepFrozenRoll ? h.rawRoll : null,
      rollNudge: 0,
      rollBuff: mergedBuff,
      rollBuffT: mergedBuff > 0 ? mergedT : 0,
      pendingRollBuff: 0,
      pendingRollBuffT: 0,
      confirmed: false,
      lockedTarget: undefined,
      shTgtIdx: null,
      healTgtIdx: null,
      rfmTgtIdx: null,
      reviveTgtIdx: null,
      freezeDiceTgtHeroIdx: null,
      freezeDiceTgtEnemyIdx: null,
      noRR: false,
      splitAlloc: {},
      _pulseBanked: false,
      _evoRollRecorded: false,
      _actionLogged: false,
    });
  }

  reset(): void {
    this.battle.set(0);
    this.phase.set('player');
    this.heroes.set([]);
    this.enemies.set([]);
    this.target.set(0);
    this.log.set([]);
    this.squadRfmStacks.set([]);
    this.tauntHeroId.set(null);
    this.pendingEvolutions.set([]);
    this.tutorial.set(null);
    this.protocol.set(0);
    this.selectedHeroIdx.set(null);
    this.pendingProtocol.set(null);
    this.inventory.set([null, null, null]);
    this.itemDraftChoices.set(null);
    this.pendingItemSelection.set(null);
    this.rollAllInProgress.set(false);
    this.rollAnimInProgress.set(false);
    this.squadDiceSettling.set(false);
    this.squadSettleHeroIdx.set(null);
    this.enemyDiceSettling.set(false);
    this.enemyTrayRevealed.set(false);
    this.endTurnHeroResolveCursor.set(null);
    this.showOverlay.set(false);
    this.clearCursedRollShowcaseTimers();
  }
}
