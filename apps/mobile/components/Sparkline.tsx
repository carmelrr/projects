import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useMetricHistory } from '@/hooks/useMetrics';
import { useTheme } from '@/lib/theme';

interface Props {
  metricId: string;
  width?: number;
  height?: number;
  color?: string;
}

/** Compact 7-day sparkline used in the metrics list. Hides itself silently if there isn't enough data. */
export function Sparkline({
  metricId,
  width = 80,
  height = 32,
  color,
}: Props) {
  const theme = useTheme();
  const strokeColor = color ?? theme.colors.primary;
  const { data } = useMetricHistory(metricId, 14);
  const points = (data ?? [])
    .slice()
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));

  if (points.length < 2) return null;

  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const PAD = 2;

  const xs = points.map((_, i) => (i / (points.length - 1)) * (width - 2 * PAD) + PAD);
  const ys = points.map(
    (p) => height - PAD - ((p.value - min) / range) * (height - 2 * PAD),
  );

  const path = xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`)
    .join(' ');
  const area = `${path} L${xs[xs.length - 1].toFixed(1)},${height} L${xs[0].toFixed(1)},${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`sl-${metricId}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={strokeColor} stopOpacity={0.25} />
          <Stop offset="1" stopColor={strokeColor} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#sl-${metricId})`} />
      <Path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
