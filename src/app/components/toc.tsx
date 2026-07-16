"use client";
import { useEffect, useState } from "react";

type Heading = {
  title: string;
  id: string;
  level: number;
};

function toHeadingId(value: string): string {
  return value.trim().toLowerCase().replace(/\s/g, "-");
}

function getHeadingSummary(heading: Element, id: string): Heading {
  return {
    title: (heading as HTMLElement).innerText,
    id,
    level: Number.parseInt(heading.tagName.substring(1), 10),
  };
}

function collectHeadings(headingElements: NodeListOf<Element>): Heading[] {
  const idCounts: Record<string, number> = {};

  return Array.from(headingElements).map((heading) => {
    const baseId = toHeadingId(heading.childNodes[0]?.textContent ?? "");
    const nextCount = (idCounts[baseId] ?? 0) + 1;
    idCounts[baseId] = nextCount;

    const id = nextCount > 1 ? `${baseId}-${nextCount}` : baseId;
    if (id) {
      heading.setAttribute("id", id);
    }

    return getHeadingSummary(heading, id);
  });
}

function syncActiveHeading(observerEntry: IntersectionObserverEntry, setActiveId: (id: string) => void): void {
  if (observerEntry.isIntersecting) {
    setActiveId(observerEntry.target.id);
  }
}

export function ToC() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState("");

  const handleHeadingClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();

    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
    window.history.replaceState(null, "", `#${id}`);
  };

  useEffect(() => {
    const headingElements = document.querySelectorAll("h1, h2, h3, h4");
    const nextHeadings = collectHeadings(headingElements);

    setHeadings(nextHeadings);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => syncActiveHeading(entry, setActiveId));
      },
      { rootMargin: "0px 0px -80% 0px" }
    );

    headingElements.forEach((heading) => observer.observe(heading));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="toc-container h-full w-80 overflow-y-auto rounded-r-lg border border-slate-200 bg-slate-50/80 px-3 py-4">
      <div className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
        On this page
      </div>
      <ul className="list-none m-0 p-0">
        {headings.map((heading, index) => (
          <li
            key={`${heading.id}_${index}`}
            className={activeId === heading.id ? "active" : ""}
            style={{
              fontSize: `${1.5 - heading.level * 0.2}em`, // Example: h1 -> 1.3em, h2 -> 1.1em, etc.
              marginLeft: `${(heading.level - 1) * 20}px`, // Example: h1 -> 0px, h2 -> 20px, etc.
            }}
          >
            <a
              className="block rounded px-2 py-1 text-base text-slate-700 no-underline transition-colors hover:bg-slate-200 hover:text-slate-900"
              href={`#${heading.id}`}
              onClick={(event) => handleHeadingClick(event, heading.id)}
            >
              {heading.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
