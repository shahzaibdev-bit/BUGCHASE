import vrtCategoriesJson from './vrt-categories.json';

export interface VrtCategoryEntry {
  parent_category: string;
  vrt_category: string;
  children: string[];
}

export interface VrtParentGroup {
  parent: string;
  items: VrtCategoryEntry[];
}

export const vrtCategories: VrtCategoryEntry[] = vrtCategoriesJson as VrtCategoryEntry[];

export function vrtEntryKey(parent: string, vrtCategory: string): string {
  return `${parent}::${vrtCategory}`;
}

export function groupVrtByParent(entries: VrtCategoryEntry[] = vrtCategories): VrtParentGroup[] {
  const map = new Map<string, VrtCategoryEntry[]>();

  for (const entry of entries) {
    const list = map.get(entry.parent_category) ?? [];
    list.push(entry);
    map.set(entry.parent_category, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([parent, items]) => ({ parent, items }));
}

export function filterVrtTree(groups: VrtParentGroup[], query: string): VrtParentGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;

  return groups
    .map((group) => {
      const parentMatches = group.parent.toLowerCase().includes(q);

      if (parentMatches) {
        return group;
      }

      const filteredItems = group.items
        .map((item) => {
          const vrtMatches = item.vrt_category.toLowerCase().includes(q);
          const matchingChildren = item.children.filter((child) =>
            child.toLowerCase().includes(q),
          );

          if (vrtMatches) {
            return item;
          }

          if (matchingChildren.length > 0) {
            return { ...item, children: matchingChildren };
          }

          return null;
        })
        .filter((item): item is VrtCategoryEntry => item !== null);

      if (filteredItems.length === 0) {
        return null;
      }

      return { parent: group.parent, items: filteredItems };
    })
    .filter((group): group is VrtParentGroup => group !== null);
}

export function getUniqueParentCategories(entries: VrtCategoryEntry[] = vrtCategories): string[] {
  return [...new Set(entries.map((entry) => entry.parent_category))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getVrtCategoriesForParent(
  parent: string,
  entries: VrtCategoryEntry[] = vrtCategories,
): string[] {
  return entries
    .filter((entry) => entry.parent_category === parent)
    .map((entry) => entry.vrt_category);
}

export function getVariantsForVrtCategory(
  parent: string,
  vrtCategory: string,
  entries: VrtCategoryEntry[] = vrtCategories,
): string[] {
  const match = entries.find(
    (entry) => entry.parent_category === parent && entry.vrt_category === vrtCategory,
  );
  return match?.children ?? [];
}
