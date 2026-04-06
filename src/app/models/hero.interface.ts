import { HeroAbility } from './ability.interface';
import { normalizeHeroAbility } from '../data/hero-ability-normalize';
import { HeroId, Zone } from './types';

/** Squad picker grouping on the operation overlay. */
export type HeroPickerCategory = 'damage' | 'defense' | 'support' | 'control';

/** Per-hero −raw d20 from enemy abilities (e.g. rust jam on target); independent stacks like squad rfm. */
export type HeroRfmStack = { amt: number; turnsLeft: number };

/** Enemy counterspell: hero cannot resolve abilities whose bracket zone matches (ticks down each END TURN). */
export type HeroCounterspellStack = { zone: Zone; turnsLeft: number };

export interface EvolutionTier {
  name: string;
  focus: string;
  hp: number;
  abilities: HeroAbility[];
}

export interface HeroDefinition {
  id: HeroId;
  name: string;
  cls: string;
  /** Shown on the “Pick 3” squad roster. */
  pickerCategory: HeroPickerCategory;
  /** Short line for squad selection (not shown in combat). */
  pickerBlurb: string;
  hp: number;
  sk: HeroId;
  /** Optional `/heroes/...` URL; dev editor + JSON can override the default portrait art. */
  portraitPath?: string;
  abilities: HeroAbility[];
  evolutions: EvolutionTier[];
}

export interface HeroState extends HeroDefinition {
  currentHp: number;
  maxHp: number;
  roll: number | null;
  rawRoll: number | null;
  rollNudge: number;
  rollBuff: number;
  rollBuffT: number;
  /** +rfm from ally-targeted abilities; merged into rollBuff at round reset (next roll only). */
  pendingRollBuff: number;
  pendingRollBuffT: number;
  /** Enemy-applied roll penalty stacks (rust targets this hero only). */
  heroRfmStacks: HeroRfmStack[];
  counterspellStacks: HeroCounterspellStack[];
  /** >0: cannot roll this player round; ability skipped (Cower). Ticks down after each player END TURN. */
  cowerTurns: number;
  confirmed: boolean;
  dot: number;
  dT: number;
  shield: number;
  shT: number;
  shTgtIdx: number | null;
  healTgtIdx: number | null;
  rfmTgtIdx: number | null;
  reviveTgtIdx: number | null;
  lockedTarget: number | undefined;
  cloaked: boolean;
  noRR: boolean;
  splitAlloc: Record<number, number>;
  tier: 1 | 2;
  hrs: number;
  bRolls: number[];
  evolvedTo: string | null;
  _pulseBanked?: boolean;
  _evoRollRecorded?: boolean;
  _actionLogged?: boolean;
}

export function createHeroState(def: HeroDefinition): HeroState {
  const evolutions = def.evolutions.map(e => ({
    ...e,
    abilities: e.abilities.map(normalizeHeroAbility),
  }));
  return {
    ...def,
    abilities: def.abilities.map(normalizeHeroAbility),
    evolutions,
    currentHp: def.hp,
    maxHp: def.hp,
    roll: null,
    rawRoll: null,
    rollNudge: 0,
    rollBuff: 0,
    rollBuffT: 0,
    pendingRollBuff: 0,
    pendingRollBuffT: 0,
    heroRfmStacks: [],
    counterspellStacks: [],
    cowerTurns: 0,
    confirmed: false,
    dot: 0,
    dT: 0,
    shield: 0,
    shT: 0,
    shTgtIdx: null,
    healTgtIdx: null,
    rfmTgtIdx: null,
    reviveTgtIdx: null,
    lockedTarget: undefined,
    cloaked: false,
    noRR: false,
    splitAlloc: {},
    tier: 1,
    hrs: 0,
    bRolls: [],
    evolvedTo: null,
  };
}
