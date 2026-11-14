import "./GiroCodeGenerator.css";
import {
  type JSX,
} from "preact";
import {
  useEffect,
  useRef,
  useState,
} from "preact/hooks";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  clearGiroCodeDraft,
  giroCodeBuild,
  giroCodeDraft,
  loadSampleGiroCodeDraft,
  updateGiroCodeField,
} from "#/apps/girocode/girocodeStore.ts";
import {
  ClearFormIcon,
  ClipboardCopyIcon,
  DownloadFileIcon,
  EligibilityConfirmedIcon,
  PaymentQrCodeIcon,
  SamplePresetIcon,
  StatutoryLimitationWarningIcon,
} from "#components/Icons";
import Navigation from "#components/Navigation";
import SourceRevision from "#components/SourceRevision";
import {
  AmountValidationStatus,
  BicValidationStatus,
  createGiroCodeQrMatrix,
  EPC_MAX_NAME_LENGTH,
  EPC_MAX_PURPOSE_LENGTH,
  EPC_MAX_STRUCTURED_REF_LENGTH,
  EPC_MAX_UNSTRUCTURED_REF_LENGTH,
  GiroCodeCharsetMode,
  IbanValidationStatus,
  RemittanceKind,
  StructuredRefValidationStatus,
} from "#engine/payments/girocode";

interface ToastMessage {
  readonly text: string;
  readonly isError: boolean;
}

