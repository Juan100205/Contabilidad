import type { CategoriaGasto } from "./types";

// Colores tomados de la paleta categórica validada (variante oscura),
// asignados por identidad de categoría — nunca por posición/orden —
// para que un filtro que cambie qué categorías aparecen no repinte las demás.
export const CATEGORY_COLORS: Record<CategoriaGasto, string> = {
  Vivienda: "#3987e5",
  Transporte: "#d95926",
  Alimentacion: "#199e70",
  Salud: "#c98500",
  Educacion: "#d55181",
  Entretenimiento: "#008300",
  Servicios: "#9085e9",
  Otro: "#e66767",
};

export const SERIES_COLORS = {
  income: "#3987e5",
  expense: "#d95926",
  debt: "#e66767",
  savings: "#199e70",
};

export const CHART_GRID = "#2a2b30";
export const CHART_MUTED_TEXT = "#898781";
