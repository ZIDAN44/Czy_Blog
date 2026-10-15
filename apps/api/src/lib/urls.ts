import { config } from '../config.js';

// The reader serves posts at /<slug> (apps/web/src/app/[slug]). Every link the API
// hands out (canonical, RSS, Content API) goes through here so they can't drift.
export function postPublicUrl(slug: string): string {
  return `${config.publicSiteUrl}/${slug}`;
}
