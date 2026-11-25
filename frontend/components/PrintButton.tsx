"use client";

export default function PrintButton({ label }: { label: string }) {
  return <button className="btn btn-dark no-print" onClick={() => window.print()}>🖨 {label}</button>;
}
