import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaginationControl } from "./PaginationControl";

afterEach(cleanup);

describe("PaginationControl", () => {
  it("renders range info and active page correctly", () => {
    render(<PaginationControl page={1} totalPages={5} totalItems={100} limit={20} onPageChange={vi.fn()} onLimitChange={vi.fn()} />);

    expect(screen.getByTestId("pagination-range-info").textContent).toContain("Showing 1–20 of 100");
    const currentPageBtn = screen.getByRole("button", { name: "Page 1" });
    expect(currentPageBtn.getAttribute("aria-current")).toBe("page");
    expect(currentPageBtn.classList.contains("is-current")).toBe(true);
  });

  it("disables Previous on first page and enables Next", () => {
    const onPageChange = vi.fn();
    render(<PaginationControl page={1} totalPages={5} totalItems={100} limit={20} onPageChange={onPageChange} />);

    const prevBtn = screen.getByRole("button", { name: "Go to previous page" }) as HTMLButtonElement;
    const nextBtn = screen.getByRole("button", { name: "Go to next page" }) as HTMLButtonElement;

    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables Next on last page and enables Previous", () => {
    const onPageChange = vi.fn();
    render(<PaginationControl page={5} totalPages={5} totalItems={100} limit={20} onPageChange={onPageChange} />);

    const prevBtn = screen.getByRole("button", { name: "Go to previous page" }) as HTMLButtonElement;
    const nextBtn = screen.getByRole("button", { name: "Go to next page" }) as HTMLButtonElement;

    expect(prevBtn.disabled).toBe(false);
    expect(nextBtn.disabled).toBe(true);

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("switches pages when page buttons are clicked", () => {
    const onPageChange = vi.fn();
    render(<PaginationControl page={2} totalPages={5} totalItems={100} limit={20} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Page 4" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("triggers onLimitChange when page size dropdown is changed", () => {
    const onLimitChange = vi.fn();
    render(<PaginationControl page={1} totalPages={5} totalItems={100} limit={20} onPageChange={vi.fn()} onLimitChange={onLimitChange} />);

    const select = screen.getByLabelText("Episodes per page");
    fireEvent.change(select, { target: { value: "50" } });
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it("renders ellipsis for large page counts with middle current page", () => {
    render(<PaginationControl page={5} totalPages={10} totalItems={200} limit={20} onPageChange={vi.fn()} />);

    const ellipses = screen.getAllByText("…");
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Page 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page 5" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Page 10" })).toBeTruthy();
  });

  it("renders nothing when totalItems is 0 and totalPages <= 1", () => {
    const { container } = render(<PaginationControl page={1} totalPages={0} totalItems={0} limit={20} onPageChange={vi.fn()} />);

    expect(container.firstChild).toBeNull();
  });
});
