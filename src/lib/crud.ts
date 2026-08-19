import type { NextRequest } from "next/server";
import type { Model } from "mongoose";
import type { ZodType } from "zod";

import { adminRoute, assertObjectId, fail, ok, paginated, readJson, type RouteContext } from "@/lib/api";
import { asFilter, parseListQuery, sanitize, searchFilter } from "@/lib/utils/query";
import { logActivity } from "@/services/activity-log.service";
import type { AdminSession } from "@/types";

export type CrudConfig<TSchema extends ZodType> = {
  /** Mongoose model to operate on. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  /** Module name used in permissions ("products") and activity logs. */
  module: string;
  /** Zod schema validating create/update payloads. */
  schema: TSchema;
  /** Fields included in the `search` filter. */
  searchFields: string[];
  /** Whitelisted equality filters readable from the query string. */
  filterFields?: string[];
  /** Fields to populate on list/detail reads. */
  populate?: { path: string; select: string }[];
  /** Fields excluded from responses (credentials etc.). */
  hiddenFields?: string[];
  /**
   * Write-only fields that are dropped from an update when submitted empty, so
   * a blank input keeps the stored secret instead of erasing it.
   */
  keepOnEmpty?: string[];
  /** Default sort field. */
  defaultSort?: string;
  /** Human-readable label used in log messages. */
  label: string;
  /** Field used to describe a record in activity logs. */
  titleField?: string;
  /** Extra values merged into the document on create. */
  onCreate?: (session: AdminSession) => Record<string, unknown>;
  /** Extra values merged into the document on update. */
  onUpdate?: (session: AdminSession) => Record<string, unknown>;
};

function projection(hiddenFields: string[] = []) {
  return hiddenFields.map((field) => `-${field}`).join(" ");
}

function buildFilters(searchParams: URLSearchParams, fields: string[] = []) {
  const filters: Record<string, unknown> = {};
  for (const field of fields) {
    const value = searchParams.get(field);
    if (value === null || value === "") continue;
    if (value === "true" || value === "false") filters[field] = value === "true";
    else filters[field] = value;
  }
  return sanitize(filters);
}

/** GET /api/admin/<resource> — paginated, searchable, sortable list. */
export function makeListHandler<T extends ZodType>(config: CrudConfig<T>) {
  return adminRoute(`${config.module}.view`, async (request) => {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, search, sort, order } = parseListQuery(searchParams, {
      sort: config.defaultSort ?? "createdAt",
    });

    const filter = {
      ...buildFilters(searchParams, config.filterFields),
      ...searchFilter(search, config.searchFields),
    };

    let query = config.model
      .find(asFilter(filter))
      .select(projection(config.hiddenFields))
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    for (const populate of config.populate ?? []) query = query.populate(populate);

    const [items, total] = await Promise.all([
      query.lean(),
      config.model.countDocuments(asFilter(filter)),
    ]);

    return paginated(items, total, page, limit);
  });
}

/** POST /api/admin/<resource> — validated create. */
export function makeCreateHandler<T extends ZodType>(config: CrudConfig<T>) {
  return adminRoute(`${config.module}.create`, async (request, { session }) => {
    const payload = config.schema.parse(await readJson<unknown>(request)) as Record<string, unknown>;
    const document = await config.model.create({
      ...payload,
      ...(config.onCreate?.(session) ?? {}),
    });

    await logActivity({
      session,
      action: "create",
      module: config.module,
      recordId: String(document._id),
      description: `Created ${config.label} "${document[config.titleField ?? "name"] ?? ""}"`,
      request,
      after: document.toObject(),
    });

    return ok(document.toObject(), 201);
  });
}

/** GET /api/admin/<resource>/[id] */
export function makeGetHandler<T extends ZodType>(config: CrudConfig<T>) {
  return adminRoute<{ id: string }>(`${config.module}.view`, async (_request, { params }) => {
    const { id } = await params;
    assertObjectId(id);

    let query = config.model.findById(id).select(projection(config.hiddenFields));
    for (const populate of config.populate ?? []) query = query.populate(populate);

    const document = await query.lean();
    if (!document) return fail(`${config.label} not found`, 404);
    return ok(document);
  });
}

/** PUT /api/admin/<resource>/[id] — full replace with audit trail. */
export function makeUpdateHandler<T extends ZodType>(config: CrudConfig<T>) {
  return adminRoute<{ id: string }>(`${config.module}.edit`, async (request, { params, session }) => {
    const { id } = await params;
    assertObjectId(id);

    const payload = config.schema.parse(await readJson<unknown>(request)) as Record<string, unknown>;
    for (const field of config.keepOnEmpty ?? []) {
      if (payload[field] === "" || payload[field] === undefined) delete payload[field];
    }

    const before = await config.model.findById(id).lean();
    if (!before) return fail(`${config.label} not found`, 404);

    const document = await config.model.findByIdAndUpdate(
      id,
      { $set: { ...payload, ...(config.onUpdate?.(session) ?? {}) } },
      { returnDocument: "after", runValidators: true },
    );

    await logActivity({
      session,
      action: "update",
      module: config.module,
      recordId: id,
      description: `Updated ${config.label} "${document?.[config.titleField ?? "name"] ?? ""}"`,
      request,
      before,
      after: document?.toObject(),
    });

    return ok(document?.toObject());
  });
}

/** DELETE /api/admin/<resource>/[id] */
export function makeDeleteHandler<T extends ZodType>(
  config: CrudConfig<T>,
  guard?: (id: string) => Promise<string | null>,
) {
  return adminRoute<{ id: string }>(`${config.module}.delete`, async (request, { params, session }) => {
    const { id } = await params;
    assertObjectId(id);

    if (guard) {
      const reason = await guard(id);
      if (reason) return fail(reason, 409);
    }

    const document = await config.model.findByIdAndDelete(id).lean();
    if (!document) return fail(`${config.label} not found`, 404);

    await logActivity({
      session,
      action: "delete",
      module: config.module,
      recordId: id,
      description: `Deleted ${config.label} "${(document as Record<string, unknown>)[config.titleField ?? "name"] ?? ""}"`,
      request,
      before: document,
    });

    return ok({ deleted: true });
  });
}

/** GET /api/admin/<resource>/options — lightweight select options. */
export function makeOptionsHandler({
  model,
  module,
  labelField = "name",
  sortField = "name",
  filter = {},
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  module: string;
  labelField?: string;
  sortField?: string;
  filter?: Record<string, unknown>;
}) {
  return adminRoute(`${module}.view`, async () => {
    const documents = await model
      .find(asFilter(filter))
      .select(labelField)
      .sort({ [sortField]: 1 })
      .limit(500)
      .lean();

    return ok(
      documents.map((document) => ({
        value: String(document._id),
        label: String((document as Record<string, unknown>)[labelField] ?? ""),
      })),
    );
  });
}

export type { NextRequest, RouteContext };
