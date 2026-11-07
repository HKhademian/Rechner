import type {
  JSX,
} from "preact";
import {
  buildInfo,
} from "#data/buildInfo";
import "./SourceRevision.css";

const sourceCommitUrl = `https://github.com/${buildInfo.repository}/commit/${buildInfo.commit}`;
const licenseUrl = `https://github.com/${buildInfo.repository}/blob/${buildInfo.commit}/LICENSE`;
const termsUrl = `https://github.com/${buildInfo.repository}/blob/${buildInfo.commit}/TERMS_OF_USE.md`;

export default function SourceRevision(): JSX.Element {
  return <>
    <p className="source-use-notice">
      Use of this calculator, including automated access and scraping, is subject to the <a href={termsUrl} target="_blank" rel="noopener noreferrer">Use Terms</a>.
    </p>
    <p className="source-revision">
      Source code: <a href={sourceCommitUrl} title={buildInfo.commit} target="_blank" rel="noopener noreferrer">
        <code><strong>{buildInfo.shortCommit}</strong>{buildInfo.commit.slice(12)}</code>
      </a> · <a href={licenseUrl} target="_blank" rel="noopener noreferrer">Personal Use License</a> · <a href={termsUrl} target="_blank" rel="noopener noreferrer">Use Terms</a>
    </p>
  </>;
}
