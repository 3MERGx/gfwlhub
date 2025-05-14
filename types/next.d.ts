// Add proper type definitions for Next.js metadata
declare module "next/types" {
  export interface Metadata {
    title?:
      | string
      | {
          default: string;
          template?: string;
          absolute?: string;
        };
    description?: string;
    metadataBase?: URL;
    [key: string]: any;
  }
}

// Fix the params type issue
declare module "next" {
  export interface PageProps {
    params: any;
    searchParams?: any;
  }

  export type { Metadata } from "next/types";
}
