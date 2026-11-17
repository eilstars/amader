import { WidgetData, WidgetInput, widgetData } from './widget-data';

/**
 * Pushes today's status to the iPhone home screen and lock screen widgets.
 * Widgets need the installed app (an EAS build). Inside Expo Go the widget
 * module does not exist, so this quietly does nothing there.
 */
export function refreshWidgets(input: WidgetInput): void {
  try {
    // Loaded lazily so the app still starts where widgets are not available.
    const { didYouEatWidget } = require('./widget-layout.ios') as typeof import('./widget-layout.ios');
    const now = new Date();
    const data: WidgetData = widgetData(input, now);
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    didYouEatWidget.updateTimeline([
      { date: now, props: data },
      // At midnight the widget goes back to asking, without the app having to open.
      { date: midnight, props: { ...data, eaten: false, shared: 0, day: midnight.toDateString() } },
    ]);
  } catch {
    // No widget support in this build.
  }
}
