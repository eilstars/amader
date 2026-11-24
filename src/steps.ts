/**
 * Steps the phone counted recently, for the walk quest. Only iPhone can look back in time,
 * so Android and the web return null (see steps.ios.ts).
 */
export async function recentSteps(_hours = 3): Promise<number | null> {
  return null;
}
