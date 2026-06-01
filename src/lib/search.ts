export function normalizeSearchQuery(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() || "";
}

function appendSearchValue(values: string[], value: unknown): void {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => appendSearchValue(values, entry));
    return;
  }

  if (typeof value === "string") {
    const normalizedValue = normalizeSearchQuery(value);
    if (normalizedValue) {
      values.push(normalizedValue);
    }
    return;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    values.push(String(value).toLowerCase());
  }
}

export function buildSearchText(values: unknown[]) {
  const normalizedValues: string[] = [];
  values.forEach((value) => appendSearchValue(normalizedValues, value));
  return normalizedValues.join(" ");
}

export function searchTextMatchesQuery(searchText: string, query: string) {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) {
    return true;
  }

  return normalizeSearchQuery(searchText).includes(normalizedQuery);
}

export function searchValuesMatchQuery(values: unknown[], query: string) {
  return searchTextMatchesQuery(buildSearchText(values), query);
}
