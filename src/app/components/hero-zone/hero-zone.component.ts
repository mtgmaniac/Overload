import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { TargetingService } from '../../services/targeting.service';
import { ItemService } from '../../services/item.service';
import { HeroCardComponent } from './hero-card/hero-card.component';
import { HeroState } from '../../models/hero.interface';

@Component({
  selector: 'app-hero-zone',
  standalone: true,
  imports: [HeroCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hero-zone-wrap">
      <div class="heroes-zone" id="tut-heroes-zone">
        @for (hero of state.heroes(); track heroZoneTrack(hero); let i = $index) {
          <app-hero-card
            [hero]="hero"
            [index]="i"
            [isSelected]="state.selectedHeroIdx() === i"
            [pickMode]="getPickMode(i)"
            (heroClicked)="targeting.onHeroCardClick(i)"
            (allyPickClicked)="targeting.onAllyHeroPickClick(i)" />
        }
      </div>
    </div>
  `,
  styles: [`
    .hero-zone-wrap {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      margin: 0;
      width: 100%;
      max-width: 736px;
      gap: 10px;
    }
    .heroes-zone {
      display: flex;
      flex-direction: row;
      gap: 8px;
      margin-bottom: 0;
      flex-wrap: nowrap;
      align-items: stretch;
      width: 100%;
      overflow-x: auto;
      overflow-y: visible;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x proximity;
      padding-bottom: 4px;
      scrollbar-gutter: stable;
    }
    .heroes-zone > app-hero-card {
      flex: 0 0 auto;
      scroll-snap-align: start;
    }
  `],
})
export class HeroZoneComponent {
  state = inject(GameStateService);
  targeting = inject(TargetingService);
  items = inject(ItemService);

  /** Include tier/max/name so evolved heroes reconcile and OnPush inputs refresh (id alone is stable). */
  heroZoneTrack(hero: HeroState): string {
    return `${hero.id}:${hero.tier}:${hero.maxHp}:${hero.name}`;
  }

  getPickMode(i: number): string | null {
    const pi = this.state.pendingItemSelection();
    if (pi) {
      const def = this.items.getDef(pi.itemId);
      const heroes = this.state.heroes();
      const t = heroes[i];
      if (!t) return null;
      if (def?.target === 'ally' && t.currentHp > 0) return 'itemAlly';
      if (def?.target === 'allyDead' && t.currentHp <= 0) return 'itemAllyDead';
      return null;
    }

    const shi = this.state.selectedHeroIdx();
    if (shi === null) return null;
    const nk = this.targeting.nextPickKindForHero(shi);
    const heroes = this.state.heroes();
    const t = heroes[i];
    if (!t) return null;

    // Targeted heal/shield: any living ally, including the caster (explicit pick required).
    if (nk === 'heal' || nk === 'shield' || nk === 'rollBuff') {
      if (t.currentHp <= 0) return null;
      return nk;
    }
    // Revive: dead allies only; never the living caster card.
    if (nk === 'revive') {
      if (shi === i) return null;
      if (t.currentHp > 0) return null;
      return nk;
    }
    return null;
  }
}
