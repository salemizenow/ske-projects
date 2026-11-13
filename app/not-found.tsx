import Link from 'next/link';
export default function NotFound() {
  return (<main className="content" style={{ paddingBottom: 40 }}><div className="card empty"><b>Page not found</b><span>The link may be wrong or the project was removed.</span><Link className="btn" href="/">Go home</Link></div></main>);
}
