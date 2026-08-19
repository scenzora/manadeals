import { makeOptionsHandler } from "@/lib/crud";
import Role from "@/models/Role";

export const runtime = "nodejs";

export const GET = makeOptionsHandler({
  model: Role,
  module: "admins",
  filter: { status: "active" },
});
