"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { addCashMovement, closeCashSession, getCurrentCashSession, openCashSession } from "@/lib/api/treasury";

export default function CashPage() {
  const queryClient = useQueryClient();
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [movementType, setMovementType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDescription, setMovementDescription] = useState("");

  const sessionQuery = useQuery({ queryKey: ["currentCashSession"], queryFn: getCurrentCashSession });

  const openMutation = useMutation({
    mutationFn: () => openCashSession({ opening_amount: Number(openingAmount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentCashSession"] });
      setOpeningAmount("");
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => {
      if (!sessionQuery.data) throw new Error("No hay caja abierta");
      return closeCashSession(sessionQuery.data.id, { closing_amount_declared: Number(closingAmount) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentCashSession"] });
      setClosingAmount("");
    },
  });

  const movementMutation = useMutation({
    mutationFn: () => {
      if (!sessionQuery.data) throw new Error("No hay caja abierta");
      return addCashMovement(sessionQuery.data.id, {
        type: movementType,
        amount: Number(movementAmount),
        description: movementDescription || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentCashSession"] });
      setMovementAmount("");
      setMovementDescription("");
    },
  });

  const session = sessionQuery.data;
  const closedSession = closeMutation.isSuccess ? closeMutation.data : null;

  return (
    <>
      <h1>AuraPro — Caja</h1>

      {closedSession && (
        <div className="aura-card flex flex-col gap-1">
          <h2>Caja cerrada</h2>
          <p className="text-sm text-neutral-600">
            Esperado: ${closedSession.closing_amount_expected?.toFixed(2)} — Declarado: $
            {closedSession.closing_amount_declared?.toFixed(2)} — Diferencia: $
            {(
              (closedSession.closing_amount_declared ?? 0) - (closedSession.closing_amount_expected ?? 0)
            ).toFixed(2)}
          </p>
        </div>
      )}

      {sessionQuery.isLoading && <p className="text-sm text-neutral-500">Cargando...</p>}

      {!sessionQuery.isLoading && !session && (
        <div className="aura-card flex flex-col gap-4">
          <h2>No hay ninguna caja abierta</h2>
          <label className="aura-label">
            Monto de apertura
            <input
              type="number"
              min="0"
              step="0.01"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              className="aura-input"
            />
          </label>
          <button
            type="button"
            disabled={openMutation.isPending || openingAmount === ""}
            onClick={() => openMutation.mutate()}
            className="aura-btn-primary self-start"
          >
            {openMutation.isPending ? "Abriendo..." : "Abrir caja"}
          </button>
          {openMutation.isError && (
            <p role="alert" className="aura-alert">
              {(openMutation.error as Error).message}
            </p>
          )}
        </div>
      )}

      {session && (
        <>
          <div className="aura-card flex flex-col gap-4">
            <h2>Caja abierta</h2>
            <p className="text-sm text-neutral-500">
              Apertura: ${session.opening_amount.toFixed(2)} — {new Date(session.created_at).toLocaleString()}
            </p>

            <div className="overflow-x-auto">
              <table className="aura-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {session.movements.map((m) => (
                    <tr key={m.id}>
                      <td>{new Date(m.created_at).toLocaleTimeString()}</td>
                      <td>{m.type === "INCOME" ? "Ingreso" : "Egreso"}</td>
                      <td>${m.amount.toFixed(2)}</td>
                      <td>{m.description ?? "—"}</td>
                    </tr>
                  ))}
                  {session.movements.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-neutral-400">
                        Sin movimientos todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <label className="aura-label">
                Tipo
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as "INCOME" | "EXPENSE")}
                  className="aura-input"
                >
                  <option value="EXPENSE">Egreso</option>
                  <option value="INCOME">Ingreso</option>
                </select>
              </label>
              <label className="aura-label">
                Monto
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  className="aura-input w-32"
                />
              </label>
              <label className="aura-label">
                Descripción
                <input
                  value={movementDescription}
                  onChange={(e) => setMovementDescription(e.target.value)}
                  className="aura-input"
                />
              </label>
              <button
                type="button"
                disabled={movementMutation.isPending || movementAmount === ""}
                onClick={() => movementMutation.mutate()}
                className="aura-btn-secondary px-3 py-2"
              >
                {movementMutation.isPending ? "Guardando..." : "Agregar movimiento"}
              </button>
            </div>
            {movementMutation.isError && (
              <p role="alert" className="aura-alert">
                {(movementMutation.error as Error).message}
              </p>
            )}
          </div>

          <div className="aura-card flex flex-col gap-4">
            <h2>Cerrar caja</h2>
            <label className="aura-label">
              Monto contado
              <input
                type="number"
                min="0"
                step="0.01"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="aura-input"
              />
            </label>
            <button
              type="button"
              disabled={closeMutation.isPending || closingAmount === ""}
              onClick={() => closeMutation.mutate()}
              className="aura-btn-danger self-start"
            >
              {closeMutation.isPending ? "Cerrando..." : "Cerrar caja"}
            </button>
            {closeMutation.isError && (
              <p role="alert" className="aura-alert">
                {(closeMutation.error as Error).message}
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
