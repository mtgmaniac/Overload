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
  templateUrl: './protocol-strip.component.html',
  styleUrl: './protocol-strip.component.scss',
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
