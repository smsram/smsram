'use client';

export default function Skeleton({ className = '' }) {
  return (
    <div 
      className={`animate-pulse bg-surface-container-high border border-outline-variant/20 rounded ${className}`}
      aria-hidden="true"
    />
  );
}