// Vitest (Vite) loads `?raw` imports as the file's text. Test-only.
declare module '*.txt?raw' {
  const content: string;
  export default content;
}
