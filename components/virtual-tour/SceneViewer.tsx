"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoSphereViewerManager } from "./psv-manager";
import { DollhouseEngine } from "@/lib/virtual-tour/dollhouse-engine";
import type { RestaurantTour } from "@/lib/restaurants";
import { motion, AnimatePresence } from "framer-motion";
import { Box, Maximize, Layers } from "lucide-react";
import "@/components/virtual-tour/virtual-tour.css";

interface SceneViewerProps {
  tour: RestaurantTour;
}

export function SceneViewer({ tour }: SceneViewerProps) {
  const psvContainerRef = useRef<HTMLDivElement>(null);
  const dollhouseContainerRef = useRef<HTMLDivElement>(null);
  const psvManager = useRef<PhotoSphereViewerManager | null>(null);
  const engineRef = useRef<DollhouseEngine | null>(null);
  
  const [isDollhouse, setIsDollhouse] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState(tour.nodes[0]?.id);

  // PSV Initialization
  useEffect(() => {
    if (!psvContainerRef.current || isDollhouse) return;

    psvManager.current = new PhotoSphereViewerManager(psvContainerRef.current, {
      panorama: tour.nodes.find(n => n.id === currentNodeId)?.panorama || tour.nodes[0].panorama,
      nodes: tour.nodes,
      onNodeChange: (id) => setCurrentNodeId(id),
    });

    return () => {
      psvManager.current?.destroy();
      psvManager.current = null;
    };
  }, [tour, isDollhouse, currentNodeId]);

  // Dollhouse Initialization
  useEffect(() => {
    if (!dollhouseContainerRef.current || !isDollhouse) return;

    const engine = new DollhouseEngine(dollhouseContainerRef.current);
    tour.nodes.forEach(node => {
      engine.addSphere(node.id, node.name, node.panorama, node.position);
      // Add existing markers to the 3D view
      node.markers?.forEach(m => {
        engine.addMarkerDirect(node.id, m.id, m.localPosition, m.label);
      });
    });

    engine.onSphereClick = (id) => {
        setCurrentNodeId(id);
        setIsDollhouse(false);
    };

    engine.selectSphere(currentNodeId);
    engine.show();
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [tour, isDollhouse, currentNodeId]);

  const toggleDollhouse = () => {
    setIsDollhouse(!isDollhouse);
  };

  return (
    <div className="tour-container rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden aspect-video relative bg-black">
      {/* HUD / Toolbar */}
      <div className="absolute top-6 right-6 z-[100] flex gap-2">
        <button 
          onClick={toggleDollhouse}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            isDollhouse 
            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
            : 'bg-black/60 text-white/70 hover:text-white backdrop-blur-xl border border-white/10'
          }`}
          title="Dollhouse View"
        >
          <Box size={18} />
          <span>{isDollhouse ? '360°' : 'Dollhouse'}</span>
        </button>
        <button 
          className="flex items-center justify-center rounded-xl px-3 py-2 bg-black/60 text-white/70 hover:text-white backdrop-blur-xl border border-white/10"
          onClick={() => psvManager.current?.toggleFullscreen()}
          title="Fullscreen"
        >
          <Maximize size={18} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!isDollhouse ? (
          <motion.div 
            key="psv"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
            ref={psvContainerRef}
          />
        ) : (
          <motion.div 
            key="dollhouse"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full h-full"
            ref={dollhouseContainerRef}
          />
        )}
      </AnimatePresence>
      
      {/* Scene Label (Static) */}
      {!isDollhouse && (
        <div className="absolute bottom-10 left-10 z-[60] pointer-events-none">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-1">Current Scene</p>
          <motion.h3 
            key={currentNodeId}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl font-display text-white"
          >
              {tour.nodes.find(n => n.id === currentNodeId)?.name || "Loading..." }
          </motion.h3>
        </div>
      )}
    </div>
  );
}
