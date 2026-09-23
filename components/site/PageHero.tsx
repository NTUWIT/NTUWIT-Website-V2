import { ReactNode } from "react";
import HeroScene from "./HeroScene";

interface PageHeroProps {
  tag?: string;
  title: ReactNode;
  description?: string;
  children?: ReactNode;
}

export default function PageHero({
  tag,
  title,
  description,
  children,
}: PageHeroProps) {
  return (
    <section className="site-page-hero relative overflow-hidden border-b border-hairline min-h-[28vh] md:min-h-[32vh] flex items-end">
      <div className="site-main-mesh absolute inset-0" aria-hidden="true"><HeroScene /></div>
      <div className="container-wit relative pt-16 md:pt-20 pb-12 md:pb-16 w-full">
        <div>
          {tag && (
            <p className="mono-eyebrow text-ink-soft text-xs md:text-sm">
              {tag}
            </p>
          )}
          <h1 className="display text-3xl sm:text-4xl md:text-5xl lg:text-6xl mt-3 md:mt-4 max-w-4xl leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-4 md:mt-6 max-w-2xl text-sm md:text-base text-ink-soft leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
