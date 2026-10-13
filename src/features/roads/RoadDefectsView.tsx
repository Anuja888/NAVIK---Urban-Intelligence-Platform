import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Wrench, ChevronRight } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import {
  severityColor, severityLabel, defectCategoryLabel, defectStatusLabel, formatDateTime,
} from '../../components/ui/helpers';
import type { DefectCategory, Severity, DefectStatus } from '../../types';

const CATEGORIES: DefectCategory[] = [
  'pothole', 'waterlogging', 'missing_signboard', 'missing_divider',
  'missing_zebra_crossing', 'damaged_road',
];

function CategoryIcon({ category }: { category: DefectCategory }) {
  const emoji: Record<DefectCategory, string> = {
    pothole: '🕳️', waterlogging: '💧', missing_signboard: '🚫',
    missing_divider: '🛣️', missing_zebra_crossing: '🦓', damaged_road: '⚠️',
  };
  return <span style={{ fontSize: 18 }}>{emoji[category]}</span>;
}

export function RoadDefectsView() {
  const defects = useNavikStore((s) => s.defects);
  const defectFilter = useNavikStore((s) => s.defectFilter);
  const setDefectFilter = useNavikStore((s) => s.setDefectFilter);
  const selectDefect = useNavikStore((s) => s.selectDefect);
  const [search, setSearch] = useState('');

  const filtered = defects.filter((d) => {
    if (defectFilter.category && d.category !== defectFilter.category) return false;
    if (defectFilter.severity && d.severity !== defectFilter.severity) return false;
    if (defectFilter.status && d.status !== defectFilter.status) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.locationLabel.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || defectCategoryLabel(d.category).toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    // Sort by recurrence desc, then severity
    const sevOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return (b.recurrenceCount - a.recurrenceCount) || (sevOrder[b.severity] - sevOrder[a.severity]);
  });

  const catSummary = CATEGORIES.map((cat) => ({
    cat, count: defects.filter((d) => d.category === cat).length,
    pending: defects.filter((d) => d.category === cat && d.status !== 'resolved').length,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, marginBottom: 2 }}>Road Condition & Infrastructure</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          {defects.length} defects detected · {defects.filter(d => d.status !== 'resolved').length} active
        </p>
      </div>

      {/* Category tiles */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <button
            onClick={() => setDefectFilter({ category: '' })}
            style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 8,
              background: !defectFilter.category ? 'var(--accent-subtle)' : 'var(--surface)',
              border: `1px solid ${!defectFilter.category ? 'var(--accent)' : 'var(--border-subtle)'}`,
              color: !defectFilter.category ? 'var(--accent)' : 'var(--muted)',
              cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s',
            }}
          >
            All ({defects.length})
          </button>
          {catSummary.map(({ cat, count, pending }) => (
            <button
              key={cat}
              onClick={() => setDefectFilter({ category: defectFilter.category === cat ? '' : cat })}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 8,
                background: defectFilter.category === cat ? 'var(--accent-subtle)' : 'var(--surface)',
                border: `1px solid ${defectFilter.category === cat ? 'var(--accent)' : 'var(--border-subtle)'}`,
                color: defectFilter.category === cat ? 'var(--accent)' : 'var(--ink-2)',
                cursor: 'pointer', fontSize: 12, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <CategoryIcon category={cat} />
              <span>{defectCategoryLabel(cat)}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{count}</span>
              {pending > 0 && <span style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', borderRadius: 20, padding: '1px 5px', fontSize: 11, fontWeight: 700 }}>{pending}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '10px 20px', display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32, height: 36 }}
            placeholder="Search location, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search defects"
          />
        </div>
        <select className="form-select" style={{ width: 120, height: 36 }} value={defectFilter.severity} onChange={(e) => setDefectFilter({ severity: e.target.value })} aria-label="Filter by severity">
          <option value="">All Severity</option>
          {(['critical', 'high', 'medium', 'low'] as Severity[]).map((s) => <option key={s} value={s}>{severityLabel(s)}</option>)}
        </select>
        <select className="form-select" style={{ width: 130, height: 36 }} value={defectFilter.status} onChange={(e) => setDefectFilter({ status: e.target.value })} aria-label="Filter by status">
          <option value="">All Status</option>
          {(['pending', 'under_review', 'dispatched', 'resolved'] as DefectStatus[]).map((s) => <option key={s} value={s}>{defectStatusLabel(s)}</option>)}
        </select>
      </div>

      {/* Defect list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Wrench size={40} color="var(--surface-3)" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--muted)', fontSize: 15 }}>No defects match your filters</div>
          </div>
        ) : (
          filtered.map((defect, i) => {
            const sColor = severityColor(defect.severity);
            return (
              <motion.button
                key={defect.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => selectDefect(defect.id)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
                  borderBottom: '1px solid var(--border-subtle)',
                  padding: '12px 20px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14, transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                  background: `${sColor}18`, border: `1px solid ${sColor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CategoryIcon category={defect.category} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
                      {defectCategoryLabel(defect.category)}
                    </span>
                    <span className="badge" style={{ background: `${sColor}18`, color: sColor, border: `1px solid ${sColor}30`, fontSize: 11 }}>
                      {severityLabel(defect.severity)}
                    </span>
                    {defect.recurrenceCount > 2 && (
                      <span className="badge badge-danger">Recurring ×{defect.recurrenceCount}</span>
                    )}
                    <span className="badge badge-muted">{defectStatusLabel(defect.status)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {defect.locationLabel} · {defect.detectedBy} · {formatDateTime(defect.detectedAt)}
                  </div>
                </div>

                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{defect.id}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Conf: {defect.confidenceScore}%</div>
                </div>
                <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
