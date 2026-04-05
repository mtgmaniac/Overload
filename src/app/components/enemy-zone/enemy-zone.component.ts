import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { TargetingService } from '../../services/targeting.service';
import { ItemService } from '../../services/item.service';
import { EnemyCardComponent } from './enemy-card/enemy-card.component';

@Component({
  selector: 'app-enemy-zone',
  standalone: true,
  imports: [EnemyCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="enemy-zone-wrap" id="tut-enemy-zone">
      <div class="enemy-row" [class.enemy-row--spread]="state.enemies().length >= 3"
           [class.enemy-row--center]="state.enemies().length < 3">
        @for (enemy of state.enemies(); track enemy.id; let i = $index) {
          <app-enemy-card
            [enemy]="enemy"
            [index]="i"
            [isPickable]="isEnemyPickable(i)"
            [hideRoll]="hideEnemyRolls()"
            (enemyClicked)="targeting.onEnemyPickClick(i)" />
        }
      </div>
    </div>
  `,
  styles: [`
    .enemy-zone-wrap {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      margin: 0;
      width: 100%;
      max-width: 736px;
    }
    .enemy-row {
      display: flex;
      gap: 8px;
      flex-wrap: nowrap;
      flex-direction: row;
      align-items: stretch;
      width: 100%;
      margin-bottom: 0;
      overflow-x: auto;
      overflow-y: visible;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x proximity;
      padding-bottom: 4px;
      scrollbar-gutter: stable;
    }
    .enemy-row > app-enemy-card {
      flex: 0 0 auto;
      scroll-snap-align: start;
    }
    .enemy-row--spread { justify-content: flex-start; }
    .enemy-row--center { justify-content: center; }
  `],
})
export class EnemyZoneComponent {
  state = inject(GameStateService);
  targeting = inject(TargetingService);
  items = inject(ItemService);

  /** Mask enemy die, highlighted ability row, and target name until squad rolls are done and tray is revealed. */
  hideEnemyRolls(): boolean {
    if (this.state.phase() !== 'player') return false;
    if (!this.state.allHeroesRolled()) return true;
    return !this.state.enemyTrayRevealed();
  }

  isEnemyPickable(i: number): boolean {
    const enemy = this.state.enemies()[i];
    if (!enemy || enemy.dead) return false;
    if (this.state.phase() !== 'player') return false;
    const pi = this.state.pendingItemSelection();
    if (pi) {
      const def = this.items.getDef(pi.itemId);
      return def?.target === 'enemy';
    }
    const shi = this.state.selectedHeroIdx();
    if (shi === null) return false;
    return this.targeting.nextPickKindForHero(shi) === 'enemy';
  }
}
