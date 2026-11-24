/** Public IGDB image URL; safe to use in client components. */
export function coverUrl(imageId: string, size: "cover_small" | "cover_big" = "cover_small"): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}
