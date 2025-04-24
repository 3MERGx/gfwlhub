// Override Next.js internal types
declare namespace NextJS {
  interface GetStaticPropsContext {
    params?: Record<string, string>;
    preview?: boolean;
    previewData?: any;
  }
}

// Augment the Next.js module
declare module "next" {
  export interface PageProps {
    params?: Record<string, string>;
    searchParams?: Record<string, string | string[] | undefined>;
  }
}
