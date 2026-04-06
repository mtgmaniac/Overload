import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { CombatService } from '../../services/combat.service';
import { HeaderComponent } from '../header/header.component';
import { EnemyZoneComponent } from '../enemy-zone/enemy-zone.component';
import { HeroZoneComponent } from '../hero-zone/hero-zone.component';
import { DiceTrayComponent } from '../dice-tray/dice-tray.component';
import { ProtocolStripComponent } from '../protocol-strip/protocol-strip.component';
import { BattleLogComponent } from '../battle-log/battle-log.component';
import { ResultOverlayComponent } from '../overlays/result-overlay.component';
import { HelpOverlayComponent } from '../overlays/help-overlay.component';
import { EvolutionOverlayComponent } from '../overlays/evolution-overlay.component';
import { ItemDraftOverlayComponent } from '../overlays/item-draft-overlay.component';
import { TutorialOverlayComponent } from '../overlays/tutorial-overlay.component';
import { OperationPickerComponent } from '../overlays/operation-picker.component';
import { TutorialService } from '../../services/tutorial.service';
import { TUTORIAL_PARTY_IDS } from '../../data/tutorial-steps.data';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    HeaderComponent,
    EnemyZoneComponent,
    HeroZoneComponent,
    DiceTrayComponent,
    ProtocolStripComponent,
    BattleLogComponent,
    ResultOverlayComponent,
    HelpOverlayComponent,
    EvolutionOverlayComponent,
    ItemDraftOverlayComponent,
    TutorialOverlayComponent,
    OperationPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state.showOperationPicker()) {
      <app-operation-picker
        (startTutorial)="startTutorialFromHelp()"
        (helpClicked)="helpOpen.set(true)" />
    } @else {
      <div id="app">
        <app-header (helpClicked)="helpOpen.set(true)" (backHomeClicked)="onChangeOperation()" />
        <div class="lanes">
          <app-enemy-zone />
          <app-dice-tray />
          <app-hero-zone />
          <app-protocol-strip />
          <app-battle-log />
        </div>
      </div>
    }
    <app-result-overlay />
    <app-help-overlay
      [isOpen]="helpOpen()"
      (closed)="helpOpen.set(false)"
      (startTutorial)="startTutorialFromHelp()" />
    <app-tutorial-overlay (exitRegular)="onTutorialExitRegular()" />
    <app-evolution-overlay />
    <app-item-draft-overlay />
  `,
  styles: [`
    #app {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 760px;
      min-width: 0;
      margin: 0 auto;
      padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 12px max(12px, env(safe-area-inset-left));
    }
  `],
})
export class GameComponent {
  readonly state = inject(GameStateService);
  private combat = inject(CombatService);
  private tutorial = inject(TutorialService);

  helpOpen = signal(false);

  onChangeOperation(): void {
    this.combat.returnToOperationPicker();
  }

  startTutorialFromHelp(): void {
    this.helpOpen.set(false);
    this.state.showOperationPicker.set(false);
    this.state.battleModeId.set('facility');
    this.tutorial.launch();
    this.state.log.set([]);
    this.state.inventory.set([null, null, null]);
    this.state.itemDraftChoices.set(null);
    this.state.pendingItemSelection.set(null);
    this.state.initHeroes(TUTORIAL_PARTY_IDS);
    this.state.battle.set(0);
    this.combat.initBattle();
    this.tutorial.applyBattleTuning();
  }

  onTutorialExitRegular(): void {
    this.combat.returnToOperationPicker();
  }
}
