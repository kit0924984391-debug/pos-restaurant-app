'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ThreePosShowcaseProps {
  className?: string;
}

/**
 * ThreePosShowcase: Interactive 3D WebGL Restaurant POS Station
 * Built with Three.js (r160+)
 * - 60fps GPU Hardware Accelerated WebGL
 * - Custom 3D POS Device & Dining Table Setup
 * - Interactive mouse/touch orbit & parallax response
 * - Clean WebGL memory disposal on unmount
 * - 100% SSR-safe for Next.js & Cloudflare Workers
 */
export default function ThreePosShowcase({ className = '' }: ThreePosShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 340;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3.2, 5.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.6);
    dirLight.position.set(5, 8, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const orangeAccentLight = new THREE.PointLight(0xf97316, 2.5, 8);
    orangeAccentLight.position.set(-2, 1.5, 2);
    scene.add(orangeAccentLight);

    const cyanRimLight = new THREE.PointLight(0x38bdf8, 1.8, 6);
    cyanRimLight.position.set(2, 2, -2);
    scene.add(cyanRimLight);

    // 3. 3D Model Hierarchy: Dining Station & POS Terminal
    const stationGroup = new THREE.Group();
    scene.add(stationGroup);

    // Base Dining Table Platform
    const tableGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.18, 48);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.8,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = -0.1;
    tableMesh.receiveShadow = true;
    stationGroup.add(tableMesh);

    // Table Edge Glowing Ring
    const ringGeo = new THREE.TorusGeometry(2.42, 0.03, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -0.02;
    stationGroup.add(ringMesh);

    // POS Stand Base
    const standBaseGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.08, 32);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.2 });
    const standBase = new THREE.Mesh(standBaseGeo, standMat);
    standBase.position.y = 0.04;
    stationGroup.add(standBase);

    // POS Stand Arm
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 16);
    const armMesh = new THREE.Mesh(armGeo, standMat);
    armMesh.position.set(0, 0.38, -0.08);
    armMesh.rotation.x = -Math.PI / 10;
    stationGroup.add(armMesh);

    // Tablet Screen Enclosure
    const tabletGeo = new THREE.BoxGeometry(1.6, 1.05, 0.06);
    const tabletFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const tabletMesh = new THREE.Mesh(tabletGeo, tabletFrameMat);
    tabletMesh.position.set(0, 0.82, 0.05);
    tabletMesh.rotation.x = -Math.PI / 6;
    stationGroup.add(tabletMesh);

    // Tablet Display Screen (Vibrant glowing POS interface)
    const screenGeo = new THREE.PlaneGeometry(1.5, 0.95);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      emissive: 0xf97316,
      emissiveIntensity: 0.35,
      roughness: 0.1,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.825, 0.085);
    screenMesh.rotation.x = -Math.PI / 6;
    stationGroup.add(screenMesh);

    // Table QR Code Stand
    const qrStandGeo = new THREE.BoxGeometry(0.4, 0.55, 0.12);
    const qrMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const qrStand = new THREE.Mesh(qrStandGeo, qrMat);
    qrStand.position.set(1.2, 0.28, 0.6);
    qrStand.rotation.y = -Math.PI / 5;
    stationGroup.add(qrStand);

    // Thermal Printer Simulation
    const printerGeo = new THREE.BoxGeometry(0.7, 0.45, 0.6);
    const printerMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.5 });
    const printer = new THREE.Mesh(printerGeo, printerMat);
    printer.position.set(-1.15, 0.23, 0.4);
    printer.rotation.y = Math.PI / 6;
    stationGroup.add(printer);

    // Floating Food Orbiting Gems
    const gemsCount = 8;
    const gems: THREE.Mesh[] = [];
    const gemGeo = new THREE.DodecahedronGeometry(0.12);
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.6,
      ior: 1.5,
    });

    for (let i = 0; i < gemsCount; i++) {
      const gem = new THREE.Mesh(gemGeo, gemMat);
      const angle = (i / gemsCount) * Math.PI * 2;
      const radius = 1.65;
      gem.position.set(Math.cos(angle) * radius, 0.7 + Math.sin(i) * 0.25, Math.sin(angle) * radius);
      stationGroup.add(gem);
      gems.push(gem);
    }

    // 4. Interactive Cursor Tilting
    let targetRotationY = 0;
    let targetRotationX = 0;
    let isDragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) {
        // Subtle tilt on hover
        const rect = container.getBoundingClientRect();
        const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        targetRotationY = normX * 0.45;
        targetRotationX = -normY * 0.2;
      } else {
        const deltaX = e.clientX - previousMouseX;
        const deltaY = e.clientY - previousMouseY;
        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
        stationGroup.rotation.y += deltaX * 0.012;
        stationGroup.rotation.x += deltaY * 0.008;
      }
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 5. Responsive Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 6. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (!isDragging && !prefersReducedMotion) {
        // Gentle baseline rotation
        stationGroup.rotation.y += 0.004;

        // Smooth damping towards pointer target
        stationGroup.rotation.x += (targetRotationX - stationGroup.rotation.x) * 0.05;

        // Animate floating food gems bobbing up and down
        gems.forEach((gem, idx) => {
          gem.position.y = 0.7 + Math.sin(elapsedTime * 2.2 + idx * 0.8) * 0.12;
          gem.rotation.x += 0.02;
          gem.rotation.y += 0.03;
        });

        // Pulsing accent light
        orangeAccentLight.intensity = 2.0 + Math.sin(elapsedTime * 3) * 0.6;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup on Component Unmount (Zero WebGL memory leaks)
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);

      // Dispose Geometries and Materials
      tableGeo.dispose();
      tableMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      standBaseGeo.dispose();
      standMat.dispose();
      armGeo.dispose();
      tabletGeo.dispose();
      tabletFrameMat.dispose();
      screenGeo.dispose();
      screenMat.dispose();
      qrStandGeo.dispose();
      qrMat.dispose();
      printerGeo.dispose();
      printerMat.dispose();
      gemGeo.dispose();
      gemMat.dispose();

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full h-[320px] sm:h-[380px] rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none ${className}`}
    >
      {/* 3D Visual Overlay Badges */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-lg pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] font-bold text-white tracking-wide">3D Interactive POS Station</span>
        <span className="text-[10px] text-orange-400 font-mono">WebGL • Three.js</span>
      </div>

      <div className="absolute bottom-3 right-4 z-10 text-[10px] text-slate-400 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 pointer-events-none">
        🖱️ ลากเมาส์หรือแตะหมุน 360°
      </div>
    </div>
  );
}
