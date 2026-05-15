declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        ambientLight: any;
        pointLight: any;
        spotLight: any;
        directionalLight: any;
        mesh: any;
        group: any;
        sphereGeometry: any;
        cylinderGeometry: any;
        ringGeometry: any;
        boxGeometry: any;
        planeGeometry: any;
        meshStandardMaterial: any;
        meshBasicMaterial: any;
        meshPhongMaterial: any;
        fog: any;
        color: any;
        primitive: any;
      }
    }
  }
}

export {};
