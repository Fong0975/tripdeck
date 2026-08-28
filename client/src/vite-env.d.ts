/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_DOMAIN: string;
  readonly VITE_API_PORT: string;
  readonly VITE_API_PUBLIC_PORT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
