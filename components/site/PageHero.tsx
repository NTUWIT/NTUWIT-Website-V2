import { ReactNode } from "react";
import HeroScene from "@/components/site/HeroScene";

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
    <section className="relative overflow-hidden border-b border-hairline min-h-[28vh] md:min-h-[32vh] flex items-end">
      <div className="absolute inset-0 opacity-25">
        <HeroScene />
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20 pointer-events-none"
        aria-hidden
      />

      <div className="container-wit relative pt-16 md:pt-20 pb-8 md:pb-12 w-full">
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
