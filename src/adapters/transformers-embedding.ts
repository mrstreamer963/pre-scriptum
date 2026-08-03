import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import type { EmbeddingPort } from '../core/ports';

export class TransformersEmbedding implements EmbeddingPort {
  readonly model: string;
  private pipePromise: Promise<FeatureExtractionPipeline> | null = null;

  constructor(model = 'Xenova/all-MiniLM-L6-v2') {
    this.model = model;
  }

  private getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipePromise) {
      this.pipePromise = pipeline('feature-extraction', this.model) as Promise<FeatureExtractionPipeline>;
    }
    return this.pipePromise;
  }

  async embed(text: string): Promise<number[]> {
    const pipe = await this.getPipeline();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    const data = Array.isArray(output) ? output[0].data : output.data;
    return Array.from(data as Float32Array);
  }

  async isModelReady(): Promise<boolean> {
    try {
      await this.getPipeline();
      return true;
    } catch {
      return false;
    }
  }
}
