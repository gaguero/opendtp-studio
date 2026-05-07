import React from "react";
import ReactDOM from "react-dom/client";
import { Rnd } from "react-rnd";
import {
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Columns3,
  Download,
  FileDown,
  Gauge,
  ImagePlus,
  Library,
  MousePointer2,
  Save,
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

type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: string;
  pageCount: number;
  preflightScore: number;
};

type AssetSummary = {
  id: string;
  filename: string;
  storageKey: string;
  metadata: {
    width?: number;
    height?: number;
    format?: string;
  };
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
  const [documents, setDocuments] = React.useState<DocumentSummary[]>([]);
  const [assets, setAssets] = React.useState<AssetSummary[]>([]);
  const [currentDocumentId, setCurrentDocumentId] = React.useState<string | null>(null);
  const [selectedFrameId, setSelectedFrameId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  React.useEffect(() => {
    void refreshDocuments();
    void refreshAssets();
  }, []);

  async function generateLayout() {
    await runAction("generate", async () => {
      const data = await postJson<{ layout: LayoutDocument; provider: string; preflight: PreflightReport }>("/api/layouts/generate", { prompt });
      setLayout(data.layout);
      setPreflight(data.preflight);
      setProvider(data.provider);
      setCurrentDocumentId(null);
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
      const job = await postJson<{ job: { id: string; status: string }; downloadUrl: string }>("/api/export/jobs", { layout });
      const response = await fetch(job.downloadUrl);
      if (!response.ok) throw new Error(`Export download failed with HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFilename(layout.title)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      pushHistory(`Exported PDF job: ${job.job.id}`);
      setToast({ tone: "success", message: "PDF export job completed." });
    });
  }

  async function refreshDocuments() {
    try {
      const data = await getJson<{ documents: DocumentSummary[] }>("/api/documents");
      setDocuments(data.documents);
    } catch {
      setDocuments([]);
    }
  }

  async function refreshAssets() {
    try {
      const data = await getJson<{ assets: AssetSummary[] }>("/api/assets");
      setAssets(data.assets);
    } catch {
      setAssets([]);
    }
  }

  async function uploadImage(file: File | null) {
    if (!file) return;
    await runAction("edit", async () => {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/assets/images", { method: "POST", body: form });
      const data = (await response.json()) as { asset: AssetSummary; url: string; error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? `Upload failed with HTTP ${response.status}`);
      setAssets((current) => [data.asset, ...current]);
      if (selectedFrameId) assignImageToFrame(selectedFrameId, data.url);
      setToast({ tone: "success", message: selectedFrameId ? "Image uploaded and assigned." : "Image uploaded to library." });
    });
  }

  function assignImageToFrame(frameId: string, src: string) {
    setLayout((current) => ({
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        frames: page.frames.map((frame) => (frame.id === frameId && frame.type === "image" ? { ...frame, src } : frame))
      }))
    }));
  }

  async function saveDocument() {
    await runAction("edit", async () => {
      const endpoint = currentDocumentId ? `/api/documents/${currentDocumentId}` : "/api/documents";
      const method = currentDocumentId ? "PUT" : "POST";
      const data = await sendJson<{ document: { id: string; layout: LayoutDocument }; preflight: PreflightReport }>(endpoint, method, { layout });
      setLayout(data.document.layout);
      setPreflight(data.preflight);
      setCurrentDocumentId(data.document.id);
      await refreshDocuments();
      pushHistory(`Saved: ${data.document.layout.title}`);
      setToast({ tone: "success", message: "Document saved." });
    });
  }

  async function loadDocument(id: string) {
    await runAction("edit", async () => {
      const data = await getJson<{ document: { id: string; layout: LayoutDocument }; preflight: PreflightReport }>(`/api/documents/${id}`);
      setLayout(data.document.layout);
      setPreflight(data.preflight);
      setCurrentDocumentId(data.document.id);
      setSelectedFrameId(null);
      pushHistory(`Loaded: ${data.document.layout.title}`);
      setToast({ tone: "success", message: "Document loaded." });
    });
  }

  function newDocument() {
    const next = {
      ...sampleLayout,
      id: `doc-${Date.now().toString(36)}`,
      title: "Untitled OpenDTP Document"
    };
    setLayout(next);
    setPreflight(initialPreflight);
    setCurrentDocumentId(null);
    setSelectedFrameId(null);
    pushHistory("Created untitled document");
    setToast({ tone: "info", message: "New document ready." });
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

  function updateFrame(frameId: string, patch: Partial<PageFrame>) {
    setLayout((current) => ({
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        frames: page.frames.map((frame) => (frame.id === frameId ? ({ ...frame, ...patch } as PageFrame) : frame))
      }))
    }));
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

        <section className="control-group document-actions" aria-label="Document persistence">
          <div className="section-heading">
            <span>Documents</span>
            <span>{currentDocumentId ? "saved file" : "unsaved"}</span>
          </div>
          <div className="action-row">
            <button type="button" className="secondary" onClick={newDocument}>
              <Library size={16} /> New
            </button>
            <button type="button" onClick={saveDocument} disabled={Boolean(busy)}>
              <Save size={16} /> Save
            </button>
          </div>
          <select value={currentDocumentId ?? ""} onChange={(event) => event.target.value && void loadDocument(event.target.value)} aria-label="Saved documents">
            <option value="">Load saved document</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.title} · {document.preflightScore}
              </option>
            ))}
          </select>
        </section>

        <section className="control-group asset-panel" aria-label="Asset library">
          <div className="section-heading">
            <span>Assets</span>
            <span>{assets.length}</span>
          </div>
          <label className="upload-button">
            <ImagePlus size={16} /> Upload image
            <input type="file" accept="image/*" onChange={(event) => void uploadImage(event.target.files?.[0] ?? null)} />
          </label>
          {assets.slice(0, 4).map((asset) => (
            <button
              type="button"
              className="asset-item"
              key={asset.id}
              onClick={() => selectedFrameId && assignImageToFrame(selectedFrameId, `/api/assets/${asset.storageKey}`)}
              title={selectedFrameId ? "Assign to selected image frame" : "Select an image frame first"}
            >
              {asset.filename}
              <span>
                {asset.metadata.width ?? "?"}x{asset.metadata.height ?? "?"}
              </span>
            </button>
          ))}
        </section>

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
            <span title="Drag and resize frames">
              <MousePointer2 size={18} />
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
          <DocumentPreview layout={layout} selectedFrameId={selectedFrameId} onSelectFrame={setSelectedFrameId} onUpdateFrame={updateFrame} />
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

function DocumentPreview({
  layout,
  selectedFrameId,
  onSelectFrame,
  onUpdateFrame
}: {
  layout: LayoutDocument;
  selectedFrameId: string | null;
  onSelectFrame: (frameId: string) => void;
  onUpdateFrame: (frameId: string, patch: Partial<PageFrame>) => void;
}) {
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
              <FrameView
                key={frame.id}
                frame={frame}
                layout={layout}
                scale={scale}
                selected={selectedFrameId === frame.id}
                onSelect={() => onSelectFrame(frame.id)}
                onUpdate={(patch) => onUpdateFrame(frame.id, patch)}
              />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function FrameView({
  frame,
  layout,
  scale,
  selected,
  onSelect,
  onUpdate
}: {
  frame: PageFrame;
  layout: LayoutDocument;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<PageFrame>) => void;
}) {
  return (
    <Rnd
      className={`frame-rnd ${selected ? "selected" : ""}`}
      bounds="parent"
      size={{ width: frame.widthMm * scale, height: frame.heightMm * scale }}
      position={{ x: frame.xMm * scale, y: frame.yMm * scale }}
      onMouseDown={onSelect}
      onDragStop={(_event, data) => onUpdate({ xMm: roundMm(data.x / scale), yMm: roundMm(data.y / scale) })}
      onResizeStop={(_event, _direction, ref, _delta, position) =>
        onUpdate({
          xMm: roundMm(position.x / scale),
          yMm: roundMm(position.y / scale),
          widthMm: roundMm(ref.offsetWidth / scale),
          heightMm: roundMm(ref.offsetHeight / scale)
        })
      }
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true
      }}
    >
      {frame.type === "image" ? (
        <div className="frame image-frame" aria-label={frame.alt} style={frame.src ? { backgroundImage: `url(${frame.src})` } : undefined}>
          <span>{frame.alt}</span>
        </div>
      ) : (
        <TextFrameView frame={frame} layout={layout} />
      )}
    </Rnd>
  );
}

function TextFrameView({ frame, layout }: { frame: TextFrame; layout: LayoutDocument }) {
  const story = layout.stories.find((candidate) => candidate.id === frame.storyId);
  const content = frame.role === "headline" ? story?.title : story?.content;
  return (
    <div
      className={`frame text-frame ${frame.role}`}
      style={{
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
  return sendJson<T>(url, "POST", payload);
}

async function sendJson<T>(url: string, method: "POST" | "PUT", payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
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

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data?.error?.message ?? `Request failed with HTTP ${response.status}`);
  return data as T;
}

function roundMm(value: number): number {
  return Math.max(0, Math.round(value * 10) / 10);
}

function safeFilename(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "opendtp-document";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
