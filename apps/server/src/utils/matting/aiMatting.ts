import type { PreTrainedModel, Processor, RawImage as RawImageType } from "@huggingface/transformers";
import type { DecodedImage } from "./pngCodec.js";
import type { MattingOptions } from "./proceduralMatting.js";

export type AiPipelineBundle = {
  model: PreTrainedModel;
  processor: Processor;
  RawImage: typeof RawImageType;
};

let aiPipelinePromise: Promise<AiPipelineBundle> | null = null;

/**
 * Returns a cached singleton of the RMBG-1.4 AI background removal pipeline.
 */
export async function getAiMattingPipeline(): Promise<AiPipelineBundle> {
  if (!aiPipelinePromise) {
    aiPipelinePromise = (async () => {
      const { AutoModel, AutoProcessor, RawImage } = await import("@huggingface/transformers");
      const model = await AutoModel.from_pretrained("briaai/RMBG-1.4");
      const processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4");
      return { model, processor, RawImage };
    })();
  }
  return await aiPipelinePromise;
}

/**
 * Removes background using Deep Learning (briaai/RMBG-1.4 via ONNX Runtime in Node.js).
 * State-of-the-art accuracy for fur strands, fine details, transparent objects, and floor contact shadows.
 */
export async function removeImageBackgroundAi(image: DecodedImage, options: MattingOptions = {}): Promise<DecodedImage> {
  const { width, height, data } = image;
  const { model, processor, RawImage } = await getAiMattingPipeline();

  // Convert RGBA to RGB 3-channel buffer for model input, compositing against light neutral gray instead of pitch black
  const rgbData = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3] / 255;
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    rgbData[i * 3] = Math.round(r * a + 240 * (1 - a));
    rgbData[i * 3 + 1] = Math.round(g * a + 240 * (1 - a));
    rgbData[i * 3 + 2] = Math.round(b * a + 240 * (1 - a));
  }

  const inputImage = new RawImage(rgbData, width, height, 3);
  const { pixel_values } = (await processor(inputImage)) as { pixel_values: unknown };
  const { output } = (await model({ input: pixel_values })) as unknown as { output: { data: Float32Array } };

  const maskData: Float32Array = output.data;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < maskData.length; i++) {
    const val = maskData[i];
    if (val < min) min = val;
    if (val > max) max = val;
  }

  const range = max - min || 1;
  const maskBytes = new Uint8Array(1024 * 1024);
  for (let i = 0; i < maskData.length; i++) {
    const norm = (maskData[i] - min) / range;
    maskBytes[i] = Math.round(norm * 255);
  }

  const maskRaw = new RawImage(maskBytes, 1024, 1024, 1);
  const resizedMask = await maskRaw.resize(width, height);

  const alphaCutoff = options.alphaCutoff ?? 5;
  const outRgba = new Uint8Array(data.length);
  outRgba.set(data);

  for (let i = 0; i < width * height; i++) {
    const a = resizedMask.data[i];
    outRgba[i * 4 + 3] = a < alphaCutoff ? 0 : a;
  }

  return { width, height, data: outRgba };
}
