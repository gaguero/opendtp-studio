import React from "react";
import ReactDOM from "react-dom/client";
import {
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Columns3,
  Download,
  FileDown,
  Gauge,
  RefreshCcw,
  Sparkles,
  Wand2,
  XCircle
} from "lucide-react";
import type { LayoutDocument, PageFrame, TextFrame } from "@opendtp/dtp-core";
import { sampleLayout } from "@opendtp/dtp-core";
import "./styles.css";

type PreflightIssue = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  frameId?: string;
};

type PreflightReport = {
  score: number;
  issues: PreflightIssue[];
  textCapacity: number;
  textLength: number;
};

type Toast = {
  tone: "success" | "error" | "info";
  message: string;
};

const defaultPrompt =
  "Create an A4 editorial brief title: Local Food Futures with 3 columns, bleed, a lead image, and a serious magazine tone.";

const initialPreflight: PreflightReport = {
  score: 72,
  issues: [
    { code: "missing-image", severity: "warning", message: 'Image frame "hero-art" is using a generated placeholder.' },
    { code: "soft-cmyk", severity: "info", message: "CMYK is soft-proof metadata until PDF/X validation is enabled." }
  ],
  textCapacity: 2600,
  textLength: sampleLayout.stories[0]?.content.length ?? 0
};

