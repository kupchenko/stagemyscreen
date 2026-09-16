"use client";
import { useEffect, useRef } from "react";
import {
  Box,
  CreditCard,
  Receipt,
  Laptop,
  Monitor,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import type { DeviceKind } from "@/lib/studio";
export function DeviceIcon({
  kind,
  size = 20,
}: {
  kind: DeviceKind;
  size?: number;
}) {
  const Icon = {
    custom: Box,
    phone: Smartphone,
    tablet: Tablet,
    laptop: Laptop,
    monitor: Monitor,
    "studio-display": Monitor,
    "studio-display-xdr": Monitor,
    "smart-terminal": Receipt,
    "card-reader": CreditCard,
    "countertop-pos": Monitor,
  }[kind];
  return <Icon size={size} strokeWidth={1.5} />;
}
export function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
  onEnd,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
  onEnd: () => void;
}) {
  return (
    <label className="range-control">
      <span className="range-top">
        <span>{label}</span>
        <span className="range-number">
          <input
            aria-label={`${label} value`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number(value.toFixed(2))}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
            onBlur={onEnd}
          />
          {suffix}
        </span>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onEnd}
        onKeyUp={onEnd}
      />
    </label>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      className="toggle-row"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={onChange}
    >
      <span>
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </span>
      <span className={`switch ${checked ? "on" : ""}`}>
        <span />
      </span>
    </button>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
