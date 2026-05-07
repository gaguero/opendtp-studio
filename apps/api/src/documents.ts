import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { layoutDocumentSchema, runPreflight, type LayoutDocument } from "@opendtp/dtp-core";

export type StoredDocument = {
  id: string;
  title: string;
  layout: LayoutDocument;
  createdAt: string;
  updatedAt: string;
};

export type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: string;
  pageCount: number;
  preflightScore: number;
};

export class DocumentStore {
  private readonly directory: string;

  constructor(dataDir: string) {
    this.directory = path.join(dataDir, "documents");
  }

  async list(): Promise<DocumentSummary[]> {
    await this.ensureDirectory();
    const names = await readdir(this.directory);
    const documents = await Promise.all(
      names
        .filter((name) => name.endsWith(".json"))
        .map(async (name) => this.read(path.basename(name, ".json")))
    );

    return documents
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((document) => ({
        id: document.id,
        title: document.title,
        updatedAt: document.updatedAt,
        pageCount: document.layout.pages.length,
        preflightScore: runPreflight(document.layout).score
      }));
  }

  async create(layout: LayoutDocument): Promise<StoredDocument> {
    const now = new Date().toISOString();
    const parsed = layoutDocumentSchema.parse({
      ...layout,
      id: layout.id || `doc-${randomUUID()}`
    });
    const document: StoredDocument = {
      id: parsed.id,
      title: parsed.title,
      layout: parsed,
      createdAt: now,
      updatedAt: now
    };
    await this.write(document);
    return document;
  }

  async read(id: string): Promise<StoredDocument> {
    const safe = safeId(id);
    const raw = await readFile(path.join(this.directory, `${safe}.json`), "utf8");
    const parsed = JSON.parse(raw) as StoredDocument;
    return {
      ...parsed,
      layout: layoutDocumentSchema.parse(parsed.layout)
    };
  }

  async update(id: string, layout: LayoutDocument): Promise<StoredDocument> {
    const current = await this.read(id);
    const parsed = layoutDocumentSchema.parse({
      ...layout,
      id: current.id
    });
    const next: StoredDocument = {
      ...current,
      title: parsed.title,
      layout: parsed,
      updatedAt: new Date().toISOString()
    };
    await this.write(next);
    return next;
  }

  async delete(id: string): Promise<void> {
    await rm(path.join(this.directory, `${safeId(id)}.json`), { force: true });
  }

  private async write(document: StoredDocument): Promise<void> {
    await this.ensureDirectory();
    await writeFile(path.join(this.directory, `${safeId(document.id)}.json`), JSON.stringify(document, null, 2));
  }

  private async ensureDirectory(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
  }
}

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "");
}
