export interface VrtTaxonomy {
  vrtParent: string;
  vrtCategory: string;
  vrtVariant: string;
  /** Leaf label used for legacy displays and keyword search (variant). */
  vulnerabilityCategory: string;
  /** Human-readable path for LLM / email context. */
  fullPath: string;
}

export function extractVrtTaxonomy(report: Record<string, unknown> | null | undefined): VrtTaxonomy {
  const vrtParent = String(report?.vrtParent ?? '').trim();
  const vrtCategory = String(report?.vrtCategory ?? '').trim();
  const vrtVariant = String(report?.vrtVariant ?? '').trim();
  const legacyCategory = String(
    report?.vulnerabilityCategory ?? report?.bug_category ?? report?.bugCategory ?? '',
  ).trim();

  const variant = vrtVariant || legacyCategory;
  const pathParts = [vrtParent, vrtCategory, variant].filter(Boolean);
  const fullPath = pathParts.join(' → ');

  return {
    vrtParent,
    vrtCategory,
    vrtVariant: variant,
    vulnerabilityCategory: variant,
    fullPath,
  };
}

export function pickVrtVariantForSearch(report: Record<string, unknown> | null | undefined): string {
  return extractVrtTaxonomy(report).vrtVariant;
}
