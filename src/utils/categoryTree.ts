/** Minimal shape for parent walk (filter list items or full category list). */
export type CategoryTreeNode = {
  id?: number | string;
  category_id?: number | string;
  parent_id?: number | string | null;
  parentId?: number | string | null;
  children?: CategoryTreeNode[] | null;
};

/**
 * Flatten nested `viewAllCategory` tree into a single list while preserving
 * each node's own fields (`description`, `meta_description`, `parent_id`, …).
 */
export function flattenCategoryTree<T extends CategoryTreeNode>(
  nodes: T[] | null | undefined,
): T[] {
  const out: T[] = [];
  const walk = (list: T[] | null | undefined) => {
    if (!Array.isArray(list)) return;
    for (const node of list) {
      if (!node || typeof node !== "object") continue;
      out.push(node);
      walk((node.children as T[] | null | undefined) ?? null);
    }
  };
  walk(nodes);
  return out;
}

/**
 * Drop redundant ancestor IDs when a descendant is also selected (same as mega-menu: leaf-only).
 * Avoids APIs that treat multiple categoryIds as intersection returning too few products.
 */
export function minimizeCategoryIdsByAncestors(
  ids: number[],
  categories: CategoryTreeNode[],
): number[] {
  const byId = new Map<number, CategoryTreeNode>();
  for (const cat of categories) {
    const id = Number(cat.id ?? cat.category_id);
    if (Number.isFinite(id)) {
      byId.set(id, cat);
    }
  }
  const unique = [...new Set(ids)].filter((n) => Number.isFinite(n));
  return unique.filter(
    (id) =>
      !unique.some(
        (other) => other !== id && isAncestorOfCategory(byId, id, other),
      ),
  );
}

function isAncestorOfCategory(
  byId: Map<number, CategoryTreeNode>,
  ancestorId: number,
  descendantId: number,
): boolean {
  let cur: CategoryTreeNode | undefined = byId.get(descendantId);
  for (let depth = 0; depth < 64 && cur; depth++) {
    const raw = cur.parent_id ?? cur.parentId;
    if (raw == null || raw === "") {
      return false;
    }
    const p = Number(raw);
    if (!Number.isFinite(p)) {
      return false;
    }
    if (p === ancestorId) {
      return true;
    }
    cur = byId.get(p);
  }
  return false;
}
