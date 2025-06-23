/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    '@tailwindcss/postcss': {}, // Tailwind v4 用
    autoprefixer: {}           // ベンダープレフィクス
  }
};
