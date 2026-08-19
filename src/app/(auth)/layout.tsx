import Image from "next/image";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <div className="relative hidden bg-[var(--secondary)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="ManaDeals"
            width={44}
            height={44}
            className="size-11 rounded-lg bg-white object-contain p-1"
          />
          <span className="text-lg font-semibold text-white">
            Mana<span className="text-[var(--primary)]">Deals</span>.online
          </span>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight text-white">
            Every deal, every network,
            <br />
            one control room.
          </h2>
          <p className="max-w-md text-sm text-white/70">
            Manage products, affiliate networks, price drops and campaign performance across Amazon,
            Flipkart and beyond.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-white/80">
          {[
            { label: "Networks", value: "Multi" },
            { label: "Tracking", value: "Real-time" },
            { label: "Roles", value: "Granular" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-white/5 p-4">
              <p className="text-lg font-semibold text-white">{stat.value}</p>
              <p className="text-xs uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
