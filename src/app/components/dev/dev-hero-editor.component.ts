import { UpperCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeroContentService } from '../../services/hero-content.service';
import { EnemyContentService } from '../../services/enemy-content.service';
import { BattleProgressSimService } from '../../services/battle-progress-sim.service';
import { GameStateService } from '../../services/game-state.service';
import { DevDataPanelService } from '../../services/dev-data-panel.service';
import { HeroDefinition, EvolutionTier } from '../../models/hero.interface';
import { HeroAbility } from '../../models/ability.interface';
import { EnemyAbility, EnemyAbilitySuite } from '../../models/ability.interface';
import { EnemyDefinition } from '../../models/enemy.interface';
import { HeroId, Zone, ZONES, EnemyType } from '../../models/types';
import { HERO_PORTRAIT_PATHS } from '../../data/sprites.data';

type BracketRow = { lo: number; hi: number; zone: Zone };

/** Contiguous evolution tiers with the same `name` = one player-facing evolution path. */
interface EvoPathGroup {
  pathName: string;
  indices: number[];
}

function groupEvolutionPaths(evolutions: EvolutionTier[]): EvoPathGroup[] {
  const groups: EvoPathGroup[] = [];
  for (let i = 0; i < evolutions.length; i++) {
    const name = evolutions[i].name;
    const prev = groups[groups.length - 1];
    if (prev && prev.pathName === name && prev.indices[prev.indices.length - 1] === i - 1) {
      prev.indices.push(i);
    } else {
      groups.push({ pathName: name, indices: [i] });
    }
  }
  return groups;
}

const ENEMY_TYPES: EnemyType[] = [
  'scrap',
  'rust',
  'patrol',
  'guard',
  'warden',
  'volt',
  'boss',
  'skitter',
  'mite',
  'stalker',
  'carapace',
  'brood',
  'spewer',
  'hiveBoss',
  'veilShard',
  'veilPrism',
  'veilAegis',
  'veilResonance',
  'veilNull',
  'veilStorm',
  'veilSynapse',
  'veilBoss',
  'voidWisp',
  'voidAcolyte',
  'voidScribe',
  'voidBinder',
  'voidGlimmer',
  'voidChanneler',
  'voidCircletBoss',
  'beastMonkey',
  'beastWolf',
  'beastLynx',
  'beastBison',
  'beastHyena',
  'beastBadger',
  'beastTyrant',
  'signalSkimmer',
  'commsHex',
];

