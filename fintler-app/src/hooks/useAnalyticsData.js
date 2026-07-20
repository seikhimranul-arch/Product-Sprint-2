import { useState, useEffect, useMemo, useCallback } from "react";
import { demoTransactions } from "../lib/mockData";

export default function useAnalyticsData() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  const debits = useMemo(
    () => demoTransactions.filter((t) => t.type === "debit"),
    []
  );

  const totalSpend = useMemo(
    () => debits.reduce((sum, t) => sum + t.amount, 0),
    [debits]
  );

  const sortedCategories = useMemo(() => {
    const map = {};
    debits.forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [debits]);

  const dayMap = useMemo(() => {
    const m = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 };
    debits.forEach((t) => { if (m[t.day_of_week] !== undefined) m[t.day_of_week] += t.amount; });
    return m;
  }, [debits]);

  const maxDaySpend = useMemo(
    () => Math.max(...Object.values(dayMap)),
    [dayMap]
  );

  const topMerchants = useMemo(() => {
    const map = {};
    debits.forEach((t) => { map[t.merchant] = (map[t.merchant] || 0) + t.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [debits]);

  const refresh = useCallback(() => {}, []);

  return { txs: debits, loading, totalSpend, sortedCategories, dayMap, maxDaySpend, topMerchants, refresh };
}
