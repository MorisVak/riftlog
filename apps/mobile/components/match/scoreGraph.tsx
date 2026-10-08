import React, { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import type { ScoreStep, ScoringAction } from '@riftlog/core';
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

// Your line is colored by HOW each point was scored: from a point until the
// next one, the run (and the step up into it) takes that point's action color
// — the board's own conquer / hold / special tokens. Before your first point
// it's the standard accent. The opponent stays one muted color, so the two
// lines can never be confused.
//
// Checked with the dataviz palette validator against the `surface` card:
// action colors + opponent separate (worst ΔE 17.6 normal, 8.8 under CVD).
// The accent start and Special pink are close for protan vision (ΔE 2.8) —
// the accent only ever appears as the flat run at 0 before your first point,
// so position tells them apart. The muted opponent line is below 3:1
// contrast, so both lines are always direct-labeled and in the legend.
const BASE = { you: 'bg-accent', them: 'bg-ink-tertiary' } as const;

const ACTION_BG: Record<ScoringAction, string> = {
  conquer: 'bg-conquer',
  hold: 'bg-hold',
  special: 'bg-special',
};

const youColor = (step: ScoreStep): string =>
  step.action ? ACTION_BG[step.action] : BASE.you;
const themColor = (): string => BASE.them;

const LEGEND: { label: string; color: string }[] = [
  { label: 'Conquer', color: ACTION_BG.conquer },
  { label: 'Hold', color: ACTION_BG.hold },
  { label: 'Special', color: ACTION_BG.special },
];

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
  colorFor,
}: {
  steps: ScoreStep[];
  endMs: number;
  pos: Pos;
  /** A run takes its starting step's color; a step up takes the new step's. */
  colorFor: (step: ScoreStep) => string;
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
            className={`absolute rounded-full ${colorFor(s)}`}
            style={{
              left: x1,
              top: y - LINE / 2,
              width: Math.max(x2 - x1, LINE),
              height: LINE,
            }}
          />
          {next && (
            <View
              className={`absolute rounded-full ${colorFor(next)}`}
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
      {/* Legend: what your line's colors mean, and the opponent's line.
          Text in ink tokens; the colored dots carry identity. */}
      <View
        className="mb-2 flex-row flex-wrap items-center gap-x-3 gap-y-1"
        importantForAccessibility="no-hide-descendants"
      >
        <Text className="text-[12px] text-ink-secondary">You:</Text>
        {LEGEND.map((l) => (
          <View key={l.label} className="flex-row items-center gap-1.5">
            <View className={`h-2 w-2 rounded-full ${l.color}`} />
            <Text className="text-[12px] text-ink-secondary">{l.label}</Text>
          </View>
        ))}
        <View className="ml-1 flex-row items-center gap-1.5">
          <View className={`h-2 w-2 rounded-full ${BASE.them}`} />
          <Text className="text-[12px] text-ink-secondary">Opponent</Text>
        </View>
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
              colorFor={themColor}
            />
            <StepLine
              steps={graph.you}
              endMs={graph.durationMs}
              pos={pos}
              colorFor={youColor}
            />

            {/* End markers with a surface ring, so overlapping ends stay
                distinct. Yours matches your line's final color. */}
            {(
              [
                ['them', themFinal, BASE.them],
                ['you', youFinal, youColor(graph.you.at(-1) ?? graph.you[0]!)],
              ] as const
            ).map(([k, score, color]) => (
              <View
                key={k}
                className={`absolute rounded-full border-2 border-surface ${color}`}
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
