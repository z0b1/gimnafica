"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { KitchenSummary } from "@/lib/orders";
import { COFFEES, ORDERS, formatDuration, formatTime, plural } from "@/lib/strings";
import { closeRound } from "./actions";

const POLL_MS = 3000;
const HIGHLIGHT_MS = 15_000;
const SOUND_PREF_KEY = "gimnafica:kitchen-sound";

/** Short two-note chime, synthesized so no audio file is needed. */
function playChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.18;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.65);
  });
}

function readSoundPref() {
  try {
    return localStorage.getItem(SOUND_PREF_KEY) === "on";
  } catch {
    return false;
  }
}

// The sound preference lives in localStorage; this tiny store lets React read
// it without a hydration mismatch (the server always renders "off").
const soundPrefListeners = new Set<() => void>();
let soundPrefFallback = false;

function readSoundPrefSafe() {
  return readSoundPref() || soundPrefFallback;
}

function writeSoundPref(on: boolean) {
  soundPrefFallback = on;
  try {
    localStorage.setItem(SOUND_PREF_KEY, on ? "on" : "off");
  } catch {
    // Storage unavailable (private mode); the fallback keeps it for this visit.
  }
  soundPrefListeners.forEach((l) => l());
}

function subscribeSoundPref(listener: () => void) {
  soundPrefListeners.add(listener);
  return () => soundPrefListeners.delete(listener);
}

