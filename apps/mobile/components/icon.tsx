import { Feather } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';

/**
 * Feather, but colored by a token class instead of a hex prop:
 *
 *   <Icon name="user" size={20} className="text-ink-tertiary" />
 *
 * Feather's `color` is a prop, not a style, so a `text-*` class does nothing on
 * the raw component. This mapping routes the class's resolved color into that
 * prop — which is what lets icons follow tailwind.config.js without mirroring
 * token values as hex constants in each screen.
 */
const Icon = cssInterop(Feather, {
  className: { target: 'style', nativeStyleToProp: { color: true } },
});

export default Icon;
