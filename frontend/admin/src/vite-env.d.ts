/// <reference types="vite/client" />

export interface AppSettings {
  base_url: string;
  title: string;
  version: string;
  logo: string;
  secure_path: string;
}

declare global {
  interface Window {
    settings?: AppSettings;
  }
}

export {};
