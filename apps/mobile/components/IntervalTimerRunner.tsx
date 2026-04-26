import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Pause, Play, SkipForward, X, type LucideIcon } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/lib/theme';
import { Text, Icon } from '@/components/ui';
import type { IntervalTimerConfig } from '@/hooks/useWorkouts';

// ── Phase machine ──────────────────────────────────────────────────────────

type Phase = 'PREPARE' | 'WORK' | 'REST' | 'SET_REST' | 'DONE';

interface PhaseSegment {
  phase: Phase;
  /** Length in seconds for this segment. */
  seconds: number;
  /** 1-based round index inside the current set (0 for prep / set-rest). */
  round: number;
  /** 1-based set index. */
  set: number;
  /** Resolved round name to display, if available. */
  roundName?: string;
  /** Resolved round description (cue) to display, if available. */
  roundDescription?: string;
  /** Convenience: name of the upcoming round during REST. */
  nextRoundName?: string;
}

function buildSegments(cfg: IntervalTimerConfig): PhaseSegment[] {
  const segs: PhaseSegment[] = [];
  const rounds = Math.max(1, cfg.rounds);
  const sets = Math.max(1, cfg.sets);
  const intervalsList = cfg.intervals ?? [];
  const roundMeta = (round: number) => intervalsList[round - 1];
  const roundName = (round: number) =>
    roundMeta(round)?.name?.trim() || undefined;
  const roundDesc = (round: number) =>
    roundMeta(round)?.description?.trim() || undefined;

  if (cfg.prepareSec > 0) {
    segs.push({
      phase: 'PREPARE',
      seconds: cfg.prepareSec,
      round: 0,
      set: 1,
      roundName: 'Get ready',
      nextRoundName: roundName(1),
    });
  }

  for (let s = 1; s <= sets; s += 1) {
    for (let r = 1; r <= rounds; r += 1) {
      segs.push({
        phase: 'WORK',
        seconds: cfg.workSec,
        round: r,
        set: s,
        roundName: roundName(r),
        roundDescription: roundDesc(r),
      });
      const isLastRound = r === rounds;
      const isLastSet = s === sets;
      if (!isLastRound && cfg.restSec > 0) {
        segs.push({
          phase: 'REST',
          seconds: cfg.restSec,
          round: r,
          set: s,
          roundName: 'Rest',
          nextRoundName: roundName(r + 1),
        });
      } else if (isLastRound && !isLastSet && cfg.restBetweenSetsSec > 0) {
        segs.push({
          phase: 'SET_REST',
          seconds: cfg.restBetweenSetsSec,
          round: r,
          set: s,
          roundName: 'Set rest',
          nextRoundName: roundName(1),
        });
      }
    }
  }

  return segs;
}

function formatTime(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  config: IntervalTimerConfig;
  onComplete: (info: { totalWorkSec: number; completed: boolean }) => void;
  onCancel: () => void;
}

