export function slugifyEventName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildEventSlug(name: string): string {
  return slugifyEventName(name) || "event";
}

export function buildCollisionSlug(base: string, attempt: number): string {
  return `${base}-${attempt}`;
}

/** Legacy slugs appended the last 6 chars of the MongoDB id (e.g. `-037a1d`). */
export function stripLegacyIdSlugSuffix(slug: string): string | null {
  const match = slug.match(/^(.*)-[a-f0-9]{6}$/);
  return match?.[1] ?? null;
}
