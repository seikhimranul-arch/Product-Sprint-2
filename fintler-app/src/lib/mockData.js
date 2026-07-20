/**
 * FintLer — Complete Demo Data Layer
 * Rich, realistic dummy data for the working prototype.
 * Behavioral patterns baked in: Friday spikes, late-night food, weekend shopping.
 * Ponytail rung 7: pure data constants, no logic, one file.
 */

// ── Helper: generate dates relative to today ──
const today = new Date();
const d = (daysAgo, hour = 12) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return dt.toISOString();
};
const dayName = (iso) => ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date(iso).getDay()];

// ── 90+ Realistic Indian Transactions ──
let _id = 0;
const tx = (daysAgo, hour, merchant, rawMerchant, amount, category, type = "debit", bank = "hdfc", last4 = "4521") => {
  const date = d(daysAgo, hour);
  return {
    id: `txn-${++_id}`,
    amount,
    merchant,
    raw_merchant: rawMerchant || merchant.toUpperCase(),
    category,
    type,
    bank_name: bank,
    account_last4: last4,
    transacted_at: date,
    transaction_date: date,
    day_of_week: dayName(date),
    hour_of_day: hour,
    created_at: date,
  };
};

export const demoTransactions = [
  // Salary credits (1st of month pattern)
  tx(1, 9, "Employer - TCS", "TCS SALARY CREDIT", 85000, "salary", "credit", "hdfc", "4521"),
  tx(31, 9, "Employer - TCS", "TCS SALARY CREDIT", 85000, "salary", "credit", "hdfc", "4521"),
  tx(61, 9, "Employer - TCS", "TCS SALARY CREDIT", 85000, "salary", "credit", "hdfc", "4521"),

  // Food delivery — heavy, especially late night Fridays
  tx(1, 22, "Swiggy", "SWIGGY ORDER BANGALORE", 680, "food", "debit", "hdfc", "4521"),
  tx(2, 21, "Zomato", "ZOMATO ORDER BLR", 520, "food", "debit", "hdfc", "4521"),
  tx(3, 13, "Swiggy", "SWIGGY ORDER BANGALORE", 350, "food", "debit", "icici", "7832"),
  tx(4, 22, "Swiggy", "SWIGGY INSTAMART BLR", 890, "food", "debit", "hdfc", "4521"),
  tx(5, 23, "Zomato", "ZOMATO GOLD BLR", 1200, "food", "debit", "hdfc", "4521"),
  tx(6, 20, "Swiggy", "SWIGGY ORDER BANGALORE", 450, "food", "debit", "hdfc", "4521"),
  tx(8, 22, "Zomato", "ZOMATO ORDER BLR", 750, "food", "debit", "icici", "7832"),
  tx(10, 13, "Swiggy", "SWIGGY ORDER BANGALORE", 380, "food", "debit", "hdfc", "4521"),
  tx(12, 22, "Swiggy", "SWIGGY ORDER BANGALORE", 920, "food", "debit", "hdfc", "4521"),
  tx(14, 21, "Zomato", "ZOMATO ORDER BLR", 560, "food", "debit", "icici", "7832"),
  tx(16, 13, "Swiggy", "SWIGGY ORDER BANGALORE", 310, "food", "debit", "hdfc", "4521"),
  tx(19, 22, "Zomato", "ZOMATO GOLD BLR", 1100, "food", "debit", "hdfc", "4521"),
  tx(21, 20, "Swiggy", "SWIGGY ORDER BANGALORE", 480, "food", "debit", "hdfc", "4521"),
  tx(24, 23, "Swiggy", "SWIGGY ORDER BANGALORE", 670, "food", "debit", "icici", "7832"),
  tx(26, 14, "Zomato", "ZOMATO ORDER BLR", 290, "food", "debit", "hdfc", "4521"),
  tx(28, 22, "Swiggy", "SWIGGY INSTAMART BLR", 850, "food", "debit", "hdfc", "4521"),
  tx(33, 22, "Zomato", "ZOMATO ORDER BLR", 720, "food", "debit", "hdfc", "4521"),
  tx(35, 13, "Swiggy", "SWIGGY ORDER BANGALORE", 440, "food", "debit", "icici", "7832"),
  tx(40, 21, "Swiggy", "SWIGGY ORDER BANGALORE", 580, "food", "debit", "hdfc", "4521"),
  tx(45, 22, "Zomato", "ZOMATO ORDER BLR", 950, "food", "debit", "hdfc", "4521"),
  tx(50, 13, "Swiggy", "SWIGGY ORDER BANGALORE", 320, "food", "debit", "hdfc", "4521"),
  tx(55, 22, "Zomato", "ZOMATO GOLD BLR", 1050, "food", "debit", "icici", "7832"),
  tx(60, 20, "Swiggy", "SWIGGY ORDER BANGALORE", 410, "food", "debit", "hdfc", "4521"),
  tx(65, 23, "Swiggy", "SWIGGY ORDER BANGALORE", 780, "food", "debit", "hdfc", "4521"),
  tx(70, 14, "Zomato", "ZOMATO ORDER BLR", 360, "food", "debit", "hdfc", "4521"),
  tx(75, 22, "Swiggy", "SWIGGY ORDER BANGALORE", 640, "food", "debit", "icici", "7832"),

  // Dining out
  tx(7, 20, "Starbucks", "STARBUCKS INDIRANAGAR", 650, "food", "debit", "hdfc", "4521"),
  tx(15, 19, "Chai Point", "CHAI POINT MG ROAD", 180, "food", "debit", "hdfc", "4521"),
  tx(30, 20, "Third Wave Coffee", "THIRD WAVE COFFEE HSR", 420, "food", "debit", "hdfc", "4521"),
  tx(42, 13, "Starbucks", "STARBUCKS KORAMANGALA", 580, "food", "debit", "icici", "7832"),

  // Transport
  tx(1, 9, "Uber", "UBER INDIA BLR", 320, "transport", "debit", "hdfc", "4521"),
  tx(3, 18, "Rapido", "RAPIDO BIKE BLR", 85, "transport", "debit", "hdfc", "4521"),
  tx(5, 9, "Uber", "UBER INDIA BLR", 450, "transport", "debit", "icici", "7832"),
  tx(7, 18, "Ola", "OLA CABS BANGALORE", 280, "transport", "debit", "hdfc", "4521"),
  tx(10, 9, "Uber", "UBER INDIA BLR", 380, "transport", "debit", "hdfc", "4521"),
  tx(14, 18, "Rapido", "RAPIDO BIKE BLR", 95, "transport", "debit", "hdfc", "4521"),
  tx(17, 9, "Uber", "UBER INDIA BLR", 520, "transport", "debit", "icici", "7832"),
  tx(22, 18, "Ola", "OLA CABS BANGALORE", 340, "transport", "debit", "hdfc", "4521"),
  tx(29, 9, "Uber", "UBER INDIA BLR", 290, "transport", "debit", "hdfc", "4521"),
  tx(36, 18, "Rapido", "RAPIDO BIKE BLR", 75, "transport", "debit", "hdfc", "4521"),
  tx(48, 9, "Uber", "UBER INDIA BLR", 410, "transport", "debit", "icici", "7832"),
  tx(56, 18, "Ola", "OLA CABS BANGALORE", 260, "transport", "debit", "hdfc", "4521"),

  // Shopping — weekend surges
  tx(2, 15, "Amazon", "AMAZON PAY INDIA", 2499, "shopping", "debit", "hdfc", "4521"),
  tx(6, 11, "Flipkart", "FLIPKART INTERNET", 1899, "shopping", "debit", "hdfc", "4521"),
  tx(9, 16, "Myntra", "MYNTRA DESIGNS", 3200, "shopping", "debit", "icici", "7832"),
  tx(13, 14, "Amazon", "AMAZON PAY INDIA", 799, "shopping", "debit", "hdfc", "4521"),
  tx(20, 12, "Nykaa", "NYKAA FASHION", 1450, "shopping", "debit", "hdfc", "4521"),
  tx(27, 15, "Flipkart", "FLIPKART INTERNET", 4999, "shopping", "debit", "icici", "7832"),
  tx(34, 11, "Amazon", "AMAZON PAY INDIA", 1299, "shopping", "debit", "hdfc", "4521"),
  tx(41, 16, "Decathlon", "DECATHLON SPORTS BLR", 2850, "shopping", "debit", "hdfc", "4521"),
  tx(53, 14, "Myntra", "MYNTRA DESIGNS", 1680, "shopping", "debit", "icici", "7832"),
  tx(67, 12, "Amazon", "AMAZON PAY INDIA", 3450, "shopping", "debit", "hdfc", "4521"),

  // Groceries
  tx(3, 11, "BigBasket", "BIGBASKET COM BLR", 1850, "groceries", "debit", "hdfc", "4521"),
  tx(10, 10, "DMart", "DMART READY BLR", 2300, "groceries", "debit", "hdfc", "4521"),
  tx(17, 11, "BigBasket", "BIGBASKET COM BLR", 1620, "groceries", "debit", "icici", "7832"),
  tx(24, 10, "DMart", "DMART READY BLR", 1980, "groceries", "debit", "hdfc", "4521"),
  tx(31, 11, "BigBasket", "BIGBASKET COM BLR", 2150, "groceries", "debit", "hdfc", "4521"),
  tx(45, 10, "Zepto", "ZEPTO GROCERY BLR", 890, "groceries", "debit", "hdfc", "4521"),
  tx(52, 11, "BigBasket", "BIGBASKET COM BLR", 1750, "groceries", "debit", "icici", "7832"),
  tx(66, 10, "DMart", "DMART READY BLR", 2080, "groceries", "debit", "hdfc", "4521"),

  // Subscriptions
  tx(5, 10, "Netflix", "NETFLIX COM", 649, "subscriptions", "debit", "hdfc", "4521"),
  tx(5, 10, "Spotify", "SPOTIFY INDIA", 119, "subscriptions", "debit", "hdfc", "4521"),
  tx(12, 10, "Hotstar", "DISNEY HOTSTAR", 299, "subscriptions", "debit", "icici", "7832"),
  tx(15, 10, "YouTube Premium", "GOOGLE YOUTUBE", 149, "subscriptions", "debit", "hdfc", "4521"),
  tx(35, 10, "Netflix", "NETFLIX COM", 649, "subscriptions", "debit", "hdfc", "4521"),
  tx(35, 10, "Spotify", "SPOTIFY INDIA", 119, "subscriptions", "debit", "hdfc", "4521"),

  // Utilities
  tx(8, 10, "Jio", "JIO PREPAID RECHARGE", 399, "utilities", "debit", "hdfc", "4521"),
  tx(10, 10, "Airtel", "AIRTEL BROADBAND", 999, "utilities", "debit", "icici", "7832"),
  tx(15, 10, "BESCOM", "BESCOM ELECTRICITY BLR", 1850, "utilities", "debit", "hdfc", "4521"),
  tx(20, 10, "Bangalore Water", "BWSSB WATER BILL", 450, "utilities", "debit", "hdfc", "4521"),
  tx(38, 10, "Jio", "JIO PREPAID RECHARGE", 399, "utilities", "debit", "hdfc", "4521"),
  tx(40, 10, "Airtel", "AIRTEL BROADBAND", 999, "utilities", "debit", "icici", "7832"),

  // EMI
  tx(5, 10, "HDFC EMI", "HDFC AUTO DEBIT EMI", 8500, "emi", "debit", "hdfc", "4521"),
  tx(35, 10, "HDFC EMI", "HDFC AUTO DEBIT EMI", 8500, "emi", "debit", "hdfc", "4521"),
  tx(65, 10, "HDFC EMI", "HDFC AUTO DEBIT EMI", 8500, "emi", "debit", "hdfc", "4521"),

  // Health
  tx(11, 16, "Apollo Pharmacy", "APOLLO PHARMACY BLR", 780, "health", "debit", "hdfc", "4521"),
  tx(44, 16, "Practo", "PRACTO CONSULT", 500, "health", "debit", "icici", "7832"),

  // Transfers
  tx(4, 14, "PhonePe", "PHONEPE UPI TRANSFER", 2000, "transfer", "debit", "hdfc", "4521"),
  tx(18, 14, "Google Pay", "GPAY UPI TRANSFER", 1500, "transfer", "debit", "icici", "7832"),
  tx(32, 14, "Paytm", "PAYTM WALLET LOAD", 1000, "transfer", "debit", "hdfc", "4521"),
  tx(58, 14, "PhonePe", "PHONEPE UPI TRANSFER", 3000, "transfer", "debit", "hdfc", "4521"),

  // Entertainment
  tx(9, 19, "PVR Cinemas", "PVR INOX BLR", 850, "entertainment", "debit", "hdfc", "4521"),
  tx(23, 19, "BookMyShow", "BMS TICKETS BLR", 1200, "entertainment", "debit", "icici", "7832"),
  tx(46, 19, "PVR Cinemas", "PVR INOX BLR", 750, "entertainment", "debit", "hdfc", "4521"),
].sort((a, b) => new Date(b.transacted_at) - new Date(a.transacted_at));

