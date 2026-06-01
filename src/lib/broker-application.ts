export const BROKER_BIO_MAX_LENGTH = 180;

const brokerBioCharacterSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

export function normalizeBrokerBio(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  // Treat Windows line endings as a single newline before trimming outer whitespace.
  return value.replace(/\r\n?/g, "\n").trim();
}

export function getBrokerBioCharacterCount(value: string | null | undefined) {
  const normalizedValue = normalizeBrokerBio(value);

  if (!normalizedValue) {
    return 0;
  }

  if (brokerBioCharacterSegmenter) {
    return Array.from(brokerBioCharacterSegmenter.segment(normalizedValue)).length;
  }

  return Array.from(normalizedValue).length;
}
