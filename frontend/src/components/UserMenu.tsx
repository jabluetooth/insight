"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

/** First+last initial from a name, or the first two characters of an email/name fallback. */
function getInitials(name: string | null, email: string | null): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
    }
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const trimmedEmail = email?.trim();
  if (trimmedEmail) return trimmedEmail.slice(0, 2).toUpperCase();
  return "?";
}

/**
 * Compact avatar-triggered account menu — replaces the old plain
 * email-text-plus-sign-out-button header treatment. A proper WAI-ARIA
 * "menu button" (role="menu"/"menuitem"), not a CSS hover trick or a bare
 * <details>, because it holds a real navigation link (Settings) alongside
 * an action (Sign out) and needs to behave predictably for keyboard and
 * touch users, not just mouse-hover ones.
 */
export function UserMenu({
  name,
  email,
  image,
  signOutAction,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((refocusTrigger: boolean) => {
    setOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  }, []);

  // Outside-click, Escape, and arrow-key navigation — only wired up while
  // the menu is actually open, and torn down on close so a closed menu adds
  // zero listeners.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      close(true);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
        return;
      }

      const items = menuRef.current
        ? Array.from(menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]'))
        : [];
      if (items.length === 0) return;
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        items[(currentIndex + 1 + items.length) % items.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  // Land keyboard focus on the first menu item as soon as the menu opens
  // (WAI-ARIA menu button pattern), rather than leaving focus on the
  // trigger and making keyboard users Tab in separately.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const initials = getInitials(name, email);
  const accessibleLabel = `Account menu for ${name || email || "your account"}`;

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-border bg-background font-mono text-[11px] font-medium text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-expanded:border-accent"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={accessibleLabel}
        onClick={() => setOpen((v) => !v)}
      >
        {image ? (
          // Deliberate <img>, not next/image: an external OAuth provider
          // avatar URL (arbitrary host, not known ahead of time), and this
          // is a tiny 36px icon — not worth next/image's optimization
          // pipeline or a remotePatterns config entry per provider.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded border border-border bg-surface shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)]"
          ref={menuRef}
        >
          <div className="border-b border-border px-4 py-3">
            {name && <span className="block truncate text-sm font-medium">{name}</span>}
            {email && <span className="block truncate font-mono text-xs text-muted">{email}</span>}
          </div>
          <Link
            href="/dashboard/settings"
            role="menuitem"
            className="block w-full px-4 py-2.5 text-left font-mono text-xs uppercase tracking-[0.08em] text-muted transition-colors hover:bg-background hover:text-foreground focus:bg-background focus:text-foreground focus:outline-none"
            onClick={() => close(false)}
          >
            Settings
          </Link>
          <form action={signOutAction} role="presentation">
            <button
              type="submit"
              role="menuitem"
              className="block w-full border-t border-border px-4 py-2.5 text-left font-mono text-xs uppercase tracking-[0.08em] text-danger transition-colors hover:bg-danger/[0.08] focus:bg-danger/[0.08] focus:outline-none"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
