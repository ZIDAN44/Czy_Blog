import path from 'node:path';
import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

const REPO = 'https://github.com/ZIDAN44/Czy_Blog';
const SOURCE = `${REPO}/blob/main/`;

// A GitHub Pages project site is served from /<repo>/, so the base must match the
// repository name. Override it for a fork or a custom domain: DOCS_BASE=/ npm run docs:build
const base = process.env.DOCS_BASE ?? '/Czy_Blog/';

export default withMermaid(
  defineConfig({
    title: 'Czy Blog',
    description: 'Documentation for the self-hosted Czy Blog platform.',
    base,
    lang: 'en-US',
    cleanUrls: true,
    lastUpdated: true,
    // The docs link into the source tree with ../apps/... paths so they stay
    // browsable on GitHub. Those files are not part of the site, so send those
    // links to GitHub instead of shipping them as dead relative links.
    markdown: {
      config: (md) => {
        const renderLink =
          md.renderer.rules.link_open ??
          ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

        md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
          const href = tokens[idx].attrGet('href');

          if (href?.startsWith('../')) {
            const from = path.posix.dirname(env?.relativePath ?? '');
            const target = path.posix.normalize(path.posix.join(from, href)).replace(/^\.\.\//, '');

            tokens[idx].attrSet('href', SOURCE + target);
            tokens[idx].attrSet('target', '_blank');
            tokens[idx].attrSet('rel', 'noreferrer');
          }

          return renderLink(tokens, idx, options, env, self);
        };
      },
    },
    themeConfig: {
      nav: [
        { text: 'Introduction', link: '/introduction' },
        { text: 'API', link: '/api' },
        { text: 'Deployment', link: '/deployment' },
      ],
      sidebar: [
        {
          text: 'Overview',
          items: [
            { text: 'Introduction', link: '/introduction' },
            { text: 'Architecture', link: '/architecture' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'API reference', link: '/api' },
            { text: 'Using the Content API', link: '/content-api' },
            { text: 'Environment variables', link: '/environment' },
          ],
        },
        {
          text: 'Running it',
          items: [
            { text: 'Production deployment', link: '/deployment' },
            { text: 'Development setup', link: '/development' },
          ],
        },
      ],
      socialLinks: [{ icon: 'github', link: REPO }],
      search: { provider: 'local' },
      editLink: {
        pattern: `${REPO}/edit/main/docs/:path`,
        text: 'Edit this page on GitHub',
      },
      footer: {
        message: 'Self-hosted blog platform',
        copyright: `© ${new Date().getFullYear()} Czy Blog`,
      },
    },
  }),
);
