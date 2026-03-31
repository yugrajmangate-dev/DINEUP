"use client";

import { useEffect, useRef } from "react";

export function VirtualTourExperience() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!rootRef.current) return undefined;

    let cleanup = () => {};

    void import("@/components/virtual-tour/mount-virtual-tour").then(({ mountVirtualTour }) => {
      if (!rootRef.current) return;
      cleanup = mountVirtualTour(rootRef.current);
    });

    return () => cleanup();
  }, []);

  return (
    <div ref={rootRef} className="virtual-tour-platform">
      <div className="virtual-tour-shell rounded-[2rem]">
        <div data-role="upload-screen" className="upload-screen">
          <div className="upload-bg-glow" />
          <div className="upload-card">
            <div className="upload-logo">
              <svg width="46" height="46" viewBox="0 0 48 48" fill="none">
                <polygon points="24,5 43,38 5,38" fill="none" stroke="#d4a853" strokeWidth="2.5" strokeLinejoin="round" />
                <polygon points="24,16 36,34 12,34" fill="#d4a853" opacity="0.35" />
                <circle cx="24" cy="27" r="3" fill="#d4a853" />
              </svg>
              <span className="upload-logo-text">DINEUP TOUR</span>
            </div>

            <h2 className="upload-title">Restaurant Walkthrough Builder</h2>
            <p className="upload-subtitle">
              Upload multiple 360 panoramas, connect them into a guided venue journey, and annotate key spaces before guests book.
            </p>

            <label data-role="drop-zone" className="drop-zone">
              <input data-role="file-input" type="file" multiple accept="image/*" />
              <div className="drop-zone-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="drop-zone-title">Drop 360 images here</div>
              <div className="drop-zone-hint">JPG, PNG, WEBP · 2:1 ratio works best</div>
            </label>

            <div className="upload-steps">
              <div className="step"><span className="step-num">1</span><span>Upload panoramas</span></div>
              <span className="step-arrow">→</span>
              <div className="step"><span className="step-num">2</span><span>Arrange rooms</span></div>
              <span className="step-arrow">→</span>
              <div className="step"><span className="step-num">3</span><span>Publish the journey</span></div>
            </div>
          </div>
        </div>

        <div data-role="tour-screen" className="tour-screen hidden">
          <div data-role="viewer" className="virtual-tour-viewer" />
          <div data-role="dollhouse-container" className="dollhouse-container hidden" />

          <header className="top-bar">
            <div className="tb-left">
              <div className="brand">
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                  <polygon points="24,5 43,38 5,38" fill="none" stroke="#d4a853" strokeWidth="2.5" strokeLinejoin="round" />
                </svg>
                <span className="brand-name">DINEUP TOUR</span>
              </div>
            </div>

            <div className="tb-center">
              <span data-role="room-label" className="room-label" />
            </div>

            <div className="tb-right">
              <button data-role="dollhouse-btn" className="icon-btn" title="Dollhouse View">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </button>
              <button data-role="marker-mode-btn" className="icon-btn marker-mode-btn hidden" title="Place Marker">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </button>
              <label className="icon-btn" title="Add more panoramas">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <input data-role="file-input-add" type="file" multiple accept="image/*" className="v-hidden" />
              </label>
            </div>
          </header>
        </div>

        <div data-role="marker-popup-container" />
      </div>
    </div>
  );
}
