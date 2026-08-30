"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/src/ui/icons";

const links = [
  { href: "/scout-runs", label: "Scout Runs", icon: "pulse" as const },
  { href: "/companies", label: "Companies", icon: "building" as const },
  { href: "/opportunities", label: "Opportunities", icon: "spark" as const },
  { href: "/reviews", label: "Reviews", icon: "book" as const },
  { href: "/settings", label: "Settings", icon: "settings" as const },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="primary-nav" aria-label="Primary navigation">
      <p className="nav-label">Workspace</p>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link className={`nav-link${active ? " is-active" : ""}`} href={link.href} key={link.href}>
            <Icon name={link.icon} size={17} />
            <span>{link.label}</span>
            {link.label === "Opportunities" && <span className="nav-dot" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}
