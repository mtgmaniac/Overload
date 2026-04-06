import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ProtocolService } from '../../services/protocol.service';
import { ItemService } from '../../services/item.service';
import {
  PROTOCOL_MAX,
  PROTOCOL_REROLL_COST,
  PROTOCOL_NUDGE_COST,
  PROTOCOL_NUDGE_DELTA,
} from '../../models/constants';
import type { ItemDefinition } from '../../models/item.interface';

@Component({
  selector: 'app-protocol-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="protocol-strip" id="tut-protocol-strip">
      <div class="protocol-bar-wrap" id="tut-protocol-meter">
        <div class="protocol-bar-fill" [style.width]="barWidth()"></div>
        <div class="protocol-bar-txt">PROTOCOL {{ state.protocol() }}/{{ max }}</div>
      </div>
      <div class="protocol-actions" id="tut-protocol-primary-icons">
        <button id="protocol-reroll-btn" type="button" class="proto-ic-btn" [class.active]="state.pendingProtocol() === 'reroll'"
                [disabled]="!canReroll()" (click)="protocol.startReroll()"
                title="Reroll — costs {{ rerollCost }} Protocol. Tap, then a hero who has rolled.">
          <span class="sr-only">Reroll</span>
          <svg class="proto-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="9" cy="9.5" r="1.35" fill="currentColor"/>
            <circle cx="15" cy="9.5" r="1.35" fill="currentColor"/>
            <circle cx="9" cy="14.5" r="1.35" fill="currentColor"/>
            <circle cx="15" cy="14.5" r="1.35" fill="currentColor"/>
            <path d="M18 2v4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M20.2 3.8A9 9 0 0 0 12 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <span class="proto-cost">{{ rerollCost }}</span>
        </button>
        <button id="protocol-nudge-btn" type="button" class="proto-ic-btn" [class.active]="state.pendingProtocol() === 'nudge'"
                [disabled]="!canNudge()" (click)="protocol.startNudge()"
                title="Nudge — +{{ nudgeDelta }} to effective roll for {{ nudgeCost }} Protocol. Tap, then a hero (still capped at 20).">
          <span class="sr-only">Nudge</span>
          <svg class="proto-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M7 9l5-5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 20h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".65"/>
          </svg>
          <span class="proto-cost">{{ nudgeCost }}</span>
        </button>
        @for (slot of [0, 1, 2]; track slot) {
          <button type="button" class="inv-slot" [class]="rarityClass(slot)" [class.active-pick]="isPendingSlot(slot)"
                  [disabled]="!canUseSlot(slot)" (click)="toggleItem(slot)"
                  [attr.title]="invTitle(slot)">
            @if (defAt(slot); as d) {
              <span class="inv-ic" aria-hidden="true">
                @switch (d.icon) {
                  @case ('heart') {
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 19.2S6 15.2 3.6 11.4 5.4 6.6 8.8 6.6c1.6 0 2.6.8 3.2 1.6.6-.8 1.6-1.6 3.2-1.6 3.4 0 5.2 2.8 3 5.8C16.6 15.6 12 19.2 12 19.2z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
                  }
                  @case ('shield') {
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 3.6l6.5 3.2v6.1c0 4.2-2.8 7.1-6.5 7.6-3.7-.5-6.5-3.4-6.5-7.6V6.8L12 3.6z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
                  }
                  @case ('die') {
                    <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.3"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/></svg>
                  }
                  @case ('bolt') {
                    <svg viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill="currentColor" opacity=".9"/></svg>
                  }
                  @case ('skull') {
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 4c4 0 7 2.6 7 6.4 0 2-1 3.8-2.6 4.9V18c0 .5-.4 1-1 1h-1.2v-2h-1.8v2H11v-2H9.2v2H8c-.6 0-1-.5-1-1v-2.7C5.4 14.2 5 12.4 5 10.4 5 6.6 8 4 12 4z" fill="currentColor" opacity=".35"/><circle cx="9" cy="11" r="1.2" fill="currentColor"/><circle cx="15" cy="11" r="1.2" fill="currentColor"/></svg>
                  }
                  @case ('cloak') {
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 10c2.5-2 5.5-3 7-3s4.5 1 7 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".45"/>
                      <path d="M4 14c3.2-3.2 7.8-4.2 12.5-2.8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
                      <ellipse cx="12" cy="16" rx="5" ry="2.2" fill="currentColor" opacity=".2"/>
                      <circle cx="9.5" cy="11" r="1.6" fill="currentColor" opacity=".5"/>
                      <circle cx="14.5" cy="11" r="1.6" fill="currentColor" opacity=".5"/>
                    </svg>
                  }
                  @default {
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21 8 14.4 2 9.4h7.6L12 2z" fill="currentColor" opacity=".85"/></svg>
                  }
                }
              </span>
              <span class="inv-dot">{{ itemCost(d) }}</span>
            } @else {
              <span class="inv-empty">—</span>
            }
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0;
    }
    .protocol-strip {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-width: 0;
      margin-top: 4px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .protocol-bar-wrap {
      position: relative;
      flex: 1 1 auto;
      min-width: 72px;
      height: 28px;
      border-radius: var(--radius-pixel);
      border: 2px solid var(--border);
      background: #080a0e;
      overflow: hidden;
      box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.5);
    }
    .protocol-bar-fill {
      height: 100%;
      width: 0%;
      background: var(--strike);
      transition: width 0.2s steps(10, end);
      box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.35);
    }
    .protocol-bar-txt {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-family: var(--font-pixel); font-size: 12px; font-weight: 700;
      color: #e8f4ff; text-shadow: 0 1px 2px rgba(0,0,0,.85); pointer-events: none;
    }
    .protocol-actions {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      flex-shrink: 0;
      gap: 6px;
      align-items: center;
    }
    .proto-ic-btn {
      position: relative;
      width: 36px; height: 28px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text);
      background: var(--bg3);
      border: 2px solid var(--border);
      border-radius: var(--radius-pixel);
      cursor: pointer;
      touch-action: manipulation;
      box-shadow: 2px 2px 0 #000;
      flex-shrink: 0;
    }
    .proto-ic-btn:hover:not(:disabled) { border-color: var(--strike); color: var(--strike); }
    .proto-ic-btn:active:not(:disabled) { filter: brightness(1.06); }
    .proto-ic-btn:disabled { opacity: .35; cursor: not-allowed; }
    .proto-ic-btn.active { border-color: var(--strike); color: var(--strike); background: rgba(46,125,212,.1); }
    .proto-svg { width: 20px; height: 20px; }
    .proto-cost {
      position: absolute; bottom: 1px; right: 2px;
      font-family: var(--font-pixel); font-size: 7px; font-weight: 800; opacity: .85; line-height: 1;
    }
    .inv-slot {
      position: relative;
      width: 32px; height: 28px;
      padding: 0;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      border-radius: var(--radius-pixel);
      cursor: pointer;
      touch-action: manipulation;
      box-shadow: 2px 2px 0 #000;
      flex-shrink: 0;
      background: #0a0e14;
      color: #b8cce8;
    }
    .inv-slot:disabled { opacity: .3; cursor: not-allowed; }
    .inv-slot:hover:not(:disabled) { filter: brightness(1.12); }
    .inv-slot.r-common { border: 2px solid #5a6a78; }
    .inv-slot.r-uncommon { border: 2px solid #2a9e72; }
    .inv-slot.r-rare { border: 2px solid #8b6fd4; }
    .inv-slot.r-legendary {
      border: 2px solid #e8942a;
      box-shadow: 0 0 10px rgba(232, 148, 42, 0.35), 2px 2px 0 #000;
    }
    .inv-slot.r-empty { border: 2px dashed var(--border); opacity: .55; }
    .inv-slot.active-pick {
      box-shadow: inset 0 0 0 2px var(--strike), 2px 2px 0 #000;
    }
    .inv-slot.r-legendary.active-pick {
      box-shadow: inset 0 0 0 2px var(--strike), 0 0 22px rgba(232, 148, 42, 0.65), 0 0 36px rgba(255, 170, 60, 0.35), 2px 2px 0 #000;
    }
    .inv-ic { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; }
    .inv-ic svg { width: 100%; height: 100%; }
    .inv-dot {
      position: absolute; bottom: 1px; right: 2px;
      font-family: var(--font-pixel); font-size: 7px; font-weight: 800; opacity: .9;
    }
    .inv-empty { font-family: var(--font-pixel); font-size: 10px; opacity: .4; }
  `],
})
export class ProtocolStripComponent {
  state = inject(GameStateService);
  protocol = inject(ProtocolService);
  items = inject(ItemService);

  max = PROTOCOL_MAX;
  rerollCost = PROTOCOL_REROLL_COST;
  nudgeCost = PROTOCOL_NUDGE_COST;
  nudgeDelta = PROTOCOL_NUDGE_DELTA;

  barWidth = computed(() => {
    const pct = Math.max(0, Math.min(100, (this.state.protocol() / PROTOCOL_MAX) * 100));
    return pct + '%';
  });

  canReroll = computed(() => {
    if (this.state.phase() !== 'player') return false;
    if (this.state.protocol() < PROTOCOL_REROLL_COST) return false;
    return this.state.heroes().some(h => h.currentHp > 0 && h.roll !== null);
  });

  canNudge = computed(() => {
    if (this.state.phase() !== 'player') return false;
    if (this.state.protocol() < PROTOCOL_NUDGE_COST) return false;
    return this.state.heroes().some(h => {
      if (h.currentHp <= 0 || h.roll === null) return false;
      const eff = Math.min(20, (h.roll || 0) + (h.rollBuff || 0) + (h.rollNudge || 0));
      return eff < 20;
    });
  });

  defAt(slot: number): ItemDefinition | null {
    const id = this.state.inventory()[slot];
    if (!id) return null;
    return this.items.getDef(id) ?? null;
  }

  rarityClass(slot: number): string {
    const d = this.defAt(slot);
    if (!d) return 'r-empty';
    return 'r-' + d.rarity;
  }

  itemCost(d: ItemDefinition): number {
    return this.items.protocolCost(d);
  }

  invTitle(slot: number): string {
    const d = this.defAt(slot);
    if (!d) {
      return 'Empty inventory slot';
    }
    const c = this.items.protocolCost(d);
    return `${d.name} — ${d.desc} (Use: ${c} Protocol). Tap to use; tap again to cancel.`;
  }

  isPendingSlot(slot: number): boolean {
    const p = this.state.pendingItemSelection();
    return p?.invSlot === slot;
  }

  canUseSlot(slot: number): boolean {
    if (this.state.phase() !== 'player') return false;
    return this.defAt(slot) !== null;
  }

  toggleItem(slot: number): void {
    this.items.beginUseInventorySlot(slot);
  }
}
