"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";

type WeeklyReviewModalProps = {
  children: ReactNode;
};

export default function WeeklyReviewModal({ children }: WeeklyReviewModalProps) {
  const router = useRouter();

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/app/hoy");
  };

  return (
    <Modal open onClose={handleClose} className="max-h-[90vh] overflow-y-auto">
      {children}
    </Modal>
  );
}