@Component({
  selector: 'app-dev-hero-editor',
  standalone: true,
  imports: [FormsModule, UpperCasePipe],
  template: `
    @if (devPanel.open()) {
      <div class="dev-backdrop" (click)="devPanel.closePanel()"></div>
      <div class="dev-panel" (click)="$event.stopPropagation()">
        <header class="dev-hdr">
          <h2>Game data (local dev)</h2>
          <button type="button" class="dev-x" (click)="devPanel.closePanel()">×</button>
        </header>
        <p class="dev-note">
          Heroes → <code>heroes.data.json</code> · Enemies → <code>enemies.data.json</code>. Stored in localStorage until you export
          or reset.
        </p>
        <div class="dev-main-tabs">
          <button type="button" [class.on]="mainTab() === 'heroes'" (click)="mainTab.set('heroes')">Heroes</button>
          <button type="button" [class.on]="mainTab() === 'enemies'" (click)="onMainTabEnemies()">Enemies</button>
        </div>
        @if (mainTab() === 'heroes') {
          <div class="dev-toolbar">
            <button type="button" (click)="saveHeroStorage()">Save heroes to browser</button>
            <button type="button" (click)="resetHeroBundled()">Reset heroes to bundled</button>
            <button type="button" (click)="exportHeroFile()">Export heroes JSON</button>
            <label class="dev-file">
              Import heroes JSON
              <input type="file" accept="application/json,.json" (change)="onImportHeroFile($event)" />
            </label>
            <button type="button" (click)="applySquad()">Apply squad (keep party)</button>
            <button type="button" (click)="randomSquad()">New random 3</button>
            <button type="button" (click)="reloadDraft()">Discard hero draft</button>
          </div>
        } @else {
          <div class="dev-toolbar">
            <button type="button" (click)="saveEnemyStorage()">Save enemies to browser</button>
            <button type="button" (click)="resetEnemyBundled()">Reset enemies to bundled</button>
            <button type="button" (click)="exportEnemyFile()">Export enemies JSON</button>
            <label class="dev-file">
              Import enemies JSON
              <input type="file" accept="application/json,.json" (change)="onImportEnemyFile($event)" />
            </label>
          </div>
        }
        @if (msg()) {
          <div class="dev-msg" [class.err]="msgIsErr()">{{ msg() }}</div>
        }
        <div class="dev-body-wrap">
          <div class="dev-body">
          @if (mainTab() === 'heroes') {
            <div class="dev-row">
              <label>Hero</label>
              <select [ngModel]="selectedId()" (ngModelChange)="onPickHero($event)">
                @for (id of heroIds(); track id) {
                  <option [value]="id">{{ id }}</option>
                }
              </select>
            </div>
            @if (draftHero) {
              <div class="dev-tabs">
                <button type="button" [class.on]="tab() === 'core'" (click)="tab.set('core')">Core & abilities</button>
                <button type="button" [class.on]="tab() === 'zones'" (click)="tab.set('zones')">Zone brackets</button>
                <button type="button" [class.on]="tab() === 'evo'" (click)="tab.set('evo')">Evolutions</button>
              </div>
              @if (tab() === 'core') {
                <section class="dev-sec">
                  <h3>Identity</h3>
                  <div class="dev-grid2">
                    <label>Name <input [(ngModel)]="draftHero.name" /></label>
                    <label>Class <input [(ngModel)]="draftHero.cls" /></label>
                    <label>HP <input type="number" [(ngModel)]="draftHero.hp" /></label>
                    <label>Portrait URL
                      <input [(ngModel)]="draftHero.portraitPath" [placeholder]="defaultPortrait()" />
                    </label>
                  </div>
                  <div class="dev-row">
                    <label
                      >Squad picker category
                      <select [(ngModel)]="draftHero.pickerCategory">
                        <option value="damage">Damage</option>
                        <option value="defense">Defense</option>
                        <option value="support">Support</option>
                        <option value="control">Control</option>
                      </select>
                    </label>
                  </div>
                  <div class="dev-row">
                    <label
                      >Squad picker blurb
                      <textarea rows="2" [(ngModel)]="draftHero.pickerBlurb"></textarea>
                    </label>
                  </div>
                  <p class="dev-hint">Leave portrait empty for default art. Blurb shows on the operation squad screen.</p>
                  <h3>Base abilities</h3>
                  @for (ab of draftHero.abilities; track $index; let ai = $index) {
                    <fieldset class="ab-field">
                      <legend>#{{ ai + 1 }} {{ ab.name }}</legend>
                      <div class="dev-grid3">
                        <label>Zone
                          <select [(ngModel)]="ab.zone">
                            @for (z of zones; track z) {
                              <option [value]="z">{{ z }}</option>
                            }
                          </select>
                        </label>
                        <label>Range lo <input type="number" [(ngModel)]="ab.range[0]" /></label>
                        <label>Range hi <input type="number" [(ngModel)]="ab.range[1]" /></label>
                      </div>
                      <label>Name <input [(ngModel)]="ab.name" /></label>
                      <label>Effect text <input [(ngModel)]="ab.eff" /></label>
                      <div class="dev-grid6">
                        <label>dmg <input type="number" [(ngModel)]="ab.dmg" /></label>
                        <label>dMin <input type="number" [(ngModel)]="ab.dMin" /></label>
                        <label>dMax <input type="number" [(ngModel)]="ab.dMax" /></label>
                        <label>dot <input type="number" [(ngModel)]="ab.dot" /></label>
                        <label>dT <input type="number" [(ngModel)]="ab.dT" /></label>
                        <label>rfe <input type="number" [(ngModel)]="ab.rfe" /></label>
                        <label>heal <input type="number" [(ngModel)]="ab.heal" /></label>
                        <label>rfT <input type="number" [ngModel]="ab.rfT ?? 0" (ngModelChange)="setOptNum(ab, 'rfT', $event)" /></label>
                        <label>shield <input type="number" [ngModel]="ab.shield ?? 0" (ngModelChange)="setOptNum(ab, 'shield', $event)" /></label>
                        <label>shT <input type="number" [ngModel]="ab.shT ?? 0" (ngModelChange)="setOptNum(ab, 'shT', $event)" /></label>
                        <label>rfm <input type="number" [ngModel]="ab.rfm ?? 0" (ngModelChange)="setOptNum(ab, 'rfm', $event)" /></label>
                        <label>rfmT <input type="number" [ngModel]="ab.rfmT ?? 0" (ngModelChange)="setOptNum(ab, 'rfmT', $event)" /></label>
                      </div>
                      <div class="dev-flags">
                        <label><input type="checkbox" [(ngModel)]="ab.shTgt" /> shTgt</label>
                        <label><input type="checkbox" [(ngModel)]="ab.shieldAll" /> shieldAll</label>
                        <label><input type="checkbox" [(ngModel)]="ab.healTgt" /> healTgt</label>
                        <label><input type="checkbox" [(ngModel)]="ab.healAll" /> healAll</label>
                        <label><input type="checkbox" [(ngModel)]="ab.healLowest" /> healLowest</label>
                        <label><input type="checkbox" [(ngModel)]="ab.revive" /> revive</label>
                        <label><input type="checkbox" [(ngModel)]="ab.rfmTgt" /> rfmTgt</label>
                        <label><input type="checkbox" [(ngModel)]="ab.cloak" /> cloak</label>
                        <label><input type="checkbox" [(ngModel)]="ab.taunt" /> taunt</label>
                        <label><input type="checkbox" [(ngModel)]="ab.blastAll" /> blastAll</label>
                        <label><input type="checkbox" [(ngModel)]="ab.multiHit" /> multiHit</label>
                        <label><input type="checkbox" [(ngModel)]="ab.ignSh" /> ignSh</label>
                        <label><input type="checkbox" [(ngModel)]="ab.splitDmg" /> splitDmg</label>
                        <label><input type="checkbox" [(ngModel)]="ab.rfeAll" /> rfeAll</label>
                        <label><input type="checkbox" [(ngModel)]="ab.rfeOnly" /> rfeOnly</label>
                      </div>
                    </fieldset>
                  }
                </section>
              }
              @if (tab() === 'zones') {
                <section class="dev-sec">
                  <h3>Roll brackets for {{ selectedId() }}</h3>
                  @for (row of zoneBracketRows; track $index; let zi = $index) {
                    <div class="dev-bracket">
                      <input type="number" [(ngModel)]="row.lo" />
                      <span>–</span>
                      <input type="number" [(ngModel)]="row.hi" />
                      <select [(ngModel)]="row.zone">
                        @for (z of zones; track z) {
                          <option [value]="z">{{ z }}</option>
                        }
                      </select>
                      <button type="button" class="dev-rm" (click)="removeBracket(zi)" [disabled]="zoneBracketRows.length <= 1">
                        Remove
                      </button>
                    </div>
                  }
                  <button type="button" (click)="addBracket()">Add bracket</button>
                </section>
              }
              @if (tab() === 'evo') {
                <section class="dev-sec">
                  <div class="dev-row">
                    <label>Evolution path</label>
                    <select [ngModel]="evoPathIdx" (ngModelChange)="evoPathIdx = +$event">
                      @for (g of evoPathGroups(); track $index) {
                        <option [value]="$index">{{ g.pathName }} · {{ g.indices.length }} zone slice(s)</option>
                      }
                    </select>
                  </div>
                  @if (selectedEvoGroup(); as grp) {
                    @if (evoLead(grp); as lead) {
                      <div class="dev-path-head">
                        <h3>{{ grp.pathName }}</h3>
                        <p class="dev-hint">
                          One evolution path: all zone slices below use the same path name in data. Edit intro-tier focus / bonus HP
                          on the first slice only.
                        </p>
                        <div class="dev-grid2">
                          <label>Path name (all slices)
                            <input [ngModel]="grp.pathName" (ngModelChange)="syncEvoPathName($event)" />
                          </label>
                          <label>Focus (intro tier)
                            <input [(ngModel)]="lead.focus" />
                          </label>
                          <label>Bonus HP (intro tier)
                            <input type="number" [(ngModel)]="lead.hp" />
                          </label>
                        </div>
                      </div>
                      <h3>All abilities for this path</h3>
                      @for (row of evoPathAbilityRows(grp); track row.tierIdx + '-' + row.abi) {
                        <fieldset class="ab-field">
                          <legend>{{ row.ab.zone | uppercase }} — {{ row.ab.name }} <span class="dev-slice">(row {{ row.tierIdx + 1 }})</span></legend>
                          <div class="dev-grid3">
                            <label>Zone
                              <select [(ngModel)]="row.ab.zone">
                                @for (z of zones; track z) {
                                  <option [value]="z">{{ z }}</option>
                                }
                              </select>
                            </label>
                            <label>Range lo <input type="number" [(ngModel)]="row.ab.range[0]" /></label>
                            <label>Range hi <input type="number" [(ngModel)]="row.ab.range[1]" /></label>
                          </div>
                          <label>Name <input [(ngModel)]="row.ab.name" /></label>
                          <label>Effect text <input [(ngModel)]="row.ab.eff" /></label>
                          <div class="dev-grid6">
                            <label>dmg <input type="number" [(ngModel)]="row.ab.dmg" /></label>
                            <label>dMin <input type="number" [(ngModel)]="row.ab.dMin" /></label>
                            <label>dMax <input type="number" [(ngModel)]="row.ab.dMax" /></label>
                            <label>dot <input type="number" [(ngModel)]="row.ab.dot" /></label>
                            <label>dT <input type="number" [(ngModel)]="row.ab.dT" /></label>
                            <label>rfe <input type="number" [(ngModel)]="row.ab.rfe" /></label>
                            <label>heal <input type="number" [(ngModel)]="row.ab.heal" /></label>
                            <label>rfT <input type="number" [ngModel]="row.ab.rfT ?? 0" (ngModelChange)="setOptNum(row.ab, 'rfT', $event)" /></label>
                            <label>shield <input type="number" [ngModel]="row.ab.shield ?? 0" (ngModelChange)="setOptNum(row.ab, 'shield', $event)" /></label>
                            <label>shT <input type="number" [ngModel]="row.ab.shT ?? 0" (ngModelChange)="setOptNum(row.ab, 'shT', $event)" /></label>
                            <label>rfm <input type="number" [ngModel]="row.ab.rfm ?? 0" (ngModelChange)="setOptNum(row.ab, 'rfm', $event)" /></label>
                            <label>rfmT <input type="number" [ngModel]="row.ab.rfmT ?? 0" (ngModelChange)="setOptNum(row.ab, 'rfmT', $event)" /></label>
                          </div>
                          <div class="dev-flags">
                            <label><input type="checkbox" [(ngModel)]="row.ab.shTgt" /> shTgt</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.shieldAll" /> shieldAll</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.healTgt" /> healTgt</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.healAll" /> healAll</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.healLowest" /> healLowest</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.revive" /> revive</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.rfmTgt" /> rfmTgt</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.cloak" /> cloak</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.taunt" /> taunt</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.blastAll" /> blastAll</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.multiHit" /> multiHit</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.ignSh" /> ignSh</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.splitDmg" /> splitDmg</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.rfeAll" /> rfeAll</label>
                            <label><input type="checkbox" [(ngModel)]="row.ab.rfeOnly" /> rfeOnly</label>
                          </div>
                        </fieldset>
                      }
                    }
                  }
                </section>
              }
              <footer class="dev-foot">
                <button type="button" class="dev-primary" (click)="commitHero()">Save hero + zones</button>
              </footer>
            }
          } @else {
            @if (enemySuiteDraft && enemyUnitDraft && battleScaleDraft.length) {
              <section class="dev-sec">
                <h3>Ability suite by enemy type</h3>
                <div class="dev-row">
                  <label>Type</label>
                  <select [ngModel]="enemyAbilityType" (ngModelChange)="onEnemyTypeChange($event)">
                    @for (t of enemyTypes; track t) {
                      <option [value]="t">{{ t }}</option>
                    }
                  </select>
                </div>
                @for (z of zones; track z) {
                  @if (enemySuiteDraft[z]; as eab) {
                    <fieldset class="ab-field">
                      <legend>{{ z | uppercase }}</legend>
                      <label>Name <input [(ngModel)]="eab.name" /></label>
                      <label>Effect <input [(ngModel)]="eab.eff" /></label>
                      <div class="dev-grid6">
                        <label>dmg <input type="number" [(ngModel)]="eab.dmg" /></label>
                        <label>dmgP2 <input type="number" [ngModel]="eab.dmgP2 ?? 0" (ngModelChange)="setEnemyOptNum(eab, 'dmgP2', $event)" /></label>
                        <label>dot <input type="number" [(ngModel)]="eab.dot" /></label>
                        <label>dT <input type="number" [(ngModel)]="eab.dT" /></label>
                        <label>heal <input type="number" [(ngModel)]="eab.heal" /></label>
                        <label>rfe <input type="number" [(ngModel)]="eab.rfe" /></label>
                        <label>shield <input type="number" [(ngModel)]="eab.shield" /></label>
                        <label>shT <input type="number" [ngModel]="eab.shT ?? 0" (ngModelChange)="setEnemyOptNum(eab, 'shT', $event)" /></label>
                        <label>shAlly <input type="number" [ngModel]="eab.shieldAlly ?? 0" (ngModelChange)="setEnemyOptNum(eab, 'shieldAlly', $event)" /></label>
                        <label>rfm <input type="number" [ngModel]="eab.rfm ?? 0" (ngModelChange)="setEnemyOptNum(eab, 'rfm', $event)" /></label>
                        <label>rfmT <input type="number" [ngModel]="eab.rfmT ?? 0" (ngModelChange)="setEnemyOptNum(eab, 'rfmT', $event)" /></label>
                      </div>
                      <label class="dev-flags"><input type="checkbox" [(ngModel)]="eab.wipeShields" /> wipeShields</label>
                    </fieldset>
                  }
                }
              </section>
              <section class="dev-sec">
                <h3>Unit roster</h3>
                <div class="dev-row">
                  <label>Spawn name</label>
                  <select [ngModel]="enemyUnitKey" (ngModelChange)="onEnemyUnitKeyChange($event)">
                    @for (k of enemyUnitNames(); track k) {
                      <option [value]="k">{{ k }}</option>
                    }
                  </select>
                </div>
                <div class="dev-grid2">
                  <label>HP <input type="number" [(ngModel)]="enemyUnitDraft.hp" /></label>
                  <label>dMin <input type="number" [(ngModel)]="enemyUnitDraft.dMin" /></label>
                  <label>dMax <input type="number" [(ngModel)]="enemyUnitDraft.dMax" /></label>
                  <label>type
                    <select [(ngModel)]="enemyUnitDraft.type">
                      @for (t of enemyTypes; track t) {
                        <option [value]="t">{{ t }}</option>
                      }
                    </select>
                  </label>
                  <label>ai
                    <select [(ngModel)]="enemyUnitDraft.ai">
                      <option value="dumb">dumb</option>
                      <option value="smart">smart</option>
                    </select>
                  </label>
                  <label>p2dMin <input type="number" [ngModel]="enemyUnitDraft.p2dMin ?? 0" (ngModelChange)="setUnitOptNum('p2dMin', $event)" /></label>
                  <label>p2dMax <input type="number" [ngModel]="enemyUnitDraft.p2dMax ?? 0" (ngModelChange)="setUnitOptNum('p2dMax', $event)" /></label>
                  <label>pThr <input type="number" [ngModel]="enemyUnitDraft.pThr ?? 0" (ngModelChange)="setUnitOptNum('pThr', $event)" /></label>
                </div>
              </section>
              <section class="dev-sec">
                <h3>Battle scaling (rows 1–10)</h3>
                @for (row of battleScaleDraft; track $index; let bi = $index) {
                  <div class="dev-bracket">
                    <span class="dev-bi">B{{ bi + 1 }}</span>
                    <label>hp ×<input type="number" step="0.01" [(ngModel)]="row.hp" /></label>
                    <label>dmg ×<input type="number" step="0.01" [(ngModel)]="row.dmg" /></label>
                  </div>
                }
              </section>
              <footer class="dev-foot">
                <button type="button" class="dev-primary" (click)="commitEnemyData()">Save enemy data</button>
              </footer>
            }
          }
          </div>
          <aside class="dev-sim-dock" aria-label="Battle progress Monte Carlo sim">
            <h3 class="dev-sim-title">Battle sim</h3>
            <p class="dev-sim-hint">
              Random 3-hero squads vs encounter tables. Uses <strong>current</strong> hero &amp; enemy data (save to memory
              first). Each operation: % reach battles 1–10, full clear %, and hero over-representation vs fair 3-of-8 odds.
            </p>
            <div class="dev-sim-row">
              <label
                >Iterations
                <input type="number" min="50" max="20000" step="50" [(ngModel)]="simIterations" />
              </label>
              <button type="button" class="dev-sim-run" [disabled]="simRunning()" (click)="runBattleSim()">
                {{ simRunning() ? 'Running…' : 'Run' }}
              </button>
              <button
                type="button"
                class="dev-sim-copy"
                [disabled]="simRunning() || simOutput() === 'Running…'"
                (click)="copyBattleSimOutput()"
              >
                {{ simJustCopied() ? 'Copied' : 'Copy text' }}
              </button>
            </div>
            <pre class="dev-sim-out">{{ simOutput() }}</pre>
          </aside>
        </div>
      </div>
    }
  `,
  styles: `
    .dev-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10001;
      background: rgba(4, 8, 14, 0.72);
    }
    .dev-body-wrap {
      display: flex;
      flex: 1;
      min-height: 0;
      gap: 0;
    }
    .dev-sim-dock {
      flex: 0 0 min(300px, 34vw);
      max-width: 360px;
      border-left: 1px solid #1e2a38;
      padding: 10px 12px 14px;
      background: #060910;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .dev-sim-title {
      margin: 0 0 6px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #9ec8ff;
      text-transform: uppercase;
    }
    .dev-sim-hint {
      margin: 0 0 10px;
      font-size: 10px;
      line-height: 1.45;
      color: #6a8094;
    }
    .dev-sim-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 8px;
      margin-bottom: 8px;
    }
    .dev-sim-row label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 10px;
      color: #9aa;
    }
    .dev-sim-row input[type='number'] {
      width: 88px;
      padding: 4px 6px;
      border: 1px solid #33485c;
      background: #060a10;
      color: #fff;
      font-size: 12px;
    }
    .dev-sim-run {
      font-size: 11px;
      font-weight: 600;
      padding: 6px 12px;
      border: 1px solid #4a8ad4;
      background: #0c1524;
      color: #cfe8ff;
      cursor: pointer;
      border-radius: var(--radius-pixel, 0);
    }
    .dev-sim-run:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .dev-sim-copy {
      font-size: 11px;
      font-weight: 600;
      padding: 6px 12px;
      border: 1px solid #3d5c4a;
      background: #0c1814;
      color: #9ed4b8;
      cursor: pointer;
      border-radius: var(--radius-pixel, 0);
    }
    .dev-sim-copy:hover:not(:disabled) {
      filter: brightness(1.12);
    }
    .dev-sim-copy:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .dev-sim-out {
      flex: 1;
      min-height: 220px;
      margin: 0;
      padding: 8px;
      font-size: 9px;
      line-height: 1.35;
      font-family: var(--font-pixel, ui-monospace, monospace);
      color: #b8d4e8;
      background: #080c12;
      border: 1px solid #243444;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    @media (max-width: 780px) {
      .dev-body-wrap {
        flex-direction: column;
      }
      .dev-sim-dock {
        flex: 0 0 auto;
        max-width: none;
        border-left: none;
        border-top: 1px solid #1e2a38;
        max-height: 38vh;
      }
    }
    .dev-panel {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 10002;
      width: min(1120px, 98vw);
      max-height: min(92vh, 900px);
      display: flex;
      flex-direction: column;
      background: #0a0e14;
      border: 2px solid #3a5a78;
      border-radius: var(--radius-pixel, 0);
      box-shadow: 6px 6px 0 #000;
      font-family: var(--font-ui, system-ui, sans-serif);
      font-size: 13px;
      color: #d8e4f0;
    }
    .dev-hdr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid #2a4058;
      background: #080c12;
    }
    .dev-hdr h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }
    .dev-x {
      border: none;
      background: transparent;
      color: #9ab;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
    }
    .dev-note {
      margin: 0;
      padding: 8px 14px;
      font-size: 12px;
      color: #8aa0b8;
      border-bottom: 1px solid #1e2a38;
    }
    .dev-note code { font-size: 11px; color: #a8c8e8; }
    .dev-main-tabs {
      display: flex;
      gap: 0;
      border-bottom: 2px solid #1e2a38;
      background: #060910;
    }
    .dev-main-tabs button {
      flex: 1;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 600;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      background: transparent;
      color: #7a8a9c;
      cursor: pointer;
    }
    .dev-main-tabs button.on {
      color: #e8f4ff;
      border-bottom-color: #4a8ad4;
      background: #0c1218;
    }
    .dev-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 14px;
      border-bottom: 1px solid #1e2a38;
      align-items: center;
    }
    .dev-toolbar button,
    .dev-file {
      font-size: 12px;
      padding: 5px 10px;
      border-radius: var(--radius-pixel, 0);
      border: 1px solid #3a5068;
      background: #121a24;
      color: #e0ecfc;
      cursor: pointer;
    }
    .dev-file input { display: none; }
    .dev-msg {
      margin: 0 14px 8px;
      padding: 6px 10px;
      font-size: 12px;
      background: #0f1a12;
      border: 1px solid #2a5838;
      color: #9ed4a8;
    }
    .dev-msg.err {
      background: #241010;
      border-color: #683030;
      color: #f0a0a0;
    }
    .dev-body {
      padding: 12px 14px 0;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }
    .dev-row, .dev-grid2, .dev-grid3, .dev-grid6 {
      display: grid;
      gap: 8px;
      margin-bottom: 10px;
    }
    .dev-row { grid-template-columns: 100px 1fr; align-items: center; }
    .dev-grid2 { grid-template-columns: 1fr 1fr; }
    .dev-grid3 { grid-template-columns: 1fr 1fr 1fr; }
    .dev-grid6 {
      grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    }
    .dev-row label, .dev-grid2 label, .dev-grid3 label, .dev-grid6 label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      color: #9aa;
    }
    .dev-row input, .dev-row select,
    .dev-grid2 input, .dev-grid2 select,
    .dev-grid3 input, .dev-grid3 select,
    .dev-grid6 input {
      padding: 4px 6px;
      border: 1px solid #33485c;
      background: #060a10;
      color: #fff;
      font-size: 12px;
    }
    .dev-hint { font-size: 11px; color: #6a8094; margin: 0 0 12px; }
    .dev-path-head h3 { margin: 0 0 8px; }
    .dev-slice { font-size: 10px; color: #5a7088; font-weight: 400; }
    .dev-tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 12px;
    }
    .dev-tabs button {
      padding: 6px 12px;
      font-size: 12px;
      border: 1px solid #33485c;
      background: #0e141c;
      color: #9ab;
      cursor: pointer;
    }
    .dev-tabs button.on {
      border-color: #4a8ad4;
      color: #cfe8ff;
      background: #121c2c;
    }
    .dev-sec h3 {
      margin: 16px 0 8px;
      font-size: 13px;
      color: #b8cce0;
    }
    .ab-field {
      border: 1px solid #2a3848;
      padding: 10px;
      margin-bottom: 10px;
    }
    .ab-field legend { font-size: 11px; color: #8ab; padding: 0 6px; }
    .dev-flags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
      margin-top: 8px;
      font-size: 11px;
    }
    .dev-flags label { flex-direction: row; align-items: center; gap: 4px; color: #aab; }
    .dev-bracket {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }
    .dev-bracket input[type="number"] { width: 72px; }
    .dev-bi {
      font-size: 11px;
      font-weight: 700;
      color: #8ab;
      width: 28px;
    }
    .dev-rm {
      font-size: 11px;
      padding: 2px 8px;
      margin-left: auto;
    }
    .dev-foot {
      padding: 12px 14px;
      border-top: 1px solid #1e2a38;
      background: #080c12;
    }
    .dev-primary {
      font-size: 13px;
      font-weight: 600;
      padding: 8px 16px;
      border: 2px solid #c47a1a;
      background: #2a1a08;
      color: #fff;
      cursor: pointer;
    }
  `,
})
export class DevHeroEditorComponent {
  readonly devPanel = inject(DevDataPanelService);
  readonly content = inject(HeroContentService);
  readonly enemyContent = inject(EnemyContentService);
  private readonly battleSim = inject(BattleProgressSimService);
  private readonly state = inject(GameStateService);

