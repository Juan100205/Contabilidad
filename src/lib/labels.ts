import type { CategoriaGasto, EstadoDeseo, EstadoDeuda, EstadoGasto, EstadoIngreso, EstadoMetaAhorro, TipoInteres } from "./types";

export const CATEGORIA_LABELS: Record<CategoriaGasto, string> = {
  Vivienda: "Vivienda",
  Transporte: "Transporte",
  Alimentacion: "Alimentación",
  Salud: "Salud",
  Educacion: "Educación",
  Entretenimiento: "Entretenimiento",
  Servicios: "Servicios públicos",
  Otro: "Otro",
};

export const ESTADO_DEUDA_LABELS: Record<EstadoDeuda, string> = {
  Activa: "Activa",
  Pagada: "Pagada",
  EnMora: "En mora",
};

export const ESTADO_META_LABELS: Record<EstadoMetaAhorro, string> = {
  Activa: "En progreso",
  Cumplida: "Cumplida",
  Pausada: "Pausada",
};

export const ESTADO_GASTO_LABELS: Record<EstadoGasto, string> = {
  Pendiente: "Pendiente",
  Pagado: "Pagado",
};

export const ESTADO_INGRESO_LABELS: Record<EstadoIngreso, string> = {
  Proyectado: "Proyectado",
  Recibido: "Recibido",
};

export const ESTADO_DESEO_LABELS: Record<EstadoDeseo, string> = {
  Activo: "Activo",
  Comprado: "Comprado",
  Cancelado: "Cancelado",
};

export const TIPO_INTERES_LABELS: Record<TipoInteres, string> = {
  Fijo: "Fijo",
  CompuestoMensual: "Interés compuesto mensual",
};

export const WEEKDAY_SHORT_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
