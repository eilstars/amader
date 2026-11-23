"""
Builds src/data/foods.json from USDA FoodData Central survey foods (FNDDS), which are public domain (CC0).

  1. Download "Food and Nutrient Database for Dietary Studies" CSV from https://fdc.nal.usda.gov/download-datasets
  2. python3 tools/build-foods.py <unzipped folder> src/data/foods.json

Each row: [name, kcal, carbs g, fiber g, sugar g, protein g, fat g, sodium mg (all per 100 g), grams in 1 cup, grams in 1 piece, source]
source 0 = a USDA food as named there, 1 = a USDA food under the name families use, 2 = a home recipe built from USDA foods.
Family names come first, so search finds "Roti" before "Bread, chappatti or roti".
"""
import csv, json, re, sys

src, out = sys.argv[1], sys.argv[2]
# FNDDS lists nutrients by their old SR numbers: 208 energy, 205 carbs, 291 fiber, 269 sugars, 203 protein, 204 fat, 307 sodium.
NUT = {'208': 0, '205': 1, '291': 2, '269': 3, '203': 4, '204': 5, '307': 6}
SKIP_CATS = {'7702', '7704', '7804', '9002', '9004', '9006', '9007', '9008', '9010', '9012', '9202', '9204', '9402', '9404', '9602'}

foods = {}
for r in csv.DictReader(open(f'{src}/food.csv', encoding='utf-8')):
    if r['food_category_id'] in SKIP_CATS or re.search(r'\bbaby\b|toddler|infant', r['description'], re.I):
        continue
    foods[r['fdc_id']] = {'desc': r['description'], 'n': [0.0] * 7, 'cup': 0.0, 'piece': 0.0}

for r in csv.DictReader(open(f'{src}/food_nutrient.csv', encoding='utf-8')):
    f = foods.get(r['fdc_id'])
    if f and r['nutrient_id'] in NUT and r['amount']:
        f['n'][NUT[r['nutrient_id']]] = float(r['amount'])

# For "pieces", the most everyday single item wins: a medium mango over a slice of one.
PIECES = ['medium', 'roti', 'naan', 'paratha', 'puri', 'samosa', 'idli', 'dosa', 'egg', 'regular', 'fruit', 'date', 'cookie', 'doughnut', 'bar', 'patty', 'piece', 'small', 'slice']
PIECE = re.compile(r'^1 (' + '|'.join(PIECES) + r')\b', re.I)
for r in csv.DictReader(open(f'{src}/food_portion.csv', encoding='utf-8')):
    f = foods.get(r['fdc_id'])
    if not f or not r['gram_weight']:
        continue
    g, d = float(r['gram_weight']), r['portion_description'].strip()
    if g <= 0:
        continue
    if not f['cup'] and re.match(r'^1 cup\b', d) and 'fl oz' not in d:
        f['cup'] = g
    # USDA's "Quantity not specified" is the usual single serving, the best guess for "one piece".
    first = f['desc'].split(',')[0].split(' ')[0].lower()
    m = PIECE.match(d)
    if d == 'Quantity not specified' or d.lower() == f'1 {first}':
        rank = -1
    elif m:
        rank = PIECES.index(m.group(1).lower())
    else:
        continue
    if rank < f.get('rank', 99):
        f['piece'], f['rank'] = g, rank

by_desc = {f['desc'].lower(): f for f in foods.values()}

def get(desc):
    f = by_desc.get(desc.lower())
    if not f:
        sys.exit(f'Missing USDA food: {desc}')
    return f

def row(name, f, source):
    n = [round(x, 1) for x in f['n']]
    n[6] = round(f['n'][6])
    return [name, *n, round(f['cup']), round(f['piece']), source]

def blend(name, parts, cup=240, piece=0):
    """A home recipe by weight: [(USDA name, grams), ...]. Nutrients per 100 g of the mix."""
    total = sum(g for _, g in parts)
    n = [0.0] * 7
    for desc, g in parts:
        for i, x in enumerate(get(desc)['n']):
            n[i] += x * g / total
    return row(name, {'n': n, 'cup': cup, 'piece': piece}, 2)

