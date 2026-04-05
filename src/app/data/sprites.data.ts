import { EnemyType, HeroId } from '../models/types';

/** CSS pixel size of `app-portrait-frame` for heroes and enemy cards (keep in sync with portrait-frame). */
export const HERO_PORTRAIT_FRAME = { width: 100, height: 132 } as const;

/** ViewBox for portrait `<image>`: uniform scale + center crop (`slice`), never non-uniform stretch. */
const PORTRAIT_IMG_W = 240;
const PORTRAIT_IMG_H = 317;

/** Full-bleed portraits — matched art style (combat reference); flavor per unit. */
export const HERO_PORTRAIT_PATHS: Record<HeroId, string> = {
  pulse: '/heroes/pulse-portrait.png',
  combat: '/heroes/combat-portrait.png',
  shield: '/heroes/shield-portrait.png',
  avalanche: '/heroes/avalanche-portrait.png',
  medic: '/heroes/medic-portrait.png',
  engineer: '/heroes/engineer-portrait.png',
  ghost: '/heroes/ghost-portrait.png',
  breaker: '/heroes/breaker-portrait.png',
};

export function heroPortraitSvg(id: HeroId, portraitPathOverride?: string | null): string {
  const { width: pw, height: ph } = HERO_PORTRAIT_FRAME;
  const href = (portraitPathOverride && portraitPathOverride.trim()) || HERO_PORTRAIT_PATHS[id];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${PORTRAIT_IMG_W} ${PORTRAIT_IMG_H}" preserveAspectRatio="xMidYMid meet"><image href="${href}" xlink:href="${href}" x="0" y="0" width="${PORTRAIT_IMG_W}" height="${PORTRAIT_IMG_H}" preserveAspectRatio="xMidYMid slice"/></svg>`;
}

/** Robotic unit busts under `public/enemies/` — same intrinsic size as hero portraits. */
const ENEMY_STANDALONE_PORTRAIT: Record<EnemyType, string> = {
  scrap: '/enemies/scrap-portrait.png',
  rust: '/enemies/rust-portrait.png',
  patrol: '/enemies/patrol-portrait.png',
  guard: '/enemies/guard-portrait.png',
  warden: '/enemies/warden-portrait.png',
  volt: '/enemies/volt-portrait.png',
  boss: '/enemies/boss-portrait.png',
  skitter: '/enemies/skitter-portrait.png',
  mite: '/enemies/mite-portrait.png',
  stalker: '/enemies/stalker-portrait.png',
  carapace: '/enemies/carapace-portrait.png',
  brood: '/enemies/brood-portrait.png',
  spewer: '/enemies/spewer-portrait.png',
  hiveBoss: '/enemies/hive-boss-portrait.png',
  veilShard: '/enemies/veil-shard-portrait.png',
  veilPrism: '/enemies/veil-prism-portrait.png',
  veilAegis: '/enemies/veil-aegis-portrait.png',
  veilResonance: '/enemies/veil-resonance-portrait.png',
  veilNull: '/enemies/veil-null-portrait.png',
  veilStorm: '/enemies/veil-storm-portrait.png',
  veilSynapse: '/enemies/veil-synapse-portrait.png',
  veilBoss: '/enemies/veil-boss-portrait.png',
  voidWisp: '/enemies/void-wisp-portrait.png',
  voidAcolyte: '/enemies/void-acolyte-portrait.png',
  voidScribe: '/enemies/void-scribe-portrait.png',
  voidBinder: '/enemies/void-binder-portrait.png',
  voidGlimmer: '/enemies/void-glimmer-portrait.png',
  voidChanneler: '/enemies/void-channeler-portrait.png',
  voidCircletBoss: '/enemies/void-circlet-boss-portrait.png',
  beastMonkey: '/enemies/rift-macaque-portrait.png',
  beastWolf: '/enemies/void-wolf-portrait.png',
  beastLynx: '/enemies/eclipse-lynx-portrait.png',
  beastBison: '/enemies/thunder-bison-portrait.png',
  beastHyena: '/enemies/eclipse-hyena-portrait.png',
  beastBadger: '/enemies/ridge-badger-portrait.png',
  beastTyrant: '/enemies/void-reaver-portrait.png',
  signalSkimmer: '/enemies/rust-portrait.png',
  commsHex: '/enemies/volt-portrait.png',
};

export function enemyPortraitSvg(type: EnemyType): string {
  const { width: pw, height: ph } = HERO_PORTRAIT_FRAME;
  const href = ENEMY_STANDALONE_PORTRAIT[type];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${PORTRAIT_IMG_W} ${PORTRAIT_IMG_H}" preserveAspectRatio="xMidYMid meet"><image href="${href}" xlink:href="${href}" x="0" y="0" width="${PORTRAIT_IMG_W}" height="${PORTRAIT_IMG_H}" preserveAspectRatio="xMidYMid slice"/></svg>`;
}

export const BDG_SVG: Record<string, string> = {
  bolt: `<svg class="bdg-svg" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill="currentColor" opacity=".9"/></svg>`,
  plus: `<svg class="bdg-svg" viewBox="0 0 24 24" fill="none"><path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" opacity=".9"/></svg>`,
  shield: `<svg class="bdg-svg" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v7c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-4z" fill="currentColor" opacity=".25"/><path d="M12 3.6l6.5 3.2v6.1c0 4.2-2.8 7.1-6.5 7.6-3.7-.5-6.5-3.4-6.5-7.6V6.8L12 3.6z" stroke="currentColor" stroke-width="1.2" opacity=".9"/></svg>`,
  skull: `<svg class="bdg-svg" viewBox="0 0 24 24" fill="none"><path d="M12 3c4.4 0 8 3 8 7.2 0 2.5-1.3 4.6-3.3 5.9V20c0 .6-.4 1-1 1h-1v-2h-2v2h-1v-2h-2v2H8.3c-.6 0-1-.4-1-1v-3.9C5.3 14.8 4 12.7 4 10.2 4 6 7.6 3 12 3z" fill="currentColor" opacity=".25"/><path d="M9.2 10.6c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6zm8.4 0c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6z" fill="currentColor" opacity=".9"/><path d="M10.2 15.2h3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".9"/></svg>`,
  die6: `<svg class="bdg-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" stroke="currentColor" stroke-width="1.4" opacity=".9"/>
    <circle cx="9" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
    <circle cx="9" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
    <circle cx="9" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
    <circle cx="15" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
    <circle cx="15" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
    <circle cx="15" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
  </svg>`,
};
