"use client";

import { Check, RotateCcw, Sparkles } from "lucide-react";
import {
  DEFAULT_LIGHTING,
  LIGHTING_PRESETS,
  LIGHTING_LIMITS,
  lightingPreset,
  type LightingMode,
  type SceneLighting,
} from "@/lib/scene-lighting";
import { RangeControl, Toggle } from "./controls";

export function LightingControls({
  value,
  shadows,
  onChange,
  onEnd,
  onToggleShadows,
}: {
  value: SceneLighting;
  shadows: boolean;
  onChange: (patch: Partial<SceneLighting>, group?: string) => void;
  onEnd: () => void;
  onToggleShadows: () => void;
}) {
  const preset = lightingPreset(value.mode);
  const control = (
    field: keyof typeof LIGHTING_LIMITS,
    label: string,
    suffix = "%",
  ) => (
    <RangeControl
      label={label}
      value={value[field]}
      min={LIGHTING_LIMITS[field][0]}
      max={LIGHTING_LIMITS[field][1]}
      suffix={suffix}
      onChange={(n) => onChange({ [field]: n }, `lighting-${field}`)}
      onEnd={onEnd}
    />
  );
  return (
    <div className="panel-section scene-lighting">
      <div className="section-heading">
        <h2>
          Lighting <span className="lighting-count">12 modes</span>
        </h2>
        <button
          className="icon-button"
          aria-label="Reset lighting"
          title="Reset lighting and shadow adjustments"
          onClick={() => onChange({ ...DEFAULT_LIGHTING })}
        >
          <RotateCcw size={14} />
        </button>
      </div>
      <div
        className="lighting-swatches"
        role="group"
        aria-label="Lighting presets"
      >
        {LIGHTING_PRESETS.map((p) => (
          <button
            key={p.id}
            className={`lighting-swatch ${value.mode === p.id ? "active" : ""}`}
            title={p.name}
            aria-label={`Use ${p.name.toLowerCase()} lighting`}
            aria-pressed={value.mode === p.id}
            onClick={() => onChange({ mode: p.id })}
          >
            <span
              style={{
                background: `radial-gradient(circle at 28% 22%, ${p.swatch[0]}, ${p.swatch[1]} 52%, ${p.swatch[2]} 90%)`,
              }}
            >
              {value.mode === p.id && <Check size={13} />}
            </span>
          </button>
        ))}
      </div>
      <label className="lighting-mode-field">
        <Sparkles size={15} aria-hidden="true" />
        <select
          aria-label="Lighting mode"
          value={value.mode}
          onChange={(e) => onChange({ mode: e.target.value as LightingMode })}
        >
          {LIGHTING_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <p className="lighting-description">{preset.description}</p>
      {control("brightness", "Brightness")}
      {control("direction", "Light direction", "°")}
      <details className="lighting-details">
        <summary>Fine-tune lighting</summary>
        {control("warmth", "Warmth", "")}
        <div className="lighting-scale-hint">
          <span>Cool</span>
          <span>Warm</span>
        </div>
        {control("reflections", "Reflections")}
        <p className="lighting-hint">
          Lights affect the device body. Your screenshot colors stay true.
        </p>
      </details>
      <Toggle
        label="Ground shadows"
        hint="Add depth beneath your devices"
        checked={shadows}
        onChange={onToggleShadows}
      />
      {shadows && (
        <details className="lighting-details shadow-details">
          <summary>Shadow settings</summary>
          {control("shadowStrength", "Shadow strength")}
          {control("shadowSoftness", "Shadow softness")}
        </details>
      )}
    </div>
  );
}
