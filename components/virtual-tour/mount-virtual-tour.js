import { Viewer } from "@photo-sphere-viewer/core";
import { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import { GalleryPlugin } from "@photo-sphere-viewer/gallery-plugin";
import { CompassPlugin } from "@photo-sphere-viewer/compass-plugin";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";

import DollhouseMode from "@/components/virtual-tour/dollhouse-mode";
import MarkerPopup from "@/components/virtual-tour/marker-popup";

export function mountVirtualTour(root) {
  const uploadScreen = root.querySelector('[data-role="upload-screen"]');
  const tourScreen = root.querySelector('[data-role="tour-screen"]');
  const fileInput = root.querySelector('[data-role="file-input"]');
  const fileInputAdd = root.querySelector('[data-role="file-input-add"]');
  const dropZone = root.querySelector('[data-role="drop-zone"]');
  const roomLabel = root.querySelector('[data-role="room-label"]');
  const dollhouseBtn = root.querySelector('[data-role="dollhouse-btn"]');
  const markerModeBtn = root.querySelector('[data-role="marker-mode-btn"]');
  const viewerElement = root.querySelector('[data-role="viewer"]');
  const dollhouseContainer = root.querySelector('[data-role="dollhouse-container"]');
  const markerPopupContainer = root.querySelector('[data-role="marker-popup-container"]');

  let viewer = null;
  let tourPlugin = null;
  let markersPlugin = null;
  let dollhouse = null;
  let markerPopup = null;
  let nodes = [];
  let currentMode = "tour";
  let psvMarkerMode = false;
  let tooltip = null;
  const createdUrls = new Set();

  const syncMarkersToViewer = (nodeId) => {
    if (!markersPlugin || !dollhouse) return;
    markersPlugin.clearMarkers();
    dollhouse.getMarkers(nodeId).forEach((marker) => {
      const { x, y, z } = marker.localPosition;
      const length = Math.sqrt(x * x + y * y + z * z) || 1;
      markersPlugin.addMarker({
        id: marker.markerId,
        position: { yaw: Math.atan2(x, z), pitch: Math.asin(y / length) },
        html: `<div class="marker-label-3d">${marker.label || "Pin"}</div>`,
        anchor: "bottom center",
        tooltip: marker.notes || undefined,
        data: { nodeId },
      });
    });
  };

  const togglePsvMarkerMode = (forceOff) => {
    psvMarkerMode = forceOff === false ? false : !psvMarkerMode;
    markerModeBtn.classList.toggle("active", psvMarkerMode);
    viewer?.container.style.setProperty("cursor", psvMarkerMode ? "crosshair" : "");

    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "marker-mode-tooltip";
      tooltip.textContent = "Click anywhere in the 360 view to drop a marker · ESC to cancel";
      tourScreen.appendChild(tooltip);
    }

    tooltip.classList.toggle("visible", psvMarkerMode);
  };

  const switchToDollhouse = () => {
    currentMode = "dollhouse";
    dollhouseBtn.classList.add("active");
    markerModeBtn.classList.add("hidden");
    if (psvMarkerMode) togglePsvMarkerMode(false);
    roomLabel.textContent = "Dollhouse View";
    viewerElement.style.visibility = "hidden";
    dollhouse?.show();
  };

  const switchToTour = (nodeId) => {
    currentMode = "tour";
    dollhouseBtn.classList.remove("active");
    markerModeBtn.classList.remove("hidden");
    dollhouse?.hide();
    viewerElement.style.visibility = "visible";
    if (nodeId && tourPlugin) tourPlugin.setCurrentNode(nodeId);
    const activeNodeId = nodeId || tourPlugin?.getCurrentNode()?.id || nodes[0]?.id;
    roomLabel.textContent = nodes.find((node) => node.id === activeNodeId)?.name || "Virtual Tour";
    if (activeNodeId) syncMarkersToViewer(activeNodeId);
  };

  const buildLinks = () => {
    nodes.forEach((node, index) => {
      node.links = [];
      if (nodes.length < 2) return;
      const nextIndex = (index + 1) % nodes.length;
      const prevIndex = (index - 1 + nodes.length) % nodes.length;
      node.links.push({ nodeId: nodes[nextIndex].id, position: { yaw: 0, pitch: -0.3 } });
      if (nodes.length > 2) node.links.push({ nodeId: nodes[prevIndex].id, position: { yaw: Math.PI, pitch: -0.3 } });
    });
  };

  const initDollhouse = () => {
    dollhouse = new DollhouseMode(dollhouseContainer);
    nodes.forEach((node) => dollhouse.addSphere(node.id, node.name, node._blobUrl));
    dollhouse.onSphereClick = (nodeId) => switchToTour(nodeId);

    markerPopup = new MarkerPopup(markerPopupContainer);
    markerPopup.onSave = (data) => {
      dollhouse.updateMarker(data.sphereId, data.markerId, data);
      syncMarkersToViewer(data.sphereId);
    };
    markerPopup.onDelete = (markerId, sphereId) => {
      dollhouse.removeMarker(sphereId, markerId);
      try {
        markersPlugin?.removeMarker(markerId);
      } catch {}
    };
  };

  const initViewer = () => {
    uploadScreen.classList.add("hidden");
    tourScreen.classList.remove("hidden");

    window.setTimeout(() => {
      viewer = new Viewer({
        container: viewerElement,
        loadingImg: null,
        touchmoveTwoFingers: false,
        mousewheelCtrlKey: false,
        defaultZoomLvl: 0,
        navbar: false,
        plugins: [
          [VirtualTourPlugin, { nodes, startNodeId: nodes[0].id, transitionOptions: { speed: 1200, effect: "black", rotation: true } }],
          [MarkersPlugin, {}],
          [GalleryPlugin, { thumbnailSize: { width: 100, height: 60 }, visibleOnLoad: false }],
          [CompassPlugin, { size: "60px", position: "bottom right" }],
        ],
      });

      tourPlugin = viewer.getPlugin(VirtualTourPlugin);
      markersPlugin = viewer.getPlugin(MarkersPlugin);
      roomLabel.textContent = nodes[0].name;

      tourPlugin.addEventListener("node-changed", ({ node }) => {
        roomLabel.textContent = node.name || node.id;
        syncMarkersToViewer(node.id);
      });

      markersPlugin.addEventListener("select-marker", ({ marker }) => {
        if (psvMarkerMode) return;
        const nodeId = marker.data?.nodeId || tourPlugin.getCurrentNode()?.id;
        const markerData = dollhouse?.getMarkers(nodeId).find((entry) => entry.markerId === marker.id);
        if (!markerData) return;
        markerPopup?.open({ markerId: marker.id, sphereId: nodeId, ...markerData, isNew: false });
      });

      initDollhouse();

      viewer.addEventListener("click", (event) => {
        if (!psvMarkerMode) return;
        const currentNodeId = tourPlugin.getCurrentNode()?.id;
        const sphere = dollhouse?.spheres.find((entry) => entry.id === currentNodeId);
        if (!currentNodeId || !sphere) return;
        const { yaw, pitch } = event.data;
        const radius = sphere.radius || 350;
        const localPosition = {
          x: radius * Math.sin(yaw) * Math.cos(pitch),
          y: radius * Math.sin(pitch),
          z: radius * Math.cos(yaw) * Math.cos(pitch),
        };
        const markerId = `marker_psv_${Date.now()}`;
        dollhouse.addMarkerDirect(currentNodeId, markerId, localPosition);
        syncMarkersToViewer(currentNodeId);
        markerPopup?.open({ markerId, sphereId: currentNodeId, localPosition, label: "", linkUrl: "", imageUrl: "", notes: "", isNew: true });
        togglePsvMarkerMode(false);
      });

      markerModeBtn.classList.remove("hidden");
    }, 50);
  };

  const handleFiles = (files) => {
    const images = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!images.length) return;

    const newNodes = images.map((file, index) => {
      const url = URL.createObjectURL(file);
      createdUrls.add(url);
      return {
        id: `n_${Date.now()}_${index}`,
        name: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        panorama: url,
        thumbnail: url,
        links: [],
        _blobUrl: url,
      };
    });

    nodes = [...nodes, ...newNodes];
    buildLinks();

    if (!viewer) {
      initViewer();
      return;
    }

    tourPlugin.setNodes(nodes);
    tourPlugin.setCurrentNode(newNodes[0].id);
    newNodes.forEach((node) => dollhouse?.addSphere(node.id, node.name, node._blobUrl));
  };

  const onEscape = (event) => {
    if (event.key === "Escape" && psvMarkerMode) togglePsvMarkerMode(false);
  };

  fileInput.addEventListener("change", (event) => handleFiles(event.target.files));
  fileInputAdd.addEventListener("change", (event) => handleFiles(event.target.files));
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    handleFiles(event.dataTransfer.files);
  });
  dollhouseBtn.addEventListener("click", () => {
    if (currentMode === "tour") switchToDollhouse();
    else switchToTour();
  });
  markerModeBtn.addEventListener("click", () => {
    if (!viewer || currentMode !== "tour") return;
    togglePsvMarkerMode();
  });
  document.addEventListener("keydown", onEscape);

  return () => {
    document.removeEventListener("keydown", onEscape);
    markerPopup?.dispose();
    dollhouse?.dispose();
    try {
      viewer?.destroy();
    } catch {}
    createdUrls.forEach((url) => URL.revokeObjectURL(url));
  };
}
