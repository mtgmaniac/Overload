import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ItemService } from '../../services/item.service';
import type { ItemDefinition } from '../../models/item.interface';

@Component({
  selector: 'app-item-draft-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-draft-overlay.component.html',
  styleUrl: './item-draft-overlay.component.scss',
})
export class ItemDraftOverlayComponent {
  state = inject(GameStateService);
  items = inject(ItemService);

  choices = computed(() => this.state.itemDraftChoices());

  defFor(id: string): ItemDefinition | null {
    return this.items.getDef(id) ?? null;
  }

  pick(id: string): void {
    this.items.pickDraftItem(id);
  }

  skip(): void {
    this.items.skipDraft();
  }
}
