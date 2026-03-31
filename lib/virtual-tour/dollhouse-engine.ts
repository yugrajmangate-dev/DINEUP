import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

export interface DollhouseSphere {
  id: string;
  name: string;
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  label: HTMLElement;
  radius: number;
  position: THREE.Vector3;
  markers: DollhouseMarker[];
}

export interface DollhouseMarker {
  markerId: string;
  localPosition: THREE.Vector3;
  label: string;
  linkUrl: string;
  imageUrl: string;
  notes: string;
  sprite: THREE.Sprite;
  htmlLabel: HTMLElement;
}

export class DollhouseEngine {
  container: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  spheres: DollhouseSphere[] = [];
  edges: THREE.Line[] = [];
  textureLoader = new THREE.TextureLoader();
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  dragPlane = new THREE.Plane();
  intersection = new THREE.Vector3();
  offset = new THREE.Vector3();
  
  isDragging = false;
  dragTarget: THREE.Object3D | null = null;
  isShiftDown = false;
  pointerDownTime = 0;
  pointerDownPos = new THREE.Vector2();
  visible = false;
  
  labelContainer: HTMLElement;
  markerLabelContainer: HTMLElement;
  helpTooltip: HTMLElement;
  
  onSphereClick?: (id: string, name: string) => void;
  onMarkerPlaced?: (data: { sphereId: string; markerId: string; localPosition: { x: number; y: number; z: number }; worldPosition: { x: number; y: number; z: number } }) => void;
  onMarkerClick?: (data: { sphereId: string; markerId: string; markerData: any }) => void;
  onSpheresMoved?: (spheres: { id: string; position: { x: number; y: number; z: number } }[]) => void;
  onSelectionChanged?: (sphereId: string | null) => void;

  selectedSphereId: string | null = null;
  dragMode: 'sphere' | 'marker' | null = null;
  dragSphereId: string | null = null;
  dragMarkerId: string | null = null;

  private _animationId: number | null = null;
  private _helpTimeout?: NodeJS.Timeout;

