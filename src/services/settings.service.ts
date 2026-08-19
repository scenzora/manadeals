import connectToDatabase from "@/lib/mongodb";
import Settings, { type SettingsDoc } from "@/models/Settings";

/**
 * Every section and field in the Settings schema has a default, so a loaded
 * document always has them populated. Mongoose types nested objects as
 * optional, hence the single assertion here rather than null-checks at every
 * read site.
 */
export type AppSettings = {
  [K in "general" | "affiliate" | "seo" | "email" | "system"]-?: NonNullable<SettingsDoc[K]>;
} & Partial<SettingsDoc>;

/** Fetches (and lazily creates) the single global settings document. */
export async function loadSettings(): Promise<AppSettings> {
  // Connects on its own: generateMetadata() runs outside the page render, so it
  // cannot rely on the caller having opened the connection.
  await connectToDatabase();

  const existing = await Settings.findOne({ key: "global" }).lean();
  if (existing) return existing as AppSettings;

  const created = await Settings.create({ key: "global" });
  return created.toObject() as AppSettings;
}
