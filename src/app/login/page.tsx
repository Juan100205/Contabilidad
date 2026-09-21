"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/session";
import type { LoginResponse } from "@/lib/types";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await api.post<LoginResponse>("/api/auth/login", { username, password });
      setSession(session);
      // Recarga completa para que el layout del servidor lea la cookie de sesión/tema.
      const isMobile = window.matchMedia("(max-width: 1023px)").matches;
      window.location.href = isMobile ? "/diario" : "/dashboard";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo conectar con el backend.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-xl font-bold text-ink-primary">Mis Finanzas</h1>
        <p className="mb-6 text-sm text-ink-secondary">Inicia sesión para continuar.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Label>Usuario</Label>
            <Input
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="sr.wellington"
            />
          </FieldGroup>
          <FieldGroup>
            <Label>Contraseña</Label>
            <Input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FieldGroup>
          {error && <p className="text-sm text-critical">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
