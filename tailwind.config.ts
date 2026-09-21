import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Definidos como variables CSS (--color-*, tríos RGB) en globals.css para poder
        // cambiar de tema (oscuro / rosa pastel) según el usuario logueado. El patrón
        // rgb(var(...) / <alpha-value>) preserva los modificadores de opacidad de Tailwind
        // (ej. bg-brand/90).
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          raised: "rgb(var(--color-surface-raised) / <alpha-value>)",
          hover: "rgb(var(--color-surface-hover) / <alpha-value>)",
        },
        ink: {
          primary: "rgb(var(--color-ink-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-ink-secondary) / <alpha-value>)",
          muted: "rgb(var(--color-ink-muted) / <alpha-value>)",
        },
        line: "rgb(var(--color-line) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--color-brand) / <alpha-value>)",
          soft: "rgb(var(--color-brand-soft) / <alpha-value>)",
        },
        // Roles reused from the dataviz status + categorical palette (constantes en ambos temas).
        good: "#0ca30c",
        warning: "#fab219",
        critical: "#d03b3b",
        series: {
          income: "#3987e5",
          expense: "#d95926",
          debt: "#e66767",
          savings: "#199e70",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
