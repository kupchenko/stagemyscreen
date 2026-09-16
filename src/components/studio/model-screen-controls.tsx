"use client";
import { RotateCcw } from "lucide-react";
import {
  defaultScreenOrientation,
  type ImportedModel,
} from "@/lib/imported-model";
import type { Device } from "@/lib/studio";
import { automaticScreen } from "@/lib/model-screen";
import { Toggle } from "./controls";

export function ModelScreenControls({
  device,
  model,
  onChange,
}: {
  device: Device;
  model: ImportedModel;
  onChange: (patch: Partial<Device>) => void;
}) {
  const detected = automaticScreen(model);
  const selectAutomatic = () =>
    onChange({
      ...defaultScreenOrientation(model),
      screenSelection: "auto",
      screenSurface: detected?.id || "",
      screenAspect: detected?.aspect || 1,
    });
  return (
    <div className="model-screen-controls">
      <p className="small-muted model-screen-hint" role="status">
        {device.screenSurface
          ? device.screenSelection === "auto"
            ? "Screen selected automatically"
            : "Screen ready"
          : device.screenSelection === "manual"
            ? "Using original materials"
            : "No screen selected. Use advanced settings to choose a surface."}
      </p>
      <details className="model-screen-details">
        <summary>Advanced screen settings</summary>
        <div className="model-screen-options">
          <label className="model-field">
            Screen surface
            <select
              value={
                device.screenSelection === "auto"
                  ? "automatic"
                  : device.screenSurface || ""
              }
              onChange={(e) => {
                if (e.target.value === "automatic") {
                  selectAutomatic();
                  return;
                }
                const surface = model.surfaces.find(
                  (s) => s.id === e.target.value,
                );
                onChange({
                  ...defaultScreenOrientation(model),
                  screenSelection: "manual",
                  screenSurface: e.target.value,
                  screenAspect: surface?.aspect || 1,
                });
              }}
            >
              <option value="automatic">
                {detected
                  ? "Automatic (recommended)"
                  : "Automatic — no screen detected"}
              </option>
              <option value="">Original materials</option>
              {model.surfaces.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.hasUV}>
                  {s.name}
                  {s.hasUV ? "" : " (no UVs)"}
                </option>
              ))}
            </select>
          </label>
          {!device.screenSurface ? (
            <p className="small-muted model-screen-hint">
              Choose the model’s screen mesh to place your screenshot. The rest
              of its materials stay intact.
              {!model.surfaces.some((s) => s.hasUV)
                ? " This model has no UV coordinates. Add UVs to its screen in your 3D editor, then import it again."
                : ""}
            </p>
          ) : (
            <>
              <div className="field-row">
                <label htmlFor="screen-aspect">Screen width / height</label>
                <input
                  id="screen-aspect"
                  type="number"
                  min={0.05}
                  max={20}
                  step={0.01}
                  value={Number((device.screenAspect || 1).toFixed(3))}
                  onChange={(e) => {
                    const value = e.target.valueAsNumber;
                    if (Number.isFinite(value))
                      onChange({
                        screenAspect: Math.min(20, Math.max(0.05, value)),
                      });
                  }}
                />
              </div>
              <div className="field-row">
                <label htmlFor="screen-orientation">Image rotation</label>
                <select
                  id="screen-orientation"
                  value={device.screenRotation || 0}
                  onChange={(e) =>
                    onChange({ screenRotation: Number(e.target.value) })
                  }
                >
                  {[0, 90, 180, 270].map((v) => (
                    <option key={v} value={v}>
                      {v}°
                    </option>
                  ))}
                </select>
              </div>
              <Toggle
                label="Flip image horizontally"
                checked={!!device.screenFlipX}
                onChange={() => onChange({ screenFlipX: !device.screenFlipX })}
              />
              <Toggle
                label="Flip image vertically"
                checked={!!device.screenFlipY}
                onChange={() => onChange({ screenFlipY: !device.screenFlipY })}
              />
              <button
                className="add-device-button"
                onClick={() => onChange(defaultScreenOrientation(model))}
              >
                <RotateCcw size={14} />
                Reset image orientation
              </button>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
