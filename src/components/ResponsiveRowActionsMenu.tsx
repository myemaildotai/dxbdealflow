"use client";

import { MoreVertRounded } from "@mui/icons-material";
import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/deal-utils";

export type ResponsiveRowAction = {
  label: string;
  href?: string | null;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger";
};

const ACTION_MENU_WIDTH = 224;
const ACTION_MENU_MAX_HEIGHT = 320;
const VIEWPORT_PADDING = 12;
const MENU_GAP = 8;
const MENU_OPEN_EVENT = "responsive-row-actions-menu-open";

function getMenuItemClassName(tone: ResponsiveRowAction["tone"] = "secondary", disabled = false) {
  return cn(
    "flex w-full items-center justify-between gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-[14px] font-semibold transition",
    tone === "primary" && "text-[#173972] hover:bg-[#f4f7fc]",
    tone === "danger" && "text-[#ba5447] hover:bg-[#fff5f3]",
    tone !== "primary" && tone !== "danger" && "text-[#32415f] hover:bg-[#f7f9fc]",
    disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
  );
}

export function ResponsiveRowActionsMenu({
  actions,
  align = "end",
  className,
  label = "Open row actions",
  menuGroup,
}: {
  actions: ResponsiveRowAction[];
  align?: "start" | "end";
  className?: string;
  label?: string;
  menuGroup?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999, maxHeight: ACTION_MENU_MAX_HEIGHT, ready: false });
  const visibleActions = actions.filter((action) => action.href || action.onClick || action.disabled);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) {
      setOpen(false);
      return;
    }

    const menuWidth = menuRef.current?.offsetWidth || ACTION_MENU_WIDTH;
    const menuHeight = Math.min(
      menuRef.current?.offsetHeight ?? Math.min(visibleActions.length * 48 + 16, ACTION_MENU_MAX_HEIGHT),
      viewportHeight - VIEWPORT_PADDING * 2
    );
    const availableBelow = viewportHeight - rect.bottom - VIEWPORT_PADDING - MENU_GAP;
    const availableAbove = rect.top - VIEWPORT_PADDING - MENU_GAP;
    const opensAbove = availableBelow < menuHeight && availableAbove > availableBelow;
    const rawLeft = align === "end" ? rect.right - menuWidth : rect.left;
    const left = Math.max(VIEWPORT_PADDING, Math.min(rawLeft, viewportWidth - menuWidth - VIEWPORT_PADDING));
    const rawTop = opensAbove ? rect.top - menuHeight - MENU_GAP : rect.bottom + MENU_GAP;
    const top = Math.max(VIEWPORT_PADDING, Math.min(rawTop, viewportHeight - menuHeight - VIEWPORT_PADDING));
    const maxHeightSource = opensAbove ? availableAbove : availableBelow;

    setPosition({
      top,
      left,
      maxHeight: Math.max(160, Math.min(ACTION_MENU_MAX_HEIGHT, maxHeightSource, viewportHeight - VIEWPORT_PADDING * 2)),
      ready: true,
    });
  }, [align, visibleActions.length]);

  const schedulePositionUpdate = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      updatePosition();
    });
  }, [updatePosition]);

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (!menuGroup) {
      return;
    }

    const handlePeerOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; group?: string }>).detail;

      if (detail?.group === menuGroup && detail.id !== menuId) {
        setOpen(false);
      }
    };

    window.addEventListener(MENU_OPEN_EVENT, handlePeerOpen);

    return () => {
      window.removeEventListener(MENU_OPEN_EVENT, handlePeerOpen);
    };
  }, [menuGroup, menuId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    schedulePositionUpdate();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", schedulePositionUpdate, true);
    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, true);
    window.visualViewport?.addEventListener("resize", schedulePositionUpdate);
    window.visualViewport?.addEventListener("scroll", schedulePositionUpdate);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", schedulePositionUpdate, true);
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
      window.visualViewport?.removeEventListener("resize", schedulePositionUpdate);
      window.visualViewport?.removeEventListener("scroll", schedulePositionUpdate);
    };
  }, [open, schedulePositionUpdate]);

  if (!visibleActions.length) {
    return null;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }

          setPosition({ top: -9999, left: -9999, maxHeight: ACTION_MENU_MAX_HEIGHT, ready: false });
          setOpen(true);
          if (menuGroup) {
            window.dispatchEvent(new CustomEvent(MENU_OPEN_EVENT, { detail: { id: menuId, group: menuGroup } }));
          }
        }}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9dfeb] bg-white text-[#32415f] shadow-[0_8px_18px_rgba(50,62,92,0.08)] transition hover:border-[#cdd6e5] hover:bg-[#fbfcff]",
          className
        )}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <MoreVertRounded className="h-5 w-5" fontSize="small" aria-hidden="true" />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              id={menuId}
              ref={menuRef}
              className="overflow-y-auto rounded-[16px] border border-[#dfe6f2] bg-white p-2 shadow-[0_24px_48px_rgba(18,29,53,0.18)]"
              role="menu"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: ACTION_MENU_WIDTH,
                maxHeight: position.maxHeight,
                visibility: position.ready ? "visible" : "hidden",
                zIndex: 220,
              }}
            >
              {visibleActions.map((action) => {
                const className = getMenuItemClassName(action.tone, action.disabled);

                if (action.href && !action.disabled) {
                  return (
                    <Link
                      key={`${action.label}:${action.href}`}
                      href={action.href}
                      className={className}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                    >
                      {action.label}
                    </Link>
                  );
                }

                return (
                  <button
                    key={`${action.label}:button`}
                    type="button"
                    className={className}
                    disabled={action.disabled}
                    role="menuitem"
                    onClick={() => {
                      if (action.disabled) {
                        return;
                      }

                      setOpen(false);
                      action.onClick?.();
                    }}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
