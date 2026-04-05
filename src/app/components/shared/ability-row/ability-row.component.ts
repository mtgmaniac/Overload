import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { HeroAbility, EnemyAbility } from '../../../models/ability.interface';
import { Zone, ZONE_CLASSES } from '../../../models/types';
import { clampHeroAbilityForTier1 } from '../../../utils/hero-ability-tier.util';

type MiniIcon = 'bolt' | 'plus' | 'shield' | 'skull' | 'die';

interface AbilityMiniToken {
  icon: MiniIcon | null;
  num?: string;
  label?: string;
}

@Component({
  selector: 'app-ability-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ap-row" [class.cur]="isCurrent()" [attr.title]="ability().name + ' — ' + effectSummary()">
      <span class="az" [class]="zoneClass()">{{ rangeLabel() }}</span>
      <span class="an">{{ ability().name }}</span>
      @if (isCurrent()) {
        <span class="ae ae-eff">{{ effectSummary() }}</span>
      } @else {
        <span class="ae ae-mini-row">
          @for (tok of miniTokens(); track $index) {
            <span class="mi">
              @switch (tok.icon) {
                @case ('bolt') {
                  <svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill="currentColor" opacity=".9"/>
                  </svg>
                }
                @case ('plus') {
                  <svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" opacity=".9"/>
                  </svg>
                }
                @case ('shield') {
                  <svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2l8 4v7c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-4z" fill="currentColor" opacity=".25"/>
                    <path d="M12 3.6l6.5 3.2v6.1c0 4.2-2.8 7.1-6.5 7.6-3.7-.5-6.5-3.4-6.5-7.6V6.8L12 3.6z" stroke="currentColor" stroke-width="1.2" opacity=".9" fill="none"/>
                  </svg>
                }
                @case ('skull') {
                  <svg class="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3c4.4 0 8 3 8 7.2 0 2.5-1.3 4.6-3.3 5.9V20c0 .6-.4 1-1 1h-1v-2h-2v2h-1v-2h-2v2H8.3c-.6 0-1-.4-1-1v-3.9C5.3 14.8 4 12.7 4 10.2 4 6 7.6 3 12 3z" fill="currentColor" opacity=".25"/>
                    <path d="M9.2 10.6c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6zm8.4 0c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6z" fill="currentColor" opacity=".9"/>
                    <path d="M10.2 15.2h3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>
                  </svg>
                }
                @case ('die') {
                  <svg class="ic ic-die" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" stroke="currentColor" stroke-width="1.4" opacity=".9"/>
                    <circle cx="9" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
                    <circle cx="9" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
                    <circle cx="9" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
                    <circle cx="15" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
                    <circle cx="15" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
                    <circle cx="15" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
                  </svg>
                }
              }
              @if (tok.num !== undefined) {
                <span class="n">{{ tok.num }}</span>
              } @else if (tok.label) {
                <span class="n">{{ tok.label }}</span>
              }
            </span>
          }
        </span>
      }
    </div>
  `,
  styles: [`
    /* Fixed row height: current vs inactive must not change card layout */
    .ap-row {
      display: flex;
      align-items: center;
      gap: 3px;
      margin-bottom: 2px;
      opacity: .28;
      transition: opacity 0.12s steps(2, end);
      height: 20px;
      min-height: 20px;
      max-height: 20px;
      box-sizing: border-box;
      overflow: hidden;
      flex-shrink: 0;
    }
    .ap-row.cur { opacity: 1; background: rgba(255,255,255,.06); border-radius: var(--radius-pixel); box-shadow: inset 2px 2px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.35); }
    .az { font-family: var(--font-pixel); padding: 0 2px; border-radius: var(--radius-pixel); font-size: 7px; font-weight: 700; min-width: 28px; text-align: center; flex-shrink: 0; line-height: 1; }
    .az-r { background: #0a2a1e; color: #1d9e75; border: 1px solid #0f6e56; }
    .az-s { background: #091828; color: #2e7dd4; border: 1px solid #1a4a8a; }
    .az-su { background: #1e1a04; color: #e8b84a; border: 1px solid #8a7010; }
    .az-c { background: #1e1408; color: #c47a1a; border: 1px solid #7a4a10; }
    .az-o { background: #1e0a06; color: #d84a2a; border: 1px solid #8a2a10; }
    .an { font-family: var(--font-pixel); color: #c8ddf0; font-size: 8px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.1; }
    .ae {
      font-family: var(--font-pixel);
      color: #4a6a8a;
      font-size: 8px;
      text-align: right;
      min-width: 0;
      flex-shrink: 0;
      max-width: 52%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      overflow: hidden;
      box-sizing: border-box;
    }
    .ae-eff {
      width: 100%;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.1;
    }
    .ae-mini-row {
      display: flex;
      gap: 2px;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: nowrap;
      max-width: 100%;
      min-width: 0;
      height: 100%;
      overflow: hidden;
    }
    .mi {
      display: inline-flex;
      align-items: center;
      gap: 1px;
      padding: 0 2px;
      max-height: 16px;
      border-radius: var(--radius-pixel);
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--muted);
      line-height: 1;
      flex-shrink: 0;
      box-sizing: border-box;
    }
    .ic { width: 10px; height: 10px; flex-shrink: 0; color: currentColor; }
    .ic-die { width: 11px; height: 11px; }
    .n { color: #c8ddf0; font-weight: 900; font-size: 7px; font-family: var(--font-pixel); }
  `],
})
export class AbilityRowComponent {
  ability = input.required<HeroAbility | EnemyAbility>();
  zone = input.required<Zone>();
  rangeStr = input.required<string>();
  isCurrent = input(false);
  /** Hero chart vs enemy chart — drives mini icon ordering and fields. */
  effectVariant = input<'hero' | 'enemy'>('hero');
  /** Tier 1: shield / ±roll buff durations shown and matched at resolve as 1 turn (DoT unchanged). */
  tier = input<1 | 2>(2);

  zoneClass = computed(() => `az ${ZONE_CLASSES[this.zone()]}`);
  rangeLabel = computed(() => this.rangeStr());

  private heroAbilityView = computed((): HeroAbility => {
    const a = this.ability() as HeroAbility;
    return this.tier() === 1 ? clampHeroAbilityForTier1(a) : a;
  });

  miniTokens = computed((): AbilityMiniToken[] =>
    this.effectVariant() === 'enemy'
      ? this.buildEnemyMinis(this.ability() as EnemyAbility)
      : this.buildHeroMinis(this.heroAbilityView()),
  );

  /** Labeled numbers from ability stats (matches combat + badges). */
  effectSummary = computed((): string => {
    if (this.effectVariant() === 'enemy') {
      return this.buildEnemyEffectSummary(this.ability() as EnemyAbility);
    }
    return this.buildHeroEffectSummary(this.heroAbilityView());
  });

  private buildHeroEffectSummary(a: HeroAbility): string {
    const parts: string[] = [];
    const dLo = a.dMin || 0;
    const dHi = a.dMax || 0;
    const hasSpread = dLo > 0 && dHi > 0 && dLo !== dHi;
    /** Combat always uses `dmg` when set; spread is legacy display only. */
    const combatDmg = (a.dmg || 0) > 0 ? a.dmg! : 0;
    const flatBracket = dLo > 0 && dHi > 0 && dLo === dHi ? dLo : 0;

    if (combatDmg > 0) {
      let s = `${combatDmg} dmg`;
      if (a.blastAll || a.multiHit) s += ' (all enemies)';
      if (a.ignSh) s += ', pierce';
      parts.push(s);
    } else if (hasSpread) {
      let s = `${dLo}-${dHi} dmg`;
      if (a.blastAll || a.multiHit) s += ' (all enemies)';
      if (a.ignSh) s += ', pierce';
      parts.push(s);
    } else if (flatBracket > 0) {
      let s = `${flatBracket} dmg`;
      if (a.blastAll || a.multiHit) s += ' (all enemies)';
      if (a.ignSh) s += ', pierce';
      parts.push(s);
    }
    if (a.splitDmg && (combatDmg > 0 || hasSpread || flatBracket > 0)) parts.push('split');

    if ((a.heal || 0) > 0) {
      if (a.healAll) parts.push(`all ${a.heal} heal`);
      else if (a.healLowest) parts.push(`lowest ${a.heal} heal`);
      else if (a.healTgt) parts.push(`${a.heal} heal (ally)`);
      else if (combatDmg > 0 || hasSpread || flatBracket > 0) parts.push(`heal self ${a.heal}`);
      else parts.push(`${a.heal} heal`);
    }

    if ((a.shield || 0) > 0) {
      const t = (a.shT || 0) > 1 ? `, ${a.shT}t` : '';
      if (a.shieldAll) parts.push(`all ${a.shield} shield${t}`);
      else if (a.shTgt) parts.push(`ally ${a.shield} shield${t}`);
      else parts.push(`self ${a.shield} shield${t}`);
    }

    if ((a.dot || 0) > 0) {
      const t = (a.dT || 0) > 1 ? `, ${a.dT}t` : '';
      parts.push(`${a.dot} DoT${t}`);
    }

    if ((a.rfe || 0) > 0) {
      const t = (a.rfT || 0) > 1 ? `, ${a.rfT}t` : '';
      if (a.rfeAll) parts.push(`all -${a.rfe} roll${t}`);
      else parts.push(`-${a.rfe} roll${t}`);
    }

    if ((a.rfm || 0) > 0) {
      const t = (a.rfmT || 0) > 1 ? `, ${a.rfmT}t` : '';
      if (a.rfmTgt) parts.push(`+${a.rfm} roll ally${t}`);
      else if (a.shTgt && (a.shield || 0) > 0) parts.push(`+${a.rfm} roll any ally${t}`);
      else parts.push(`+${a.rfm} squad roll${t}`);
    }

    if (a.revive) parts.push('revive 50%');
    if (a.cloak) parts.push('cloak (80% dodge next hit)');
    if (a.taunt) parts.push('taunt (enemies target you)');

    return parts.length ? parts.join(', ') : '—';
  }

  private buildEnemyEffectSummary(ab: EnemyAbility): string {
    const parts: string[] = [];
    if ((ab.dmg || 0) > 0) {
      if (ab.dmgP2 != null && ab.dmgP2 > 0 && ab.dmgP2 !== ab.dmg) {
        parts.push(`${ab.dmg} dmg (P2 ${ab.dmgP2})`);
      } else {
        parts.push(`${ab.dmg} dmg`);
      }
    }
    if ((ab.dot || 0) > 0) {
      const t = (ab.dT || 0) > 1 ? `, ${ab.dT}t` : '';
      parts.push(`${ab.dot} DoT${t}`);
    }
    if ((ab.rfm || 0) > 0) {
      const t = (ab.rfmT || 0) > 1 ? `, ${ab.rfmT}t` : '';
      parts.push(`-${ab.rfm} roll${t}`);
    }
    if (ab.wipeShields) parts.push('wipe shields');
    if ((ab.heal || 0) > 0) parts.push(`${ab.heal} heal`);
    if ((ab.shield || 0) > 0) {
      const t = (ab.shT || 0) > 1 ? `, ${ab.shT}t` : '';
      parts.push(`${ab.shield} shield${t}`);
    }
    if ((ab.shieldAlly || 0) > 0) {
      const t = (ab.shT || 0) > 1 ? `, ${ab.shT}t` : '';
      parts.push(`ally ${ab.shieldAlly} shield${t}`);
    }
    if ((ab.rfe || 0) > 0) {
      const t = (ab.rfT || 0) > 1 ? `, ${ab.rfT}t` : '';
      parts.push(`-${ab.rfe} roll${t}`);
    }
    if ((ab.lifestealPct || 0) > 0) parts.push(`lifesteal ${ab.lifestealPct}%`);
    if ((ab.erb || 0) > 0) {
      const t = (ab.erbT || 0) > 1 ? `, ${ab.erbT}t` : '';
      parts.push(`${ab.erbAll ? 'all ' : ''}+${ab.erb} enemy roll${t}`);
    }
    if ((ab.summonChance ?? 0) > 0) parts.push(`summon ~${ab.summonChance}% nat20`);
    if (ab.counterspellZone && (ab.counterspellT || 0) > 0) {
      const t = ab.counterspellT || 1;
      parts.push(
        ab.counterspellAll
          ? `counterspell ${ab.counterspellZone} all (${t}t)`
          : `counterspell ${ab.counterspellZone} (${t}t)`,
      );
    }
    if ((ab.grantRampage || 0) > 0) parts.push(`rampage +${ab.grantRampage}`);
    if ((ab.grantRampageAll || 0) > 0) parts.push(`rampage all +${ab.grantRampageAll}`);
    if ((ab.cowerT || 0) > 0) {
      parts.push(ab.cowerAll ? `cower all ${ab.cowerT}r` : `cower ${ab.cowerT}r`);
    }
    return parts.length ? parts.join(', ') : '—';
  }

  private buildHeroMinis(a: HeroAbility): AbilityMiniToken[] {
    const out: AbilityMiniToken[] = [];
    const dLo = a.dMin || 0;
    const dHi = a.dMax || 0;
    const hasSpread = dLo > 0 && dHi > 0 && dLo !== dHi;
    const combatDmg = (a.dmg || 0) > 0 ? a.dmg! : 0;
    const flatBracket = dLo > 0 && dHi > 0 && dLo === dHi ? dLo : 0;
    if (combatDmg > 0) {
      const n = String(combatDmg);
      out.push({ icon: 'bolt', num: a.blastAll || a.multiHit ? `${n}·ALL` : n });
    } else if (hasSpread) {
      out.push({ icon: 'bolt', label: `${dLo}-${dHi}` });
    } else if (flatBracket > 0) {
      out.push({ icon: 'bolt', num: String(flatBracket) });
    }
    if ((a.heal || 0) > 0) out.push({ icon: 'plus', num: String(a.heal) });
    if ((a.shield || 0) > 0) out.push({ icon: 'shield', num: String(a.shield) });
    if ((a.dot || 0) > 0) out.push({ icon: 'skull', num: String(a.dot) });
    if ((a.rfe || 0) > 0)
      out.push({ icon: 'die', num: a.rfeAll ? `-${a.rfe}·ALL` : `-${a.rfe}` });
    if ((a.rfm || 0) > 0) {
      const tag = a.rfmTgt ? `+${a.rfm}·A` : a.shTgt && (a.shield || 0) > 0 ? `+${a.rfm}·any` : `+${a.rfm}`;
      out.push({ icon: 'die', num: tag });
    }
    if (a.ignSh) out.push({ icon: null, label: 'PIERCE' });
    if (a.splitDmg) out.push({ icon: null, label: 'SPLIT' });
    if (a.revive) out.push({ icon: null, label: 'REV' });
    if (a.cloak) out.push({ icon: null, label: 'CLOAK' });
    if (a.taunt) out.push({ icon: null, label: 'TAUNT' });
    if (!out.length) out.push({ icon: null, label: '—' });
    return out;
  }

  private buildEnemyMinis(ab: EnemyAbility): AbilityMiniToken[] {
    const out: AbilityMiniToken[] = [];
    if ((ab.dmg || 0) > 0) {
      const n =
        ab.dmgP2 != null && ab.dmgP2 > 0 && ab.dmgP2 !== ab.dmg
          ? `${ab.dmg}/${ab.dmgP2}`
          : String(ab.dmg);
      out.push({ icon: 'bolt', num: n });
    }
    if ((ab.dot || 0) > 0) out.push({ icon: 'skull', num: String(ab.dot) });
    if ((ab.rfm || 0) > 0) out.push({ icon: 'die', num: `-${ab.rfm}` });
    if (ab.wipeShields) out.push({ icon: null, label: 'WIPE' });
    if ((ab.heal || 0) > 0) out.push({ icon: 'plus', num: String(ab.heal) });
    if ((ab.shield || 0) > 0) out.push({ icon: 'shield', num: String(ab.shield) });
    if ((ab.shieldAlly || 0) > 0) out.push({ icon: 'shield', num: `A${ab.shieldAlly}` });
    if ((ab.lifestealPct || 0) > 0) out.push({ icon: 'plus', num: `${ab.lifestealPct}%` });
    if ((ab.erb || 0) > 0) out.push({ icon: 'die', num: `E+${ab.erb}` });
    if ((ab.summonChance ?? 0) > 0) out.push({ icon: null, label: 'SUM' });
    if (ab.counterspellZone && (ab.counterspellT || 0) > 0) {
      out.push({ icon: null, label: `CS ${ab.counterspellZone}${ab.counterspellAll ? '·A' : ''}` });
    }
    if ((ab.grantRampage || 0) > 0) out.push({ icon: 'bolt', num: `R+${ab.grantRampage}` });
    if ((ab.grantRampageAll || 0) > 0) out.push({ icon: null, label: `RALL+${ab.grantRampageAll}` });
    if ((ab.cowerT || 0) > 0) out.push({ icon: null, label: ab.cowerAll ? `FEAR·${ab.cowerT}` : `FEAR ${ab.cowerT}` });
    if (!out.length) out.push({ icon: null, label: '—' });
    return out;
  }
}
