/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ATPROTO_HANDLE?: string
  readonly ATPROTO_DID?: string
  readonly STANDARD_SITE_PUBLICATION_AT_URI?: string
  readonly STANDARD_SITE_SOURCE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