// ── Demo Profile ──
export const demoProfile = {
  name: "Arjun",
  initials: "AK",
  spending_personality: "The Weekend Warrior",
};

// ── AI Insight Cards (Primary Set) ──
export const demoInsights = {
  personality: {
    label: "Spending Personality",
    title: "The Weekend Warrior",
    description: "You hold back during the week, but your spending peaks significantly from Friday evening to Sunday night. 62% of your discretionary spend happens on weekends.",
  },
  behavioral: {
    label: "Behavioral Insight",
    title: "Moment of Impact",
    description: "You made 80% of your impulse food orders on Fridays after 10 PM. Late-night cravings cost you ₹4,200 last month alone.",
    icon: "bolt",
  },
  summary: {
    label: "Monthly Summary",
    title: "You spent ₹42,500 via UPI this month.",
    subtitle: "40% was on food delivery.",
    trend: "-4.2% vs last month",
  },
  alert: {
    label: "Spending Alert",
    title: "Your 'Dining Out' spend is spiking.",
    amount: "₹12,000",
    subtitle: "this month so far.",
    icon: "warning",
  },
  goal: {
    label: "Suggested Goal",
    title: "Try keeping Swiggy orders under ₹500 this weekend.",
    buttonText: "Set Goal",
  },
};

// ── AI Insight Cards (Alternate Set — for refresh) ──
export const demoInsightsAlt = {
  personality: {
    label: "Spending Personality",
    title: "The Midnight Snacker",
    description: "Your spending tells a story of late nights. 45% of your food orders happen after 9 PM, costing 30% more per order than daytime purchases.",
  },
  behavioral: {
    label: "Behavioral Insight",
    title: "The Subscription Creep",
    description: "You're paying for 4 streaming services totaling ₹1,216/month. You actively used only 2 in the last 30 days.",
    icon: "bolt",
  },
  summary: {
    label: "Monthly Summary",
    title: "Your grocery spend is well-controlled at ₹6,500.",
    subtitle: "15% below your 3-month average.",
    trend: "+2.1% vs last month overall",
  },
  alert: {
    label: "Spending Alert",
    title: "EMI payments are 20% of your take-home.",
    amount: "₹8,500",
    subtitle: "monthly auto-debit.",
    icon: "warning",
  },
  goal: {
    label: "Suggested Goal",
    title: "Try a no-delivery Tuesday this week. Cook once, save ₹400.",
    buttonText: "Accept Challenge",
  },
};

