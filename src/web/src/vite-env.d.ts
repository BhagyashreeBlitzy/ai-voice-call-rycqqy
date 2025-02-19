/// <reference types="vite/client" />

// Environment variable type definitions
interface ImportMetaEnv {
  VITE_API_URL: string;
  VITE_WS_URL: string;
  VITE_ENVIRONMENT: 'development' | 'staging' | 'production';
}

// Import.meta type augmentation
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Static asset type declarations
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: string;
  export default content;
}