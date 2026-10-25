"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { checkedOn, folioFor, sections } from "@/data/ledger";

export function BookFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const folio = folioFor(path);
  const isHome = path === "/";

  return (
    <div className="book">
      <a className="skip" href="#content">
        Skip to the record
      </a>
      <div className="gutter" aria-hidden="true">
        <span className="folio">{folio}</span>
      </div>
      <div className="sheet">
        {isHome ? null : (
          <p className="running">
            <Link href="/">Praja Ledger</Link>
            <span lang="te">ప్రజా లెడ్జర్</span>
          </p>
        )}
        <nav className="nav" aria-label="Sections">
          {sections.map((section) => {
            const current =
              section.href === "/"
                ? path === "/"
                : section.href === "/leaders"
                  ? path.startsWith("/leaders")
                  : path.startsWith(section.href);
            return (
              <Link
                key={section.href}
                href={section.href}
                aria-current={current ? "page" : undefined}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
        <main id="content">{children}</main>
        <footer className="colophon">
          <p>Checked {checkedOn}.</p>
          <p>
            Praja Ledger is an independent reading of public documents. It is
            not the Government of Telangana, and it is not a court. A charge
            written here is not a finding that the person did it.
          </p>
        </footer>
      </div>
    </div>
  );
}
