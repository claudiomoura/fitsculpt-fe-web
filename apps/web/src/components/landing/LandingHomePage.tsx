import Image from "next/image";
import Link from "next/link";

export type LandingFeature = {
  title: string;
  description: string;
  iconSrc: string;
  iconAlt: string;
};

export type LandingCopy = {
  hero: {
    titleA: string;
    titleB: string; // verde
    titleC: string;
    titleD: string; // azul
    titleE: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  features: {
    items: LandingFeature[];
  };
  testimonial: {
    quote: string;
    subquote: string;
    author: string;
    metaLeft: string;
  };
  finalCta: {
    titleA: string;
    titleB: string; // verde
    titleC: string;
    subtitle: string;
    placeholder: string;
    button: string;
  };
};

export function LandingHomePage({ copy }: { copy: LandingCopy }) {
  return (
    <div className="lp">
      <section className="lp-hero">
        <div className="lp-hero__bg" aria-hidden="true" />
        <div className="lp-hero__inner">
          <div className="lp-hero__left">
            <h1 className="lp-hero__title">
              <span>{copy.hero.titleA} </span>
              <span className="lp-accent-green">{copy.hero.titleB} </span>
              <span>{copy.hero.titleC} </span>
              <span className="lp-accent-blue">{copy.hero.titleD} </span>
              <span>{copy.hero.titleE}</span>
            </h1>

            <p className="lp-hero__subtitle">{copy.hero.subtitle}</p>

            <div className="lp-hero__ctas">
              <Link href="/register" className="lp-btn lp-btn--green">
                {copy.hero.primaryCta}
              </Link>
              <Link href="/demo" className="lp-btn lp-btn--blue">
                {copy.hero.secondaryCta}
              </Link>
            </div>
          </div>

          <div className="lp-hero__right" aria-hidden="true">
            <div className="lp-hero__figure">
              <Image
                src="/branding/girl_front.png"
                alt=""
                width={720}
                height={900}
                priority
                className="lp-hero__girl"
              />
              {/* Si tiveres um screenshot do app, mete aqui: /branding/phone.png */}
              <div className="lp-hero__phone">
                <div className="lp-phone__frame">
                  <Image
                    src="/branding/logo.png"
                    alt=""
                    width={120}
                    height={28}
                    className="lp-phone__logo"
                  />
                  <div className="lp-phone__card">
                    <p className="lp-phone__kicker">TU ENTRENADOR IA</p>
                    <p className="lp-phone__small">Rutina de Fuerza Hoy</p>
                    <div className="lp-phone__stats">
                      <span><b>450</b> kcal</span>
                      <span><b>45</b> min</span>
                    </div>
                    <div className="lp-phone__row">
                      <span className="lp-phone__pill">SQUATS</span>
                      <span className="lp-phone__pill">12 REPS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lp-glow" />
          </div>
        </div>

        <div id="caracteristicas" className="lp-feature-panel">
          <ul className="lp-feature-panel__grid">
            {copy.features.items.map((f) => (
              <li key={f.title} className="lp-feature">
                <Image src={f.iconSrc} alt={f.iconAlt} width={42} height={42} className="lp-feature__icon" />
                <div className="lp-feature__text">
                  <p className="lp-feature__title">{f.title}</p>
                  <p className="lp-feature__desc">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="testimonios" className="lp-testimonial">
        <div className="lp-testimonial__inner">
          <div className="lp-testimonial__card">
            <div className="lp-testimonial__media">
              <Image
                src="/branding/guys.png"
                alt="Testimonio"
                width={920}
                height={520}
                className="lp-testimonial__img"
              />
              <div className="lp-play" aria-hidden="true" />
              <div className="lp-testimonial__meta">{copy.testimonial.metaLeft}</div>
            </div>
            <div className="lp-testimonial__quote">
              <p className="lp-quote">
                <span className="lp-quote__mark">“</span>
                {copy.testimonial.quote}
              </p>
              <p className="lp-quote__sub">{copy.testimonial.subquote}</p>
              <div className="lp-stars" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="lp-star" />
                ))}
              </div>
              <p className="lp-quote__author">– {copy.testimonial.author}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-final__inner">
          <h2 className="lp-final__title">
            <span>{copy.finalCta.titleA} </span>
            <span className="lp-accent-green">{copy.finalCta.titleB} </span>
            <span>{copy.finalCta.titleC}</span>
          </h2>
          <p className="lp-final__subtitle">{copy.finalCta.subtitle}</p>

          <form className="lp-final__form" action="/register" method="get">
            <input className="lp-input" type="email" name="email" placeholder={copy.finalCta.placeholder} />
            <button className="lp-btn lp-btn--green lp-btn--cta" type="submit">
              {copy.finalCta.button}
            </button>
          </form>

          <div className="lp-stores" aria-label="Stores">
            <span className="lp-store"> APPLE STORE</span>
            <span className="lp-store">▶ GOOGLE PLAY</span>
          </div>
        </div>
      </section>
    </div>
  );
}