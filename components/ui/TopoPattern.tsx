import { useMemo } from 'react';
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

/** Faint peach contour lines, absolutely filling the parent. */
export default function TopoPattern({ seed, width, height }: Props) {
  const vbH = width > 0 ? (VB_W * height) / width : 0;
  const paths = useMemo(() => topoPaths(seed, VB_W, vbH), [seed, vbH]);
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
      {paths.map((d, i) => (
        <Path key={i} d={d} fill="none" stroke={colors.peach} strokeOpacity={0.22} strokeWidth={0.8} />
      ))}
    </Svg>
  );
}
