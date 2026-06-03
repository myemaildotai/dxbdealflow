export const NEW_DEAL_ALERT_COOLDOWN_DAYS = 5;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const NEW_DEAL_ALERT_COOLDOWN_MS = NEW_DEAL_ALERT_COOLDOWN_DAYS * DAY_IN_MS;

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getNewDealAlertAvailableAt(lastSentAt: string | null | undefined) {
  const lastSentDate = parseDate(lastSentAt);

  if (!lastSentDate) {
    return null;
  }

  return new Date(lastSentDate.getTime() + NEW_DEAL_ALERT_COOLDOWN_MS);
}

export function getNewDealAlertCooldownState(lastSentAt: string | null | undefined, now: Date = new Date()) {
  const lastSentDate = parseDate(lastSentAt);
  const availableAt = lastSentDate ? new Date(lastSentDate.getTime() + NEW_DEAL_ALERT_COOLDOWN_MS) : null;

  return {
    lastSentAt: lastSentDate,
    availableAt,
    isCoolingDown: Boolean(availableAt && availableAt.getTime() > now.getTime()),
  };
}
