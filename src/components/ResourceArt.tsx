import type React from "react";
import { cn } from "../lib/cn";
import type { Resource } from "../types";

/** Teinte stable dérivée du nom quand le catalogue n'en fournit pas. */
function hueOf(r: Resource) {
  if (r.hue !== undefined) return r.hue;
  let h = 0;
  for (const c of r.id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/**
 * Illustration au trait, sur fond pastel propre à chaque ressource, générée à partir des caractéristiques de la ressource
 * (capacité, équipements, catégorie de véhicule). Une vraie photo (champ `image` du catalogue) la remplace.
 */
export function ResourceArt({ resource, className }: { resource: Resource; className?: string }) {
  if (resource.image) {
    return (
      <div className={cn("overflow-hidden bg-surface-2", className)}>
        <img src={resource.image} alt="" loading="lazy" className="size-full object-cover grayscale-[15%]" />
      </div>
    );
  }
  return (
    <div
      className={cn("art flex items-center justify-center overflow-hidden [background:var(--art-bg)] text-[var(--art-ink)]", className)}
      style={{ "--h": hueOf(resource) } as React.CSSProperties}
    >
      <svg
        viewBox="0 0 240 140"
        className="h-full w-full max-w-[320px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {resource.kind === "room" ? <Room resource={resource} /> : <Vehicle resource={resource} />}
      </svg>
    </div>
  );
}

function Room({ resource }: { resource: Resource }) {
  const n = Math.max(2, Math.min(resource.capacity ?? 6, 16));
  const hb = 18 + n * 2.6;
  const hf = hb + 16;
  const back = Math.ceil(n / 2);
  const front = Math.min(n - back, back);
  const screen = resource.features.includes("screen") || resource.features.includes("video");
  const whiteboard = resource.features.includes("whiteboard");
  const seats = (count: number, half: number) => Array.from({ length: count }, (_, i) => 120 - half + ((i + 0.5) * (2 * half)) / count);

  return (
    <g>
      <path d="M8 98 H232" opacity={0.25} />
      {screen && (
        <g>
          <rect x={92} y={26} width={56} height={34} rx={3} />
          <path d="M100 52 H140" opacity={0.25} />
          {resource.features.includes("video") && <circle cx={120} cy={22} r={1.6} fill="currentColor" stroke="none" />}
        </g>
      )}
      {whiteboard ? (
        <g opacity={0.8}>
          <rect x={22} y={30} width={44} height={30} rx={2} />
          <path d="M30 40 Q38 34 46 42 T60 40" opacity={0.4} />
          <path d="M26 64 H62" />
        </g>
      ) : (
        <g opacity={0.7}>
          <rect x={30} y={34} width={30} height={22} rx={1.5} />
          <path d="M33 53 L42 44 L48 49 L52 45 L57 53" opacity={0.6} />
        </g>
      )}
      <g opacity={0.8}>
        <rect x={176} y={22} width={44} height={50} rx={2} />
        <path d="M198 22 V72 M176 47 H220" opacity={0.5} />
      </g>
      {seats(back, hb - 6).map((x, i) => (
        <rect key={`b${i}`} x={x - 6} y={76} width={12} height={14} rx={3} opacity={0.75} />
      ))}
      <path d={`M${120 - hb} 92 H${120 + hb} L${120 + hf} 112 H${120 - hf} Z`} fill="var(--art-fill)" />
      <path d={`M${120 - hf + 6} 112 V122 M${120 + hf - 6} 112 V122`} opacity={0.6} />
      {seats(front, hf - 4).map((x, i) => (
        <path key={`f${i}`} d={`M${x - 8} 128 Q${x - 8} 118 ${x} 118 Q${x + 8} 118 ${x + 8} 128`} opacity={0.75} />
      ))}
      <g opacity={0.8}>
        <path d="M212 124 H226 L224 136 H214 Z" />
        <path d="M219 124 C219 112 212 108 208 104 M219 124 C220 110 226 106 230 100 M219 124 C217 116 214 112 213 110" />
      </g>
    </g>
  );
}

type Body = "sedan" | "hatch" | "estate" | "van" | "minibus";

function bodyOf(r: Resource): Body {
  const text = `${r.model ?? ""} ${r.name}`.toLowerCase();
  if (r.features.includes("utility") || /utilitaire|van\b/.test(text)) return "van";
  if (/minibus|spacetourer|9 places/.test(text) || (r.capacity ?? 0) > 6) return "minibus";
  if (/break|touring|estate/.test(text)) return "estate";
  if (/citadine|208|clio|yaris/.test(text)) return "hatch";
  return "sedan";
}

const BODIES: Record<Body, { body: string; windows: string[]; wheels: [number, number]; r: number; extra?: string }> = {
  sedan: {
    body: "M214 100 H192 A16 16 0 0 0 160 100 H86 A16 16 0 0 0 54 100 H30 V88 Q32 80 44 78 L78 74 L100 56 Q106 52 116 52 H150 Q160 52 168 58 L186 74 L204 78 Q214 80 214 90 Z",
    windows: ["M86 74 L104 60 Q108 57 114 57 H134 V74 Z", "M140 57 H150 Q157 57 162 62 L176 74 H140 Z"],
    wheels: [70, 176],
    r: 13,
    extra: "M134 76 V96 M206 84 H212",
  },
  hatch: {
    body: "M202 100 H184 A15 15 0 0 0 154 100 H90 A15 15 0 0 0 60 100 H40 V86 Q42 78 52 76 L80 72 L98 54 Q103 50 112 50 H150 Q160 50 166 58 L180 76 L194 79 Q202 81 202 90 Z",
    windows: ["M88 72 L102 57 Q105 55 110 55 H128 V72 Z", "M134 55 H150 Q156 55 160 60 L170 72 H134 Z"],
    wheels: [75, 169],
    r: 12,
    extra: "M128 74 V96 M196 86 H200",
  },
  estate: {
    body: "M214 100 H192 A16 16 0 0 0 160 100 H86 A16 16 0 0 0 54 100 H30 V86 Q30 78 38 74 L44 56 Q46 52 54 52 H150 Q160 52 168 58 L186 74 L204 78 Q214 80 214 90 Z",
    windows: ["M50 74 L54 58 H96 V74 Z", "M102 58 H130 V74 H102 Z", "M136 58 H150 Q156 58 161 63 L172 74 H136 Z"],
    wheels: [70, 176],
    r: 13,
    extra: "M130 76 V96 M206 84 H212",
  },
  van: {
    body: "M214 100 H196 A16 16 0 0 0 164 100 H82 A16 16 0 0 0 50 100 H26 V46 Q26 38 34 38 H160 Q168 38 174 44 L198 70 L208 74 Q214 76 214 84 Z",
    windows: ["M166 46 H170 L192 70 H166 Z"],
    wheels: [66, 180],
    r: 13,
    extra: "M150 42 V96 M100 42 V96",
  },
  minibus: {
    body: "M214 100 H196 A16 16 0 0 0 164 100 H82 A16 16 0 0 0 50 100 H26 V48 Q26 40 34 40 H168 Q176 40 182 48 L204 72 Q214 76 214 86 Z",
    windows: ["M36 50 H60 V68 H36 Z", "M66 50 H90 V68 H66 Z", "M96 50 H120 V68 H96 Z", "M126 50 H150 V68 H126 Z", "M172 50 L196 72 H172 Z"],
    wheels: [66, 180],
    r: 13,
  },
};

function Vehicle({ resource }: { resource: Resource }) {
  const b = BODIES[bodyOf(resource)];
  return (
    <g transform="translate(0 6)">
      <path d="M16 116 H224" opacity={0.25} />
      <path d={b.body} fill="var(--art-fill)" />
      {b.windows.map((w, i) => (
        <path key={i} d={w} opacity={0.65} />
      ))}
      {b.extra && <path d={b.extra} opacity={0.5} />}
      {b.wheels.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={100} r={b.r} fill="var(--art-fill)" />
          <circle cx={cx} cy={100} r={b.r * 0.38} opacity={0.6} />
        </g>
      ))}
      {resource.features.includes("electric") && (
        <path d="M118 84 l-4 7 h4 l-2 6 6 -8 h-4 l2 -5 Z" fill="currentColor" stroke="none" opacity={0.7} />
      )}
    </g>
  );
}
