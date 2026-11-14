import { create } from "zustand";

const WORKSPACE_VIEWS = ["chat", "browser", "code"] as const;
export type WorkspaceView = (typeof WORKSPACE_VIEWS)[number];

export function isWorkspaceView(value: unknown): value is WorkspaceView {
  return WORKSPACE_VIEWS.includes(value as WorkspaceView);
}

/** The file or folder the code view shows; `null` is the workspace root. */
export interface CodeViewLocation {
  readonly relativePath: string | null;
  readonly folderTrail?: string;
}

const ROOT_CODE_VIEW_LOCATION: CodeViewLocation = { relativePath: null };

interface WorkspaceViewStoreState {
  readonly viewByThreadKey: Readonly<Record<string, WorkspaceView>>;
  readonly codeLocationByThreadKey: Readonly<Record<string, CodeViewLocation>>;
  readonly setView: (threadKey: string, view: WorkspaceView) => void;
  readonly openCodeFile: (threadKey: string, relativePath: string) => void;
  readonly navigateCodeFolder: (
    threadKey: string,
    relativePath: string,
    folderTrail: string,
  ) => void;
}

export const useWorkspaceViewStore = create<WorkspaceViewStoreState>()((set) => ({
  viewByThreadKey: {},
  codeLocationByThreadKey: {},
  setView: (threadKey, view) =>
    set((state) =>
      (state.viewByThreadKey[threadKey] ?? "chat") === view
        ? state
        : { viewByThreadKey: { ...state.viewByThreadKey, [threadKey]: view } },
    ),
  openCodeFile: (threadKey, relativePath) =>
    set((state) => ({
      codeLocationByThreadKey: { ...state.codeLocationByThreadKey, [threadKey]: { relativePath } },
    })),
  navigateCodeFolder: (threadKey, relativePath, folderTrail) =>
    set((state) => ({
      codeLocationByThreadKey: {
        ...state.codeLocationByThreadKey,
        [threadKey]: {
          relativePath: relativePath === "" ? null : relativePath,
          ...(folderTrail === relativePath ? {} : { folderTrail }),
        },
      },
    })),
}));

export function selectWorkspaceView(
  viewByThreadKey: WorkspaceViewStoreState["viewByThreadKey"],
  threadKey: string | null,
): WorkspaceView {
  return threadKey === null ? "chat" : (viewByThreadKey[threadKey] ?? "chat");
}

export function selectCodeViewLocation(
  codeLocationByThreadKey: WorkspaceViewStoreState["codeLocationByThreadKey"],
  threadKey: string | null,
): CodeViewLocation {
  return threadKey === null
    ? ROOT_CODE_VIEW_LOCATION
    : (codeLocationByThreadKey[threadKey] ?? ROOT_CODE_VIEW_LOCATION);
}
