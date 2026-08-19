import { adminRoute, ok, readJson } from "@/lib/api";
import Settings from "@/models/Settings";
import { settingsSchema } from "@/lib/validations/system";
import { loadSettings } from "@/services/settings.service";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

export const GET = adminRoute("settings.view", async () => ok(await loadSettings()));

export const PUT = adminRoute("settings.manage", async (request, { session }) => {
  const payload = settingsSchema.partial().parse(await readJson<unknown>(request));

  const before = await loadSettings();

  // Nested $set keeps untouched sections intact.
  const update: Record<string, unknown> = {};
  for (const [section, values] of Object.entries(payload)) {
    if (!values) continue;
    for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
      update[`${section}.${key}`] = value;
    }
  }

  const settings = await Settings.findOneAndUpdate(
    { key: "global" },
    { $set: update },
    { returnDocument: "after", upsert: true },
  ).lean();

  await logActivity({
    session,
    action: "update",
    module: "settings",
    description: `Updated settings (${Object.keys(payload).join(", ")})`,
    request,
    before,
    after: settings,
  });

  return ok(settings);
});
