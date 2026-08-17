import type { MetadataRoute } from 'next';
import { siteConfig } from '../lib/site-config';

const ROUTES: { path: string; priority: number; changeFrequency: 'monthly' | 'yearly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'monthly' },
  { path: '/password-generator', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/dashboard', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/security', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.4, changeFrequency: 'yearly' }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.map(route => ({
    url: `${siteConfig.siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
}
