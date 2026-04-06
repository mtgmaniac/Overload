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
  templateUrl: './unit-status-ribbon.component.html',
  styleUrl: './unit-status-ribbon.component.scss',
})
export class UnitStatusRibbonComponent {
  lines = input<UnitStatusRibbonLine[]>([]);
}
