import { HeroAbility } from '../models/ability.interface';

const ri = (n: number | undefined | null): number =>
  n == null || !Number.isFinite(n) ? 0 : Math.round(n);

/** Whole-number stats for combat, badges, and the ability panel (single source of truth). */
export function normalizeHeroAbility(ab: HeroAbility): HeroAbility {
  const shield = ab.shield != null ? ri(ab.shield) : undefined;
  const shT = ab.shT != null ? ri(ab.shT) : undefined;
  const rfm = ab.rfm != null ? ri(ab.rfm) : undefined;
  const rfmT = ab.rfmT != null ? ri(ab.rfmT) : undefined;
  const rfT = ab.rfT != null ? ri(ab.rfT) : undefined;

  return {
    ...ab,
    range: [ri(ab.range[0]), ri(ab.range[1])] as [number, number],
    dmg: ri(ab.dmg),
    dMin: ri(ab.dMin),
    dMax: ri(ab.dMax),
    dot: ri(ab.dot),
    dT: ri(ab.dT),
    rfe: ri(ab.rfe),
    rfT: rfT || undefined,
    heal: ri(ab.heal),
    shield: shield || undefined,
    shT: shT || undefined,
    rfm: rfm || undefined,
    rfmT: rfmT || undefined,
  };
}
