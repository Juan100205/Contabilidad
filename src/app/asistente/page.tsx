"use client";

import { Bot, Send, User, Check, X, Sparkles, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import type { ChatHistoryItem, JarvisAction, JarvisChatResponse } from "@/lib/types";

type ActionStatus = "pending" | "confirmed" | "cancelled" | "error";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  action?: JarvisAction;
  actionStatus?: ActionStatus;
  actionError?: string;
};

function speak(text: string) {
  try {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find((v) => v.lang.toLowerCase().startsWith("es"));
    if (spanishVoice) utterance.voice = spanishVoice;
    utterance.lang = spanishVoice?.lang ?? "es-ES";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Síntesis de voz no disponible en este navegador; no es crítico.
  }
}

export default function AsistentePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Fuerza la carga temprana de voces (algunos navegadores las cargan async).
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);

  async function sendMessage(text: string) {
    if (!text || sending) return;

    const history: ChatHistoryItem[] = messages
      .filter((m) => m.text)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.text }));

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setSending(true);

    try {
      const res = await api.post<JarvisChatResponse>("/api/jarvis/chat", { message: text, history });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: res.reply,
          action: res.action ?? undefined,
          actionStatus: res.action ? "pending" : undefined,
        },
      ]);
      if (speakEnabled) speak(res.reply);
    } catch (err) {
      const errorText = err instanceof ApiError ? err.message : "No se pudo conectar con Jarvis.";
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: errorText }]);
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await sendMessage(draft.trim());
  }

  async function handleConfirmAction(messageId: string) {
    const message = messages.find((m) => m.id === messageId);
    if (!message?.action) return;

    try {
      const { method, endpoint, payload } = message.action;
      if (method === "POST") await api.post(endpoint, payload);
      else if (method === "PUT") await api.put(endpoint, payload);
      else if (method === "PATCH") await api.patch(endpoint, payload);
      else throw new Error(`Método no soportado: ${method}`);

      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, actionStatus: "confirmed" } : m)));
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, actionStatus: "error", actionError: err instanceof ApiError ? err.message : "No se pudo completar." }
            : m,
        ),
      );
    }
  }

  function handleCancelAction(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, actionStatus: "cancelled" } : m)));
  }

  function toggleSpeak() {
    if (speakEnabled) window.speechSynthesis?.cancel();
    setSpeakEnabled((v) => !v);
  }

  async function handleMicClick() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size === 0) return;

        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "voz.webm");
          const res = await api.postForm<{ text: string }>("/api/jarvis/transcribe", form);
          if (res.text) setDraft((prev) => (prev ? `${prev} ${res.text}` : res.text));
        } catch (err) {
          setMicError(err instanceof ApiError ? err.message : "No se pudo transcribir el audio.");
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setMicError("No se pudo acceder al micrófono. Revisa los permisos del navegador.");
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 lg:h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-primary">Jarvis</h1>
          <p className="text-sm text-ink-secondary">Tu asistente para Mis Finanzas.</p>
        </div>
        <button
          onClick={toggleSpeak}
          aria-label={speakEnabled ? "Silenciar a Jarvis" : "Activar voz de Jarvis"}
          title={speakEnabled ? "Silenciar a Jarvis" : "Activar voz de Jarvis"}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
        >
          {speakEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Bot size={22} />
              </div>
              <p className="max-w-xs text-sm text-ink-secondary">
                A sus órdenes, señor. Puedo registrar gastos, ingresos, pagos de deuda, movimientos
                de bolsillos o agregar cosas a su lista de deseos — dígame qué necesita (escrito o
                por voz) y se lo propongo para que lo confirme.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {messages.map((m) => (
                <li key={m.id} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      m.role === "user" ? "bg-surface-raised text-ink-secondary" : "bg-brand-soft text-brand"
                    }`}
                  >
                    {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={`flex max-w-[80%] flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
                    {m.text && (
                      <p
                        className={`rounded-lg px-3 py-2 text-sm ${
                          m.role === "user" ? "bg-brand text-canvas" : "bg-surface-raised text-ink-primary"
                        }`}
                      >
                        {m.text}
                      </p>
                    )}
                    {m.action && (
                      <div className="w-full rounded-lg border border-brand/30 bg-brand-soft/40 p-3 text-sm">
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-brand">
                          <Sparkles size={14} /> Acción propuesta
                        </div>
                        <p className="mb-3 text-ink-primary">{m.action.label}</p>
                        {m.actionStatus === "pending" && (
                          <div className="flex gap-2">
                            <Button onClick={() => handleConfirmAction(m.id)} className="flex-1">
                              <Check size={16} /> Confirmar
                            </Button>
                            <Button variant="secondary" onClick={() => handleCancelAction(m.id)} className="flex-1">
                              <X size={16} /> Cancelar
                            </Button>
                          </div>
                        )}
                        {m.actionStatus === "confirmed" && (
                          <p className="flex items-center gap-1 text-xs text-good">
                            <Check size={14} /> Hecho
                          </p>
                        )}
                        {m.actionStatus === "cancelled" && (
                          <p className="text-xs text-ink-muted">Cancelado, no se hizo nada.</p>
                        )}
                        {m.actionStatus === "error" && (
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-critical">{m.actionError}</p>
                            <Button onClick={() => handleConfirmAction(m.id)} className="w-full">
                              Reintentar
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {sending && (
                <li className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Bot size={14} />
                  </div>
                  <p className="rounded-lg bg-surface-raised px-3 py-2 text-sm text-ink-secondary">Pensando...</p>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="border-t border-line p-3">
          {micError && <p className="mb-2 text-xs text-critical">{micError}</p>}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMicClick}
              disabled={transcribing || sending}
              aria-label={recording ? "Detener grabación" : "Hablarle a Jarvis"}
              title={recording ? "Detener grabación" : "Hablarle a Jarvis"}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 ${
                recording
                  ? "animate-pulse border-critical bg-critical/15 text-critical"
                  : "border-line text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
              }`}
            >
              {recording ? <Square size={16} /> : <Mic size={16} />}
            </button>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={transcribing ? "Transcribiendo..." : "Escríbele a Jarvis..."}
              className="flex-1"
              disabled={sending || transcribing}
            />
            <Button type="submit" aria-label="Enviar" disabled={sending || transcribing}>
              <Send size={16} />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
