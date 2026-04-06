import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

@Component({
  selector: 'app-hp-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showLabel()) {
      <div class="hp-head">
        <div class="hp-lbl" [style.color]="labelColor()">HP {{ current() }}/{{ max() }}</div>
        <div class="hp-aside">
          <ng-content select="[data-hp-aside]" />
        </div>
      </div>
    }
    <div class="hp-bar">
      <div class="hp-fill" [class]="fillClass()" [style.width]="widthPct()"></div>
    </div>
  `,
  styles: [`
    .hp-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 4px;
      margin-top: 5px;
      margin-bottom: 2px;
      min-width: 0;
    }
    .hp-lbl { font-family: var(--font-pixel); font-size: 10px; font-weight: 700; flex-shrink: 0; }
    .hp-aside {
      flex: 1;
      min-width: 0;
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
    }
    .hp-bar { width: 100%; height: 5px; background: #0a0c10; border: 1px solid #000; border-radius: var(--radius-pixel); overflow: hidden; margin-bottom: 2px; }
    .hp-fill { height: 100%; border-radius: var(--radius-pixel); transition: width 0.25s steps(8, end); }
    .hp-fill-g { background: #1d9e75; }
    .hp-fill-y { background: #e8b84a; }
    .hp-fill-r { background: #d84a2a; }
  `],
})
export class HpBarComponent {
  current = input.required<number>();
  max = input.required<number>();
  /** When false, only the bar renders (use an external label row if needed). */
  showLabel = input(true);

  widthPct = computed(() => {
    const m = this.max();
    if (m <= 0) return '0%';
    return Math.max(0, Math.min(100, Math.round((this.current() / m) * 100))) + '%';
  });

  fillClass = computed(() => {
    const m = this.max();
    if (m <= 0) return 'hp-fill hp-fill-r';
    const pct = this.current() / m;
    if (pct <= 0.25) return 'hp-fill hp-fill-r';
    if (pct <= 0.5) return 'hp-fill hp-fill-y';
    return 'hp-fill hp-fill-g';
  });

  labelColor = computed(() => {
    const m = this.max();
    if (m <= 0) return 'var(--hr)';
    const pct = this.current() / m;
    if (pct <= 0.25) return 'var(--hr)';
    if (pct <= 0.5) return 'var(--cell)';
    return 'var(--muted)';
  });
}
