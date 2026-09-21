"use client";

import { Plus, Trash2, Pencil, RefreshCw, Check, Undo2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, FieldGroup, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { api } from "@/lib/api";
import { formatMoney, formatDate, todayIso } from "@/lib/format";
import { ESTADO_DESEO_LABELS } from "@/lib/labels";
import type { Currency, EstadoDeseo, WishlistItem } from "@/lib/types";

const STATUS_FILTERS = ["Activo", "Comprado", "Cancelado", "Todos"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const emptyForm = {
  name: "",
  description: "",
  targetPrice: "",
  currencyCode: "COP",
  targetDate: "",
  savedSoFar: "",
};

export default function DeseosPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Activo");
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const statusQuery = statusFilter === "Todos" ? "" : `?status=${statusFilter}`;
      const [wishlist, currs] = await Promise.all([
        api.get<WishlistItem[]>(`/api/wishlist${statusQuery}`),
        api.get<Currency[]>("/api/currencies"),
      ]);
      setItems(wishlist);
      setCurrencies(currs);
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
  }, [statusFilter]);

  function openCreateModal() {
    setEditingId(null);
    setForm({ ...emptyForm, currencyCode: form.currencyCode, savedSoFar: "0" });
    setModalOpen(true);
  }

  function openEditModal(item: WishlistItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      targetPrice: String(item.targetPrice),
      currencyCode: item.currencyCode,
      targetDate: item.targetDate ? item.targetDate.slice(0, 10) : "",
      savedSoFar: String(item.savedSoFar),
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
        name: form.name,
        description: form.description || null,
        targetPrice: Number(form.targetPrice),
        currencyCode: form.currencyCode,
        targetDate: form.targetDate || null,
        savedSoFar: Number(form.savedSoFar || 0),
      };

      if (editingId) {
        await api.put(`/api/wishlist/${editingId}`, payload);
      } else {
        await api.post("/api/wishlist", payload);
      }
      closeModal();
      await load();
    } catch {
      alert("No se pudo guardar el deseo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este deseo?")) return;
    await api.delete(`/api/wishlist/${id}`);
    await load();
  }

  async function handleSetStatus(item: WishlistItem, status: EstadoDeseo) {
    await api.patch(`/api/wishlist/${item.id}/status`, { status });
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-primary">Lista de deseos</h1>
          <p className="text-sm text-ink-secondary">Lo que quieres comprar a futuro, y cuánto ahorrar para lograrlo.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-auto"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "Todos" ? "Todos" : ESTADO_DESEO_LABELS[s]}
              </option>
            ))}
          </Select>
          <Button onClick={openCreateModal}>
            <Plus size={16} /> Nuevo
          </Button>
        </div>
      </div>

      {error && (
        <Card className="flex items-center justify-between text-sm text-critical">
          {error}
          <button onClick={load} className="flex items-center gap-1 text-ink-secondary hover:text-ink-primary">
            <RefreshCw size={14} /> Reintentar
          </button>
        </Card>
      )}

      {loading ? (
        <Card>
          <p className="py-8 text-center text-sm text-ink-muted">Cargando...</p>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-ink-muted">Aún no tienes deseos en esta lista.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const progress = item.targetPrice > 0 ? Math.min(100, (item.savedSoFar / item.targetPrice) * 100) : 0;
            return (
              <Card key={item.id}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-medium text-ink-primary">{item.name}</p>
                  <Badge
                    tone={item.status === "Comprado" ? "good" : item.status === "Cancelado" ? "neutral" : "warning"}
                  >
                    {ESTADO_DESEO_LABELS[item.status]}
                  </Badge>
                </div>
                {item.description && <p className="mb-2 text-xs text-ink-secondary">{item.description}</p>}

                <ProgressBar value={progress} colorClassName="bg-brand" />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="tabular-money font-semibold text-ink-primary">
                    {formatMoney(item.savedSoFar, item.currencyCode)}
                  </span>
                  <span className="text-xs text-ink-secondary">
                    de {formatMoney(item.targetPrice, item.currencyCode)}
                  </span>
                </div>

                {item.targetDate && (
                  <p className="mt-2 text-xs text-ink-secondary">
                    Para el {formatDate(item.targetDate)}
                    {item.monthsRemaining === 0 && <span className="text-critical"> · ya venció</span>}
                  </p>
                )}
                {item.status === "Activo" && item.suggestedMonthlySavings !== null && item.suggestedMonthlySavings > 0 && (
                  <p className="mt-1 text-xs text-brand">
                    Ahorra {formatMoney(item.suggestedMonthlySavings, item.currencyCode)}/mes
                    {item.monthsRemaining ? ` (${item.monthsRemaining} ${item.monthsRemaining === 1 ? "mes" : "meses"})` : ""}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-end gap-3 border-t border-line pt-3">
                  {item.status === "Activo" && (
                    <>
                      <button
                        onClick={() => handleSetStatus(item, "Comprado")}
                        aria-label="Marcar como comprado"
                        title="Marcar como comprado"
                        className="text-ink-muted hover:text-good"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleSetStatus(item, "Cancelado")}
                        aria-label="Cancelar deseo"
                        title="Cancelar"
                        className="text-ink-muted hover:text-critical"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                  {item.status !== "Activo" && (
                    <button
                      onClick={() => handleSetStatus(item, "Activo")}
                      aria-label="Reactivar deseo"
                      title="Reactivar"
                      className="text-ink-muted hover:text-ink-primary"
                    >
                      <Undo2 size={16} />
                    </button>
                  )}
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
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editingId ? "Editar deseo" : "Nuevo deseo"}>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Label>¿Qué quieres comprar?</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Computador nuevo, viaje, tenis..."
            />
          </FieldGroup>
          <FieldGroup>
            <Label>Descripción (opcional)</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Precio</Label>
              <Input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.targetPrice}
                onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
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
            <Label>Ya ahorrado (opcional)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.savedSoFar}
              onChange={(e) => setForm({ ...form, savedSoFar: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup>
            <Label>¿Para cuándo lo quieres? (opcional)</Label>
            <Input
              type="date"
              min={todayIso()}
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            />
            <p className="mt-1 text-xs text-ink-secondary">
              Con esta fecha calculamos cuánto tendrías que ahorrar cada mes.
            </p>
          </FieldGroup>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar a la lista"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
