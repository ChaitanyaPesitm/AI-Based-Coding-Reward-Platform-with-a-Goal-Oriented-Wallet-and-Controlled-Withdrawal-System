'use client';
import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function CertificateModal({ user, goal, onClose }) {
  const certRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Goal_Completion_Certificate_${user.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '840px', background: '#0b0f19', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Certificate Printable Canvas Area */}
        <div ref={certRef} style={{
          padding: '44px 48px',
          background: '#0d1527',
          border: '2px solid #2563eb',
          borderRadius: '8px',
          color: '#f8fafc',
          textAlign: 'center',
          position: 'relative',
          fontFamily: 'Inter, sans-serif'
        }}>
          {/* Institutional Top Bar */}
          <div style={{
            fontSize: '0.78rem',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#94a3b8',
            fontWeight: 600,
            marginBottom: '4px'
          }}>
            PES Institute of Technology and Management, Shivamogga
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
            Department of Computer Science & Engineering • VTU Affiliated
          </div>

          <div style={{ height: '1px', width: '180px', background: '#2563eb', margin: '0 auto 20px' }} />

          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: '#f8fafc',
            marginBottom: '6px'
          }}>
            Certificate of Goal Milestone Achievement
          </h1>

          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '18px' }}>
            This is to certify that
          </p>

          <h2 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#38bdf8', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            {user?.name || 'Student Candidate'}
          </h2>

          <p style={{ fontSize: '0.88rem', color: '#cbd5e1', maxWidth: '580px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            has successfully fulfilled <strong>100%</strong> of the computational challenge points target required for the verified financial milestone:
          </p>

          {/* Goal Box */}
          <div style={{
            display: 'inline-block',
            padding: '14px 32px',
            borderRadius: '6px',
            background: 'rgba(37, 99, 235, 0.1)',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
              {goal?.title || 'Academic Goal Milestone'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
              Verified Credits: {goal?.targetAmount?.toLocaleString()} Points (Equivalent: ₹{((goal?.targetAmount || 0) / 10).toFixed(2)})
            </p>
          </div>

          {/* Footer Details & Verification Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px', padding: '0 20px' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Issue Date:</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>{new Date().toLocaleDateString()}</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '0.68rem',
                color: '#3b82f6',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                border: '1px solid #1e3a8a',
                padding: '4px 10px',
                borderRadius: '4px'
              }}>
                Verified by CodeReward Engine
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0' }}>Dr. Prasanna Kumar H R</div>
              <div style={{ borderTop: '1px solid #334155', paddingTop: '4px', fontSize: '0.72rem', color: '#94a3b8' }}>
                Guide & Head of Department (CSE), PESITM
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Rendering Document...' : 'Export Certificate as PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
