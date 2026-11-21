import type {
  JSX,
} from "preact";
import {
  sitePath,
} from "#/apps/appDefinition.ts";
import {
  buildInfo,
} from "#data/buildInfo";
import {
  externalLinkAttributes,
} from "#utils/uiHelpers";
import "./SourceRevision.css";

const sourceCommitUrl = `https://github.com/${buildInfo.repository}/commit/${buildInfo.commit}`;
const licenseUrl = `https://github.com/${buildInfo.repository}/blob/${buildInfo.commit}/LICENSE`;
const termsUrl = `https://github.com/${buildInfo.repository}/blob/${buildInfo.commit}/TERMS_OF_USE.md`;

export interface SourceRevisionProps {
  readonly note?: string;
}

/** Shared single-row footer bar with optional contextual note, legal links, and rightmost commit hash. */
export default function SourceRevision({ note }: SourceRevisionProps): JSX.Element {
  return (
    <div className="source-revision">
      <div className="source-revision__meta">
        {note && (
          <>
            <span className="source-revision__note">{note}</span>
            <span className="source-revision__sep" aria-hidden="true">·</span>
          </>
        )}
        <a href={licenseUrl} {...externalLinkAttributes}>Personal Use License</a>
        <span className="source-revision__sep" aria-hidden="true">·</span>
        <a href={termsUrl} {...externalLinkAttributes}>Use Terms</a>
        <span className="source-revision__sep" aria-hidden="true">·</span>
        <a href={sitePath("/THIRD_PARTY_NOTICES.txt")} target="_blank" rel="noopener noreferrer">Third-party notices</a>
      </div>
      <a
        href={sourceCommitUrl}
        className="source-revision__hash"
        title={`Commit ${buildInfo.commit}`}
        aria-label={`Source commit ${buildInfo.shortCommit}`}
        {...externalLinkAttributes}
      >
        <code>{buildInfo.shortCommit}</code>
      </a>
    </div>
  );
}