# Names families use, pointing at the closest USDA food.
ALIASES = [
    ('Rice', 'Rice, white, cooked, no added fat'), ('White rice', 'Rice, white, cooked, no added fat'),
    ('Brown rice', 'Rice, brown, cooked, no added fat'), ('Roti', 'Bread, chappatti or roti'), ('Chapati', 'Bread, chappatti or roti'),
    ('Naan', 'Bread, naan'), ('Paratha', 'Bread, paratha'), ('Puri', 'Bread, puri'), ('Biryani', 'Biryani with chicken'),
    ('Chicken biryani', 'Biryani with chicken'), ('Mutton biryani', 'Biryani with meat'), ('Veg biryani', 'Biryani with vegetables'),
    ('Pulao', 'Rice pilaf'), ('Khichdi', 'Rice, white, with lentils, NS as to fat'), ('Khichuri', 'Rice, white, with lentils, NS as to fat'),
    ('Fried rice', 'Rice, fried, NFS'), ('Idli', 'Idli'), ('Dosa', 'Dosa, plain'), ('Upma', 'Upma'), ('Pasta', 'Pasta, cooked'),
    ('Bread', 'Bread, white'), ('Brown bread', 'Bread, whole wheat'),
    ('Dal', 'Dal'), ('Daal', 'Dal'), ('Masoor dal', 'Dal'), ('Moong dal', 'Mung beans, cooked'), ('Lentil curry', 'Lentil curry'),
    ('Chana', 'Chickpeas, from dried, fat added'), ('Chana masala', 'Chickpeas, from dried, fat added'), ('Chole', 'Chickpeas, from dried, fat added'),
    ('Rajma', 'Kidney beans, from dried, fat added'), ('Sambar', 'Sambar, vegetable stew'),
    ('Chicken curry', 'Chicken curry'), ('Fish curry', 'Fish curry'), ('Beef curry', 'Beef curry'), ('Mutton curry', 'Lamb or mutton with gravy'),
    ('Goat curry', 'Goat'), ('Lamb curry', 'Lamb or mutton with gravy'), ('Prawn curry', 'Fish curry'), ('Shrimp curry', 'Fish curry'),
    ('Fried fish', 'Fish, NS as to type, fried'), ('Grilled chicken', 'Chicken, NS as to part, grilled without sauce, skin not eaten'),
    ('Kebab', 'Lamb shish kabob with vegetables, excluding potatoes'), ('Chicken kebab', 'Chicken or turkey shish kabob with vegetables, excluding potatoes'),
    ('Egg', 'Egg, whole, boiled or poached'), ('Boiled egg', 'Egg, whole, boiled or poached'), ('Fried egg', 'Egg, whole, fried with oil'),
    ('Omelette', 'Egg omelet or scrambled egg, made with oil'), ('Paneer', 'Cheese, paneer'),
    ('Sabzi', 'Classic mixed vegetables, cooked, from restaurant'), ('Mixed vegetables', 'Classic mixed vegetables, cooked, from restaurant'),
    ('Shak', 'Spinach, fresh, cooked with oil'), ('Saag', 'Spinach, fresh, cooked with oil'), ('Palak', 'Spinach, fresh, cooked with oil'),
    ('Bhindi', 'Okra, fresh, cooked, fat added'), ('Okra', 'Okra, fresh, cooked, fat added'), ('Begun bhaja', 'Eggplant, cooked, fat added'),
    ('Baingan', 'Eggplant, cooked, fat added'), ('Aloo', 'Potato, home fries, from fresh'), ('Aloo bhaja', 'Potato, home fries, from fresh'),
    ('Mashed potato', 'Potato, mashed, NFS'), ('Salad', 'Lettuce, salad with assorted vegetables including tomatoes and/or carrots, no dressing'),
    ('Samosa', 'Samosa'), ('Pakora', 'Pakora'), ('Yoghurt', 'Yogurt, whole milk, plain'), ('Dahi', 'Yogurt, whole milk, plain'),
    ('Doi', 'Yogurt, whole milk, plain'), ('Milk', 'Milk, whole'), ('Tea', 'Tea, hot, leaf, black'), ('Coffee', 'Coffee, brewed'),
    ('Kheer', 'Pudding, rice'), ('Payesh', 'Pudding, rice'), ('Fruit', 'Apple, raw'), ('Apple', 'Apple, raw'), ('Banana', 'Banana, raw'),
    ('Mango', 'Mango, raw'), ('Orange', 'Orange, raw'), ('Guava', 'Guava, raw'), ('Papaya', 'Papaya, raw'), ('Grapes', 'Grapes, raw'),
    ('Dates', 'Date'), ('Cake', 'Cake or cupcake, NFS'), ('Biscuit', 'Cookie, NFS'), ('Ice cream', 'Ice cream, NFS'), ('Smoothie', 'Fruit smoothie, NFS'),
]

rows, seen = [], set()
for name, desc in ALIASES:
    rows.append(row(name, get(desc), 1))
    seen.add(name.lower())

# Home recipes USDA doesn't list, made from USDA foods by weight.
for r in [
    blend('Chai', [('Tea, hot, leaf, black', 150), ('Milk, whole', 80), ('Sugar, white, granulated or lump', 10)]),
    blend('Lassi', [('Yogurt, whole milk, plain', 150), ('Milk, whole', 70), ('Sugar, white, granulated or lump', 15)]),
    blend('Raita', [('Yogurt, whole milk, plain', 160), ('Cucumber, raw', 70)], cup=230),
]:
    rows.append(r)
    seen.add(r[0].lower())

def clean(desc):
    d = re.sub(r',? (NS as to [^,]+|NFS|NS)\b', '', desc)
    d = re.sub(r'\s*\([^)]*\)', '', d)
    return d.strip(' ,')[:60]

for f in sorted(foods.values(), key=lambda f: len(f['desc'])):
    name = clean(f['desc'])
    if name.lower() in seen:
        continue
    seen.add(name.lower())
    rows.append(row(name, f, 0))

json.dump({'source': 'USDA FoodData Central, FNDDS 2021-2023 (released 2024-10-31). Public domain.', 'rows': rows}, open(out, 'w'), separators=(',', ':'), ensure_ascii=False)
print(len(rows), 'foods')
