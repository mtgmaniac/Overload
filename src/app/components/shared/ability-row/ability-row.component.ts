import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { HeroAbility, EnemyAbility } from '../../../models/ability.interface';
import { Zone } from '../../../models/types';
import { clampHeroAbilityForTier1 } from '../../../utils/hero-ability-tier.util';

type MiniIcon = 'bolt' | 'plus' | 'shield' | 'skull' | 'die';

/** Visual family for mini chips — matches combat badge / zone attack colors. */
type AbilityMiniTone =
  | 'dmg'
  | 'heal'
  | 'shield'
  | 'dot'
  | 'rollAlly'
  | 'rollFoe'
  | 'control'
  | 'neutral';

interface AbilityMiniToken {
  icon: MiniIcon | null;
  num?: string;
  label?: string;
  /** Long text chip (e.g. REVIVE) — tighter font */
  wide?: boolean;
  /** Show clock + this value in the same chip when > 1 (DoT, shield, ±roll durations, etc.). */
  turns?: number;
  tone: AbilityMiniTone;
}

@Component({
  selector: 'app-ability-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ability-row.component.html',
  styleUrl: './ability-row.component.scss',
})
export class AbilityRowComponent {
  ability = input.required<HeroAbility | EnemyAbility>();
  zone = input.required<Zone>();
  rangeStr = input.required<string>();
  isCurrent = input(false);
  /**
   * After the unit’s die is set (hero rolled / enemy tray revealed), non-matching ability rows dim.
   * When false, all rows stay fully lit.
   */
  highlightLocked = input(false);
  /** Hero chart vs enemy chart — drives mini icon ordering and fields. */
  effectVariant = input<'hero' | 'enemy'>('hero');
  /** Tier 1: shield / ±roll buff durations shown and matched at resolve as 1 turn (DoT unchanged). */
  tier = input<1 | 2>(2);

  /** Dim this row only when a roll is locked in and this bracket is not the active one. */
  dimInactive = computed(() => this.highlightLocked() && !this.isCurrent());

  rangeLabel = computed(() => this.rangeStr());

  miniRowClass(tok: AbilityMiniToken): string {
    let c = `mi mi-${tok.tone}`;
    if (tok.wide) c += ' mi-wide';
    return c;
  }

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

  /** Native tooltip: name, data `eff`, then mechanical summary when it adds detail (hover). */
  abilityTooltip = computed((): string => {
    const a = this.ability();
    const mech = this.effectSummary();
    const eff = a.eff?.trim() ?? '';
    if (!eff.length) return `${a.name}\n\n${mech}`;
    if (eff === mech) return `${a.name}\n\n${eff}`;
    return `${a.name}\n\n${eff}\n\n${mech}`;
  });

