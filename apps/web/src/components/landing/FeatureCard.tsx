import Image from "next/image";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/classNames";
import { Card } from "./Card";

export type FeatureCardProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: string;
  iconSrc: string;
  iconAlt?: string;
};

export function FeatureCard({ title, description, iconSrc, iconAlt, className, ...props }: FeatureCardProps) {
  return (
    <Card className={cn("landing-feature-card", className)} {...props}>
      <Image src={iconSrc} alt={iconAlt ?? title} className="landing-feature-card__icon" width={40} height={40} />
      <div className="landing-feature-card__content">
        <h3 className="landing-feature-card__title">{title}</h3>
        <p className="landing-feature-card__description">{description}</p>
      </div>
    </Card>
  );
}
