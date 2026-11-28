import { Meal, Member } from './types';
import { isBalanced, plateAverage } from './game';
import { dateText, handsText, plateLine, slotName, startOfDay, timeText } from './words';
import { amountText } from './dishes';
import { FOOD_SOURCE, Nutrients, estimate } from './foods';
import { doctorRows, doctorSummary } from './starch';

const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Only photos that a PDF can show: links to the family's private storage, or photos kept inside the app. */
const printable = (uri: string | null | undefined) => !!uri && (/^https:\/\//.test(uri) || /^data:image\/(jpeg|png);base64,/.test(uri));

export interface SummaryInput {
  me: Member;
  meals: Meal[];
  since: Date;
  now: Date;
  grain: string;
  checkup: Date | null;
}

/**
 * The doctor summary: a plain log of what one person ate, as a printable page.
 * No readings, no scores, no advice. Portions are hand measures, which the page says.
 * The rough nutrition estimate lives only here, for the doctor; the app never shows numbers to the family.
 */
export function summaryHtml({ me, meals, since, now, grain, checkup }: SummaryInput): string {
  const real = meals.filter((m) => m.slot !== 'fasting');
  const days = new Set(meals.map((m) => new Date(m.date).toDateString())).size;
  const span = Math.max(1, Math.floor((now.getTime() - since.getTime()) / 86_400_000));
  const avg = plateAverage(real);
  const fasting = meals.filter((m) => m.slot === 'fasting').length;
  const snacks = real.filter((m) => m.slot === 'snack').length;
  const together = real.filter((m) => (m.withIds?.length ?? 0) > 0 || m.withOthers).length;
  const party = real.filter((m) => m.party).length;

  const rows: [string, string][] = [
    ['Meals shared', String(real.length)],
    ['Days with something logged', `${days} of ${span}`],
    ['Snacks', String(snacks)],
    ['Fasting days', String(fasting)],
    ['Meals eaten with others', String(together)],
    ['Party or buffet plates', String(party)],
    [`Usual ${grain.toLowerCase()} or grains`, avg.counted ? `${handsText(avg.grains, 'fist', 'fists')} a meal` : 'Not recorded'],
    ['Usual protein', avg.counted ? `${handsText(avg.protein, 'palm', 'palms')} a meal` : 'Not recorded'],
    ['Usual vegetables', avg.counted ? `${handsText(avg.veg, 'handful', 'handfuls')} a meal` : 'Not recorded'],
    ['Meals with fruit', String(real.filter((m) => (m.fruit ?? 0) > 0).length)],
    ['Meals with milk or yoghurt', String(real.filter((m) => (m.dairy ?? 0) > 0).length)],
    ['Plates with half vegetables and some protein', avg.counted ? `${real.filter(isBalanced).length} of ${avg.counted}` : 'Not recorded'],
  ];

  // The dishes eaten most often, the way the family named them.
  const counts = new Map<string, number>();
  real.forEach((m) => (m.items ?? []).forEach((i) => counts.set(i.name, (counts.get(i.name) ?? 0) + 1)));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  // A month-style calendar: each day lists what was eaten, so a doctor can see the pattern at a glance.
  const first = startOfDay(since);
  const monday = new Date(first);
  monday.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const weeks: Date[][] = [];
  for (let d = new Date(monday); d <= now; ) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    weeks.push(week);
  }
  const cell = (d: Date) => {
    if (d < first || d > now) return '<td class="off"></td>';
    const on = meals.filter((m) => new Date(m.date).toDateString() === d.toDateString()).sort((a, b) => (a.date < b.date ? -1 : 1));
    const lines = on.map((m) => `<div><b>${esc(m.slot === 'suhoor' || m.slot === 'iftar' ? slotName(m.slot) + ':' : slotName(m.slot).charAt(0))}</b> ${esc(m.slot === 'fasting' ? 'fasting' : (m.items?.length ? m.items.map((i) => i.name).join(', ') : m.dish ?? 'plate').slice(0, 40))}</div>`).join('');
    return `<td><div class="dn">${d.getDate()}</div>${lines || '<div class="muted">-</div>'}</td>`;
  };
  const calendar = `<table class="cal"><tr>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => `<th>${x}</th>`).join('')}</tr>${weeks.map((w) => `<tr>${w.map(cell).join('')}</tr>`).join('')}</table>`;

  // A rough nutrition estimate from the food database, per day. Only here, for the doctor; never shown in the app.
  const byDay = new Map<string, { date: Date; n: Nutrients; known: number; count: number }>();
  for (const m of real) {
    if (!m.items?.length) continue;
    const key = new Date(m.date).toDateString();
    const e = estimate(m.items);
    const day = byDay.get(key) ?? { date: startOfDay(new Date(m.date)), n: { kcal: 0, carbs: 0, fiber: 0, sugar: 0, protein: 0, fat: 0, sodium: 0 }, known: 0, count: 0 };
    (Object.keys(day.n) as (keyof Nutrients)[]).forEach((k) => (day.n[k] += e.total[k]));
    day.known += e.known;
    day.count += e.count;
    byDay.set(key, day);
  }
  const estDays = [...byDay.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  const estKnown = estDays.reduce((a, d) => a + d.known, 0);
  const estCount = estDays.reduce((a, d) => a + d.count, 0);
  const mean = (k: keyof Nutrients) => estDays.reduce((a, d) => a + d.n[k], 0) / Math.max(1, estDays.length);
  const r10 = (n: number) => String(Math.round(n / 10) * 10);
  const r1 = (n: number) => String(Math.round(n));
  const estimateHtml = estDays.length
    ? `<h2>Rough nutrition estimate</h2>
<table><tr><td>Days with dishes logged</td><td class="v">${estDays.length}</td></tr>
<tr><td>Calories a day, about</td><td class="v">${r10(mean('kcal'))} kcal</td></tr>
<tr><td>Carbohydrates a day, about</td><td class="v">${r1(mean('carbs'))} g</td></tr>
<tr><td>Of which sugars, about</td><td class="v">${r1(mean('sugar'))} g</td></tr>
<tr><td>Fiber a day, about</td><td class="v">${r1(mean('fiber'))} g</td></tr>
<tr><td>Protein a day, about</td><td class="v">${r1(mean('protein'))} g</td></tr>
<tr><td>Fat a day, about</td><td class="v">${r1(mean('fat'))} g</td></tr>
<tr><td>Sodium a day, about</td><td class="v">${r10(mean('sodium'))} mg</td></tr></table>
<table class="log" style="margin-top:8pt"><tr><td><b>Day</b></td><td class="v">kcal</td><td class="v">Carbs</td><td class="v">Sugars</td><td class="v">Fiber</td><td class="v">Protein</td></tr>${estDays
        .slice(0, 14)
        .map((d) => `<tr><td>${dateText(d.date)}</td><td class="v">${r10(d.n.kcal)}</td><td class="v">${r1(d.n.carbs)} g</td><td class="v">${r1(d.n.sugar)} g</td><td class="v">${r1(d.n.fiber)} g</td><td class="v">${r1(d.n.protein)} g</td></tr>`)
        .join('')}</table>
<p class="muted">Estimated from the dishes logged, using ${FOOD_SOURCE} and the hand measures the person chose. ${estKnown} of ${estCount} dishes matched a database food; home recipes vary a lot. Only meals that were logged are counted, so a day may be missing food. These are rough estimates to start a conversation, not measurements.</p>`
    : '';

  const photos = real.filter((m) => printable(m.photo)).slice(0, 12);
  const log = meals.slice(0, 60);

  return `<!doctype html><html><head><meta charset="utf-8"><title>Meal summary for ${esc(me.name)}</title>
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1D2B24; font-size: 12pt; line-height: 1.45; }
  h1 { font-size: 22pt; margin: 0 0 2pt; color: #145A41; }
  h2 { font-size: 13pt; margin: 18pt 0 6pt; color: #145A41; border-bottom: 1.5pt solid #D5DDD6; padding-bottom: 3pt; }
  .muted { color: #56675E; font-size: 10.5pt; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5pt 4pt; border-bottom: 0.5pt solid #E3E8E4; vertical-align: top; }
  td.v { text-align: right; font-weight: 600; white-space: nowrap; }
  .grid { display: flex; flex-wrap: wrap; gap: 8pt; }
  .ph { width: 30%; font-size: 9.5pt; color: #56675E; }
  .ph img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6pt; display: block; margin-bottom: 2pt; }
  .log td { font-size: 10.5pt; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { color: #1F7A5A; font-weight: 700; font-size: 14pt; }
  .cal { table-layout: fixed; }
  .cal th { font-size: 9pt; color: #56675E; text-align: left; padding: 2pt 3pt; }
  .cal td { border: 0.5pt solid #E3E8E4; height: 48pt; padding: 3pt; font-size: 7.5pt; line-height: 1.25; }
  .cal td.off { background: #F7F8F5; }
  .cal .dn { font-weight: 700; font-size: 8.5pt; color: #145A41; }
  .note { margin-top: 18pt; padding: 8pt 10pt; background: #F1F4EE; border-radius: 6pt; font-size: 10pt; color: #56675E; }
</style></head><body>
<div class="head"><div><h1>Meal summary for ${esc(me.name)}</h1>
<div class="muted">${dateText(since)} to ${dateText(now)}, ${now.getFullYear()}${checkup ? ` · for the checkup on ${dateText(checkup)}` : ''}</div></div>
<div class="brand">Amader</div></div>

<h2>At a glance</h2>
<table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join('')}</table>
<p class="muted">Portions are hand measures the person chose themselves: a fist of grains is about half a cup, a palm of protein is about 3 to 4 oz, a handful of vegetables is about one cup.</p>

<h2>Calendar</h2>
${calendar}
<p class="muted">B breakfast, L lunch, D dinner, S snack. Dishes as the person named them.</p>

${estimateHtml}

${top.length ? `<h2>Dishes eaten most</h2><table>${top.map(([n, c]) => `<tr><td>${esc(n)}</td><td class="v">${c} ${c === 1 ? 'time' : 'times'}</td></tr>`).join('')}</table>` : ''}

${photos.length ? `<h2>Recent plates</h2><div class="grid">${photos.map((m) => `<div class="ph"><img src="${esc(m.photo as string)}" alt=""><b>${dateText(new Date(m.date))}</b>, ${esc(slotName(m.slot).toLowerCase())}${m.dish ? `<br>${esc(m.dish)}` : ''}</div>`).join('')}</div>` : ''}

<h2>Meal log</h2>
<table class="log">${log
    .map((m) => {
      const what = [m.items?.length ? m.items.map((i) => `${i.name} (${amountText(i).toLowerCase()})`).join(', ') : m.dish, m.items?.length ? null : plateLine(m, grain), m.note ? `"${m.note}"` : null, m.party ? 'party plate' : null].filter(Boolean).join(' · ');
      return `<tr><td style="white-space:nowrap">${dateText(new Date(m.date))}, ${timeText(m.date)}</td><td>${esc(slotName(m.slot))}</td><td>${esc(what || '')}</td></tr>`;
    })
    .join('')}</table>
${meals.length > log.length ? `<p class="muted">Showing the newest ${log.length} of ${meals.length} entries.</p>` : ''}

<div class="note">A simple log of meals shared in the Amader app by ${esc(me.name)}. Portions are rough hand measures, not weighed amounts. Nutrition figures are rough estimates. It is not a medical record and has no readings or advice.</div>
</body></html>`;
}

/**
 * The pilot's doctor page: a plain starch log. What starch, how much in the person's own hand, by day.
 * No nutrient numbers, no scores, no advice. A short list of plain sentences on top, then the days.
 */
export function starchSummaryHtml({ me, meals, since, now, checkup }: SummaryInput): string {
  const days = Math.max(1, Math.round((startOfDay(now).getTime() - startOfDay(since).getTime()) / 86_400_000) + 1);
  const rows = doctorRows(meals, me.id, now, days);
  const lines = doctorSummary(meals, me.id, now);
  const real = meals.filter((m) => m.slot !== 'fasting');
  const photos = real.filter((m) => printable(m.photo)).slice(0, 9);
  const dayText = (key: string) => {
    const [y, mo, d] = key.split('-').map(Number);
    const date = new Date(y, mo - 1, d);
    return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]} ${dateText(date)}`;
  };
  return `<!doctype html><html><head><meta charset="utf-8"><title>Meal summary for ${esc(me.name)}</title>
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1D2B24; font-size: 12pt; line-height: 1.45; }
  h1 { font-size: 22pt; margin: 0 0 2pt; color: #145A41; }
  h2 { font-size: 13pt; margin: 18pt 0 6pt; color: #145A41; border-bottom: 1.5pt solid #D5DDD6; padding-bottom: 3pt; }
  .muted { color: #56675E; font-size: 10.5pt; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5pt 4pt; border-bottom: 0.5pt solid #E3E8E4; vertical-align: top; font-size: 11pt; }
  td.d { white-space: nowrap; font-weight: 600; width: 28%; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { color: #1F7A5A; font-weight: 700; font-size: 14pt; }
  .grid { display: flex; flex-wrap: wrap; gap: 8pt; }
  .ph { width: 30%; font-size: 9.5pt; color: #56675E; }
  .ph img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6pt; display: block; margin-bottom: 2pt; }
  ul { margin: 0; padding-left: 16pt; }
  .note { margin-top: 18pt; padding: 8pt 10pt; background: #F1F4EE; border-radius: 6pt; font-size: 10pt; color: #56675E; }
</style></head><body>
<div class="head"><div><h1>Meal summary for ${esc(me.name)}</h1>
<div class="muted">${dateText(since)} to ${dateText(now)}, ${now.getFullYear()}${checkup ? ` · for the checkup on ${dateText(checkup)}` : ''}</div></div>
<div class="brand">Amader</div></div>

<h2>At a glance</h2>
<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
<p class="muted">A handful is the person's own cupped hand, about half a cup of cooked rice. Roti and bread are counted in pieces and slices.</p>

<h2>Starch by day</h2>
${rows.length ? `<table>${rows.map((r) => `<tr><td class="d">${esc(dayText(r.day))}</td><td>${r.meals.map((m) => `${esc(slotName(m.slot))}: ${esc(m.text)}`).join('<br>')}</td></tr>`).join('')}</table>` : '<p class="muted">Nothing logged in this time.</p>'}

${photos.length ? `<h2>Recent plates</h2><div class="grid">${photos.map((m) => `<div class="ph"><img src="${esc(m.photo as string)}" alt=""><b>${dateText(new Date(m.date))}</b>, ${esc(slotName(m.slot).toLowerCase())}</div>`).join('')}</div>` : ''}

<div class="note">A simple log of meals shared in the Amader app by ${esc(me.name)}. Amounts are the person's own hand estimates, not weighed. It is not a medical record and has no readings, nutrient figures or advice.</div>
</body></html>`;
}
