'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <main className="content"><div className="card empty"><b>Something went wrong</b><span>Try again. If it keeps happening, tell your admin.</span><button className="btn" onClick={reset}>Try again</button></div></main>;
}
