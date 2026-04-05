import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'hpPercent', standalone: true })
export class HpPercentPipe implements PipeTransform {
  transform(current: number, max: number): string {
    if (max <= 0) return '0%';
    return Math.max(0, Math.min(100, Math.round((current / max) * 100))) + '%';
  }
}
