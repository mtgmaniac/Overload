import { Component, ChangeDetectionStrategy, input } from '@angular/core';

export interface UnitStatusRibbonLine {
  key: string;
  tag: string;
  detail: string;
}

@Component({
  selector: 'app-unit-status-ribbon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (lines().length) {
      <div class="usr" role="status">
        @for (line of lines(); track line.key) {
          <div
            class="usr-row"
            [class.usr-cower]="line.tag === 'COWER'"
            [class.usr-cloak]="line.tag === 'CLOAK'"
            [class.usr-taunt]="line.tag === 'TAUNT'"
            [class.usr-seal]="line.tag === 'SEAL'"
            [class.usr-rampage]="line.tag === 'RAMPAGE'"
            [attr.title]="line.detail">
            <span class="usr-tag">{{ line.tag }}</span>
            @if (line.detail) {
              <span class="usr-detail">{{ line.detail }}</span>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .usr {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      min-width: 0;
      max-width: 100%;
    }
    .usr-row {
      display: flex;
      align-items: baseline;
      justify-content: flex-end;
      gap: 5px;
      min-width: 0;
      max-width: 100%;
      text-align: right;
    }
    .usr-tag {
      flex-shrink: 0;
      font-family: var(--font-pixel);
      font-size: 7px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 1px 4px;
      border-radius: var(--radius-pixel);
      border: 1px solid rgba(120, 160, 200, 0.45);
      color: #b8d0e8;
      line-height: 1.2;
    }
    .usr-cower .usr-tag {
      border-color: rgba(200, 120, 160, 0.55);
      color: #e8b8d0;
    }
    .usr-cloak .usr-tag {
      border-color: rgba(120, 180, 220, 0.5);
      color: #a8d8f0;
    }
    .usr-taunt .usr-tag {
      border-color: rgba(232, 120, 80, 0.55);
      color: #f0b090;
    }
    .usr-seal .usr-tag {
      border-color: rgba(180, 140, 220, 0.5);
      color: #d0b8e8;
    }
    .usr-rampage .usr-tag {
      border-color: rgba(220, 60, 60, 0.55);
      color: #f09088;
    }
    .usr-detail {
      font-family: var(--font-pixel);
      font-size: 7px;
      font-weight: 600;
      color: #6f95b3;
      line-height: 1.35;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  `],
})
export class UnitStatusRibbonComponent {
  lines = input<UnitStatusRibbonLine[]>([]);
}
