import { useState } from "react";

export default function GoalModal({ onClose, onSave }) {
  const [amount, setAmount] = useState(500);

  const handleSubmit = (event) => {
    event.preventDefault();
    const parsed = Number(amount);
    if (Number.isFinite(parsed) && parsed > 0) {
      onSave(parsed);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface-container border border-white/10 rounded-xl p-6 shadow-2xl">
        <h2 className="text-headline-md mb-2">Set weekly goal</h2>
        <p className="text-body-sm text-on-surface-variant mb-5">
          Pick a small weekly spending target. You can change it anytime.
        </p>
        <label className="text-label-caps text-on-surface-variant block mb-2" htmlFor="goal-amount">
          Amount in INR
        </label>
        <input
          id="goal-amount"
          type="number"
          min="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-data-mono text-on-surface mb-5"
          autoFocus
        />
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-body-sm text-on-surface-variant hover:text-on-surface">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-on-primary text-body-sm">
            Save Goal
          </button>
        </div>
      </form>
    </div>
  );
}
