import { Children, type ReactNode } from "react";

type V0HomeGridProps = {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
};

const DEFAULT_RIGHT_SLOT_TITLES = ["Check-in", "Progreso", "IA"];

const renderSlotCards = (content?: ReactNode, fallbackTitles?: string[]) => {
  const nodes = Children.toArray(content);

  if (nodes.length > 0) {
    return nodes.map((node, index) => (
      <article className="v0-home-grid__card" key={`slot-content-${index}`}>
        {node}
      </article>
    ));
  }

  return (fallbackTitles ?? []).map((title) => (
    <article className="v0-home-grid__card v0-home-grid__card--placeholder" key={title}>
      <h2>{title}</h2>
    </article>
  ));
};

export function V0HomeGrid({ left, right, children }: V0HomeGridProps) {
  const leftContent = left ?? children;

  return (
    <div className="v0-home-grid" data-testid="v0-home-grid">
      <div className="v0-home-grid__column v0-home-grid__column--left">{renderSlotCards(leftContent, ["Entreno", "Nutrición"])}</div>
      <div className="v0-home-grid__column v0-home-grid__column--right">{renderSlotCards(right, DEFAULT_RIGHT_SLOT_TITLES)}</div>
    </div>
  );
}
