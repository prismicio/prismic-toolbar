export function isEmbeddedPreview() {
  // The app's preview redirect may drop `prismic_embed_preview`. The browsing
  // context is the durable signal that this toolbar is running in an embed.
  return window.self !== window.top;
}
