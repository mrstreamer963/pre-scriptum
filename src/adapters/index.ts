import { createGraphApi, type GraphApi } from '../core/api';
import type { StoragePort } from '../core/ports';
import { CosineSearch } from './cosine-search';
import { IndexedDBStorage } from './idb-storage';
import { TransformersEmbedding } from './transformers-embedding';

export interface BrowserApi {
  api: GraphApi;
  storage: StoragePort;
  embedding: TransformersEmbedding;
  search: CosineSearch;
}

export function createBrowserApi(name = 'pre-scriptum'): BrowserApi {
  const storage = new IndexedDBStorage(name);
  const embedding = new TransformersEmbedding();
  const search = new CosineSearch();
  const api = createGraphApi({ storage, embedding, search });
  return { api, storage, embedding, search };
}
