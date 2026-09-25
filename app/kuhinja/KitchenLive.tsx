"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KitchenSummary } from "@/lib/orders";
import { formatTime } from "@/lib/strings";
import { closeRound } from "./actions";

const POLL_MS = 3000;
const HIGHLIGHT_MS = 15_000;

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

export function KitchenLive({ initial }: { initial: KitchenSummary }) {
  const [summary, setSummary] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const [highlighted, setHighlighted] = useState<Record<string, number>>({});

  const router = useRouter();
  const audioRef = useRef<AudioContext | null>(null);
  const summaryRef = useRef(summary);

  const apply = useCallback((next: KitchenSummary) => {
    const prev = summaryRef.current;
    summaryRef.current = next;
    setSummary(next);
    if (next.version === prev.version) return;

    // New or edited orders since the last poll (same round only; a fresh
    // round after "Završi rundu" starts empty).
    const prevUpdated = new Map(prev.orders.map((o) => [o.id, o.updatedAt]));
    const changed =
      next.roundId === prev.roundId
        ? next.orders.filter((o) => prevUpdated.get(o.id) !== o.updatedAt)
        : [];
    if (changed.length === 0) return;

    const until = Date.now() + HIGHLIGHT_MS;
    setHighlighted((h) => ({ ...h, ...Object.fromEntries(changed.map((o) => [o.id, until])) }));
    if (audioRef.current) playChime(audioRef.current);
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

  // Drop expired highlights.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setHighlighted((h) => {
        const kept = Object.entries(h).filter(([, until]) => until > now);
        return kept.length === Object.keys(h).length ? h : Object.fromEntries(kept);
      });
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

  const enableSound = () => {
    // Browsers only allow audio after a user gesture.
    const ctx = audioRef.current ?? new AudioContext();
    audioRef.current = ctx;
    ctx.resume().then(() => playChime(ctx));
    setSoundOn(true);
  };

  const onCloseRound = async () => {
    setClosing(true);
    try {
      await closeRound(summary.roundId);
      await refresh();
    } finally {
      setClosing(false);
      setConfirming(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Porudžbine za pauzu</h1>
          <p className="text-sm text-stone-500">
            Runda otvorena u {formatTime(summary.openedAt)}
            {offline && <span className="ml-2 font-semibold text-red-700">· Nema veze sa serverom</span>}
          </p>
        </div>
        {!soundOn && (
          <button onClick={enableSound} className="btn-primary">
            🔔 Uključi zvuk
          </button>
        )}
      </div>

      <section aria-label="Ukupno po vrsti" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-amber-800 p-5 text-white shadow-sm">
          <div className="text-sm font-medium opacity-80">Ukupno</div>
          <div className="text-6xl font-bold tabular-nums">{summary.total}</div>
        </div>
        {summary.totals.map((t) => (
          <div
            key={t.coffeeTypeId}
            className={`card ${t.quantity === 0 ? "opacity-50" : ""}`}
          >
            <div className="text-sm font-medium text-stone-600">{t.name}</div>
            <div className="text-5xl font-bold tabular-nums">{t.quantity}</div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">
          Porudžbine ({summary.orders.length})
        </h2>
        {summary.orders.length === 0 ? (
          <p className="py-6 text-center text-stone-500">Još nema porudžbina.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {summary.orders.map((o) => (
              <li
                key={o.id}
                className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg px-2 py-2.5 transition-colors ${
                  highlighted[o.id] ? "bg-amber-100" : ""
                }`}
              >
                <span className="font-semibold">
                  {o.professor}
                  {highlighted[o.id] && (
                    <span className="ml-2 rounded-full bg-amber-700 px-2 py-0.5 text-xs text-white">novo</span>
                  )}
                </span>
                <span className="text-stone-700">
                  {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                </span>
                <span className="text-xs text-stone-500 tabular-nums">{formatTime(o.updatedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {confirming ? (
          <>
            <span className="text-sm text-stone-600">
              Sve porudžbine biće označene kao završene.
            </span>
            <button onClick={() => setConfirming(false)} disabled={closing} className="btn-secondary">
              Nazad
            </button>
            <button onClick={onCloseRound} disabled={closing} className="btn-primary">
              {closing ? "Zatvaranje…" : "Da, završi rundu"}
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className="btn-primary px-6 py-3 text-base">
            ✓ Završi rundu
          </button>
        )}
      </div>
    </main>
  );
}
