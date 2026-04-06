import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { ItemService } from '../../services/item.service';
import type { ItemDefinition } from '../../models/item.interface';

@Component({
  selector: 'app-item-draft-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (choices(); as ids) {
      <div class="id-overlay">
        <div class="id-title">SUPPLY CACHE</div>
        <div class="id-sub">Pick 1 item to stash (max 3 carried).</div>
        <div class="id-row">
          @for (id of ids; track id) {
            @if (defFor(id); as def) {
              <button type="button" class="id-card" [class]="'r-' + def.rarity" (click)="pick(def.id)"
                      [attr.title]="def.name + ' — ' + def.desc">
                <span class="id-ic" aria-hidden="true">
                  @switch (def.icon) {
                    @case ('heart') {
                      <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-4.6-9.6-9.2C.2 8.6 2.2 5 6 5c2.2 0 3.6 1.3 4 2.1.4-.8 1.8-2.1 4-2.1 3.8 0 5.8 3.6 3.6 6.8C15 16.4 12 21 12 21z" fill="currentColor" opacity=".35"/><path d="M12 19.2S6 15.2 3.6 11.4 5.4 6.6 8.8 6.6c1.6 0 2.6.8 3.2 1.6.6-.8 1.6-1.6 3.2-1.6 3.4 0 5.2 2.8 3 5.8C16.6 15.6 12 19.2 12 19.2z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>
                    }
                    @case ('shield') {
                      <svg viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v7c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-4z" fill="currentColor" opacity=".2"/><path d="M12 3.6l6.5 3.2v6.1c0 4.2-2.8 7.1-6.5 7.6-3.7-.5-6.5-3.4-6.5-7.6V6.8L12 3.6z" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>
                    }
                    @case ('die') {
                      <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.4"/><circle cx="9" cy="9" r="1.4" fill="currentColor"/><circle cx="15" cy="9" r="1.4" fill="currentColor"/><circle cx="9" cy="15" r="1.4" fill="currentColor"/><circle cx="15" cy="15" r="1.4" fill="currentColor"/></svg>
                    }
                    @case ('bolt') {
                      <svg viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill="currentColor" opacity=".9"/></svg>
                    }
                    @case ('skull') {
                      <svg viewBox="0 0 24 24" fill="none"><path d="M12 4c4 0 7 2.6 7 6.4 0 2-1 3.8-2.6 4.9V18c0 .5-.4 1-1 1h-1.2v-2h-1.8v2H11v-2H9.2v2H8c-.6 0-1-.5-1-1v-2.7C5.4 14.2 5 12.4 5 10.4 5 6.6 8 4 12 4z" fill="currentColor" opacity=".25"/><circle cx="9" cy="11" r="1.3" fill="currentColor"/><circle cx="15" cy="11" r="1.3" fill="currentColor"/><path d="M10 15h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                    }
                    @case ('cloak') {
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 10c2.5-2 5.5-3 7-3s4.5 1 7 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".45"/>
                        <path d="M4 14c3.2-3.2 7.8-4.2 12.5-2.8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
                        <ellipse cx="12" cy="16" rx="5" ry="2.2" fill="currentColor" opacity=".2"/>
                        <circle cx="9.5" cy="11" r="1.6" fill="currentColor" opacity=".5"/>
                        <circle cx="14.5" cy="11" r="1.6" fill="currentColor" opacity=".5"/>
                      </svg>
                    }
                    @default {
                      <svg viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21 8 14.4 2 9.4h7.6L12 2z" fill="currentColor" opacity=".85"/></svg>
                    }
                  }
                </span>
                <span class="id-name">{{ def.name }}</span>
                <span class="id-r">{{ def.rarity }}</span>
              </button>
            }
          }
        </div>
        <button type="button" class="id-skip" (click)="skip()">Skip</button>
      </div>
    }
  `,
  styles: [`
    .id-overlay {
      position: fixed; inset: 0; z-index: 620;
      background: rgba(4, 6, 10, 0.96);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: max(20px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom));
      pointer-events: all;
    }
    .id-title {
      font-size: 20px; font-weight: 900; letter-spacing: 4px; color: #fff; margin-bottom: 8px;
    }
    .id-sub {
      font-family: var(--font-pixel); font-size: 10px; color: var(--muted); margin-bottom: 20px; text-align: center; max-width: 360px;
    }
    .id-row {
      display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; max-width: 640px;
    }
    .id-card {
      width: 140px; min-height: 120px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 10px;
      border-radius: var(--radius-pixel); cursor: pointer;
      font-family: var(--font-pixel); font-size: 9px; color: var(--text);
      background: var(--bg2); touch-action: manipulation;
      box-shadow: 3px 3px 0 rgba(0,0,0,.45);
      transition: filter 0.1s, transform 0.1s;
    }
    .id-card:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .id-card:active { transform: translateY(0); }
    .id-card.r-common { border: 3px solid #5a6a78; }
    .id-card.r-uncommon { border: 3px solid #2a9e72; }
    .id-card.r-rare {
      border: 3px solid #8b6fd4;
      box-shadow: 0 0 18px rgba(139, 111, 212, 0.5), 0 0 6px rgba(180, 150, 255, 0.35), 3px 3px 0 rgba(0,0,0,.45);
    }
    .id-card.r-legendary {
      border: 3px solid #e8942a;
      box-shadow: 0 0 32px rgba(232, 148, 42, 0.75), 0 0 56px rgba(255, 170, 60, 0.4), 3px 3px 0 rgba(0,0,0,.45);
    }
    .id-ic { width: 36px; height: 36px; color: #c8ddf0; display: flex; align-items: center; justify-content: center; }
    .id-ic svg { width: 100%; height: 100%; }
    .id-name { font-weight: 800; font-size: 10px; text-align: center; color: #e8f4ff; line-height: 1.25; }
    .id-r { text-transform: uppercase; opacity: .65; font-size: 8px; }
    .id-skip {
      margin-top: 22px; font-family: var(--font-pixel); font-size: 10px;
      padding: 8px 20px; border: 2px solid var(--border); border-radius: var(--radius-pixel);
      background: var(--bg3); color: var(--muted); cursor: pointer;
    }
    .id-skip:hover { border-color: var(--strike); color: var(--strike); }
  `],
})
export class ItemDraftOverlayComponent {
  state = inject(GameStateService);
  items = inject(ItemService);

  choices = computed(() => this.state.itemDraftChoices());

  defFor(id: string): ItemDefinition | null {
    return this.items.getDef(id) ?? null;
  }

  pick(id: string): void {
    this.items.pickDraftItem(id);
  }

  skip(): void {
    this.items.skipDraft();
  }
}
