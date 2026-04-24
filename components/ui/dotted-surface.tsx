"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import React, { useEffect, useRef } from "react";

type DottedSurfaceProps = Omit<React.ComponentProps<"div">, "ref">;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
  const { theme } = useTheme();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let isDisposed = false;
    let cleanupScene = () => {};

    const loadScene = async () => {
      const THREE = await import("three");

      if (isDisposed || !container.isConnected) {
        return;
      }

      const SEPARATION = 150;
      const AMOUNTX = 40;
      const AMOUNTY = 60;

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x0a0a0f, 2000, 10000);

      const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        1,
        10000
      );
      camera.position.set(0, 355, 1220);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(scene.fog.color, 0);

      container.appendChild(renderer.domElement);

      const positions: number[] = [];
      const colors: number[] = [];
      const geometry = new THREE.BufferGeometry();

      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
          const y = 0;
          const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

          positions.push(x, y, z);

          if (theme === "dark" || !theme) {
            const blueInfluence = Math.random();
            if (blueInfluence > 0.5) {
              colors.push(0.36, 0.49, 0.98);
            } else {
              colors.push(0.13, 0.79, 0.59);
            }
          } else {
            colors.push(0, 0, 0);
          }
        }
      }

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );

      const material = new THREE.PointsMaterial({
        size: 6,
        vertexColors: true,
        transparent: true,
        opacity: 0.35,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      let count = 0;
      let animationId = 0;

      const animate = () => {
        animationId = window.requestAnimationFrame(animate);

        const positionAttribute = geometry.attributes.position;
        const posArray = positionAttribute.array as Float32Array;

        let i = 0;
        for (let ix = 0; ix < AMOUNTX; ix++) {
          for (let iy = 0; iy < AMOUNTY; iy++) {
            const index = i * 3;

            posArray[index + 1] =
              Math.sin((ix + count) * 0.3) * 50 +
              Math.sin((iy + count) * 0.5) * 50;

            i++;
          }
        }

        positionAttribute.needsUpdate = true;
        renderer.render(scene, camera);
        count += 0.1;
      };

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener("resize", handleResize);
      animate();

      cleanupScene = () => {
        window.removeEventListener("resize", handleResize);
        window.cancelAnimationFrame(animationId);

        scene.traverse((object) => {
          if (object instanceof THREE.Points) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((currentMaterial) =>
                currentMaterial.dispose()
              );
            } else {
              object.material.dispose();
            }
          }
        });

        renderer.dispose();

        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    };

    void loadScene();

    return () => {
      isDisposed = true;
      cleanupScene();
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none fixed inset-0 -z-[1]", className)}
      {...props}
    />
  );
}
