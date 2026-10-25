"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { explorerAddress, network } from "@/lib/config";
import { formatBot, shortAddress } from "@/lib/money";
import { useWallet } from "@/lib/wallet";
import { useNoWallet } from "../ConnectButton";

const nav = [
  { href: "/markets", label: "Markets", icon: "M3 5h14M3 10h14M3 15h9" },
  { href: "/create", label: "Create", icon: "M10 4v12M4 10h12" },
  { href: "/leaders", label: "Leaders", icon: "M4 16V9M10 16V4M16 16v-5" },
  { href: "/portfolio", label: "Portfolio", icon: "M3 7h14v9H3zM6 7V4h8v3" },
];

/** The TrueUp mark: a slip with its two notches, a stub of each side across the middle. */
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 6h24v8l-3 2 3 2v8H4v-8l3-2-3-2z" fill="var(--paper)" />
      <rect x="8" y="14.5" width="9" height="3" fill="var(--ground)" />
      <rect x="17" y="14.5" width="7" height="3" fill="var(--side-b)" />
    </svg>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar" aria-label="App">
      <Link className="sidebar__brand" href="/">
        <Mark />
        <span>TrueUp</span>
      </Link>
      <nav className="sidebar__nav">
        {nav.map((n) => (
          <Link key={n.href} className="nav-item" href={n.href} aria-current={isActive(path, n.href) ? "page" : undefined}>
            <Icon d={n.icon} />
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar__foot">
        <Link className="nav-item" href="/">
          <Icon d="M3 9l7-6 7 6v8H3z" />
          Home
        </Link>
        <p className="sidebar__network nums">
          {network.label} · {network.chain.id}
        </p>
      </div>
    </aside>
  );
}

export function BottomBar() {
  const path = usePathname();
  return (
    <nav className="bottombar" aria-label="App">
      {nav.map((n) => (
        <Link key={n.href} href={n.href} aria-current={isActive(path, n.href) ? "page" : undefined}>
          <Icon d={n.icon} />
          <span>{n.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function WalletArea() {
  const wallet = useWallet();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const noWallet = useNoWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!wallet.connected || !wallet.address) {
    return (
      <div className="wallet">
        {noWallet && <span className="wallet__hint">No browser wallet found</span>}
        {error && <span className="wallet__hint">{error.message.split(".")[0]}</span>}
        <button className="btn primary" type="button" disabled={isPending || !connectors[0]} onClick={() => connect({ connector: connectors[0] })}>
          {isPending ? "Check your wallet" : "Connect wallet"}
        </button>
      </div>
    );
  }

  return (
    <div className="wallet" ref={ref}>
      {wallet.wrongChain && (
        <>
          <span className="pill warn">Wrong network</span>
          <button className="btn" type="button" disabled={switching} onClick={() => switchChain({ chainId: network.chain.id })}>
            {switching ? "Check your wallet" : network.isTestnet ? "Switch to Bohr" : "Switch to BOT Chain"}
          </button>
        </>
      )}
      <button className="wallet__button" type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <span className="wallet__dot" aria-hidden="true" />
        <span className="nums">{shortAddress(wallet.address)}</span>
        {wallet.balance !== undefined && <span className="wallet__balance nums">{formatBot(wallet.balance, 2)} BOT</span>}
      </button>
      {open && (
        <div className="menu" role="menu">
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(wallet.address!);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy address"}
          </button>
          <a role="menuitem" href={explorerAddress(wallet.address)} target="_blank" rel="noreferrer">
            View on explorer
          </a>
          <Link role="menuitem" href="/portfolio" onClick={() => setOpen(false)}>
            Portfolio
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

/** The 64px top bar: the page's own context on the left, the wallet behind a divider on the right. */
export function TopBar({ children, title }: { children?: ReactNode; title: string }) {
  return (
    <header className="topbar">
      <Link className="topbar__brand" href="/" aria-label="TrueUp home">
        <Mark size={22} />
      </Link>
      <div className="topbar__context">{children ?? <span className="topbar__title">{title}</span>}</div>
      <div className="topbar__wallet">
        <WalletArea />
      </div>
    </header>
  );
}
