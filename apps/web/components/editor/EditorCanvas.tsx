"use client";

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import Konva from "konva";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Text as KonvaText,
  Rect as KonvaRect,
  Transformer,
} from "react-konva";

export interface EditorItem {
  id: string;
  type: "text" | "sticker";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string; // 'normal' | 'bold' | 'italic' | 'bold italic'
  fill: string;
  stroke: string;
  strokeWidth: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface FilterState {
  grayscale: boolean;
  sepia: boolean;
  blur: number; // 0..40
  brightness: number; // -0.5..0.5
}

export interface FramePreset {
  id: string;
  name: string;
  stroke: string;
  strokeWidth: number;
}

export interface EditorCanvasHandle {
  exportBlob: () => Promise<Blob>;
}

interface EditorCanvasProps {
  baseImage: HTMLImageElement | null;
  stageWidth: number;
  stageHeight: number;
  items: EditorItem[];
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<EditorItem>) => void;
  filters: FilterState;
  activeFrame: FramePreset | null;
}

const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(
  (
    {
      baseImage,
      stageWidth,
      stageHeight,
      items,
      selectedId,
      onSelectId,
      onUpdateItem,
      filters,
      activeFrame,
    },
    ref
  ) => {
    const stageRef = useRef<Konva.Stage | null>(null);
    const imageRef = useRef<Konva.Image | null>(null);
    const trRef = useRef<Konva.Transformer | null>(null);
    const itemRefs = useRef<Map<string, Konva.Text>>(new Map());

    // Update transformer selection
    useEffect(() => {
      if (!trRef.current || !stageRef.current) return;

      if (selectedId) {
        const selectedNode = itemRefs.current.get(selectedId);
        if (selectedNode) {
          trRef.current.nodes([selectedNode]);
          trRef.current.getLayer()?.batchDraw();
          return;
        }
      }
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }, [selectedId, items]);

    // Apply Konva filters to base image
    useEffect(() => {
      if (!imageRef.current) return;

      const activeFilters = [];
      if (filters.grayscale) activeFilters.push(Konva.Filters.Grayscale);
      if (filters.sepia) activeFilters.push(Konva.Filters.Sepia);
      if (filters.blur > 0) activeFilters.push(Konva.Filters.Blur);
      if (filters.brightness !== 0) activeFilters.push(Konva.Filters.Brighten);

      imageRef.current.filters(activeFilters);
      imageRef.current.blurRadius(filters.blur);
      imageRef.current.brightness(filters.brightness);

      try {
        imageRef.current.cache();
      } catch {
        // Cache could fail if image dimensions are 0
      }
      imageRef.current.getLayer()?.batchDraw();
    }, [filters, baseImage, stageWidth, stageHeight]);

    // Expose export to Blob
    useImperativeHandle(ref, () => ({
      exportBlob: () => {
        return new Promise<Blob>((resolve, reject) => {
          if (!stageRef.current) {
            reject(new Error("Stage canvas tidak siap"));
            return;
          }

          // Deselect transformer sebelum export agar bounding box transformer tidak ikut terunduh
          if (trRef.current) {
            trRef.current.nodes([]);
            trRef.current.getLayer()?.batchDraw();
          }

          try {
            const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
            fetch(dataUrl)
              .then((res) => res.blob())
              .then(resolve)
              .catch(reject);
          } catch (err) {
            reject(err);
          }
        });
      },
    }));

    return (
      <div className="relative flex items-center justify-center overflow-auto rounded-xl bg-slate-900/10 p-4 min-h-[460px] max-h-[640px]">
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          onMouseDown={(e) => {
            // Deselect jika mengklik area kosong atau background image
            if (e.target === e.target.getStage() || e.target === imageRef.current) {
              onSelectId(null);
            }
          }}
          className="shadow-xl rounded-lg overflow-hidden border border-slate-300 bg-white"
        >
          <Layer>
            {/* Layer 1: Base Image */}
            {baseImage && (
              <KonvaImage
                ref={imageRef}
                image={baseImage}
                width={stageWidth}
                height={stageHeight}
                listening={true}
              />
            )}

            {/* Layer 2: Teks dan Stiker */}
            {items.map((item) => (
              <KonvaText
                key={item.id}
                ref={(node) => {
                  if (node) {
                    itemRefs.current.set(item.id, node);
                  } else {
                    itemRefs.current.delete(item.id);
                  }
                }}
                id={item.id}
                text={item.text}
                x={item.x}
                y={item.y}
                fontSize={item.fontSize}
                fontFamily={item.fontFamily}
                fontStyle={item.fontStyle}
                fill={item.fill}
                stroke={item.strokeWidth > 0 ? item.stroke : undefined}
                strokeWidth={item.strokeWidth}
                rotation={item.rotation}
                scaleX={item.scaleX}
                scaleY={item.scaleY}
                draggable
                onClick={() => onSelectId(item.id)}
                onTap={() => onSelectId(item.id)}
                onDragEnd={(e) => {
                  onUpdateItem(item.id, {
                    x: e.target.x(),
                    y: e.target.y(),
                  });
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  onUpdateItem(item.id, {
                    x: node.x(),
                    y: node.y(),
                    scaleX: node.scaleX(),
                    scaleY: node.scaleY(),
                    rotation: node.rotation(),
                  });
                }}
              />
            ))}

            {/* Layer 3: Bingkai (Frame Preset) */}
            {activeFrame && activeFrame.strokeWidth > 0 && (
              <KonvaRect
                x={activeFrame.strokeWidth / 2}
                y={activeFrame.strokeWidth / 2}
                width={Math.max(1, stageWidth - activeFrame.strokeWidth)}
                height={Math.max(1, stageHeight - activeFrame.strokeWidth)}
                stroke={activeFrame.stroke}
                strokeWidth={activeFrame.strokeWidth}
                listening={false}
              />
            )}

            {/* Layer 4: Transformer Interaktif */}
            <Transformer
              ref={trRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Batas ukuran minimal saat resize
                if (newBox.width < 10 || newBox.height < 10) {
                  return oldBox;
                }
                return newBox;
              }}
              anchorCornerRadius={4}
              anchorSize={9}
              anchorStroke="#4f46e5"
              anchorFill="#ffffff"
              borderStroke="#4f46e5"
              borderDash={[4, 4]}
            />
          </Layer>
        </Stage>
      </div>
    );
  }
);

EditorCanvas.displayName = "EditorCanvas";

export default EditorCanvas;
