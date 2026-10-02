import { cn } from "../lib/cn";
import type { Resource } from "../types";

/** Illustration générée : la table de réunion reflète la capacité, le véhicule sa catégorie. */
export function ResourceVisual({ resource, className }: { resource: Resource; className?: string }) {
  const hue = resource.hue ?? 250;
  const style = {
    backgroundImage: `radial-gradient(120% 120% at 0% 0%, oklch(0.72 0.16 ${hue}) 0%, oklch(0.55 0.2 ${hue + 25}) 55%, oklch(0.42 0.18 ${hue + 45}) 100%)`,
  };

  if (resource.image) {
    return (
      <div className={cn("relative overflow-hidden", className)} style={style}>
        <img src={resource.image} alt="" className="size-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)} style={style}>
      <svg className="absolute inset-0 size-full opacity-[0.18]" aria-hidden>
        <defs>
          <pattern id={`dots-${resource.id}`} width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${resource.id})`} />
      </svg>
      <div className="absolute -right-10 -bottom-16 size-48 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute inset-0 flex items-center justify-center p-3">
        {resource.kind === "room" ? <RoomArt seats={resource.capacity ?? 6} /> : <VehicleArt resource={resource} />}
      </div>
    </div>
  );
}

function RoomArt({ seats }: { seats: number }) {
  const n = Math.max(2, Math.min(seats, 16));
  const ends = n >= 6 ? 2 : 0;
  const top = Math.ceil((n - ends) / 2);
  const bottom = n - ends - top;
  const tableW = Math.max(46, top * 22 + 10);
  const x0 = 100 - tableW / 2;
  const chairs: { x: number; y: number; w: number; h: number }[] = [];
  const row = (count: number, y: number) => {
    for (let i = 0; i < count; i++) chairs.push({ x: x0 + (tableW * (i + 0.5)) / count - 7, y, w: 14, h: 9 });
  };
  row(top, 26);
  row(bottom, 65);
  const viewW = Math.max(tableW + 56, 150);
  if (ends) {
    chairs.push({ x: x0 - 15, y: 43, w: 9, h: 14 });
    chairs.push({ x: x0 + tableW + 6, y: 43, w: 9, h: 14 });
  }
  return (
    <svg
      viewBox={`${100 - viewW / 2} 14 ${viewW} 72`}
      className="h-full max-h-24 w-auto drop-shadow-[0_6px_14px_rgba(0,0,0,0.18)]"
      aria-hidden
    >
      {chairs.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} rx="3.5" fill="white" fillOpacity="0.55" />
      ))}
      <rect x={x0} y="38" width={tableW} height="24" rx="12" fill="white" fillOpacity="0.92" />
      <rect x={x0 + 8} y="45" width={Math.min(26, tableW / 3)} height="10" rx="3" fill="currentColor" className="text-black/10" />
    </svg>
  );
}

function VehicleArt({ resource }: { resource: Resource }) {
  const van = resource.features.includes("utility") || (resource.capacity ?? 0) > 5;
  return (
    <svg viewBox="0 0 200 100" className="h-full max-h-24 w-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.2)]" aria-hidden>
      <ellipse cx="100" cy="82" rx="78" ry="5" fill="black" fillOpacity="0.15" />
      {van ? (
        <>
          <path d="M22 72V42q0-16 16-17h88q10 0 18 8l22 18q14 3 14 12v9z" fill="white" fillOpacity="0.95" />
          <path d="M120 33h6q6 0 11 5l14 12h-31z" fill="currentColor" className="text-black/25" />
          <rect x="36" y="33" width="74" height="17" rx="4" fill="currentColor" className="text-black/20" />
        </>
      ) : (
        <>
          <path d="M18 72v-9q0-9 10-11l30-5 22-14q6-4 14-4h34q9 0 16 6l17 14 18 3q10 2 10 11v9z" fill="white" fillOpacity="0.95" />
          <path d="M84 36q4-3 10-3h14v15H66zM113 33h15q7 0 11 4l11 11h-37z" fill="currentColor" className="text-black/25" />
        </>
      )}
      {[56, 148].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="72" r="12.5" fill="#1e1b4b" fillOpacity="0.85" />
          <circle cx={cx} cy="72" r="5.5" fill="white" fillOpacity="0.85" />
        </g>
      ))}
      {resource.features.includes("electric") && <path d="M100 52l-6 10h5l-2 8 7-11h-5l2-7z" fill="oklch(0.75 0.17 160)" />}
    </svg>
  );
}
