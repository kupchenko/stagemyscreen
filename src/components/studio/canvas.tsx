"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { LoaderCircle, AlertTriangle } from "lucide-react";
import type { DeviceEngine } from "@/lib/device-engine";
import type { Device, Project } from "@/lib/studio";
import type { ExportQuality } from "@/lib/export-quality";
export interface CanvasHandle {
  fitZoom: () => number;
  export: (
    width: number,
    transparent: boolean,
    quality: ExportQuality,
    onProgress: (percent: number) => void,
  ) => Promise<Blob>;
}
interface Props {
  project: Project;
  selectedId: string | null;
  mode: "move" | "rotate";
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Device>, group?: string) => void;
  onGestureEnd: () => void;
  onUpload: (files: File[], id?: string) => void;
}
export const SceneCanvas = forwardRef<CanvasHandle, Props>(
  function SceneCanvas(props, ref) {
    const host = useRef<HTMLDivElement>(null),
      engine = useRef<DeviceEngine | null>(null),
      latest = useRef(props);
    const [modelStatus, setModelStatus] = useState("");
    const [status, setStatus] = useState("loading");
    const drag = useRef<{
      id: string;
      x: number;
      y: number;
      device: Device;
      mode: "move" | "rotate";
    } | null>(null);
    useEffect(() => {
      latest.current = props;
      engine.current?.update(props.project);
    }, [props]);
    useEffect(() => {
      let active = true;
      let observer: ResizeObserver | undefined;
      import("@/lib/device-engine")
        .then(({ DeviceEngine }) => {
          if (!active || !host.current) return;
          try {
            const instance = new DeviceEngine(host.current, (message) => {
              if (active) setModelStatus(message);
            });
            engine.current = instance;
            observer = new ResizeObserver(([e]) =>
              instance.resize(e.contentRect.width, e.contentRect.height),
            );
            observer.observe(host.current);
            instance.update(latest.current.project);
            setStatus("ready");
          } catch {
            setStatus("error");
          }
        })
        .catch(() => setStatus("error"));
      return () => {
        active = false;
        observer?.disconnect();
        engine.current?.dispose();
        engine.current = null;
      };
    }, []);
    useImperativeHandle(
      ref,
      () => ({
        fitZoom: () => engine.current?.fitZoom() || 1,
        export: async (w, t, quality, onProgress) => {
          if (!engine.current)
            throw new Error("The 3D scene is not ready yet.");
          return engine.current.export(w, t, quality, onProgress);
        },
      }),
      [],
    );
    return (
      <div
        ref={host}
        className={`scene-canvas cursor-${props.mode}`}
        role="application"
        aria-label="Device composition. Drag to move or rotate the selected device."
        onPointerDown={(e) => {
          if (e.button !== 0 || !engine.current) return;
          const id = engine.current.pick(e.clientX, e.clientY);
          props.onSelect(id || null);
          const device = props.project.devices.find((d) => d.id === id);
          if (device && id) {
            drag.current = {
              id,
              x: e.clientX,
              y: e.clientY,
              device,
              mode: e.altKey ? "rotate" : props.mode,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start || !engine.current) return;
          const dx = e.clientX - start.x,
            dy = e.clientY - start.y;
          const clamp = (n: number, min: number, max: number) =>
            Math.max(min, Math.min(max, n));
          if (start.mode === "rotate")
            props.onChange(
              start.id,
              {
                ry: clamp(start.device.ry + dx * 0.4, -180, 180),
                rx: clamp(start.device.rx + dy * 0.4, -180, 180),
              },
              "drag",
            );
          else {
            const delta = engine.current.dragDelta(dx, dy, start.device.z);
            props.onChange(
              start.id,
              {
                x: clamp(start.device.x + delta.x, -20, 20),
                y: clamp(start.device.y + delta.y, -20, 20),
              },
              "drag",
            );
          }
        }}
        onPointerUp={() => {
          drag.current = null;
          props.onGestureEnd();
        }}
        onPointerCancel={() => {
          drag.current = null;
          props.onGestureEnd();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const id = engine.current?.pick(e.clientX, e.clientY);
          props.onUpload(
            Array.from(e.dataTransfer.files),
            id || props.selectedId || undefined,
          );
        }}
      >
        {status === "ready" && modelStatus ? (
          <div className="model-canvas-status" role="status">
            {modelStatus}
          </div>
        ) : null}
        {status === "loading" ? (
          <div className="canvas-message">
            <LoaderCircle className="animate-spin" size={22} />
            <span>Setting up your studio…</span>
          </div>
        ) : status === "error" ? (
          <div className="canvas-message">
            <AlertTriangle size={26} />
            <strong>3D rendering isn’t available</strong>
            <span>
              Enable hardware acceleration in your browser, then reload.
            </span>
          </div>
        ) : null}
      </div>
    );
  },
);
