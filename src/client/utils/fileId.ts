declare const fileIdBrand: unique symbol;

export type FileId = string & { readonly [fileIdBrand]: "FileId" };

function asFileId(value: string): FileId {
  return value as FileId;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createStableFileId(file: File, label: string): Promise<FileId> {
  const fingerprint = [
    label,
    file.name,
    file.size.toString(),
    file.lastModified.toString(),
    file.type,
  ].join("::");

  if (!globalThis.crypto?.subtle) {
    return asFileId(fingerprint);
  }

  const data = new TextEncoder().encode(fingerprint);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return asFileId(toHex(digest));
}

export { asFileId, createStableFileId };