  readonly mainTab = signal<'heroes' | 'enemies'>('heroes');
  readonly tab = signal<'core' | 'zones' | 'evo'>('core');
  readonly selectedId = signal<HeroId>('pulse');

  evoPathIdx = 0;

  draftHero: HeroDefinition | null = null;
  zoneBracketRows: BracketRow[] = [];

  enemyAbilityType: EnemyType = 'scrap';
  enemySuiteDraft: EnemyAbilitySuite | null = null;
  enemyUnitKey = '';
  enemyUnitDraft: Omit<EnemyDefinition, 'name'> | null = null;
  battleScaleDraft: { hp: number; dmg: number }[] = [];

  readonly enemyTypes = ENEMY_TYPES;

  readonly msg = signal('');
  readonly msgIsErr = signal(false);

  simIterations = 1500;
  readonly simRunning = signal(false);
  readonly simJustCopied = signal(false);
  readonly simOutput = signal(
    'Run for reach 1–10 + full clear % per op, and hero representation vs fair squad odds.',
  );

  readonly heroIds = computed(() => this.content.heroes().map(h => h.id));

  readonly enemyUnitNames = computed(() =>
    Object.keys(this.enemyContent.enemyUnitDefs()).sort((a, b) => a.localeCompare(b)),
  );

  readonly zones = ZONES;

