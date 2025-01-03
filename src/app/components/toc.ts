"use client";
import { useEffect, useState } from "react";

export function ToC() {
  type Heading = {
    title: string;
    id: string;
    level: number;
  };

  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    // Get all the headings on the page
    const headingElements = document.querySelectorAll("h1, h2, h3, h4");
    const idCounts: { [key: string]: number } = {}; // To keep track of the number of times an ID has been used

    const headings = Array.from(headingElements).map((heading) => {
      let id = (heading as HTMLElement).innerText.toLowerCase().replace(/\s/g, "-");

      // If the ID already exists, append a counter to make it unique
      if (idCounts[id]) {
        idCounts[id] += 1;
        id = `${id}-${idCounts[id]}`;
      } else {
        idCounts[id] = 1;
      }

      heading.setAttribute("id", id); // Set the id attribute of the heading element
      return {
        title: (heading as HTMLElement).innerText,
        id: id,
        level: parseInt(heading.tagName.substring(1)), // Get the heading level
      };
    });
    setHeadings(headings);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "0px 0px -80% 0px" } // Adjust as needed
    );

    headingElements.forEach((heading) => observer.observe(heading));

    return () => {
      headingElements.forEach((heading) => observer.unobserve(heading));
    };
  }, []);

  return (
    <div className="toc-container p-1 w-80 sticky top-0 border-r-2 border-t-2 h-screen overflow-y-auto">
      <ul className="list-none">
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
              className="no-underline text-gray-600 text-base"
              href={`#${heading.id}`}
            >
              {heading.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
