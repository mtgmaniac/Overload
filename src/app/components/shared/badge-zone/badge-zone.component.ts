import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  inject,
} from '@angular/core';
import { GameStateService } from '../../../services/game-state.service';
import {
  BadgeProjectionService,
  HeroBadgeSnapshot,
  EnemyBadgeSnapshot,
} from '../../../services/badge-projection.service';

@Component({
  selector: 'app-badge-zone',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (kind() === 'hero') {
      @let h = heroSnap();
      <div class="bdg-wrap">
        <div class="bdg-lbl">Incoming</div>
        <div class="bdg-row-4">
          <div class="bdg-slot" [class.empty]="h.incomingDmg <= 0" [class.bdg-dmg]="h.incomingDmg > 0">
            <svg class="bdg-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill="currentColor" opacity=".9"/>
            </svg>
            <span>{{ h.incomingDmg > 0 ? h.incomingDmg : '—' }}</span>
          </div>
          <div class="bdg-slot" [class.empty]="h.incomingHeal <= 0" [class.bdg-heal]="h.incomingHeal > 0">
            <svg class="bdg-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" opacity=".9"/>
            </svg>
            <span>{{ h.incomingHeal > 0 ? h.incomingHeal : '—' }}</span>
          </div>
          <div class="bdg-slot" [class.empty]="h.incomingShield <= 0" [class.bdg-sh]="h.incomingShield > 0">
            <svg class="bdg-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l8 4v7c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-4z" fill="currentColor" opacity=".25"/>
              <path d="M12 3.6l6.5 3.2v6.1c0 4.2-2.8 7.1-6.5 7.6-3.7-.5-6.5-3.4-6.5-7.6V6.8L12 3.6z" stroke="currentColor" stroke-width="1.2" opacity=".9" fill="none"/>
            </svg>
            <span>{{ h.incomingShield > 0 ? h.incomingShield : '—' }}</span>
          </div>
          <div class="bdg-slot" [class.empty]="h.incomingRollNet === 0" [class.bdg-rollp]="h.incomingRollNet > 0" [class.bdg-rolln]="h.incomingRollNet < 0">
            <svg class="bdg-svg bdg-die-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" stroke="currentColor" stroke-width="1.4" opacity=".9"/>
              <circle cx="9" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="9" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="9" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
            </svg>
            <span>{{ rollModLabel(h.incomingRollNet) }}</span>
          </div>
        </div>
        <div class="bdg-sep"></div>
        <div class="bdg-lbl">Status</div>
        <div class="bdg-row-3">
          <div class="bdg-slot" [class.empty]="h.statusShield <= 0" [class.bdg-sh]="h.statusShield > 0">
            <svg class="bdg-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l8 4v7c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-4z" fill="currentColor" opacity=".25"/>
              <path d="M12 3.6l6.5 3.2v6.1c0 4.2-2.8 7.1-6.5 7.6-3.7-.5-6.5-3.4-6.5-7.6V6.8L12 3.6z" stroke="currentColor" stroke-width="1.2" opacity=".9" fill="none"/>
            </svg>
            <span>{{ h.statusShield > 0 ? h.statusShield : '—' }}</span>
          </div>
          <div class="bdg-slot" [class.empty]="h.statusDot <= 0" [class.bdg-poison]="h.statusDot > 0">
            <svg class="bdg-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3c4.4 0 8 3 8 7.2 0 2.5-1.3 4.6-3.3 5.9V20c0 .6-.4 1-1 1h-1v-2h-2v2h-1v-2h-2v2H8.3c-.6 0-1-.4-1-1v-3.9C5.3 14.8 4 12.7 4 10.2 4 6 7.6 3 12 3z" fill="currentColor" opacity=".25"/>
              <path d="M9.2 10.6c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6zm8.4 0c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6z" fill="currentColor" opacity=".9"/>
              <path d="M10.2 15.2h3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>
            </svg>
            <span>{{ h.statusDot > 0 ? h.statusDot : '—' }}</span>
          </div>
          <div class="bdg-slot bdg-slot--roll"
               [class.empty]="h.netRollMod === 0 && h.pendingNextRoll === 0"
               [class.bdg-rollp]="h.netRollMod > 0 || h.pendingNextRoll > 0"
               [class.bdg-rolln]="h.netRollMod < 0">
            <svg class="bdg-svg bdg-die-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" stroke="currentColor" stroke-width="1.4" opacity=".9"/>
              <circle cx="9" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="9" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="9" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
            </svg>
            <span class="bdg-roll-stack">
              <span class="bdg-roll-main">{{ rollModLabel(h.netRollMod) }}</span>
              @if (h.pendingNextRoll > 0) {
                <span class="bdg-roll-next">+{{ h.pendingNextRoll }} next</span>
              }
            </span>
          </div>
        </div>
      </div>
    } @else {
      @let e = enemySnap();
      <div class="bdg-wrap">
        <div class="bdg-lbl">Incoming</div>
        <div class="bdg-row-4 bdg-enemy-incoming">
          <div class="bdg-slot" [class.empty]="e.incomingDmg <= 0" [class.bdg-dmg]="e.incomingDmg > 0" title="Damage from heroes this turn">
            <svg class="bdg-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill="currentColor" opacity=".9"/>
            </svg>
            <span>{{ e.incomingDmg > 0 ? e.incomingDmg : '—' }}</span>
          </div>
          <div class="bdg-slot" [class.empty]="e.incomingRfe <= 0" [class.bdg-rolln]="e.incomingRfe > 0" title="Roll debuff from heroes">
            <svg class="bdg-svg bdg-die-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" stroke="currentColor" stroke-width="1.4" opacity=".9"/>
              <circle cx="9" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="9" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="9" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
            </svg>
            <span>{{ e.incomingRfe > 0 ? '-' + e.incomingRfe : '—' }}</span>
          </div>
          <div class="bdg-slot" [class.empty]="e.incomingDot <= 0" [class.bdg-poison]="e.incomingDot > 0" title="DoT from heroes">
            <svg class="bdg-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3c4.4 0 8 3 8 7.2 0 2.5-1.3 4.6-3.3 5.9V20c0 .6-.4 1-1 1h-1v-2h-2v2h-1v-2h-2v2H8.3c-.6 0-1-.4-1-1v-3.9C5.3 14.8 4 12.7 4 10.2 4 6 7.6 3 12 3z" fill="currentColor" opacity=".25"/>
              <path d="M9.2 10.6c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6zm8.4 0c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6z" fill="currentColor" opacity=".9"/>
              <path d="M10.2 15.2h3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>
            </svg>
            <span>{{ e.incomingDot > 0 ? e.incomingDot : '—' }}</span>
          </div>
          <div class="bdg-slot" [class.empty]="e.incomingLifestealHeal <= 0" [class.bdg-heal]="e.incomingLifestealHeal > 0" title="Expected heal from this unit’s next lifesteal hit">
            <svg class="bdg-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" opacity=".9"/>
            </svg>
            <span>{{ e.incomingLifestealHeal > 0 ? e.incomingLifestealHeal : '—' }}</span>
          </div>
        </div>
        <div class="bdg-sep"></div>
        <div class="bdg-lbl">Status</div>
        <div class="bdg-row-4">
          <div class="bdg-slot" [class.empty]="e.statusShield <= 0" [class.bdg-sh]="e.statusShield > 0">
            <svg class="bdg-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l8 4v7c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-4z" fill="currentColor" opacity=".25"/>
              <path d="M12 3.6l6.5 3.2v6.1c0 4.2-2.8 7.1-6.5 7.6-3.7-.5-6.5-3.4-6.5-7.6V6.8L12 3.6z" stroke="currentColor" stroke-width="1.2" opacity=".9" fill="none"/>
            </svg>
            <span>{{ e.statusShield > 0 ? e.statusShield : '—' }}</span>
          </div>
          <div class="bdg-slot" [class.empty]="e.statusDot <= 0" [class.bdg-poison]="e.statusDot > 0">
            <svg class="bdg-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3c4.4 0 8 3 8 7.2 0 2.5-1.3 4.6-3.3 5.9V20c0 .6-.4 1-1 1h-1v-2h-2v2h-1v-2h-2v2H8.3c-.6 0-1-.4-1-1v-3.9C5.3 14.8 4 12.7 4 10.2 4 6 7.6 3 12 3z" fill="currentColor" opacity=".25"/>
              <path d="M9.2 10.6c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6zm8.4 0c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6z" fill="currentColor" opacity=".9"/>
              <path d="M10.2 15.2h3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>
            </svg>
            <span>{{ e.statusDot > 0 ? e.statusDot : '—' }}</span>
          </div>
          <div class="bdg-slot" [class.empty]="e.statusRfe <= 0" [class.bdg-rolln]="e.statusRfe > 0">
            <svg class="bdg-svg bdg-die-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" stroke="currentColor" stroke-width="1.4" opacity=".9"/>
              <circle cx="9" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="9" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="9" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
            </svg>
            <span>{{ e.statusRfe > 0 ? '-' + e.statusRfe : '—' }}</span>
          </div>
          <div class="bdg-slot" [class.empty]="e.statusErb <= 0" [class.bdg-rollp]="e.statusErb > 0">
            <svg class="bdg-svg bdg-die-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" stroke="currentColor" stroke-width="1.4" opacity=".9"/>
              <circle cx="9" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="9" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="9" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="8.5" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="12" r="1.35" fill="currentColor" opacity=".95"/>
              <circle cx="15" cy="15.5" r="1.35" fill="currentColor" opacity=".95"/>
            </svg>
            <span>{{ e.statusErb > 0 ? '+' + e.statusErb : '—' }}</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .bdg-wrap { display: flex; flex-direction: column; gap: 3px; margin-top: 2px; }
    .bdg-lbl {
      font-family: var(--font-pixel); font-size: 8px; font-weight: 900;
      letter-spacing: 1px; color: #9bc0dd;
    }
    .bdg-sep { height: 2px; background: var(--border); margin: 1px 0; }
    .bdg-row-3 {
      display: flex; --bdg-gap: 2px; gap: var(--bdg-gap); flex-wrap: nowrap; justify-content: flex-start;
    }
    .bdg-row-3 > .bdg-slot {
      flex: 1 1 0;
      min-width: 0;
    }
    .bdg-row-4 {
      display: flex; --bdg-gap: 2px; gap: var(--bdg-gap); flex-wrap: nowrap; justify-content: flex-start; width: 100%;
    }
    .bdg-enemy-incoming > .bdg-slot {
      height: 15px;
      padding: 0 1px;
      font-size: 7px;
    }
    .bdg-row-4 > .bdg-slot {
      flex: 1 1 0;
      min-width: 0;
      height: 15px;
      gap: 2px;
      padding: 0 1px;
      font-size: 8px;
      border-radius: var(--radius-pixel);
    }
    .bdg-row-4 .bdg-svg { width: 9px; height: 9px; }
    .bdg-row-4 .bdg-die-svg { width: 10px; height: 10px; }
    .bdg-slot {
      height: 16px; display: flex; align-items: center; justify-content: center; gap: 3px;
      border-radius: var(--radius-pixel); border: 1px solid var(--border); background: var(--bg);
      font-family: var(--font-pixel); font-size: 9px; font-weight: 800; color: var(--text);
      white-space: nowrap; overflow: hidden;
    }
    .bdg-slot.empty { opacity: .05; border-color: rgba(255,255,255,.06); background: transparent; }
    .bdg-svg { width: 10px; height: 10px; display: inline-block; flex: 0 0 auto; color: currentColor; }
    .bdg-die-svg { width: 11px; height: 11px; }
    .bdg-dmg { color: #d84a2a; border-color: rgba(216,74,42,.35); background: rgba(216,74,42,.08); opacity: 1; }
    .bdg-heal { color: #2ec46a; border-color: rgba(46,196,106,.35); background: rgba(46,196,106,.08); opacity: 1; }
    .bdg-sh { color: #2e7dd4; border-color: rgba(46,125,212,.35); background: rgba(46,125,212,.08); opacity: 1; }
    .bdg-poison { color: #b67bff; border-color: rgba(182,123,255,.35); background: rgba(182,123,255,.08); opacity: 1; }
    .bdg-rollp { color: #2ec46a; border-color: rgba(46,196,106,.35); background: rgba(46,196,106,.08); opacity: 1; }
    .bdg-rolln { color: #e8b84a; border-color: rgba(232,184,74,.35); background: rgba(232,184,74,.08); opacity: 1; }
    .bdg-slot--roll {
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 3px;
      line-height: 1;
      padding: 0 2px;
      height: 16px;
      min-height: 16px;
    }
    .bdg-roll-stack {
      display: inline-flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      gap: 3px;
      min-width: 0;
      white-space: nowrap;
    }
    .bdg-roll-main { font-size: 9px; flex: 0 0 auto; }
    .bdg-roll-next { font-size: 7px; font-weight: 700; color: #8fd4a8; letter-spacing: 0; flex: 0 0 auto; }
  `],
})
export class BadgeZoneComponent {
  private state = inject(GameStateService);
  private projection = inject(BadgeProjectionService);

  kind = input.required<'hero' | 'enemy'>();
  index = input.required<number>();

  heroSnap = computed((): HeroBadgeSnapshot => {
    this.state.heroes();
    this.state.enemies();
    this.state.squadRfmStacks();
    this.state.squadRfmPenalty();
    this.state.allHeroesRolled();
    return this.projection.heroBadges(this.index());
  });

  enemySnap = computed((): EnemyBadgeSnapshot => {
    this.state.heroes();
    this.state.enemies();
    this.state.squadRfmStacks();
    this.state.squadRfmPenalty();
    this.state.allHeroesRolled();
    return this.projection.enemyBadges(this.index());
  });

  rollModLabel(net: number): string {
    if (net === 0) return '—';
    return net > 0 ? `+${net}` : `${net}`;
  }
}
