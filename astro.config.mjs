// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://privatools.com',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), sitemap(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