  abilityAriaLabel = computed((): string => {
    const a = this.ability();
    const eff = a.eff?.trim() ?? '';
    const mech = this.effectSummary();
    if (!eff.length) return `${a.name}. ${mech}`;
    if (eff === mech) return `${a.name}. ${eff}`;
    return `${a.name}. ${eff}. ${mech}`;
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
    if (a.cloak) parts.push('Cloak');
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
      parts.push(ab.erbAll ? `+${ab.erb} roll to allies${t}` : `+${ab.erb} roll${t}`);
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

  private multiTurn(turns: number | undefined): number | undefined {
    const t = turns ?? 0;
    return t > 1 ? t : undefined;
  }

  private buildHeroMinis(a: HeroAbility): AbilityMiniToken[] {
    const out: AbilityMiniToken[] = [];
    const dLo = a.dMin || 0;
    const dHi = a.dMax || 0;
    const hasSpread = dLo > 0 && dHi > 0 && dLo !== dHi;
    const combatDmg = (a.dmg || 0) > 0 ? a.dmg! : 0;
    const flatBracket = dLo > 0 && dHi > 0 && dLo === dHi ? dLo : 0;
    const allDmg = a.blastAll || a.multiHit;
    if (combatDmg > 0) {
      const n = String(combatDmg);
      out.push({
        icon: 'bolt',
        num: allDmg ? `${n}·ALL` : n,
        tone: 'dmg',
      });
    } else if (hasSpread) {
      const lab = allDmg ? `${dLo}-${dHi}·ALL` : `${dLo}-${dHi}`;
      out.push({ icon: 'bolt', label: lab, tone: 'dmg' });
    } else if (flatBracket > 0) {
      const n = allDmg ? `${flatBracket}·ALL` : String(flatBracket);
      out.push({ icon: 'bolt', num: n, tone: 'dmg' });
    }
    if ((a.heal || 0) > 0) {
      const n = a.healAll ? `${a.heal}·ALL` : String(a.heal);
      out.push({ icon: 'plus', num: n, tone: 'heal' });
    }
    if ((a.shield || 0) > 0) {
      const n = a.shieldAll ? `${a.shield}·ALL` : String(a.shield);
      out.push({
        icon: 'shield',
        num: n,
        turns: this.multiTurn(a.shT),
        tone: 'shield',
      });
    }
    if ((a.dot || 0) > 0) {
      out.push({
        icon: 'skull',
        num: String(a.dot),
        turns: this.multiTurn(a.dT),
        tone: 'dot',
      });
    }
    if ((a.rfe || 0) > 0) {
      out.push({
        icon: 'die',
        num: a.rfeAll ? `-${a.rfe}·ALL` : `-${a.rfe}`,
        turns: this.multiTurn(a.rfT),
        tone: 'rollFoe',
      });
    }
    if ((a.rfm || 0) > 0) {
      out.push({
        icon: 'die',
        num: `+${a.rfm}`,
        turns: this.multiTurn(a.rfmT),
        tone: 'rollAlly',
      });
    }
    if (a.ignSh) out.push({ icon: null, label: 'PIERCE', tone: 'dmg' });
    if (a.splitDmg) out.push({ icon: null, label: 'SPLIT', tone: 'dmg' });
    if (a.revive) out.push({ icon: null, label: 'REVIVE', wide: true, tone: 'heal' });
    if (a.cloak) out.push({ icon: null, label: 'Cloak', tone: 'control' });
    if (a.taunt) out.push({ icon: null, label: 'TAUNT', tone: 'control' });
    if (!out.length) out.push({ icon: null, label: '—', tone: 'neutral' });
    return out;
  }

  private buildEnemyMinis(ab: EnemyAbility): AbilityMiniToken[] {
    const out: AbilityMiniToken[] = [];
    if ((ab.dmg || 0) > 0) {
      const n =
        ab.dmgP2 != null && ab.dmgP2 > 0 && ab.dmgP2 !== ab.dmg
          ? `${ab.dmg}/${ab.dmgP2}`
          : String(ab.dmg);
      out.push({ icon: 'bolt', num: n, tone: 'dmg' });
    }
    if ((ab.dot || 0) > 0) {
      out.push({
        icon: 'skull',
        num: String(ab.dot),
        turns: this.multiTurn(ab.dT),
        tone: 'dot',
      });
    }
    if ((ab.rfm || 0) > 0) {
      out.push({
        icon: 'die',
        num: `-${ab.rfm}`,
        turns: this.multiTurn(ab.rfmT),
        tone: 'rollFoe',
      });
    }
    if (ab.wipeShields) out.push({ icon: null, label: 'WIPE', tone: 'dmg' });
    if ((ab.heal || 0) > 0) out.push({ icon: 'plus', num: String(ab.heal), tone: 'heal' });
    if ((ab.shield || 0) > 0) {
      out.push({
        icon: 'shield',
        num: String(ab.shield),
        turns: this.multiTurn(ab.shT),
        tone: 'shield',
      });
    }
    if ((ab.shieldAlly || 0) > 0) {
      out.push({
        icon: 'shield',
        num: String(ab.shieldAlly),
        turns: this.multiTurn(ab.shT),
        tone: 'shield',
      });
    }
    if ((ab.lifestealPct || 0) > 0)
      out.push({ icon: 'plus', num: `${ab.lifestealPct}%`, tone: 'heal' });
    if ((ab.rfe || 0) > 0) {
      out.push({
        icon: 'die',
        num: `-${ab.rfe}`,
        turns: this.multiTurn(ab.rfT),
        tone: 'rollFoe',
      });
    }
    if ((ab.erb || 0) > 0) {
      const n = ab.erbAll ? `+${ab.erb}·ALL` : `+${ab.erb}`;
      out.push({
        icon: 'die',
        num: n,
        turns: this.multiTurn(ab.erbT),
        tone: 'rollAlly',
      });
    }
    if ((ab.summonChance ?? 0) > 0) out.push({ icon: null, label: 'SUM', tone: 'control' });
    if (ab.counterspellZone && (ab.counterspellT || 0) > 0) {
      const z = ab.counterspellZone.toUpperCase();
      out.push({
        icon: null,
        label: ab.counterspellAll ? `CS·${z}·ALL` : `CS·${z}`,
        turns: this.multiTurn(ab.counterspellT),
        tone: 'control',
      });
    }
    if ((ab.grantRampage || 0) > 0)
      out.push({ icon: 'bolt', num: `R+${ab.grantRampage}`, tone: 'dmg' });
    if ((ab.grantRampageAll || 0) > 0)
      out.push({ icon: null, label: `RALL+${ab.grantRampageAll}`, tone: 'dmg' });
    if ((ab.cowerT || 0) > 0) {
      out.push({
        icon: null,
        label: ab.cowerAll ? 'FEAR·ALL' : 'FEAR',
        turns: this.multiTurn(ab.cowerT),
        tone: 'rollFoe',
      });
    }
    if (!out.length) out.push({ icon: null, label: '—', tone: 'neutral' });
    return out;
  }
}
