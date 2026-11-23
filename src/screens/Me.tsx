import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C, F } from '../theme';
import { sendOnWhatsApp } from '../nudge';
import { shareText } from '../share';
import { Btn, Chip, Eyebrow, GOAL_FOODS, PageHead, Row, T, TimeRow, Toggle } from '../ui';
import { Face, Pill } from '../design';
import { FAST_KINDS, dayName, roleName, spacedCode } from '../words';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Me({ onClose, onCheckup, onTeach, onPerson, onWidget }: { onClose: () => void; onCheckup: () => void; onTeach: () => void; onPerson: (id: string) => void; onWidget: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [improveNote, setImproveNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refused, setRefused] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addFailed, setAddFailed] = useState<string | null>(null);
  const [alertsRefused, setAlertsRefused] = useState(false);
  const [medsRefused, setMedsRefused] = useState(false);
  const { family, me, prefs } = store;
  if (!family || !me) return null;

  const remind = async (change: Parameters<typeof store.setReminders>[0]) => {
    const asked = change.reminderOn || change.nudgesOn;
    const ok = await store.setReminders(change);
    setRefused(!!asked && !ok);
  };

  const section = { backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 6, borderWidth: 1, borderColor: '#E6EBE6' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: C.rice }}>
      <PageHead title="Settings" onBack={onClose} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: insets.bottom + 24, gap: 12 }}>
        <Pressable onPress={() => onPerson(me.id)} accessibilityRole="button" accessibilityLabel="See my progress">
          <View style={[section, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <Face member={me} size={56} ring={C.white} />
            <View style={{ flex: 1 }}>
              <T w="bold" size={22}>
                {me.name}
              </T>
              <T size={15} color={C.muted}>
                {roleName(me.role)} · {store.myMealCount} {store.myMealCount === 1 ? 'meal' : 'meals'} shared
              </T>
            </View>
            <T w="semibold" size={14} color={C.leaf}>
              My progress
            </T>
            <Ionicons name="chevron-forward" size={20} color={C.leaf} />
          </View>
        </Pressable>

        <View style={section}>
          <Toggle
            title="Simple view"
            help="One screen with one big button and the family's plates. Good for anyone who wants the app quiet."
            on={store.simple}
            onChange={(on) => store.setPrefs({ simple: on })}
          />
        </View>

        <Eyebrow>Our family</Eyebrow>
        <View style={section}>
          {family.members.map((m) => (
            <Row key={m.id} style={{ paddingVertical: 4 }}>
              <Pressable onPress={() => onPerson(m.id)} accessibilityRole="button" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Face member={m} size={40} ring={C.white} />
                <View style={{ flex: 1 }}>
                  <T w="semibold">{m.id === me.id ? `${m.name} (you)` : m.name}</T>
                  <T size={14} color={C.muted}>
                    {roleName(m.role)}
                    {m.joined ? '' : ' · invited, not joined yet'}
                  </T>
                </View>
              </Pressable>
              {store.session?.demo && m.id !== me.id ? <Chip label="Be them" on={false} onPress={() => store.viewAs(m.id)} /> : null}
            </Row>
          ))}
          {adding ? (
            <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: '#EDF0EA', paddingTop: 10 }}>
              <T w="semibold">Who else do you look after?</T>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Dad, Grandma, Nani..."
                placeholderTextColor="#9AA79F"
                autoFocus
                maxLength={24}
                autoCapitalize="words"
                style={{ minHeight: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#D8E2DB', backgroundColor: C.white, paddingHorizontal: 14, fontFamily: F.regular, fontSize: 17, color: C.ink }}
              />
              {addFailed ? (
                <T size={14} color="#8A2942">
                  {addFailed}
                </T>
              ) : null}
              <Row gap={8}>
                <Btn kind="ghost" label="Cancel" onPress={() => (setAdding(false), setNewName(''))} style={{ flex: 1, alignSelf: 'auto' }} />
                <Btn
                  label={addBusy ? 'Adding...' : 'Add a seat'}
                  disabled={addBusy || !newName.trim()}
                  onPress={async () => {
                    setAddBusy(true);
                    setAddFailed(null);
                    try {
                      await store.addPerson(newName);
                      setNewName('');
                      setAdding(false);
                    } catch (e) {
                      setAddFailed(e instanceof Error && /full/.test(e.message) ? 'The table is full (8 people).' : "That didn't save. Please try again.");
                    } finally {
                      setAddBusy(false);
                    }
                  }}
                  style={{ flex: 1, alignSelf: 'auto' }}
                />
              </Row>
            </View>
          ) : (
            <Btn kind="ghost" icon="person-add-outline" label="I look after someone else too" onPress={() => setAdding(true)} style={{ marginTop: 4 }} />
          )}
          {!store.session?.demo ? (
            <>
              <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EDF0EA', paddingTop: 10, marginTop: 4 }}>
                <T color={C.muted}>Family code</T>
                <T w="bold" size={20} style={{ letterSpacing: 3 }}>
                  {spacedCode(family.code)}
                </T>
              </Row>
              <Row gap={8}>
                <Btn icon="logo-whatsapp" label="Invite" onPress={() => sendOnWhatsApp(store.inviteMessage)} style={{ flex: 1, alignSelf: 'auto' }} />
                <Btn
                  kind="ghost"
                  icon="share-outline"
                  label={copied ? 'Copied' : 'Other'}
                  onPress={async () => {
                    const how = await shareText(store.inviteMessage).catch(() => null);
                    if (how === 'copied') setCopied(true);
                  }}
                  style={{ flex: 1, alignSelf: 'auto' }}
                />
              </Row>
            </>
          ) : null}
        </View>

        <Eyebrow>When you usually eat</Eyebrow>
        <View style={section}>
          <T size={14} color={C.muted}>
            For reminders.
          </T>
          <TimeRow icon="sunny-outline" label="Breakfast" hour={prefs.times.breakfast} min={4} max={11} onChange={(h) => remind({ times: { ...prefs.times, breakfast: h } })} />
          <TimeRow icon="partly-sunny-outline" label="Lunch" hour={prefs.times.lunch} min={11} max={16} onChange={(h) => remind({ times: { ...prefs.times, lunch: h } })} />
          <TimeRow icon="moon-outline" label="Dinner" hour={prefs.times.dinner} min={17} max={23} onChange={(h) => remind({ times: { ...prefs.times, dinner: h } })} />
          <View style={{ height: 1, backgroundColor: '#EDF0EA', marginVertical: 4 }} />
          <Toggle title="We live together" help="One photo can cover a meal you eat together." on={prefs.sameHome} onChange={(on) => store.setPrefs({ sameHome: on })} />
        </View>

        <Eyebrow>Fasting</Eyebrow>
        <View style={section}>
          <Toggle
            title="I'm fasting"
            help="Before dawn and break fast instead of the usual meals. Fasting days keep the family streak going."
            on={prefs.ramadan}
            onChange={(on) => remind({ ramadan: on })}
          />
          {prefs.ramadan ? (
            <>
              <T size={14} color={C.muted}>
                What kind of fast?
              </T>
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                {FAST_KINDS.map((k) => (
                  <Pill
                    key={k}
                    label={k}
                    on={prefs.fastKind === k}
                    onPress={() => {
                      store.setPrefs({ fastKind: k });
                      // "My own days" fasts on chosen weekdays; the rest fast every day of the season.
                      if (k === 'My own days') remind({ fastKind: k, fastDays: prefs.fastDays?.length ? prefs.fastDays : [0] });
                      else remind({ fastKind: k, fastDays: null });
                    }}
                  />
                ))}
              </Row>
              {prefs.fastKind === 'My own days' ? (
                <>
                  <T size={14} color={C.muted}>
                    Which days?
                  </T>
                  <Row gap={6} style={{ flexWrap: 'wrap' }}>
                    {WEEK.map((d, i) => {
                      const on = (prefs.fastDays ?? []).includes(i);
                      return (
                        <Pill
                          key={d}
                          label={d}
                          on={on}
                          onPress={() => {
                            const days = on ? (prefs.fastDays ?? []).filter((x) => x !== i) : [...(prefs.fastDays ?? []), i].sort();
                            if (days.length) remind({ fastDays: days });
                          }}
                        />
                      );
                    })}
                  </Row>
                </>
              ) : null}
              <TimeRow icon="cloudy-night-outline" label="Before dawn" hour={prefs.suhoorHour} min={2} max={6} onChange={(h) => remind({ suhoorHour: h })} />
              <TimeRow icon="moon" label="Break fast" hour={prefs.iftarHour} min={16} max={21} onChange={(h) => remind({ iftarHour: h })} />
            </>
          ) : null}
        </View>

        <Eyebrow>Reminders</Eyebrow>
        <View style={section}>
          <Toggle
            title="When family shares a meal"
            help="A notification when someone shares a plate or comments on yours."
            on={prefs.familyAlerts}
            onChange={async (on) => setAlertsRefused(!(await store.setFamilyAlerts(on)) && on)}
          />
          {alertsRefused ? (
            <T size={14} color="#8A2942">
              {Platform.OS === 'web' ? 'In the browser you see it when the app is open. Phone notifications need the app.' : 'Notifications are off for Amader. Turn them on in your phone settings.'}
            </T>
          ) : null}
          <Toggle title='"Did you eat?" after meals' help="45 minutes after each meal, if you haven't shared it." on={prefs.reminderOn} onChange={(on) => remind({ reminderOn: on })} />
          <Toggle title="A surprise snack check" help='Once an afternoon: "Having a snack?"' on={prefs.nudgesOn} onChange={(on) => remind({ nudgesOn: on })} />
          {refused ? (
            <T size={14} color="#8A2942">
              {Platform.OS === 'web' ? 'Reminders need the phone app. They are not available in the browser.' : 'Notifications are turned off for Amader. Turn them on in your phone settings, then try again.'}
            </T>
          ) : null}
          <Btn kind="ghost" icon="apps-outline" label="Add the home screen widget" onPress={onWidget} style={{ marginTop: 6 }} />
          <View style={{ height: 1, backgroundColor: '#EDF0EA', marginVertical: 4 }} />
          <T w="semibold">{store.onBreak ? `Resting until ${prefs.breakUntil ? dayName(new Date(prefs.breakUntil)) : 'later'}` : 'Take a break'}</T>
          <T size={14} color={C.muted}>
            No meal reminders while you rest. Medicine reminders still come. The family streak waits for you.
          </T>
          {store.onBreak ? (
            <Btn kind="ghost" label="End the break" onPress={() => store.takeBreak(null)} />
          ) : (
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {[3, 7, 14].map((d) => (
                <Pill key={d} label={d === 7 ? 'A week' : d === 14 ? 'Two weeks' : '3 days'} on={false} onPress={() => store.takeBreak(d)} />
              ))}
            </Row>
          )}
        </View>

        <Eyebrow>Medicine with meals</Eyebrow>
        <View style={section}>
          <Toggle
            title="Remind me to take medicine with meals"
            help="Like a weekly pill box: a nudge at the meal and a box to tick. Only on this phone. Your family doesn't see it, and Amader never asks what you take."
            on={prefs.meds.on}
            onChange={async (on) => setMedsRefused(!(await store.setMeds({ on })) && on)}
          />
          {prefs.meds.on ? (
            <>
              <T size={14} color={C.muted}>
                Which meals?
              </T>
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
                  <Pill
                    key={m}
                    label={m === 'breakfast' ? 'Breakfast' : m === 'lunch' ? 'Lunch' : 'Dinner'}
                    on={prefs.meds.slots.includes(m)}
                    onPress={() => {
                      const slots = prefs.meds.slots.includes(m) ? prefs.meds.slots.filter((x) => x !== m) : [...prefs.meds.slots, m];
                      if (slots.length) store.setMeds({ slots });
                    }}
                  />
                ))}
              </Row>
              {prefs.ramadan ? (
                <T size={14} color={C.muted}>
                  On fasting days, morning medicine moves to before dawn and evening medicine to break fast.
                </T>
              ) : null}
            </>
          ) : null}
          {medsRefused ? (
            <T size={14} color="#8A2942">
              {Platform.OS === 'web' ? 'The weekly boxes work here. Nudges need the phone app.' : 'Notifications are off for Amader, so the nudge is off. The weekly boxes still work.'}
            </T>
          ) : null}
        </View>

        <Eyebrow>Your main grain</Eyebrow>
        <View style={section}>
          <T size={14} color={C.muted}>
            Counted in fists. You can change it on any meal.
          </T>
          <Row gap={8} style={{ flexWrap: 'wrap', marginTop: 4 }}>
            {GOAL_FOODS.map((f) => (
              <Pill key={f} label={f} on={store.goalFood === f} onPress={() => store.setGoal(f, store.goalHandfuls)} />
            ))}
          </Row>
        </View>

        <Eyebrow>Photos</Eyebrow>
        <View style={section}>
          <Toggle
            title="Mado guesses what's on my plate"
            help="Your meal photo is sent to an AI service (Claude, made by Anthropic) that names the dish and guesses the portions. No person at Amader looks at it. Off means photos only go to your family."
            on={prefs.guessOn === true}
            onChange={(on) => store.setGuessOn(on)}
          />
          <View style={{ height: 1, backgroundColor: '#EDF0EA', marginVertical: 4 }} />
          <Toggle
            title="Help Amader learn our food"
            help="Off unless you turn it on. If on, Amader keeps your own plate photos and the portions you chose, to recognise home cooking better. Your family's photos are not included. Turning it off removes what you shared."
            on={prefs.improveOn === true}
            onChange={async (on) => {
              const ok = await store.setImproveOn(on);
              setImproveNote(!ok ? "We couldn't reach the server to remove what you shared. It is still on. Please try again." : on ? (store.cloud && !store.session?.demo ? 'Thank you. From now on, your new plate photos help.' : 'On. This is a sample on this phone only, so nothing is kept.') : 'Turned off. What you shared has been removed.');
            }}
          />
          {improveNote ? (
            <T size={14} color={C.deep} w="semibold">
              {improveNote}
            </T>
          ) : null}
        </View>

        <Eyebrow>More</Eyebrow>
        <View style={[section, { gap: 10 }]}>
          <Btn kind="ghost" icon="document-text-outline" label="Meal summary PDF for the doctor" onPress={onCheckup} />
          <Btn kind="ghost" icon="hand-left-outline" label="Drag the rice: the idea in ten seconds" onPress={onTeach} />
          {confirming ? (
            <View style={{ gap: 8 }}>
              <T>{store.session?.demo ? 'Leave the sample family?' : 'This removes your meals, notes, recipes and photos for good. Your family will no longer see them.'}</T>
              {deleteFailed ? (
                <T size={14} color="#8A2942">
                  We couldn't reach the server, so nothing was deleted. Check your connection and try again.
                </T>
              ) : null}
              <Row>
                <Btn kind="ghost" label="Keep" onPress={() => setConfirming(false)} style={{ flex: 1, alignSelf: 'auto' }} />
                <Btn label={store.session?.demo ? 'Leave' : 'Delete'} onPress={() => store.deleteEverything().catch(() => setDeleteFailed(true))} style={{ flex: 1, alignSelf: 'auto', backgroundColor: C.deep }} />
              </Row>
            </View>
          ) : (
            <Btn kind="line" label={store.session?.demo ? 'Leave the sample family' : 'Delete my meals and leave'} onPress={() => setConfirming(true)} />
          )}
        </View>

        <T center color={C.muted} size={13}>
          Amader helps with everyday eating. It isn't a medical device and doesn't give medical advice. We never sell your data or use it for ads.
        </T>
      </ScrollView>
    </View>
  );
}
