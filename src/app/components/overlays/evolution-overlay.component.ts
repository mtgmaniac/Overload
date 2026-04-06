import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { EvolutionService, GroupedEvoPath } from '../../services/evolution.service';
import { CombatService } from '../../services/combat.service';

@Component({
  selector: 'app-evolution-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evolution-overlay.component.html',
  styleUrl: './evolution-overlay.component.scss',
})
export class EvolutionOverlayComponent {
  state = inject(GameStateService);
  private evo = inject(EvolutionService);
  private combat = inject(CombatService);

  isVisible = computed(() => this.state.pendingEvolutions().length > 0);

  allChosen = computed(() =>
    this.state.pendingEvolutions().every(pe => pe.chosen !== null)
  );

  getHeroName(heroIdx: number): string {
    return this.state.heroes()[heroIdx]?.name ?? '?';
  }

  getPaths(heroIdx: number): GroupedEvoPath[] {
    const hero = this.state.heroes()[heroIdx];
    if (!hero) return [];
    return this.evo.groupEvoPaths(hero.evolutions);
  }

  selectEvo(pendingIdx: number, pathIdx: number): void {
    this.state.pendingEvolutions.update(evos =>
      evos.map((pe, i) => i === pendingIdx ? { ...pe, chosen: pathIdx } : pe)
    );
  }

  confirm(): void {
    const pending = this.state.pendingEvolutions();
    for (const pe of pending) {
      if (pe.chosen !== null) {
        this.evo.confirmEvolution(pe.heroIdx, pe.chosen);
      }
    }
    this.state.pendingEvolutions.set([]);
    // Show next battle overlay
    this.combat.nextBattle();
  }
}
