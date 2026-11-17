import {
  topicPath, 
} from "#utils/topicPath";
import {
  InformationalNoticeIcon,
} from "#components/Icons";
import {
  getTopic,
} from "#engine/topics/registry";
import {
  InlineContent, 
} from "#components/topics/InlineContent";
import {
  isPlainPrimaryClick,
  openLawReference,
} from "#store/lawReferenceStore";
import {
  useEffect,
  useRef,
  useState,
} from "preact/hooks";
import type {
  JSX,
} from "preact";

/** Opens the shared reference popup; the link also works without JavaScript. */
export function TopicHelp({ id }: { readonly id: string }): JSX.Element | null {
  const topic = getTopic(id);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [open]);
  if (!topic) {
    return null;
  }
  const href = topicPath(topic.id);
  return <><a className="topic-help" href={href} title={`Explain ${topic.title}`} aria-label={`Explain ${topic.title}`}
    onClick={(event) => {
      if (!isPlainPrimaryClick(event)) {
        return;
      }
      event.preventDefault();
      if (topic.laws.length === 0) {
        setOpen(true);
        return;
      }
      openLawReference(topic.laws[0], undefined, {
        title: topic.title,
        description: `${topic.description} ${topic.benefit} ${topic.limitation}`,
        calculatorEffect: topic.calculatorEffect,
        topicId: topic.id,
      });
    }}><InformationalNoticeIcon size={16} /></a>
  {open && <dialog ref={dialogRef} className="law-reference-dialog" aria-labelledby={`topic-help-${topic.id}`} onCancel={() => setOpen(false)} onClick={(event) => {
    if (event.target === dialogRef.current) {
      setOpen(false);
    }
  }}>
    <div className="law-reference-dialog__surface">
      <header className="law-reference-dialog__header">
        <h2 id={`topic-help-${topic.id}`} className="law-reference-dialog__title">{topic.title}</h2>
        <button type="button" className="law-reference-dialog__icon-btn" onClick={() => setOpen(false)} autoFocus>Close</button>
      </header>
      <div className="law-reference-dialog__body">
        <p><InlineContent text={topic.description} /></p><p><strong>Benefit:</strong> <InlineContent text={topic.benefit} /></p><p><strong>Limitation:</strong> <InlineContent text={topic.limitation} /></p>
        <p><strong>In this calculator:</strong> <InlineContent text={topic.calculatorEffect} /></p>
        <a href={href}>Explore this topic →</a>
      </div>
    </div>
  </dialog>}</>;
}
