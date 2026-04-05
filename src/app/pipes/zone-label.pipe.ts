import { Pipe, PipeTransform } from '@angular/core';
import { Zone, ZONE_LABELS } from '../models/types';

@Pipe({ name: 'zoneLabel', standalone: true })
export class ZoneLabelPipe implements PipeTransform {
  transform(zone: Zone): string {
    return ZONE_LABELS[zone] || zone.toUpperCase();
  }
}
