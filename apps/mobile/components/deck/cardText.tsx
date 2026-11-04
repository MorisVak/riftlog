import React from 'react';
import { Text } from 'react-native';
import { DOMAINS, type Domain } from '@riftlog/core';
import { InlineRune, domainLabel } from '@/components/deck/domain';

/**
 * A card's rules text as written in the catalog, with Riftbound's icon codes
 * drawn as on the printed card — runes as Riot's rune symbols (":rb_rune_fury:",
 * the rainbow ":rb_rune_rainbow:" = any rune), each with a spoken label; each
 * domain's symbol has its own shape, so color never carries meaning alone —
 * other codes as small labelled chips (":rb_energy_2:" → "2", ":rb_might:" →
 * "Might"), and keywords ("[Deflect]") in bold.
 * The text itself is shown exactly as stored.
 */

const TOKEN = /(:rb_[a-z0-9_]+:|\[[^\]]+\])/g;

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
  return (
    <Text key={key} className="font-display-bold text-ink-primary">
      {token.slice(1, -1)}
    </Text>
  );
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
