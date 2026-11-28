import React, { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CostumeArt, isCostume } from "../costumes";
import { PILOT } from "../pilot";
import {
  BigButton,
  DayDots,
  Face,
  FoodPlate,
  Icon,
  K,
  Mado,
  Page,
  RoundIcon,
  S,
  card,
} from "../design";
import { sendOnWhatsApp } from "../nudge";
import { useStore } from "../store";
import { C, F } from "../theme";
import { Meal, Member } from "../types";
import { T } from "../ui";
import { Feed, MealCalendar } from "./Family";
import {
  dateText,
  dayName,
  inWeek,
  sameDay,
  startOfDay,
  weekDays,
  weekLabel,
} from "../words";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** 2 = shared that day, 0 = didn't. One value per day of the week. */
function sharedRow(meals: Meal[], id: string, days: Date[]): number[] {
  return days.map((d) =>
    meals.some((m) => m.memberId === id && sameDay(new Date(m.date), d))
      ? 2
      : 0,
  );
}

/** The family's week, Mado's wardrobe and the family recipes. Everything else is one tap away. */
export default function Us({
  onMe,
  onPerson,
  onPast,
  onRecap,
  onRecipes,
  onMeal,
  onPath,
}: {
  onMe: () => void;
  onPerson: (id: string) => void;
  onPast: () => void;
  onRecap: () => void;
  onRecipes: () => void;
  onMeal: (id: string) => void;
  onPath?: () => void;
}) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<"week" | "feed" | "calendar">("week");
  const { family, meals, recipes } = store;
  if (!family) return null;
  const days = weekDays(0);
  const today = startOfDay(new Date());
  const todayI = days.findIndex((d) => sameDay(d, today));
  const joined = family.members.filter((m) => m.joined);
  const allDays = days.filter(
    (d, i) =>
      i <= todayI &&
      joined.length > 1 &&
      joined.every((m) =>
        meals.some((x) => x.memberId === m.id && sameDay(new Date(x.date), d)),
      ),
  );
  const costumes = (family.costumes ?? []).filter(isCostume);
  const q = store.quest;
  const worn = store.prefs.wear;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: insets.top + 14,
        paddingBottom: 130,
        paddingHorizontal: 20,
        gap: 14,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={C.leaf}
          onRefresh={async () => {
            setRefreshing(true);
            await store.refresh().catch(() => undefined);
            setRefreshing(false);
          }}
        />
      }
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <T w="bold" size={S.display}>
          Us
        </T>
        <RoundIcon name="gear" onPress={onMe} label="Settings" bg={C.mint} />
      </View>

      <View
        style={{
          flexDirection: "row",
          backgroundColor: C.mint,
          borderRadius: 999,
          padding: 4,
        }}
        accessibilityRole="tablist"
      >
        {(
          [
            ["week", "This week"],
            ["feed", "Feed"],
            ["calendar", "Calendar"],
          ] as const
        ).map(([k, label]) => (
          <Pressable
            key={k}
            onPress={() => setView(k)}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === k }}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: view === k ? C.white : "transparent",
            }}
          >
            <T w="bold" size={S.small} color={view === k ? C.deep : C.muted}>
              {label}
            </T>
          </Pressable>
        ))}
      </View>

      {view === "feed" ? <Feed onMeal={onMeal} onPerson={onPerson} /> : null}
      {view === "calendar" ? <MealCalendar onMeal={onMeal} /> : null}
      {view === "week" ? (
        <>
          <View style={card}>
            <View style={{ flexDirection: "row", paddingLeft: 92 }}>
              {LETTERS.map((d, i) => (
                <View
                  key={i}
                  style={{
                    width: 32,
                    alignItems: "center",
                    backgroundColor: i === todayI ? C.mint : "transparent",
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  }}
                >
                  <T
                    w="bold"
                    size={S.small}
                    color={i === todayI ? C.deep : C.muted}
                  >
                    {d}
                  </T>
                </View>
              ))}
            </View>
            {family.members.map((m) => {
              const row = sharedRow(meals, m.id, days);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => onPerson(m.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.name}'s page`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    height: 40,
                  }}
                >
                  <View
                    style={{
                      width: 92,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Face member={m} size={26} ring={C.white} />
                    <T
                      w="medium"
                      size={S.small}
                      numberOfLines={1}
                      style={{ flex: 1 }}
                    >
                      {m.id === store.me?.id ? "You" : m.name}
                    </T>
                  </View>
                  {row.map((v, i) => (
                    <View
                      key={i}
                      style={{
                        width: 32,
                        height: 40,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: i === todayI ? C.mint : "transparent",
                      }}
                    >
                      <View
                        style={{
                          width: v ? 22 : i <= todayI ? 22 : 18,
                          height: v ? 22 : i <= todayI ? 22 : 18,
                          borderRadius: 11,
                          backgroundColor: v
                            ? C.leaf
                            : i <= todayI
                              ? C.steel
                              : "transparent",
                          borderWidth: !v && i > todayI ? 2 : 0,
                          borderColor: K.line2,
                        }}
                      />
                    </View>
                  ))}
                </Pressable>
              );
            })}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <T w="medium" size={S.small} color={C.deep} style={{ flex: 1 }}>
                {allDays.length
                  ? `Everyone shared on ${allDays.map(dayName).join(", ")}.`
                  : `${inWeek(meals, days).length} ${inWeek(meals, days).length === 1 ? "plate" : "plates"} so far this week.`}
              </T>
              <Pressable
                onPress={onPast}
                accessibilityRole="button"
                hitSlop={8}
              >
                <T w="bold" size={S.small} color={C.leaf}>
                  Past weeks
                </T>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={onRecap}
            accessibilityRole="button"
            style={[
              card,
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
              },
            ]}
          >
            <Mado width={40} mood="happy" />
            <T w="bold" size={S.body} style={{ flex: 1 }}>
              This week's recap
            </T>
            <Icon name="next" size={20} color={C.muted} />
          </Pressable>

          <View
            style={{ backgroundColor: C.mint, borderRadius: 24, padding: 16 }}
          >
            <T w="bold" size={S.body}>
              Mado's wardrobe
            </T>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 14, marginTop: 10 }}
            >
              {costumes.map((c) => {
                const on =
                  worn === c || (!worn && c === costumes[costumes.length - 1]);
                return (
                  <Pressable
                    key={c}
                    onPress={() => store.setPrefs({ wear: c })}
                    accessibilityRole="button"
                    accessibilityLabel={`Dress Mado in this`}
                    style={{ width: 80, alignItems: "center" }}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: C.white,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: on ? 3 : 0,
                        borderColor: C.leaf,
                      }}
                    >
                      <CostumeArt id={c} size={44} />
                    </View>
                    <T w="bold" size={S.small} center style={{ marginTop: 4 }}>
                      {on ? "Wearing" : "Won"}
                    </T>
                  </Pressable>
                );
              })}
              {!PILOT && q && !costumes.includes(q.quest.costume) ? (
                <View style={{ width: 80, alignItems: "center" }}>
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: C.white,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 3,
                      borderColor: C.lightGreen,
                    }}
                  >
                    <CostumeArt id={q.quest.costume} size={44} />
                  </View>
                  <T w="bold" size={S.small} center style={{ marginTop: 4 }}>
                    {q.done} of {q.goal}
                  </T>
                </View>
              ) : null}
              <Pressable
                onPress={PILOT ? onPath : undefined}
                disabled={!PILOT}
                accessibilityRole={PILOT ? "button" : undefined}
                style={{ width: 80, alignItems: "center" }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    borderWidth: 2,
                    borderStyle: "dashed",
                    borderColor: C.lightGreen,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <T w="bold" size={S.title} color={C.lightGreen}>
                    ?
                  </T>
                </View>
                <T w="bold" size={S.small} center style={{ marginTop: 4 }}>
                  {PILOT ? store.t("spend") : "Next week"}
                </T>
              </Pressable>
            </ScrollView>
          </View>

          {PILOT ? null : (
          <View style={card}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <T w="bold" size={S.body}>
                Family recipes
              </T>
              <Pressable
                onPress={onRecipes}
                accessibilityRole="button"
                hitSlop={8}
              >
                <T w="bold" size={S.small} color={C.leaf}>
                  {recipes.length ? "See all" : "Save one"}
                </T>
              </Pressable>
            </View>
            {recipes.length ? (
              recipes.slice(0, 3).map((r, i) => (
                <Pressable
                  key={r.id}
                  onPress={onRecipes}
                  accessibilityRole="button"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 8,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: K.line2,
                  }}
                >
                  <FoodPlate
                    size={48}
                    photo={r.photo}
                    portions={{ grains: 1, protein: 1, veg: 1 }}
                  />
                  <View style={{ flex: 1 }}>
                    <T w="bold" size={S.body} style={{ lineHeight: 20 }}>
                      {r.title}
                    </T>
                    <T w="medium" size={S.small} color={C.muted}>
                      From {r.from}
                    </T>
                  </View>
                  <Icon name="next" size={20} color={C.muted} />
                </Pressable>
              ))
            ) : (
              <T w="medium" size={S.small} color={C.muted}>
                Keep Ammi's dal or Nani's khichdi here so it is never lost.
              </T>
            )}
          </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

/** Past weeks, a row of seven days each: full when everyone shared, light when some did. */
export function PastWeeks({
  onBack,
  onWeek,
}: {
  onBack: () => void;
  onWeek: (offset: number) => void;
}) {
  const store = useStore();
  const joined = (store.family?.members ?? []).filter((m) => m.joined);
  const weeks = Array.from({ length: 8 }, (_, i) => -i);
  const firstMeal = store.meals[store.meals.length - 1];
  return (
    <Page title="Past weeks" sub="Tap a week to see its plates" onBack={onBack}>
      <View
        style={{
          flexDirection: "row",
          gap: 16,
          paddingHorizontal: 20,
          marginTop: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: C.leaf,
            }}
          />
          <T w="medium" size={S.small} color={C.muted}>
            Everyone shared
          </T>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: C.lightGreen,
            }}
          />
          <T w="medium" size={S.small} color={C.muted}>
            Some shared
          </T>
        </View>
      </View>
      <View style={{ padding: 20, gap: 12 }}>
        {weeks.map((offset) => {
          const days = weekDays(offset);
          if (
            firstMeal &&
            days[6] < startOfDay(new Date(firstMeal.date)) &&
            offset < 0
          )
            return null;
          const row = days.map((d) => {
            const n = joined.filter((m) =>
              store.meals.some(
                (x) => x.memberId === m.id && sameDay(new Date(x.date), d),
              ),
            ).length;
            return n === 0 ? 0 : n >= joined.length ? 2 : 1;
          });
          const plates = inWeek(store.meals, days).length;
          return (
            <Pressable
              key={offset}
              onPress={() => onWeek(offset)}
              accessibilityRole="button"
              style={card}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <T w="bold" size={S.body} style={{ lineHeight: 20 }}>
                    {offset === 0
                      ? "This week"
                      : `${dateText(days[0])} to ${dateText(days[6])}`}
                  </T>
                  <T w="medium" size={S.small} color={C.muted}>
                    {plates} {plates === 1 ? "plate" : "plates"} shared
                  </T>
                </View>
                <Icon name="next" size={20} color={C.muted} />
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                {row.map((v, i) => (
                  <View key={i} style={{ alignItems: "center", gap: 2 }}>
                    <DayDots values={[v]} size={26} />
                    <T size={11} color={C.muted}>
                      {LETTERS[i]}
                    </T>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Page>
  );
}

/** The Sunday recap: the family's week in one screen. No personal scores, only what we did together. */
export function WeekRecap({
  offset,
  onBack,
  onQuest,
}: {
  offset: number;
  onBack: () => void;
  onQuest: () => void;
}) {
  const store = useStore();
  const { family, meals } = store;
  if (!family) return null;
  const days = weekDays(offset);
  const week = inWeek(meals, days);
  const joined = family.members.filter((m) => m.joined);
  const together = days.filter(
    (d) =>
      joined.length > 1 &&
      joined.every((m) =>
        week.some((x) => x.memberId === m.id && sameDay(new Date(x.date), d)),
      ),
  ).length;
  const hearts = week.reduce((n, m) => n + m.hearts.length, 0);
  const loved = [...week].sort((a, b) => b.hearts.length - a.hearts.length)[0];
  const lovedBy = loved ? store.member(loved.memberId) : undefined;
  const q = store.quest;
  const won = offset === 0 && q?.finished;
  const summary = `Our week on Amader: ${week.length} plates shared, ${together} days all together, ${hearts} hearts.`;

  return (
    <Page
      title={offset === 0 ? "Your family's week" : weekLabel(offset, days)}
      sub={`${dateText(days[0])} to ${dateText(days[6])}`}
      onBack={onBack}
      bg={C.mint}
      footer={
        <View style={{ flexDirection: "row", gap: 10 }}>
          <BigButton
            label="Share"
            icon="whatsapp"
            kind="line"
            onPress={() => sendOnWhatsApp(summary)}
            style={{ flex: 1 }}
          />
          {offset === 0 ? (
            <BigButton
              label="Next quest"
              onPress={onQuest}
              style={{ flex: 1.6 }}
            />
          ) : null}
        </View>
      }
    >
      <View style={{ alignItems: "center", marginTop: 12 }}>
        <Mado
          mood="happy"
          width={150}
          costume={won ? q?.quest.costume : undefined}
        />
        <T
          w="bold"
          size={S.body}
          color={C.deep}
          center
          style={{ marginTop: 6, paddingHorizontal: 20 }}
        >
          {won
            ? `${q?.quest.name} done. Mado won the ${q?.quest.costumeName.toLowerCase()}!`
            : week.length
              ? "Mado is proud of this table."
              : "A quiet week. Next week is a new table."}
        </T>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          paddingHorizontal: 20,
          marginTop: 16,
        }}
      >
        {[
          [week.length, week.length === 1 ? "plate shared" : "plates shared"],
          [together, together === 1 ? "day all together" : "days all together"],
          [hearts, hearts === 1 ? "heart sent" : "hearts sent"],
        ].map(([n, t]) => (
          <View
            key={String(t)}
            style={[card, { flex: 1, padding: 10, alignItems: "center" }]}
          >
            <T w="bold" size={S.display} color={C.deep}>
              {n}
            </T>
            <T w="medium" size={S.small} color={C.muted} center>
              {t}
            </T>
          </View>
        ))}
      </View>
      {loved && loved.hearts.length ? (
        <View style={[card, { marginHorizontal: 20, marginTop: 14 }]}>
          <T w="bold" size={S.body}>
            Most loved plate
          </T>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginTop: 8,
            }}
          >
            <FoodPlate meal={loved} size={64} />
            <View style={{ flex: 1 }}>
              <T w="bold" size={S.body} style={{ lineHeight: 20 }}>
                {lovedBy?.name}'s {loved.dish || "plate"}
              </T>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Icon name="heart" size={14} color={C.heart} fill={C.heart} />
                <T w="medium" size={S.small} color={C.muted}>
                  {loved.hearts.length} hearts, {dayName(new Date(loved.date))}
                </T>
              </View>
            </View>
          </View>
        </View>
      ) : null}
      <View style={[card, { marginHorizontal: 20, marginTop: 14, gap: 8 }]}>
        {family.members.map((m: Member) => (
          <View
            key={m.id}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <Face member={m} size={26} ring={C.white} />
            <T w="medium" size={S.small} style={{ flex: 1 }}>
              {m.id === store.me?.id ? "You" : m.name}
            </T>
            <DayDots values={sharedRow(meals, m.id, days)} />
          </View>
        ))}
      </View>
    </Page>
  );
}

/** A person's page: their week, their plates, notes to them. No scores. Medicine never shows here. */
export function Person({
  memberId,
  onBack,
  onMeal,
}: {
  memberId: string;
  onBack: () => void;
  onMeal: (id: string) => void;
}) {
  const store = useStore();
  const m = store.member(memberId);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">(
    "idle",
  );
  if (!m) return null;
  const me = memberId === store.me?.id;
  const theirs = store.meals.filter((x) => x.memberId === memberId);
  const first = theirs[theirs.length - 1];
  const days = weekDays(0);
  const todayI = days.findIndex((d) => sameDay(d, new Date()));
  const notes = store.cheers
    .filter((c) => c.toId === memberId && !c.mealId)
    .slice(0, 2);

  async function send() {
    setState("sending");
    try {
      await store.sendCheer(memberId, text);
      setText("");
      setWriting(false);
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  return (
    <Page
      onBack={onBack}
      footer={
        me ? undefined : writing ? (
          <View
            style={{ flexDirection: "row", gap: 8, backgroundColor: C.rice }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              maxLength={200}
              placeholder={`A note to ${m.name}`}
              placeholderTextColor="#8A988F"
              style={{
                flex: 1,
                height: 56,
                borderRadius: 28,
                borderWidth: 1.5,
                borderColor: K.line2,
                backgroundColor: C.white,
                paddingHorizontal: 18,
                fontFamily: F.medium,
                fontSize: 17,
                color: C.ink,
              }}
            />
            <BigButton
              label={state === "sending" ? "..." : "Send"}
              disabled={!text.trim() || state === "sending"}
              onPress={send}
              height={56}
            />
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 10 }}>
            {theirs[0] ? (
              <Pressable
                onPress={() => store.toggleHeart(theirs[0].id)}
                accessibilityRole="button"
                accessibilityLabel={`Send ${m.name} a heart`}
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 24,
                  backgroundColor: C.pinkSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name="heart"
                  size={28}
                  color={C.heart}
                  fill={
                    store.session &&
                    theirs[0].hearts.includes(store.session.meId)
                      ? C.heart
                      : "none"
                  }
                />
              </Pressable>
            ) : null}
            <BigButton
              label={state === "sent" ? "Note sent!" : `Send ${m.name} a note`}
              onPress={() => setWriting(true)}
              style={{ flex: 1 }}
            />
          </View>
        )
      }
    >
      <View style={{ alignItems: "center", marginTop: -10 }}>
        <Face member={m} size={88} />
        <T w="bold" size={S.display} style={{ marginTop: 8 }}>
          {me ? "You" : m.name}
        </T>
        <T w="medium" size={S.small} color={C.muted}>
          {!m.joined
            ? "Invited, not joined yet"
            : first
              ? `At the table since ${dateText(new Date(first.date))}`
              : "At the table"}
        </T>
      </View>
      <View
        style={[
          card,
          {
            marginHorizontal: 20,
            marginTop: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        ]}
      >
        <T w="bold" size={S.body}>
          This week
        </T>
        <DayDots
          values={sharedRow(store.meals, memberId, days)}
          size={22}
          gap={7}
          today={todayI}
        />
      </View>
      <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
        <T w="bold" size={S.body} style={{ marginBottom: 8 }}>
          {me ? "Your plates" : `${m.name}'s plates`}
        </T>
        {theirs.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {theirs.slice(0, 9).map((meal) => (
              <Pressable
                key={meal.id}
                onPress={() => onMeal(meal.id)}
                accessibilityRole="button"
                style={{ width: "30%", alignItems: "center" }}
              >
                <FoodPlate meal={meal} size={96} />
                <T w="medium" size={S.small} color={C.muted} numberOfLines={1}>
                  {dayName(new Date(meal.date)).slice(0, 3)}{" "}
                  {meal.slot === "fasting"
                    ? "fast"
                    : meal.slot === "suhoor"
                      ? "dawn"
                      : meal.slot === "iftar"
                        ? "break fast"
                        : meal.slot}
                </T>
              </Pressable>
            ))}
          </View>
        ) : (
          <T w="medium" size={S.small} color={C.muted}>
            No plates yet.
          </T>
        )}
      </View>
      {notes.map((n) => {
        const from = store.member(n.fromId);
        return (
          <View
            key={n.id}
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              backgroundColor: C.pinkSoft,
              borderRadius: 20,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            {from ? <Face member={from} size={28} ring={C.pinkSoft} /> : null}
            <T size={S.body} style={{ flex: 1 }}>
              "{n.text}"
            </T>
          </View>
        );
      })}
      {state === "failed" ? (
        <T size={S.small} color="#8A2942" center style={{ marginTop: 8 }}>
          That didn't send. Please try again.
        </T>
      ) : null}
    </Page>
  );
}
