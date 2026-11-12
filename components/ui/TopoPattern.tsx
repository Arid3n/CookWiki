import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/lib/ui/theme';
import { topoPaths } from './topo';

// The mockup draws rings in a 260-wide viewBox; keep that scale so ring sizes match on any phone.
const VB_W = 260;

interface Props {
  seed: number;
  width: number;
  height: number;
}

/** Faint dark contour lines, absolutely filling the parent. */
function TopoPattern({ seed, width, height }: Props) {
  const vbH = width > 0 ? (VB_W * height) / width : 0;
  // One <Path> for all rings: a single native view instead of ~33 keeps screen mount and transitions cheap.
  const d = useMemo(() => topoPaths(seed, VB_W, vbH).join(' '), [seed, vbH]);
  if (width <= 0 || height <= 0) return null;
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${vbH}`}
      preserveAspectRatio="xMidYMid slice"
      pointerEvents="none"
    >
      <Path d={d} fill="none" stroke={colors.onHero} strokeOpacity={0.16} strokeWidth={0.8} />
    </Svg>
  );
}

export default memo(TopoPattern);
