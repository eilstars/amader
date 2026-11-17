import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WidgetData, WidgetInput, widgetData } from './widget-data';

const KEY = 'amader.widget';
const EMPTY: WidgetData = { eaten: false, shared: 0, total: 2, goalFood: 'Rice', day: '' };

type Lib = typeof import('react-native-android-widget');

/** The "Did you eat?" home screen widget for Android. Tapping opens the camera; the numbers log a meal in one tap. */
function layout(lib: Lib, saved: WidgetData) {
  const { FlexWidget, TextWidget } = lib;
  // A widget saved yesterday goes back to asking.
  const data = saved.day === new Date().toDateString() ? saved : { ...saved, eaten: false, shared: 0 };
  const chip = (label: string, uri: string, filled = false) => (
    <FlexWidget
      key={label}
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{ height: 40, width: filled ? 64 : 44, borderRadius: 12, backgroundColor: filled ? '#1F7A5A' : '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
    >
      <TextWidget text={label} style={{ fontSize: 16, fontWeight: '600', color: filled ? '#FFFFFF' : '#145A41' }} />
    </FlexWidget>
  );
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'amader://add' }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#E4F1E9', borderRadius: 24, padding: 16, justifyContent: 'space-between' }}
    >
      <FlexWidget>
        <TextWidget text={data.eaten ? 'Lovely plate!' : 'Did you eat?'} style={{ fontSize: 20, fontWeight: '700', color: '#145A41' }} />
        <TextWidget text={`${data.shared} of ${data.total} at the table`} style={{ fontSize: 13, color: '#56675E' }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        {chip('Photo', 'amader://add', true)}
        {chip('1', 'amader://quick?h=1')}
        {chip('2', 'amader://quick?h=2')}
        {chip('3', 'amader://quick?h=3')}
        {chip('4+', 'amader://quick?h=4')}
      </FlexWidget>
    </FlexWidget>
  );
}

async function saved(): Promise<WidgetData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as WidgetData) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Android calls this in the background when the widget is added, resized or due for a refresh. */
export async function widgetTaskHandler(props: import('react-native-android-widget').WidgetTaskHandlerProps) {
  const lib = require('react-native-android-widget') as Lib;
  if (props.widgetAction === 'WIDGET_ADDED' || props.widgetAction === 'WIDGET_UPDATE' || props.widgetAction === 'WIDGET_RESIZED') {
    props.renderWidget(layout(lib, await saved()));
  }
}

/**
 * Pushes today's status to the Android home screen widget.
 * Widgets need the installed app (an EAS build). Inside Expo Go the widget
 * module does not exist, so this quietly does nothing there.
 */
export function refreshWidgets(input: WidgetInput): void {
  const data = widgetData(input);
  AsyncStorage.setItem(KEY, JSON.stringify(data))
    .then(() => {
      const lib = require('react-native-android-widget') as Lib;
      return lib.requestWidgetUpdate({ widgetName: 'DidYouEat', renderWidget: () => layout(lib, data), widgetNotFound: () => undefined });
    })
    .catch(() => undefined);
}
