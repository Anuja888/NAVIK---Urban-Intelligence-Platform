import { useEffect, useState, useRef } from 'react';
import { Sun, Moon, Maximize2, Menu, Bell, AlertOctagon, Wrench, X, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LeftRail }       from './components/layout/LeftRail';
import { GISMap }         from './components/map/GISMap';
import { DetailDrawer }   from './components/drawer/DetailDrawer';
import { LiveFeedPanel }  from './components/live/LiveFeedPanel';
import { KPIStrip }       from './components/dashboard/KPIStrip';
import { FleetView }      from './features/fleet/FleetView';
import { IncidentsView }  from './features/incidents/IncidentsView';
import { AnalyticsView }  from './features/analytics/AnalyticsView';
import { ReportsView }    from './features/reports/ReportsView';
import { AgentsView }     from './features/agents/AgentsView';
import { CivilWorksView } from './features/civil/CivilWorksView';
import { RoadHealthView } from './features/roadhealth/RoadHealthView';
import { EdgeNetworkView }from './features/edge/EdgeNetworkView';
import { ToastContainer } from './components/ui/Toast';
import { useSimulation }  from './hooks/useSimulation';
import { useTheme }       from './hooks/useTheme';
import { useNavikStore } from './store/navikStore';
import type { Toast } from './store/navikStore';
import type { AppView }  from './types';
import { incidentTypeLabel } from './components/ui/helpers';

// ── Live clock ─────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { hour12: false })
  );
  useEffect(() => {
    const id = setInterval(() =>
      setTime(new Date().toLocaleTimeString('en-IN', { hour12: false })), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)', letterSpacing: '0.03em' }}>
      {time}
    </span>
  );
}

