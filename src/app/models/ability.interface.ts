import type { Zone } from './types';

export interface HeroAbility {
  zone: Zone;
  range: [number, number];
  name: string;
  eff: string;
  dmg: number;
  dMin: number;
  dMax: number;
  dot: number;
  dT: number;
  rfe: number;
  rfT?: number;
  heal: number;
  shTgt?: boolean;
  shield?: number;
  shT?: number;
  shieldAll?: boolean;
  healTgt?: boolean;
  healAll?: boolean;
  healLowest?: boolean;
  revive?: boolean;
  rfm?: number;
  rfmT?: number;
  /** If set, player picks an ally; that hero receives the rfm roll buff instead of the caster. */
  rfmTgt?: boolean;
  cloak?: boolean;
  taunt?: boolean;
  blastAll?: boolean;
  multiHit?: boolean;
  ignSh?: boolean;
  splitDmg?: boolean;
  rfeAll?: boolean;
  rfeOnly?: boolean;
}

export interface EnemyAbility {
  name: string;
  eff: string;
  dmg: number;
  dmgP2?: number;
  dot: number;
  dT: number;
  heal: number;
  rfe: number;
  rfT?: number;
  shield: number;
  shT?: number;
  shieldAlly?: number;
  rfm?: number;
  rfmT?: number;
  wipeShields?: boolean;
  /** Heal this enemy for N% of HP damage dealt (after shield); never combine with `dot` on the same ability. */
  lifestealPct?: number;
  zone?: Zone;
  /** Veil Concord overload only: % chance (0–100) on natural 20 + overload tier; requires `summonElite` on unit def; max 3 enemies. */
  summonChance?: number;
  /** Grunt unit name in enemyUnitDefs (`ai: dumb`). If omitted, uses mode pool from `DEFAULT_SUMMON_GRUNTS` (veil when added). */
  summonName?: string;
  /** +effective d20 for this enemy’s next tray roll (capped in zone math). */
  erb?: number;
  erbT?: number;
  /** If true, `erb` applies to all living enemies. */
  erbAll?: boolean;
  /** Counterspell: block heroes from resolving abilities in this zone for N player end-turns (tick after squad resolves). */
  counterspellZone?: Zone;
  counterspellT?: number;
  /** Apply counterspell to all living heroes (else only `targeting` hero when smart). */
  counterspellAll?: boolean;
  /** Add rampage charges to self: next direct hit damage ×2 per charge (consumed one per hit). */
  grantRampage?: number;
  /** Add rampage charges to all living enemies (stampede / pack frenzy). */
  grantRampageAll?: number;
  /** Hero cannot roll next player round(s); loses their turn. */
  cowerT?: number;
  cowerAll?: boolean;
}

export type EnemyAbilitySuite = Record<Zone, EnemyAbility>;
