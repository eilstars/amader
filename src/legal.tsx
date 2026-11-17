import React from 'react';
import { Linking, Platform } from 'react-native';
import { webUrl } from './backend';
import { C } from './theme';
import { T } from './ui';

/** How long meals and photos are kept. The cleanup function (supabase/functions/cleanup) enforces it; keep the three in step with the privacy policy. */
export const KEEP_MONTHS = 12;

type Page = 'privacy' | 'terms' | 'health-data';

/** The policy pages live next to the web app (public/*.html). Null when the app has no web address to point at. */
export function legalUrl(page: Page): string | null {
  const base = webUrl || (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : '');
  return base ? `${base}/${page}.html` : null;
}

function Doc({ page, label }: { page: Page; label: string }) {
  const url = legalUrl(page);
  if (!url) return <>{label}</>;
  return (
    <T size={12} color={C.deep} w="semibold" style={{ textDecorationLine: 'underline' }} accessibilityRole="link" onPress={() => Linking.openURL(url)}>
      {label}
    </T>
  );
}

/** "Terms, Privacy Policy and Consumer Health Data Policy", each a link when there is somewhere to open it. */
export function PolicyLinks() {
  return (
    <>
      <Doc page="terms" label="Terms" />, <Doc page="privacy" label="Privacy Policy" /> and <Doc page="health-data" label="Consumer Health Data Policy" />
    </>
  );
}
