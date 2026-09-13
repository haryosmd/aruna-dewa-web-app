export interface PublishedSnapshot<TDocument> {
  document: TDocument;
  revision: number;
  publishedAt: Date;
}

export function publishDraft<TDocument>(draft: TDocument, revision: number, publishedAt = new Date()): PublishedSnapshot<TDocument> {
  return { document: structuredClone(draft), revision, publishedAt };
}
