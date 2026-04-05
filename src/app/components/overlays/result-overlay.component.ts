import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-result-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" [class.show]="state.showOverlay()">
      <div class="ov-box">
        <div class="ov-title" [class.vc]="state.overlayIsVictory()" [class.dc]="!state.overlayIsVictory()">
          {{ state.overlayTitle() }}
        </div>
        <div class="ov-sub">{{ state.overlaySub() }}</div>
        @if (state.overlayBtnAction()) {
          <button class="ov-btn" (click)="onBtnClick()">{{ state.overlayBtnText() }}</button>
        }
      </div>
    </div>
  `,
})
export class ResultOverlayComponent {
  state = inject(GameStateService);

  onBtnClick(): void {
    const action = this.state.overlayBtnAction();
    if (action) action();
  }
}
