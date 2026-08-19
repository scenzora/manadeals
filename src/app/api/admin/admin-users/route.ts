import { adminRoute, ok, paginated, readJson } from "@/lib/api";
import AdminUser from "@/models/AdminUser";
import Role from "@/models/Role";
import { asFilter, parseListQuery, sanitize, searchFilter } from "@/lib/utils/query";
import { adminUserCreateSchema } from "@/lib/validations/system";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/services/activity-log.service";

export const runtime = "nodejs";

export const GET = adminRoute("admins.view", async (request) => {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, search, sort, order } = parseListQuery(searchParams);

  const status = searchParams.get("status");
  const role = searchParams.get("role");
  const filter = {
    ...sanitize({ ...(status ? { status } : {}), ...(role ? { role } : {}) }),
    ...searchFilter(search, ["name", "email"]),
  };

  const [items, total] = await Promise.all([
    AdminUser.find(asFilter(filter))
      .populate({ path: "role", model: Role, select: "name slug" })
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AdminUser.countDocuments(asFilter(filter)),
  ]);

  return paginated(items, total, page, limit);
});

export const POST = adminRoute("admins.manage", async (request, { session }) => {
  const payload = adminUserCreateSchema.parse(await readJson<unknown>(request));

  const admin = await AdminUser.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash: await hashPassword(payload.password),
    phone: payload.phone,
    avatar: payload.avatar,
    role: payload.role,
    status: payload.status,
  });

  await logActivity({
    session,
    action: "create",
    module: "admin-users",
    recordId: String(admin._id),
    description: `Created admin "${admin.email}"`,
    request,
    after: { name: admin.name, email: admin.email, role: String(admin.role) },
  });

  const { passwordHash: _omit, ...safe } = admin.toObject();
  void _omit;
  return ok(safe, 201);
});
