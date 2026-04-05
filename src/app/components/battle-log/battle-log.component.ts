import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { LogService } from '../../services/log.service';

@Component({
  selector: 'app-battle-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="log-wrap" id="tut-battle-log"
         [class.log-collapsed]="!state.logOpen()">
      <div class="log-hdr">
        <div class="log-left">
          <button class="log-toggle" (click)="logService.toggleOpen()">{{ state.logOpen() ? '−' : '+' }}</button>
          <span class="log-title">BATTLE LOG</span>
        </div>
        @if (state.logOpen()) {
          <div class="log-mode">
            <button [class.active]="state.logMode() === 'min'" (click)="logService.setMode('min')">MAJOR</button>
            <button [class.active]="state.logMode() === 'all'" (click)="logService.setMode('all')">ALL</button>
          </div>
        }
      </div>
      @if (state.logOpen()) {
        <div class="battle-log">
          @for (entry of logService.getFilteredLog(); track $index) {
            <div class="le" [class]="entry.cls">{{ entry.msg }}</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .log-wrap { background: var(--bg2); border: 2px solid var(--border); border-radius: var(--radius-pixel); margin-top: 8px; margin-bottom: 8px; overflow: hidden; box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.35); }
    .log-wrap.log-collapsed { margin-top: 4px; margin-bottom: 4px; }
    .log-hdr {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1px 6px; border-bottom: 1px solid var(--border);
      min-height: 0;
    }
    .log-left { display: flex; align-items: center; gap: 4px; min-width: 0; }
    .log-toggle {
      background: var(--bg3); border: 1px solid var(--border); color: var(--muted); border-radius: var(--radius-pixel);
      min-width: 22px; min-height: 22px; cursor: pointer; font-family: var(--font-pixel); font-size: 11px; line-height: 1;
      display: flex; align-items: center; justify-content: center; touch-action: manipulation;
    }
    .log-toggle:hover { border-color: var(--strike); color: var(--strike); }
    .log-title {
      font-family: var(--font-pixel); font-size: 7px; letter-spacing: 1px; line-height: 1.15;
      color: var(--muted); white-space: nowrap;
    }
    .log-mode { display: flex; gap: 3px; align-items: center; }
    .log-mode button {
      background: var(--bg3); border: 1px solid var(--border); color: var(--muted); border-radius: var(--radius-pixel);
      padding: 1px 5px; min-height: 20px; cursor: pointer; font-family: var(--font-pixel); font-size: 7px;
      letter-spacing: 0.3px; line-height: 1.2; touch-action: manipulation;
    }
    .log-mode button.active { border-color: var(--strike); color: var(--strike); background: rgba(46,125,212,.08); }
    .battle-log { padding: 6px 10px; font-family: var(--font-pixel); font-size: 9px; max-height: 80px; overflow-y: auto; }
    .le { color: var(--muted); margin-bottom: 2px; line-height: 1.5; }
    .le.pl { color: var(--strike); }
    .le.en { color: var(--overload); }
    .le.sy { color: var(--cell); }
    .le.bl { color: var(--build); }
    .le.vi { color: var(--hg); font-weight: 700; }
    .le.de { color: var(--hr); font-weight: 700; }
  `],
})
export class BattleLogComponent {
  state = inject(GameStateService);
  logService = inject(LogService);
}
