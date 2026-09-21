"use client";

import { Plus, Trash2, Pencil, RefreshCw, Check, Undo2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, FieldGroup, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { formatMoney, formatDate, todayIso } from "@/lib/format";
import { ESTADO_INGRESO_LABELS } from "@/lib/labels";
import type { Currency, EstadoIngreso, IncomeEntry } from "@/lib/types";

const emptyForm = {
  description: "",
  source: "",
  amount: "",
  currencyCode: "COP",
  date: todayIso(),
  isRecurring: false,
  administerUntil: "",
  storageLocation: "",
  status: "Recibido" as EstadoIngreso,
};

export default function IngresosPage() {
  const [items, setItems] = useState<IncomeEntry[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [storageLocations, setStorageLocations] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [income, currs] = await Promise.all([
        api.get<IncomeEntry[]>("/api/income"),
        api.get<Currency[]>("/api/currencies"),
      ]);
      setItems(income);
      setCurrencies(currs);
      setStorageLocations(
        Array.from(new Set(income.map((i) => i.storageLocation).filter((v): v is string => !!v))),
      );
      if (currs.length && !currs.some((c) => c.code === form.currencyCode)) {
        setForm((f) => ({ ...f, currencyCode: currs[0].code }));
      }
    } catch {
      setError("No se pudo conectar con el backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateModal() {
    setEditingId(null);
    setForm({ ...emptyForm, currencyCode: form.currencyCode });
    setModalOpen(true);
  }

  function openEditModal(item: IncomeEntry) {
    setEditingId(item.id);
    setForm({
      description: item.description,
      source: item.source,
      amount: String(item.amount),
      currencyCode: item.currencyCode,
      date: item.date.slice(0, 10),
      isRecurring: item.isRecurring,
      administerUntil: item.administerUntil ? item.administerUntil.slice(0, 10) : "",
      storageLocation: item.storageLocation ?? "",
      status: item.status,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        description: form.description,
        source: form.source,
        amount: Number(form.amount),
        currencyCode: form.currencyCode,
        date: form.date,
        isRecurring: form.isRecurring,
        administerUntil: form.administerUntil || null,
        storageLocation: form.storageLocation || null,
        status: form.status,
      };

      if (editingId) {
        await api.put(`/api/income/${editingId}`, payload);
      } else {
        await api.post("/api/income", payload);
      }
      closeModal();
      setForm({ ...emptyForm, currencyCode: form.currencyCode });
      await load();
    } catch {
      alert("No se pudo guardar el ingreso.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este ingreso?")) return;
    await api.delete(`/api/income/${id}`);
    await load();
  }

  async function toggleStatus(item: IncomeEntry) {
    const nextStatus: EstadoIngreso = item.status === "Recibido" ? "Proyectado" : "Recibido";
    await api.patch(`/api/income/${item.id}/status`, { status: nextStatus });
    await load();
  }

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-primary">Ingresos</h1>
          <p className="text-sm text-ink-secondary">Registra salarios, freelance y otras entradas.</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus size={16} /> Nuevo
        </Button>
      </div>

      {error && (
        <Card className="flex items-center justify-between text-sm text-critical">
          {error}
          <button onClick={load} className="flex items-center gap-1 text-ink-secondary hover:text-ink-primary">
            <RefreshCw size={14} /> Reintentar
          </button>
        </Card>
      )}

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-ink-muted">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">Aún no has registrado ingresos.</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-primary">{item.description}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-secondary">
                    {item.source || "Sin fuente"} · {formatDate(item.date)}
                    <Badge tone={item.status === "Recibido" ? "good" : "warning"}>
                      {ESTADO_INGRESO_LABELS[item.status]}
                    </Badge>
                    {item.isRecurring && <Badge tone="neutral">Recurrente</Badge>}
                    {item.administerUntil && (
                      <Badge tone="neutral">Administras hasta {formatDate(item.administerUntil)}</Badge>
                    )}
                    {item.storageLocation && <Badge tone="neutral">📍 {item.storageLocation}</Badge>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-money whitespace-nowrap font-medium text-good">
                    +{formatMoney(item.amount, item.currencyCode)}
                  </span>
                  <button
                    onClick={() => toggleStatus(item)}
                    aria-label={item.status === "Recibido" ? "Marcar como proyectado" : "Marcar como recibido"}
                    title={item.status === "Recibido" ? "Marcar como proyectado" : "Marcar como recibido"}
                    className="text-ink-muted hover:text-good"
                  >
                    {item.status === "Recibido" ? <Undo2 size={16} /> : <Check size={16} />}
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    aria-label="Editar"
                    className="text-ink-muted hover:text-ink-primary"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    aria-label="Eliminar"
                    className="text-ink-muted hover:text-critical"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {items.length > 0 && (
        <p className="text-right text-sm text-ink-secondary">
          Total registrado:{" "}
          <span className="tabular-money font-semibold text-ink-primary">
            {formatMoney(total, form.currencyCode)}
          </span>{" "}
          (suma simple, sin conversión de moneda)
        </p>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editingId ? "Editar ingreso" : "Nuevo ingreso"}>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Label>Descripción</Label>
            <Input
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Salario de septiembre"
            />
          </FieldGroup>
          <FieldGroup>
            <Label>Fuente</Label>
            <Input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="Empleo, freelance, renta..."
            />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Monto</Label>
              <Input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Moneda</Label>
              <Select
                value={form.currencyCode}
                onChange={(e) => setForm({ ...form, currencyCode: e.target.value })}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label>Fecha</Label>
            <Input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup>
            <Label>Estado</Label>
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as EstadoIngreso })}
            >
              <option value="Proyectado">Proyectado (esperado, todavía no llega)</option>
              <option value="Recibido">Recibido (ya lo tienes)</option>
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>¿Dónde lo tienes guardado?</Label>
            <Input
              required
              list="storage-locations"
              value={form.storageLocation}
              onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
              placeholder="Efectivo, Bancolombia, Nequi..."
            />
            <datalist id="storage-locations">
              {storageLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </FieldGroup>
          <FieldGroup>
            <Label>¿Hasta cuándo lo administras? (opcional)</Label>
            <Input
              type="date"
              value={form.administerUntil}
              onChange={(e) => setForm({ ...form, administerUntil: e.target.value })}
            />
            <p className="mt-1 text-xs text-ink-secondary">
              Ej: te pagan el 15 y te alcanza hasta el siguiente pago (15 del mes que sigue). Si lo dejas vacío, se
              asume que solo cubre el mes de la fecha del ingreso.
            </p>
          </FieldGroup>
          <label className="mb-4 flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
            />
            Es un ingreso recurrente cada mes
          </label>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar ingreso"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
