export const NAV_ITEMS = [
  { segment: "", label: "Overview", icon: "overview" },
  { segment: "agents", label: "Agents", icon: "agents" },
  { segment: "journeys", label: "Agent Journeys", icon: "journeys" },
  { segment: "inbox", label: "Human Inbox", icon: "inbox" },
  { segment: "analytics", label: "Analytics", icon: "analytics" },
] as const;

export type NavIcon = (typeof NAV_ITEMS)[number]["icon"];
