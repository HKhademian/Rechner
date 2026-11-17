import "./UnifiedControls.css";
import type {
  ComponentChildren,
  JSX,
} from "preact";
import Navigation from "#components/Navigation";
import {
  calculatorAtPath, 
} from "#/apps/registry.ts";
import {
  sitePath, 
} from "#/apps/appDefinition.ts";
import {
  topics, 
} from "#engine/topics/registry";
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
  const app = calculatorAtPath(currentPath);
  const relatedTopics = app ? topics.filter((topic) => !topic.parentId && topic.apps.includes(app.id)) : [];
  return (
    <div className={["ui-app-shell", shellClassName.trim()].filter(Boolean).join(" ")}>
      <Navigation currentPath={currentPath} />
      <main
        id="main-content"
        className={appShellMainClassName(wide, mainClassName)}
        tabIndex={-1}
      >
        {children}
        {relatedTopics.length > 0 && <section className="ui-related-topics" aria-label="Related explanations">
          <h2>Related explanations</h2>
          <ul>{relatedTopics.map((topic) => <li key={topic.id}><a href={sitePath(`/topics/${topic.id}/`)}>{topic.title}</a></li>)}</ul>
        </section>}
      </main>
      <footer className="ui-app-footer source-revision-footer">
        <SourceRevision note={footerNote} />
      </footer>
    </div>
  );
}
