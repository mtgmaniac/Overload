import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { BUILD_VERSION, BUILD_STAMP } from '../../models/constants';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <div class="logo">OVERLOAD <span>PROTOCOL</span></div>
      <div class="hdr-mid">
        <div class="bn" id="tut-battle-counter">
          {{ state.battleModeLabel() }} · BATTLE {{ state.battle() + 1 }} / {{ state.battleCountTotal() }}
        </div>
        @if (!state.tutorial()?.active) {
          <button type="button" class="hdr-link" (click)="changeOperationClicked.emit()">CHANGE OPERATION</button>
        }
      </div>
      <div class="hdr-right">
        <button class="hdr-btn" (click)="helpClicked.emit()">HELP</button>
        <div class="build-tag">{{ version }} · {{ stamp }}</div>
      </div>
    </header>
  `,
  styles: [`
    header {
      display: flex; align-items: center; justify-content: flex-start; gap: 12px; flex-wrap: wrap;
      border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 10px;
    }
    .logo { font-size: clamp(12px, 3.5vw, 14px); font-weight: 700; letter-spacing: 3px; color: #fff; }
    .logo span { color: var(--overload); }
    .hdr-mid {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      min-width: 0;
    }
    .bn { font-size: clamp(12px, 3.2vw, 14px); color: var(--text); font-weight: 600; line-height: 1.25; }
    .hdr-link {
      font-family: var(--font-pixel);
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.4px;
      color: var(--muted);
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .hdr-link:hover { color: var(--strike); }
    .hdr-right { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .hdr-btn {
      font-family: var(--font-pixel); font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
      color: var(--text); background: var(--bg3); border: 2px solid var(--border);
      padding: 3px 9px;
      line-height: 1.2;
      border-radius: var(--radius-pixel); cursor: pointer; white-space: nowrap; touch-action: manipulation;
      box-shadow: 2px 2px 0 #000;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }
    .hdr-btn:hover { border-color: var(--strike); color: var(--strike); }
    .hdr-btn:active { filter: brightness(1.08); }
    .build-tag {
      font-family: var(--font-pixel); font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
      color: var(--build); background: var(--build-bg); border: 2px solid var(--build-dim);
      padding: 3px 7px; border-radius: var(--radius-pixel); white-space: nowrap;
      line-height: 1.2;
    }
  `],
})
export class HeaderComponent {
  state = inject(GameStateService);
  helpClicked = output<void>();
  changeOperationClicked = output<void>();

  version = BUILD_VERSION;
  stamp = BUILD_STAMP;
}
