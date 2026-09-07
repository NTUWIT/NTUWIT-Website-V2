/**
 * One icon set, one stroke weight, one geometry. Drawn here rather than pulled
 * from a library so the whole set stays in the same hand, and so no glyph or
 * emoji ever stands in for an icon.
 */

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "h-4 w-4"}
    >
      {children}
    </svg>
  );
}

export const CheckIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4.5 12.5 9.5 17.5 19.5 7" />
  </Svg>
);

/** Partial: a circle filled to half, so "some passed" reads without colour. */
export const PartialIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" />
  </Svg>
);

export const CrossIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />
  </Svg>
);

export const ClockIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.75" />
  </Svg>
);

export const PauseIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M10 9.5v5M14 9.5v5" />
  </Svg>
);

export const WrenchIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M15.5 4a5 5 0 0 0-5 6.2L4.6 16.1a2 2 0 1 0 2.8 2.8l5.9-5.9A5 5 0 1 0 15.5 4z" />
    <path d="M15.8 8.2h.01" />
  </Svg>
);

export const PlayIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M8 5.5 18.5 12 8 18.5z" />
  </Svg>
);

export const SendIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M19.5 4.5 11 13" />
    <path d="M19.5 4.5 14 19.5 11 13 4.5 10z" />
  </Svg>
);

export const ResetIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4.5 9.5A8 8 0 1 1 4 13.5" />
    <path d="M4.5 4.5v5h5" />
  </Svg>
);

export const HistoryIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4.5v4h4" />
    <path d="M12 8v4.2l2.8 1.6" />
  </Svg>
);

export const SunIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
  </Svg>
);

export const MoonIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />
  </Svg>
);

export const ChevronIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M9 5.5 15.5 12 9 18.5" />
  </Svg>
);

export const BeakerIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M9.5 3.5v6L4.8 17a2.5 2.5 0 0 0 2.1 3.8h10.2a2.5 2.5 0 0 0 2.1-3.8L14.5 9.5v-6" />
    <path d="M8 3.5h8" />
    <path d="M7.2 14.5h9.6" />
  </Svg>
);
