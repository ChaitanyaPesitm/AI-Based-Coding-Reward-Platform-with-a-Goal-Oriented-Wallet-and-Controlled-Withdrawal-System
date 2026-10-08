'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

// Custom tooltip for completion bar chart
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: 'var(--glass-shadow)',
        fontSize: '0.78rem',
        color: 'var(--text-primary)',
        minWidth: '160px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
          <span style={{ fontWeight: 700 }}>{data.day}, {data.shortDate}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{data.date}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Problems Solved:</span>
            <span style={{ fontWeight: 700, color: data.completedCount > 0 ? 'var(--easy)' : 'var(--text-muted)' }}>
              {data.completedCount}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Reward Points:</span>
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
              +{data.pointsEarned} pts
            </span>
          </div>

          {data.completedCount > 0 && (
            <div style={{
              marginTop: '4px',
              paddingTop: '4px',
              borderTop: '1px dashed var(--border-subtle)',
              display: 'flex',
              gap: '8px',
              fontSize: '0.7rem'
            }}>
              <span style={{ color: 'var(--easy)' }}>E: {data.easy || 0}</span>
              <span style={{ color: 'var(--medium)' }}>M: {data.medium || 0}</span>
              <span style={{ color: 'var(--hard)' }}>H: {data.hard || 0}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export default function CompletionChart({ rawData = [], submissions = [] }) {
  const [mounted, setMounted] = useState(false);
  const [activeMetric, setActiveMetric] = useState('completed'); // 'completed' | 'points' | 'difficulty'

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute 7-day completion data from either API's last7Days or client submissions
  const chartData = useMemo(() => {
    if (Array.isArray(rawData) && rawData.length === 7) {
      return rawData;
    }

    const now = new Date();
    const result = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayLabel = dayNames[d.getDay()];
      const shortDate = `${monthNames[d.getMonth()]} ${d.getDate()}`;

      const daySubs = (submissions || []).filter(s => {
        if (!s.createdAt) return false;
        const sDate = new Date(s.createdAt);
        return sDate.getFullYear() === d.getFullYear() &&
               sDate.getMonth() === d.getMonth() &&
               sDate.getDate() === d.getDate();
      });

      const acceptedSubs = daySubs.filter(s => s.status === 'accepted');
      const easyCount = acceptedSubs.filter(s => s.problem?.difficulty === 'easy').length;
      const mediumCount = acceptedSubs.filter(s => s.problem?.difficulty === 'medium').length;
      const hardCount = acceptedSubs.filter(s => s.problem?.difficulty === 'hard').length;
      const dayPoints = daySubs.reduce((sum, s) => sum + (s.pointsEarned || 0), 0);

      result.push({
        date: dateStr,
        day: dayLabel,
        shortDate,
        completedCount: acceptedSubs.length,
        totalSubmissions: daySubs.length,
        pointsEarned: dayPoints,
        easy: easyCount,
        medium: mediumCount,
        hard: hardCount
      });
    }

    return result;
  }, [rawData, submissions]);

  // Aggregate stats over the 7-day window
  const stats = useMemo(() => {
    const totalSolved = chartData.reduce((acc, curr) => acc + (curr.completedCount || 0), 0);
    const totalPoints = chartData.reduce((acc, curr) => acc + (curr.pointsEarned || 0), 0);
    const activeDays = chartData.filter(d => (d.completedCount || 0) > 0).length;
    const consistencyRate = Math.round((activeDays / 7) * 100);

    let maxDay = chartData[0];
    chartData.forEach(d => {
      if ((d.completedCount || 0) > (maxDay?.completedCount || 0)) {
        maxDay = d;
      }
    });

    return {
      totalSolved,
      totalPoints,
      activeDays,
      consistencyRate,
      maxDayLabel: maxDay && maxDay.completedCount > 0 ? `${maxDay.day} (${maxDay.completedCount} solved)` : 'None yet'
    };
  }, [chartData]);

  const maxCompleted = Math.max(...chartData.map(d => d.completedCount || 0), 3);
  const maxPoints = Math.max(...chartData.map(d => d.pointsEarned || 0), 200);

  return (
    <div className="panel-card" style={{ padding: '22px', marginBottom: '24px' }}>
      {/* Header with Title & Metric Filter */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--primary)',
            letterSpacing: '0.5px'
          }}>
            Consistency & Practice Velocity
          </div>
          <h2 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginTop: '2px'
          }}>
            7-Day Problem Completion History
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Daily solved challenges and reward points across the last 7 calendar days.
          </p>
        </div>

        {/* View Mode Segmented Controls */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          padding: '3px',
          border: '1px solid var(--border-subtle)',
          gap: '2px'
        }}>
          <button
            type="button"
            onClick={() => setActiveMetric('completed')}
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeMetric === 'completed' ? 'var(--primary)' : 'transparent',
              color: activeMetric === 'completed' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            Problems Solved
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('points')}
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeMetric === 'points' ? 'var(--primary)' : 'transparent',
              color: activeMetric === 'points' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            Points Earned
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('difficulty')}
            style={{
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeMetric === 'difficulty' ? 'var(--primary)' : 'transparent',
              color: activeMetric === 'difficulty' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            By Difficulty
          </button>
        </div>
      </div>

      {/* KPI Micro-Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px',
        marginBottom: '18px'
      }}>
        <div style={{
          padding: '10px 12px',
          background: 'var(--bg-secondary)',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            7-Day Solves
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }} className="font-mono tabular-nums">
            {stats.totalSolved} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>completed</span>
          </div>
        </div>

        <div style={{
          padding: '10px 12px',
          background: 'var(--bg-secondary)',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Consistency Rate
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: stats.consistencyRate >= 60 ? 'var(--easy)' : 'var(--warning)', marginTop: '2px' }} className="font-mono tabular-nums">
            {stats.consistencyRate}% <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>({stats.activeDays}/7 days)</span>
          </div>
        </div>

        <div style={{
          padding: '10px 12px',
          background: 'var(--bg-secondary)',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Points Accumulated
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }} className="font-mono tabular-nums">
            +{stats.totalPoints.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>pts</span>
          </div>
        </div>

        <div style={{
          padding: '10px 12px',
          background: 'var(--bg-secondary)',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Peak Day
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {stats.maxDayLabel}
          </div>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div style={{ width: '100%', height: '240px', position: 'relative' }}>
        {!mounted ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontSize: '0.82rem'
          }}>
            Preparing consistency telemetry...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 12, left: -20, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border-subtle)"
              />
              <XAxis
                dataKey="day"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border-subtle)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, activeMetric === 'points' ? Math.ceil(maxPoints * 1.1) : maxCompleted + 1]}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />

              {activeMetric === 'completed' && (
                <Bar
                  dataKey="completedCount"
                  name="Completed Problems"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                >
                  {chartData.map((entry, index) => {
                    const isToday = index === chartData.length - 1;
                    const hasSolved = (entry.completedCount || 0) > 0;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          isToday
                            ? '#3b82f6'
                            : hasSolved
                            ? '#2563eb'
                            : 'rgba(148, 163, 184, 0.2)'
                        }
                      />
                    );
                  })}
                </Bar>
              )}

              {activeMetric === 'points' && (
                <Bar
                  dataKey="pointsEarned"
                  name="Points Earned"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                  fill="#10b981"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-pts-${index}`}
                      fill={(entry.pointsEarned || 0) > 0 ? '#10b981' : 'rgba(148, 163, 184, 0.2)'}
                    />
                  ))}
                </Bar>
              )}

              {activeMetric === 'difficulty' && (
                <>
                  <Bar
                    dataKey="easy"
                    stackId="a"
                    name="Easy"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="medium"
                    stackId="a"
                    name="Medium"
                    fill="#f59e0b"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={44}
                  />
                  <Bar
                    dataKey="hard"
                    stackId="a"
                    name="Hard"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 7-Day Micro Strip & Guidance */}
      <div style={{
        marginTop: '16px',
        paddingTop: '14px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Daily Status:
          </span>
          <div style={{ display: 'flex', gap: '5px' }}>
            {chartData.map((d, idx) => {
              const solved = (d.completedCount || 0) > 0;
              const isToday = idx === chartData.length - 1;
              return (
                <div
                  key={d.date}
                  title={`${d.day} (${d.shortDate}): ${d.completedCount} solved`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: solved
                      ? 'var(--success-subtle)'
                      : 'var(--bg-secondary)',
                    border: `1px solid ${
                      isToday
                        ? 'var(--primary)'
                        : solved
                        ? 'var(--success-border)'
                        : 'var(--border-subtle)'
                    }`,
                    color: solved ? 'var(--easy)' : 'var(--text-muted)'
                  }}>
                    {solved ? '✓' : '—'}
                  </div>
                  <span style={{ fontSize: '0.62rem', color: isToday ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isToday ? 700 : 500 }}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {stats.activeDays >= 5 ? (
            <span style={{ color: 'var(--easy)', fontWeight: 600 }}>
              Excellent pace • Daily solving frequency meets top academic quartile
            </span>
          ) : stats.activeDays >= 3 ? (
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Consistent momentum • Solve at least 1 problem daily to preserve streak
            </span>
          ) : (
            <span style={{ color: 'var(--medium)', fontWeight: 600 }}>
              Build streak • Complete today&apos;s challenge to boost weekly completion rate
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
