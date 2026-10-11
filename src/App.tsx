import { useEffect, useState } from 'react';
import { Sun, Moon, Maximize2, Menu, AlertOctagon, Wrench } from 'lucide-react';
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
import { useNavikStore }  from './store/navikStore';
import type { AppView }   from './types';
import { severityColor, incidentTypeLabel } from './components/ui/helpers';

// ── Live clock ─────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { hour12: false })
  );
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString('en-IN', { hour12: false })),
      1000
    );
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.8125rem',
      color: 'var(--text-muted)',
      letterSpacing: '0.04em',
    }}>
      {time}
    </span>
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

// ── Top-bar KPI pill ───────────────────────────────────────
function TopBarKPI({ label, value, color, badge }: {
  label: string; value: string | number; color: string; badge?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, position: 'relative' }}>
      <span style={{
        fontSize: '0.6875rem',
        color: 'var(--sidebar-text-dim)',
        fontWeight: 500,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '0.9375rem',
        color,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </span>
      {badge !== undefined && (
        <span style={{
          position: 'absolute', top: -6, right: -8,
          background: 'var(--danger)',
          color: 'var(--text-invert)',
          fontSize: '0.5rem',
          fontWeight: 700,
          width: 14, height: 14,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid var(--bg)',
        }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </div>
  );
}

// ── Next Best Action banner ────────────────────────────────
function NextBestActionBanner() {
  const incidents            = useNavikStore((s) => s.incidents);
  const updateIncidentStatus = useNavikStore((s) => s.updateIncidentStatus);
  const addToast             = useNavikStore((s) => s.addToast);
  const selectIncident       = useNavikStore((s) => s.selectIncident);

  // Top-priority unresolved incident: critical/high + new/under_review
  const top = incidents
    .filter((i) => i.status !== 'resolved' && i.status !== 'dispatched')
    .sort((a, b) => {
      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const s = sevOrder[a.severity] - sevOrder[b.severity];
      if (s !== 0) return s;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })[0];

  if (!top) return (
    <div className="nba-banner nba-banner-ok" style={{ justifyContent: 'center' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--ok)', fontWeight: 500 }}>
        ✓ No active high-priority incidents
      </span>
    </div>
  );

  const isCrit = top.severity === 'critical' || top.severity === 'high';

  return (
    <div
      className="nba-banner"
      style={isCrit ? {} : { background: 'var(--warn-subtle)', borderBottomColor: 'var(--warn-border)' }}
    >
      <AlertOctagon
        size={15}
        style={{ color: isCrit ? 'var(--danger)' : 'var(--warn)', flexShrink: 0 }}
        strokeWidth={2}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)' }}>
          Next best action:{' '}
        </span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>
          <button
            onClick={() => selectIncident(top.id)}
            style={{
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', textDecoration: 'underline',
              color: isCrit ? 'var(--danger)' : 'var(--warn)',
              fontWeight: 600, fontSize: 'inherit',
            }}
          >
            {incidentTypeLabel(top.type)}
          </button>
          {' '}at {top.locationLabel}
          <span style={{
            display: 'inline-block',
            width: 8, height: 8, borderRadius: '50%',
            background: severityColor(top.severity),
            marginLeft: 6, marginBottom: -1,
          }} />
        </span>
      </div>
      {(top.status === 'new' || top.status === 'under_review') && (
        <button
          className="btn btn-sm"
          style={{
            background: isCrit ? 'var(--danger)' : 'var(--warn)',
            color: 'var(--text-invert)',
            border: 'none',
            fontWeight: 600,
            flexShrink: 0,
          }}
          onClick={() => {
            const nextStatus = top.status === 'new' ? 'under_review' : 'dispatched';
            const action     = top.status === 'new' ? 'Acknowledged' : 'Crew dispatched';
            updateIncidentStatus(top.id, nextStatus, action);
            addToast({
              type: 'success',
              title: top.status === 'new' ? 'Incident acknowledged' : '🚜 Crew dispatched',
              message: `${top.id} — ${top.locationLabel}`,
            });
          }}
        >
          <Wrench size={12} />
          {top.status === 'new' ? 'Acknowledge' : 'Dispatch Crew'}
        </button>
      )}
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────
export default function App() {
  const view                = useNavikStore((s) => s.view);
  const drawerOpen          = useNavikStore((s) => s.drawerOpen);
  const activeLiveFeedBusId = useNavikStore((s) => s.activeLiveFeedBusId);
  const incidents           = useNavikStore((s) => s.incidents);
  const kpis                = useNavikStore((s) => s.kpis);
  const [railCollapsed, setRailCollapsed] = useState(false);

  const { theme, toggleTheme, present, togglePresent } = useTheme();

  useSimulation();

  // Escape closes drawer & live feed
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useNavikStore.getState().closeDrawer();
        useNavikStore.getState().closeLiveFeed();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const railWidth = railCollapsed ? 60 : 220;
  const isMapView = MAP_VIEWS.includes(view);
  const newCount  = incidents.filter((i) => i.status === 'new').length;

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Left rail */}
      <LeftRail collapsed={railCollapsed} onToggleCollapse={setRailCollapsed} />

      {/* Main area */}
      <div style={{
        marginLeft: railWidth,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100vh',
        overflow: 'hidden',
        transition: 'margin-left 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Top bar */}
        <header style={{
          height: 56,
          flexShrink: 0,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          gap: 16,
          zIndex: 50,
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setRailCollapsed(!railCollapsed)}
              aria-label="Toggle navigation"
              style={{ flexShrink: 0, color: 'var(--text-muted)' }}
            >
              <Menu size={16} />
            </button>
            <h1 style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
            }}>
              {VIEW_META[view].title}
            </h1>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            {/* Mini KPI pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <TopBarKPI label="Buses"     value={kpis.activeBuses}          color="var(--ok)"     />
              <TopBarKPI label="Incidents" value={kpis.liveIncidents}        color="var(--danger)" badge={newCount > 0 ? newCount : undefined} />
              <TopBarKPI label="Delay"     value={`${kpis.avgRouteDelay}m`}  color="var(--warn)"   />
              <TopBarKPI label="Saved"     value={`${kpis.bandwidthSavedGB}GB`} color="var(--accent)" />
            </div>

            <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />

            {/* City tag */}
            <span style={{
              padding: '3px 10px',
              borderRadius: 6,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
              flexShrink: 0,
            }}>
              Hyderabad, TS
            </span>

            {/* Live */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span className="live-dot" />
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--ok)',
                letterSpacing: '0.04em',
                fontFamily: 'var(--font-mono)',
              }}>
                Live
              </span>
            </div>

            <LiveClock />

            <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />

            {/* Present mode */}
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={togglePresent}
              title={present ? 'Exit present mode' : 'Present mode (larger text)'}
              aria-pressed={present}
              style={{ color: present ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              <Maximize2 size={15} />
            </button>

            {/* Theme toggle */}
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              style={{ color: 'var(--text-muted)' }}
            >
              {theme === 'light'
                ? <Moon size={15} />
                : <Sun  size={15} />
              }
            </button>
          </div>
        </header>

        {/* NBA banner — only on dashboard */}
        {view === 'dashboard' && <NextBestActionBanner />}

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', position: 'relative' }}>

          {isMapView && (
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              {/* KPI strip docked above map */}
              {view === 'dashboard' && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  zIndex: 300,
                  pointerEvents: 'none',
                }}>
                  <KPIStrip />
                </div>
              )}
              <div style={{
                position: 'absolute',
                top: view === 'dashboard' ? 104 : 0,
                left: 0, right: 0, bottom: 0,
              }}>
                <GISMap />
              </div>
            </div>
          )}

          {!isMapView && (
            <div style={{
              flex: 1, overflow: 'hidden',
              display: 'flex', flexDirection: 'column', minWidth: 0,
            }}>
              <FeatureContent view={view} />
            </div>
          )}

          {/* Right drawer */}
          {drawerOpen && (
            <div style={{
              width: 420,
              flexShrink: 0,
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
              zIndex: 200,
              overflow: 'hidden',
            }}>
              <DetailDrawer />
            </div>
          )}
        </div>
      </div>

      {activeLiveFeedBusId && <LiveFeedPanel />}
      <ToastContainer />
    </div>
  );
}