  constructor(container: HTMLElement) {
    this.container = container;
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight || 1,
      1,
      20000
    );
    this.camera.position.set(0, 2200, 3500);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x07070d, 1);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.minDistance = 800;
    this.controls.maxDistance = 12000;
    this.controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(500, 2000, 1000);
    this.scene.add(dirLight);

    const grid = new THREE.GridHelper(8000, 40, 0x1a1a2e, 0x111122);
    (grid.material as THREE.Material).opacity = 0.3;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);

    this.labelContainer = document.createElement('div');
    this.labelContainer.className = 'dollhouse-labels';
    container.appendChild(this.labelContainer);

    this.markerLabelContainer = document.createElement('div');
    this.markerLabelContainer.className = 'dollhouse-labels';
    container.appendChild(this.markerLabelContainer);

    this.helpTooltip = document.createElement('div');
    this.helpTooltip.className = 'dollhouse-help';
    this.helpTooltip.innerHTML = '🖱️ Drag spheres to rearrange · Click to enter';
    container.appendChild(this.helpTooltip);

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onResize = this._onResize.bind(this);

    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this._onPointerMove);
    this.renderer.domElement.addEventListener('pointerup', this._onPointerUp);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('resize', this._onResize);
  }

  addSphere(id: string, name: string, panorama: string, initialPosition?: { x: number; y: number; z: number }) {
    if (this.spheres.find(s => s.id === id)) return;

    const radius = 350;
    const geometry = new THREE.SphereGeometry(radius, 48, 32);
    geometry.scale(-1, 1, 1);

    const texture = this.textureLoader.load(panorama);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });

    const mesh = new THREE.Mesh(geometry, material);

    if (initialPosition) {
      mesh.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
    } else {
      const count = this.spheres.length;
      const spacing = 1200;
      if (count === 0) {
        mesh.position.set(0, 0, 0);
      } else {
        const angle = (count / Math.max(count + 1, 3)) * Math.PI * 2;
        mesh.position.set(
          Math.cos(angle) * spacing * Math.ceil((count + 1) / 6),
          0,
          Math.sin(angle) * spacing * Math.ceil((count + 1) / 6)
        );
      }
    }

    mesh.userData = { id, name, type: 'dollhouse-sphere' };
    this.scene.add(mesh);

    const ringGeo = new THREE.RingGeometry(radius * 0.9, radius * 1.05, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4a853,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(mesh.position.x, mesh.position.y - radius + 5, mesh.position.z);
    this.scene.add(ring);

    const label = document.createElement('div');
    label.className = 'dollhouse-label';
    label.textContent = name;
    this.labelContainer.appendChild(label);

    const sphereData: DollhouseSphere = {
      id,
      name,
      mesh,
      ring,
      label,
      radius,
      position: mesh.position,
      markers: [],
    };
    this.spheres.push(sphereData);
    this._rebuildEdges();
  }

  selectSphere(id: string | null) {
    this.selectedSphereId = id;
    this.spheres.forEach(s => {
      if (s.id === id) {
        (s.ring.material as THREE.MeshBasicMaterial).opacity = 0.8;
        (s.ring.material as THREE.MeshBasicMaterial).color.set(0xff9f1c);
      } else {
        (s.ring.material as THREE.MeshBasicMaterial).opacity = 0.25;
        (s.ring.material as THREE.MeshBasicMaterial).color.set(0xd4a853);
      }
    });
    if (this.onSelectionChanged) this.onSelectionChanged(id);
  }

  addMarkerDirect(sphereId: string, markerId: string, localPos: { x: number; y: number; z: number }, labelContent: string) {
    const sphere = this.spheres.find(s => s.id === sphereId);
    if (!sphere) return;

    const spriteMap = new THREE.TextureLoader().load('/icons/marker.png');
    const spriteMaterial = new THREE.SpriteMaterial({ map: spriteMap, color: 0xffffff });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(120, 120, 1);
    
    const localVec = new THREE.Vector3(localPos.x, localPos.y, localPos.z);
    sprite.position.copy(localVec);
    sphere.mesh.add(sprite);

    const htmlLabel = document.createElement('div');
    htmlLabel.className = 'dollhouse-marker-label';
    htmlLabel.textContent = labelContent || 'New Marker';
    this.markerLabelContainer.appendChild(htmlLabel);

    const marker: DollhouseMarker = {
        markerId,
        localPosition: localVec,
        label: labelContent,
        linkUrl: '',
        imageUrl: '',
        notes: '',
        sprite,
        htmlLabel
    };
    sphere.markers.push(marker);
  }

  show() {
    this.visible = true;
    this._animate();
  }

  destroy() {
    if (this._animationId) cancelAnimationFrame(this._animationId);
    this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this._onPointerUp);
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }

  private _animate() {
    this._animationId = requestAnimationFrame(this._animate.bind(this));
    this.controls.update();
    this._updateLabels();
    this.renderer.render(this.scene, this.camera);
  }

  private _updateLabels() {
    this.spheres.forEach(s => {
      const pos = s.position.clone();
      pos.y += s.radius + 100;
      pos.project(this.camera);
      
      const x = (pos.x * 0.5 + 0.5) * this.container.clientWidth;
      const y = (pos.y * -0.5 + 0.5) * this.container.clientHeight;
      
      s.label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      s.label.style.opacity = pos.z > 1 ? '0' : '1';
    });
  }

  private _onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Check markers first if we have a shift key or special mode?
    // Actually, check spheres.
    const sphereMeshes = this.spheres.map(s => s.mesh);
    const intersects = this.raycaster.intersectObjects(sphereMeshes);
    
    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      const sphereId = hitObj.userData.id;

      if (this.isShiftDown) {
        // Place marker
        const localPos = intersects[0].point.clone().sub(hitObj.position);
        const markerId = `m-${Date.now()}`;
        this.addMarkerDirect(sphereId, markerId, localPos, 'New Marker');
        if (this.onMarkerPlaced) {
          this.onMarkerPlaced({
            sphereId,
            markerId,
            localPosition: { x: localPos.x, y: localPos.y, z: localPos.z },
            worldPosition: { x: intersects[0].point.x, y: intersects[0].point.y, z: intersects[0].point.z }
          });
        }
        return;
      }

      this.isDragging = true;
      this.dragTarget = hitObj;
      this.dragMode = 'sphere';
      this.dragSphereId = sphereId;
      this.controls.enabled = false;
      this.dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), hitObj.position);
      this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection);
      this.offset.copy(hitObj.position).sub(this.intersection);
      this.pointerDownTime = performance.now();
      
      this.selectSphere(sphereId);
    } else {
        this.selectSphere(null);
    }
  }

  private _onPointerMove(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (!this.isDragging || !this.dragTarget) return;
    
    if (this.dragMode === 'sphere') {
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
        this.dragTarget.position.x = this.intersection.x + this.offset.x;
        this.dragTarget.position.z = this.intersection.z + this.offset.z;
        
        const sphere = this.spheres.find(s => s.id === this.dragSphereId);
        if (sphere) {
          sphere.ring.position.x = sphere.position.x;
          sphere.ring.position.z = sphere.position.z;
        }
        this._rebuildEdges();
      }
    }
  }

  private _onPointerUp() {
    if (this.isDragging && performance.now() - this.pointerDownTime < 250) {
        // Clicked!
        if (this.dragTarget && this.onSphereClick) {
            this.onSphereClick(this.dragTarget.userData.id, this.dragTarget.userData.name);
        }
    }
    
    if (this.isDragging && this.dragMode === 'sphere' && this.onSpheresMoved) {
        const positions = this.spheres.map(s => ({
            id: s.id,
            position: { x: s.position.x, y: s.position.y, z: s.position.z }
        }));
        this.onSpheresMoved(positions);
    }
    
    this.isDragging = false;
    this.dragTarget = null;
    this.dragMode = null;
    this.controls.enabled = true;
  }

  private _onKeyDown(e: KeyboardEvent) { if (e.shiftKey) this.isShiftDown = true; }
  private _onKeyUp(e: KeyboardEvent) { if (!e.shiftKey) this.isShiftDown = false; }
  private _onResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private _rebuildEdges() {
    this.edges.forEach(e => this.scene.remove(e));
    this.edges = [];
    const n = this.spheres.length;
    if (n < 2) return;
    for (let i = 0; i < n; i++) {
      const nextIdx = (i + 1) % n;
      const points = [this.spheres[i].position, this.spheres[nextIdx].position];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: 0xd4a853, transparent: true, opacity: 0.3 });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.edges.push(line);
    }
  }
}