export function IntervalTimerRunner({ config, onComplete, onCancel }: Props) {
  const theme = useTheme();
  const segments = useMemo(() => buildSegments(config), [config]);
  const [segIndex, setSegIndex] = useState(0);
  const [remaining, setRemaining] = useState(segments[0]?.seconds ?? 0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(segments.length === 0);
  const totalWorkRef = useRef(0);

  const current: PhaseSegment | undefined = segments[segIndex];

  // Phase color ("WORK" green, "REST" orange, etc.)
  const phaseColor = (() => {
    if (done) return theme.colors.primary;
    switch (current?.phase) {
      case 'WORK':
        return theme.colors.success;
      case 'REST':
      case 'SET_REST':
        return theme.colors.warning;
      case 'PREPARE':
        return theme.colors.mutedForeground;
      default:
        return theme.colors.primary;
    }
  })();
  const bgTint = withAlpha(phaseColor, 0.12);

  // Drive the countdown.
  useEffect(() => {
    if (!running || done) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1) {
          // Final-3-seconds tick haptic.
          if (prev <= 4) {
            Haptics.selectionAsync().catch(() => {});
          }
          return prev - 1;
        }
        // Segment finished. Advance.
        const finished = segments[segIndex];
        if (finished?.phase === 'WORK') {
          totalWorkRef.current += finished.seconds;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        } else if (finished?.phase === 'REST' || finished?.phase === 'SET_REST') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        } else {
          Haptics.selectionAsync().catch(() => {});
        }
        const nextIdx = segIndex + 1;
        if (nextIdx >= segments.length) {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
          setDone(true);
          setRunning(false);
          return 0;
        }
        setSegIndex(nextIdx);
        return segments[nextIdx].seconds;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, done, segIndex, segments]);

  // Completion handoff.
  useEffect(() => {
    if (done) {
      onComplete({ totalWorkSec: totalWorkRef.current, completed: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const handleStartPause = () => {
    if (done) return;
    Haptics.selectionAsync().catch(() => {});
    setRunning((r) => !r);
  };

  const handleSkip = () => {
    if (done) return;
    Haptics.selectionAsync().catch(() => {});
    const finished = segments[segIndex];
    if (finished?.phase === 'WORK') {
      // Treat skipped work as fully completed time-wise (best-effort).
      totalWorkRef.current += finished.seconds - remaining;
    }
    const nextIdx = segIndex + 1;
    if (nextIdx >= segments.length) {
      setDone(true);
      setRunning(false);
      return;
    }
    setSegIndex(nextIdx);
    setRemaining(segments[nextIdx].seconds);
  };

  const handleStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRunning(false);
    onCancel();
  };

  // Header label.
  const headerLabel = (() => {
    if (done) return 'DONE';
    switch (current?.phase) {
      case 'WORK':
        return 'WORK';
      case 'REST':
        return 'REST';
      case 'SET_REST':
        return 'SET REST';
      case 'PREPARE':
        return 'GET READY';
      default:
        return '';
    }
  })();

  const totalRounds = Math.max(1, config.rounds);
  const totalSets = Math.max(1, config.sets);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bgTint,
        paddingHorizontal: theme.spacing[5],
      }}
    >
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: theme.spacing[4],
          paddingBottom: theme.spacing[3],
        }}
      >
        <Pressable
          onPress={handleStop}
          accessibilityLabel="Stop timer"
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Icon icon={X} size={24} color="mutedForeground" />
        </Pressable>
        <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {config.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: theme.spacing[6],
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Phase label */}
        <Text
          variant="eyebrow"
          weight="700"
          tabular
          style={{
            color: phaseColor,
            letterSpacing: 4,
            fontSize: 18,
            marginBottom: theme.spacing[2],
          }}
        >
          {running || done ? headerLabel : 'PAUSED'}
        </Text>

        {/* Big number */}
        <Text
          tabular
          style={{
            color: phaseColor,
            fontSize: 128,
            lineHeight: 136,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
          }}
          accessibilityLabel={`${remaining} seconds remaining`}
        >
          {done ? '✓' : formatTime(remaining)}
        </Text>

        {/* Round name */}
        {!done && current?.roundName ? (
          <Text
            variant="h2"
            style={{ marginTop: theme.spacing[3], textAlign: 'center' }}
          >
            {current.roundName}
          </Text>
        ) : null}
        {!done && current?.roundDescription ? (
          <Text
            variant="body"
            color="mutedForeground"
            style={{ marginTop: theme.spacing[1], textAlign: 'center' }}
          >
            {current.roundDescription}
          </Text>
        ) : null}

        {/* Next preview */}
        {!done && current?.nextRoundName && current?.phase !== 'WORK' ? (
          <Text
            variant="caption"
            color="mutedForeground"
            style={{ marginTop: theme.spacing[2] }}
          >
            Next: {current.nextRoundName}
          </Text>
        ) : null}

        {/* Round/set counter */}
        {!done && current && current.round > 0 ? (
          <Text
            variant="bodyMedium"
            color="mutedForeground"
            style={{ marginTop: theme.spacing[4] }}
            tabular
          >
            Round {current.round} / {totalRounds}
            {totalSets > 1 ? `   ·   Set ${current.set} / ${totalSets}` : ''}
          </Text>
        ) : null}

        {done ? (
          <Text
            variant="body"
            color="mutedForeground"
            style={{ marginTop: theme.spacing[3], textAlign: 'center' }}
          >
            Block complete — total work {formatTime(totalWorkRef.current)}
          </Text>
        ) : null}
      </ScrollView>

      {/* Controls */}
      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing[3],
          paddingBottom: theme.spacing[6],
          paddingTop: theme.spacing[2],
        }}
      >
        <ControlButton
          label={running ? 'Pause' : done ? 'Continue' : 'Start'}
          icon={running ? Pause : Play}
          onPress={done ? onCancel : handleStartPause}
          tone="primary"
        />
        <ControlButton
          label="Skip"
          icon={SkipForward}
          onPress={handleSkip}
          disabled={done}
          tone="muted"
        />
      </View>
    </View>
  );
}

// ── Control button ────────────────────────────────────────────────────────

function ControlButton({
  label,
  icon,
  onPress,
  tone,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  tone: 'primary' | 'muted';
  disabled?: boolean;
}) {
  const theme = useTheme();
  const bg =
    tone === 'primary' ? theme.colors.primary : theme.colors.muted;
  const fg =
    tone === 'primary'
      ? theme.colors.primaryForeground
      : theme.colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: bg,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        paddingVertical: theme.spacing[4],
        borderRadius: theme.radii.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: theme.spacing[2],
      })}
    >
      <Icon icon={icon} size={20} accessible={false} color={fg} />
      <Text variant="bodyMedium" weight="700" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}