  readonly defaultPortrait = computed(() => HERO_PORTRAIT_PATHS[this.selectedId()]);

  constructor() {
    this.reloadDraft();
  }

  evoPathGroups(): EvoPathGroup[] {
    if (!this.draftHero?.evolutions?.length) return [];
    return groupEvolutionPaths(this.draftHero.evolutions);
  }

  selectedEvoGroup(): EvoPathGroup | null {
    const g = this.evoPathGroups();
    if (!g.length) return null;
    const i = Math.max(0, Math.min(g.length - 1, this.evoPathIdx));
    return g[i] ?? null;
  }

  evoLead(grp: EvoPathGroup): EvolutionTier | null {
    const d = this.draftHero;
    if (!d) return null;
    const fi = grp.indices[0];
    return d.evolutions[fi] ?? null;
  }

  syncEvoPathName(newName: string): void {
    const g = this.selectedEvoGroup();
    if (!g || !this.draftHero) return;
    for (const i of g.indices) this.draftHero.evolutions[i].name = newName;
  }

  onMainTabEnemies(): void {
    this.mainTab.set('enemies');
    this.refreshEnemyDrafts();
  }

  refreshEnemyDrafts(): void {
    this.enemySuiteDraft = structuredClone(this.enemyContent.suiteFor(this.enemyAbilityType));
    const defs = this.enemyContent.enemyUnitDefs();
    const keys = Object.keys(defs).sort((a, b) => a.localeCompare(b));
    if (!this.enemyUnitKey || !keys.includes(this.enemyUnitKey)) {
      this.enemyUnitKey = keys[0] ?? '';
    }
    this.enemyUnitDraft = this.enemyUnitKey ? structuredClone(defs[this.enemyUnitKey]) : null;
    this.battleScaleDraft = structuredClone(this.enemyContent.battleEnemyScale());
  }

