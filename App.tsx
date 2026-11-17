import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PendingAction, StoreProvider, useStore } from './src/store';
import { C, fontFiles, images } from './src/theme';
import { Btn, T } from './src/ui';
import { cleanCode } from './src/words';
import Welcome from './src/screens/Welcome';
import SetupFamily from './src/screens/SetupFamily';
import Join from './src/screens/Join';
import Main from './src/screens/Main';

function codeFromUrl(url: string | null): string | null {
  const match = url ? /[?&]join=([A-Za-z0-9]+)/.exec(url) : null;
  return match ? cleanCode(match[1]) : null;
}

function actionFromUrl(url: string | null): PendingAction | null {
  if (!url) return null;
  const quick = /quick\?h=(\d)/.exec(url);
  if (quick) return { kind: 'quick', handfuls: Math.min(4, Math.max(0, Number(quick[1]))) };
  if (/:\/\/add\b/.test(url)) return { kind: 'add' };
  return null;
}

function Root() {
  const store = useStore();
  const [step, setStep] = useState<'welcome' | 'setup' | 'join'>('welcome');
  const [justJoined, setJustJoined] = useState(false);

  // An invite link (…?join=CODE) drops the person straight on the join screen.
  useEffect(() => {
    // Widgets and reminders open the app with amader://add or amader://quick?h=2.
    const open = (url: string | null) => {
      const code = codeFromUrl(url);
      if (code) store.setPendingCode(code);
      const action = actionFromUrl(url);
      if (action) store.setPendingAction(action);
    };
    Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener('url', ({ url }) => open(url));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!store.ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mint }}>
        <Image source={images.logo} style={{ width: 200, height: 139 }} resizeMode="contain" />
      </View>
    );
  }

  if (store.session && store.family) {
    return <Main openCamera={justJoined} />;
  }

  if (store.session && !store.family) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16, backgroundColor: C.rice }}>
        <ActivityIndicator color={C.leaf} />
        <T center color={C.muted}>
          We can't reach your family table right now. Check your connection and try again.
        </T>
        <Btn label="Try again" onPress={() => store.refresh().catch(() => undefined)} />
        <Btn kind="line" label="Start over" onPress={() => store.deleteEverything()} />
      </View>
    );
  }

  if (step === 'join' || store.pendingCode) {
    return (
      <Join
        onBack={() => {
          store.setPendingCode(null);
          setStep('welcome');
        }}
        onJoined={() => setJustJoined(true)}
      />
    );
  }
  if (step === 'setup') return <SetupFamily onBack={() => setStep('welcome')} />;
  return <Welcome onSetup={() => setStep('setup')} onJoin={() => setStep('join')} />;
}

export default function App() {
  const [fontsLoaded] = useFonts(fontFiles);
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.mint }} />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        {/* On a laptop the app sits in a phone-width column. */}
        <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#E9EEE7' : C.rice, alignItems: 'center' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: C.rice, overflow: 'hidden' }}>
            <Root />
          </View>
        </View>
        <StatusBar style="dark" />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
