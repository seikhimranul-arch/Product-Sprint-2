import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "fintler_daily_goal";

function loadGoal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Reset if it's a new day
    const today = new Date().toDateString();
    if (data.date !== today) return null;
    return data;
  } catch { return null; }
}

function saveGoal(amount) {
  const data = { amount, date: new Date().toDateString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export default function DailyGoals({ todaySpend = 0 }) {
  const [goal, setGoal] = useState(() => loadGoal());
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [showComplete, setShowComplete] = useState(false);

  const spent = todaySpend;
  const target = goal?.amount || 0;
  const pct = target > 0 ? Math.min((spent / target) * 100, 100) : 0;
  const remaining = target > 0 ? Math.max(target - spent, 0) : 0;
  const isOver = spent > target && target > 0;

  useEffect(() => {
    if (pct >= 100 && target > 0) {
      setShowComplete(true);
      const t = setTimeout(() => setShowComplete(false), 3000);
      return () => clearTimeout(t);
    }
  }, [pct, target]);

  const handleSave = useCallback(() => {
    const val = parseInt(input.replace(/[₹,\s]/g, ""), 10);
    if (val > 0) {
      setGoal(saveGoal(val));
      setEditing(false);
      setInput("");
    }
  }, [input]);

  const handleClear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setGoal(null);
    setEditing(false);
  }, []);

  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference - (circumference * pct) / 100;

  return (
    <div className="halo-card relative overflow-hidden">
      {/* Completion flash */}
      {showComplete && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
             style={{ background: "rgba(43,224,140,0.08)" }}>
          <div className="text-lg font-bold animate-bounce" style={{ color: "var(--color-halo-lime)" }}>
            Daily Goal Reached!
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="text-label-caps">Daily Goal</div>
        {target > 0 && !editing && (
          <button onClick={() => { setEditing(true); setInput(target.toLocaleString("en-IN")); }}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer border-none bg-transparent hover:underline"
                  style={{ color: "var(--color-halo-text3)" }}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: "var(--color-halo-text3)" }}>₹</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="e.g. 2000"
              autoFocus
              className="flex-1 text-sm font-mono font-bold px-3 py-2 rounded-lg outline-none"
              style={{ background: "var(--color-elevated)", border: "1px solid var(--color-halo-indigo)", color: "var(--color-halo-text)" }}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary btn-sm text-xs flex-1">Save Goal</button>
            <button onClick={() => setEditing(false)} className="btn-ghost btn-sm text-xs">Cancel</button>
            {target > 0 && (
              <button onClick={handleClear} className="btn-ghost btn-sm text-xs" style={{ color: "var(--color-halo-magenta)", borderColor: "rgba(255,58,92,0.3)" }}>Clear</button>
            )}
          </div>
        </div>
      ) : target === 0 ? (
        <div>
          <p className="text-xs mb-3" style={{ color: "var(--color-halo-text2)" }}>Set a daily spending limit to stay on track.</p>
          <button onClick={() => setEditing(true)} className="btn-primary btn-sm text-xs w-full">Set Daily Goal</button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {/* Ring */}
          <div className="w-16 h-16 relative flex-shrink-0">
            <svg viewBox="0 0 64 64" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-elevated)" strokeWidth="5" />
              <circle cx="32" cy="32" r="28" fill="none"
                      stroke={isOver ? "var(--color-halo-magenta)" : pct >= 80 ? "var(--color-halo-amber)" : "var(--color-halo-indigo)"}
                      strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      style={{ transition: "stroke-dashoffset 0.8s ease-out, stroke 0.3s" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold font-mono"
                 style={{ color: isOver ? "var(--color-halo-magenta)" : "var(--color-halo-indigo)" }}>
              {Math.round(pct)}%
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold font-mono" style={{ color: "var(--color-halo-text)" }}>
                ₹{spent.toLocaleString("en-IN")}
              </span>
              <span className="text-xs" style={{ color: "var(--color-halo-text3)" }}>/ ₹{target.toLocaleString("en-IN")}</span>
            </div>
            <div className="text-[11px] mt-1" style={{ color: isOver ? "var(--color-halo-magenta)" : "var(--color-halo-text2)" }}>
              {isOver
                ? `Over by ₹${(spent - target).toLocaleString("en-IN")}`
                : `₹${remaining.toLocaleString("en-IN")} remaining today`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
