import { WebGLRenderTarget, Object3D } from "three";
import React, { useRef, useMemo, useLayoutEffect, useEffect } from "react";
import { useLoader, useThree, useFrame } from "@react-three/fiber";

// PROBLEM: https://discourse.threejs.org/t/can-not-load-gltfloader-in-nextjs-application/12317/11
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import lerp from "lerp";
import BackfaceMaterial from "./BackfaceMaterial";
import RefractionMaterial from "./RefractionMaterial";
import { useBlock } from "../blocks";
import state from "../store";

let GLTFLoader;

const dummy = new Object3D();

export default function Diamonds() {
  GLTFLoader = require("three/examples/jsm/loaders/GLTFLoader").GLTFLoader;
  const { nodes } = useLoader(GLTFLoader, "/cross.glb");
  useLayoutEffect(() => nodes.Box001__0.geometry.center(), []);
  // const { nodes } = useLoader(GLTFLoader, "/diamond.glb")
  // useLayoutEffect(() => nodes.pCone1_lambert1_0.geometry.center(), [])

  const { size, gl, scene, camera, clock } = useThree();
  const { contentMaxWidth, sectionHeight, mobile } = useBlock();
  const model = useRef();
  const ratio = gl.getPixelRatio();

  const [envFbo, backfaceFbo, backfaceMaterial, refractionMaterial] =
    useMemo(() => {
      const envFbo = new WebGLRenderTarget(
        size.width * ratio,
        size.height * ratio
      );
      const backfaceFbo = new WebGLRenderTarget(
        size.width * ratio,
        size.height * ratio
      );
      const backfaceMaterial = new BackfaceMaterial();
      const refractionMaterial = new RefractionMaterial({
        envMap: envFbo.texture,
        backfaceMap: backfaceFbo.texture,
        resolution: [size.width * ratio, size.height * ratio],
      });
      return [envFbo, backfaceFbo, backfaceMaterial, refractionMaterial];
    }, [size, ratio]);

  useFrame(() => {
    state.diamonds.forEach((data, i) => {
      const t = clock.getElapsedTime() / 2;
      const { x, offset, scale, factor } = data;
      // const s = (contentMaxWidth / 500) * scale
      const s = (contentMaxWidth / 35) * scale;
      data.pos.set(
        mobile ? 0 : x,
        lerp(
          data.pos.y,
          -sectionHeight * offset * factor +
            (state.top.current / state.zoom) * factor,
          0.1
        ),
        0
      );
      dummy.position.copy(data.pos);
      dummy.rotation.set(t, t, t);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      model.current.setMatrixAt(i, dummy.matrix);
      model.current.instanceMatrix.needsUpdate = true;
    });

    gl.autoClear = false;
    camera.layers.set(0);
    gl.setRenderTarget(envFbo);
    gl.clearColor();
    gl.render(scene, camera);
    gl.clearDepth();
    camera.layers.set(1);
    model.current.material = backfaceMaterial;
    gl.setRenderTarget(backfaceFbo);
    gl.clearDepth();
    gl.render(scene, camera);
    camera.layers.set(0);
    gl.setRenderTarget(null);
    gl.render(scene, camera);
    gl.clearDepth();
    camera.layers.set(1);
    model.current.material = refractionMaterial;
    gl.render(scene, camera);
  }, 1);

  return (
    <instancedMesh
      ref={model}
      layers={1}
      args={[nodes.Box001__0.geometry, null, state.diamonds.length]}
      position={[0, 0, 50]}
    />
  );
  // return <instancedMesh ref={model} layers={1} args={[nodes.pCone1_lambert1_0.geometry, null, state.diamonds.length]} position={[0, 0, 50]} />
}
