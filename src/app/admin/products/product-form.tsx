"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { apiClient, ApiClientError } from "@/lib/api-client";
import { productSchema } from "@/lib/validations/catalogue";
import { useOptions } from "@/hooks/use-options";
import { calculateDiscountPercentage, formatCurrency } from "@/lib/utils/format";
import { slugify } from "@/lib/utils/slug";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field, ToggleRow } from "@/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";

type ProductInput = z.input<typeof productSchema>;
type ProductValues = z.output<typeof productSchema>;

const EMPTY: ProductInput = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  category: "",
  subcategory: null,
  brand: null,
  thumbnail: "",
  images: [],
  originalPrice: 0,
  salePrice: 0,
  currency: "INR",
  affiliateLinks: [{ network: "", affiliateUrl: "", trackingUrl: "", externalProductId: "", price: null, isPrimary: true }],
  sku: "",
  rating: 0,
  reviewCount: 0,
  availability: "in-stock",
  isFeatured: false,
  isTrending: false,
  isDealOfTheDay: false,
  status: "active",
  seo: { title: "", description: "", keywords: [] },
};

export function ProductForm({
  productId,
  initialValues,
}: {
  productId?: string;
  initialValues?: Partial<ProductInput>;
}) {
  const router = useRouter();
  const categories = useOptions("categories");
  const brands = useOptions("brands");
  const networks = useOptions("affiliate-networks");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput, unknown, ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { ...EMPTY, ...initialValues },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "affiliateLinks" });

  const name = watch("name");
  const slug = watch("slug");
  const originalPrice = Number(watch("originalPrice")) || 0;
  const salePrice = Number(watch("salePrice")) || 0;

  // Keep the slug in step with the name until the admin edits it by hand.
  useEffect(() => {
    if (!productId && name && !slug) setValue("slug", slugify(name));
  }, [name, slug, productId, setValue]);

  const discount = useMemo(
    () => calculateDiscountPercentage(originalPrice, salePrice),
    [originalPrice, salePrice],
  );

  async function onSubmit(values: ProductValues) {
    setFormError(null);
    try {
      if (productId) {
        await apiClient.put(`/api/admin/products/${productId}`, values);
        toast.success("Product updated");
      } else {
        await apiClient.post("/api/admin/products", values);
        toast.success("Product created");
      }
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Could not save the product";
      setFormError(message);
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeader
        title={productId ? "Edit product" : "Add product"}
        description="Prices, affiliate links and SEO metadata for a single catalogue entry."
        actions={
          <>
            <Button asChild variant="outline" type="button">
              <Link href="/admin/products">
                <ArrowLeft />
                Back
              </Link>
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {productId ? "Save changes" : "Create product"}
            </Button>
          </>
        }
      />

      {formError ? (
        <p className="mb-4 rounded-lg bg-[#fef3f2] px-4 py-3 text-sm text-[var(--destructive)]">
          {formError}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Product name"
                htmlFor="name"
                error={errors.name?.message}
                required
                className="sm:col-span-2"
              >
                <Input id="name" {...register("name")} />
              </Field>

              <Field
                label="Slug"
                htmlFor="slug"
                error={errors.slug?.message}
                hint="Used in the public product URL"
                required
              >
                <Input id="slug" {...register("slug")} />
              </Field>

              <Field label="SKU" htmlFor="sku" error={errors.sku?.message}>
                <Input id="sku" {...register("sku")} />
              </Field>

              <Field
                label="Short description"
                htmlFor="shortDescription"
                error={errors.shortDescription?.message}
                className="sm:col-span-2"
              >
                <Textarea id="shortDescription" rows={2} {...register("shortDescription")} />
              </Field>

              <Field
                label="Full description"
                htmlFor="description"
                error={errors.description?.message}
                hint="Basic HTML is supported"
                className="sm:col-span-2"
              >
                <Textarea id="description" rows={6} {...register("description")} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Original price" htmlFor="originalPrice" error={errors.originalPrice?.message} required>
                <Input id="originalPrice" type="number" min={0} step="0.01" {...register("originalPrice")} />
              </Field>
              <Field label="Sale price" htmlFor="salePrice" error={errors.salePrice?.message} required>
                <Input id="salePrice" type="number" min={0} step="0.01" {...register("salePrice")} />
              </Field>
              <Field label="Currency" htmlFor="currency" error={errors.currency?.message}>
                <NativeSelect id="currency" {...register("currency")}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </NativeSelect>
              </Field>
              <div className="sm:col-span-3">
                <div className="flex items-center gap-3 rounded-lg bg-[var(--muted)] px-4 py-3 text-sm">
                  <Badge variant="success">{discount}% off</Badge>
                  <span className="text-[var(--muted-foreground)]">
                    Customers save {formatCurrency(Math.max(originalPrice - salePrice, 0))}. Discount is
                    recalculated automatically on save.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Affiliate links</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  append({
                    network: "",
                    affiliateUrl: "",
                    trackingUrl: "",
                    externalProductId: "",
                    price: null,
                    isPrimary: false,
                  })
                }
              >
                <Plus />
                Add network
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.affiliateLinks?.message ? (
                <p className="text-xs font-medium text-[var(--destructive)]">
                  {errors.affiliateLinks.message}
                </p>
              ) : null}

              {fields.map((field, index) => (
                <div key={field.id} className="grid gap-3 rounded-lg border border-[var(--border)] p-4 sm:grid-cols-2">
                  <Field
                    label="Network"
                    error={errors.affiliateLinks?.[index]?.network?.message}
                    required
                  >
                    <NativeSelect {...register(`affiliateLinks.${index}.network`)}>
                      <option value="">Select a network</option>
                      {networks.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>

                  <Field
                    label="Product ID / ASIN"
                    error={errors.affiliateLinks?.[index]?.externalProductId?.message}
                  >
                    <Input {...register(`affiliateLinks.${index}.externalProductId`)} />
                  </Field>

                  <Field
                    label="Affiliate URL"
                    error={errors.affiliateLinks?.[index]?.affiliateUrl?.message}
                    required
                    className="sm:col-span-2"
                  >
                    <Input placeholder="https://" {...register(`affiliateLinks.${index}.affiliateUrl`)} />
                  </Field>

                  <Field
                    label="Tracking URL"
                    error={errors.affiliateLinks?.[index]?.trackingUrl?.message}
                    className="sm:col-span-2"
                  >
                    <Input placeholder="https://" {...register(`affiliateLinks.${index}.trackingUrl`)} />
                  </Field>

                  <Field label="Price on this network" error={errors.affiliateLinks?.[index]?.price?.message}>
                    <Input type="number" min={0} step="0.01" {...register(`affiliateLinks.${index}.price`)} />
                  </Field>

                  <div className="flex items-end justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--primary)]"
                        {...register(`affiliateLinks.${index}.isPrimary`)}
                      />
                      Primary link
                    </label>
                    {fields.length > 1 ? (
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="text-[var(--destructive)]" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="SEO title" htmlFor="seoTitle" error={errors.seo?.title?.message}>
                <Input id="seoTitle" {...register("seo.title")} />
              </Field>
              <Field label="SEO description" htmlFor="seoDescription" error={errors.seo?.description?.message}>
                <Textarea id="seoDescription" rows={3} {...register("seo.description")} />
              </Field>
              <Field
                label="SEO keywords"
                htmlFor="seoKeywords"
                hint="Comma separated"
                error={errors.seo?.keywords?.message}
              >
                <Input
                  id="seoKeywords"
                  defaultValue={(initialValues?.seo?.keywords ?? []).join(", ")}
                  onChange={(event) =>
                    setValue(
                      "seo.keywords",
                      event.target.value
                        .split(",")
                        .map((keyword) => keyword.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Category" htmlFor="category" error={errors.category?.message} required>
                <NativeSelect id="category" {...register("category")}>
                  <option value="">Select a category</option>
                  {categories.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Subcategory" htmlFor="subcategory" error={errors.subcategory?.message}>
                <NativeSelect id="subcategory" {...register("subcategory")}>
                  <option value="">None</option>
                  {categories.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Brand" htmlFor="brand" error={errors.brand?.message}>
                <NativeSelect id="brand" {...register("brand")}>
                  <option value="">None</option>
                  {brands.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Availability" htmlFor="availability" error={errors.availability?.message}>
                <NativeSelect id="availability" {...register("availability")}>
                  <option value="in-stock">In stock</option>
                  <option value="limited">Limited</option>
                  <option value="out-of-stock">Out of stock</option>
                  <option value="pre-order">Pre-order</option>
                </NativeSelect>
              </Field>

              <Field label="Status" htmlFor="status" error={errors.status?.message}>
                <NativeSelect id="status" {...register("status")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                </NativeSelect>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Thumbnail URL" htmlFor="thumbnail" error={errors.thumbnail?.message}>
                <Input id="thumbnail" placeholder="https://" {...register("thumbnail")} />
              </Field>
              <Field
                label="Gallery image URLs"
                htmlFor="images"
                hint="One URL per line"
                error={errors.images?.message}
              >
                <Textarea
                  id="images"
                  rows={4}
                  defaultValue={(initialValues?.images ?? []).join("\n")}
                  onChange={(event) =>
                    setValue(
                      "images",
                      event.target.value
                        .split("\n")
                        .map((url) => url.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ratings &amp; visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rating" htmlFor="rating" error={errors.rating?.message}>
                  <Input id="rating" type="number" min={0} max={5} step="0.1" {...register("rating")} />
                </Field>
                <Field label="Review count" htmlFor="reviewCount" error={errors.reviewCount?.message}>
                  <Input id="reviewCount" type="number" min={0} {...register("reviewCount")} />
                </Field>
              </div>

              <ToggleRow
                label="Featured"
                description="Show on the homepage featured rail"
                checked={Boolean(watch("isFeatured"))}
                onCheckedChange={(value) => setValue("isFeatured", value)}
              />
              <ToggleRow
                label="Trending"
                description="Include in trending listings"
                checked={Boolean(watch("isTrending"))}
                onCheckedChange={(value) => setValue("isTrending", value)}
              />
              <ToggleRow
                label="Deal of the day"
                description="Highlight as today's headline deal"
                checked={Boolean(watch("isDealOfTheDay"))}
                onCheckedChange={(value) => setValue("isDealOfTheDay", value)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
