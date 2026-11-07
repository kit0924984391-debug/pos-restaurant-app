import { describe, it, expect } from 'vitest';
import * as React from 'react';
import * as THREE from 'three';
import ThreePosShowcase from '@/components/ThreePosShowcase';

describe('Three.js 3D Graphics Library Suite (r160+)', () => {
  it('1. exports Three.js fundamental primitives and math classes', () => {
    expect(THREE.Scene).toBeDefined();
    expect(THREE.PerspectiveCamera).toBeDefined();
    expect(THREE.WebGLRenderer).toBeDefined();
    expect(THREE.Vector3).toBeDefined();
    expect(THREE.Matrix4).toBeDefined();
    expect(THREE.Quaternion).toBeDefined();
  });

  it('2. constructs geometries and materials correctly', () => {
    const scene = new THREE.Scene();
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.5, roughness: 0.5 });
    const mesh = new THREE.Mesh(boxGeo, material);

    scene.add(mesh);

    expect(scene.children.length).toBe(1);
    expect(mesh.geometry.type).toBe('BoxGeometry');
    expect(mesh.material.type).toBe('MeshStandardMaterial');

    // Clean up
    boxGeo.dispose();
    material.dispose();
  });

  it('3. supports PBR MeshPhysicalMaterial with transmission and roughness', () => {
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      transmission: 0.6,
      roughness: 0.1,
      ior: 1.5,
    });

    expect(gemMat.transmission).toBe(0.6);
    expect(gemMat.ior).toBe(1.5);
    gemMat.dispose();
  });

  it('4. constructs ThreePosShowcase React component cleanly', () => {
    expect(ThreePosShowcase).toBeDefined();
    expect(typeof ThreePosShowcase).toBe('function');

    const element = React.createElement(ThreePosShowcase, { className: 'test-showcase-container' });
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.className).toBe('test-showcase-container');
  });
});