  evoPathAbilityRows(grp: EvoPathGroup): { tierIdx: number; ab: HeroAbility; abi: number }[] {
    const d = this.draftHero;
    if (!d) return [];
    const rows: { tierIdx: number; ab: HeroAbility; abi: number }[] = [];
    for (const ti of grp.indices) {
      const ev = d.evolutions[ti];
      if (!ev) continue;
      ev.abilities.forEach((ab, abi) => rows.push({ tierIdx: ti, ab, abi }));
    }
    return rows;
  }

  onEnemyTypeChange(t: string): void {
    const et = t as EnemyType;
    this.enemyAbilityType = et;
    this.enemySuiteDraft = structuredClone(this.enemyContent.suiteFor(et));
  }

  onEnemyUnitKeyChange(key: string): void {
    this.enemyUnitKey = key;
    const defs = this.enemyContent.enemyUnitDefs();
    this.enemyUnitDraft = key ? structuredClone(defs[key]) : null;
  }

  commitEnemyData(): void {
    if (this.enemySuiteDraft) this.enemyContent.setSuite(this.enemyAbilityType, this.enemySuiteDraft);
    if (this.enemyUnitDraft && this.enemyUnitKey) this.enemyContent.setUnitDef(this.enemyUnitKey, this.enemyUnitDraft);
    if (this.battleScaleDraft?.length === 10) this.enemyContent.setBattleScale(this.battleScaleDraft);
    this.flash('Enemy definitions updated in memory.', false);
  }

