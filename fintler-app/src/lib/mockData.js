/**
 * FintLer — Mock Data Layer
 * Hardcoded data matching PRD §5 exactly.
 * This will be replaced by live Supabase queries once the backend is wired.
 */

export const userProfile = {
  name: "Arjun",
  initials: "AK",
  spending_personality: "The Weekend Warrior",
};

export const insightCards = {
  personality: {
    label: "Spending Personality",
    title: "The Weekend Warrior",
    description:
      "You tend to hold back during the week, but your spending peaks significantly from Friday evening to Sunday night.",
  },
  behavioral: {
    label: "Behavioral Insight",
    title: "Moment of Impact",
    description: "You make ",
    highlight: "80%",
    descriptionEnd: " of your impulse buys on Fridays after 10 PM.",
    icon: "bolt",
  },
  summary: {
    label: "Monthly Summary",
    title: "You spent ",
    amount: "₹42,500",
    titleEnd: " via UPI this month.",
    subtitle: "40%",
    subtitleEnd: " was on food delivery.",
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
    title: "Try keeping Swiggy orders under ",
    amount: "₹500",
    titleEnd: " this weekend.",
    buttonText: "Set Goal",
  },
};

export const transactions = [
  {
    id: 1,
    date: "Oct 24",
    merchant: "Zomato",
    category: "Food Delivery",
    amount: "-₹850",
    icon: "restaurant",
    iconBg: "bg-error/20",
    iconColor: "text-error",
  },
  {
    id: 2,
    date: "Oct 23",
    merchant: "Uber",
    category: "Transport",
    amount: "-₹320",
    icon: "directions_car",
    iconBg: "bg-secondary/20",
    iconColor: "text-secondary",
  },
  {
    id: 3,
    date: "Oct 22",
    merchant: "Swiggy",
    category: "Food Delivery",
    amount: "-₹1,200",
    icon: "restaurant",
    iconBg: "bg-error/20",
    iconColor: "text-error",
  },
];

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
