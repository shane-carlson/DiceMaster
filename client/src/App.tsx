import { useEffect, useState, type FormEvent } from "react";
import type { RollEntry } from "./types.ts";
import "./App.css";

const QUICK_DICE = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];

async function postRoll(notation: string): Promise<RollEntry> {
  const res = await fetch("/api/roll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notation }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Roll failed.");
  return data as RollEntry;
}

async function getHistory(): Promise<RollEntry[]> {
  const res = await fetch("/api/history");
  if (!res.ok) throw new Error("Could not load history.");
  return (await res.json()) as RollEntry[];
}

function formatTerms(entry: RollEntry): string {
  return entry.terms
    .map((t) => {
      const sign = t.sign < 0 ? "−" : "+";
      const body = t.kind === "dice" ? `[${t.rolls.join(", ")}]` : `${Math.abs(t.subtotal)}`;
      return `${sign} ${body}`;
    })
    .join(" ")
    .replace(/^\+ /, "");
}

export default function App() {
  const [notation, setNotation] = useState("2d6+3");
  const [current, setCurrent] = useState<RollEntry | null>(null);
  const [history, setHistory] = useState<RollEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    getHistory()
      .then(setHistory)
      .catch(() => {
        /* history is best-effort on first load */
      });
  }, []);

  async function roll(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter some dice notation, e.g. 2d6+3.");
      return;
    }
    setRolling(true);
    setError(null);
    try {
      const entry = await postRoll(trimmed);
      setCurrent(entry);
      setHistory((prev) => [entry, ...prev].slice(0, 50));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRolling(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void roll(notation);
  }

  async function clearHistory() {
    await fetch("/api/history", { method: "DELETE" });
    setHistory([]);
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>
          <span className="die-emoji" aria-hidden="true">🎲</span> DiceMaster
        </h1>
        <p>Roll any dice with standard notation. Try <code>2d6+3</code>, <code>d20</code>, or <code>4d8-1</code>.</p>
      </header>

      <section className="panel roller">
        <form onSubmit={onSubmit} className="roll-form">
          <input
            aria-label="Dice notation"
            value={notation}
            onChange={(e) => setNotation(e.target.value)}
            placeholder="e.g. 2d6+3"
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" className="roll-btn" disabled={rolling}>
            {rolling ? "Rolling…" : "Roll"}
          </button>
        </form>

        <div className="quick-dice">
          {QUICK_DICE.map((d) => (
            <button key={d} type="button" className="chip" onClick={() => { setNotation(d); void roll(d); }}>
              {d}
            </button>
          ))}
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        {current && (
          <div className="result" key={current.id}>
            <div className="result-total" data-testid="result-total">{current.total}</div>
            <div className="result-notation">{current.notation}</div>
            <div className="result-breakdown">{formatTerms(current)}</div>
          </div>
        )}
      </section>

      <section className="panel history">
        <div className="history-head">
          <h2>History</h2>
          {history.length > 0 && (
            <button type="button" className="link-btn" onClick={() => void clearHistory()}>
              Clear
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="empty">No rolls yet. Give the dice a throw!</p>
        ) : (
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                <span className="hist-notation">{h.notation}</span>
                <span className="hist-breakdown">{formatTerms(h)}</span>
                <span className="hist-total">{h.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="footer">DiceMaster · Express + React</footer>
    </div>
  );
}
