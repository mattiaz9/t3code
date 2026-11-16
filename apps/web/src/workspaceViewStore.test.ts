import { beforeEach, describe, expect, it } from "vite-plus/test";

import {
  selectCodeViewLocation,
  selectWorkspaceView,
  useWorkspaceViewStore,
} from "./workspaceViewStore";

beforeEach(() => {
  useWorkspaceViewStore.setState({
    viewByThreadKey: {},
    codeLocationByThreadKey: {},
  });
});

describe("openCodeFile", () => {
  it("switches the thread to the code view and shows the file", () => {
    useWorkspaceViewStore.getState().openCodeFile("env:thread", "src/app.ts");

    const state = useWorkspaceViewStore.getState();
    expect(selectWorkspaceView(state.viewByThreadKey, "env:thread")).toBe("code");
    expect(selectCodeViewLocation(state.codeLocationByThreadKey, "env:thread")).toEqual({
      relativePath: "src/app.ts",
    });
  });
});
