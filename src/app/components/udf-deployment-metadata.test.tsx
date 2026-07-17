import { render, screen } from "@testing-library/react";
import { UdfDeploymentMetadata } from "./udf-deployment-metadata";
import { fetchUDFInfo } from "@/lib/udf";

jest.mock("@/lib/udf", () => ({
  fetchUDFInfo: jest.fn(),
}));

describe("UdfDeploymentMetadata", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading when deployment metadata is unavailable", async () => {
    (fetchUDFInfo as jest.Mock).mockResolvedValue(null);

    const ui = await UdfDeploymentMetadata();
    render(<>{ui}</>);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders deployment metadata JSON", async () => {
    (fetchUDFInfo as jest.Mock).mockResolvedValue({ deployment: { id: "dep-1" } });

    const ui = await UdfDeploymentMetadata();
    render(<>{ui}</>);

    expect(screen.getByText("UDF Deployment Info")).toBeInTheDocument();
    expect(screen.getByText(/"deployment":/)).toBeInTheDocument();
    expect(screen.getByText(/"dep-1"/)).toBeInTheDocument();
  });
});
