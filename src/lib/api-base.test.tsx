import { render, fireEvent, waitFor, act } from "@testing-library/react";
import { APIBase } from "./api-base";
import { checkAPI } from "@/lib/check-api";

jest.mock("@/lib/check-api");

describe("APIBase Component", () => {
  it("should render the button and initial state correctly", () => {
    const { getByText, container } = render(<APIBase />);
    expect(getByText("Check")).toBeInTheDocument();
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("should call checkAPI and update state on successful check", async () => {
    (checkAPI as jest.Mock).mockResolvedValueOnce(true);
    const { getByText } = render(<APIBase />);

    await act(async () => {
      fireEvent.click(getByText("Check"));
    });

    await waitFor(() => {
      expect(getByText("Status: 200")).toBeInTheDocument();
    });
  });

  it("should call checkAPI and update state on failed check", async () => {
    (checkAPI as jest.Mock).mockRejectedValueOnce(
      new Error("API check failed")
    );
    const { getByText } = render(<APIBase />);

    await act(async () => {
      fireEvent.click(getByText("Check"));
    });

    await waitFor(() => {
      expect(getByText("Error: The API check failed")).toBeInTheDocument();
    });
  });

  it("should apply correct classes based on state", async () => {
    (checkAPI as jest.Mock).mockResolvedValueOnce(true);
    const { getByText, container } = render(<APIBase />);

    await act(async () => {
      fireEvent.click(getByText("Check"));
    });

    await waitFor(() => {
      expect(container.querySelector(".bg-green-50")).toBeInTheDocument();
    });

    (checkAPI as jest.Mock).mockRejectedValueOnce(
      new Error("API check failed")
    );

    await act(async () => {
      fireEvent.click(getByText("Check"));
    });

    await waitFor(() => {
      expect(container.querySelector(".bg-red-50")).toBeInTheDocument();
    });
  });
});
