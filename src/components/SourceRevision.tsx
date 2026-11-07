import type {
  JSX,
} from "preact";
import {
  buildInfo,
} from "#/data/buildInfo";
import "./SourceRevision.css";

const sourceCommitUrl = `https://github.com/${buildInfo.repository}/commit/${buildInfo.commit}`;

export default function SourceRevision(): JSX.Element {
  return <p className="source-revision">
    Source commit: <a href={sourceCommitUrl} title={buildInfo.commit}>
      <code><strong>{buildInfo.shortCommit}</strong>{buildInfo.commit.slice(12)}</code>
    </a>
  </p>;
}
