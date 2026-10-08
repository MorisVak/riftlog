import React, { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import type { ScoreStep } from '@riftlog/core';
import type { GameGraphVM } from '@/lib/matchDetailView';

const PLOT_H = 72;
/** Room above the top score for the end marker. */
const PAD_TOP = 6;
/** Right gutter for the final-score labels at each line's end. */
const LABEL_W = 26;
const LINE = 2;
const MARKER = 8;
/** End labels closer than this get nudged apart. */
const LABEL_GAP = 13;

// Series colors (validated with the dataviz palette checker against the
// `surface` card: ΔE 17.3 normal vision / 16.8 under CVD simulation). The
// opponent line is the deliberately muted context series — its contrast is
// below 3:1, which is why both lines are always direct-labeled with their
// final score and named in the legend.
const SERIES = {
  you: { line: 'bg-accent', name: 'You' },
  them: { line: 'bg-ink-tertiary', name: 'Opponent' },
} as const;

type Pos = { x: (ms: number) => number; y: (score: number) => number };

/**
 * One player's score as a step line: flat while nothing happens, a vertical
 * step at each point. Drawn from plain Views (no SVG dependency): a horizontal
 * bar per run, a vertical bar per step.
 */
const StepLine = ({
  steps,
  endMs,
  pos,
  color,
}: {
  steps: ScoreStep[];
  endMs: number;
  pos: Pos;
  color: string;
}) => (
  <>
    {steps.map((s, i) => {
      const next = steps[i + 1];
      const x1 = pos.x(s.atMs);
      const x2 = pos.x(next ? next.atMs : endMs);
      const y = pos.y(s.score);
      return (
        <React.Fragment key={i}>
          <View
            className={`absolute rounded-full ${color}`}
            style={{
              left: x1,
              top: y - LINE / 2,
              width: Math.max(x2 - x1, LINE),
              height: LINE,
            }}
          />
          {next && (
            <View
              className={`absolute rounded-full ${color}`}
              style={{
                left: x2 - LINE / 2,
                top: pos.y(next.score) - LINE / 2,
                width: LINE,
                height: y - pos.y(next.score) + LINE,
              }}
            />
          )}
        </React.Fragment>
      );
    })}
  </>
);

/**
 * The match detail's per-game score race: your line and the opponent's over
 * game time, from the points that stood (take-backs are already netted out).
 * Deliberately low-detail — no per-point labels; the final scores label the
 * line ends, the axis shows start and game length, and screen readers get a
 * one-sentence summary instead of the drawing.
 */
const ScoreGraph = ({ graph }: { graph: GameGraphVM }) => {
  const [width, setWidth] = useState(0);
  const plotW = Math.max(width - LABEL_W, 1);

  const pos: Pos = {
    x: (ms) => (Math.min(ms, graph.durationMs) / graph.durationMs) * plotW,
    y: (score) => PAD_TOP + (PLOT_H - PAD_TOP) * (1 - score / graph.maxScore),
  };

  const youFinal = graph.you.at(-1)?.score ?? 0;
  const themFinal = graph.them.at(-1)?.score ?? 0;
  // End labels: at each line's final height, pushed apart if they'd collide.
  let youLabelY = pos.y(youFinal);
  let themLabelY = pos.y(themFinal);
  if (Math.abs(youLabelY - themLabelY) < LABEL_GAP) {
    const mid = (youLabelY + themLabelY) / 2;
    const youAbove = youFinal >= themFinal;
    youLabelY = mid + (youAbove ? -LABEL_GAP / 2 : LABEL_GAP / 2);
    themLabelY = mid + (youAbove ? LABEL_GAP / 2 : -LABEL_GAP / 2);
  }

  return (
    <View accessible accessibilityLabel={graph.summary}>
      {/* Legend: always present for two series, text in ink tokens. */}
      <View
        className="mb-2 flex-row gap-4"
        importantForAccessibility="no-hide-descendants"
      >
        {(['you', 'them'] as const).map((k) => (
          <View key={k} className="flex-row items-center gap-1.5">
            <View className={`h-2 w-2 rounded-full ${SERIES[k].line}`} />
            <Text className="text-[12px] text-ink-secondary">
              {SERIES[k].name}
            </Text>
          </View>
        ))}
      </View>

      <View
        onLayout={(e: LayoutChangeEvent) =>
          setWidth(e.nativeEvent.layout.width)
        }
        style={{ height: PLOT_H }}
        importantForAccessibility="no-hide-descendants"
      >
        {width > 0 && (
          <>
            {/* Recessive baseline: score 0. */}
            <View
              className="absolute h-px bg-border"
              style={{ left: 0, top: pos.y(0), width: plotW }}
            />
            {/* Context first, focus on top. */}
            <StepLine
              steps={graph.them}
              endMs={graph.durationMs}
              pos={pos}
              color={SERIES.them.line}
            />
            <StepLine
              steps={graph.you}
              endMs={graph.durationMs}
              pos={pos}
              color={SERIES.you.line}
            />

            {/* End markers with a surface ring, so overlapping ends stay
                distinct. */}
            {(
              [
                ['them', themFinal],
                ['you', youFinal],
              ] as const
            ).map(([k, score]) => (
              <View
                key={k}
                className={`absolute rounded-full border-2 border-surface ${SERIES[k].line}`}
                style={{
                  left: plotW - (MARKER + 4) / 2,
                  top: pos.y(score) - (MARKER + 4) / 2,
                  width: MARKER + 4,
                  height: MARKER + 4,
                }}
              />
            ))}

            {/* Direct labels: the final score at each line's end. */}
            <Text
              className="absolute font-mono-medium text-[12px] text-ink-primary"
              style={{ left: plotW + 8, top: youLabelY - 8 }}
            >
              {youFinal}
            </Text>
            <Text
              className="absolute font-mono-medium text-[12px] text-ink-secondary"
              style={{ left: plotW + 8, top: themLabelY - 8 }}
            >
              {themFinal}
            </Text>
          </>
        )}
      </View>

      <View
        className="mt-1.5 flex-row justify-between"
        style={{ marginRight: LABEL_W }}
        importantForAccessibility="no-hide-descendants"
      >
        <Text className="font-mono-medium text-[11px] text-ink-tertiary">
          00:00
        </Text>
        <Text className="font-mono-medium text-[11px] text-ink-tertiary">
          {graph.durationLabel}
        </Text>
      </View>
    </View>
  );
};

export default ScoreGraph;
