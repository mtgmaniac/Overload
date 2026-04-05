import { HeroId } from '../models/types';
import { TutorialUiHighlight } from '../models/game-state.interface';

export const TUTORIAL_PARTY_IDS: HeroId[] = ['pulse', 'shield', 'medic'];

export interface TutorialIntroStep {
  k: string;
  title: string;
  body: string;
  highlight: TutorialUiHighlight;
}

export const TUTORIAL_INTRO_STEPS: TutorialIntroStep[] = [
  {
    k: '1 / 5',
    title: 'Objective',
    body: 'Knock out every enemy. They sit up top; your squad is below. This guided drill uses one practice drone.',
    highlight: 'enemy',
  },
  {
    k: '2 / 5',
    title: 'Your squad',
    body: 'Each card lists abilities by d20 zone. Your roll picks the row that resolves when you END TURN.',
    highlight: 'heroes',
  },
  {
    k: '3 / 5',
    title: 'Dice & turns',
    body: 'ROLL ALL DICE (or tap each die), set targets on cards, then END TURN.',
    highlight: 'dice',
  },
  {
    k: '4 / 5',
    title: 'Protocol',
    body: 'You gain +10 Protocol after each END TURN (max 50). Spend it on REROLL (10) or NUDGE +2 (5): pick the action, then a hero.',
    highlight: 'protocol',
  },
  {
    k: '5 / 5',
    title: 'First turn',
    body: 'Tap ROLL ALL DICE — rolls are preset for this drill. Right after, we will walk through picking targets on your cards.',
    highlight: 'mainRoll',
  },
];

/** Player round 1 hero rolls: pulse strike dmg, shield strike, medic recharge. */
export const TUTORIAL_HERO_ROLLS_R1: Record<number, number> = { 0: 6, 1: 8, 2: 3 };

/** Player round 2: Medic base roll 5 = Infusion (5–11); +5 nudge → 10, still Infusion. Others low for contrast. */
export const TUTORIAL_HERO_ROLLS_R2: Record<number, number> = { 0: 2, 1: 4, 2: 5 };

/**
 * Enemy raw d20 after squad reveal. R1 uses overload (Detonator) so Medic takes a big hit — makes the
 * round-2 Infusion heal feel necessary. R2 stays low (recharge) so the drill can end calmly.
 */
export const TUTORIAL_ENEMY_PRE_R1 = 20;
export const TUTORIAL_ENEMY_PRE_R2 = 3;
