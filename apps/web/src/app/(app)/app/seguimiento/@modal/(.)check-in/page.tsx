"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Modal } from "@/design-system/components/Modal";
import CheckinRouteContent from "../../check-in/CheckinRouteContent";
import styles from "./page.module.css";

export default function SeguimientoCheckinModalPage() {
  const router = useRouter();

  const handleClose = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/app/seguimiento");
  }, [router]);

  return (
    <Modal
      open
      onClose={handleClose}
      className={styles.trackingCheckinModal}
      overlayClassName={styles.trackingCheckinModalOverlay}
    >
      <div className="flex justify-end px-4 pt-4">
        <button type="button" className="btn secondary fit-content" onClick={handleClose}>Cerrar</button>
      </div>
      <CheckinRouteContent />
    </Modal>
  );
}
