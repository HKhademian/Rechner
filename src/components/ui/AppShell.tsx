import "./UnifiedControls.css";
import type {
  ComponentChildren,
  JSX,
} from "preact";
import Navigation from "#components/Navigation";
import SourceRevision from "#components/SourceRevision";
import {
  appShellMainClassName,
} from "#utils/uiHelpers";

export interface AppShellProps {
  readonly currentPath: string;
  readonly wide?: boolean;
  readonly mainClassName?: string;
  readonly shellClassName?: string;
  readonly footerNote?: string;
  readonly children: ComponentChildren;
}

/**
 * Unified application shell guaranteeing every Rechner page renders the
 * sticky navigation header, landmark `<main id="main-content">`, and shared footer.
 */
export function AppShell({
  currentPath,
  wide = false,
  mainClassName = "",
  shellClassName = "",
  footerNote,
  children,
}: AppShellProps): JSX.Element {
  return (
    <div className={["ui-app-shell", shellClassName.trim()].filter(Boolean).join(" ")}>
      <Navigation currentPath={currentPath} />
      <main
        id="main-content"
        className={appShellMainClassName(wide, mainClassName)}
        tabIndex={-1}
      >
        {children}
      </main>
      <footer className="ui-app-footer source-revision-footer">
        <SourceRevision note={footerNote} />
      </footer>
    </div>
  );
}
