import PDFDocument from "pdfkit";
import type { LayoutDocument, PageFrame, TextFrame } from "@opendtp/dtp-core";
import { storyForFrame } from "@opendtp/dtp-core";

const PT_PER_MM = 2.8346456693;

export async function renderPdf(layout: LayoutDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      autoFirstPage: false,
      info: {
        Title: layout.title,
        Creator: "OpenDTP Studio",
        Producer: "OpenDTP Studio PDFKit renderer"
      },
      bufferPages: true
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (const page of layout.pages) {
      doc.addPage({
        size: [mm(layout.pageSize.widthMm), mm(layout.pageSize.heightMm)],
        margin: 0
      });

      drawPageFurniture(doc, layout);
      for (const frame of page.frames) drawFrame(doc, layout, frame);
      doc.fontSize(7).fillColor("#6e665a").text(`${page.number}`, mm(layout.pageSize.widthMm - 18), mm(layout.pageSize.heightMm - 12));
    }

    doc.end();
  });
}

function drawPageFurniture(doc: PDFKit.PDFDocument, layout: LayoutDocument) {
  const bleed = layout.pageSize.bleedMm;
  const width = layout.pageSize.widthMm;
  const height = layout.pageSize.heightMm;
  doc.save();
  doc.rect(0, 0, mm(width), mm(height)).fill("#fbfaf6");
  if (bleed > 0) {
    doc.lineWidth(0.5).dash(2, { space: 2 }).strokeColor("#b65a43");
    doc.rect(mm(bleed), mm(bleed), mm(width - bleed * 2), mm(height - bleed * 2)).stroke();
    doc.undash();
  }
  doc.restore();
}

function drawFrame(doc: PDFKit.PDFDocument, layout: LayoutDocument, frame: PageFrame) {
  if (frame.type === "image") {
    doc.save();
    doc.roundedRect(mm(frame.xMm), mm(frame.yMm), mm(frame.widthMm), mm(frame.heightMm), 2).fill("#cdbb95");
    doc.fillColor("#2c2720").fontSize(8).text(frame.alt, mm(frame.xMm + 3), mm(frame.yMm + frame.heightMm - 8), {
      width: mm(frame.widthMm - 6),
      height: mm(6),
      ellipsis: true
    });
    doc.restore();
    return;
  }

  drawTextFrame(doc, layout, frame);
}

function drawTextFrame(doc: PDFKit.PDFDocument, layout: LayoutDocument, frame: TextFrame) {
  const content = frame.role === "headline"
    ? layout.stories.find((story) => story.id === frame.storyId)?.title ?? ""
    : storyForFrame(layout, frame);

  const fontSize = frame.role === "headline" ? Math.max(18, layout.typography.baseSizePt * 2.5) : layout.typography.baseSizePt;
  const lineGap = fontSize * (layout.typography.leading - 1);
  const columnGap = mm(frame.columnGapMm);
  const totalGap = columnGap * (frame.columns - 1);
  const columnWidth = (mm(frame.widthMm) - totalGap) / frame.columns;
  const columnHeight = mm(frame.heightMm);
  const chunks = splitTextForColumns(content, frame.columns);

  doc.save();
  doc.fillColor("#25221d").font("Helvetica").fontSize(fontSize);
  chunks.forEach((chunk, index) => {
    doc.text(chunk, mm(frame.xMm) + index * (columnWidth + columnGap), mm(frame.yMm), {
      width: columnWidth,
      height: columnHeight,
      lineGap,
      ellipsis: frame.role === "headline"
    });
  });
  doc.restore();
}

function splitTextForColumns(text: string, columns: number): string[] {
  if (columns <= 1) return [text];
  const words = text.split(/\s+/);
  const perColumn = Math.ceil(words.length / columns);
  return Array.from({ length: columns }, (_, index) => words.slice(index * perColumn, (index + 1) * perColumn).join(" "));
}

function mm(value: number): number {
  return value * PT_PER_MM;
}
