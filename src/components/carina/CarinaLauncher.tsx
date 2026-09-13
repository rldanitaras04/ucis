'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';
import CarinaPanel from './CarinaPanel';

const STORAGE_KEY = 'carina-pos-v2';
const DRAG_THRESHOLD = 5;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function readSavedPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.x !== 'number' || typeof p.y !== 'number') return null;
    return { x: clamp(p.x, 0, window.innerWidth - 56), y: clamp(p.y, 0, window.innerHeight - 56) };
  } catch { return null; }
}

function writeSavedPosition(pos: { x: number; y: number }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
}

export default function CarinaLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [userName, setUserName] = useState<string | undefined>();
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const posRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; bx: number; by: number } | null>(null);
  const didDrag = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    try { localStorage.removeItem('carina-position'); } catch {}
    const saved = readSavedPosition();
    if (saved) {
      setPosition(saved);
      posRef.current = saved;
    }
  }, []);

  useEffect(() => {
    const onSidebarToggle = (e: Event) => {
      const collapsed = (e as CustomEvent).detail?.collapsed;
      setSidebarWidth(collapsed ? 72 : 260);
    };
    const onResize = () => {
      setSidebarWidth(window.innerWidth < 1024 ? 0 : 260);
      if (posRef.current) {
        const minLeft = window.innerWidth < 1024 ? 0 : 260;
        const clamped = {
          x: clamp(posRef.current.x, minLeft, window.innerWidth - 56),
          y: clamp(posRef.current.y, 0, window.innerHeight - 56),
        };
        posRef.current = clamped;
        setPosition(clamped);
      }
    };
    window.addEventListener('sidebar:collapsed', onSidebarToggle as EventListener);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('sidebar:collapsed', onSidebarToggle as EventListener);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('user_profiles').select('first_name, avatar_url').eq('auth_user_id', user.id).single();
      if (profile) {
        setUserName(profile.first_name);
        if (profile.avatar_url) {
          const { data } = await supabase.storage.from('ucis-bucket').createSignedUrl(profile.avatar_url, 3600);
          if (data?.signedUrl) setUserAvatarUrl(data.signedUrl);
        }
      }
      const { data: rd } = await supabase
        .from('user_roles').select('roles(name)').eq('user_id', user.id).eq('is_active', true);
      setRoles(rd?.map((r: any) => r.roles?.name).filter(Boolean) || []);
    })();
  }, [supabase]);

  useEffect(() => {
    const toggle = () => setIsOpen(p => !p);
    const open = () => setIsOpen(true);
    window.addEventListener('carina:toggle', toggle);
    window.addEventListener('carina:open', open);
    return () => { window.removeEventListener('carina:toggle', toggle); window.removeEventListener('carina:open', open); };
  }, []);

  useEffect(() => {
    if (pathname !== '/vitals') window.dispatchEvent(new Event('carina:clear-vitals'));
    if (pathname !== '/fbs') window.dispatchEvent(new Event('carina:clear-fbs'));
  }, [pathname]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    didDrag.current = false;
    dragRef.current = { sx: e.clientX, sy: e.clientY, bx: rect.left, by: rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    if (!didDrag.current && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    didDrag.current = true;
    setIsDragging(true);
    const minLeft = window.innerWidth < 1024 ? 0 : sidebarWidth;
    const pos = {
      x: clamp(dragRef.current.bx + dx, minLeft, window.innerWidth - 56),
      y: clamp(dragRef.current.by + dy, 0, window.innerHeight - 56),
    };
    setPosition(pos);
    posRef.current = pos;
  }, [sidebarWidth]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
    if (didDrag.current) {
      if (posRef.current) writeSavedPosition(posRef.current);
    } else {
      setIsOpen(p => !p);
    }
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={position ? { left: position.x, top: position.y } : undefined}
        className={`fixed z-50 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow overflow-hidden border-2 border-white group focus:outline-none focus:ring-2 focus:ring-[#1E40AF] focus:ring-offset-2 touch-none select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${position ? '' : 'bottom-6 right-6'}`}
        aria-label={isOpen ? 'Close Carina assistant' : 'Open Carina assistant'}
        aria-expanded={isOpen}
        aria-controls="carina-panel"
        title="Carina AI Assistant"
      >
        <img src="/carina.png" alt="Carina" className="w-full h-full object-cover group-hover:scale-110 transition-transform pointer-events-none" />
      </button>

      <CarinaPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        roles={roles}
        userName={userName}
        userAvatarUrl={userAvatarUrl}
        position={position}
      />
    </>
  );
}
