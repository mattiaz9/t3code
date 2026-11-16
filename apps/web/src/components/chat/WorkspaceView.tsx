import type {
  EditorId,
  EnvironmentId,
  PreviewAnnotationPayload,
  ProjectId,
  ResolvedKeybindingsConfig,
  ScopedThreadRef,
} from "@t3tools/contracts";
import { CodeXmlIcon, GlobeIcon, MessageSquareIcon } from "lucide-react";
import { lazy, memo, Suspense } from "react";

import type { ComposerImageAttachment, DraftId } from "../../composerDraftStore";
import {
  isWorkspaceView,
  selectCodeViewLocation,
  useWorkspaceViewStore,
  type WorkspaceView,
} from "../../workspaceViewStore";
import { Toggle, ToggleGroup } from "../ui/toggle-group";

const PreviewPanel = lazy(() =>
  import("../preview/PreviewPanel").then((module) => ({ default: module.PreviewPanel })),
);
const FilePreviewPanel = lazy(() => import("../files/FilePreviewPanel"));

const VIEW_OPTIONS = [
  { view: "chat", label: "Chat", Icon: MessageSquareIcon },
  { view: "browser", label: "Browser", Icon: GlobeIcon },
  { view: "code", label: "Code", Icon: CodeXmlIcon },
] as const;

export const WorkspaceViewTabs = memo(function WorkspaceViewTabs(props: {
  readonly view: WorkspaceView;
  readonly codeAvailable: boolean;
  readonly onViewChange: (view: WorkspaceView) => void;
}) {
  return (
    <ToggleGroup
      aria-label="Workspace view"
      variant="segmented"
      value={[props.view]}
      onValueChange={(next) => {
        const view = next[0];
        if (isWorkspaceView(view)) props.onViewChange(view);
      }}
    >
      {VIEW_OPTIONS.map(({ view, label, Icon }) => (
        <Toggle
          key={view}
          value={view}
          disabled={view === "code" && !props.codeAvailable}
          data-workspace-view-tab={view}
        >
          <Icon aria-hidden className="size-3.5" />
          <span className="@max-[40rem]/chat-header:sr-only">{label}</span>
        </Toggle>
      ))}
    </ToggleGroup>
  );
});

/** The browser or code view, drawn over the chat body below the header. */
export function WorkspaceViewContent(props: {
  readonly view: Exclude<WorkspaceView, "chat">;
  readonly threadRef: ScopedThreadRef;
  readonly threadKey: string;
  readonly environmentId: EnvironmentId;
  readonly composerDraftTarget: ScopedThreadRef | DraftId;
  readonly keybindings: ResolvedKeybindingsConfig;
  readonly configuredPreviewUrls: ReadonlyArray<string>;
  readonly workspaceMutationId: string | null;
  readonly onSendAnnotation: (
    annotation: PreviewAnnotationPayload,
    image: ComposerImageAttachment | null,
  ) => void;
  readonly files: {
    readonly projectId: ProjectId | undefined;
    readonly projectName: string | null;
    readonly workspaceRoot: string | undefined;
    readonly availableEditors: ReadonlyArray<EditorId>;
    readonly pendingSurfaceIds: ReadonlySet<string>;
    readonly onPendingChange: (relativePath: string, pending: boolean) => void;
  };
}) {
  const { threadKey, files } = props;
  const codeLocation = useWorkspaceViewStore((state) =>
    selectCodeViewLocation(state.codeLocationByThreadKey, threadKey),
  );
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-workspace-view={props.view}>
      <Suspense fallback={null}>
        {props.view === "browser" ? (
          <PreviewPanel
            mode="embedded"
            threadRef={props.threadRef}
            configuredUrls={props.configuredPreviewUrls}
            visible
            onSendAnnotation={props.onSendAnnotation}
          />
        ) : files.workspaceRoot && files.projectName !== null ? (
          <FilePreviewPanel
            key={`${props.environmentId}:${files.workspaceRoot}`}
            environmentId={props.environmentId}
            cwd={files.workspaceRoot}
            projectName={files.projectName}
            projectId={files.projectId}
            threadRef={props.threadRef}
            composerDraftTarget={props.composerDraftTarget}
            keybindings={props.keybindings}
            availableEditors={files.availableEditors}
            openInShortcutEnabled
            relativePath={codeLocation.relativePath}
            revealLine={null}
            revealRequestId={0}
            expansionScope="code"
            onOpenFile={(relativePath) =>
              useWorkspaceViewStore.getState().openCodeFile(threadKey, relativePath)
            }
            onNavigateFolder={(relativePath, folderTrail) =>
              useWorkspaceViewStore
                .getState()
                .navigateCodeFolder(threadKey, relativePath, folderTrail)
            }
            folderTrail={codeLocation.folderTrail}
            onPendingChange={files.onPendingChange}
            selectedFilePending={
              codeLocation.relativePath !== null &&
              files.pendingSurfaceIds.has(`file:${codeLocation.relativePath}`)
            }
            workspaceMutationId={props.workspaceMutationId}
          />
        ) : null}
      </Suspense>
    </div>
  );
}
