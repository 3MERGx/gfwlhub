// Add type definitions to extend Next.js types
import "next";

declare module "next" {
  interface Metadata {
    title?:
      | string
      | {
          default: string;
          template?: string;
          absolute?: string;
        };
    description?: string;
    metadataBase?: URL;
    // Add other properties used in your metadata
  }
}
