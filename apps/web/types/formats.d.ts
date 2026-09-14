declare module "utif2" {
  export interface IFD {
    width: number;
    height: number;
    data?: any;
    [key: string]: any;
  }
  export function decode(buffer: ArrayBuffer): IFD[];
  export function decodeImage(buffer: ArrayBuffer, ifd: IFD): void;
  export function toRGBA8(ifd: IFD): Uint8Array;
}

declare module "heic2any" {
  export interface HeicOptions {
    blob: Blob;
    toType?: string;
    quality?: number;
    multiple?: boolean;
  }
  export default function heic2any(options: HeicOptions): Promise<Blob | Blob[]>;
}

declare module "gifenc" {
  export interface QuantizeOptions {
    format?: string;
    maxColors?: number;
    [key: string]: any;
  }
  export interface WriteFrameOptions {
    palette: number[][];
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    [key: string]: any;
  }
  export interface GIFEncoderInstance {
    writeFrame(
      index: number[] | Uint8Array,
      width: number,
      height: number,
      options?: WriteFrameOptions
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  export function GIFEncoder(options?: any): GIFEncoderInstance;
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions
  ): number[][];
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    format?: string
  ): Uint8Array;
}
