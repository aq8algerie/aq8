/// <reference types="vite/client" />

declare module 'next/link' {
  import { ComponentType, AnchorHTMLAttributes, ReactNode } from 'react';
  export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    replace?: boolean;
    scroll?: boolean;
    prefetch?: boolean;
    passHref?: boolean;
    children?: ReactNode;
  }
  const Link: ComponentType<LinkProps>;
  export default Link;
}

declare module 'next' {
  export type Metadata = {
    title?: string;
    description?: string;
    keywords?: string[];
    authors?: Array<{ name: string; url?: string }>;
    robots?: { index?: boolean; follow?: boolean };
    alternates?: {
      canonical?: string;
    };
    openGraph?: {
      title?: string;
      description?: string;
      url?: string;
      siteName?: string;
      images?: Array<{
        url: string;
        width?: number;
        height?: number;
        alt?: string;
      }>;
      locale?: string;
      type?: string;
      publishedTime?: string;
      modifiedTime?: string;
      authors?: string[];
    };
  };
}
