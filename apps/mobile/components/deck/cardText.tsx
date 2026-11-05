import React from 'react';
import { Text, View } from 'react-native';
import { DOMAINS, type Domain } from '@riftlog/core';
import { InlineRune, domainLabel } from '@/components/deck/domain';

/**
 * A card's rules text as written in the catalog, with Riftbound's icon codes
 * drawn as on the printed card — runes as Riot's rune symbols (":rb_rune_fury:",
 * the rainbow ":rb_rune_rainbow:" = any rune), each with a spoken label; each
 * domain's symbol has its own shape, so color never carries meaning alone —
 * other codes as small labelled chips (":rb_energy_2:" → "2", ":rb_might:" →
 * "Might"), and keywords ("[Deflect]") as the slanted badges the cards print,
 * in their four colors (see `KEYWORD_GROUP`).
 * The text itself is shown exactly as stored.
 */

const TOKEN = /(:rb_[a-z0-9_]+:|\[[^\]]+\])/g;

/**
 * Each keyword's badge color, as printed on the cards. Keyed by the keyword
 * without a trailing number ("Assault 2" → "assault"); anything unlisted is
 * gray. Full class names, since NativeWind can't compile built ones.
 */
type KeywordGroup = 'teal' | 'pink' | 'lime' | 'gray';
const KEYWORD_GROUP: Record<string, KeywordGroup> = {
  action: 'teal', reaction: 'teal', accelerate: 'teal', ambush: 'teal', deploy: 'teal', flow: 'teal',
  hidden: 'teal', legion: 'teal', 'quick-draw': 'teal', repeat: 'teal', 'show off': 'teal',
  assault: 'pink', backline: 'pink', disarm: 'pink', shield: 'pink', tank: 'pink',
  deathknell: 'lime', deflect: 'lime', empowered: 'lime', ganking: 'lime', hunt: 'lime', level: 'lime',
  temporary: 'lime',
};
const KEYWORD_CLASSES: Record<KeywordGroup, { bg: string; text: string }> = {
  teal: { bg: 'bg-keyword-teal', text: 'text-ink-primary' },
  pink: { bg: 'bg-keyword-pink', text: 'text-ink-primary' },
  lime: { bg: 'bg-keyword-lime', text: 'text-background' },
  gray: { bg: 'bg-keyword-gray', text: 'text-ink-primary' },
};

/** A keyword badge, slanted like the printed one; read out as the keyword itself. */
const KeywordBadge = ({ keyword }: { keyword: string }) => {
  const group = KEYWORD_GROUP[keyword.replace(/\s*\d+$/, '').toLowerCase()] ?? 'gray';
  const c = KEYWORD_CLASSES[group];
  return (
    <View
      accessible
      accessibilityLabel={keyword}
      // Inline views sit on the baseline; drop it to the text's middle.
      style={{ transform: [{ translateY: 4 }, { skewX: '-12deg' }] }}
      className={`mx-0.5 rounded-[3px] px-1.5 py-px ${c.bg}`}
    >
      <Text className={`font-display-bold text-[11px] uppercase tracking-wide ${c.text}`}>{keyword}</Text>
    </View>
  );
};

const isDomain = (d: string): d is Domain => (DOMAINS as readonly string[]).includes(d);

const Chip = ({ label, className, a11y }: { label: string; className: string; a11y: string }) => (
  <Text accessibilityLabel={a11y} className={`font-mono-medium text-[12px] ${className}`}>
    {` ${label} `}
  </Text>
);

function renderToken(token: string, key: number): React.ReactNode {
  const energy = /^:rb_energy_(\d+):$/.exec(token);
  if (energy) {
    return <Chip key={key} label={energy[1] ?? ''} a11y={`${energy[1]} energy`} className="bg-elevated text-ink-primary" />;
  }
  const rune = /^:rb_rune_([a-z]+):$/.exec(token);
  if (rune?.[1]) {
    const d = rune[1];
    if (d === 'rainbow' || isDomain(d)) {
      const domain = d === 'rainbow' ? null : d;
      return (
        <Text key={key} accessibilityLabel={domain ? `${domainLabel(domain)} rune` : 'any rune'}>
          {' '}
          <InlineRune domain={domain} size={15} />{' '}
        </Text>
      );
    }
  }
  if (token === ':rb_might:') return <Chip key={key} label="Might" a11y="Might" className="bg-elevated text-ink-primary" />;
  if (token === ':rb_exhaust:') return <Chip key={key} label="Exhaust" a11y="Exhaust" className="bg-elevated text-ink-primary" />;
  if (token.startsWith(':rb_')) {
    // An icon we don't know yet: show its name rather than the raw code.
    const name = token.slice(4, -1).replace(/_/g, ' ');
    return <Chip key={key} label={name} a11y={name} className="bg-elevated text-ink-secondary" />;
  }
  // [>] and [>>] separate a condition from its effect.
  if (token === '[>]' || token === '[>>]') return <Text key={key}>{' → '}</Text>;
  return <KeywordBadge key={key} keyword={token.slice(1, -1)} />;
}

const CardText = ({ text, className = '' }: { text: string; className?: string }) => {
  if (text.trim() === '') {
    return <Text className={`text-[14px] text-ink-tertiary ${className}`}>No rules text.</Text>;
  }
  const parts = text.split(TOKEN);
  return (
    <Text className={`text-[15px] leading-6 text-ink-primary ${className}`}>
      {parts.map((part, i) => (i % 2 === 1 ? renderToken(part, i) : part))}
    </Text>
  );
};

export default CardText;
