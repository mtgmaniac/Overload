import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  ElementRef,
  viewChild,
} from '@angular/core';
import {
  d20NeutralCell,
  d20ResultCell,
  d20SpritePositionPercent,
} from './d20-sprite';
import { DICE_SPRITE_URL } from '../../../data/sprites.data';

@Component({
  selector: 'app-die',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="die-wrap"
      #dieWrap
      [class.die-clickable]="clickable()"
      [attr.role]="clickable() ? 'button' : 'img'"
      [attr.aria-label]="dieAriaLabel()"
      [attr.tabindex]="clickable() ? 0 : -1"
      (click)="onDieClick()"
      (keydown)="onDieKeydown($event)">
      <div
        class="die-sprite"
        [style.background-image]="diceBg"
        [style.background-position]="spriteBgPos()"></div>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .die-wrap {
      width: 78px;
      height: 78px;
      position: relative;
      flex-shrink: 0;
      touch-action: manipulation;
    }
    .die-clickable { cursor: pointer; }
    .die-clickable:hover .die-sprite { filter: brightness(1.08); }
    .die-clickable:active .die-sprite { transform: translate(1px, 1px); }
    .die-sprite {
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      background-repeat: no-repeat;
      background-size: 600% 600%;
    }
  `],
})
export class DieComponent {
  /** From `DICE_SPRITE_URL` (PNG or lossless WebP via `RASTER_EXT`). */
  readonly diceBg = `url("${DICE_SPRITE_URL}")`;

  roll = input<number | null>(null);
  clickable = input(false);
  displayText = input<string | null>(null);

  animDisplay = input<string | null>(null);
  /** During tray roll: explicit sprite cell; when null, face is derived from the visible number. */
  spriteCell = input<{ c: number; r: number } | null>(null);

  dieClicked = output<void>();

  dieWrap = viewChild<ElementRef<HTMLElement>>('dieWrap');

  displayValue = computed(() => {
    if (this.displayText()) return this.displayText()!;
    const r = this.roll();
    return r !== null ? String(r) : '--';
  });

  activeDisplay = computed(() => this.animDisplay() ?? this.displayValue());

  dieAriaLabel = computed(() => {
    const d = this.activeDisplay();
    return d === '--' ? 'Die, no roll yet' : `D20 showing ${d}`;
  });

  targetCell = computed(() => {
    const sc = this.spriteCell();
    if (sc) return { c: sc.c, r: sc.r };
    const t = this.activeDisplay().trim();
    if (/^\d{1,2}$/.test(t)) {
      const v = parseInt(t, 10);
      if (v >= 1 && v <= 20) {
        const [c, r] = d20ResultCell(v);
        return { c, r };
      }
    }
    const [c, r] = d20NeutralCell();
    return { c, r };
  });

  spriteBgPos = computed(() =>
    d20SpritePositionPercent(this.targetCell().c, this.targetCell().r),
  );

  triggerBounce(): void {
    const el = this.dieWrap()?.nativeElement;
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'diePixelLand 0.36s steps(5, end) forwards';
  }

  onDieClick(): void {
    if (this.clickable()) {
      this.dieClicked.emit();
    }
  }

  onDieKeydown(ev: KeyboardEvent): void {
    if (!this.clickable()) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.dieClicked.emit();
    }
  }
}
