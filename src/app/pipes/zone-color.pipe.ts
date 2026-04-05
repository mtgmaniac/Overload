import { Pipe, PipeTransform } from '@angular/core';
import { Zone, ZONE_COLORS } from '../models/types';

@Pipe({ name: 'zoneColor', standalone: true })
export class ZoneColorPipe implements PipeTransform {
  transform(zone: Zone): string {
    return ZONE_COLORS[zone] || '#4a6a8a';
  }
}
