import { useState } from 'react'

/**
 * ExportPDF — captures a target DOM element as a styled PDF.
 * Uses html2canvas + jsPDF (dynamically imported to keep initial bundle small).
 *
 * Props:
 *  targetId  — ID of the DOM element to capture (optional, defaults to body)
 *  filename  — output filename (without .pdf)
 *  label     — button label
 *  sections  — array of element IDs to capture as separate pages [optional]
 */
export default function ExportPDF({ targetId, filename = 'MARI-Report', label = 'Export PDF', sections = [] }) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      // Dynamic import keeps initial bundle lean
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 14

      // ── Header ──────────────────────────────────────────────
      const drawHeader = (title) => {
        // Dark background
        pdf.setFillColor(6, 11, 20)
        pdf.rect(0, 0, pageW, pageH, 'F')

        // Amber left border
        pdf.setFillColor(255, 165, 0)
        pdf.rect(0, 0, 2.5, pageH, 'F')

        // MARI branding
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(20)
        pdf.setTextColor(255, 165, 0)
        pdf.text('MARI™', margin + 4, 18)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(122, 128, 144)
        pdf.text('MULTI-ASSET RISK INTELLIGENCE PLATFORM', margin + 4, 24)

        // Report title
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(14)
        pdf.setTextColor(232, 234, 237)
        pdf.text(title, margin + 4, 36)

        // Timestamp
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(122, 128, 144)
        pdf.text(`Generated: ${new Date().toLocaleString('en-IN', { hour12: false })}`, margin + 4, 42)

        // Divider
        pdf.setDrawColor(255, 165, 0)
        pdf.setLineWidth(0.3)
        pdf.line(margin, 46, pageW - margin, 46)
      }

      // ── Capture sections or single target ───────────────────
      const captureIds = sections.length > 0 ? sections : [targetId].filter(Boolean)

      if (captureIds.length === 0) {
        // Capture full body
        captureIds.push('root')
      }

      let isFirstPage = true

      for (const sectionId of captureIds) {
        const el = document.getElementById(sectionId)
        if (!el) continue

        const canvas = await html2canvas(el, {
          backgroundColor: '#060b14',
          scale: 1.8,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
        })

        if (!isFirstPage) {
          pdf.addPage()
        }

        drawHeader(filename.replace(/-/g, ' '))
        isFirstPage = false

        const imgW = pageW - 2 * margin - 2
        const imgH = (canvas.height / canvas.width) * imgW
        const startY = 52
        const maxH = pageH - startY - margin

        if (imgH <= maxH) {
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin + 2, startY, imgW, imgH)
        } else {
          // Split across pages
          const ratio = imgW / canvas.width
          let remainH = canvas.height
          let srcY = 0

          while (remainH > 0) {
            const sliceH = Math.min(maxH / ratio, remainH)
            const sliceCanvas = document.createElement('canvas')
            sliceCanvas.width  = canvas.width
            sliceCanvas.height = sliceH
            const ctx = sliceCanvas.getContext('2d')
            ctx.drawImage(canvas, 0, -srcY)
            pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', margin + 2, srcY === 0 ? startY : margin, imgW, sliceH * ratio)
            srcY      += sliceH
            remainH   -= sliceH
            if (remainH > 0) {
              pdf.addPage()
              drawHeader(filename.replace(/-/g, ' '))
            }
          }
        }
      }

      // ── Footer on last page ──────────────────────────────────
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(61, 67, 81)
      pdf.text('© MARI · QUANT RISK LAB · FOR EDUCATIONAL USE ONLY · NOT FINANCIAL ADVICE', margin + 2, pageH - 6)
      pdf.text(`Page ${pdf.internal.pages.length - 1} of ${pdf.internal.pages.length - 1}`, pageW - margin - 2, pageH - 6, { align: 'right' })

      pdf.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 16px',
        background: exporting ? 'rgba(255,165,0,0.1)' : 'rgba(255,165,0,0.08)',
        border: '1px solid rgba(255,165,0,0.25)',
        borderRadius: 8,
        color: exporting ? 'var(--text-muted)' : 'var(--amber)',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        cursor: exporting ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        letterSpacing: 0.5,
      }}
      onMouseOver={e => { if (!exporting) e.currentTarget.style.background = 'rgba(255,165,0,0.15)' }}
      onMouseOut={e => { e.currentTarget.style.background = exporting ? 'rgba(255,165,0,0.1)' : 'rgba(255,165,0,0.08)' }}
    >
      {exporting ? (
        <>
          <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span>
          Generating...
        </>
      ) : (
        <>
          ⬇ {label}
        </>
      )}
    </button>
  )
}
