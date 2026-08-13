/**
 * Design tokens. Single source of truth for every color in the app.
 *
 * The app is gray: surfaces, borders and text are neutral. Color only ever
 * carries data (month bars, course/category chips) or importance (red).
 *
 * These are the values that used to live in `src/styles/tokens.css` as CSS
 * variables. React Native has no `var()`, so the hex lands here and anything
 * that needs a color at runtime rather than in a class reads it from
 * `src/design/tokens.ts`, which mirrors this file.
 */
const colors = {
  surface: '#ffffff',
  'surface-raised': '#ffffff', // sheets and FAB: same paper, lifted by shadow
  'surface-muted': '#f5f5f5', // today's cell, pressed rows

  'border-hairline': '#e5e5e5', // month grid, hour lines
  'border-strong': '#d4d4d4', // inputs

  ink: '#171717',
  'ink-secondary': '#737373', // metadata, day numbers
  'ink-tertiary': '#a3a3a3', // placeholders, days outside the month

  accent: '#171717', // FAB, active tab: neutral on purpose
  'on-accent': '#ffffff',

  // Red means one thing only: high importance. Vetoed as a data color.
  importance: '#dc2626',

  // Course palette (closed set, red-free).
  // All >= 5:1 against white and >= 34 CIE76 apart, so a 4px bar reads.
  'course-blue': '#2563eb',
  'course-teal': '#0f766e',
  'course-green': '#15803d',
  'course-amber': '#b45309',
  'course-violet': '#7c3aed',
  'course-magenta': '#be185d',
}

// Commitment categories are fixed aliases into the course palette.
colors['category-deporte'] = colors['course-blue']
colors['category-salud'] = colors['course-green']
colors['category-tramite'] = colors['course-amber']
colors['category-personal'] = colors['course-violet']

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Closed palette: `transparent` and the tokens, nothing else. A stray
    // `bg-red-500` should fail loudly rather than spend the importance color.
    colors: { transparent: 'transparent', ...colors },
    // Three sizes, no more: screen titles, content, metadata.
    fontSize: {
      title: ['20px', { lineHeight: '26px' }],
      body: ['15px', { lineHeight: '20px' }],
      meta: ['12px', { lineHeight: '16px' }],
    },
    extend: {
      borderRadius: {
        card: '8px',
        bar: '2px',
      },
      opacity: {
        // Recurring items keep their hue but drop in weight.
        recurring: '0.35',
      },
    },
  },
  plugins: [],
}
