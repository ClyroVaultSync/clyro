import type { MetadataRoute } from 'next';
import { siteConfig } from '../lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Setup flows are per-visitor launchers with no standalone content —
      // indexing them just puts dead ends in search results.
      disallow: ['/dashboard/setup/']
    },
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`
  };
}
