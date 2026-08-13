/// <reference types="nativewind/types" />

/**
 * `global.css` is imported for its side effect: Metro hands it to NativeWind,
 * which compiles it into styles rather than into a module with exports.
 */
declare module '*.css'
