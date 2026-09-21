import * as THREE from "three";

export type RelightAngles = { azimuth: number; elevation: number };
export type RelightView = "perspective" | "front";
export type RelightInteraction = "idle" | "globe" | "light";

export type RelightLight = {
  id: string;
  name: string;
  role: string;
  quality: string;
  angles: RelightAngles;
  distance: number;
  beamAngle: number;
  intensity: number;
  temperature: number;
  enabled: boolean;
};

export type Relight3DOptions = {
  lights: RelightLight[];
  selectedLightId: string;
  snapEnabled?: boolean;
  onLightChange?: (lightId: string, angles: RelightAngles) => void;
  onLightSelect?: (lightId: string) => void;
  onInteractionChange?: (interaction: RelightInteraction) => void;
};

export type Relight3DController = {
  setLights: (lights: RelightLight[]) => void;
  setSelectedLight: (lightId: string) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setView: (view: RelightView) => void;
  resetView: () => void;
  destroy: () => void;
};

type LightVisual = {
  orbit: THREE.Group;
  orbitMaterials: OrbitMaterial[];
  root: THREE.Group;
  handle: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  pickHandle: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  beam: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
  path: THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial>;
  spot: THREE.SpotLight;
  target: THREE.Object3D;
};

type OrbitMaterial = THREE.LineBasicMaterial | THREE.MeshBasicMaterial | THREE.MeshPhysicalMaterial;

const GLOBE_RADIUS = 1.62;
const MIN_LIGHT_DISTANCE = 0.9;
const MAX_LIGHT_DISTANCE = 2.8;
const DEG = Math.PI / 180;
const TARGET = new THREE.Vector3(0, -0.06, 0);

function colorForTemperature(temperature: number) {
  if (temperature < 3400) return new THREE.Color(0xffa85b);
  if (temperature < 4700) return new THREE.Color(0xffd6a8);
  if (temperature < 6000) return new THREE.Color(0xf6f5ec);
  if (temperature < 7400) return new THREE.Color(0xc8ddff);
  return new THREE.Color(0x8db6ff);
}

function sphericalPosition(angles: RelightAngles, radius = GLOBE_RADIUS) {
  const azimuth = angles.azimuth * DEG;
  const elevation = angles.elevation * DEG;
  return new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(elevation) * radius,
    Math.sin(elevation) * radius,
    Math.cos(azimuth) * Math.cos(elevation) * radius,
  );
}

function normalizedAngles(position: THREE.Vector3): RelightAngles {
  const point = position.clone().normalize();
  const elevation = THREE.MathUtils.clamp(Math.asin(point.y) / DEG, -90, 90);
  if (Math.abs(elevation) >= 89.999) return { azimuth: 0, elevation: Math.sign(elevation) * 90 };
  let azimuth = Math.atan2(point.x, point.z) / DEG;
  azimuth = ((azimuth + 180) % 360 + 360) % 360 - 180;
  return { azimuth, elevation };
}

function snapAngles(angles: RelightAngles, step = 15): RelightAngles {
  const poleThreshold = 90 - step / 2;
  if (angles.elevation >= poleThreshold) return { azimuth: 0, elevation: 90 };
  if (angles.elevation <= -poleThreshold) return { azimuth: 0, elevation: -90 };
  const azimuth = Math.round(angles.azimuth / step) * step;
  return {
    azimuth: ((azimuth + 180) % 360 + 360) % 360 - 180,
    elevation: THREE.MathUtils.clamp(Math.round(angles.elevation / step) * step, -90, 90),
  };
}

function createCurve(points: THREE.Vector3[], opacity: number, materials: OrbitMaterial[], color = 0xaeb8bb) {
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  material.userData.baseOpacity = opacity;
  materials.push(material);
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    material,
  );
}

