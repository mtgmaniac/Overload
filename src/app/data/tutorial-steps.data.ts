import { HeroId } from '../models/types';
import { TutorialUiHighlight } from '../models/game-state.interface';
import {
  PROTOCOL_MAX,
  PROTOCOL_ROUND,
  PROTOCOL_REROLL_COST,
  PROTOCOL_NUDGE_COST,
  PROTOCOL_NUDGE_DELTA,
} from '../models/constants';

export const TUTORIAL_PARTY_IDS: HeroId[] = ['pulse', 'shield', 'medic'];

export interface TutorialIntroStep {
  k: string;
  title: string;
  body: string;
  highlight: TutorialUiHighlight;
}

export const TUTORIAL_INTRO_STEPS: TutorialIntroStep[] = [
  {
    k: '1 / 7',
    title: 'Objective',
    body: 'Knock out every enemy. They sit up top; your squad is below. This guided drill uses one practice drone.',
    highlight: 'enemy',
  },
  {
    k: '2 / 7',
    title: 'Your squad',
    body: 'Each card lists abilities by d20 zone. Your roll picks the row that resolves when you END TURN.',
    highlight: 'heroes',
  },
  {
    k: '3 / 7',
    title: 'Dice & turns',
    body: 'ROLL ALL DICE (or tap each die), set targets on cards, then END TURN.',
    highlight: 'dice',
  },
  {
    k: '4 / 7',
    title: 'Protocol meter',
    body: `You gain +${PROTOCOL_ROUND} Protocol after each END TURN (cap ${PROTOCOL_MAX}). The bar is your spend budget for the round.`,
    highlight: 'protocolMeter',
  },
  {
    k: '5 / 7',
    title: 'Reroll, Nudge & items',
    body: `Primary icons beside the meter: the dice icon is Reroll (${PROTOCOL_REROLL_COST} Protocol); the arrow is Nudge +${PROTOCOL_NUDGE_DELTA} (${PROTOCOL_NUDGE_COST} Protocol) — tap the icon, then a hero. The three small slots stash consumables from battle wins (empty in this drill).`,
    highlight: 'protocolIcons',
  },
  {
    k: '6 / 7',
    title: 'Help anytime',
    body: 'Tap HELP in the header for the full rule reference — abilities, items, Protocol, modes, and glossary. You can launch this tutorial again from Help when you need a refresher.',
    highlight: 'help',
  },
  {
    k: '7 / 7',
    title: 'First turn',
    body: 'Tap ROLL ALL DICE — rolls are preset for this drill. Right after, we will walk through picking targets on your cards.',
    highlight: 'mainRoll',
  },
];

/** Player round 1 hero rolls: pulse strike dmg, shield strike, medic recharge. */
export const TUTORIAL_HERO_ROLLS_R1: Record<number, number> = { 0: 6, 1: 8, 2: 3 };

/**
 * Enemy raw d20 after squad reveal. High roll makes the drone hit hard so the shield / medic setup matters.
 */
export const TUTORIAL_ENEMY_PRE_R1 = 20;
