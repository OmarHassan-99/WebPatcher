export function generateTargetSlug(id, name) {
  if (!id) return "";
  if (!name) return id;

  const slugifiedName = name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-"); // Replace multiple - with single -

  if (!slugifiedName) return id;
  return `${slugifiedName}-${id}`;
}

export function extractIdFromSlug(slug) {
  if (!slug) return null;

  // If the slug doesn't contain a hyphen, it's just the ID (no name provided) so return it
  if (!slug.includes("-")) return slug;

  const parts = slug.split("-");
  return parts[parts.length - 1]; // Return the last segment which is the ID
}
