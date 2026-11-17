import React, { useState } from 'react';
import { Platform, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { C } from '../theme';
import { REMINDER_TIMES } from '../reminders';
import { shareText } from '../share';
import { Avatar, Btn, Card, Eyebrow, RoundButton, Row, T, Tag } from '../ui';
import { MILESTONES, spacedCode } from '../words';
import { Chip, GOAL_FOODS, Stepper } from './SetupFamily';

export default function Me({ onClose, onCheckup, onTeach }: { onClose: () => void; onCheckup: () => void; onTeach: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [improveNote, setImproveNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refused, setRefused] = useState(false);
  const { family, me } = store;
  if (!family || !me) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.rice }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, gap: 16 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <RoundButton icon="chevron-back" label="Back" onPress={onClose} />
        <Tag text={me.role === 'parent' ? 'Parent' : 'Family'} />
      </Row>
      <Row gap={14}>
        <Avatar member={me} size={56} />
        <View>
          <T w="bold" size={26}>
            {me.name}
          </T>
          <T color={C.muted} size={14}>
            {store.myMealCount} {store.myMealCount === 1 ? 'meal' : 'meals'} shared
          </T>
        </View>
      </Row>

      <Row gap={10}>
        {MILESTONES.map((n) => {
          const earned = store.myMealCount >= n;
          return (
            <View key={n} style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: earned ? C.leaf : C.white, borderWidth: 2, borderColor: earned ? C.leaf : C.line }}>
              <T w="semibold" color={earned ? C.white : C.muted}>
                {n}
              </T>
            </View>
          );
        })}
      </Row>

      <Eyebrow>Our family</Eyebrow>
      <Card style={{ gap: 12 }}>
        {family.members.map((m) => (
          <Row key={m.id}>
            <Avatar member={m} size={36} />
            <View style={{ flex: 1 }}>
              <T w="semibold">{m.id === me.id ? `${m.name} (you)` : m.name}</T>
              <T size={13} color={C.muted}>
                {m.role === 'parent' ? 'Parent' : 'Son or daughter'}
                {m.joined ? '' : ' · invited, not joined yet'}
              </T>
            </View>
            {store.session?.demo && m.id !== me.id ? <Chip label="View as" on={false} onPress={() => store.viewAs(m.id)} /> : null}
          </Row>
        ))}
        {!store.session?.demo ? (
          <>
            <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EDF0EA', paddingTop: 12 }}>
              <T color={C.muted} size={14}>
                Family code
              </T>
              <T w="bold" size={18} style={{ letterSpacing: 3 }}>
                {spacedCode(family.code)}
              </T>
            </Row>
            <Btn
              kind="ghost"
              icon="paper-plane-outline"
              label={copied ? 'Copied. Paste it in WhatsApp' : 'Invite someone'}
              onPress={async () => {
                const how = await shareText(store.inviteMessage).catch(() => null);
                if (how === 'copied') setCopied(true);
              }}
            />
          </>
        ) : null}
      </Card>

      <Eyebrow>The one food we keep an eye on</Eyebrow>
      <Card style={{ gap: 12 }}>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {GOAL_FOODS.map((f) => (
            <Chip key={f} label={f} on={store.goalFood === f} onPress={() => store.setGoal(f, store.goalHandfuls)} />
          ))}
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <T color={C.muted} size={14}>
            A usual plate
          </T>
          <Stepper value={store.goalHandfuls} food={store.goalFood} onChange={(n) => store.setGoal(store.goalFood, n)} />
        </Row>
        <T size={12} color={C.muted}>
          This is the same for the whole family, and anyone in the family can change it.
        </T>
      </Card>

      <Eyebrow>Reminders</Eyebrow>
      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T w="semibold">Ask me "Did you eat?"</T>
            <T size={13} color={C.muted}>
              Once a day, and not on days you already shared.
            </T>
          </View>
          <Switch
            value={store.prefs.reminderOn}
            trackColor={{ true: C.leaf, false: C.line }}
            onValueChange={async (on) => {
              const ok = await store.setReminder(on);
              setRefused(on && !ok);
            }}
          />
        </Row>
        {store.prefs.reminderOn ? (
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {REMINDER_TIMES.map((t) => (
              <Chip key={t.hour} label={t.label} on={store.prefs.reminderHour === t.hour} onPress={() => store.setReminder(true, t.hour)} />
            ))}
          </Row>
        ) : null}
        {refused ? (
          <T size={13} color="#8A2942">
            {Platform.OS === 'web' ? 'Reminders need the phone app. They are not available in the browser.' : 'Notifications are turned off for Amader. Turn them on in your phone settings, then try again.'}
          </T>
        ) : null}
        <T size={12} color={C.muted}>
          On the phone app you can also add the "Did you eat?" widget to your home screen or lock screen.
        </T>
      </Card>

      <Eyebrow>Photos</Eyebrow>
      <Card style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T w="semibold">Guess what's on my plate</T>
            <T size={13} color={C.muted}>
              Your meal photo is sent to an AI service (Claude, made by Anthropic) that names the dish and guesses the portion. No person at Amader looks at it. Off means photos only go to your family.
            </T>
          </View>
          <Switch value={store.prefs.guessOn === true} trackColor={{ true: C.leaf, false: C.line }} onValueChange={(on) => store.setGuessOn(on)} />
        </Row>
        <View style={{ height: 1, backgroundColor: '#EDF0EA', marginVertical: 4 }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T w="semibold">Help Amader learn our food</T>
            <T size={13} color={C.muted}>
              Off unless you turn it on. If on, Amader keeps your own plate photos and the portion you chose, to teach it to recognise home cooking better. Your family's photos are not included. Turn it off any time and what you shared is removed.
            </T>
            {improveNote ? (
              <T size={13} color={C.deep} w="semibold">
                {improveNote}
              </T>
            ) : null}
          </View>
          <Switch
            value={store.prefs.improveOn}
            trackColor={{ true: C.leaf, false: C.line }}
            accessibilityLabel="Help Amader learn our food"
            onValueChange={async (on) => {
              const ok = await store.setImproveOn(on);
              setImproveNote(!ok ? "We couldn't reach the server to remove what you shared. It is still on. Please try again." : on ? (store.cloud && !store.session?.demo ? 'Thank you. From now on, your new plate photos help.' : 'On. This is a sample on this phone only, so nothing is kept.') : 'Turned off. What you shared has been removed.');
            }}
          />
        </Row>
        <T size={12} color={C.muted}>
          Photos are private to your family. Nobody outside it can open them.
        </T>
      </Card>

      <Eyebrow>My data</Eyebrow>
      <Card style={{ gap: 12 }}>
        <Btn kind="ghost" icon="document-text-outline" label="My meal summary for a checkup" onPress={onCheckup} />
        <Btn kind="ghost" icon="hand-left-outline" label="Drag the rice: the idea in ten seconds" onPress={onTeach} />
        {confirming ? (
          <View style={{ gap: 8 }}>
            <T size={14}>
              {store.session?.demo ? 'Leave the sample family?' : 'This removes your meals and photos for good. Your family will no longer see them.'}
            </T>
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
      </Card>

      <T center color={C.muted} size={12}>
        Amader helps with everyday eating. It isn't a medical device and doesn't give medical advice. We never sell your data or use it for ads.
      </T>
    </ScrollView>
  );
}
