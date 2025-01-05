import { render, screen } from "@testing-library/react";
import { ToC } from "./toc";

describe("ToC Component", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render ToC component", () => {
    const observeMock = jest.fn();
    const unobserveMock = jest.fn();

    window.IntersectionObserver = jest.fn(() => ({
      observe: observeMock,
      unobserve: unobserveMock,
      disconnect: jest.fn(),
      takeRecords: jest.fn(),
      root: null,
      rootMargin: "",
      thresholds: [],
    }));

    render(
      <div>
        <ToC />
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <h3>Heading 3</h3>
        <h4>Heading 4</h4>
        <h4></h4>
      </div>
    );

    expect(screen.getByText("Heading 1")).toBeInTheDocument();
    expect(screen.getByText("Heading 2")).toBeInTheDocument();
    expect(screen.getByText("Heading 3")).toBeInTheDocument();
    expect(screen.getByText("Heading 4")).toBeInTheDocument();
    expect(document.getElementById("heading-1")).toBeInTheDocument();
    expect(document.getElementById("heading-2")).toBeInTheDocument();
    expect(document.getElementById("heading-3")).toBeInTheDocument();
    expect(document.getElementById("heading-4")).toBeInTheDocument();
    expect(document.getElementById("")).not.toBeInTheDocument();
  });

  it("should set activeId when heading is intersecting", () => {
    const observeMock = jest.fn();
    const unobserveMock = jest.fn();

    window.IntersectionObserver = jest.fn(() => ({
      observe: observeMock,
      unobserve: unobserveMock,
      disconnect: jest.fn(),
      takeRecords: jest.fn(),
      root: null,
      rootMargin: "",
      thresholds: [],
    }));

    render(
      <div>
        <ToC />
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <h3>Heading 3</h3>
        <h4>Heading 4</h4>
      </div>
    );

    expect(observeMock).toHaveBeenCalled();
  });

  it("should set unique IDs for headings", () => {
    render(
      <div>
        <ToC />
        <h1>Heading</h1>
        <h1>Heading</h1>
      </div>
    );
    expect(document.getElementById("heading")).toBeInTheDocument();
    expect(document.getElementById("heading-2")).toBeInTheDocument();
  });
});
