import type { ReactNode } from "react";
import { ProHeader } from "@/design-system/components";

type V0PageHeroProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  decorative?: boolean;
};

export function V0PageHero({ title, subtitle, eyebrow, actions, decorative = false }: V0PageHeroProps) {
  return (
    <section className="card" aria-hidden={decorative}>
      <ProHeader title={title} subtitle={subtitle} eyebrow={eyebrow} actions={actions} compact className="border-b-0 pb-0" />
    </section>
  );
}