function createGlobeGrid(materials: OrbitMaterial[]) {
  const grid = new THREE.Group();
  [-60, -30, 0, 30, 60].forEach((latitude) => {
    const phi = latitude * DEG;
    const points: THREE.Vector3[] = [];
    for (let longitude = 0; longitude <= 360; longitude += 3) {
      const theta = longitude * DEG;
      points.push(new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * GLOBE_RADIUS,
        Math.sin(phi) * GLOBE_RADIUS,
        Math.cos(theta) * Math.cos(phi) * GLOBE_RADIUS,
      ));
    }
    grid.add(createCurve(points, latitude === 0 ? 0.22 : 0.13, materials));
  });
  for (let longitude = 0; longitude < 360; longitude += 30) {
    const theta = longitude * DEG;
    const points: THREE.Vector3[] = [];
    for (let latitude = -90; latitude <= 90; latitude += 3) {
      const phi = latitude * DEG;
      points.push(new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * GLOBE_RADIUS,
        Math.sin(phi) * GLOBE_RADIUS,
        Math.cos(theta) * Math.cos(phi) * GLOBE_RADIUS,
      ));
    }
    grid.add(createCurve(points, longitude % 90 === 0 ? 0.2 : 0.105, materials));
  }
  const nodeGeometry = new THREE.SphereGeometry(0.022, 10, 8);
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xb8c0c2, transparent: true, opacity: 0.23, depthWrite: false });
  nodeMaterial.userData.baseOpacity = 0.23;
  materials.push(nodeMaterial);
  [-60, -30, 0, 30, 60].forEach((latitude) => {
    for (let longitude = 0; longitude < 360; longitude += 45) {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.copy(sphericalPosition({ azimuth: longitude, elevation: latitude }, GLOBE_RADIUS + 0.006));
      grid.add(node);
    }
  });
  return grid;
}

function createOrbitSphere() {
  const group = new THREE.Group();
  const materials: OrbitMaterial[] = [];
  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x6a7477, transparent: true, opacity: 0.075, roughness: 0.3, metalness: 0.05,
    clearcoat: 0.65, clearcoatRoughness: 0.55, side: THREE.DoubleSide, depthWrite: false,
  });
  shellMaterial.userData.baseOpacity = 0.075;
  materials.push(shellMaterial);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 72, 48), shellMaterial);
  shell.renderOrder = -2;

  const innerMaterial = new THREE.MeshBasicMaterial({
    color: 0x566164, transparent: true, opacity: 0.045, side: THREE.BackSide, depthWrite: false,
  });
  innerMaterial.userData.baseOpacity = 0.045;
  materials.push(innerMaterial);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS * 0.985, 56, 36), innerMaterial);
  inner.renderOrder = -2;
  group.add(shell, createGlobeGrid(materials), inner);
  return { group, materials };
}

function createSubject() {
  const group = new THREE.Group();
  group.position.y = -0.06;
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 1.28),
    new THREE.MeshPhysicalMaterial({ color: 0x111517, roughness: 0.72, metalness: 0.05, transparent: true, opacity: 0.96, side: THREE.DoubleSide }),
  );
  card.receiveShadow = true;
  group.add(card);
  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(card.geometry),
    new THREE.LineBasicMaterial({ color: 0x738084, transparent: true, opacity: 0.55 }),
  );
  border.position.z = 0.006;
  group.add(border);
  const figureMaterial = new THREE.MeshStandardMaterial({ color: 0x32393b, roughness: 0.82, metalness: 0.02 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), figureMaterial);
  head.position.set(0, 0.28, 0.065);
  head.castShadow = true;
  group.add(head);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.32, 8, 20), figureMaterial);
  torso.scale.set(1.08, 1.12, 0.42);
  torso.position.set(0, -0.13, 0.065);
  torso.castShadow = true;
  group.add(torso);
  return group;
}

function orientCone(cone: THREE.Object3D, start: THREE.Vector3, target: THREE.Vector3, beamAngle: number) {
  const direction = start.clone().sub(target);
  const distance = direction.length();
  const halfAngle = THREE.MathUtils.clamp(beamAngle / 2, 5, 75) * DEG;
  const radiusScale = Math.tan(halfAngle) * distance / 0.57;
  cone.position.copy(start).add(target).multiplyScalar(0.5);
  cone.scale.set(radiusScale, distance, radiusScale);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) material.forEach((item) => item.dispose());
  else material.dispose();
}

