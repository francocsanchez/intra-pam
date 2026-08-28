export function buildSellerOwnerAnalyticsMatch(excludedOwnerKeys: string[]) {
  const ownerKeys = [...new Set(excludedOwnerKeys.filter(Boolean))];

  if (ownerKeys.length === 0) {
    return {};
  }

  return {
    propietarioClave: { $nin: ownerKeys },
  };
}
