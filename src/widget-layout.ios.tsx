import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, containerBackground, cornerRadius, font, foregroundStyle, frame, widgetURL } from '@expo/ui/swift-ui/modifiers';
import type { WidgetData } from './widget-data';

/**
 * The "Did you eat?" widget for iPhone.
 * Home screen: small and medium. Lock screen: circular, rectangular and inline.
 * Tapping opens the camera. On the medium widget the numbers log a meal in one tap.
 *
 * This function is copied into the widget extension, so it must not use anything
 * from outside itself except the imports above.
 */
const DidYouEat = (props: WidgetData, env: WidgetEnvironment) => {
  'widget';
  const leaf = '#1F7A5A';
  const deep = '#145A41';
  const mint = '#E4F1E9';
  const muted = '#56675E';
  const title = props.eaten ? 'Lovely plate!' : 'Did you eat?';
  const status = `${props.shared} of ${props.total} at the table`;
  const family = env.widgetFamily ?? 'systemSmall';

  if (family === 'accessoryInline') {
    return <Text modifiers={[widgetURL('amader://add')]}>{props.eaten ? status : 'Did you eat?'}</Text>;
  }

  if (family === 'accessoryCircular') {
    return (
      <VStack spacing={1} modifiers={[widgetURL('amader://add')]}>
        <Image systemName={props.eaten ? 'checkmark.circle.fill' : 'fork.knife'} size={18} />
        <Text modifiers={[font({ size: 12, weight: 'semibold' })]}>{`${props.shared}/${props.total}`}</Text>
      </VStack>
    );
  }

  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={2} modifiers={[widgetURL('amader://add')]}>
        <HStack spacing={4}>
          <Image systemName="fork.knife" size={13} />
          <Text modifiers={[font({ size: 15, weight: 'bold' })]}>{title}</Text>
        </HStack>
        <Text modifiers={[font({ size: 13 })]}>{status}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
          {props.eaten ? 'See what the family had' : 'Tap to show your plate'}
        </Text>
      </VStack>
    );
  }

  if (family === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[widgetURL('amader://add'), containerBackground(mint, 'widget')]}>
        <Image systemName={props.eaten ? 'checkmark.circle.fill' : 'fork.knife.circle.fill'} size={30} color={leaf} />
        <Spacer />
        <Text modifiers={[font({ size: 20, weight: 'bold' }), foregroundStyle(deep)]}>{title}</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>{status}</Text>
      </VStack>
    );
  }

  // Medium and larger: the question, plus one-tap logging of the goal food.
  return (
    <VStack alignment="leading" spacing={8} modifiers={[containerBackground(mint, 'widget')]}>
      <HStack spacing={8}>
        <Image systemName={props.eaten ? 'checkmark.circle.fill' : 'fork.knife.circle.fill'} size={26} color={leaf} />
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ size: 18, weight: 'bold' }), foregroundStyle(deep)]}>{title}</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{status}</Text>
        </VStack>
        <Spacer />
      </HStack>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{`How much ${props.goalFood.toLowerCase()}? Tap to log it.`}</Text>
      <HStack spacing={8}>
        <Link destination="amader://add">
          <Image systemName="camera.fill" size={18} color="#FFFFFF" modifiers={[frame({ width: 52, height: 40 }), background(leaf), cornerRadius(12)]} />
        </Link>
        <Link destination="amader://quick?h=1">
          <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(deep), frame({ width: 44, height: 40 }), background('#FFFFFF'), cornerRadius(12)]}>1</Text>
        </Link>
        <Link destination="amader://quick?h=2">
          <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(deep), frame({ width: 44, height: 40 }), background('#FFFFFF'), cornerRadius(12)]}>2</Text>
        </Link>
        <Link destination="amader://quick?h=3">
          <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(deep), frame({ width: 44, height: 40 }), background('#FFFFFF'), cornerRadius(12)]}>3</Text>
        </Link>
        <Link destination="amader://quick?h=4">
          <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(deep), frame({ width: 44, height: 40 }), background('#FFFFFF'), cornerRadius(12)]}>4+</Text>
        </Link>
      </HStack>
    </VStack>
  );
};

export const didYouEatWidget = createWidget<WidgetData>('DidYouEat', DidYouEat, {
  eaten: false,
  shared: 0,
  total: 2,
  goalFood: 'Rice',
  day: '',
});