export function createRelight3D(container: HTMLElement, initial: Relight3DOptions): Relight3DController {
  const probe = document.createElement("canvas");
  if (!probe.getContext("webgl2") && !probe.getContext("webgl")) throw new Error("WEBGL_UNAVAILABLE");

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "relight-webgl-canvas";
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute("aria-label", "多灯三维光位控制器：每盏灯拥有独立距离球，拖动球体旋转视角，点击并拖动光点调整方向");
  renderer.domElement.dataset.renderMode = "webgl-multilight";
  container.querySelector(".webgl-loading")?.remove();
  container.querySelectorAll("canvas").forEach((canvas) => canvas.remove());
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080a0b, 0.055);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 40);
  const perspectivePosition = new THREE.Vector3(4.5, 2.75, 6.7);
  const frontPosition = new THREE.Vector3(0, 0.15, 8.2);
  camera.position.copy(perspectivePosition);
  camera.lookAt(0, 0, 0);

  const world = new THREE.Group();
  world.rotation.set(-0.07, -0.24, 0.02);
  scene.add(world);
  world.add(createSubject());
  scene.add(new THREE.HemisphereLight(0x82949c, 0x111415, 0.62));
  scene.add(new THREE.AmbientLight(0x7c8a8d, 0.32));

  let lights = initial.lights.map((light) => ({ ...light, angles: { ...light.angles } }));
  let selectedLightId = initial.selectedLightId;
  let snapEnabled = initial.snapEnabled ?? true;
  let interaction: RelightInteraction = "idle";
  let destroyed = false;
  let frame = 0;
  let activePointer: number | null = null;
  let activeLightId: string | null = null;
  let globeStart = { x: 0, y: 0, quaternion: world.quaternion.clone() };

  const visuals = new Map<string, LightVisual>();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const localSphere = new THREE.Sphere(new THREE.Vector3(), GLOBE_RADIUS);

  function createLightVisual(lightId: string) {
    const { group: orbit, materials: orbitMaterials } = createOrbitSphere();
    orbit.userData.lightId = lightId;
    const root = new THREE.Group();
    root.userData.lightId = lightId;
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 28, 20),
      new THREE.MeshStandardMaterial({ color: 0xf6f5ec, emissive: 0xf6f5ec, emissiveIntensity: 2.5, roughness: 0.25, transparent: true }),
    );
    handle.castShadow = true;
    const pickHandle = new THREE.Mesh(
      new THREE.SphereGeometry(0.205, 18, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    pickHandle.userData.lightId = lightId;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.145, 0.009, 10, 52),
      new THREE.MeshBasicMaterial({ color: 0xd6ff4b, transparent: true, opacity: 0.32, depthWrite: false }),
    );
    root.add(handle, pickHandle, ring);
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.57, 1, 40, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xf6f5ec, transparent: true, opacity: 0.15, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const path = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: 0xeaf4f3, transparent: true, opacity: 0.4, dashSize: 0.07, gapSize: 0.045 }),
    );
    const spot = new THREE.SpotLight(0xffffff, 10, 5.5, Math.PI / 5, 0.65, 1.25);
    spot.shadow.mapSize.set(512, 512);
    spot.shadow.bias = -0.001;
    const target = new THREE.Object3D();
    target.position.copy(TARGET);
    spot.target = target;
    world.add(orbit, root, beam, path, spot, target);
    const visual = { orbit, orbitMaterials, root, handle, pickHandle, ring, beam, path, spot, target };
    visuals.set(lightId, visual);
    return visual;
  }

  function removeLightVisual(lightId: string) {
    const visual = visuals.get(lightId);
    if (!visual) return;
    world.remove(visual.orbit, visual.root, visual.beam, visual.path, visual.spot, visual.target);
    visual.orbit.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        disposeMaterial(object.material);
      }
    });
    visual.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        disposeMaterial(object.material);
      }
    });
    visual.beam.geometry.dispose(); disposeMaterial(visual.beam.material);
    visual.path.geometry.dispose(); disposeMaterial(visual.path.material);
    visual.spot.dispose();
    visuals.delete(lightId);
  }

  function updateVisual(light: RelightLight, visual: LightVisual) {
    const distance = THREE.MathUtils.clamp(light.distance ?? GLOBE_RADIUS, MIN_LIGHT_DISTANCE, MAX_LIGHT_DISTANCE);
    const position = sphericalPosition(light.angles, distance);
    const selected = light.id === selectedLightId;
    const color = colorForTemperature(light.temperature);
    const orbitColor = color.clone().lerp(new THREE.Color(0x859094), selected ? 0.5 : 0.75);
    const orbitVisibility = (selected ? 1 : 0.26) * (light.enabled ? 1 : 0.38);
    visual.orbit.scale.setScalar(distance / GLOBE_RADIUS);
    visual.orbitMaterials.forEach((material) => {
      material.color.copy(orbitColor);
      material.opacity = Number(material.userData.baseOpacity ?? material.opacity) * orbitVisibility;
    });
    visual.root.position.copy(position);
    visual.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize().negate());
    visual.handle.material.color.copy(color);
    visual.handle.material.emissive.copy(color);
    visual.handle.material.emissiveIntensity = selected ? 3.5 : 2.15;
    visual.handle.material.opacity = light.enabled ? 1 : 0.28;
    visual.handle.scale.setScalar(selected ? 1.16 : 0.92);
    visual.ring.material.color.set(selected ? 0xd6ff4b : 0x98a3a6);
    visual.ring.material.opacity = selected ? 0.96 : 0.26;
    visual.ring.scale.setScalar(selected ? 1.14 : 0.9);
    visual.beam.material.color.copy(color);
    visual.beam.material.opacity = light.enabled ? THREE.MathUtils.lerp(0.035, 0.22, light.intensity / 100) : 0;
    visual.beam.visible = light.enabled;
    visual.path.material.color.copy(color);
    visual.path.material.opacity = light.enabled ? (selected ? 0.66 : 0.24) : 0.09;
    visual.spot.color.copy(color);
    visual.spot.intensity = light.enabled ? THREE.MathUtils.lerp(1.2, 16, light.intensity / 100) : 0;
    visual.spot.position.copy(position);
    const beamAngle = THREE.MathUtils.clamp(light.beamAngle ?? 70, 10, 150);
    visual.spot.angle = THREE.MathUtils.clamp(beamAngle / 2 * DEG, Math.PI / 36, Math.PI / 2 - 0.01);
    visual.spot.penumbra = light.quality === "硬质侧光" ? 0.16 : light.quality === "聚光" ? 0.3 : light.quality === "窗光" ? 0.5 : 0.78;
    visual.spot.castShadow = light.enabled && light.role === "主光";
    orientCone(visual.beam, position, TARGET, beamAngle);
    visual.path.geometry.dispose();
    visual.path.geometry = new THREE.BufferGeometry().setFromPoints([position, TARGET]);
    visual.path.computeLineDistances();
  }

  function reconcileLights() {
    const ids = new Set(lights.map((light) => light.id));
    [...visuals.keys()].forEach((id) => { if (!ids.has(id)) removeLightVisual(id); });
    lights.forEach((light) => updateVisual(light, visuals.get(light.id) ?? createLightVisual(light.id)));
    renderer.domElement.dataset.selectedLightId = selectedLightId;
    renderer.domElement.dataset.lightCount = String(lights.length);
    renderer.domElement.dataset.orbitCount = String(visuals.size);
    renderer.domElement.dataset.selectedDistance = String(lights.find((light) => light.id === selectedLightId)?.distance ?? GLOBE_RADIUS);
  }

  function emitInteraction(next: RelightInteraction) {
    interaction = next;
    renderer.domElement.dataset.dragMode = next;
    initial.onInteractionChange?.(next);
  }

  function setPointer(clientX: number, clientY: number) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }

  function localRay() {
    world.updateMatrixWorld(true);
    return raycaster.ray.clone().applyMatrix4(world.matrixWorld.clone().invert());
  }

  function lightPointFromRay(distance: number) {
    const ray = localRay();
    localSphere.radius = THREE.MathUtils.clamp(distance, MIN_LIGHT_DISTANCE, MAX_LIGHT_DISTANCE);
    const hit = ray.intersectSphere(localSphere, new THREE.Vector3());
    if (hit) return hit;
    const cameraLocal = world.worldToLocal(camera.getWorldPosition(new THREE.Vector3()));
    const planeHit = ray.intersectPlane(new THREE.Plane(cameraLocal.normalize(), 0), new THREE.Vector3());
    return planeHit?.normalize().multiplyScalar(localSphere.radius) ?? null;
  }

  function pickLight() {
    const picks = [...visuals.values()].map((visual) => visual.pickHandle);
    const hit = raycaster.intersectObjects(picks, false)[0];
    return hit?.object.userData.lightId as string | undefined;
  }

  function pointerDown(event: PointerEvent) {
    setPointer(event.clientX, event.clientY);
    const hitLightId = pickLight();
    activePointer = event.pointerId;
    renderer.domElement.setPointerCapture(event.pointerId);
    if (hitLightId) {
      selectedLightId = hitLightId;
      activeLightId = hitLightId;
      reconcileLights();
      initial.onLightSelect?.(hitLightId);
      emitInteraction("light");
      renderer.domElement.style.cursor = "grabbing";
      return;
    }
    activeLightId = null;
    globeStart = { x: event.clientX, y: event.clientY, quaternion: world.quaternion.clone() };
    emitInteraction("globe");
    renderer.domElement.style.cursor = "grabbing";
  }

  function pointerMove(event: PointerEvent) {
    if (interaction === "light" && activePointer === event.pointerId && activeLightId) {
      setPointer(event.clientX, event.clientY);
      const light = lights.find((item) => item.id === activeLightId);
      if (!light) return;
      const point = lightPointFromRay(light.distance ?? GLOBE_RADIUS);
      if (!point) return;
      const freeAngles = normalizedAngles(point);
      const angles = snapEnabled ? snapAngles(freeAngles) : freeAngles;
      light.angles = angles;
      reconcileLights();
      initial.onLightChange?.(activeLightId, { ...angles });
      return;
    }
    if (interaction === "globe" && activePointer === event.pointerId) {
      const dx = (event.clientX - globeStart.x) * 0.008;
      const dy = (event.clientY - globeStart.y) * 0.008;
      const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx);
      const pitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy);
      world.quaternion.copy(globeStart.quaternion).premultiply(yaw).premultiply(pitch).normalize();
      renderer.domElement.dataset.globeRotation = `${world.rotation.x.toFixed(3)},${world.rotation.y.toFixed(3)},${world.rotation.z.toFixed(3)}`;
      return;
    }
    setPointer(event.clientX, event.clientY);
    renderer.domElement.style.cursor = pickLight() ? "grab" : "move";
  }

  function pointerEnd(event: PointerEvent) {
    if (activePointer !== event.pointerId) return;
    activePointer = null;
    activeLightId = null;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
    emitInteraction("idle");
    renderer.domElement.style.cursor = "move";
  }

  function keyDown(event: KeyboardEvent) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const light = lights.find((item) => item.id === selectedLightId);
    if (!light) return;
    event.preventDefault();
    const delta = snapEnabled ? (event.shiftKey ? 30 : 15) : (event.shiftKey ? 10 : 4);
    if (event.key === "ArrowLeft") light.angles.azimuth -= delta;
    if (event.key === "ArrowRight") light.angles.azimuth += delta;
    if (event.key === "ArrowUp") light.angles.elevation += delta;
    if (event.key === "ArrowDown") light.angles.elevation -= delta;
    light.angles.azimuth = ((light.angles.azimuth + 180) % 360 + 360) % 360 - 180;
    light.angles.elevation = THREE.MathUtils.clamp(light.angles.elevation, -90, 90);
    if (Math.abs(light.angles.elevation) === 90) light.angles.azimuth = 0;
    reconcileLights();
    initial.onLightChange?.(light.id, { ...light.angles });
  }

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render() {
    if (destroyed) return;
    frame = requestAnimationFrame(render);
    const cameraWorld = camera.getWorldPosition(new THREE.Vector3());
    visuals.forEach((visual) => visual.ring.lookAt(cameraWorld));
    renderer.render(scene, camera);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointermove", pointerMove);
  renderer.domElement.addEventListener("pointerup", pointerEnd);
  renderer.domElement.addEventListener("pointercancel", pointerEnd);
  renderer.domElement.addEventListener("keydown", keyDown);
  renderer.domElement.addEventListener("contextmenu", (event) => event.preventDefault());

  resize();
  renderer.domElement.dataset.snapEnabled = String(snapEnabled);
  reconcileLights();
  emitInteraction("idle");
  render();

  return {
    setLights(next) {
      lights = next.map((light) => ({ ...light, angles: { ...light.angles } }));
      reconcileLights();
    },
    setSelectedLight(lightId) {
      selectedLightId = lightId;
      reconcileLights();
    },
    setSnapEnabled(enabled) {
      snapEnabled = enabled;
      renderer.domElement.dataset.snapEnabled = String(enabled);
    },
    setView(view) {
      camera.position.copy(view === "front" ? frontPosition : perspectivePosition);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld(true);
    },
    resetView() {
      world.rotation.set(-0.07, -0.24, 0.02);
      renderer.domElement.dataset.globeRotation = `${world.rotation.x.toFixed(3)},${world.rotation.y.toFixed(3)},${world.rotation.z.toFixed(3)}`;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerEnd);
      renderer.domElement.removeEventListener("pointercancel", pointerEnd);
      renderer.domElement.removeEventListener("keydown", keyDown);
      [...visuals.keys()].forEach(removeLightVisual);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
