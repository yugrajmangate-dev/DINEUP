import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default class DollhouseMode {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 1, 20000);
    this.camera.position.set(0, 2200, 3500);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x07070d, 1);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.minDistance = 800;
    this.controls.maxDistance = 12000;

    this.spheres = [];
    this.edges = [];
    this.textureLoader = new THREE.TextureLoader();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane();
    this.intersection = new THREE.Vector3();
    this.offset = new THREE.Vector3();
    this.isDragging = false;
    this.dragTarget = null;
    this.isShiftDown = false;
    this.pointerDownTime = 0;
    this.pointerDownPos = new THREE.Vector2();
    this.visible = false;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const directional = new THREE.DirectionalLight(0xffffff, 0.45);
    directional.position.set(500, 2000, 1000);
    this.scene.add(directional);

    this.grid = new THREE.GridHelper(8000, 40, 0x1a1a2e, 0x111122);
    this.grid.material.opacity = 0.3;
    this.grid.material.transparent = true;
    this.scene.add(this.grid);

    this.labelContainer = document.createElement("div");
    this.labelContainer.className = "dollhouse-labels";
    container.appendChild(this.labelContainer);

    this.helpTooltip = document.createElement("div");
    this.helpTooltip.className = "dollhouse-help";
    this.helpTooltip.textContent = "Drag spheres to rearrange · Click to enter · Shift+drag for height";
    container.appendChild(this.helpTooltip);

    this.onSphereClick = null;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onResize = this.onResize.bind(this);
    this.animate = this.animate.bind(this);

    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.addEventListener("pointerup", this.onPointerUp);
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);
  }

  addSphere(id, name, blobUrl) {
    if (this.spheres.find((sphere) => sphere.id === id)) return;

    const radius = 350;
    const geometry = new THREE.SphereGeometry(radius, 48, 32);
    geometry.scale(-1, 1, 1);
    const texture = this.textureLoader.load(blobUrl);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });

    const mesh = new THREE.Mesh(geometry, material);
    const count = this.spheres.length;
    const angle = count === 0 ? 0 : (count / Math.max(count + 1, 3)) * Math.PI * 2;
    const scale = count === 0 ? 0 : Math.ceil((count + 1) / 6);
    const spacing = 1200;
    mesh.position.set(
      count === 0 ? 0 : Math.cos(angle) * spacing * scale,
      0,
      count === 0 ? 0 : Math.sin(angle) * spacing * scale,
    );
    mesh.userData = { id };
    this.scene.add(mesh);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.9, radius * 1.05, 64),
      new THREE.MeshBasicMaterial({
        color: 0xd4a853,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(mesh.position.x, -radius + 5, mesh.position.z);
    this.scene.add(ring);

    const label = document.createElement("div");
    label.className = "dollhouse-label";
    label.textContent = name;
    this.labelContainer.appendChild(label);

    this.spheres.push({
      id,
      name,
      mesh,
      ring,
      label,
      radius,
      position: mesh.position,
      markers: [],
    });

    this.rebuildEdges();
  }

  show() {
    this.visible = true;
    this.container.classList.remove("hidden");
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    const center = this.getCenter();
    const distance = this.getViewDistance();
    this.camera.position.set(center.x, center.y + distance * 0.6, center.z + distance * 0.9);
    this.controls.target.copy(center);
    this.helpTooltip.classList.add("visible");
    clearTimeout(this.helpTimeout);
    this.helpTimeout = window.setTimeout(() => this.helpTooltip.classList.remove("visible"), 4000);
    this.startLoop();
  }

  hide() {
    this.visible = false;
    this.container.classList.add("hidden");
    this.helpTooltip.classList.remove("visible");
    this.stopLoop();
  }

  rebuildEdges() {
    this.edges.forEach((edge) => {
      this.scene.remove(edge);
      edge.geometry.dispose();
      edge.material.dispose();
    });
    this.edges = [];

    if (this.spheres.length < 2) return;

    for (let index = 0; index < this.spheres.length; index += 1) {
      const nextIndex = (index + 1) % this.spheres.length;
      const curve = new THREE.QuadraticBezierCurve3(
        this.spheres[index].position.clone(),
        new THREE.Vector3(
          (this.spheres[index].position.x + this.spheres[nextIndex].position.x) / 2,
          200,
          (this.spheres[index].position.z + this.spheres[nextIndex].position.z) / 2,
        ),
        this.spheres[nextIndex].position.clone(),
      );

      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(30)),
        new THREE.LineBasicMaterial({ color: 0xd4a853, transparent: true, opacity: 0.35 }),
      );
      this.scene.add(line);
      this.edges.push(line);
    }
  }

  getCenter() {
    if (!this.spheres.length) return new THREE.Vector3(0, 0, 0);
    const box = new THREE.Box3();
    this.spheres.forEach((sphere) => box.expandByPoint(sphere.position));
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }

  getViewDistance() {
    if (this.spheres.length <= 1) return 2500;
    const box = new THREE.Box3();
    this.spheres.forEach((sphere) => box.expandByPoint(sphere.position));
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDimension = Math.max(size.x, size.y, size.z);
    return Math.abs(maxDimension / 2 / Math.tan((this.camera.fov * Math.PI) / 360)) * 1.3;
  }

  setMousePosition(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onPointerDown(event) {
    if (event.button !== 0) return;
    this.pointerDownTime = performance.now();
    this.pointerDownPos.set(event.clientX, event.clientY);
    this.setMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hits = this.raycaster.intersectObjects(this.spheres.map((sphere) => sphere.mesh));
    if (!hits.length) return;

    this.controls.enabled = false;
    this.isDragging = true;
    this.dragTarget = hits[0].object;
    if (this.isShiftDown) {
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0;
      cameraDirection.normalize();
      this.dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, this.dragTarget.position);
    } else {
      this.dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), this.dragTarget.position);
    }
    this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection);
    this.offset.copy(this.dragTarget.position).sub(this.intersection);
    this.renderer.domElement.style.cursor = "grabbing";
  }

  onPointerMove(event) {
    this.setMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.isDragging && this.dragTarget) {
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
        if (this.isShiftDown) {
          this.dragTarget.position.y = this.intersection.y + this.offset.y;
        } else {
          this.dragTarget.position.x = this.intersection.x + this.offset.x;
          this.dragTarget.position.z = this.intersection.z + this.offset.z;
        }

        const sphere = this.spheres.find((entry) => entry.id === this.dragTarget.userData.id);
        if (sphere) {
          sphere.ring.position.x = this.dragTarget.position.x;
          sphere.ring.position.y = this.dragTarget.position.y - sphere.radius + 5;
          sphere.ring.position.z = this.dragTarget.position.z;
        }

        this.rebuildEdges();
      }
      return;
    }

    this.renderer.domElement.style.cursor = this.raycaster.intersectObjects(this.spheres.map((sphere) => sphere.mesh)).length ? "grab" : "default";
  }

  onPointerUp(event) {
    if (!this.isDragging) return;
    const elapsed = performance.now() - this.pointerDownTime;
    const distance = Math.hypot(event.clientX - this.pointerDownPos.x, event.clientY - this.pointerDownPos.y);
    if (elapsed < 300 && distance < 8 && this.dragTarget) this.onSphereClick?.(this.dragTarget.userData.id);
    this.isDragging = false;
    this.dragTarget = null;
    this.controls.enabled = true;
    this.renderer.domElement.style.cursor = "default";
  }

  onKeyDown(event) {
    if (event.key === "Shift") this.isShiftDown = true;
  }

  onKeyUp(event) {
    if (event.key === "Shift") this.isShiftDown = false;
  }

  onResize() {
    if (!this.visible) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  updateLabels() {
    const width = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;

    this.spheres.forEach((sphere) => {
      const point = sphere.position.clone();
      point.y += sphere.radius + 60;
      point.project(this.camera);

      if (point.z > 1) {
        sphere.label.style.display = "none";
        return;
      }

      sphere.label.style.display = "block";
      sphere.label.style.left = `${(point.x * 0.5 + 0.5) * width}px`;
      sphere.label.style.top = `${(-point.y * 0.5 + 0.5) * height}px`;
    });
  }

  startLoop() {
    if (this.animationId) return;
    this.animate();
  }

  stopLoop() {
    if (!this.animationId) return;
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
  }

  animate() {
    if (!this.visible) return;
    this.animationId = requestAnimationFrame(this.animate);
    const time = performance.now() * 0.001;
    this.spheres.forEach((sphere, index) => {
      sphere.mesh.rotation.y = time * 0.08 + index * 0.5;
      sphere.ring.material.opacity = 0.2 + 0.1 * Math.sin(time * 1.5 + index);
    });
    this.controls.update();
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stopLoop();
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp);
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    this.renderer.dispose();
    this.labelContainer.remove();
    this.helpTooltip.remove();
  }

  getMarkers(sphereId) {
    const sphere = this.spheres.find((entry) => entry.id === sphereId);
    if (!sphere) return [];
    return sphere.markers.map((marker) => ({
      markerId: marker.markerId,
      localPosition: { x: marker.localPosition.x, y: marker.localPosition.y, z: marker.localPosition.z },
      label: marker.label,
      linkUrl: marker.linkUrl,
      imageUrl: marker.imageUrl,
      notes: marker.notes,
    }));
  }

  addMarkerDirect(sphereId, markerId, localPosition) {
    const sphere = this.spheres.find((entry) => entry.id === sphereId);
    if (!sphere) return null;

    const marker = {
      markerId,
      localPosition: new THREE.Vector3(localPosition.x, localPosition.y, localPosition.z),
      label: "",
      linkUrl: "",
      imageUrl: "",
      notes: "",
    };

    sphere.markers.push(marker);
    return marker;
  }

  updateMarker(sphereId, markerId, data) {
    const sphere = this.spheres.find((entry) => entry.id === sphereId);
    const marker = sphere?.markers.find((entry) => entry.markerId === markerId);
    if (!marker) return;
    marker.label = data.label ?? marker.label;
    marker.linkUrl = data.linkUrl ?? marker.linkUrl;
    marker.imageUrl = data.imageUrl ?? marker.imageUrl;
    marker.notes = data.notes ?? marker.notes;
  }

  removeMarker(sphereId, markerId) {
    const sphere = this.spheres.find((entry) => entry.id === sphereId);
    if (!sphere) return;
    sphere.markers = sphere.markers.filter((marker) => marker.markerId !== markerId);
  }
}
