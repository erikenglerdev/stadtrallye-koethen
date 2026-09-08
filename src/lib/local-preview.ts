// These overrides apply only to the local development server.
export const desktopPreview = process.env.NODE_ENV === "development"
  && process.env.NEXT_PUBLIC_DESKTOP_PREVIEW === "true";

const requestedLanguage = process.env.NEXT_PUBLIC_PREVIEW_LANGUAGE;
export const previewLanguage = process.env.NODE_ENV === "development"
  && (requestedLanguage === "en" || requestedLanguage === "de")
  ? requestedLanguage : undefined;
