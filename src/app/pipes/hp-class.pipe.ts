import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'hpClass', standalone: true })
export class HpClassPipe implements PipeTransform {
  transform(current: number, max: number): string {
    if (max <= 0) return 'hp-fill-r';
    const pct = current / max;
    if (pct <= 0.25) return 'hp-fill-r';
    if (pct <= 0.5) return 'hp-fill-y';
    return 'hp-fill-g';
  }
}
