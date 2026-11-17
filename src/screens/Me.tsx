import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { C } from '../theme';
import { shareText } from '../share';
import { Avatar, Btn, Card, Eyebrow, RoundButton, Row, T, Tag } from '../ui';
import { MILESTONES } from '../words';
import { Chip, GOAL_FOODS, Stepper } from './SetupFamily';

export default function Me({ onClose, onCheckup }: { onClose: () => void; onCheckup: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
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
                {family.code}
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

      <Eyebrow>My data</Eyebrow>
      <Card style={{ gap: 12 }}>
        <Btn kind="ghost" icon="document-text-outline" label="My meal summary for a checkup" onPress={onCheckup} />
        {confirming ? (
          <View style={{ gap: 8 }}>
            <T size={14}>
              {store.session?.demo ? 'Leave the sample family?' : 'This removes your meals and photos for good. Your family will no longer see them.'}
            </T>
            <Row>
              <Btn kind="ghost" label="Keep" onPress={() => setConfirming(false)} style={{ flex: 1, alignSelf: 'auto' }} />
              <Btn label={store.session?.demo ? 'Leave' : 'Delete'} onPress={() => store.deleteEverything()} style={{ flex: 1, alignSelf: 'auto', backgroundColor: C.deep }} />
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
