import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Check,
  Globe,
  Link2,
  Palette,
  PenLine,
  Rocket,
  Search,
  ShieldCheck,
  Store,
  Zap,
} from "lucide-react";

import { buildMetadata } from "@/lib/seo";
import { Section } from "@/components/site/ui";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Create Your Own Affiliate Portal or Ecommerce Portal — ManaDeals",
    description:
      "Launch your own branded affiliate or deals website in minutes. Your affiliate IDs, custom domain, SEO, blog and analytics included. No coding needed.",
    path: "/create-website",
  });
}

const FEATURES = [
  {
    icon: Rocket,
    title: "Live in minutes",
    text: "Sign up, name your store and publish. No developers, hosting or setup headaches.",
  },
  {
    icon: Link2,
    title: "Earn with your own affiliate IDs",
    text: "Add your Amazon, Flipkart and other network IDs. Every outbound click is tracked to you.",
  },
  {
    icon: Globe,
    title: "Custom domain with free SSL",
    text: "Start on your free subdomain and connect your own domain on Pro, secured automatically.",
  },
  {
    icon: Palette,
    title: "Your brand, your look",
    text: "Upload your logo, pick your colours and make the store feel like yours.",
  },
  {
    icon: Store,
    title: "Ready-made product catalogue",
    text: "Curate products, deals and coupons from our catalogue instead of starting from zero.",
  },
  {
    icon: PenLine,
    title: "Built-in blog",
    text: "Publish buying guides and reviews to bring in free search traffic over time.",
  },
  {
    icon: Search,
    title: "SEO built in",
    text: "Clean URLs, sitemaps, meta tags and structured data are generated for every page.",
  },
  {
    icon: BarChart3,
    title: "Clear analytics",
    text: "See views, clicks and estimated earnings for your store in one simple dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Fast, secure and reliable",
    text: "Runs on the same modern platform as ManaDeals, with protection against abuse.",
  },
];

const STEPS = [
  { title: "Create your account", text: "Sign up free with your email in under a minute." },
  { title: "Set up your store", text: "Choose a name, brand colours and your affiliate IDs." },
  { title: "Pick your products", text: "Select the categories, deals and coupons you want to show." },
  { title: "Share and earn", text: "Publish, promote your link and earn from every purchase." },
];

const PLANS = [
  {
    name: "Free",
    tagline: "Everything you need to get started",
    perks: ["Your own yourname.manadeals.online store", "Your affiliate IDs", "Catalogue curation", "Blog and basic analytics"],
    price: "₹0",
    was: null,
    period: "forever",
    highlight: false,
  },
  {
    name: "Pro",
    tagline: "For serious publishers",
    perks: ["Everything in Free", "Your own custom domain with SSL", "Stronger SEO indexing for product pages", "Priority for new features"],
    price: "₹999",
    was: "₹12,000",
    period: "per year",
    highlight: true,
  },
];

const FAQ = [
  {
    q: "Do I need technical skills?",
    a: "No. Everything is point and click from your dashboard. No coding, servers or hosting.",
  },
  {
    q: "Who gets the affiliate commission?",
    a: "You do. Add your own affiliate IDs and clicks from your store are tracked to your account.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. Pro stores can connect a custom domain, and SSL is set up for you.",
  },
  {
    q: "Is it really free to start?",
    a: "Yes. The Free plan gives you a working store on a manadeals.online subdomain.",
  },
];

function CtaLink({ light = false }: { light?: boolean }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/create-website/signup"
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 hover:bg-[#e85f00]"
      >
        Create your portal free
        <ArrowRight className="size-4" />
      </Link>
      <Link
        href="/create-website/login"
        className={
          light
            ? "inline-flex items-center rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/10"
            : "inline-flex items-center rounded-lg border border-[var(--border)] px-6 py-3 text-sm font-medium hover:bg-[var(--accent)]"
        }
      >
        Owner login
      </Link>
    </div>
  );
}

export default function CreateWebsitePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--secondary)]">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-[var(--primary)]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
            <Zap className="size-3.5 text-[var(--primary)]" />
            No coding. No hosting. Free to start.
          </span>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Create Your Own <span className="text-[var(--primary)]">Affiliate Portal</span> or{" "}
            <span className="text-[var(--primary)]">Ecommerce Portal</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
            Launch a professional, branded deals website in minutes. Use your own affiliate IDs, your
            own domain and our ready-made catalogue, and start earning.
          </p>
          <div className="mt-8 flex justify-center">
            <CtaLink light />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-white/60">
            {["Free plan available", "Custom domain + SSL", "Built-in SEO and blog"].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="size-4 text-[var(--success)]" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages */}
      <Section>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need to run your portal
          </h2>
          <p className="mt-2 text-[var(--muted-foreground)]">
            All the tools of a full affiliate business, without building any of it yourself.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--primary)] transition-colors group-hover:bg-[var(--primary)] group-hover:text-white">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <section className="border-y border-[var(--border)] bg-[var(--muted)]/40">
        <Section>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mt-2 text-[var(--muted-foreground)]">From sign up to first sale in four steps.</p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>
      </section>

      {/* Plans */}
      <Section>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start free, grow when ready</h2>
          <p className="mt-2 text-[var(--muted-foreground)]">Upgrade to Pro when you want your own domain.</p>
        </div>
        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.highlight
                  ? "relative flex flex-col rounded-xl border-2 border-[var(--primary)] bg-[var(--card)] p-6 shadow-lg"
                  : "flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
              }
            >
              {plan.highlight ? (
                <span className="absolute -top-3 left-6 rounded-full bg-[var(--primary)] px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{plan.tagline}</p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                {plan.was ? (
                  <span className="text-lg text-[var(--muted-foreground)] line-through">{plan.was}</span>
                ) : null}
                <span className="text-sm text-[var(--muted-foreground)]">{plan.period}</span>
              </div>
              {plan.was ? (
                <span className="mt-2 inline-block rounded-full bg-[var(--success)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--success)]">
                  Save ₹11,001 — 92% off
                </span>
              ) : null}
              <ul className="my-5 space-y-2.5">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Link
                href="/create-website/signup"
                className={
                  plan.highlight
                    ? "mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[#e85f00]"
                    : "mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-5 py-3 text-sm font-semibold hover:bg-[var(--accent)]"
                }
              >
                {plan.highlight ? "Get Pro for ₹999/year" : "Start free"}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <section className="border-t border-[var(--border)] bg-[var(--muted)]/40">
        <Section>
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mx-auto max-w-3xl space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-[var(--primary)] transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>
      </section>

      {/* Final CTA */}
      <Section>
        <div className="rounded-2xl bg-[var(--secondary)] p-8 text-center sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Ready to launch your own portal?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-white/70">
            Join today and have your store online in minutes.
          </p>
          <div className="mt-6 flex justify-center">
            <CtaLink light />
          </div>
        </div>
      </Section>
    </>
  );
}
