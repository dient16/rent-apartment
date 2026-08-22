// Global stylesheets are side-effect imports
declare module '*.css';

// Image imports resolve to URL strings (webpack asset/resource, Vite parity)
declare module '*.png' {
   const src: string;
   export default src;
}
declare module '*.jpg' {
   const src: string;
   export default src;
}
declare module '*.jpeg' {
   const src: string;
   export default src;
}
declare module '*.webp' {
   const src: string;
   export default src;
}
declare module '*.avif' {
   const src: string;
   export default src;
}
declare module '*.gif' {
   const src: string;
   export default src;
}
declare module '*.svg' {
   const src: string;
   export default src;
}
