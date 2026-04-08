import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { GearService } from '../../services/gear.service';
import type { GearDefinition } from '../../models/gear.interface';

@Component({
  selector: 'app-gear-assign-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gear-assign-overlay.component.html',
  styleUrl: './gear-assign-overlay.component.scss',
})
export class GearAssignOverlayComponent {
  state = inject(GameStateService);
  gear = inject(GearService);

  pendingGear = computed((): GearDefinition | null => {
    const id = this.state.pendingGearAssignment();
    if (!id) return null;
    return this.gear.getGearDef(id) ?? null;
  });

  heroes = computed(() => this.state.heroes());

  heroHasGear(idx: number): boolean {
    return this.gear.heroHasGear(idx);
  }

  assign(idx: number): void {
    this.gear.confirmGearForHero(idx);
  }
}
