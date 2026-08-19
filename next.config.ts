import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Vercel's image optimizer is metered, and once the plan's quota is used up
     * it answers every request with HTTP 402, which silently breaks each
     * <Image> on the site.
     *
     * Nothing here needs it: the brand assets are pre-sized by
     * `npm run icons`, and catalogue imagery is already hosted and sized by the
     * retailers. Serving images as-is trades a little bandwidth for images that
     * cannot break for billing reasons.
     *
     * To re-enable optimization later: remove this flag and add the retailer
     * image hosts to `remotePatterns`.
     */
    unoptimized: true,
  },
};

export default nextConfig;