export default function GiroCodeGenerator(): JSX.Element {
  const draft = giroCodeDraft.value;
  const build = giroCodeBuild.value;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const notify = (text: string, isError = false): void => {
    setToast({
      text,
      isError,
    });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !build.payload) {
      return;
    }
    try {
      const matrix = createGiroCodeQrMatrix(build.payload);
      const quietZone = 4;
      const totalModules = matrix.moduleCount + quietZone * 2;
      const scale = 10;
      const size = totalModules * scale;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#0F172A";
      for (let row = 0; row < matrix.moduleCount; row += 1) {
        for (let col = 0; col < matrix.moduleCount; col += 1) {
          if (matrix.isDark(row, col)) {
            ctx.fillRect(
              (col + quietZone) * scale,
              (row + quietZone) * scale,
              scale,
              scale,
            );
          }
        }
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Could not render QR code.";
      notify(message, true);
    }
  }, [build.payload]);

  const copyText = async (text: string, label: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) {
      notify(`${label} is empty`, true);
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmed);
        notify(`Copied ${label}`);
        return;
      }
    }
    catch {
      // Fall back to execCommand below when clipboard API is restricted.
    }
    try {
      const tempArea = document.createElement("textarea");
      tempArea.value = trimmed;
      tempArea.setAttribute("readonly", "");
      tempArea.style.position = "fixed";
      tempArea.style.left = "-9999px";
      document.body.appendChild(tempArea);
      tempArea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(tempArea);
      if (copied) {
        notify(`Copied ${label}`);
      }
      else {
        notify(`Could not copy ${label}`, true);
      }
    }
    catch {
      notify(`Could not copy ${label}`, true);
    }
  };

  const downloadPng = (): void => {
    const qrCanvas = canvasRef.current;
    if (!qrCanvas || !build.isReady || !build.payload) {
      notify("Complete required fields before downloading PNG", true);
      return;
    }
    try {
      const exportCanvas = document.createElement("canvas");
      const width = 640;
      const height = 760;
      exportCanvas.width = width;
      exportCanvas.height = height;

      const ctx = exportCanvas.getContext("2d");
      if (!ctx) {
        notify("Canvas export is unavailable in this browser", true);
        return;
      }

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 24px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SEPA GiroCode • EPC069-12", width / 2, 50);

      const qrSize = 510;
      ctx.drawImage(qrCanvas, (width - qrSize) / 2, 74, qrSize, qrSize);

      const beneficiary = build.previewLines[5] || "SEPA Beneficiary";
      const amountLabel = build.amountValidation.status === AmountValidationStatus.Valid
        ? build.amountValidation.formattedDisplay
        : "Open amount";
      const referenceLine = build.previewLines[9] || build.previewLines[10] || "";

      ctx.fillStyle = "#1E293B";
      ctx.font = "600 18px Inter, system-ui, sans-serif";
      ctx.fillText(`${beneficiary}  •  ${amountLabel}`, width / 2, 628);

      ctx.fillStyle = "#475569";
      ctx.font = "16px monospace";
      ctx.fillText(build.ibanValidation.spaced, width / 2, 662);
      if (referenceLine) {
        ctx.fillText(referenceLine.slice(0, 56), width / 2, 694);
      }

      const link = document.createElement("a");
      const ibanSuffix = build.ibanValidation.normalized.slice(-8) || "SEPA";
      link.download = `GiroCode_${ibanSuffix}.png`;
      link.href = exportCanvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify("Downloaded GiroCode PNG");
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "Download failed";
      notify(message, true);
    }
  };

  const numberedPreview = build.previewLines
    .map((line, idx) => `${String(idx + 1).padStart(2, "0")} | ${line === "" ? "<empty>" : line}`)
    .join("\n");

  const ibanBadge = (): JSX.Element => {
    if (build.ibanValidation.status === IbanValidationStatus.Valid) {
      return (
        <span className="badge-gain">
          <EligibilityConfirmedIcon size={13} />
          <span>MOD-97 Valid</span>
        </span>
      );
    }
    if (build.ibanValidation.status === IbanValidationStatus.Empty) {
      return <span className="badge-neutral">Enter IBAN</span>;
    }
    return (
      <span className="badge-loss">
        <StatutoryLimitationWarningIcon size={13} />
        <span>Check IBAN</span>
      </span>
    );
  };

  const activeReferenceLength = draft.remittanceKind === RemittanceKind.Structured
    ? build.previewLines[9].length
    : build.previewLines[10].length;
  const activeReferenceMax = draft.remittanceKind === RemittanceKind.Structured
    ? EPC_MAX_STRUCTURED_REF_LENGTH
    : EPC_MAX_UNSTRUCTURED_REF_LENGTH;

  return (
    <>
      <Navigation currentPath={calculatorPath(AppId.GiroCode)} />
      <main id="main-content" className="girocode-page" tabIndex={-1}>
        <header className="girocode-header">
          <div>
            <p className="girocode-header__eyebrow">
              <PaymentQrCodeIcon size={14} />
              <span>EPC069-12 V002 • Level M • UTF-8</span>
            </p>
            <h1>SEPA GiroCode Generator</h1>
            <p className="girocode-header__subtitle">
              Create scannable SEPA Credit Transfer QR payment slips directly in your browser.
            </p>
          </div>
          <div className="girocode-header__actions">
            <button
              type="button"
              className="girocode-btn"
              onClick={() => {
                loadSampleGiroCodeDraft();
                notify("Loaded neutral ISO 13616 test sample");
              }}
            >
              <SamplePresetIcon size={16} />
              <span>Load sample</span>
            </button>
            <button
              type="button"
              className="girocode-btn"
              onClick={() => {
                clearGiroCodeDraft();
                notify("Cleared form fields");
              }}
            >
              <ClearFormIcon size={16} />
              <span>Clear</span>
            </button>
          </div>
        </header>

        <div className="girocode-grid">
          <section className="girocode-card girocode-qr-card" aria-label="Generated GiroCode QR">
            <div className="girocode-qr-card__top">
              <div className="girocode-qr-card__brand">
                <span className="girocode-qr-badge">GiroCode</span>
                <span className="girocode-qr-card__scheme">SEPA Credit Transfer</span>
              </div>
              {ibanBadge()}
            </div>

            <div className="girocode-qr-frame">
              {build.isReady && build.payload
                ? <canvas ref={canvasRef} className="girocode-qr-canvas" aria-label="Scannable SEPA GiroCode QR" />
                : (
                  <div className="girocode-qr-placeholder" role="status">
                    <PaymentQrCodeIcon size={36} />
                    <span>Enter a valid beneficiary name and IBAN to generate a scannable GiroCode.</span>
                  </div>
                )}
              <div className="girocode-qr-frame__footer">
                <span>Scan in banking app</span>
                <span className="girocode-qr-frame__amount">
                  {build.amountValidation.formattedDisplay}
                </span>
              </div>
            </div>

            <div className="girocode-mode-box">
              <div>
                <span className="girocode-mode-box__title">Character Encoding</span>
                <span className="girocode-mode-box__hint">UTF-8 vs. ASCII umlaut fallback</span>
              </div>
              <div className="girocode-segmented" role="group" aria-label="Character encoding mode">
                <button
                  type="button"
                  aria-pressed={draft.charsetMode === GiroCodeCharsetMode.Utf8}
                  onClick={() => updateGiroCodeField("charsetMode", GiroCodeCharsetMode.Utf8)}
                >
                  UTF-8
                </button>
                <button
                  type="button"
                  aria-pressed={draft.charsetMode === GiroCodeCharsetMode.AsciiTransliterated}
                  onClick={() => updateGiroCodeField("charsetMode", GiroCodeCharsetMode.AsciiTransliterated)}
                >
                  ASCII (ae/oe/ue)
                </button>
              </div>
            </div>

            <div className="girocode-qr-actions">
              <button
                type="button"
                className="girocode-btn girocode-btn--primary"
                disabled={!build.isReady}
                onClick={downloadPng}
              >
                <DownloadFileIcon size={18} />
                <span>Download PNG Payment Slip</span>
              </button>
            </div>

            <p className="girocode-note">
              Compatible with German &amp; SEPA mobile banking apps supporting EPC069-12 GiroCode photo/QR transfer.
              &ldquo;QR Code&rdquo; is a registered trademark of DENSO WAVE INCORPORATED.
            </p>
          </section>

          <section className="girocode-stack" aria-label="Transfer details and payload">
            <div className="girocode-card">
              <div className="girocode-card__header">
                <h2>Transfer Details (Überweisungsdaten)</h2>
                <span className="girocode-card__meta">Updates QR live</span>
              </div>

              <div className="girocode-form">
                <div>
                  <div className="girocode-field__top">
                    <label htmlFor="girocode-name">Beneficiary Name (Empfänger) *</label>
                    <button
                      type="button"
                      className="girocode-copy-btn"
                      disabled={!draft.beneficiaryName.trim()}
                      onClick={() => {
                        void copyText(build.previewLines[5] || draft.beneficiaryName, "Beneficiary");
                      }}
                    >
                      <ClipboardCopyIcon size={13} />
                      <span>Copy</span>
                    </button>
                  </div>
                  <input
                    id="girocode-name"
                    type="text"
                    maxLength={EPC_MAX_NAME_LENGTH}
                    placeholder="e.g. Musterfirma GmbH"
                    value={draft.beneficiaryName}
                    onInput={(event) => updateGiroCodeField("beneficiaryName", event.currentTarget.value)}
                  />
                  <div className="girocode-field__hint">
                    <span>Required (1–{EPC_MAX_NAME_LENGTH} chars)</span>
                    <span className="girocode-mono">{build.previewLines[5].length} / {EPC_MAX_NAME_LENGTH}</span>
                  </div>
                </div>

                <div>
                  <div className="girocode-field__top">
                    <label htmlFor="girocode-iban">IBAN *</label>
                    <div className="girocode-field__actions">
                      <button
                        type="button"
                        className="girocode-copy-btn"
                        disabled={!build.ibanValidation.normalized}
                        onClick={() => {
                          void copyText(build.ibanValidation.normalized, "Compact IBAN");
                        }}
                      >
                        <ClipboardCopyIcon size={13} />
                        <span>Copy Compact</span>
                      </button>
                      <button
                        type="button"
                        className="girocode-copy-btn"
                        disabled={!build.ibanValidation.spaced}
                        onClick={() => {
                          void copyText(build.ibanValidation.spaced, "Spaced IBAN");
                        }}
                      >
                        <span>Copy Spaced</span>
                      </button>
                    </div>
                  </div>
                  <input
                    id="girocode-iban"
                    type="text"
                    className="girocode-mono"
                    placeholder="e.g. DE89 3704 0044 0532 0130 00"
                    value={draft.iban}
                    onInput={(event) => updateGiroCodeField("iban", event.currentTarget.value)}
                  />
                  <div className="girocode-field__hint">
                    {build.ibanValidation.status === IbanValidationStatus.InvalidChecksum && (
                      <span className="girocode-field__error">Check digits fail ISO 13616 MOD-97 validation.</span>
                    )}
                    {build.ibanValidation.status === IbanValidationStatus.InvalidFormat && (
                      <span className="girocode-field__error">Invalid SEPA IBAN format or country length.</span>
                    )}
                    {(build.ibanValidation.status === IbanValidationStatus.Empty ||
                      build.ibanValidation.status === IbanValidationStatus.Valid) && (
                      <span>Verified with ISO 13616 MOD-97-10 check</span>
                    )}
                  </div>
                </div>

                <div className="girocode-row-2">
                  <div>
                    <div className="girocode-field__top">
                      <label htmlFor="girocode-bic">BIC (Optional in V002)</label>
                      <button
                        type="button"
                        className="girocode-copy-btn"
                        disabled={!build.bicValidation.normalized}
                        onClick={() => {
                          void copyText(build.bicValidation.normalized, "BIC");
                        }}
                      >
                        <ClipboardCopyIcon size={13} />
                        <span>Copy</span>
                      </button>
                    </div>
                    <input
                      id="girocode-bic"
                      type="text"
                      maxLength={11}
                      className="girocode-mono"
                      placeholder="e.g. COBADEFFXXX"
                      value={draft.bic}
                      onInput={(event) => updateGiroCodeField("bic", event.currentTarget.value)}
                    />
                    {build.bicValidation.status === BicValidationStatus.InvalidFormat && (
                      <div className="girocode-field__hint">
                        <span className="girocode-field__error">Must be 8 or 11 SWIFT characters.</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="girocode-field__top">
                      <label htmlFor="girocode-amount">Amount (Optional)</label>
                      <button
                        type="button"
                        className="girocode-copy-btn"
                        disabled={build.amountValidation.status !== AmountValidationStatus.Valid}
                        onClick={() => {
                          void copyText(build.amountValidation.amount?.toFixed(2) ?? "", "Amount");
                        }}
                      >
                        <ClipboardCopyIcon size={13} />
                        <span>Copy</span>
                      </button>
                    </div>
                    <div className="girocode-amount-wrap">
                      <input
                        id="girocode-amount"
                        type="text"
                        inputMode="decimal"
                        className="girocode-mono"
                        placeholder="e.g. 125.00"
                        value={draft.amount}
                        onInput={(event) => updateGiroCodeField("amount", event.currentTarget.value)}
                      />
                      <span className="girocode-amount-unit">EUR</span>
                    </div>
                    {build.amountValidation.status === AmountValidationStatus.Invalid && (
                      <div className="girocode-field__hint">
                        <span className="girocode-field__error">Enter 0.01–999,999,999.99 EUR.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="girocode-field__top">
                    <label htmlFor="girocode-reference">
                      {draft.remittanceKind === RemittanceKind.Structured
                        ? "Structured Reference (ISO 11649 RF)"
                        : "Reference (Verwendungszweck)"}
                    </label>
                    <div className="girocode-segmented" role="group" aria-label="Remittance reference mode">
                      <button
                        type="button"
                        aria-pressed={draft.remittanceKind === RemittanceKind.Unstructured}
                        onClick={() => updateGiroCodeField("remittanceKind", RemittanceKind.Unstructured)}
                      >
                        Unstructured
                      </button>
                      <button
                        type="button"
                        aria-pressed={draft.remittanceKind === RemittanceKind.Structured}
                        onClick={() => updateGiroCodeField("remittanceKind", RemittanceKind.Structured)}
                      >
                        RF Structured
                      </button>
                    </div>
                  </div>
                  {draft.remittanceKind === RemittanceKind.Structured
                    ? (
                      <input
                        id="girocode-reference"
                        type="text"
                        maxLength={EPC_MAX_STRUCTURED_REF_LENGTH}
                        className="girocode-mono"
                        placeholder="e.g. RF18539007547034"
                        value={draft.structuredReference}
                        onInput={(event) => updateGiroCodeField("structuredReference", event.currentTarget.value)}
                      />
                    )
                    : (
                      <input
                        id="girocode-reference"
                        type="text"
                        maxLength={EPC_MAX_UNSTRUCTURED_REF_LENGTH}
                        placeholder="e.g. Invoice 2026-001"
                        value={draft.unstructuredReference}
                        onInput={(event) => updateGiroCodeField("unstructuredReference", event.currentTarget.value)}
                      />
                    )}
                  <div className="girocode-field__hint">
                    {draft.remittanceKind === RemittanceKind.Structured &&
                      build.structuredRefValidation.status === StructuredRefValidationStatus.InvalidChecksum
                      ? <span className="girocode-field__error">ISO 11649 RF check digits are invalid.</span>
                      : <span>EPC069-12 allows either unstructured or structured text.</span>}
                    <span className="girocode-mono">{activeReferenceLength} / {activeReferenceMax}</span>
                  </div>
                </div>

                <div>
                  <div className="girocode-field__top">
                    <label htmlFor="girocode-purpose">Purpose Code (AT-44, Optional)</label>
                  </div>
                  <input
                    id="girocode-purpose"
                    type="text"
                    maxLength={EPC_MAX_PURPOSE_LENGTH}
                    className="girocode-mono"
                    placeholder="e.g. CHAR, SALA, RENT"
                    value={draft.purposeCode}
                    onInput={(event) => updateGiroCodeField("purposeCode", event.currentTarget.value)}
                  />
                </div>

                {build.errors.length > 0 && (draft.beneficiaryName || draft.iban || draft.bic || draft.amount) && (
                  <div className="girocode-errors" role="alert">
                    <strong>Checks needed before generating QR:</strong>
                    <ul>
                      {build.errors.map((message) => <li key={message}>{message}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="girocode-card">
              <div className="girocode-card__header">
                <h2>Raw EPC069-12 Payload (11 Lines)</h2>
                <div className="girocode-field__actions">
                  <span className={build.utf8ByteLength > build.maxByteLength ? "badge-loss" : "badge-neutral"}>
                    {build.utf8ByteLength} / {build.maxByteLength} bytes
                  </span>
                  <button
                    type="button"
                    className="girocode-copy-btn"
                    disabled={!build.payload}
                    onClick={() => {
                      if (build.payload) {
                        void copyText(build.payload, "EPC069-12 Payload");
                      }
                    }}
                  >
                    <ClipboardCopyIcon size={13} />
                    <span>Copy Raw Payload</span>
                  </button>
                </div>
              </div>
              <pre className="girocode-payload">{numberedPreview}</pre>
            </div>
          </section>
        </div>

        {toast && (
          <div
            className={toast.isError ? "girocode-toast girocode-toast--error" : "girocode-toast"}
            role="status"
            aria-live="polite"
          >
            {toast.text}
          </div>
        )}
      </main>
      <footer className="source-revision-footer">
        <SourceRevision />
      </footer>
    </>
  );
}
