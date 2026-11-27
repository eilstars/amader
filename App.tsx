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
import Teach from './src/screens/Teach';
import SetupFamily from './src/screens/SetupFamily';
import Join from './src/screens/Join';
import Main from './src/screens/Main';
import Onboarding from './src/screens/Onboarding';
import Language from './src/screens/Language';

function codeFromUrl(url: string | null): string | null {
  const match = url ? /[?&#]join=([A-Za-z0-9]+)/.exec(url) : null;
  return match ? cleanCode(match[1]) : null;
}

/** A new-phone link (…#rejoin=TOKEN) puts a person back in their seat after a lost phone or a reinstall. */
function rejoinFromUrl(url: string | null): string | null {
  const match = url ? /[?&#]rejoin=([A-Za-z0-9]{8,32})/.exec(url) : null;
  return match ? match[1] : null;
}

function actionFromUrl(url: string | null): PendingAction | null {
  if (!url) return null;
  // Only the app's own links count. A web page address that happens to contain these words must not log a meal.
  const quick = /^amader:\/\/quick\?h=(\d)$/.exec(url);
  if (quick) return { kind: 'quick', handfuls: Math.min(4, Math.max(0, Number(quick[1]))) };
  if (/^amader:\/\/add\b/.test(url)) return { kind: 'add' };
  return null;
}

function Root() {
  const store = useStore();
  const [step, setStep] = useState<'welcome' | 'setup' | 'join' | 'teach'>('welcome');
  const [justJoined, setJustJoined] = useState(false);
  const [rejoin, setRejoin] = useState<{ token: string; state: 'waiting' | 'failed' } | null>(null);

  // After leaving a family, start again from the first screen, not the screen used to join.
  const hasSession = !!store.session;
  useEffect(() => {
    if (!hasSession) {
      setStep('welcome');
      setJustJoined(false);
    }
  }, [hasSession]);

  // The link uses # so the code never reaches the web host's logs or link previews.
  // An invite link (…#join=CODE) drops the person straight on the join screen.
  useEffect(() => {
    // Widgets and reminders open the app with amader://add or amader://quick?h=2.
    const open = (url: string | null) => {
      const code = codeFromUrl(url);
      if (code) {
        store.setPendingCode(code);
        // On the web, take the code back out of the address bar so it is not passed on in a copied link or a screenshot.
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
      const token = rejoinFromUrl(url);
      if (token) {
        setRejoin({ token, state: 'waiting' });
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
      const action = actionFromUrl(url);
      if (action) store.setPendingAction(action);
    };
    Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener('url', ({ url }) => open(url));
    // Tapping a "Did you eat?" reminder opens the camera.
    let stopReminders = () => {};
    if (Platform.OS !== 'web') {
      import('expo-notifications')
        .then((N) => {
          const fromReminder = (response: { notification: { request: { content: { data?: Record<string, unknown> } } } } | null) => {
            const link = response?.notification.request.content.data?.url;
            if (typeof link === 'string') open(link);
          };
          N.getLastNotificationResponseAsync().then(fromReminder).catch(() => undefined);
          const listener = N.addNotificationResponseReceivedListener(fromReminder);
          stopReminders = () => listener.remove();
        })
        .catch(() => undefined);
    }
    return () => {
      sub.remove();
      stopReminders();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Claim the new-phone link once the saved state has loaded, so loading can't overwrite the claimed seat.
  const ready = store.ready;
  useEffect(() => {
    if (!ready || !rejoin || rejoin.state !== 'waiting') return;
    store.claimRejoin(rejoin.token).then((ok) => setRejoin(ok ? null : { ...rejoin, state: 'failed' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, rejoin]);

  if (!store.ready || rejoin?.state === 'waiting') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.mint }}>
        <Image source={images.logo} style={{ width: 200, height: 139 }} resizeMode="contain" />
      </View>
    );
  }

  // Language comes first, before any words, for people who don't read English.
  if (!store.prefs.lang) return <Language />;

  if (rejoin?.state === 'failed') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16, backgroundColor: C.rice }}>
        <T center w="bold" size={22}>
          This link has already been used or is too old.
        </T>
        <T center color={C.muted}>
          Ask your family for a new one. In Settings, they tap "New phone?" next to your name.
        </T>
        <Btn label="OK" onPress={() => setRejoin(null)} />
      </View>
    );
  }

  if (store.session && store.family) {
    if (!store.prefs.onboarded) return <Onboarding />;
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
        <Btn kind="line" label="Start over on this phone" onPress={() => store.deleteEverything({ onlyThisPhone: true })} />
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
  if (step === 'teach') return <Teach onClose={() => setStep('welcome')} />;
  return <Welcome onSetup={() => setStep('setup')} onJoin={() => setStep('join')} onTeach={() => setStep('teach')} />;
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
