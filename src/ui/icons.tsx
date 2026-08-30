type IconName = "arrow" | "book" | "building" | "check" | "chevron" | "clock" | "file" | "grid" | "inbox" | "link" | "pause" | "play" | "plus" | "pulse" | "search" | "settings" | "shield" | "spark" | "stack" | "terminal" | "x";

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "arrow": return <svg {...common}><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></svg>;
    case "book": return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /><path d="M8 7h8" /><path d="M8 11h7" /></svg>;
    case "building": return <svg {...common}><path d="M4 21V4.5A1.5 1.5 0 0 1 5.5 3H15v18" /><path d="M15 9h3.5A1.5 1.5 0 0 1 20 10.5V21" /><path d="M8 7h3M8 11h3M8 15h3M17 13h1M17 17h1" /><path d="M3 21h18" /></svg>;
    case "check": return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "chevron": return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>;
    case "file": return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>;
    case "grid": return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
    case "inbox": return <svg {...common}><path d="M4 5h16v14H4z" /><path d="M4 14h4l1.5 2h5L16 14h4" /></svg>;
    case "link": return <svg {...common}><path d="M10 13a5 5 0 0 0 7.1.1l1.3-1.3a5 5 0 0 0-7.1-7.1L10 6" /><path d="M14 11a5 5 0 0 0-7.1-.1l-1.3 1.3a5 5 0 0 0 7.1 7.1L14 18" /></svg>;
    case "pause": return <svg {...common}><path d="M8 5v14M16 5v14" /></svg>;
    case "play": return <svg {...common}><path d="m8 5 11 7-11 7z" /></svg>;
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "pulse": return <svg {...common}><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>;
    case "search": return <svg {...common}><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 4 4" /></svg>;
    case "settings": return <svg {...common}><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" /></svg>;
    case "shield": return <svg {...common}><path d="M12 3 19 6v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "spark": return <svg {...common}><path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3z" /><path d="m19 16 .5 2.5L22 19l-2.5.5L19 22l-.5-2.5L16 19l2.5-.5z" /></svg>;
    case "stack": return <svg {...common}><path d="m12 3 8 4-8 4-8-4z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></svg>;
    case "terminal": return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M13 15h4" /></svg>;
    case "x": return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  }
}
