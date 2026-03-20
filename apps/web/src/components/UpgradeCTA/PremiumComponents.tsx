import { ButtonLink } from "@/design-system/components/Button";
import { Icon } from "@/design-system/components/Icon";
import styles from "./PremiumComponents.module.css";

type PremiumFeatureCardProps = {
  title: string;
  description: string;
  buttonLabel: string;
  icon?: "sparkles" | "dumbbell" | "book";
  variant?: "default" | "gradient";
};

export function PremiumFeatureCard({ 
  title, 
  description, 
  buttonLabel, 
  icon = "sparkles",
  variant = "default"
}: PremiumFeatureCardProps) {
  const isGradient = variant === "gradient";

  return (
    <div 
      className={`${styles.featureCard} ${isGradient ? styles.featureCardGradient : ''}`}
      role="status" 
      aria-live="polite"
    >
      <div className={styles.featureIcon}>
        <Icon name={icon} />
      </div>
      <div className={styles.featureContent}>
        <h3 className={styles.featureTitle}>{title}</h3>
        <p className={styles.featureDescription}>{description}</p>
      </div>
      <div className={styles.featureAction}>
        <ButtonLink href="/app/settings/billing" variant={isGradient ? "primary" : "secondary"}>
          {buttonLabel}
        </ButtonLink>
      </div>
    </div>
  );
}

type PremiumPaywallProps = {
  title: string;
  description: string;
  features: Array<{ title: string; description: string }>;
  ctaLabel: string;
  ctaHref?: string;
};

export function PremiumPaywall({ title, description, features, ctaLabel, ctaHref = "/app/settings/billing" }: PremiumPaywallProps) {
  return (
    <div className={styles.paywall} role="region" aria-label="Premium features">
      <div className={styles.paywallHeader}>
        <div className={styles.paywallBadge}>
          <Icon name="sparkles" size={14} />
          <span>Premium</span>
        </div>
        <h2 className={styles.paywallTitle}>{title}</h2>
        <p className={styles.paywallDescription}>{description}</p>
      </div>
      
      <div className={styles.paywallFeatures}>
        {features.map((feature, index) => (
          <div key={index} className={styles.paywallFeature}>
            <div className={styles.paywallCheck}>
              <Icon name="check" size={14} />
            </div>
            <div>
              <h4 className={styles.paywallFeatureTitle}>{feature.title}</h4>
              <p className={styles.paywallFeatureDescription}>{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.paywallCta}>
        <ButtonLink href={ctaHref} variant="primary" className={styles.paywallButton}>
          {ctaLabel}
        </ButtonLink>
      </div>
    </div>
  );
}
