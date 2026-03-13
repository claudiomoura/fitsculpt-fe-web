import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

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
      className={`premium-feature-card ${isGradient ? 'premium-feature-card--gradient' : ''}`}
      role="status" 
      aria-live="polite"
    >
      <div className="premium-feature-icon">
        <Icon name={icon} />
      </div>
      <div className="premium-feature-content">
        <h3 className="premium-feature-title">{title}</h3>
        <p className="premium-feature-description">{description}</p>
      </div>
      <div className="premium-feature-action">
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
    <div className="premium-paywall" role="region" aria-label="Premium features">
      <div className="premium-paywall-header">
        <div className="premium-paywall-badge">
          <Icon name="sparkles" size={14} />
          <span>Premium</span>
        </div>
        <h2 className="premium-paywall-title">{title}</h2>
        <p className="premium-paywall-description">{description}</p>
      </div>
      
      <div className="premium-paywall-features">
        {features.map((feature, index) => (
          <div key={index} className="premium-paywall-feature">
            <div className="premium-paywall-check">
              <Icon name="check" size={14} />
            </div>
            <div>
              <h4 className="premium-paywall-feature-title">{feature.title}</h4>
              <p className="premium-paywall-feature-description">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="premium-paywall-cta">
        <ButtonLink href={ctaHref} variant="primary" className="premium-paywall-button">
          {ctaLabel}
        </ButtonLink>
      </div>
    </div>
  );
}