// ── Toast history bell ─────────────────────────────────────
function NotificationBell() {
  const toasts  = useNavikStore((s) => s.toasts);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Toast[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Accumulate toast history
  useEffect(() => {
    if (toasts.length > 0) {
      setHistory((h) => [...toasts, ...h].slice(0, 20));
    }
  }, [toasts]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unread = toasts.length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-icon btn-sm"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        style={{ position: 'relative', color: 'var(--muted)' }}
      >
        <Bell size={15} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--danger)',
            border: '1.5px solid var(--surface)',
          }} />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6,
              width: 320,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-popover)',
              zIndex: 9000,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>Notifications</span>
              <button className="btn btn-ghost btn-icon btn-xs" onClick={() => setOpen(false)}><X size={12} /></button>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {history.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No notifications yet</div>
              ) : (
                history.slice(0, 12).map((t, i) => (
                  <div key={i} style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                      background: t.type === 'error' ? 'var(--danger)' : t.type === 'warning' ? 'var(--warn)' : t.type === 'success' ? 'var(--ok)' : 'var(--info)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>{t.title}</div>
                      {t.message && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.message}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── View metadata ──────────────────────────────────────────
const VIEW_META: Record<AppView, { title: string }> = {
  dashboard:    { title: 'Command Center' },
  fleet:        { title: 'Fleet Management' },
  incidents:    { title: 'Incidents & Alerts' },
  agents:       { title: 'Agent Hub' },
  civil_works:  { title: 'Civil Works' },
  road_health:  { title: 'Road Health Intelligence' },
  edge_network: { title: 'Edge Network Console' },
  analytics:    { title: 'Traffic Analytics' },
  reports:      { title: 'Reports' },
  live_feed:    { title: 'Live Onboard Feed' },
};

const MAP_VIEWS: AppView[] = ['dashboard', 'live_feed'];

function FeatureContent({ view }: { view: AppView }) {
  switch (view) {
    case 'fleet':        return <FleetView />;
    case 'incidents':    return <IncidentsView />;
    case 'agents':       return <AgentsView />;
    case 'civil_works':  return <CivilWorksView />;
    case 'road_health':  return <RoadHealthView />;
    case 'edge_network': return <EdgeNetworkView />;
    case 'analytics':    return <AnalyticsView />;
    case 'reports':      return <ReportsView />;
    default:             return null;
  }
}

// ── NBA banner — slim, dismissible, critical only ──────────
function NBABanner() {
  const incidents            = useNavikStore((s) => s.incidents);
  const updateIncidentStatus = useNavikStore((s) => s.updateIncidentStatus);
  const addToast             = useNavikStore((s) => s.addToast);
  const selectIncident       = useNavikStore((s) => s.selectIncident);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const top = incidents
    .filter((i) => i.status !== 'resolved' && i.status !== 'dispatched' && (i.severity === 'critical' || i.severity === 'high'))
    .sort((a, b) => {
      const o = { critical: 0, high: 1, medium: 2, low: 3 };
      return (o[a.severity] - o[b.severity]) ||
             (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    })[0];

  if (!top || dismissed === top.id) return null;

  return (
    <div className="nba-banner" style={top.severity === 'high' ? { background: 'var(--sev-high-tint)', borderBottomColor: 'var(--sev-high-border)' } : {}}>
      <AlertOctagon size={14} style={{ color: top.severity === 'critical' ? 'var(--sev-critical-text)' : 'var(--sev-high-text)', flexShrink: 0 }} strokeWidth={2} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          <button onClick={() => selectIncident(top.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: top.severity === 'critical' ? 'var(--sev-critical-text)' : 'var(--sev-high-text)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
            {incidentTypeLabel(top.type)}
          </button>
          {' '}— {top.locationLabel}
        </span>
      </div>
      {(top.status === 'new' || top.status === 'under_review') && (
        <button
          className="btn btn-sm"
          style={{ background: top.severity === 'critical' ? 'var(--sev-critical-text)' : 'var(--sev-high-text)', color: '#fff', border: 'none', fontWeight: 600, flexShrink: 0, padding: '4px 12px' }}
          onClick={() => {
            const next = top.status === 'new' ? 'under_review' : 'dispatched';
            updateIncidentStatus(top.id, next, top.status === 'new' ? 'Acknowledged' : 'Crew dispatched');
            addToast({ type: 'success', title: top.status === 'new' ? 'Acknowledged' : 'Crew dispatched', message: top.locationLabel });
          }}
        >
          <Wrench size={12} />
          {top.status === 'new' ? 'Acknowledge' : 'Dispatch'}
        </button>
      )}
      <button className="btn btn-ghost btn-icon btn-xs" onClick={() => setDismissed(top.id)} style={{ flexShrink: 0, color: 'var(--muted)' }}>
        <X size={12} />
      </button>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────
export default function App() {
  const view                = useNavikStore((s) => s.view);
  const setView             = useNavikStore((s) => s.setView);
  const drawerOpen          = useNavikStore((s) => s.drawerOpen);
  const activeLiveFeedBusId = useNavikStore((s) => s.activeLiveFeedBusId);
  const closeDrawer         = useNavikStore((s) => s.closeDrawer);
  const [railCollapsed, setRailCollapsed] = useState(false);

  const { theme, toggleTheme, present, togglePresent } = useTheme();

  useSimulation();

  // Close drawer when view changes (bug fix)
  useEffect(() => { closeDrawer(); }, [view]);           // eslint-disable-line react-hooks/exhaustive-deps

  // Escape closes drawer & live feed
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useNavikStore.getState().closeDrawer();
        useNavikStore.getState().closeLiveFeed();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const railWidth = railCollapsed ? 60 : 220;
  const isMapView = MAP_VIEWS.includes(view);

  // Wrap setView to also dismiss drawer
  function navigateTo(v: AppView) {
    closeDrawer();
    setView(v);
  }
  void navigateTo; // used via LeftRail's own setView — drawer closes via useEffect above

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--canvas)' }}>
      <LeftRail collapsed={railCollapsed} onToggleCollapse={setRailCollapsed} />

      <div style={{
        marginLeft: railWidth, flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, height: '100vh', overflow: 'hidden',
        transition: 'margin-left 0.2s ease',
      }}>
        {/* ── Top bar ── */}
        <header style={{
          height: 52, flexShrink: 0,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', gap: 16, zIndex: 50,
        }}>
          {/* Left: hamburger + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setRailCollapsed(!railCollapsed)}
              aria-label="Toggle navigation" style={{ flexShrink: 0, color: 'var(--muted)' }}>
              <Menu size={16} />
            </button>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              {VIEW_META[view].title}
            </h1>
          </div>

          {/* Right: live + clock + tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {/* Simulated data pill */}
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 9px', borderRadius: 99,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--muted)', fontWeight: 400,
              marginRight: 8, flexShrink: 0,
            }}>
              <Database size={11} style={{ opacity: 0.6 }} />
              Simulated data
            </span>

            {/* Live pulse + clock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
              <span className="live-dot" />
              <LiveClock />
            </div>

            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

            <NotificationBell />

            <button className="btn btn-ghost btn-icon btn-sm" onClick={togglePresent}
              title={present ? 'Exit present mode' : 'Present mode'}
              aria-pressed={present}
              style={{ color: present ? 'var(--accent)' : 'var(--muted)' }}>
              <Maximize2 size={14} />
            </button>

            <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Dark theme' : 'Light theme'}
              style={{ color: 'var(--muted)' }}>
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          </div>
        </header>

        {/* NBA banner — dashboard only */}
        {view === 'dashboard' && <NBABanner />}

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          {/* Map view */}
          {isMapView && (
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              {view === 'dashboard' && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 300, pointerEvents: 'none' }}>
                  <KPIStrip />
                </div>
              )}
              <div style={{
                position: 'absolute',
                top: view === 'dashboard' ? 88 : 0,
                left: 0, right: 0, bottom: 0,
              }}>
                <GISMap />
              </div>
            </div>
          )}

          {/* Feature views */}
          {!isMapView && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <FeatureContent view={view} />
            </div>
          )}

          {/* Right drawer — slide in, shadow only on drawer */}
          <AnimatePresence>
            {drawerOpen && (
              <motion.div
                key="drawer"
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 30, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  width: 400, flexShrink: 0,
                  background: 'var(--surface)',
                  borderLeft: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column',
                  boxShadow: 'var(--shadow-drawer)',
                  zIndex: 200, overflow: 'hidden',
                }}
              >
                <DetailDrawer />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {activeLiveFeedBusId && <LiveFeedPanel />}
      <ToastContainer />
    </div>
  );
}
