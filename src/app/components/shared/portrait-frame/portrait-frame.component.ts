import { Component, ChangeDetectionStrategy, input, computed, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { HERO_PORTRAIT_FRAME } from '../../../data/sprites.data';

@Component({
  selector: 'app-portrait-frame',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="portrait-frame"
      [attr.id]="anchorId() ?? null"
      [class.pf-cloaked]="isCloaked()"
      [class.pf-rampage]="rampageGlow()"
      [attr.title]="rampageTip() ?? null"
      [style.width.px]="pf.width"
      [style.height.px]="pf.height"
      [innerHTML]="safeSvg()">
    </div>
  `,
  styles: [`
    .portrait-frame {
      border-radius: var(--radius-pixel);
      border: 2px solid var(--border);
      background: var(--bg3);
      box-shadow: inset 2px 2px 0 rgba(255,255,255,.06), inset -2px -2px 0 rgba(0,0,0,.4), 2px 2px 0 #000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .portrait-frame ::ng-deep svg {
      display: block;
      width: 100% !important;
      height: 100% !important;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      shape-rendering: crispEdges;
    }
    .portrait-frame ::ng-deep svg image {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .portrait-frame::after {
      content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0;
      background: var(--pf, transparent);
    }
    .portrait-frame.pf-cloaked::before {
      content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .35;
      background: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 3px,
        rgba(140, 90, 220, 0.25) 3px,
        rgba(140, 90, 220, 0.25) 4px
      );
    }
    .portrait-frame.pf-rampage {
      animation: pfRampagePulse 1.1s steps(4, end) infinite;
      box-shadow:
        inset 2px 2px 0 rgba(255, 90, 70, 0.2),
        inset -2px -2px 0 rgba(0, 0, 0, 0.45),
        0 0 10px rgba(255, 60, 40, 0.55),
        2px 2px 0 #000;
      border-color: rgba(200, 50, 40, 0.85);
    }
    @keyframes pfRampagePulse {
      0%, 100% { filter: brightness(1); box-shadow: inset 2px 2px 0 rgba(255, 90, 70, 0.15), inset -2px -2px 0 rgba(0, 0, 0, 0.45), 0 0 8px rgba(255, 50, 30, 0.45), 2px 2px 0 #000; }
      50% { filter: brightness(1.12); box-shadow: inset 2px 2px 0 rgba(255, 120, 80, 0.35), inset -2px -2px 0 rgba(0, 0, 0, 0.45), 0 0 14px rgba(255, 80, 50, 0.75), 2px 2px 0 #000; }
    }
  `],
})
export class PortraitFrameComponent {
  svg = input.required<string>();
  isCloaked = input(false);
  /** Red frame pulse when this unit has rampage charges (enemies). */
  rampageGlow = input(false);
  /** Tooltip when rampageGlow is on (unit name + effect). */
  rampageTip = input<string | null>(null);
  /** DOM id for combat action highlights (e.g. `action-hero-0`). */
  anchorId = input<string | null>(null);

  readonly pf = HERO_PORTRAIT_FRAME;

  private sanitizer = inject(DomSanitizer);

  safeSvg = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.svg())
  );
}
