#!/usr/bin/env node
/**
 * Photo check: how well does Mado guess the starch and the amount on real plates?
 *
 * Runs your labelled photos through the same deployed "recognize-meal" function the app uses,
 * so it tests exactly what families will see. No Anthropic key is needed on your computer.
 *
 * 1. Put 20 to 30 JPEG photos of real plates in one folder (Android photos are JPEG; on iPhone,
 *    send them to yourself on WhatsApp or set Camera > Formats > Most Compatible).
 * 2. In the same folder make labels.csv, one line per photo, with what was really on the plate:
 *
 *      file,starch,amount
 *      dinner1.jpg,rice,2.5
 *      lunch2.jpg,roti,2
 *      breakfast.jpg,bread,1
 *      salad.jpg,none,0
 *
 *    starch is one of rice, roti, bread, noodles, potato, other, none.
 *    amount is in handfuls for rice, noodles, potato and other; pieces for roti; slices for bread. Halves are fine.
 * 3. Run it with the app's two public Supabase values (the same ones in .env):
 *
 *      EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... node tools/photo-check.mjs path/to/folder
 *
 * It makes a throwaway "Photo check" family to sign in with (the function only reads photos for people
 * with a seat), sends each photo, then prints each guess and a score, and writes results.csv in the folder.
 * The function allows 30 photos per person per day, so use at most 30 photos a run.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { Jimp } from 'jimp';

const STARCHES = ['rice', 'roti', 'bread', 'noodles', 'potato', 'other', 'none'];

function fail(message) {
  console.error(message);
  process.exit(1);
}

const folder = process.argv[2] ? resolve(process.argv[2]) : fail('Give the folder of photos: node tools/photo-check.mjs path/to/folder');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) fail('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (the same values the app uses).');

const csv = await readFile(join(folder, 'labels.csv'), 'utf8').catch(() => fail(`No labels.csv in ${folder}.`));
const labels = csv
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !/^file\s*,/i.test(line))
  .map((line, i) => {
    const [file, starch, amount] = line.split(',').map((s) => s.trim());
    const s = (starch ?? '').toLowerCase();
    const n = Number(amount);
    if (!file || !STARCHES.includes(s) || !Number.isFinite(n)) fail(`labels.csv line ${i + 2} should look like: photo.jpg,rice,2.5`);
    return { file, starch: s, amount: n };
  });
if (!labels.length) fail('labels.csv has no photos in it.');
if (labels.length > 30) fail('Use at most 30 photos a run (the daily limit per person).');

// The same shrink the app does before sending: at most 1000 pixels on the long side, JPEG.
async function photoBase64(file) {
  const img = await Jimp.read(join(folder, file));
  img.scaleToFit({ w: 1000, h: 1000 });
  const buf = await img.getBuffer('image/jpeg', { quality: 70 });
  return buf.toString('base64');
}

const db = createClient(url, key, { auth: { persistSession: false } });
const signIn = await db.auth.signInAnonymously();
if (signIn.error) fail(`Could not sign in: ${signIn.error.message}. Is anonymous sign-in on in Supabase?`);
const fam = await db.rpc('create_family', { p_my_name: 'Photo check', p_parent_name: 'Plate', p_goal_food: 'Rice', p_goal_handfuls: 2 });
if (fam.error) fail(`Could not make the test family: ${fam.error.message}`);

const rows = [];
for (const label of labels) {
  let guess = null;
  let note = '';
  try {
    const image = await photoBase64(label.file);
    const { data, error } = await db.functions.invoke('recognize-meal', { body: { image, goal_food: 'Rice', unit: 'handfuls', party: false } });
    if (error) note = error.message;
    else if (data?.limit) note = 'daily limit reached';
    else guess = data?.guess ?? null;
    if (!guess && !note) note = 'no guess (not food, or too unclear)';
  } catch (e) {
    note = e instanceof Error ? e.message : String(e);
  }
  const gStarch = guess?.starch ? String(guess.starch).toLowerCase() : null;
  const gAmount = typeof guess?.starchAmount === 'number' ? guess.starchAmount : null;
  const starchRight = gStarch === label.starch;
  const off = gAmount === null ? null : Math.abs(gAmount - label.amount);
  rows.push({ ...label, gStarch, gAmount, starchRight, off, note, dish: guess?.dish ?? '' });
  console.log(
    `${label.file.padEnd(24)} real ${label.starch} ${label.amount}  guess ${gStarch ?? '-'} ${gAmount ?? '-'}  ${starchRight ? 'starch right' : 'starch WRONG'}${off !== null ? `, off by ${off}` : ''}${note ? `  (${note})` : ''}`,
  );
}

const read = rows.filter((r) => r.gStarch !== null);
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '-');
const sameStarch = read.filter((r) => r.starchRight && r.off !== null);
const within = (x) => sameStarch.filter((r) => r.off <= x).length;
const meanOff = sameStarch.length ? sameStarch.reduce((a, r) => a + r.off, 0) / sameStarch.length : null;
const over = sameStarch.filter((r) => r.gAmount > r.amount).length;
const under = sameStarch.filter((r) => r.gAmount < r.amount).length;

console.log('\nScore');
console.log(`  Photos read:                    ${read.length} of ${rows.length}`);
console.log(`  Right starch:                   ${pct(read.filter((r) => r.starchRight).length, read.length)}`);
console.log(`  Amount exactly right:           ${pct(within(0), sameStarch.length)}  (of photos with the right starch)`);
console.log(`  Amount within a half:           ${pct(within(0.5), sameStarch.length)}`);
console.log(`  Amount within one:              ${pct(within(1), sameStarch.length)}`);
console.log(`  Average amount off by:          ${meanOff === null ? '-' : meanOff.toFixed(2)}`);
console.log(`  Guessed too much / too little:  ${over} / ${under}`);
console.log('\nA useful bar for the pilot: right starch 90% or more, and amount within a half on 70% or more.');
console.log('Below that, families will fix most guesses by hand, which is fine but makes the photo slower than a tap.');

const out = [
  'file,real_starch,real_amount,guess_starch,guess_amount,starch_right,off_by,dish,note',
  ...rows.map((r) => [r.file, r.starch, r.amount, r.gStarch ?? '', r.gAmount ?? '', r.starchRight, r.off ?? '', `"${r.dish.replace(/"/g, "'")}"`, `"${r.note.replace(/"/g, "'")}"`].join(',')),
].join('\n');
await writeFile(join(folder, 'results.csv'), out + '\n');
console.log(`\nWrote ${join(folder, 'results.csv')}`);

// Leave the throwaway family so it does not sit in the database.
await db.rpc('delete_me', { p_member: fam.data.me_id }).then(
  () => undefined,
  () => undefined,
);
