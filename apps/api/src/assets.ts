import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export type StoredAsset = {
  id: string;
  kind: "image";
  filename: string;
  mimeType: string;
  storageKey: string;
  createdAt: string;
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    density?: number;
    hasAlpha?: boolean;
  };
};

export class AssetStore {
  private readonly directory: string;
  private readonly blobDirectory: string;

  constructor(dataDir: string) {
    this.directory = path.join(dataDir, "assets");
    this.blobDirectory = path.join(this.directory, "blobs");
  }

  async list(): Promise<StoredAsset[]> {
    await this.ensureDirectory();
    const names = await readdir(this.directory);
    const assets = await Promise.all(
      names
        .filter((name) => name.endsWith(".json"))
        .map(async (name) => JSON.parse(await readFile(path.join(this.directory, name), "utf8")) as StoredAsset)
    );
    return assets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createImage(input: { filename: string; mimeType: string; bytes: Buffer }): Promise<StoredAsset> {
    await this.ensureDirectory();
    const id = `asset-${randomUUID()}`;
    const extension = extensionFor(input.filename, input.mimeType);
    const storageKey = `${id}${extension}`;
    await writeFile(path.join(this.blobDirectory, storageKey), input.bytes);
    const metadata = await sharp(input.bytes).metadata();
    const asset: StoredAsset = {
      id,
      kind: "image",
      filename: input.filename,
      mimeType: input.mimeType,
      storageKey,
      createdAt: new Date().toISOString(),
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha
      }
    };
    await writeFile(path.join(this.directory, `${id}.json`), JSON.stringify(asset, null, 2));
    return asset;
  }

  async readBlob(storageKey: string): Promise<Buffer> {
    return readFile(path.join(this.blobDirectory, storageKey.replace(/[^a-zA-Z0-9._-]/g, "")));
  }

  private async ensureDirectory(): Promise<void> {
    await mkdir(this.blobDirectory, { recursive: true });
  }
}

function extensionFor(filename: string, mimeType: string): string {
  const existing = path.extname(filename);
  if (existing) return existing;
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}
