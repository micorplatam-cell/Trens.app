/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'savage-black': '#000000',
        'savage-dark': '#111111',
        'savage-red': '#DC2626',
        'savage-text': '#FFFFFF',
      },
      fontFamily: {
        // Assuming system font is sans-serif bold as default requested.
        // We can't load custom fonts easily without a font loader, but we can map 'sans' to system bold if needed,
        // or just apply it via classes.
      },
    },
  },
  plugins: [],
}