function App() {
  const [layout, setLayout] = React.useState<LayoutDocument>(sampleLayout);
  const [preflight, setPreflight] = React.useState<PreflightReport>(initialPreflight);
  const [prompt, setPrompt] = React.useState(defaultPrompt);
  const [instruction, setInstruction] = React.useState("Make body copy 3 columns and add bleed");
  const [busy, setBusy] = React.useState<"generate" | "edit" | "export" | null>(null);
  const [provider, setProvider] = React.useState("sample");
  const [toast, setToast] = React.useState<Toast | null>(null);
  const [history, setHistory] = React.useState<string[]>(["Loaded editorial sample"]);
  const [inspectorOpen, setInspectorOpen] = React.useState(false);

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function generateLayout() {
    await runAction("generate", async () => {
      const data = await postJson<{ layout: LayoutDocument; provider: string; preflight: PreflightReport }>("/api/layouts/generate", { prompt });
      setLayout(data.layout);
      setPreflight(data.preflight);
      setProvider(data.provider);
      pushHistory(`Generated: ${data.layout.title}`);
      setToast({ tone: "success", message: "Layout generated and preflighted." });
    });
  }

  async function applyInstruction() {
    await runAction("edit", async () => {
      const data = await postJson<{ layout: LayoutDocument; provider: string; preflight: PreflightReport }>("/api/layouts/edit", {
        layout,
        instruction
      });
      setLayout(data.layout);
      setPreflight(data.preflight);
      setProvider(data.provider);
      pushHistory(instruction);
      setToast({ tone: "success", message: "Command applied to the document." });
    });
  }

  async function exportPdf() {
    await runAction("export", async () => {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout })
      });
      if (!response.ok) throw new Error(`Export failed with HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFilename(layout.title)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      pushHistory(`Exported PDF: ${layout.title}`);
      setToast({ tone: "success", message: "PDF exported from the live layout." });
    });
  }

  async function runAction(kind: NonNullable<typeof busy>, action: () => Promise<void>) {
    setBusy(kind);
    try {
      await action();
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  function pushHistory(item: string) {
    setHistory((current) => [item, ...current].slice(0, 6));
  }

  function resetSample() {
    setLayout(sampleLayout);
    setPreflight(initialPreflight);
    setProvider("sample");
    pushHistory("Reset to editorial sample");
    setToast({ tone: "info", message: "Sample document restored." });
  }

  return (
    <main className="studio-shell">
      <aside className="tool-panel" aria-label="Document controls">
        <div className="brand-lockup">
          <span className="brand-mark">OD</span>
          <div>
            <h1>OpenDTP Studio</h1>
            <p>Production publishing workspace</p>
          </div>
        </div>

        <section className="control-group">
          <div className="section-heading">
            <label htmlFor="prompt">Layout prompt</label>
            <span>{prompt.length}/8000</span>
          </div>
          <textarea id="prompt" value={prompt} maxLength={8000} onChange={(event) => setPrompt(event.target.value)} />
          <button type="button" onClick={generateLayout} disabled={Boolean(busy) || !prompt.trim()}>
            <Wand2 size={16} /> {busy === "generate" ? "Generating..." : "Generate layout"}
          </button>
        </section>

        <section className="control-group">
          <div className="section-heading">
            <label htmlFor="instruction">Design command</label>
            <button type="button" className="icon-link" onClick={() => setInstruction("Make body copy 2 columns and add bleed")} title="Use a compact command">
              <ClipboardCheck size={15} />
            </button>
          </div>
          <input id="instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} />
          <button type="button" className="secondary" onClick={applyInstruction} disabled={Boolean(busy) || !instruction.trim()}>
            <Sparkles size={16} /> {busy === "edit" ? "Applying..." : "Apply command"}
          </button>
        </section>

        <PreflightPanel report={preflight} />

        <section className="spec-grid" aria-label="Document specs">
          <Spec label="Page" value={layout.pageSize.name} />
          <Spec label="Size" value={`${layout.pageSize.widthMm} x ${layout.pageSize.heightMm} mm`} />
          <Spec label="Bleed" value={`${layout.pageSize.bleedMm} mm`} />
          <Spec label="Provider" value={provider} />
        </section>

        <section className="history">
          <div className="section-heading">
            <span>Command history</span>
            <span>{history.length}</span>
          </div>
          {history.map((item) => (
            <button type="button" className="history-item" key={item} onClick={() => setInstruction(item)}>
              {item}
            </button>
          ))}
        </section>

        <div className="footer-actions">
          <button type="button" className="secondary" onClick={() => setInspectorOpen((value) => !value)}>
            <Code2 size={16} /> {inspectorOpen ? "Hide JSON" : "Inspect JSON"}
          </button>
          <button type="button" className="export" onClick={exportPdf} disabled={Boolean(busy)}>
            <FileDown size={16} /> {busy === "export" ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </aside>

      <section className="workspace" aria-label="Document preview">
        <header className="workspace-bar">
          <div className="title-block">
            <p className="eyebrow">Live page preview</p>
            <h2>{layout.title}</h2>
          </div>
          <div className="workspace-actions">
            <span title="Dynamic column flow">
              <Columns3 size={18} />
            </span>
            <button type="button" title="Reset sample" onClick={resetSample}>
              <RefreshCcw size={16} />
            </button>
            <button type="button" title="Export PDF" onClick={exportPdf}>
              <Download size={16} />
            </button>
          </div>
        </header>
        <div className={`workspace-body ${inspectorOpen ? "with-inspector" : ""}`}>
          <DocumentPreview layout={layout} />
          {inspectorOpen ? (
            <aside className="json-inspector" aria-label="Layout JSON">
              <pre>{JSON.stringify(layout, null, 2)}</pre>
            </aside>
          ) : null}
        </div>
      </section>

      {toast ? <ToastView toast={toast} /> : null}
    </main>
  );
}

function PreflightPanel({ report }: { report: PreflightReport }) {
  const scoreTone = report.score >= 86 ? "good" : report.score >= 64 ? "warn" : "bad";
  return (
    <section className={`preflight ${scoreTone}`}>
      <div className="preflight-title">
        <Gauge size={17} />
        <span>Preflight score</span>
        <strong>{report.score}</strong>
      </div>
      <div className="capacity-meter" aria-label="Text capacity">
        <span style={{ width: `${Math.min(100, (report.textLength / Math.max(1, report.textCapacity)) * 100)}%` }} />
      </div>
      <p className="capacity-copy">
        {report.textLength.toLocaleString()} of {report.textCapacity.toLocaleString()} estimated characters
      </p>
      {report.issues.map((issue) => (
        <p className={`issue ${issue.severity}`} key={`${issue.code}-${issue.frameId ?? issue.message}`}>
          {issue.severity === "error" ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
          {issue.message}
        </p>
      ))}
    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DocumentPreview({ layout }: { layout: LayoutDocument }) {
  const scale = 2.35;
  return (
    <div className="pasteboard">
      {layout.pages.map((page) => (
        <article
          className="page"
          key={page.id}
          style={{
            width: `${layout.pageSize.widthMm * scale}px`,
            height: `${layout.pageSize.heightMm * scale}px`,
            padding: `${layout.pageSize.bleedMm * scale}px`
          }}
        >
          <div className="trim-box">
            {page.frames.map((frame) => (
              <FrameView key={frame.id} frame={frame} layout={layout} scale={scale} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function FrameView({ frame, layout, scale }: { frame: PageFrame; layout: LayoutDocument; scale: number }) {
  const style: React.CSSProperties = {
    left: `${frame.xMm * scale}px`,
    top: `${frame.yMm * scale}px`,
    width: `${frame.widthMm * scale}px`,
    height: `${frame.heightMm * scale}px`
  };

  if (frame.type === "image") {
    return (
      <div className="frame image-frame" style={style} aria-label={frame.alt}>
        <span>{frame.alt}</span>
      </div>
    );
  }

  return <TextFrameView frame={frame} layout={layout} style={style} />;
}

function TextFrameView({ frame, layout, style }: { frame: TextFrame; layout: LayoutDocument; style: React.CSSProperties }) {
  const story = layout.stories.find((candidate) => candidate.id === frame.storyId);
  const content = frame.role === "headline" ? story?.title : story?.content;
  return (
    <div
      className={`frame text-frame ${frame.role}`}
      style={{
        ...style,
        columnCount: frame.columns,
        columnGap: `${frame.columnGapMm}mm`,
        fontFamily: layout.typography.fontFamily
      }}
    >
      {content}
    </div>
  );
}

function ToastView({ toast }: { toast: Toast }) {
  return (
    <div className={`toast ${toast.tone}`} role="status" aria-live="polite">
      {toast.tone === "error" ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
      <span>{toast.message}</span>
    </div>
  );
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = data?.error?.message ?? data?.error?.formErrors?.[0] ?? `Request failed with HTTP ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

function safeFilename(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "opendtp-document";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
