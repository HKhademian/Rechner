import "./CalculatorResultDetails.css";
import {
  type ComponentChildren,
  type JSX,
} from "preact";
import {
  createPortal,
} from "preact/compat";
import {
  useEffect,
  useRef,
  useState,
} from "preact/hooks";

/** Native modal behavior contains focus and supports Escape; the trigger regains focus on close. */
export default function CalculatorResultDetails({ id, title, context, summary, children }: {
  id: string;
  title: string;
  context: string;
  summary: ComponentChildren;
  children: ComponentChildren;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    dialog.current?.showModal();
    return () => trigger.current?.focus();
  }, [open]);
  return <div className="calculator-result-summary">
    {summary}
    <button ref={trigger} type="button" className="calculator-result-details-button" aria-haspopup="dialog" aria-label={`${context}: ${title} details`} onClick={() => setOpen(true)}>View details</button>
    {open && createPortal(<dialog ref={dialog} className="calculator-result-dialog" aria-labelledby={`${id}-context ${id}-title`} onCancel={() => setOpen(false)} onClose={() => setOpen(false)}>
      <div className="calculator-result-dialog__header">
        <div><p id={`${id}-context`}>{context}</p><h2 id={`${id}-title`}>{title}</h2></div>
        <button type="button" autoFocus className="calculator-result-details-button" aria-label={`Close ${title} details`} onClick={() => setOpen(false)}>Close</button>
      </div>
      <div className="calculator-result-dialog__body">{children}</div>
    </dialog>, document.body)}
  </div>;
}
