/**
 * Learning in small bites. Each card asks a question first and lets the person guess,
 * so they come to the idea themselves ("you need to understand", not "you need to change").
 * Plain words, one idea per card, never a lecture. Not medical advice.
 */
export interface Lesson {
  id: string;
  /** The question on the front of the card. */
  ask: string;
  /** Two or three answers to tap. */
  options: string[];
  /** Index of the answer that fits best. */
  answer: number;
  /** What the person sees after tapping, in two or three short sentences. */
  why: string;
  /** One small thing to try. */
  tryThis: string;
  icon: string;
  /** Only shown in Ramadan mode. */
  ramadan?: boolean;
}

export const LESSONS: Lesson[] = [
  {
    id: 'quiet',
    ask: 'In a US study of South Asian adults over 40, how many had diabetes?',
    options: ['About 1 in 20', 'About 1 in 10', 'About 1 in 4'],
    answer: 2,
    why: 'About 1 in 4, several times the rate for white Americans in the same years. Many of them felt completely fine. That is why small habits matter before anything feels wrong.',
    tryThis: 'Share one plate a day this week. Noticing is the first step.',
    icon: 'people',
  },
  {
    id: 'fist',
    ask: 'How much cooked rice fits in your closed fist?',
    options: ['About half a cup', 'About two cups'],
    answer: 0,
    why: 'Your fist is about half a cup, and it grows with you, so it is a ruler you always carry. Most home plates of rice are three or four fists.',
    tryThis: 'Tonight, look at the rice and count it in fists. No need to change it yet.',
    icon: 'hand-left',
  },
  {
    id: 'order',
    ask: 'Same plate, same food. Does the order you eat it in change anything?',
    options: ['No, it all ends up the same', 'Yes, sabzi first helps'],
    answer: 1,
    why: 'Studies have found that eating vegetables and protein before rice or roti makes sugar in the blood rise more slowly. Nothing is taken away from the plate.',
    tryThis: 'Start with a few bites of sabzi or salad, then the rice.',
    icon: 'leaf',
  },
  {
    id: 'walk',
    ask: 'What helps the body use a big meal?',
    options: ['A short walk after eating', 'A nap after eating'],
    answer: 0,
    why: 'Moving your legs for ten or fifteen minutes after a meal helps muscles use the sugar from it. A walk around the house or to the corner shop counts.',
    tryThis: 'Walk for ten minutes after dinner, maybe with someone on the phone.',
    icon: 'walk',
  },
  {
    id: 'chai',
    ask: 'Two cups of chai a day, two spoons of sugar each. How much sugar is that in a week?',
    options: ['About 7 spoons', 'About 28 spoons'],
    answer: 1,
    why: 'Twenty eight spoons, more than half a cup of sugar every week, just from chai. Going from two spoons to one halves it, and most people stop noticing in a week or two.',
    tryThis: 'Make one cup a day with one spoon instead of two.',
    icon: 'cafe',
  },
  {
    id: 'plate',
    ask: 'What does a balanced plate look like with your hands?',
    options: ['Two handfuls of veg, a fist of rice, a palm of protein', 'Three fists of rice and some dal'],
    answer: 0,
    why: 'Half the plate vegetables, a quarter grains, a quarter protein. It is the same food you already cook, in different amounts.',
    tryThis: 'Serve the sabzi first, then fill in the rest.',
    icon: 'restaurant',
  },
  {
    id: 'fruit',
    ask: 'Which is kinder to the body: a mango, or a glass of mango juice?',
    options: ['The juice', 'The whole mango'],
    answer: 1,
    why: 'The whole fruit keeps its fibre, which slows the sugar down and fills you up. A glass of juice can hold the sugar of three or four fruits.',
    tryThis: 'Eat fruit whole and save juice for special days.',
    icon: 'nutrition',
  },
  {
    id: 'slow',
    ask: 'How long does it take for better eating to show in a check up?',
    options: ['A few days', 'A few months'],
    answer: 1,
    why: 'Most blood tests at the doctor look back over about three months. That is why Amader rewards every single day: the body notices long before the numbers do.',
    tryThis: 'Keep your streak going. Every day counts, even the boring ones.',
    icon: 'time',
  },
  {
    id: 'iftar',
    ask: 'What is a gentle way to open a fast?',
    options: ['Dates and water, then a pause before the meal', 'Straight to pakoras and sweets'],
    answer: 0,
    why: 'After a long fast the body takes in sugar quickly. A date and water, a short pause for prayer, then the meal, is easier on it than a rush of fried food.',
    tryThis: 'Open with one or two dates and water, then wait a few minutes.',
    icon: 'moon',
    ramadan: true,
  },
  {
    id: 'suhoor',
    ask: 'Which suhoor keeps you full for longer?',
    options: ['Paratha and sweet chai', 'Eggs, yoghurt and a roti'],
    answer: 1,
    why: 'Protein and slower grains are digested over many hours, so the day of fasting feels easier and the iftar hunger is smaller.',
    tryThis: 'Add an egg or a bowl of yoghurt to suhoor.',
    icon: 'sunny',
    ramadan: true,
  },
];

export const LEARN_NOTE = 'Short, general ideas about everyday eating. Not medical advice. Ask your doctor what is right for you.';
