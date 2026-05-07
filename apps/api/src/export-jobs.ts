import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ExportJob = {
  id: string;
  status: "completed" | "failed";
  documentTitle: string;
  artifactKey?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
};

export class ExportJobStore {
  private readonly directory: string;
  private readonly artifactDirectory: string;

  constructor(dataDir: string) {
    this.directory = path.join(dataDir, "export-jobs");
    this.artifactDirectory = path.join(this.directory, "artifacts");
  }

  async createCompleted(documentTitle: string, pdf: Buffer): Promise<ExportJob> {
    await this.ensureDirectory();
    const id = `export-${randomUUID()}`;
    const artifactKey = `${id}.pdf`;
    await writeFile(path.join(this.artifactDirectory, artifactKey), pdf);
    const now = new Date().toISOString();
    const job: ExportJob = {
      id,
      status: "completed",
      documentTitle,
      artifactKey,
      createdAt: now,
      completedAt: now
    };
    await writeFile(path.join(this.directory, `${id}.json`), JSON.stringify(job, null, 2));
    return job;
  }

  async read(id: string): Promise<ExportJob> {
    return JSON.parse(await readFile(path.join(this.directory, `${safe(id)}.json`), "utf8")) as ExportJob;
  }

  async readArtifact(artifactKey: string): Promise<Buffer> {
    return readFile(path.join(this.artifactDirectory, safe(artifactKey)));
  }

  private async ensureDirectory(): Promise<void> {
    await mkdir(this.artifactDirectory, { recursive: true });
  }
}

function safe(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "");
}
