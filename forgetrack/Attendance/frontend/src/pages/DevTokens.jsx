import React from 'react'

export default function DevTokens() {
  return (
    <div className="p-8 space-y-12 max-w-4xl mx-auto pt-16">
      
      <div>
        <h1 className="text-display-md mb-2">Design Tokens</h1>
        <p className="text-body text-secondary">Verify that all CSS custom properties and components match the Figma spec.</p>
      </div>

      <section>
        <h2 className="text-h2 mb-4">1. Typography</h2>
        <div className="space-y-4">
          <div className="text-display-hero">Display Hero 72px</div>
          <div className="text-display-lg">Display Lg 56px</div>
          <div className="text-display-md">Display Md 40px</div>
          <div className="text-display-sm">Display Sm 32px</div>
          <div className="text-h1">Heading 1 28px</div>
          <div className="text-h2">Heading 2 22px</div>
          <div className="text-h3">Heading 3 18px</div>
          <div className="text-body-lg">Body Lg 16px</div>
          <div className="text-body">Body Default 14px</div>
          <div className="text-body-sm text-secondary">Body Sm 13px (Secondary)</div>
          <div className="text-caption text-tertiary">Caption 12px (Tertiary)</div>
          <div className="text-label text-tertiary">LABEL 11PX TRACKED</div>
          <div className="text-micro text-tertiary">MICRO 10PX</div>
          <div className="font-mono text-body text-secondary">4SH24CS001</div>
        </div>
      </section>

      <section>
        <h2 className="text-h2 mb-4">2. Components</h2>
        <div className="space-y-6">
          <div className="card max-w-md">
            <div className="text-label text-tertiary mb-2">TODAY'S SESSION</div>
            <h3 className="text-display-sm mb-6">ReAct Agent Pattern</h3>
            <div className="flex gap-4">
              <button className="btn-primary">Mark Attendance</button>
              <button className="btn-secondary">View Details</button>
            </div>
          </div>

          <div className="max-w-xs space-y-4">
            <input type="text" className="input" placeholder="Enter student USN..." />
            <input type="text" className="input border-danger-border" placeholder="Error state..." />
          </div>

          <div className="flex gap-4">
            <span className="pill pill-success">+ 1.09%</span>
            <span className="pill pill-danger">- 0.42%</span>
          </div>
        </div>
      </section>

    </div>
  )
}
