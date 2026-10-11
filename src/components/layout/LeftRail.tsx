import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Bus, AlertTriangle, Bot,
  HardHat, Activity, Cpu, BarChart3,
  FileText, Radio, Zap, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import type { AppView } from '../../types';

interface LeftRailProps {
  collapsed: boolean;
  onToggleCollapse: (v: boolean) => void;
}

interface NavItem {
  view: AppView;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  group: 'main' | 'intelligence' | 'analytics';
}

const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard',    icon: LayoutDashboard, label: 'Command Center', group: 'main' },
  { view: 'fleet',        icon: Bus,             label: 'Fleet',          group: 'main' },
  { view: 'incidents',    icon: AlertTriangle,   label: 'Incidents',      group: 'main' },
  { view: 'agents',       icon: Bot,             label: 'Agents',         group: 'intelligence' },
  { view: 'civil_works',  icon: HardHat,         label: 'Civil Works',    group: 'intelligence' },
  { view: 'road_health',  icon: Activity,        label: 'Road Health',    group: 'intelligence' },
  { view: 'edge_network', icon: Cpu,             label: 'Edge Network',   group: 'intelligence' },
  { view: 'analytics',    icon: BarChart3,       label: 'Analytics',      group: 'analytics' },
  { view: 'reports',      icon: FileText,        label: 'Reports',        group: 'analytics' },
  { view: 'live_feed',    icon: Radio,           label: 'Live Feed',      group: 'analytics' },
];

const GROUP_LABELS: Record<string, string> = {
  main:         'Operations',
  intelligence: 'Intelligence',
  analytics:    'Insights',
};

const GROUPS = ['main', 'intelligence', 'analytics'] as const;

export function LeftRail({ collapsed, onToggleCollapse }: LeftRailProps) {
  const view       = useNavikStore((s) => s.view);
  const setView    = useNavikStore((s) => s.setView);
  const incidents  = useNavikStore((s) => s.incidents);
  const workOrders = useNavikStore((s) => s.workOrders);

  const newIncidentCount = incidents.filter((i) => i.status === 'new').length;
  const openWoCount      = workOrders.filter((w) => w.status === 'drafted' || w.status === 'approved').length;

  // Sidebar is always deep navy regardless of theme, using --sidebar-* tokens
  const railBg     = 'var(--sidebar-bg)';
  const railBorder = 'var(--sidebar-border)';

  return (
    <motion.nav
      animate={{ width: collapsed ? 60 : 220 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        flexShrink: 0,
        background: railBg,
        borderRight: `1px solid ${railBorder}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 300,
        overflow: 'hidden',
      }}
      aria-label="Main navigation"
    >
      {/* ── Logo ── */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '0 14px' : '0 14px',
        borderBottom: `1px solid ${railBorder}`,
        flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dim) 100%)',
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 0 14px var(--accent-glow)',
        }}>
          <Zap size={16} color="var(--accent-text)" strokeWidth={2.8} />
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="brand"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.14 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1rem',
                color: '#FFFFFF',          /* always white on navy */
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}>
                NAVIK
              </div>
              <div style={{
                fontSize: '0.625rem',
                color: 'var(--sidebar-text)',
                letterSpacing: '0.08em',
                marginTop: 1,
              }}>
                Urban Intelligence
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav items ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '10px 6px',
      }}>
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((n) => n.group === group);
          return (
            <div key={group} style={{ marginBottom: 6 }}>
              {/* Group label — sentence case, adequate contrast */}
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.div
                    key={`grp-${group}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      fontSize: '0.6875rem',    /* 11px — readable */
                      fontWeight: 600,
                      color: 'var(--sidebar-group-label)', /* #7A9AB5 / #6B85A0 */
                      padding: '8px 10px 4px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {GROUP_LABELS[group]}
                  </motion.div>
                )}
              </AnimatePresence>

              {items.map(({ view: v, icon: Icon, label }) => {
                const active = view === v;
                const badge  =
                  v === 'incidents'   ? (newIncidentCount > 0 ? newIncidentCount : undefined) :
                  v === 'civil_works' ? (openWoCount > 0 ? openWoCount : undefined) :
                  undefined;

                return (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    title={collapsed ? label : undefined}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 38,
                      borderRadius: 8,
                      border: 'none',
                      background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: collapsed ? '0' : '0 10px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      transition: 'background 0.13s',
                      outline: 'none',
                      marginBottom: 2,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = active ? 'var(--sidebar-active-bg)' : 'transparent';
                    }}
                  >
                    {/* Active left border */}
                    {active && (
                      <motion.div
                        layoutId="nav-active"
                        style={{
                          position: 'absolute',
                          left: 0, top: '50%',
                          width: 3, height: 22,
                          borderRadius: '0 3px 3px 0',
                          background: 'var(--accent)',
                          transform: 'translateY(-50%)',
                          boxShadow: '0 0 8px var(--accent-glow)',
                        }}
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}

                    <Icon
                      size={16}
                      strokeWidth={active ? 2.2 : 1.8}
                      style={{
                        flexShrink: 0,
                        color: active
                          ? 'var(--accent)'
                          : 'var(--sidebar-text)',   /* #C5D3E3 — 4.5:1 on navy */
                        transition: 'color 0.13s',
                      } as React.CSSProperties}
                    />

                    <AnimatePresence mode="wait">
                      {!collapsed && (
                        <motion.span
                          key={`lbl-${v}`}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.12 }}
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: active ? 600 : 400,
                            color: active
                              ? 'var(--sidebar-active-text)' /* #FFFFFF */
                              : 'var(--sidebar-text)',       /* #C5D3E3 */
                            whiteSpace: 'nowrap',
                            flex: 1,
                            textAlign: 'left',
                          }}
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {badge !== undefined && (
                      <span style={{
                        position: 'absolute',
                        top: 5,
                        right: collapsed ? 4 : 8,
                        minWidth: 16, height: 16,
                        borderRadius: 8,
                        background: v === 'incidents' ? 'var(--danger)' : 'var(--warn)',
                        color: '#FFFFFF',
                        fontSize: '0.5rem',
                        fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px',
                        border: `1.5px solid var(--sidebar-bg)`,
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Bottom ── */}
      <div style={{
        padding: '8px 6px',
        borderTop: `1px solid ${railBorder}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {/* Live indicator pill */}
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="live-pill"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.14 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 10px',
                borderRadius: 8,
                background: 'rgba(52,211,153,0.10)',
                border: '1px solid rgba(52,211,153,0.20)',
                marginBottom: 2,
              }}
            >
              <span className="live-dot" />
              <span style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--ok)',
                letterSpacing: '0.03em',
              }}>
                Live
              </span>
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.625rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--sidebar-text-dim)',
              }}>
                {new Date().toLocaleTimeString('en-IN', { hour12: false })}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        <button
          onClick={() => onToggleCollapse(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            padding: '6px 10px',
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--sidebar-text-dim)',
            justifyContent: collapsed ? 'center' : 'space-between',
            transition: 'background 0.13s',
            fontSize: '0.6875rem',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="clbl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </motion.nav>
  );
}
