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
          <div class="help-title">HELP</div>
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
            <h3>HOW TO PLAY</h3>
            <div class="help-mini">
              <div><span class="k">Roll</span> the squad (enemy dice stay hidden until then). <span class="k">Tap heroes</span> to set targets, then <span class="k">END TURN</span>. Heroes resolve left → right, then enemies left → right.</div>
              <div>DoT and shield durations tick when your player turn starts. Battle log: <span class="k">MAJOR</span> vs <span class="k">ALL</span>. Use <span class="k">ANIMATIONS</span> above to reduce flashes and pacing.</div>
            </div>
          </div>
          <div class="hsec">
            <h3>TARGETING</h3>
            <div class="help-mini">
              <div>Tap a hero to assign targets for that roll. Tap the <span class="k">same hero again</span> to clear. The lit ability row matches your d20 zone.</div>
            </div>
          </div>
          <div class="hsec">
            <h3>PROTOCOL & ITEMS</h3>
            <div class="help-mini">
              <div>Protocol starts at <span class="k">0</span>; <span class="k">+1</span> after each <span class="k">END TURN</span> (cap <span class="k">10</span>). <span class="k">Reroll</span> costs 2, <span class="k">Nudge +5</span> costs 1 — tap the strip icon, then a hero.</div>
              <div>Up to <span class="k">3</span> consumables; use cost is <span class="k">1 / 2 / 3 / 5</span> by rarity. After a win, pick one draft if you have room.</div>
            </div>
          </div>
          <div class="hsec hsec-span">
            <h3>UNIT BADGES</h3>
            <p class="help-lead"><span class="k">Incoming</span> = queued for this turn (after the squad has rolled). <span class="k">Status</span> = already active. Previews commit on <span class="k">END TURN</span>.</p>
            <div class="ref-rows ref-rows-compact">
              <div class="ref-row">
                <span class="ref-ic ref-ic-clock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.35" fill="none" opacity=".85"/><path d="M12 6.75V12l3.25 2" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" fill="none" opacity=".9"/></svg></span>
                <div><span class="ref-name">Clock</span> — Shown next to a value when a timed effect has <span class="k">more than one</span> turn left. The small number is <span class="k">remaining turns</span> (player rounds): shield uptime, DoT ticks left, or (enemies) duration of −d20 / +enemy roll. Last turn often has no clock — only the main number.</div>
              </div>
              <div class="ref-row">
                <span class="ref-ic bdg-dmg" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill="currentColor" opacity=".9"/></svg></span>
                <div><span class="ref-name">Bolt</span> — Damage this turn.</div>
              </div>
              <div class="ref-row">
                <span class="ref-ic bdg-heal" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" opacity=".9"/></svg></span>
                <div><span class="ref-name">Plus</span> — Heal this turn.</div>
              </div>
              <div class="ref-row">
                <span class="ref-ic bdg-sh" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v7c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-4z" fill="currentColor" opacity=".25"/><path d="M12 3.6l6.5 3.2v6.1c0 4.2-2.8 7.1-6.5 7.6-3.7-.5-6.5-3.4-6.5-7.6V6.8L12 3.6z" stroke="currentColor" stroke-width="1.2" opacity=".9" fill="none"/></svg></span>
                <div><span class="ref-name">Shield</span> — Shield pool (absorbs before HP).</div>
              </div>
              <div class="ref-row">
                <span class="ref-ic bdg-poison" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3c4.4 0 8 3 8 7.2 0 2.5-1.3 4.6-3.3 5.9V20c0 .6-.4 1-1 1h-1v-2h-2v2h-1v-2h-2v2H8.3c-.6 0-1-.4-1-1v-3.9C5.3 14.8 4 12.7 4 10.2 4 6 7.6 3 12 3z" fill="currentColor" opacity=".25"/><path d="M9.2 10.6c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6zm8.4 0c0 .9-.6 1.6-1.4 1.6s-1.4-.7-1.4-1.6.6-1.6 1.4-1.6 1.4.7 1.4 1.6z" fill="currentColor" opacity=".9"/><path d="M10.2 15.2h3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".9"/></svg></span>
                <div><span class="ref-name">Skull</span> — DoT (damage over time).</div>
              </div>
              <div class="ref-row">
                <span class="ref-ic bdg-rollp" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3" stroke="currentColor" stroke-width="1.4"/><circle cx="9" cy="12" r="1.35" fill="currentColor"/><circle cx="15" cy="12" r="1.35" fill="currentColor"/></svg></span>
                <div><span class="ref-name">Die</span> — Roll change (heroes: net buff/debuff; enemies: penalty to their d20).</div>
              </div>
            </div>
          </div>
          <div class="hsec hsec-span">
            <h3>STATUS RIBBON</h3>
            <p class="help-lead">Short tags beside the HP bar (not in the badge grid).</p>
            <div class="help-mini help-status-list">
              <div><span class="k">COWER</span> — Skip rolling and abilities for this player round. Duration counts down after your squad finishes.</div>
              <div><span class="k">CLOAK</span> — Roughly <span class="k">80%</span> chance the next enemy hit that targets you misses; then cloak clears.</div>
              <div><span class="k">TAUNT</span> — Enemies focus attacks on you this round.</div>
              <div><span class="k">SEAL</span> — (Void Circlet / counterspell) Abilities in the named <span class="k">zone</span> (e.g. Strike) fizzle; number = player rounds remaining.</div>
              <div><span class="k">RAMPAGE</span> — (Enemies) The next <span class="k">N</span> direct hits deal <span class="k">×2</span> damage; one charge per hit. Portrait glow marks it.</div>
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
    .help-title {
      font-size: 14px; font-weight: 900; letter-spacing: 4px; color: #fff;
      text-shadow: 0 0 1px #000, 0 0 12px rgba(98, 212, 255, 0.35);
    }
    .help-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 560px) {
      .help-grid { grid-template-columns: 1fr; }
    }
    .hsec { border: 2px solid var(--border); border-radius: var(--radius-pixel); padding: 10px; background: var(--bg); }
    .hsec-span { grid-column: 1 / -1; }
    .hsec h3 { font-family: var(--font-pixel); font-size: 10px; letter-spacing: 2px; color: var(--muted); margin-bottom: 8px; }
    .help-lead { font-family: var(--font-pixel); font-size: 10px; color: var(--muted); line-height: 1.55; margin-bottom: 10px; }
    .ref-rows { display: flex; flex-direction: column; gap: 8px; }
    .ref-rows-compact { gap: 6px; }
    .ref-row { display: flex; align-items: flex-start; gap: 10px; }
    .ref-ic {
      flex: 0 0 auto; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-pixel); border: 2px solid var(--border);
    }
    .ref-ic svg { width: 16px; height: 16px; }
    .ref-ic-clock { color: #9bc0dd; border-color: rgba(155, 192, 221, 0.45); background: rgba(155, 192, 221, 0.1); }
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
    .help-status-list > div { margin-bottom: 8px; }
    .help-status-list > div:last-child { margin-bottom: 0; }
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