// ── Backward-compatible exports (used by Landing, TransactionsTable) ──

export const userProfile = demoProfile;

export const insightCards = demoInsights;

export const transactions = demoTransactions.slice(0, 3).map((t, i) => ({
  id: i + 1,
  date: new Date(t.transacted_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
  merchant: t.merchant,
  category: t.category,
  amount: t.type === "credit" ? `+₹${t.amount.toLocaleString("en-IN")}` : `-₹${t.amount.toLocaleString("en-IN")}`,
  icon: t.category === "food" ? "restaurant" : t.category === "transport" ? "directions_car" : "receipt_long",
  iconBg: t.category === "food" ? "bg-error/20" : "bg-secondary/20",
  iconColor: t.category === "food" ? "text-error" : "text-secondary",
}));

export const cashFlowAmount = "₹1,42,000";

export const syncMessages = [
  "Connecting securely to Gmail...",
  "Fetching last 90 days of bank alerts...",
  "Analyzing your spending personality without judgment...",
];

export const landingInsights = [
  {
    title: "Weekend Surge",
    description: "Dining out accounted for 40% of last week's spend.",
    icon: "info",
    iconColor: "text-tertiary",
    borderColor: "border-tertiary",
  },
  {
    title: "Subscription Alert",
    description: "Netflix renewed at ₹649.",
    icon: "warning",
    iconColor: "text-error",
    borderColor: "border-error",
  },
];

export const features = [
  {
    icon: "sync",
    iconBg: "bg-secondary-container/20",
    iconBorder: "border-secondary-container/30",
    iconColor: "text-secondary",
    title: "Real-time Sync",
    description:
      "We securely parse your bank alert emails to update your dashboard instantly. No manual logging required.",
  },
  {
    icon: "psychology",
    iconBg: "bg-tertiary-fixed/10",
    iconBorder: "border-tertiary-fixed/20",
    iconColor: "text-tertiary",
    title: "Behavioral Insights",
    description:
      "Understand your spending patterns. Our AI categorizes and visualizes your habits to help you regain control.",
  },
  {
    icon: "shield_lock",
    iconBg: "bg-surface-bright/30",
    iconBorder: "border-surface-bright/50",
    iconColor: "text-on-surface",
    title: "Zero Judgment",
    description:
      "A private, secure space to view your finances. We don't sell your data, and we don't preach about your coffee habits.",
  },
];
