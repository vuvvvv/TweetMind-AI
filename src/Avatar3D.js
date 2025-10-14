import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const Avatar3D = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const headRef = useRef(null);
  const directionalLightRef = useRef(null);
  const hemiLightRef = useRef(null);
  const controlsRef = useRef(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  useEffect(() => {
    if (!mountRef.current) return;

   
    const scene = new THREE.Scene();
    sceneRef.current = scene;

   
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 3.5); 
    camera.lookAt(0, 1.5, 0);

   
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

   
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.5; 
    controls.maxDistance = 4.5; 
    controls.autoRotate = true; 
    controls.autoRotateSpeed = 1.0; 
    controls.enablePan = false; 
    controlsRef.current = controls;

  
    const loader = new GLTFLoader();
    let baseY = 0;

    loader.load(
      "/tv_man.glb",
      (gltf) => {
        const model = gltf.scene;
        const avatarGroup = new THREE.Group();
        avatarGroup.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4 / maxDim;
        model.scale.set(scale, scale, scale);

        const boxScaled = new THREE.Box3().setFromObject(model);
        const center = boxScaled.getCenter(new THREE.Vector3());
        const min = boxScaled.min;
        const floorY = -2;

        model.position.sub(center);
        avatarGroup.position.y = floorY - min.y;
        avatarGroup.position.z = -3;
        baseY = avatarGroup.position.y;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        headRef.current = avatarGroup;
        scene.add(avatarGroup);
        setModelLoaded(true);
      },
      undefined,
      (error) => {
        console.error("فشل تحميل النموذج:", error);
        setLoadingError("فشل تحميل النموذج");
      }
    );

   
    scene.add(new THREE.AmbientLight(0x404040, 0.3));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLightRef.current = directionalLight;
    scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemiLight.position.set(0, 20, 0);
    hemiLightRef.current = hemiLight;
    scene.add(hemiLight);

  
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 300;
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 30;
      positions[i + 1] = (Math.random() - 0.5) * 20;
      positions[i + 2] = (Math.random() - 0.5) * 30;
    }
    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

   
    const planeGeometry = new THREE.PlaneGeometry(15, 15);
    const planeMaterial = new THREE.MeshLambertMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.3,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;
    scene.add(plane);

 
    let animationTime = 0;
    const mainAnimate = () => {
      requestAnimationFrame(mainAnimate);
      animationTime += 0.01;

      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(animationTime * 0.5) * 0.3;
        headRef.current.rotation.x = Math.sin(animationTime * 0.3) * 0.1;
        headRef.current.position.y = baseY + Math.sin(animationTime) * 0.1;
      }

      particles.rotation.y += 0.002;
      particles.rotation.x += 0.001;

      renderer.render(scene, camera);
      controls.update(); 
    };

    mainAnimate();

    
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);


    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-gradient-to-b from-gray-900 to-black">
      <div
        ref={mountRef}
        className="w-full h-full"
        style={{ cursor: "grab" }}
      />

      {!modelLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
         
        </div>
      )}

      {loadingError && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-red-400 text-sm">
          {loadingError}
        </div>
      )}

    
    </div>
  );
};

export default Avatar3D;
