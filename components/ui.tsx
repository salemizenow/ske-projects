import { initials } from '@/lib/format';
import { Icon } from './Icon';

export function Avatar({ name, admin, size }: { name: string; admin?: boolean; size?: 'sm' | 'lg' }) {
  return <span className={`av ${admin ? 'navy' : ''} ${size ?? ''}`} aria-hidden="true">{initials(name)}</span>;
}
export function Pill({ label, cls }: { label: string; cls: string }) {
  return <span className={`pill ${cls}`}>{label}</span>;
}
export function Empty({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return <div className="empty"><b>{title}</b>{text && <span>{text}</span>}{children}</div>;
}
export function ErrorNote({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="err" role="alert"><Icon name="x" size="sm" /><span>{text}</span></p>;
}
