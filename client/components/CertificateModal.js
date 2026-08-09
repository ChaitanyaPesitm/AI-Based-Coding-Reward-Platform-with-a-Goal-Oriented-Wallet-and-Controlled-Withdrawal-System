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
      <div className="modal-content" style={{ maxWidth: '850px', background: '#0d0d12' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Certificate Printable Canvas Area */}
        <div ref={certRef} style={{
          padding: '40px',
          background: 'linear-gradient(135deg, #12121a 0%, #1e1e2d 100%)',
          border: '8px double #6c63ff',
          borderRadius: '16px',
          color: '#f0f0f5',
          textAlign: 'center',
          position: 'relative',
          fontFamily: 'Inter, sans-serif'
        }}>
          {/* Top Decorative Header */}
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏆</div>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#6c63ff',
            marginBottom: '4px'
          }}>
            CERTIFICATE OF ACHIEVEMENT
          </h1>
          <p style={{ color: '#a0a0b8', fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
            VTU 7th Semester EdTech & FinTech Platform
          </p>

          <div style={{ height: '2px', width: '120px', background: '#6c63ff', margin: '20px auto' }} />

          <p style={{ fontSize: '1rem', color: '#a0a0b8' }}>This is to certify that</p>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#ffffff', margin: '12px 0' }}>
            {user?.name || 'Student'}
          </h2>

          <p style={{ fontSize: '1.05rem', color: '#a0a0b8', maxWidth: '600px', margin: '0 auto 20px', lineHeight: 1.6 }}>
            has successfully completed <strong>100%</strong> of their financial goal target for:
          </p>

          {/* Goal Highlight Box */}
          <div style={{
            display: 'inline-block',
            padding: '16px 36px',
            borderRadius: '12px',
            background: 'rgba(108, 99, 255, 0.15)',
            border: '1px solid rgba(108, 99, 255, 0.4)',
            marginBottom: '28px'
          }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>
              🎯 {goal?.title || 'Financial Goal'}
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
              Target Accumulated: {goal?.targetAmount?.toLocaleString()} Points (₹{(goal?.targetAmount / 10).toFixed(2)})
            </p>
          </div>

          {/* Footer Seals & Signature */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px', padding: '0 40px' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', color: '#a0a0b8' }}>Issue Date:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{new Date().toLocaleDateString()}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem' }}>🎖️</div>
              <div style={{ fontSize: '0.75rem', color: '#6c63ff', fontWeight: 700, letterSpacing: '1px' }}>VERIFIED GOAL ACHIEVEMENT</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'cursive', fontSize: '1.2rem', color: '#3b82f6' }}>Dr. Prasanna Kumar H R</div>
              <div style={{ borderTop: '1px solid #6b6b80', paddingTop: '4px', fontSize: '0.8rem', color: '#a0a0b8' }}>
                Guide & HOD (CSE), PESITM
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Generating PDF...' : '📥 Download PDF Certificate'}
          </button>
        </div>
      </div>
    </div>
  );
}
