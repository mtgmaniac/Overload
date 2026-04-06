import { Component, ChangeDetectionStrategy, inject, input, output, isDevMode } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { DevDataPanelService } from '../../services/dev-data-panel.service';

@Component({
  selector: 'app-help-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-overlay.component.html',
  styleUrl: './help-overlay.component.scss',
})
export class HelpOverlayComponent {
  readonly state = inject(GameStateService);
  private readonly devData = inject(DevDataPanelService);
  /** Same gate as `app-root` dev tools (DATA editor only bundled in dev). */
  readonly devBuild = isDevMode();

  isOpen = input(false);
  closed = output<void>();
  startTutorial = output<void>();

  openDataPanel(): void {
    this.devData.openPanel();
    this.closed.emit();
  }
}
