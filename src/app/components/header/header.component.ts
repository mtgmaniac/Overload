import { Component, ChangeDetectionStrategy, inject, output, computed } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { CombatService } from '../../services/combat.service';
import { BUILD_VERSION, BUILD_STAMP } from '../../models/constants';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  state = inject(GameStateService);
  combat = inject(CombatService);
  helpClicked = output<void>();
  backHomeClicked = output<void>();

  version = BUILD_VERSION;
  stamp = BUILD_STAMP;

  simBattle(): void {
    void this.combat.runSimBattle();
  }

  readonly canAutoPlay = computed(
    () =>
      this.state.phase() === 'player' &&
      this.state.endTurnHeroResolveCursor() === null &&
      !this.state.rollAllInProgress(),
  );

  autoPlayTurn(): void {
    void this.combat.autoPlayTurn();
  }
}
