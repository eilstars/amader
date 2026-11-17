import React, { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '../store';
import { C } from '../theme';
import { Photo, Recipe, Voice } from '../types';
import { Btn, Chip, PageHead, Puti, Row, T, field } from '../ui';
import { VoicePlayer, VoiceRecorder } from '../voice';
import { dateText } from '../words';

const WHOSE = ['Nani', 'Dadi', 'Ammi', 'Abbu', 'Khala', 'Mine'];

/** The family recipe book. So many recipes live only in one person's hands; this keeps them. */
export default function Recipes() {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const recipe = store.recipes.find((r) => r.id === open);
  if (adding) return <AddRecipe onDone={() => setAdding(false)} />;
  if (recipe) return <RecipePage recipe={recipe} onBack={() => setOpen(null)} />;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ backgroundColor: C.mint, paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 12 }}>
        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T w="bold" size={28} style={{ lineHeight: 34 }}>
              Family recipes
            </T>
            <T size={16} color={C.muted}>
              Nani's khichuri, Abbu's chai. Write them down, or record them telling it, before they're lost.
            </T>
          </View>
        </Row>
        <Btn label="Save a recipe" icon="add" onPress={() => setAdding(true)} />
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        {store.recipes.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
            <Puti mood="sleep" width={110} />
            <T w="semibold" center>
              No recipes yet
            </T>
            <T size={15} color={C.muted} center>
              Ask the best cook in the family to tell you one. Press record and let them talk.
            </T>
          </View>
        ) : (
          store.recipes.map((r) => {
            const by = store.member(r.addedBy);
            return (
              <Pressable key={r.id} onPress={() => setOpen(r.id)} accessibilityRole="button" accessibilityLabel={`${r.title}, from ${r.from}`}>
                <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 10, flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E6EBE6' }}>
                  {r.photo ? (
                    <Image source={{ uri: r.photo }} style={{ width: 76, height: 76, borderRadius: 14, backgroundColor: C.soft }} />
                  ) : (
                    <View style={{ width: 76, height: 76, borderRadius: 14, backgroundColor: '#F4EEDD', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="book" size={32} color="#8C7A45" />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <T w="semibold" size={18} numberOfLines={2}>
                      {r.title}
                    </T>
                    <T size={14} color={C.muted}>
                      {r.from}'s recipe · saved by {by?.id === store.me?.id ? 'you' : by?.name ?? 'family'}
                    </T>
                    {r.voice ? (
                      <Row gap={4}>
                        <Ionicons name="mic" size={14} color={C.leaf} />
                        <T size={13} color={C.leaf} w="semibold">
                          Has a voice recording
                        </T>
                      </Row>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={C.muted} />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function RecipePage({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  const mine = recipe.addedBy === store.session?.meId;
  const by = store.member(recipe.addedBy);
  const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <View style={{ flex: 1 }}>
      <PageHead title={recipe.title} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: insets.bottom + 24, gap: 14 }}>
        {recipe.photo ? <Image source={{ uri: recipe.photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 20, backgroundColor: C.soft }} /> : null}
        <T size={15} color={C.muted}>
          {recipe.from}'s recipe · saved by {by?.id === store.me?.id ? 'you' : by?.name ?? 'family'}, {dateText(new Date(recipe.date))}
        </T>
        {recipe.voice ? <VoicePlayer uri={recipe.voice} label={`${recipe.from} telling the recipe`} /> : null}
        {recipe.story ? (
          <View style={{ backgroundColor: '#F4EEDD', borderRadius: 18, padding: 14 }}>
            <T size={16} style={{ fontStyle: 'italic' }}>
              "{recipe.story}"
            </T>
          </View>
        ) : null}
        {recipe.ingredients ? (
          <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 6, borderWidth: 1, borderColor: '#E6EBE6' }}>
            <T w="bold" size={19}>
              What you need
            </T>
            {lines(recipe.ingredients).map((l, i) => (
              <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.leaf, marginTop: 10 }} />
                <T style={{ flex: 1 }}>{l}</T>
              </Row>
            ))}
          </View>
        ) : null}
        {recipe.steps ? (
          <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E6EBE6' }}>
            <T w="bold" size={19}>
              How to make it
            </T>
            {lines(recipe.steps).map((l, i) => (
              <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
                  <T w="bold" size={14} color={C.deep}>
                    {i + 1}
                  </T>
                </View>
                <T style={{ flex: 1 }}>{l}</T>
              </Row>
            ))}
          </View>
        ) : null}
        {mine ? (
          asking ? (
            <View style={{ gap: 8 }}>
              <T>{failed ? "We couldn't remove it. Try again." : 'Remove this recipe for the whole family?'}</T>
              <Row>
                <Btn kind="ghost" label="Keep" onPress={() => setAsking(false)} style={{ flex: 1, alignSelf: 'auto' }} />
                <Btn label="Remove" onPress={() => store.deleteRecipe(recipe.id).then(onBack).catch(() => setFailed(true))} style={{ flex: 1, alignSelf: 'auto', backgroundColor: C.deep }} />
              </Row>
            </View>
          ) : (
            <Btn kind="line" label="Remove this recipe" onPress={() => setAsking(true)} />
          )
        ) : null}
      </ScrollView>
    </View>
  );
}

function AddRecipe({ onDone }: { onDone: () => void }) {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState('Nani');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [story, setStory] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [voice, setVoice] = useState<Voice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length > 0 && (ingredients.trim() || steps.trim() || voice) && !busy;

  async function pickPhoto() {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (result.canceled || !result.assets?.length) return;
      // Shrinking also strips the location (GPS) the original file can carry.
      const small = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 1000 } }], { compress: 0.6, format: SaveFormat.JPEG, base64: true });
      setPhoto({ uri: small.uri, base64: small.base64 ?? null });
    } catch {
      setError("We couldn't use that photo. Try another one.");
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await store.addRecipe({ title, from: from === 'Mine' ? store.me?.name ?? 'Me' : from, ingredients, steps, story, photo, voice });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Please try again.");
      setBusy(false);
    }
  }

  const label = (text: string) => (
    <T w="semibold" size={15} color="#3B4B42">
      {text}
    </T>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageHead title="Save a recipe" onBack={onDone} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: insets.bottom + 24, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          {label('What is it called?')}
          <TextInput value={title} onChangeText={setTitle} placeholder="Bhuna khichuri" placeholderTextColor="#9AA79F" style={field} maxLength={80} />
        </View>
        <View style={{ gap: 8 }}>
          {label('Whose recipe is it?')}
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {WHOSE.map((w) => (
              <Chip key={w} label={w} on={from === w} onPress={() => setFrom(w)} />
            ))}
          </Row>
          <TextInput value={WHOSE.includes(from) ? '' : from} onChangeText={(t) => setFrom(t || 'Nani')} placeholder="Someone else? Type their name" placeholderTextColor="#9AA79F" style={field} maxLength={40} />
        </View>

        <View style={{ backgroundColor: C.pinkSoft, borderRadius: 18, padding: 12, gap: 8 }}>
          <T w="semibold">Easiest: let them tell it</T>
          <T size={14} color="#5B4A4F">
            Hold the phone near them and record. Their voice is part of the recipe.
          </T>
          <VoiceRecorder value={voice} onChange={setVoice} prompt="Record the recipe" />
        </View>

        <View style={{ gap: 6 }}>
          {label('What you need (one per line)')}
          <TextInput value={ingredients} onChangeText={setIngredients} multiline placeholder={'1 cup rice\n1/2 cup moong dal\n1 onion'} placeholderTextColor="#9AA79F" style={[field, { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' }]} maxLength={2000} />
        </View>
        <View style={{ gap: 6 }}>
          {label('How to make it (one step per line)')}
          <TextInput value={steps} onChangeText={setSteps} multiline placeholder={'Fry the onion until golden\nAdd rice and dal, roast for 2 minutes'} placeholderTextColor="#9AA79F" style={[field, { minHeight: 130, paddingTop: 12, textAlignVertical: 'top' }]} maxLength={4000} />
        </View>
        <View style={{ gap: 6 }}>
          {label('A memory with it (optional)')}
          <TextInput value={story} onChangeText={setStory} multiline placeholder="Nani made this every time it rained" placeholderTextColor="#9AA79F" style={[field, { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' }]} maxLength={500} />
        </View>

        <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel={photo ? 'Change photo' : 'Add a photo'}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 18 }} />
          ) : (
            <View style={{ height: 90, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.lightGreen, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
              <Ionicons name="image-outline" size={24} color={C.leaf} />
              <T w="semibold" color={C.deep}>
                Add a photo of the dish
              </T>
            </View>
          )}
        </Pressable>

        {error ? (
          <T size={14} color="#8A2942">
            {error}
          </T>
        ) : null}
        <Btn label={busy ? 'Saving...' : 'Save to the family book'} icon={busy ? undefined : 'book'} disabled={!canSave} onPress={save} />
        {busy ? <ActivityIndicator color={C.leaf} /> : null}
        <T size={13} color={C.muted} center>
          Only your family can see recipes. Your first one earns the Keeper of Recipes badge.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
