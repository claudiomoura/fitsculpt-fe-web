"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Modal } from "@/design-system/components/Modal";
import { useLanguage } from "@/context/LanguageProvider";
import CheckinRouteContent from "../../check-in/CheckinRouteContent";
import styles from "./page.module.css";

export default function SeguimientoCheckinModalPage() {
  const router = useRouter();
  const { t } = useLanguage();

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
        <button type="button" className="btn secondary fit-content" onClick={handleClose}>{t("ui.close")}</button>
      </div>
      <CheckinRouteContent />
    </Modal>
  );
}
