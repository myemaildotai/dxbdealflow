export const ACTIVITY_CATEGORY_IDS = ["listings", "brokers", "credits", "requirements", "system"] as const;

export type ActivityCategoryId = (typeof ACTIVITY_CATEGORY_IDS)[number];
export type ActivityFilterId = "all" | ActivityCategoryId;
export type ActivityCategoryCounts = Record<ActivityFilterId, number>;

const CHAT_ACTIVITY_TARGET_TABLES = ["chat_conversations", "chat_conversation_messages", "chat_messages"] as const;
const NON_SYSTEM_ACTIVITY_TARGET_TABLES = [
  ...CHAT_ACTIVITY_TARGET_TABLES,
  "listings",
  "users",
  "broker_profiles",
  "broker_credits",
  "requirements",
  "requirement_matches",
] as const;

export const NON_CHAT_ACTIVITY_OR_FILTER =
  `target_table.is.null,target_table.not.in.(${CHAT_ACTIVITY_TARGET_TABLES.join(",")})`;
export const SYSTEM_ACTIVITY_OR_FILTER =
  `target_table.is.null,target_table.not.in.(${NON_SYSTEM_ACTIVITY_TARGET_TABLES.join(",")})`;

export function getActivityCategory(log: Pick<{ target_table: string | null }, "target_table">): ActivityCategoryId {
  if (log.target_table === "listings") return "listings";
  if (log.target_table === "users" || log.target_table === "broker_profiles") return "brokers";
  if (log.target_table === "broker_credits") return "credits";
  if (log.target_table === "requirements" || log.target_table === "requirement_matches") return "requirements";
  return "system";
}

export function getActivityFilter(value: string | null | undefined): ActivityFilterId {
  return value && ACTIVITY_CATEGORY_IDS.includes(value as ActivityCategoryId) ? (value as ActivityCategoryId) : "all";
}

export function createEmptyActivityCategoryCounts(): ActivityCategoryCounts {
  return {
    all: 0,
    listings: 0,
    brokers: 0,
    credits: 0,
    requirements: 0,
    system: 0,
  };
}
