import React from 'react';

export function TraceLoader({ label }: { label?: string }) {
  return (
    <div className="main-container">
      <svg
        className="loader"
        viewBox="0 0 100 100"
        width="120"
        height="120"
        role="img"
        aria-label={label || 'Loading'}
      >
        <circle className="trace-bg" cx="50" cy="50" r="42" />
        <circle className="trace-flow bv-trace" cx="50" cy="50" r="42" />
      </svg>
      {label ? <div className="loader-annotation">{label}</div> : null}
    </div>
  );
}
