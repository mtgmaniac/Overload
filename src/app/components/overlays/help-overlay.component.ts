import { Component, ChangeDetectionStrategy, inject, input, output, isDevMode } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { DevDataPanelService } from '../../services/dev-data-panel.service';

@Component({
  selector: 'app-help-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="help-overlay" [class.show]="isOpen()">
      <div class="help-body">
        <div class="help-top">
          <div class="help-title">HELP & REFERENCE</div>
          <div class="help-top-btns">
            <button class="hdr-btn hdr-btn-accent" type="button" (click)="startTutorial.emit(); closed.emit()">TUTORIAL</button>
            @if (devBuild) {
              <button class="hdr-btn hdr-btn-data" type="button" (click)="openDataPanel()">DATA</button>
            }
            <button class="hdr-btn" type="button" (click)="state.animOn.update(v => !v)">
              {{ state.animOn() ? 'ANIMATIONS ON' : 'ANIMATIONS OFF' }}
            </button>
            <button class="hdr-btn" type="button" (click)="closed.emit()">CLOSE</button>
          </div>
        </div>
        <div class="help-grid">
          <div class="hsec hsec-span">
            <h3>BADGES</h3>
            <p class="help-lead">
              <span class="k">Incoming</span> = lined up for this turn (shows after the whole squad has rolled).
              <span class="k">Status</span> = already on the unit. Everything is a preview until <span class="k">END TURN</span>.
            </p>
            <div class="ref-rows">
              <div class="ref-row">
                <span class="ref-ic bdg-dmg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill="currentColor" opacity=".9"/></svg></span>
                <div><span class="ref-name">Bolt</span> — Damage hitting that unit this turn (enemies → heroes, or your squad → enemies).</div>
              </div>
              <div class="ref-row">
                <span class="ref-ic bdg-heal" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" opacity=".9"/></svg></span>
                <div><span class="ref-name">Plus</span> — Healing landing on that hero this turn.</div>
              </div>
              <div class="ref-row">
                <span class="ref-ic bdg-sh" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v7c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-4z" fill="currentColor" opacity=".25"/><path d="M12 3.6l6.5 3.2v6.1c0 4.2-2.8 7.1-6.5 7.6-3.7-.5-6.5-3.4-6.5-7.6V6.8L12 3.6z" stroke="currentColor" stroke-width="1.2" opacity=".9" fill="none"/></svg></span>
                <div><span class="ref-name">Shield</span> — Shield amount (Incoming = gained this turn; Status = current, eats damage before HP).</div>
              </div>
              <div class="ref-row">
                <span class="ref-ic bdg-poison" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3c4.4 0 8 3 8 7.2 0 2.5-1.3 4.6-3.3 5.9V20c0 .6-.4 1-1 1h-1v-2h-2v2h-1v-2h-2v2H8.3c-.6 0-1-.4-1-1v-3.9C5.3 14.8 4 12.7 4 10.2 4 6 7.6 3 12 3z" fill="currentColor" opacity=".25"/><path d="M9.2 10.6c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6zm8.4 0c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6z" fill="currentColor" opacity=".9"/><path d="M10.2 15.2h3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".9"/></svg></span>
                <div><span class="ref-name">Skull</span> — DoT (damage each turn), queued or already ticking.</div>
              </div>
              <div class="ref-row">
                <span class="ref-ic bdg-rollp" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" stroke="currentColor" stroke-width="1.4"/><circle cx="9" cy="12" r="1.35" fill="currentColor"/><circle cx="15" cy="12" r="1.35" fill="currentColor"/></svg></span>
                <div><span class="ref-name">Die</span> — Roll shift: heroes show net buff vs debuff (green helpful, amber hurtful); enemies show −d20 (preview or active).</div>
              </div>
            </div>
          </div>

          <div class="hsec">
            <h3>PROTOCOL & ITEMS</h3>
            <div class="help-mini">
              <div>Start each battle at <span class="k">1</span>. <span class="k">+1</span> after each <span class="k">END TURN</span> (next player round, max <span class="k">10</span>).</div>
              <div><span class="k">REROLL (2)</span> / <span class="k">NUDGE +5 (1)</span> — icon buttons; hover for full labels. Then tap the hero.</div>
              <div><span class="k">Items</span> — up to 3 slots; common use costs <span class="k">1</span>, uncommon <span class="k">2</span>, rare <span class="k">3</span> Protocol. After <span class="k">each</span> battle win, draft 1 of 3 (skipped if inventory is full).</div>
            </div>
          </div>
          <div class="hsec">
            <h3>ROUND</h3>
            <div class="help-mini">
              <div><span class="k">ROLL ALL</span> or per die · enemy faces hidden until the squad is rolled · targets, then <span class="k">END TURN</span>.</div>
              <div>DoT & shield timers tick when your turn begins.</div>
            </div>
          </div>
          <div class="hsec">
            <h3>TARGETING</h3>
            <div class="help-mini">
              <div>Select a hero to pick targets; the target line shows who gets the ability.</div>
              <div>Tap that <span class="k">hero again</span> to wipe picks and retarget. Highlighted ability row = current roll zone.</div>
            </div>
          </div>
          <div class="hsec">
            <h3>LOG</h3>
            <div class="help-mini">
              <div><span class="k">MAJOR</span> = short · <span class="k">ALL</span> = full. Colors mark player, enemy/system, heals/dmg, alerts.</div>
            </div>
          </div>
          <div class="hsec">
            <h3>ACTIONS</h3>
            <div class="help-mini">
              <div>On <span class="k">END TURN</span>, abilities resolve in order: left hero → right, then left enemy → right. Portraits flash (red dmg, green heal, blue shield, amber −roll).</div>
              <div><span class="k">Void Circlet</span> — <span class="k">counterspell</span> seals an ability <span class="k">tier</span> (matches your highlighted row: RECHARGE / STRIKE / SURGE / CRIT / OVERLOAD). If your roll lands there, that ability <span class="k">fizzles</span> for the turn. Duration ticks after your squad finishes resolving. Some overloads <span class="k">warp in</span> a Sparksprite (natural 20), like Protoss reinforcements.</div>
              <div>Toggle <span class="k">ANIMATIONS</span> above to skip pacing and flashes for a faster run.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .help-overlay {
      position: fixed; inset: 0; background: rgba(8,12,18,.93); display: flex; align-items: center; justify-content: center;
      z-index: 800; opacity: 0; pointer-events: none; transition: opacity .2s;
      padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
    }
    .help-overlay.show { opacity: 1; pointer-events: all; }
    .help-body {
      width: min(760px, calc(100vw - 24px - env(safe-area-inset-left) - env(safe-area-inset-right)));
      max-height: calc(100vh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      overflow: auto; background: var(--bg2); border: 2px solid var(--border); border-radius: var(--radius-pixel); padding: 16px 18px; box-shadow: 4px 4px 0 rgba(0,0,0,.4);
    }
    .help-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .help-top-btns { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .help-title { font-size: 14px; font-weight: 900; letter-spacing: 3px; color: #fff; }
    .help-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 560px) {
      .help-grid { grid-template-columns: 1fr; }
    }
    .hsec { border: 2px solid var(--border); border-radius: var(--radius-pixel); padding: 10px; background: var(--bg); }
    .hsec-span { grid-column: 1 / -1; }
    .hsec h3 { font-family: var(--font-pixel); font-size: 10px; letter-spacing: 2px; color: var(--muted); margin-bottom: 8px; }
    .help-lead { font-family: var(--font-pixel); font-size: 10px; color: var(--muted); line-height: 1.55; margin-bottom: 10px; }
    .ref-rows { display: flex; flex-direction: column; gap: 8px; }
    .ref-row { display: flex; align-items: flex-start; gap: 10px; }
    .ref-ic {
      flex: 0 0 auto; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-pixel); border: 2px solid var(--border);
    }
    .ref-ic svg { width: 16px; height: 16px; }
    .ref-row > div { font-family: var(--font-pixel); font-size: 10px; color: var(--muted); line-height: 1.45; min-width: 0; }
    .ref-name { color: #fff; font-weight: 800; }
    .bdg-dmg { color: #d84a2a; border-color: rgba(216,74,42,.4); background: rgba(216,74,42,.1); }
    .bdg-heal { color: #2ec46a; border-color: rgba(46,196,106,.4); background: rgba(46,196,106,.1); }
    .bdg-sh { color: #2e7dd4; border-color: rgba(46,125,212,.4); background: rgba(46,125,212,.1); }
    .bdg-poison { color: #b67bff; border-color: rgba(182,123,255,.4); background: rgba(182,123,255,.1); }
    .bdg-rollp { color: #2ec46a; border-color: rgba(46,196,106,.4); background: rgba(46,196,106,.1); }
    .bdg-rolln { color: #e8b84a; border-color: rgba(232,184,74,.4); background: rgba(232,184,74,.1); }
    .help-mini { font-family: var(--font-pixel); font-size: 10px; color: var(--muted); line-height: 1.55; }
    .help-mini > div { margin-bottom: 6px; }
    .help-mini > div:last-child { margin-bottom: 0; }
    .k { color: #fff; font-weight: 900; }
    .hdr-btn {
      font-family: var(--font-pixel); font-size: 10px; font-weight: 700; letter-spacing: 1px;
      color: var(--text); background: var(--bg3); border: 2px solid var(--border);
      padding: 8px 14px; min-height: 44px; border-radius: var(--radius-pixel); cursor: pointer; touch-action: manipulation;
      box-shadow: 2px 2px 0 #000;
    }
    .hdr-btn:hover { border-color: var(--strike); color: var(--strike); }
    .hdr-btn-accent { border-color: rgba(46,125,212,.5); color: #cfe6ff; background: rgba(46,125,212,.12); }
    .hdr-btn-accent:hover { border-color: #7ab8ff; color: #fff; }
    .hdr-btn-data { border-color: rgba(74,138,212,.55); color: #cfe8ff; background: rgba(12,21,36,.9); }
    .hdr-btn-data:hover { border-color: #7ab8ff; color: #fff; }
  `],
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
