import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildCatalogIndex, type Catalog, type CatalogIndex } from '@riftlog/core';
import { readCachedCatalog, syncCatalog } from '@/lib/catalog';

/**
 * The card catalog for every deck surface: loaded from the device cache at
 * launch, then brought up to date (one version check; a full download only
 * when the catalog changed). `index` is null until a catalog exists — before
 * the first download, offline — and every consumer copes with that by showing
 * the deck as written, without types or art.
 */

type CatalogContextType = {
  index: CatalogIndex | null;
  /** Re-check the version, e.g. when a deck screen opens. Throttled. */
  refresh: () => void;
};

const CatalogContext = createContext<CatalogContextType | null>(null);

/** Don't re-check more often than this; the catalog changes rarely. */
const RECHECK_MS = 5 * 60 * 1000;

const CatalogProvider = ({ children }: { children: React.ReactNode }) => {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const versionRef = useRef<number | null>(null);
  const lastCheck = useRef(0);
  const inFlight = useRef(false);

  const sync = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    lastCheck.current = Date.now();
    try {
      const fresh = await syncCatalog(versionRef.current);
      if (fresh) {
        versionRef.current = fresh.version;
        setCatalog(fresh);
      }
    } catch (e) {
      // Offline or a server hiccup: keep whatever we have.
      if (__DEV__) console.warn('[catalog] sync failed:', e);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readCachedCatalog();
      if (cancelled) return;
      if (cached) {
        versionRef.current = cached.version;
        setCatalog(cached);
      }
      await sync();
    })();
    return () => {
      cancelled = true;
    };
  }, [sync]);

  const refresh = useCallback(() => {
    if (Date.now() - lastCheck.current >= RECHECK_MS) void sync();
  }, [sync]);

  const index = useMemo(() => (catalog ? buildCatalogIndex(catalog) : null), [catalog]);
  const value = useMemo(() => ({ index, refresh }), [index, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = (): CatalogContextType => {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside CatalogProvider');
  return ctx;
};

export default CatalogProvider;
