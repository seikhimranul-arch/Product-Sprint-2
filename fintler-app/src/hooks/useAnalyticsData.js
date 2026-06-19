import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export default function useAnalyticsData() {
  const { user } = useAuth();
  const [txs, setTxs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !supabase) {
      setLoading(false);
      setTxs([]);
      return;
    }
    async function fetchTxs() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .eq("type", "debit")
          .order("transaction_date", { ascending: false });
        if (error) console.error("Analytics fetch error:", error);
        setTxs(data || []);
      } catch (e) {
        console.error("Analytics fetch exception:", e);
        setTxs([]);
      }
      setLoading(false);
    }
    fetchTxs();
  }, [user]);

  const totalSpend = useMemo(() => {
    if (!txs) return 0;
    return txs.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [txs]);

  const sortedCategories = useMemo(() => {
    if (!txs) return [];
    const categoryMap = {};
    txs.forEach((t) => {
      const cat = t.category || "Uncategorized";
      categoryMap[cat] = (categoryMap[cat] || 0) + parseFloat(t.amount || 0);
    });
    return Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  }, [txs]);

  const dayData = useMemo(() => {
    if (!txs) return { dayMap: {}, maxDaySpend: 1 };
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayMap = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 };
    txs.forEach((t) => {
      const d = new Date(t.transaction_date || t.created_at);
      if (!isNaN(d)) {
        const dayName = dayNames[d.getDay()];
        dayMap[dayName] += parseFloat(t.amount || 0);
      }
    });
    const maxDaySpend = Math.max(...Object.values(dayMap), 1);
    return { dayMap, maxDaySpend };
  }, [txs]);

  const topMerchants = useMemo(() => {
    if (!txs) return [];
    const merchantMap = {};
    txs.forEach((t) => {
      if (t.merchant) {
        merchantMap[t.merchant] = (merchantMap[t.merchant] || 0) + parseFloat(t.amount || 0);
      }
    });
    return Object.entries(merchantMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [txs]);

  return {
    txs,
    loading,
    totalSpend,
    sortedCategories,
    dayMap: dayData.dayMap,
    maxDaySpend: dayData.maxDaySpend,
    topMerchants,
  };
}
