/**
 * Seed content for the admin wiki: the ManaDeals operating handbook.
 *
 * These pages are inserted by `npm run seed` and are editable in the panel
 * afterwards, so treat this file as the starting point rather than the source
 * of truth. Content is Markdown (see src/lib/utils/markdown.ts for the
 * supported subset).
 */
export type SeedWikiPage = {
  title: string;
  slug: string;
  section:
    | "getting-started"
    | "catalogue"
    | "offers"
    | "analytics"
    | "content"
    | "administration"
    | "operations"
    | "troubleshooting";
  excerpt: string;
  tags: string[];
  order: number;
  isPinned?: boolean;
  content: string;
};

export const WIKI_PAGES: SeedWikiPage[] = [
  {
    title: "Start here: how ManaDeals fits together",
    slug: "start-here",
    section: "getting-started",
    excerpt: "A five-minute tour of the platform, the modules and who owns what.",
    tags: ["overview", "onboarding"],
    order: 0,
    isPinned: true,
    content: `ManaDeals.online is an **affiliate deals platform**. We do not sell or ship anything: we
publish products, deals and coupons, and we earn commission when a visitor clicks through to a
partner store (Amazon, Flipkart, and others) and buys.

Everything in the admin panel exists to serve that loop.

## The loop

1. **Catalogue** — we list a product with one or more affiliate links.
2. **Discovery** — the storefront shows it through categories, deals, banners and blog articles.
3. **Click-out** — a visitor clicks an affiliate link; we record a click with its network, device and referrer.
4. **Commission** — the partner reports a sale; our estimated revenue reflects the network commission rate.

If a change you are about to make does not help one of those four steps, it probably belongs in a
backlog rather than in production.

## The modules

| Module | What it is for |
| --- | --- |
| Dashboard | Headline numbers and recent activity |
| Products | The catalogue: prices, images, affiliate links, SEO |
| Categories / Brands | How the catalogue is organised and filtered |
| Affiliate networks | Partner configuration: tracking ids, URL patterns, commission |
| Deals / Coupons | Time-boxed campaigns and discount codes |
| Reviews | Moderation queue for shopper reviews |
| Price tracking | Price history per product, with charts |
| Analytics | Views, clicks, CTR, revenue, by product, category and network |
| Users | Registered shoppers |
| Admins & roles | Who can sign in here, and what they can do |
| Banners / Blog / SEO | Storefront merchandising and organic traffic |
| Settings | Global configuration |
| Activity logs | An audit trail of every admin action |
| Wiki | This handbook |

## Ground rules

- **Never paste an affiliate tracking id into a product URL by hand.** Configure it once on the
  network (Affiliate networks → URL pattern) so it can be changed in one place.
- **Every price change is history.** Editing a product price writes a price-history row, which feeds
  the price charts. Do not "fix" prices by deleting and recreating products.
- **Deactivate rather than delete.** Deleting a product also deletes its price history and orphans
  its click records in the analytics.
- **Your actions are logged.** Activity logs record who changed what, with before and after values.

> New to the team? Read *Your first week* next, then the page for whichever module you own.`,
  },
  {
    title: "Your first week as an admin",
    slug: "your-first-week",
    section: "getting-started",
    excerpt: "A checklist for a new admin: access, safety habits and the daily routine.",
    tags: ["onboarding", "checklist"],
    order: 1,
    content: `## Day one

1. Sign in at **/admin/login** with the credentials a super admin sent you.
2. Go to **My profile** and change your password immediately. This signs out every other session
   using your account.
3. Check the sidebar. You only see the modules your role grants — if something you need is missing,
   ask a super admin rather than sharing another person's login.
4. Skim **Wiki → Start here** and the page for your module.

## Daily routine

- Open the **Dashboard** and set the range to *Yesterday*. Clicks and revenue should look like the
  day before; a sudden drop usually means a broken affiliate link or an expired deal.
- Clear the **Reviews** moderation queue.
- Check **Notifications** for price-drop and system alerts.

## Weekly routine

- **Analytics → Last 30 days**: look at the product performance table. Products with lots of views
  and few clicks usually have a pricing or image problem.
- Review deals expiring in the next seven days (**Deals**, sorted by end date).
- Spot-check ten products against the partner site for price drift.

## Habits that keep us out of trouble

- Use **Preview** before committing a CSV import. Nothing is written until you confirm.
- Prefer **Deactivate** over **Delete**.
- When in doubt about a permission, ask. Roles are cheap to adjust; a bad delete is not.`,
  },
  {
    title: "Adding a product",
    slug: "adding-a-product",
    section: "catalogue",
    excerpt: "Field-by-field guidance for a good catalogue entry, and what we never do.",
    tags: ["products", "how-to"],
    order: 0,
    isPinned: true,
    content: `Go to **Products → Add product**.

## Fields that matter most

### Name
Write it the way a shopper searches, not the way the partner lists it. Keep the model number if it
distinguishes variants.

- Good: \`Samsung Galaxy S24 5G (Onyx Black, 256GB)\`
- Bad: \`SAMSUNG Galaxy S24 5G AI Smartphone, Onyx Black, 8GB RAM, 256GB Storage, 50MP Camera...\`

### Slug
Auto-generated from the name on first save. **Do not change a slug after publishing** — it is the
public URL, and changing it breaks inbound links and search rankings.

### Prices
Enter the partner's list price as *Original price* and the current selling price as *Sale price*.

The discount percentage is **always calculated**, never typed:

\`\`\`
discount % = ((original - sale) / original) x 100
\`\`\`

If you type a sale price above the original price the form will refuse to save. That is deliberate:
inflated MRPs are the fastest way to lose reader trust.

### Affiliate links
A product can carry one link per network. Mark exactly one as **Primary** — that is the link the
storefront's main button uses; the others appear as price comparisons.

Paste the plain product URL. The tracking id configured on the network is appended for you.

### Flags
- **Featured** — homepage rail. Use sparingly, a dozen at a time.
- **Trending** — trending listings.
- **Deal of the day** — exactly one product should carry this at a time.

## Before you save

- Thumbnail set, and at least one gallery image.
- Category set (subcategory too, if one applies).
- SEO title and description filled in — see *Blog & SEO checklist*.
- Status: **Draft** while you are still working, **Active** when it is ready.`,
  },
  {
    title: "Importing products from CSV",
    slug: "importing-products-from-csv",
    section: "catalogue",
    excerpt: "The import format, how the preview works, and how to fix rejected rows.",
    tags: ["products", "import", "csv"],
    order: 1,
    content: `**Products → Import CSV** adds products in bulk. Nothing is written to the database
until you confirm the preview.

## The format

Download the template from the import screen. The columns are:

\`\`\`
name, description, category, brand, originalPrice, salePrice,
affiliateNetwork, affiliateUrl, imageUrl, rating, reviewCount, status
\`\`\`

- \`category\` and \`affiliateNetwork\` are matched **by name or slug and must already exist**.
  Create them first (Categories, Affiliate networks) or every row will be rejected.
- \`brand\` is optional; an unknown brand is simply left empty.
- \`originalPrice\` and \`salePrice\` are numbers without currency symbols or commas.
- \`status\` is one of \`active\`, \`inactive\`, \`draft\`.

Quote any field containing a comma:

\`\`\`
"Samsung Galaxy S24 5G (Onyx Black, 256GB)","Flagship phone",Mobiles,Samsung,89999,66999,Amazon India,https://www.amazon.in/dp/EXAMPLE,https://example.com/img.jpg,4.5,1200,active
\`\`\`

## Reading the preview

Every row comes back as one of three states:

| State | Meaning | What happens on import |
| --- | --- | --- |
| **New** | Resolved cleanly, no existing product with this slug | Created |
| **Duplicate** | A product with the same slug already exists | Skipped, unless you untick *Skip duplicates* |
| **Invalid** | Missing/unknown category or network, or bad prices | Never imported |

The reason for each invalid row is shown next to it. Fix the source file and re-upload — the preview
is free to run as many times as you like.

## Limits

- 2,000 rows per import.
- Imports are recorded in **Activity logs** with the created and skipped counts.

> Importing does not update existing products. To change prices in bulk, use the price-tracking
> module, or edit products individually so the price history stays accurate.`,
  },
  {
    title: "Category and brand conventions",
    slug: "category-and-brand-conventions",
    section: "catalogue",
    excerpt: "How we structure the tree, name things, and decide when a new category is justified.",
    tags: ["categories", "brands", "conventions"],
    order: 2,
    content: `## Structure

The tree is **two levels deep — parent and subcategory. No deeper.** A third level has never
survived contact with real shoppers.

- Parent: broad and evergreen (*Electronics*, *Fashion*, *Home & Kitchen*)
- Subcategory: what people actually search (*Mobiles*, *Laptops*, *Footwear*)

Drag a top-level category to reorder it; the order drives storefront navigation.

## Naming

- Title case, plural where natural: *Mobiles*, *Smart Watches*.
- No ampersands in subcategories (they read badly in URLs); parents may use them.
- The slug is generated from the name. **Do not edit a live slug** — it is a public URL.

## When to create a new category

Create one only when **all three** are true:

1. You expect at least 15 products in it within a month.
2. It is how a shopper would search, not how a supplier organises a warehouse.
3. Nothing existing covers it without stretching.

Otherwise use tags on the products and revisit later. A thin category is worse than no category: it
looks abandoned and it dilutes the ones that convert.

## Brands

Brands exist to power filtering and brand landing pages. Add the logo and website where you can —
a brand with a logo converts noticeably better on the storefront filters.

Keep brand names as the manufacturer writes them (*boAt*, not *Boat*).`,
  },
  {
    title: "Running deals and coupons",
    slug: "running-deals-and-coupons",
    section: "offers",
    excerpt: "Scheduling campaigns, the difference between a deal and a coupon, and expiry handling.",
    tags: ["deals", "coupons", "campaigns"],
    order: 0,
    content: `## Deal or coupon?

- A **deal** is a price on a product for a window of time. It has a start and end date and usually
  links to one product.
- A **coupon** is a code the shopper enters at the partner's checkout. It has an expiry, a minimum
  order value and a maximum discount.

A campaign often needs both: a deal to display the offer, and a coupon carrying the code.

## Deal types

| Type | Use it for |
| --- | --- |
| Standard | Ordinary time-boxed offers |
| Flash | Very short windows (hours). The storefront shows a countdown |
| Deal of the day | The single headline offer. One at a time |
| Featured | Pinned to the top of the deals page |

## Scheduling

Start and end dates are required, and the end must be after the start. Set them in your local time;
they are stored as absolute instants.

**Expired deals and coupons are marked expired automatically** whenever the lists are read, so you
do not need to clean up after a campaign. What you *should* do is check the following morning that
nothing important expired by accident.

## Before you launch

- Does the affiliate URL actually resolve to the product, with the tracking id attached?
- Is the deal price consistent with the product's sale price? Contradictions get screenshotted.
- Has the coupon been verified against the partner site today? Tick **Verified** only if you tested it.
- Is there a banner supporting it? (**Banners → home-hero**)

> Dead coupons are the single most common complaint we get. If a code stops working, untick
> *Verified* immediately, then investigate.`,
  },
  {
    title: "Reading the analytics",
    slug: "reading-the-analytics",
    section: "analytics",
    excerpt: "What each metric means, which ones lie, and the questions worth asking weekly.",
    tags: ["analytics", "metrics"],
    order: 0,
    content: `## The metrics

- **Product views** — a storefront product page was rendered.
- **Affiliate clicks** — someone clicked through to a partner. This is the number that pays us.
- **CTR** — clicks ÷ views. Our headline efficiency metric.
- **Conversions / estimated revenue** — attributed sales and commission. **Estimated** is the
  operative word: it is our commission rate applied to attributed clicks, not money in the bank.
  Reconcile against the partner dashboards before reporting it anywhere.

Every stat card shows a change against **the previous period of the same length**, so "last 7 days"
compares to the 7 days before that.

## Questions worth asking weekly

**High views, low CTR?**
The listing is attracting interest but not trust. Usually the price is stale, the image is poor, or
the discount is unbelievable. Check the price against the partner first.

**High CTR, low conversion?**
The click lands somewhere disappointing — out of stock, a different variant, or a price that changed
after the click. Verify the affiliate URL.

**One network dominating?**
Fine if it reflects commission rates. Not fine if it means the other networks' links are broken.

**Traffic sources shifting?**
A drop in organic traffic points at SEO or a search algorithm change; a drop in direct traffic
usually points at a broken campaign.

## Caveats

- Clicks are recorded per outbound click, not per unique visitor.
- Device, browser and country come from the request; treat them as directional.
- Deleting a product does not delete its click history, so historical totals stay correct even
  though the product no longer appears in the product table.`,
  },
  {
    title: "Price tracking runbook",
    slug: "price-tracking-runbook",
    section: "operations",
    excerpt: "How price history is recorded, how to update prices, and what happens when automation lands.",
    tags: ["prices", "runbook"],
    order: 0,
    content: `Accurate prices are the product. A stale price costs us a click and a reader.

## How history is recorded

Every price change flows through a single code path, whatever triggers it:

- Editing a product's sale price in **Products**
- Using **Update price** in **Price tracking**
- (Later) an automated price-update service

Each change writes a **price-history row** and updates the product's lowest and highest markers.
That history is what the price chart draws, so never work around it.

## The weekly sweep

1. **Price tracking**, sorted by *Updated* ascending — the stalest products first.
2. Open the partner page for the top twenty and compare.
3. Where it differs, click **Update price** and enter the current price.
4. Anything you cannot verify: set the product to **Inactive** rather than leaving a wrong price live.

## Reading the change column

- **Green (down)** — a price drop. These are our best content: they justify a deal or a notification.
- **Red (up)** — a rise. Check whether the discount still justifies featuring the product.
- **No change** — the last recorded observation matched.

## When automation arrives

The scheduled price service will call exactly the same function this screen does, so:

- history stays continuous across the switch,
- the \`source\` field distinguishes \`manual\` from \`api\` / \`scraper\` rows,
- price-drop notifications can be raised from the same event.

Nothing you record manually today is wasted or has to be migrated.`,
  },
  {
    title: "Blog and SEO checklist",
    slug: "blog-and-seo-checklist",
    section: "content",
    excerpt: "What to write, and the metadata checklist every published page has to pass.",
    tags: ["seo", "blog", "checklist"],
    order: 0,
    content: `Organic search is our cheapest traffic. Every published page should earn its ranking.

## What to write

The formats that work for a deals site, in order:

1. **"Best X under ₹Y"** roundups — high intent, easy to keep fresh.
2. **Sale calendars and event guides** — seasonal traffic spikes.
3. **Buying explainers** — how to read a spec, what a feature is worth.
4. **Price-history stories** — "is this actually a discount?" We have the data; almost nobody else does.

## The checklist

Before moving an article to **Published**:

- [ ] Title under 60 characters, with the search phrase near the front
- [ ] Slug is short, lowercase and hyphenated — and **final** (never change it later)
- [ ] Excerpt written (it becomes the meta description if SEO description is empty)
- [ ] Featured image set, roughly 1200x630
- [ ] SEO title and SEO description filled in explicitly
- [ ] Every product mentioned links to our product page, not straight to the partner
- [ ] Publish date set

Use **Scheduled** with a future publish date rather than sitting on a finished draft.

## Global defaults

**SEO** holds the site-wide title, description, Open Graph image, robots directive and analytics ids.
Those apply wherever a page does not define its own. The coverage cards at the top of that screen
show how much of the catalogue still lacks a SEO title — keep the products number above 80%.`,
  },
  {
    title: "Roles and permissions",
    slug: "roles-and-permissions",
    section: "administration",
    excerpt: "The five built-in roles, how permissions work, and the rules around super admins.",
    tags: ["security", "roles", "access"],
    order: 0,
    content: `Access is **role-based**. An admin has one role; a role holds a set of permissions such as
\`products.edit\` or \`analytics.view\`.

## The built-in roles

| Role | Intended for |
| --- | --- |
| **Super Admin** | Platform owners. Everything, including admins and roles |
| **Admin** | Day-to-day operators. Everything except admin and role management |
| **Editor** | Catalogue team: products, categories, brands, deals, coupons, prices |
| **Content Manager** | Blog, banners, SEO and this wiki |
| **Analyst** | Read-only, focused on analytics |

You can create additional roles and tick permissions individually.

## Rules that are enforced, not conventions

- The **Super Admin role cannot be edited**, and the **last active super admin cannot be demoted,
  deactivated or deleted**. This is deliberate: locking everyone out is unrecoverable.
- Built-in roles cannot be deleted. A custom role cannot be deleted while an admin is assigned to it.
- Resetting an admin's password **signs them out of every device**. So does changing your own.
- Permissions are checked again on the server for every request. Hiding a menu item is a convenience,
  not a security control.

## Granting access well

- Give the **narrowest role that lets someone do their job**. It is easy to widen later.
- Never share a login. Individual accounts are what make the activity log meaningful.
- Deactivate accounts the same day someone leaves the team.

> Every sign-in, failed sign-in, permission change and password reset appears in **Activity logs**.`,
  },
  {
    title: "Common problems",
    slug: "common-problems",
    section: "troubleshooting",
    excerpt: "Symptoms we have seen before, and where to look first.",
    tags: ["troubleshooting", "support"],
    order: 0,
    content: `## "I cannot see a module in the sidebar"

Your role does not have its \`.view\` permission. Ask a super admin to check
**Admins & roles → Roles**. The menu hides what you cannot use.

## "My account is locked"

Five failed sign-ins lock an account for 15 minutes. Either wait it out, or ask a super admin to
reset your password (**Admins & roles → reset icon**), which clears the lock.

## "A CSV import rejected every row"

Almost always the category or affiliate network name does not match anything that exists. They are
matched by name or slug, exactly. Create them first, then re-upload.

## "The discount percentage is wrong"

It is calculated from the two prices and cannot be typed. If it looks wrong, the original price is
wrong. Fix the price, not the percentage.

## "Clicks dropped to zero overnight"

In order of likelihood:

1. A deal or coupon expired and the storefront lost its main call to action.
2. An affiliate network was set to **Inactive**.
3. A tracking id changed at the partner and the URL pattern was not updated.

Check **Analytics → network split** first — if one network went to zero, it is that network's
configuration.

## "A price is wrong on the storefront"

Update it in **Price tracking** so the change is recorded as history. Do not delete and recreate the
product; that destroys its price chart.

## "Something changed and nobody knows who"

**Activity logs**. Filter by module, open the entry, and read the before/after values.

---

Still stuck? Add a page here describing what you found. The next person will thank you.`,
  },
];