  saveEnemyStorage(): void {
    this.commitEnemyData();
    this.enemyContent.persistToLocalStorage();
    this.flash('Enemies stored in localStorage.', false);
  }

  resetEnemyBundled(): void {
    this.enemyContent.clearLocalAndResetBundled();
    this.refreshEnemyDrafts();
    this.flash('Enemies reset to bundled JSON.', false);
  }

  exportEnemyFile(): void {
    const blob = new Blob([this.enemyContent.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'enemies-dev-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
    this.flash('Enemy export started.', false);
  }

  onImportEnemyFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const res = this.enemyContent.importJson(String(r.result || ''));
      if (res.ok) {
        this.refreshEnemyDrafts();
        this.enemyContent.persistToLocalStorage();
        this.flash('Enemies imported.', false);
      } else {
        this.flash(res.error, true);
      }
    };
    r.readAsText(file);
  }

  setEnemyOptNum(ab: EnemyAbility, key: 'dmgP2' | 'shT' | 'shieldAlly' | 'rfm' | 'rfmT', v: number): void {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) delete ab[key];
    else (ab as unknown as Record<string, number>)[key] = Math.round(n);
  }

  setUnitOptNum(key: 'p2dMin' | 'p2dMax' | 'pThr', v: number): void {
    const d = this.enemyUnitDraft;
    if (!d) return;
    const n = Math.round(Number(v) || 0);
    if (n <= 0) delete d[key];
    else (d as unknown as Record<string, number>)[key] = n;
  }

  onPickHero(id: HeroId): void {
    this.selectedId.set(id);
    this.evoPathIdx = 0;
    this.reloadDraft();
  }

  reloadDraft(): void {
    const id = this.selectedId();
    const h = this.content.getHero(id);
    if (!h) {
      this.draftHero = null;
      this.zoneBracketRows = [];
      return;
    }
    this.draftHero = structuredClone(h) as HeroDefinition;
    const z = this.content.heroZones()[id] ?? [];
    this.zoneBracketRows = z.map(([lo, hi, zone]) => ({ lo, hi, zone }));
    this.evoPathIdx = 0;
    this.flash('Loaded hero draft.', false);
  }

  commitHero(): void {
    const d = this.draftHero;
    if (!d) return;
    const id = this.selectedId();
    const tuples: [number, number, Zone][] = this.zoneBracketRows.map(r => [
      Math.round(Number(r.lo) || 1),
      Math.round(Number(r.hi) || 1),
      r.zone,
    ]);
    this.content.setHeroDefinition(d);
    this.content.setZonesForHero(id, tuples);
    this.flash('Hero saved to in-memory definitions.', false);
  }

  saveHeroStorage(): void {
    this.commitHero();
    this.content.persistToLocalStorage();
    this.flash('Heroes stored in localStorage.', false);
  }

  resetHeroBundled(): void {
    this.content.clearLocalAndResetBundled();
    this.reloadDraft();
    this.flash('Heroes reset to bundled JSON.', false);
  }

  exportHeroFile(): void {
    const blob = new Blob([this.content.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'heroes-dev-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
    this.flash('Hero export started.', false);
  }

  onImportHeroFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const res = this.content.importJson(String(r.result || ''));
      if (res.ok) {
        this.reloadDraft();
        this.content.persistToLocalStorage();
        this.flash('Heroes imported.', false);
      } else {
        this.flash(res.error, true);
      }
    };
    r.readAsText(file);
  }

  applySquad(): void {
    this.commitHero();
    const ids = this.state.heroes().map(h => h.id);
    if (ids.length) this.state.initHeroes(ids);
    else this.state.initHeroes();
    this.flash('Squad re-built from definitions.', false);
  }

  randomSquad(): void {
    this.commitHero();
    this.state.initHeroes();
    this.flash('New random 3.', false);
  }

  addBracket(): void {
    this.zoneBracketRows = [...this.zoneBracketRows, { lo: 1, hi: 4, zone: 'recharge' }];
  }

  removeBracket(i: number): void {
    if (this.zoneBracketRows.length <= 1) return;
    this.zoneBracketRows = this.zoneBracketRows.filter((_, j) => j !== i);
  }

  setOptNum(ab: HeroAbility, key: 'rfT' | 'shield' | 'shT' | 'rfm' | 'rfmT', v: number): void {
    const n = Math.round(Number(v) || 0);
    if (n <= 0) delete ab[key];
    else (ab as unknown as Record<string, number | undefined>)[key] = n;
  }

  private flash(text: string, err: boolean): void {
    this.msg.set(text);
    this.msgIsErr.set(err);
  }

  runBattleSim(): void {
    if (this.simRunning()) return;
    this.simRunning.set(true);
    this.simOutput.set('Running…');
    const n = Math.max(50, Math.min(20000, Math.floor(Number(this.simIterations) || 1500)));
    setTimeout(() => {
      try {
        const r = this.battleSim.run(n);
        this.simOutput.set(this.battleSim.format(r));
      } catch (e) {
        this.simOutput.set(e instanceof Error ? e.message : String(e));
      }
      this.simRunning.set(false);
    }, 0);
  }

  async copyBattleSimOutput(): Promise<void> {
    const text = this.simOutput();
    if (!text || text === 'Running…') return;
    try {
      await navigator.clipboard.writeText(text);
      this.simJustCopied.set(true);
      setTimeout(() => this.simJustCopied.set(false), 2000);
    } catch {
      this.flash('Clipboard copy failed', true);
    }
  }
}
