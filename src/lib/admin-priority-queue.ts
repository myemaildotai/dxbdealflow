export function buildAdminBrokerPriorityQueueSentence(brokerName: string) {
  return brokerName ? `${brokerName} is waiting for approval.` : "A new broker registration was submitted and is waiting for approval.";
}

export function buildAdminListingPriorityQueueSentence(listingTitle: string) {
  return listingTitle ? `${listingTitle}, is waiting for review.` : "A new listing was created and is waiting for review.";
}
