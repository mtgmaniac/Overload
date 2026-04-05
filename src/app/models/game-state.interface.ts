import { LogClass } from './types';

export interface LogEntry {
  msg: string;
  cls: LogClass;
}

export type TutorialUiHighlight = 'enemy' | 'heroes' | 'dice' | 'protocol' | 'mainRoll' | null;

export interface TutorialState {
  active: boolean;
  introStep: number;
  introComplete: boolean;
  /** Enemy phases finished (1 = after first enemy, open turn-2 brief; 2 = tutorial done). */
  resolutions: number;
  showTurn2Modal: boolean;
  showComplete: boolean;
  /**
   * Post-intro coach on round 1: 0 = idle until squad roll, 1 = Pulse→drone, 2 = Shield→ally,
   * 3 = Medic roll-buff ally, 4 = done.
   */
  coachStep: number;
  /**
   * Round 2 coach after ROLL ALL: 0 = idle, 1 = spend Protocol on Medic (NUDGE or REROLL),
   * 2 = Medic Infusion heal target, 3 = Pulse enemy, 4 = Shield enemy debuff, 5 = done.
   */
  r2CoachStep: number;
}

export interface PendingEvolution {
  heroIdx: number;
  chosen: number | null;
}
