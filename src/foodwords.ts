/**
 * How families actually name food. Turns "macher jhol", "murgir tarkari" or "bhat" into words the food
 * database knows ("fish curry", "chicken curry", "rice"), and splits a typed line into dishes.
 * Bangla, Hindi and Urdu spellings vary a lot, so each word lists the common ones.
 */

// Whole phrases first: these mean something different from their words.
const PHRASES: [RegExp, string][] = [
  [/\bbutter chicken\b|\bmurgh makhani\b/g, 'chicken curry'],
  [/\b(chicken )?tikka masala\b/g, 'chicken curry'],
  [/\b(tandoori|tikka|grilled|roast(ed)?) (chicken|murgh?)\b|\bchicken (tikka|tandoori)\b/g, 'grilled chicken'],
  [/\b(dim|deem|anda|ande|egg) (bhaji|bhaja|fry|fried)\b/g, 'fried egg'],
  [/\b(mishti|misti) (doi|dohi|dahi)\b/g, 'mishti doi'],
  [/\b(alu|aloo|aaloo) (bhaji|bhaja|fry)\b/g, 'aloo bhaja'],
  [/\b(begun|baingan|brinjal) (bhaji|bhaja|fry)\b/g, 'begun bhaja'],
  [/\b(alu|aloo|aaloo) (bhorta|bharta|bhortha)\b/g, 'aloo bhorta'],
  [/\b(begun|baingan|brinjal) (bhorta|bharta|bhortha)\b/g, 'begun bhorta'],
  [/\b(alu|aloo|aaloo) (gobi|gobhi|phulkopi|fulkopi)\b/g, 'aloo gobi'],
  [/\b(palak|saag|sag) paneer\b/g, 'palak paneer'],
  [/\bbanh mi\b/g, 'sandwich'],
  [/\bmapo tofu\b/g, 'tofu'],
  [/\bmenudo\b/g, 'beef soup'],
  [/\b(sinigang|egusi|pepper soup|tinola|nilaga)\b( soup)?/g, 'soup'],
];

// One word at a time: spelling → the database's word. Empty string drops the word.
const WORDS: Record<string, string> = {};
const say = (to: string, ...from: string[]) => from.forEach((w) => (WORDS[w] = to));
say('rice', 'bhat', 'bhaat', 'bhath', 'chawal', 'chaval', 'chawl', 'bhat er');
say('roti', 'ruti', 'rooti', 'chapathi', 'phulka', 'rotis', 'rutis');
say('dal', 'daal', 'dahl', 'dhal', 'dali', 'dail', 'lentils', 'lentil');
say('fish', 'mach', 'machh', 'maach', 'macher', 'machher', 'maacher', 'ilish', 'hilsa', 'rui', 'rohu', 'pabda', 'koi', 'katla', 'tilapia', 'pomfret', 'boal', 'shing', 'magur', 'telapia', 'fishes');
say('chicken', 'murgi', 'murgir', 'murg', 'murgh', 'murghi');
say('beef', 'gorur', 'gorur gosto');
say('mutton', 'khashi', 'khasi', 'khasir', 'gosht', 'gosto', 'mangsho', 'mangso', 'lamb', 'goat', 'bakri');
say('egg', 'dim', 'deem', 'anda', 'ande', 'eggs');
say('prawn', 'chingri', 'jhinga', 'shrimp', 'prawns');
say('curry', 'jhol', 'tarkari', 'torkari', 'bhuna', 'korma', 'masala', 'salan', 'jhal', 'kalia', 'rezala', 'dopiaza', 'gravy', 'curries', 'kosha', 'kasha');
say('sabzi', 'sobji', 'shobji', 'sabji', 'sobzi', 'subji', 'vegetables', 'veggies', 'veg');
say('shak', 'saag', 'sag', 'shaak', 'palong');
say('potato', 'alu', 'aloo', 'aaloo', 'potatoes');
say('chai', 'cha', 'tea');
say('yoghurt', 'doi', 'dahi', 'dohi', 'yogurt');
say('payesh', 'payash', 'kheer', 'khir');
say('pulao', 'polao', 'pilau', 'pilaf', 'pulav');
say('khichuri', 'khichdi', 'kichuri', 'khichri');
say('samosa', 'singara', 'shingara', 'samosas');
say('chana', 'chola', 'chole', 'chhola', 'cholar', 'chickpeas');
say('puri', 'bhature', 'luchi', 'poori');
say('paratha', 'porota', 'parota', 'parotha', 'paratha s');
say('biryani', 'biriyani', 'biriani', 'tehari');
say('upma', 'poha', 'chira', 'chura');
say('cauliflower', 'gobi', 'gobhi', 'phulkopi', 'fulkopi');
say('bhindi', 'dherosh', 'dheros', 'okra');
say('biscuits', 'biscuit', 'cookies', 'cookie');
// Spanish, Tagalog and others, for families beyond South Asia.
say('rice', 'arroz', 'kanin', 'fan');
say('chicken', 'pollo', 'manok', 'poulet');
say('beef', 'carne', 'res', 'asada');
say('pork', 'cerdo', 'puerco', 'baboy', 'carnitas', 'lechon');
say('fish', 'pescado', 'isda', 'poisson');
say('egg', 'huevo', 'huevos', 'itlog');
say('beans', 'frijoles', 'habichuelas', 'bean', 'pinto', 'rajmah');
say('plantain', 'platano', 'platanos', 'maduros', 'tostones', 'plantains');
say('cheese', 'queso');
say('soup', 'sopa', 'caldo', 'sabaw');
say('salad', 'ensalada');
say('congee', 'jook', 'juk', 'lugaw', 'arroz caldo');
say('kebab', 'kofta', 'kafta', 'kabob', 'kabab', 'seekh');
say('grilled', 'jerk', 'tandoori', 'tikka', 'asado', 'bbq', 'barbecue');
say('', 'con', 'de', 'la', 'el', 'y', 'homemade', 'home', 'made', 'leftover', 'leftovers', 'some', 'little', 'bit', 'of', 'the', 'a', 'my', 'fresh', 'plain', 'dish', 'bowl', 'plate');