export function KitchenLive({ initial }: { initial: KitchenSummary }) {
  const [summary, setSummary] = useState(initial);
  const [offline, setOffline] = useState(false);
  const soundOn = useSyncExternalStore(subscribeSoundPref, readSoundPrefSafe, () => false);
  // Browsers only allow audio after a click on the page.
  const [audioReady, setAudioReady] = useState(false);
  const soundBlocked = soundOn && !audioReady;
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<Record<string, "new" | "edited">>({});
  // Null until mounted, so server and client render the same markup.
  const [now, setNow] = useState<number | null>(null);

  const router = useRouter();
  const audioRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(false);
  const summaryRef = useRef(summary);
  const expiryRef = useRef<Record<string, number>>({});

  const apply = useCallback((next: KitchenSummary) => {
    const prev = summaryRef.current;
    summaryRef.current = next;
    setSummary(next);
    if (next.version === prev.version || next.roundId !== prev.roundId) return;

    const prevUpdated = new Map(prev.orders.map((o) => [o.id, o.updatedAt]));
    const changed = next.orders.filter((o) => prevUpdated.get(o.id) !== o.updatedAt);
    if (changed.length === 0) return;

    const until = Date.now() + HIGHLIGHT_MS;
    for (const o of changed) expiryRef.current[o.id] = until;
    setHighlighted((h) => ({
      ...h,
      ...Object.fromEntries(changed.map((o) => [o.id, prevUpdated.has(o.id) ? "edited" : "new"])),
    }));
    if (soundOnRef.current && audioRef.current?.state === "running") playChime(audioRef.current);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/kitchen/summary", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      apply(await res.json());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [apply, router]);

  // Polling, plus an immediate refresh when the tab becomes visible again.
  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Clock for "open for X min" and for expiring highlights.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const expired = Object.keys(expiryRef.current).filter((k) => expiryRef.current[k] <= t);
      if (expired.length === 0) return;
      for (const k of expired) delete expiryRef.current[k];
      setHighlighted((h) => Object.fromEntries(Object.entries(h).filter(([k]) => !expired.includes(k))));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Keep the kitchen screen from going to sleep (where supported).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator && document.visibilityState === "visible") {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Not allowed (e.g. low battery); ignore.
      }
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const unlockAudio = useCallback(() => {
    const ctx = audioRef.current ?? new AudioContext();
    audioRef.current = ctx;
    return ctx.resume().then(() => {
      setAudioReady(true);
      return ctx;
    });
  }, []);

  // Sound was left on last time: unlock audio on the first click anywhere.
  useEffect(() => {
    if (!soundBlocked) return;
    const unlock = () => void unlockAudio();
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, [soundBlocked, unlockAudio]);

  const toggleSound = () => {
    if (soundBlocked) {
      // The button reads "click anywhere": unlock rather than switch off.
      unlockAudio().then(playChime);
      return;
    }
    const next = !soundOn;
    writeSoundPref(next);
    if (next) unlockAudio().then(playChime);
  };

  const onCloseRound = async () => {
    setClosing(true);
    const { total, orders } = summary;
    try {
      const { closed } = await closeRound(summary.roundId);
      setNotice(
        closed
          ? `Runda je završena: ${total} ${plural(total, COFFEES)}, ${orders.length} ${plural(orders.length, ORDERS)}.`
          : "Ovu rundu je već završio neko drugi.",
      );
      await refresh();
    } catch {
      setNotice("Završavanje runde nije uspelo. Proverite vezu i pokušajte ponovo.");
    } finally {
      setClosing(false);
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(id);
  }, [notice]);

  const shown = summary.totals.filter((t) => t.quantity > 0);
  const empty = summary.totals.filter((t) => t.quantity === 0);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Trenutna runda</h1>
          <p className="muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Otvorena u {formatTime(summary.openedAt)}
              {now !== null && ` (${formatDuration(now - new Date(summary.openedAt).getTime())})`}
            </span>
            <span className="flex items-center gap-1.5" role="status">
              <span
                aria-hidden
                className={`size-2 rounded-full ${offline ? "bg-red-600" : "bg-green-600"}`}
              />
              {offline ? (
                <span className="font-semibold text-red-700">Nema veze, pokušavam ponovo</span>
              ) : (
                "Uživo"
              )}
            </span>
          </p>
        </div>
        <button
          onClick={toggleSound}
          aria-pressed={soundOn}
          className={soundOn ? "btn-secondary" : "btn-primary"}
        >
          {soundOn ? (soundBlocked ? "Zvuk: kliknite bilo gde" : "Zvuk uključen") : "Uključi zvuk"}
        </button>
      </div>

      {notice && (
        <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {notice}
        </p>
      )}

      <section aria-label="Ukupno po vrsti" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-xl bg-amber-800 p-5 text-white">
          <div className="text-sm font-medium text-amber-100">Ukupno</div>
          <div className="text-6xl font-bold">{summary.total}</div>
        </div>
        {shown.map((t) => (
          <div key={t.coffeeTypeId} className="card">
            <div className="text-sm font-medium text-stone-600">{t.name}</div>
            <div className="text-5xl font-bold">{t.quantity}</div>
          </div>
        ))}
      </section>
      {empty.length > 0 && summary.total > 0 && (
        <p className="muted -mt-2">Bez porudžbina: {empty.map((t) => t.name).join(", ")}</p>
      )}

      <section className="card p-0">
        <div className="flex items-baseline justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <h2 className="section-title">
            Porudžbine <span className="font-normal text-stone-500">({summary.orders.length})</span>
          </h2>
          {summary.cancelled > 0 && (
            <span className="muted">
              {summary.cancelled} {plural(summary.cancelled, ["otkazana", "otkazane", "otkazanih"])}
            </span>
          )}
        </div>
        {summary.orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-stone-500">
            Još nema porudžbina. Nove se pojavljuju ovde same od sebe.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {summary.orders.map((o) => {
              const mark = highlighted[o.id];
              return (
                <li
                  key={o.id}
                  className={`grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 px-5 py-3 transition-colors sm:grid-cols-[14rem_1fr_auto] ${
                    mark ? "bg-amber-50" : ""
                  }`}
                >
                  <span className="font-semibold">
                    {o.professor}
                    {mark && (
                      <span className="badge ml-2 bg-amber-800 text-white">
                        {mark === "new" ? "Novo" : "Izmenjeno"}
                      </span>
                    )}
                  </span>
                  <span className="col-span-2 row-start-2 text-stone-700 sm:col-span-1 sm:row-start-auto">
                    {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                  </span>
                  <span className="text-right text-xs text-stone-500 tabular-nums">
                    {formatTime(o.createdAt)}
                    {o.edited && <span className="block">izmenjeno {formatTime(o.updatedAt)}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {confirming ? (
          <>
            <span className="text-sm text-stone-600">
              Sve porudžbine iz ove runde biće označene kao pripremljene.
            </span>
            <button onClick={() => setConfirming(false)} disabled={closing} className="btn-secondary">
              Odustani
            </button>
            <button onClick={onCloseRound} disabled={closing} className="btn-primary">
              {closing ? "Završavanje…" : "Da, završi rundu"}
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            disabled={summary.orders.length === 0}
            className="btn-primary px-6 py-3 text-base"
          >
            Završi rundu
          </button>
        )}
      </div>
    </main>
  );
}
