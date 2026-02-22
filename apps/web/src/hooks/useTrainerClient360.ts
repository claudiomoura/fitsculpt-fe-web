"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getTrainerClient360Detail,
  listTrainerClientInternalNotes,
  type TrainerClient360Detail,
  type TrainerClientInternalNote,
} from "@/lib/api/trainerClient360";
import type { ServiceErrorReason } from "@/lib/api/serviceResult";

type TrainerClient360State = {
  detail: TrainerClient360Detail | null;
  notes: TrainerClientInternalNote[];
  loading: boolean;
  error: ServiceErrorReason | null;
  notesUnavailable: boolean;
  reload: () => Promise<void>;
};

export function useTrainerClient360(clientId: string): TrainerClient360State {
  const [detail, setDetail] = useState<TrainerClient360Detail | null>(null);
  const [notes, setNotes] = useState<TrainerClientInternalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ServiceErrorReason | null>(null);
  const [notesUnavailable, setNotesUnavailable] = useState(false);

  const load = useCallback(async () => {
    const normalizedClientId = clientId.trim();
    if (!normalizedClientId) {
      setDetail(null);
      setNotes([]);
      setError("validation");
      setNotesUnavailable(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotesUnavailable(false);

    const [detailResult, notesResult] = await Promise.all([
      getTrainerClient360Detail(normalizedClientId),
      listTrainerClientInternalNotes(normalizedClientId),
    ]);

    if (detailResult.ok) {
      setDetail(detailResult.data);
    } else {
      setDetail(null);
      setError(detailResult.reason);
    }

    if (notesResult.ok) {
      setNotes(notesResult.data);
    } else {
      setNotes([]);
      if (notesResult.reason === "notSupported") {
        setNotesUnavailable(true);
      } else if (!detailResult.ok) {
        setError(detailResult.reason);
      } else {
        setError(notesResult.reason);
      }
    }

    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- trigger async load on client change
    void load();
  }, [load]);

  return {
    detail,
    notes,
    loading,
    error,
    notesUnavailable,
    reload: load,
  };
}
