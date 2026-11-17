import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// The Android home screen widget draws itself in the background, so its handler
// is registered here, outside the app screen. It is skipped where widgets are
// not available (Expo Go, iPhone, web).
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./src/widgets');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // No widget support in this build.
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
