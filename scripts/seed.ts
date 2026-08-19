/**
 * Seeds the ManaDeals database with the roles, super admin and demo catalogue
 * needed to explore the admin panel.
 *
 *   npm run seed          # inserts anything missing (safe to re-run)
 *   npm run seed -- --fresh   # wipes the seeded collections first
 *
 * Credentials come from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD; nothing is
 * hardcoded.
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import connectToDatabase from "../src/lib/mongodb";
import ActivityLog from "../src/models/ActivityLog";
import AdminUser from "../src/models/AdminUser";
import AffiliateNetwork from "../src/models/AffiliateNetwork";
import Banner from "../src/models/Banner";
import BlogPost from "../src/models/BlogPost";
import Brand from "../src/models/Brand";
import Category from "../src/models/Category";
import Click from "../src/models/Click";
import Coupon from "../src/models/Coupon";
import Deal from "../src/models/Deal";
import Notification from "../src/models/Notification";
import PriceHistory from "../src/models/PriceHistory";
import Product from "../src/models/Product";
import ProductView from "../src/models/ProductView";
import Role from "../src/models/Role";
import Settings from "../src/models/Settings";
import User from "../src/models/User";
import WikiPage from "../src/models/WikiPage";
import { BUILT_IN_ROLES, DEFAULT_ROLE_PERMISSIONS, ROLE_SLUGS } from "../src/lib/permissions";
import { slugify } from "../src/lib/utils/slug";
import { calculateDiscountPercentage } from "../src/lib/utils/format";
import { WIKI_PAGES } from "./wiki-content";

const FRESH = process.argv.includes("--fresh");

const CATEGORIES = [
  { name: "Electronics", children: ["Mobiles", "Laptops", "Audio", "Cameras"] },
  { name: "Fashion", children: ["Men", "Women", "Footwear"] },
  { name: "Home & Kitchen", children: ["Cookware", "Furniture"] },
  { name: "Beauty", children: [] },
  { name: "Fitness", children: [] },
  { name: "Gadgets", children: ["Smart Watches", "Accessories"] },
  { name: "Kids", children: [] },
  { name: "Grocery", children: [] },
  { name: "Appliances", children: ["Refrigerators", "Washing Machines"] },
];

const BRANDS = [
  "Samsung", "Apple", "OnePlus", "Xiaomi", "Realme", "boAt", "Noise", "HP", "Dell",
  "Lenovo", "Sony", "LG", "Philips", "Nike", "Adidas", "Puma", "Prestige", "Milton",
];

const NETWORKS = [
  {
    name: "Amazon India",
    code: "amazon",
    baseUrl: "https://www.amazon.in",
    affiliateUrlPattern: "{url}?tag={trackingId}",
    commissionPercentage: 4,
    trackingId: "manadeals-21",
  },
  {
    name: "Flipkart",
    code: "flipkart",
    baseUrl: "https://www.flipkart.com",
    affiliateUrlPattern: "{url}?affid={trackingId}",
    commissionPercentage: 6,
    trackingId: "manadeals",
  },
  {
    name: "Myntra",
    code: "myntra",
    baseUrl: "https://www.myntra.com",
    affiliateUrlPattern: "{url}?utm_source={trackingId}",
    commissionPercentage: 8,
    trackingId: "manadeals",
  },
];

const PRODUCT_TEMPLATES = [
  ["Samsung Galaxy S24 5G (Onyx Black, 256GB)", "Mobiles", "Samsung", 89999, 66999],
  ["Apple iPhone 15 (128GB, Blue)", "Mobiles", "Apple", 79900, 65999],
  ["OnePlus Nord CE4 5G (256GB)", "Mobiles", "OnePlus", 26999, 22999],
  ["Redmi Note 13 Pro+ 5G", "Mobiles", "Xiaomi", 31999, 26999],
  ["HP Pavilion 14 Intel Core i5 13th Gen", "Laptops", "HP", 78999, 59990],
  ["Dell Inspiron 15 Ryzen 5 Laptop", "Laptops", "Dell", 62990, 45990],
  ["Lenovo IdeaPad Slim 3 Laptop", "Laptops", "Lenovo", 55990, 38990],
  ["boAt Rockerz 550 Over Ear Headphones", "Audio", "boAt", 4990, 1499],
  ["Sony WH-CH720N Noise Cancelling Headphones", "Audio", "Sony", 14990, 8990],
  ["Noise ColorFit Pro 5 Smart Watch", "Smart Watches", "Noise", 7999, 3499],
  ["Philips Air Fryer HD9200", "Cookware", "Philips", 12995, 7499],
  ["Prestige Induction Cooktop 1900W", "Cookware", "Prestige", 3495, 2199],
  ["LG 7 Kg Fully Automatic Washing Machine", "Washing Machines", "LG", 32990, 24490],
  ["Samsung 253L Double Door Refrigerator", "Refrigerators", "Samsung", 34990, 25990],
  ["Nike Revolution 7 Running Shoes", "Footwear", "Nike", 4495, 2696],
  ["Adidas Galaxy 6 Men Running Shoes", "Footwear", "Adidas", 5599, 2799],
  ["Puma Unisex Backpack", "Accessories", "Puma", 1999, 899],
  ["Milton Thermosteel Flask 1000ml", "Cookware", "Milton", 1795, 1099],
  ["Realme Buds Air 6 TWS Earbuds", "Audio", "Realme", 3999, 2299],
  ["Apple Watch SE (2nd Gen) GPS 40mm", "Smart Watches", "Apple", 29900, 23900],
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)]!;
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function seedRoles() {
  const roles = new Map<string, mongoose.Types.ObjectId>();
  for (const role of BUILT_IN_ROLES) {
    const document = await Role.findOneAndUpdate(
      { slug: role.slug },
      {
        $set: {
          name: role.name,
          description: role.description,
          permissions: DEFAULT_ROLE_PERMISSIONS[role.slug],
          isSystem: true,
          status: "active",
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    roles.set(role.slug, document._id as unknown as mongoose.Types.ObjectId);
  }
  console.log(`  roles: ${roles.size}`);
  return roles;
}

async function seedSuperAdmin(roleId: mongoose.Types.ObjectId) {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@manadeals.online").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("SEED_ADMIN_PASSWORD is not set. Add it to .env.local before seeding.");
  }

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    console.log(`  super admin: already exists (${email})`);
    return existing._id as unknown as mongoose.Types.ObjectId;
  }

  const admin = await AdminUser.create({
    name: process.env.SEED_ADMIN_NAME || "Super Admin",
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: roleId,
    status: "active",
  });

  console.log(`  super admin: created (${email})`);
  return admin._id as unknown as mongoose.Types.ObjectId;
}

async function seedNetworks() {
  const networks = new Map<string, mongoose.Types.ObjectId>();
  for (const network of NETWORKS) {
    const document = await AffiliateNetwork.findOneAndUpdate(
      { code: network.code },
      { $set: { ...network, status: "active" } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    networks.set(network.code, document._id as unknown as mongoose.Types.ObjectId);
  }
  console.log(`  affiliate networks: ${networks.size}`);
  return networks;
}

async function seedCategories() {
  const categories = new Map<string, mongoose.Types.ObjectId>();
  let order = 0;

  for (const parent of CATEGORIES) {
    const parentDocument = await Category.findOneAndUpdate(
      { slug: slugify(parent.name) },
      {
        $set: {
          name: parent.name,
          slug: slugify(parent.name),
          parent: null,
          order: order++,
          status: "active",
          isFeatured: order <= 4,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    categories.set(parent.name, parentDocument._id as unknown as mongoose.Types.ObjectId);

    let childOrder = 0;
    for (const child of parent.children) {
      const childDocument = await Category.findOneAndUpdate(
        { slug: slugify(child) },
        {
          $set: {
            name: child,
            slug: slugify(child),
            parent: parentDocument._id,
            order: childOrder++,
            status: "active",
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
      categories.set(child, childDocument._id as unknown as mongoose.Types.ObjectId);
    }
  }

  console.log(`  categories: ${categories.size}`);
  return categories;
}

async function seedBrands() {
  const brands = new Map<string, mongoose.Types.ObjectId>();
  for (const name of BRANDS) {
    const document = await Brand.findOneAndUpdate(
      { slug: slugify(name) },
      { $set: { name, slug: slugify(name), status: "active" } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    brands.set(name, document._id as unknown as mongoose.Types.ObjectId);
  }
  console.log(`  brands: ${brands.size}`);
  return brands;
}

async function seedProducts(
  categories: Map<string, mongoose.Types.ObjectId>,
  brands: Map<string, mongoose.Types.ObjectId>,
  networks: Map<string, mongoose.Types.ObjectId>,
  adminId: mongoose.Types.ObjectId,
) {
  const parentOf: Record<string, string> = {};
  for (const parent of CATEGORIES) {
    for (const child of parent.children) parentOf[child] = parent.name;
  }

  const products: mongoose.Types.ObjectId[] = [];

  for (const [name, categoryName, brandName, originalPrice, salePrice] of PRODUCT_TEMPLATES as [
    string,
    string,
    string,
    number,
    number,
  ][]) {
    const slug = slugify(name);
    const parentName = parentOf[categoryName] ?? categoryName;

    const document = await Product.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          slug,
          shortDescription: `${name} at the lowest online price on ManaDeals.`,
          description: `<p>${name} — compare live prices across Amazon and Flipkart, track price drops and grab the best deal on ManaDeals.online.</p>`,
          category: categories.get(parentName),
          subcategory: parentOf[categoryName] ? categories.get(categoryName) : null,
          brand: brands.get(brandName),
          thumbnail: `https://picsum.photos/seed/${slug}/400/400`,
          images: [`https://picsum.photos/seed/${slug}-1/800/800`],
          originalPrice,
          salePrice,
          discountPercentage: calculateDiscountPercentage(originalPrice, salePrice),
          currency: "INR",
          affiliateLinks: [
            {
              network: networks.get("amazon"),
              affiliateUrl: `https://www.amazon.in/dp/${slug.slice(0, 10).toUpperCase()}?tag=manadeals-21`,
              externalProductId: slug.slice(0, 10).toUpperCase(),
              price: salePrice,
              isPrimary: true,
            },
            {
              network: networks.get("flipkart"),
              affiliateUrl: `https://www.flipkart.com/${slug}/p/itm${randomInt(100000, 999999)}`,
              price: salePrice + randomInt(-800, 900),
              isPrimary: false,
            },
          ],
          rating: Number((3.6 + Math.random() * 1.4).toFixed(1)),
          reviewCount: randomInt(80, 25000),
          availability: "in-stock",
          isFeatured: Math.random() > 0.6,
          isTrending: Math.random() > 0.7,
          isDealOfTheDay: Math.random() > 0.88,
          status: "active",
          viewCount: randomInt(200, 9000),
          clickCount: randomInt(20, 1800),
          lowestPrice: salePrice,
          highestPrice: originalPrice,
          seo: { title: name, description: `Buy ${name} at the best price.`, keywords: [] },
          createdBy: adminId,
          updatedBy: adminId,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    products.push(document._id as unknown as mongoose.Types.ObjectId);

    // A short price history so the price-tracking charts have something to draw.
    const existingHistory = await PriceHistory.countDocuments({ product: document._id });
    if (existingHistory === 0) {
      let previous = originalPrice;
      for (let index = 8; index >= 0; index -= 1) {
        const current =
          index === 0 ? salePrice : Math.round(salePrice + (originalPrice - salePrice) * (index / 9));
        await PriceHistory.create({
          product: document._id,
          currentPrice: current,
          previousPrice: previous,
          priceChange: current - previous,
          changePercentage: previous ? Number((((current - previous) / previous) * 100).toFixed(2)) : 0,
          recordedAt: daysAgo(index * 4),
          source: "manual",
        });
        previous = current;
      }
    }
  }

  console.log(`  products: ${products.length}`);
  return products;
}

async function seedDealsAndCoupons(
  products: mongoose.Types.ObjectId[],
  categories: Map<string, mongoose.Types.ObjectId>,
  networks: Map<string, mongoose.Types.ObjectId>,
  adminId: mongoose.Types.ObjectId,
) {
  const dealTitles = [
    "Big Billion Electronics Fest",
    "Great Indian Mobile Sale",
    "Flash Deal: Audio under 2999",
    "Kitchen Appliances Carnival",
    "Weekend Fashion Bonanza",
    "Deal of the Day: Smart Watches",
  ];

  let deals = 0;
  for (const [index, title] of dealTitles.entries()) {
    const originalPrice = randomInt(4000, 60000);
    const dealPrice = Math.round(originalPrice * (0.55 + Math.random() * 0.3));
    await Deal.findOneAndUpdate(
      { slug: slugify(title) },
      {
        $set: {
          title,
          slug: slugify(title),
          description: `${title} — limited period offer curated by ManaDeals.`,
          image: `https://picsum.photos/seed/deal-${index}/800/400`,
          product: products[index % products.length],
          affiliateNetwork: index % 2 === 0 ? networks.get("amazon") : networks.get("flipkart"),
          dealType: index === 2 ? "flash" : index === 5 ? "deal-of-the-day" : "standard",
          originalPrice,
          dealPrice,
          discountPercentage: calculateDiscountPercentage(originalPrice, dealPrice),
          affiliateUrl: "https://www.amazon.in/deals?tag=manadeals-21",
          startDate: daysAgo(3),
          endDate: new Date(Date.now() + randomInt(2, 20) * 24 * 60 * 60 * 1000),
          isFeatured: index < 2,
          status: "active",
          createdBy: adminId,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    deals += 1;
  }

  const coupons = [
    { code: "MANA100", title: "Flat ₹100 off on orders above ₹999", discountType: "flat", discountValue: 100 },
    { code: "SAVE10", title: "10% off on electronics", discountType: "percentage", discountValue: 10 },
    { code: "FASHION25", title: "25% off on fashion", discountType: "percentage", discountValue: 25 },
    { code: "KITCHEN500", title: "₹500 off on kitchen appliances", discountType: "flat", discountValue: 500 },
  ];

  for (const [index, coupon] of coupons.entries()) {
    await Coupon.findOneAndUpdate(
      { code: coupon.code, affiliateNetwork: index % 2 === 0 ? networks.get("amazon") : networks.get("flipkart") },
      {
        $set: {
          ...coupon,
          description: `${coupon.title}. Applicable on select products.`,
          affiliateNetwork: index % 2 === 0 ? networks.get("amazon") : networks.get("flipkart"),
          category: categories.get("Electronics"),
          minimumOrderValue: 999,
          maximumDiscount: 2000,
          startDate: daysAgo(10),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          affiliateUrl: "https://www.amazon.in?tag=manadeals-21",
          isVerified: true,
          status: "active",
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  console.log(`  deals: ${deals}, coupons: ${coupons.length}`);
}

async function seedUsers() {
  const names = [
    "Aarav Sharma", "Diya Patel", "Vihaan Reddy", "Ananya Iyer", "Arjun Nair",
    "Ishita Rao", "Kabir Singh", "Meera Krishnan", "Rohan Gupta", "Sara Ali",
    "Aditya Verma", "Neha Joshi",
  ];

  const users: mongoose.Types.ObjectId[] = [];
  for (const name of names) {
    const email = `${slugify(name)}@example.com`;
    const document = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          email,
          status: Math.random() > 0.12 ? "active" : "inactive",
          emailVerified: true,
          lastLoginAt: daysAgo(randomInt(0, 25)),
          createdAt: daysAgo(randomInt(10, 200)),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    users.push(document._id as unknown as mongoose.Types.ObjectId);
  }
  console.log(`  users: ${users.length}`);
  return users;
}

async function seedAnalytics(
  products: mongoose.Types.ObjectId[],
  networks: Map<string, mongoose.Types.ObjectId>,
  users: mongoose.Types.ObjectId[],
) {
  const existing = await Click.estimatedDocumentCount();
  if (existing > 0) {
    console.log("  analytics: already populated, skipped");
    return;
  }

  const devices = ["desktop", "mobile", "mobile", "mobile", "tablet"] as const;
  const browsers = ["Chrome", "Chrome", "Safari", "Edge", "Firefox"];
  const countries = ["India", "India", "India", "United States", "United Arab Emirates"];
  const referrers = ["google.com", "direct", "instagram.com", "telegram.org", "facebook.com"];
  const networkIds = [...networks.values()];

  const clicks: Record<string, unknown>[] = [];
  const views: Record<string, unknown>[] = [];

  for (let day = 59; day >= 0; day -= 1) {
    // Weekends are busier, which makes the dashboard charts look realistic.
    const date = daysAgo(day);
    const weekendBoost = [0, 6].includes(date.getDay()) ? 1.6 : 1;
    const clicksToday = Math.round(randomInt(40, 110) * weekendBoost);
    const viewsToday = clicksToday * randomInt(5, 9);

    for (let index = 0; index < clicksToday; index += 1) {
      const timestamp = new Date(date);
      timestamp.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59), 0);
      const network = pick(networkIds);
      const converted = Math.random() < 0.05;
      clicks.push({
        product: pick(products),
        affiliateNetwork: network,
        user: Math.random() > 0.6 ? pick(users) : null,
        device: pick([...devices]),
        browser: pick(browsers),
        country: pick(countries),
        referrer: pick(referrers),
        converted,
        estimatedRevenue: converted ? randomInt(60, 900) : 0,
        clickedAt: timestamp,
      });
    }

    for (let index = 0; index < viewsToday; index += 1) {
      const timestamp = new Date(date);
      timestamp.setHours(randomInt(0, 23), randomInt(0, 59), 0, 0);
      views.push({
        product: pick(products),
        device: pick([...devices]),
        browser: pick(browsers),
        country: pick(countries),
        referrer: pick(referrers),
        viewedAt: timestamp,
      });
    }
  }

  await Click.insertMany(clicks, { ordered: false });
  await ProductView.insertMany(views, { ordered: false });
  console.log(`  analytics: ${clicks.length} clicks, ${views.length} views`);
}

async function seedContent(adminId: mongoose.Types.ObjectId, categories: Map<string, mongoose.Types.ObjectId>) {
  const banners = [
    { title: "Mega Electronics Sale", subtitle: "Up to 70% off", position: "home-hero", priority: 10 },
    { title: "Fashion Days", subtitle: "Flat 50% off on top brands", position: "home-middle", priority: 5 },
  ];

  for (const [index, banner] of banners.entries()) {
    await Banner.findOneAndUpdate(
      { title: banner.title },
      {
        $set: {
          ...banner,
          desktopImage: `https://picsum.photos/seed/banner-${index}/1600/500`,
          mobileImage: `https://picsum.photos/seed/banner-m-${index}/800/600`,
          ctaText: "Shop now",
          ctaUrl: "/deals",
          startDate: daysAgo(5),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: "active",
          createdBy: adminId,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  const posts = [
    {
      title: "Best Smartphones Under ₹30,000 in India",
      excerpt: "Our pick of the best value phones you can buy right now.",
      status: "published",
    },
    {
      title: "How to Spot a Genuine Amazon Deal",
      excerpt: "Price history, MRP inflation and the tricks to watch out for.",
      status: "published",
    },
    {
      title: "Upcoming Sale Calendar 2026",
      excerpt: "Every major Indian sale event, mapped out.",
      status: "draft",
    },
  ];

  for (const post of posts) {
    await BlogPost.findOneAndUpdate(
      { slug: slugify(post.title) },
      {
        $set: {
          ...post,
          slug: slugify(post.title),
          content: `<p>${post.excerpt}</p><p>Full article coming soon.</p>`,
          featuredImage: `https://picsum.photos/seed/${slugify(post.title)}/1200/630`,
          author: adminId,
          categories: [categories.get("Electronics")].filter(Boolean),
          tags: ["deals", "guide"],
          publishedAt: post.status === "published" ? daysAgo(randomInt(2, 40)) : null,
          readingMinutes: randomInt(3, 9),
          viewCount: randomInt(50, 3000),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  await Settings.findOneAndUpdate(
    { key: "global" },
    {
      $setOnInsert: {
        key: "global",
        general: {
          siteName: process.env.NEXT_PUBLIC_SITE_NAME || "ManaDeals.online",
          tagline: "Smart deals, every day.",
          logo: "/logo.png",
          contactEmail: process.env.SEED_ADMIN_EMAIL || "admin@manadeals.online",
        },
        seo: {
          title: "ManaDeals.online — Best Deals from Amazon, Flipkart & more",
          description:
            "Handpicked deals, coupons and price drops across Amazon, Flipkart and other affiliate stores.",
          keywords: ["deals", "offers", "amazon", "flipkart", "coupons", "india"],
        },
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  await Notification.findOneAndUpdate(
    { title: "Welcome to ManaDeals Admin" },
    {
      $set: {
        title: "Welcome to ManaDeals Admin",
        message: "Change the seeded super admin password before going live.",
        type: "warning",
        channel: "in-app",
        link: "/admin/profile",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  console.log(`  content: ${banners.length} banners, ${posts.length} posts, settings, notification`);
}

async function seedWiki(adminId: mongoose.Types.ObjectId) {
  for (const page of WIKI_PAGES) {
    await WikiPage.findOneAndUpdate(
      { slug: page.slug },
      {
        // Only $setOnInsert for the body so a re-seed never overwrites edits
        // the team has made to a page in the panel.
        $setOnInsert: {
          ...page,
          isPinned: page.isPinned ?? false,
          status: "published",
          author: adminId,
          updatedBy: adminId,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }
  console.log(`  wiki: ${WIKI_PAGES.length} handbook pages`);
}

async function wipe() {
  console.log("→ --fresh: clearing seeded collections");
  await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
    AffiliateNetwork.deleteMany({}),
    Deal.deleteMany({}),
    Coupon.deleteMany({}),
    PriceHistory.deleteMany({}),
    Click.deleteMany({}),
    ProductView.deleteMany({}),
    User.deleteMany({}),
    Banner.deleteMany({}),
    BlogPost.deleteMany({}),
    Notification.deleteMany({}),
    ActivityLog.deleteMany({}),
    WikiPage.deleteMany({}),
  ]);
}

async function main() {
  console.log("→ connecting to MongoDB");
  await connectToDatabase();

  if (FRESH) await wipe();

  console.log("→ seeding");
  const roles = await seedRoles();
  const adminId = await seedSuperAdmin(roles.get(ROLE_SLUGS.SUPER_ADMIN)!);
  const networks = await seedNetworks();
  const categories = await seedCategories();
  const brands = await seedBrands();
  const products = await seedProducts(categories, brands, networks, adminId);
  await seedDealsAndCoupons(products, categories, networks, adminId);
  const users = await seedUsers();
  await seedAnalytics(products, networks, users);
  await seedContent(adminId, categories);
  await seedWiki(adminId);

  console.log("\n✔ Seed complete.");
  console.log(`  Sign in at /admin/login as ${process.env.SEED_ADMIN_EMAIL}`);
  console.log("  Change this password immediately after the first sign-in.\n");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("✖ Seed failed:", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
