import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/lib/ui/theme';

// Line icons copied from the topo-v23 mockup sprite (24x24, stroke only).
const ICONS = {
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-4-4" />
    </>
  ),
  gear: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </>
  ),
  camera: (
    <>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx="12" cy="13" r="3.5" />
    </>
  ),
  send: <Path d="M12 19V5M6 11l6-6 6 6" />,
  calc: (
    <>
      <Rect x="5" y="3" width="14" height="18" rx="2.5" />
      {/* h0 dots of the mockup need a tiny length to draw round caps on native */}
      <Path d="M8.5 7h7M8.5 12h1M12 12h1M15.5 12h0.01M8.5 16h1M12 16h1M15.5 16h0.01" />
    </>
  ),
  back: <Path d="M15 5l-7 7 7 7" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  check: <Path d="M5 12l5 5 9-9" />,
  edit: <Path d="M4 20h4L19 9l-4-4L4 16z" />,
  tag: (
    <>
      <Path d="M3 12V4h8l10 10-8 8z" />
      <Circle cx="7.5" cy="8.5" r="1" />
    </>
  ),
  chat: <Path d="M4 5h16v11H9l-5 4z" />,
  pin: <Path d="M9 3h6l-1 6 3 3H7l3-3zM12 12v9" />,
  arrow: <Path d="M4 12h16M14 6l6 6-6 6" />,
  mail: (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M3 7l9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <Rect x="5" y="11" width="14" height="9" rx="2" />
      <Path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  eye: (
    <>
      <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  bowl: (
    <>
      <Path d="M3 11h18a9 9 0 01-18 0z" />
      <Path d="M8 7c0-1.5 1.5-1.5 1.5-3M13 7c0-1.5 1.5-1.5 1.5-3" />
    </>
  ),
  leaf: (
    <>
      <Path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14z" />
      <Path d="M5 19l8-8" />
    </>
  ),
  backspace: (
    <>
      <Path d="M9 5h11v14H9l-6-7z" />
      <Path d="M12.5 9.5l5 5M17.5 9.5l-5 5" />
    </>
  ),
  close: <Path d="M6 6l12 12M18 6L6 18" />,
};

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function Icon({ name, size = 20, color = colors.text, strokeWidth = 1.8 }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      pointerEvents="none"
    >
      {ICONS[name]}
    </Svg>
  );
}
