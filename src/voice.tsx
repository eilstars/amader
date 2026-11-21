import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { C } from './theme';
import { Voice } from './types';
import { T } from './ui';

/** Longest voice note, in seconds. Long enough to say what you ate, or how Nani makes khichuri. */
const MAX_SECONDS = 90;

/**
 * Hold a short voice note: tap to start, tap to stop, listen back, or throw it away.
 * For people who would rather say what they ate than type it.
 */
export function VoiceRecorder({ value, onChange, prompt = 'Say what you ate' }: { value: Voice | null; onChange: (v: Voice | null) => void; prompt?: string }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [note, setNote] = useState<string | null>(null);
  const seconds = Math.floor((state.durationMillis ?? 0) / 1000);

  useEffect(() => {
    if (state.isRecording && seconds >= MAX_SECONDS) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, state.isRecording]);

  async function start() {
    setNote(null);
    try {
      const ok = await requestRecordingPermissionsAsync();
      if (!ok.granted) {
        setNote('The microphone is turned off for Amader. You can type instead.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setNote("Recording didn't start. You can type instead.");
    }
  }

  async function stop() {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) onChange({ uri: recorder.uri, seconds: Math.max(1, seconds) });
    } catch {
      setNote("That recording didn't save. Please try again.");
    }
  }

  if (value && !state.isRecording) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <VoicePlayer uri={value.uri} label={`Your voice note, ${value.seconds} seconds`} />
        <Pressable onPress={() => onChange(null)} accessibilityRole="button" accessibilityLabel="Delete voice note" hitSlop={8} style={{ padding: 8 }}>
          <Ionicons name="trash-outline" size={22} color={C.muted} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={state.isRecording ? stop : start}
        accessibilityRole="button"
        accessibilityLabel={state.isRecording ? 'Stop recording' : prompt}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: state.isRecording ? C.pinkSoft : C.white, borderRadius: 18, borderWidth: 1.5, borderColor: state.isRecording ? C.heart : C.line, padding: 12 }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: state.isRecording ? C.heart : C.leaf, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={state.isRecording ? 'stop' : 'mic'} size={22} color={C.white} />
        </View>
        <View style={{ flex: 1 }}>
          <T w="semibold">{state.isRecording ? `Recording... ${seconds}s` : prompt}</T>
          <T size={14} color={C.muted}>
            {state.isRecording ? 'Tap again when you are done' : 'Tap and talk, no typing needed'}
          </T>
        </View>
      </Pressable>
      {note ? (
        <T size={14} color="#8A2942">
          {note}
        </T>
      ) : null}
    </View>
  );
}

/** A play button for a voice note. */
export function VoicePlayer({ uri, label = 'Voice note' }: { uri: string; label?: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;
  const length = Math.round(status.duration || 0);
  return (
    <Pressable
      onPress={() => {
        if (playing) player.pause();
        else {
          if (status.didJustFinish || (status.duration && status.currentTime >= status.duration - 0.1)) player.seekTo(0);
          player.play();
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause voice note' : `Play ${label}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.mint, borderRadius: 999, paddingVertical: 8, paddingLeft: 8, paddingRight: 16, alignSelf: 'flex-start' }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color={C.white} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {[8, 14, 10, 18, 12, 16, 9, 14, 11].map((h, i) => (
          <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: playing ? C.leaf : C.lightGreen }} />
        ))}
      </View>
      <T w="semibold" size={14} color={C.deep}>
        {length > 0 ? `${length}s` : 'Voice'}
      </T>
    </Pressable>
  );
}
