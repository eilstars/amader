/**
 * Learning as a card game. Each card asks first, so people come to the idea themselves
 * ("you need to understand", not "you need to change"). Then it says, honestly and briefly,
 * what is at stake, and one small thing that helps. Short on purpose. Not medical advice.
 */
export interface Lesson {
  id: string;
  /** The question on the front of the card. Twelve words or fewer. */
  ask: string;
  /** Two or three answers to tap. */
  options: string[];
  /** Index of the answer that fits best. */
  answer: number;
  /** The answer explained, in one or two short sentences. */
  why: string;
  /** What it means for the people you love. Honest, never a threat. */
  stake?: string;
  /** One small thing to try. */
  tryThis: string;
  icon: string;
  /** Only shown in Ramadan mode. */
  ramadan?: boolean;
}

export const LESSONS: Lesson[] = [
  {
    id: 'hidden',
    ask: 'How many US adults have prediabetes or diabetes?',
    options: ['About 1 in 20', 'About 1 in 10', 'More than 1 in 3'],
    answer: 2,
    why: 'More than 1 in 3. Most people with prediabetes do not know they have it, because it feels like nothing.',
    stake: 'Feeling fine is not the same as being fine.',
    tryThis: 'Ask your doctor about a blood sugar test at your next checkup.',
    icon: 'eye-off',
  },
  {
    id: 'half',
    ask: 'Can small changes stop prediabetes becoming diabetes?',
    options: ['No, it is in the genes', 'Yes, often'],
    answer: 1,
    why: 'In a large US study, eating differently, losing a little weight and walking 30 minutes most days cut the chance by more than half. For people over 60, by about 70%.',
    stake: 'This is one of the few health stories where small habits win.',
    tryThis: 'A 10 minute walk after one meal a day.',
    icon: 'trending-down',
  },
  {
    id: 'takes',
    ask: 'Diabetes is a leading cause of which of these?',
    options: ['Losing eyesight', 'Kidney failure', 'All of these, and losing a foot'],
    answer: 2,
    why: 'All of them. It works quietly over years, which is why the habits matter now and not later.',
    stake: 'The things it takes are the things you need to hold a grandchild, drive to a wedding, cook for everyone.',
    tryThis: 'Share one plate today. Noticing is where it starts.',
    icon: 'heart-half',
  },
  {
    id: 'kids',
    ask: 'Whose eating do children copy most?',
    options: ['Their friends', 'Their parents', 'TV adverts'],
    answer: 1,
    why: 'Studies keep finding that children eat a lot like the adults at home. The plate you fill is a lesson they learn.',
    stake: 'Your habits become theirs, and their children\'s.',
    tryThis: 'Put the vegetables on the table first tonight.',
    icon: 'people',
  },
  {
    id: 'southasian',
    ask: 'In a US study of South Asian adults over 40, how many had diabetes?',
    options: ['About 1 in 20', 'About 1 in 4'],
    answer: 1,
    why: 'About 1 in 4, several times the rate for white Americans. Many felt completely fine.',
    tryThis: 'If this is your family, a blood sugar test is worth asking for.',
    icon: 'globe',
  },
  {
    id: 'fist',
    ask: 'How much cooked rice or pasta fits in your fist?',
    options: ['About half a cup', 'About two cups'],
    answer: 0,
    why: 'About half a cup. Your fist is a ruler you always carry. Most home plates hold three or four.',
    tryThis: 'Tonight, count the rice in fists. No need to change it yet.',
    icon: 'hand-left',
  },
  {
    id: 'order',
    ask: 'Same plate. Does the order you eat it in matter?',
    options: ['No', 'Yes, vegetables first helps'],
    answer: 1,
    why: 'Eating vegetables and protein before the rice or bread makes blood sugar rise more slowly. Nothing is taken away.',
    tryThis: 'Start with a few bites of vegetables or salad.',
    icon: 'leaf',
  },
  {
    id: 'walk',
    ask: 'After a big meal, which helps the body more?',
    options: ['A short walk', 'A nap'],
    answer: 0,
    why: 'Ten or fifteen minutes of walking helps muscles use the sugar from the meal. Around the house counts.',
    tryThis: 'Walk ten minutes after dinner, maybe on the phone with family.',
    icon: 'walk',
  },
  {
    id: 'soda',
    ask: 'How many teaspoons of sugar are in one can of soda?',
    options: ['About 2', 'About 10'],
    answer: 1,
    why: 'About 10. Sweet drinks are the fastest sugar there is, because nothing slows them down.',
    tryThis: 'Swap one sweet drink this week for water or tea.',
    icon: 'cube',
  },
  {
    id: 'tea',
    ask: 'Two sweet teas a day, two spoons each. Sugar per week?',
    options: ['About 7 spoons', 'About 28 spoons'],
    answer: 1,
    why: 'Twenty eight spoons, more than half a cup. One spoon instead of two halves it, and most people stop noticing in a couple of weeks.',
    tryThis: 'Make one cup a day with one spoon less.',
    icon: 'cafe',
  },
  {
    id: 'fruit',
    ask: 'Which is kinder to the body?',
    options: ['A glass of juice', 'The whole fruit'],
    answer: 1,
    why: 'Whole fruit keeps its fibre, which slows the sugar and fills you up. One glass of juice can hold three or four fruits of sugar.',
    tryThis: 'Eat fruit whole. Keep juice for special days.',
    icon: 'nutrition',
  },
  {
    id: 'slow',
    ask: 'How long before better eating shows in a check up?',
    options: ['A few days', 'A few months'],
    answer: 1,
    why: 'Most blood tests look back about three months. Your body notices long before the numbers do, so every day counts.',
    tryThis: 'Keep your streak going, even on boring days.',
    icon: 'time',
  },
  {
    id: 'iftar',
    ask: 'What is a gentle way to open a fast?',
    options: ['Dates and water, then a pause', 'Straight to fried food and sweets'],
    answer: 0,
    why: 'After a long fast the body takes in sugar quickly. A date, water and a short pause are easier on it.',
    tryThis: 'Open with one or two dates and water, then wait a few minutes.',
    icon: 'moon',
    ramadan: true,
  },
  {
    id: 'suhoor',
    ask: 'Which suhoor keeps you full for longer?',
    options: ['Paratha and sweet tea', 'Eggs, yoghurt and a roti'],
    answer: 1,
    why: 'Protein and slower grains are digested over many hours, so the fast feels easier.',
    tryThis: 'Add an egg or yoghurt to suhoor.',
    icon: 'sunny',
    ramadan: true,
  },
];

/** The reasons people give for wanting to stay healthy. Tapping one keeps it on their Learn page. */
export const MY_REASONS = ['Play with my grandkids', 'Be at my kids\' weddings', 'Travel with my family', 'Stay independent', 'Keep cooking for everyone'];

/** What a caregiver can tell the person they look after. Sent as a note. */
export const THEIR_REASONS = ['I want you at my wedding', 'I want my kids to know you', 'I need you around for a long time', 'I want to travel with you'];

export const LEVELS = [
  { at: 0, name: 'Curious' },
  { at: 30, name: 'Noticer' },
  { at: 80, name: 'Plate Pro' },
  { at: 150, name: 'Habit Builder' },
  { at: 250, name: 'Table Teacher' },
];

export const LEARN_NOTE = 'General ideas about everyday eating, not medical advice. Ask your doctor what is right for you.';
