import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TiltCard } from "./TiltCard";

// TiltCard only follows the mouse (pointerType === "mouse"); touch/pen must
// stay static. These tests guard that documented behaviour against regressions.

describe("TiltCard", () => {
  it("renders children", () => {
    render(
      <TiltCard>
        <span>hello</span>
      </TiltCard>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("applies the group/tilt + transform base classes on the root", () => {
    const { container } = render(
      <TiltCard>
        <span>x</span>
      </TiltCard>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("group/tilt");
    expect(root.className).toContain("transform-gpu");
  });

  it("starts in the resting transform (no tilt)", () => {
    const { container } = render(
      <TiltCard>
        <span>x</span>
      </TiltCard>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.transform).toBe(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)",
    );
  });

  it("forwards extra props to the root element", () => {
    const { container } = render(
      <TiltCard data-testid="tilt" aria-label="card">
        <span>x</span>
      </TiltCard>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-label")).toBe("card");
  });

  it("does NOT tilt for touch pointers (stays static)", () => {
    const { container } = render(
      <TiltCard>
        <span>x</span>
      </TiltCard>,
    );
    const root = container.firstElementChild as HTMLElement;

    // getBoundingClientRect is stubbed to deterministic values.
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.pointerMove(root, { pointerType: "touch", clientX: 10, clientY: 10 });

    expect(root.style.transform).toBe(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)",
    );
  });

  it("tilts for mouse pointers and resets on pointer leave", () => {
    const { container } = render(
      <TiltCard maxTilt={12} lift={14}>
        <span>x</span>
      </TiltCard>,
    );
    const root = container.firstElementChild as HTMLElement;

    vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    // Mouse near top-left → rotateX positive (0.5 - py) * maxTilt * 2, py≈0.05.
    fireEvent.pointerMove(root, { pointerType: "mouse", clientX: 10, clientY: 10 });

    const tilted = root.style.transform;
    expect(tilted).toContain("rotateX(");
    expect(tilted).not.toContain("rotateX(0deg)");
    expect(tilted).toContain("translateY(-14px)");

    // Leaving should reset to the resting transform.
    fireEvent.pointerLeave(root);
    expect(root.style.transform).toBe(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)",
    );
  });
});
