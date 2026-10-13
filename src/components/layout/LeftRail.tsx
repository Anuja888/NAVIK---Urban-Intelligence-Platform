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
  const closeDrawer = useNavikStore((s) => s.closeDrawer);
  const incidents  = useNavikStore((s) => s.incidents);
  const workOrders = useNavikStore((s) => s.workOrders);

  const newIncidentCount = incidents.filter((i) => i.status === 'new').length;
  const openWoCount      = workOrders.filter((w) => w.status === 'drafted' || w.status === 'approved').length;

  function navigate(v: AppView) {
    closeDrawer(); // BUG FIX: close drawer when switching views
    setView(v);
  }

  return (
    <motion.nav
      animate={{ width: collapsed ? 60 : 220 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 300,
        overflow: 'hidden',
      }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 14px',
        borderBottom: '1px solid var(--sidebar-border)',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 30, height: 30,
          background: 'var(--accent)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Zap size={16} color="var(--accent-text)" strokeWidth={2.5} />
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div key="brand"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.13 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#FFFFFF', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                NAVIK
              </div>
              <div style={{ fontSize: 11, color: 'var(--sidebar-text)', opacity: 0.7, marginTop: 1 }}>
                Urban Intelligence
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav — scrollable so all 10 items visible at 1366×768 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px 6px',
        /* Custom scrollbar to match sidebar */
        scrollbarWidth: 'thin',
        scrollbarColor: '#334155 transparent',
      }}>
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((n) => n.group === group);
          return (
            <div key={group} style={{ marginBottom: 4 }}>
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.div key={`g-${group}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    style={{ fontSize: 11, fontWeight: 600, color: 'var(--sidebar-group-label)', padding: '8px 10px 3px', letterSpacing: '0.03em' }}>
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
                    onClick={() => navigate(v)}
                    title={collapsed ? label : undefined}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    style={{
                      position: 'relative',
                      width: '100%', height: 36,
                      borderRadius: 7, border: 'none',
                      background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: collapsed ? '0' : '0 10px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      transition: 'background 0.12s',
                      outline: 'none', marginBottom: 1,
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'var(--sidebar-active-bg)' : 'transparent'; }}
                  >
                    {/* 3px accent left border on active */}
                    {active && (
                      <motion.div
                        layoutId="nav-active"
                        style={{
                          position: 'absolute', left: 0, top: '50%',
                          width: 3, height: 20,
                          borderRadius: '0 2px 2px 0',
                          background: 'var(--accent)',
                          transform: 'translateY(-50%)',
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                      />
                    )}

                    <span style={{
                      display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                      color: active ? 'var(--accent)' : 'var(--sidebar-text)',
                      transition: 'color 0.12s',
                    }}>
                      <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                    </span>

                    <AnimatePresence mode="wait">
                      {!collapsed && (
                        <motion.span key={`l-${v}`}
                          initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }} transition={{ duration: 0.11 }}
                          style={{
                            fontSize: 13, fontWeight: active ? 600 : 400,
                            color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                            whiteSpace: 'nowrap', flex: 1, textAlign: 'left',
                          }}>
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {badge !== undefined && (
                      <span style={{
                        position: 'absolute', top: 4,
                        right: collapsed ? 3 : 7,
                        minWidth: 15, height: 15, borderRadius: 7,
                        background: v === 'incidents' ? '#B42318' : '#A16207',
                        color: '#fff', fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px',
                        border: '1.5px solid var(--sidebar-bg)',
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

      {/* Bottom */}
      <div style={{ padding: '6px 6px 8px', borderTop: '1px solid var(--sidebar-border)', flexShrink: 0 }}>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div key="live-pill"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 10px', borderRadius: 7, marginBottom: 4,
                background: 'rgba(21,128,61,0.12)',
                border: '1px solid rgba(21,128,61,0.22)',
              }}>
              <span className="live-dot" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ok)' }}>Live</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--sidebar-text-dim)' }}>
                {new Date().toLocaleTimeString('en-IN', { hour12: false })}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => onToggleCollapse(!collapsed)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%', padding: '5px 10px', borderRadius: 7,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--sidebar-text-dim)',
            justifyContent: collapsed ? 'center' : 'space-between',
            fontSize: 12, transition: 'background 0.12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span key="clbl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>
    </motion.nav>
  );
}
