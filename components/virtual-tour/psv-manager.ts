import { Viewer } from "@photo-sphere-viewer/core";
import { GalleryPlugin } from "@photo-sphere-viewer/gallery-plugin";
import { CompassPlugin } from "@photo-sphere-viewer/compass-plugin";
import { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import type { TourNode } from "@/lib/restaurants";

import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/gallery-plugin/index.css";
import "@photo-sphere-viewer/compass-plugin/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";

interface PSVOptions {
  panorama: string;
  nodes: TourNode[];
  onNodeChange?: (id: string) => void;
  onMarkerAdded?: (data: { nodeId: string; markerId: string; position: { yaw: number; pitch: number } }) => void;
}

export class PhotoSphereViewerManager {
  viewer: Viewer;
  options: PSVOptions;

  constructor(container: HTMLElement, options: PSVOptions) {
    this.options = options;

    const psvNodes = options.nodes.map(node => ({
      id: node.id,
      name: node.name,
      panorama: node.panorama,
      thumbnail: node.thumbnail,
      links: node.links || [],
      markers: node.markers?.map(m => ({
        id: m.id,
        position: { yaw: 0, pitch: 0 }, // Would need real yaw/pitch for 360 mode
        html: `<div class="marker-label-3d">${m.label}</div>`,
        tooltip: m.notes,
      })) || [],
    }));

    this.viewer = new Viewer({
      container,
      panorama: options.panorama,
      navbar: false,
      plugins: [
        [VirtualTourPlugin, {
          nodes: psvNodes,
          renderNodes: true,
          arrowStyle: {
            size: 80,
            color: "#d4a853",
          }
        }],
        [GalleryPlugin, { visibleOnLoad: false }],
        [CompassPlugin, { size: "56px", position: "bottom right" }],
        [MarkersPlugin, {}],
      ],
    });

    const vtPlugin = this.viewer.getPlugin(VirtualTourPlugin) as any;
    vtPlugin.addEventListener("node-changed", ({ node }: any) => {
      if (options.onNodeChange) options.onNodeChange(node.id);
    });
  }

  destroy() {
    this.viewer.destroy();
  }

  toggleFullscreen() {
    this.viewer.toggleFullscreen();
  }

  setPanorama(url: string) {
    this.viewer.setPanorama(url);
  }
}