const PROTEINS = ['fish', 'chicken', 'beef', 'mutton', 'egg', 'prawn', 'dal', 'chana'];

/** "Macher jhol" → "fish curry"; "murgir tarkari" → "chicken curry"; "bhat" → "rice". */
export function normalizeDish(name: string): string {
  let s = ` ${name.toLowerCase().replace(/[^a-z' ]+/g, ' ')} `;
  s = s.replace(/\b\w+'s\b/g, ' '); // "Nani's khichuri" → "khichuri"
  for (const [re, to] of PHRASES) s = s.replace(re, to);
  const words = s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w in WORDS ? WORDS[w] : w))
    .filter(Boolean);
  const out = words.filter((w, i) => w !== words[i - 1]);
  // A protein cooked as a curry reads as that curry, whatever the words around it.
  if (out.includes('curry')) {
    const p = PROTEINS.find((x) => out.includes(x));
    if (p) return p === 'dal' ? 'lentil curry' : p === 'chana' ? 'chana masala' : `${p} curry`;
  }
  return out.join(' ');
}

// Pairs people say as one breath but are two dishes on the plate.
const PAIRS: [RegExp, string[]][] = [
  [/^(dal|daal|dahl) (bhat|bhaat|chawal|chaval|rice)$/i, ['Dal', 'Rice']],
  [/^(rajma) (chawal|chaval|rice)$/i, ['Rajma', 'Rice']],
  [/^(chole|chola|chhola) (bhature|puri|luchi)$/i, ['Chole', 'Puri']],
  [/^(puri|luchi) (sabzi|sabji|sobji|aloo|alu)$/i, ['Puri', 'Sabzi']],
  [/^(roti|ruti) (sabzi|sabji|sobji)$/i, ['Roti', 'Sabzi']],
  [/^(khichuri|khichdi) (dim|egg|anda)$/i, ['Khichuri', 'Egg']],
];

/** "Rice, dal and fish curry" or "dal bhat" → separate dishes. A single dish comes back as one. */
export function splitDishes(line: string, isDish?: (name: string) => boolean): string[] {
  // "Mac and cheese", "rice and peas", "fish and chips" are one dish: keep a line the database knows whole.
  const whole = line.trim().replace(/\s+/g, ' ');
  if (isDish && !/,/.test(whole) && isDish(whole)) return [whole.charAt(0).toUpperCase() + whole.slice(1)];
  const parts = line
    .split(/,|\band\b|\bwith\b|&|\+|\/|\bar\b|\baur\b/i)
    .map((p) => p.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const pair = PAIRS.find(([re]) => re.test(p));
    if (pair) out.push(...pair[1]);
    else out.push(p.charAt(0).toUpperCase() + p.slice(1));
  }
  return out.slice(0, 8);
}
