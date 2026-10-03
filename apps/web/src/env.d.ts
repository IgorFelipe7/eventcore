declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_REPOSITORY_URL?: string
    readonly NEXT_PUBLIC_API_ORIGIN?: string
    readonly NEXT_PUBLIC_DISPLAY_TIME_ZONE?: string
  }
}
