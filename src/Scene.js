import React, { Component } from 'react';
import * as THREE from 'three';
import Resize from './Resize';
import tree3 from './models/tree-1/scene.gltf';
import {
  randomPositionInCircle,
  angularDistance,
  distance,
} from './utils/geom.js';
import { getTouchesXY, mouseDownTypes } from './utils/input.js';
import loadModels from './utils/loadModels.js';
import Sky from './Sky';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import 'react-dat-gui/build/react-dat-gui.css';
import DatGui, { DatNumber, DatBoolean } from 'react-dat-gui';

const importDeviceOrientationControls = () => {
  return import('three/examples/js/controls/DeviceOrientationControls.js').then(
    () => {
      return window.THREE.DeviceOrientationControls;
    }
  );
};
const importSimplifyModifier = () => {
  return import('three/examples/js/modifiers/SimplifyModifier.js').then(() => {
    return window.THREE.SimplifyModifier;
  });
};

//import treeFBX from './models/tree-1-fbx/trees1.fbx';

class Scene extends Component {
  constructor() {
    super();
    this.state = {
      settings: {
        allowOrientationControls: false,
        enableCameraShowcase: false,
        skyUpdateStep: 1,
        load: {
          models: true,
          lights: true,
          ground: true,
        },
        shadowHelper: true,
      },
    };
  }
  //scene scale
  scl = 3;
  //camera x,y,z offset
  o = {
    x: 4 * this.scl,
    y: 4 * this.scl,
    z: 4 * this.scl,
  };
  //x, y, z, phi, theta, distance coords of the sun
  sun = null;
  MOUSE = mouseDownTypes;
  mouseDownType = mouseDownTypes.none;
  //mouse x,y
  mx = 0;
  my = 0;
  //down/up relative x,y (mouse pos)
  drx = 0;
  dry = 0;
  colours = {
    sky: '#6f97ad',
    sunlight: '#fafaff',
    groundLight: '#2e8c69',
    ground: '#5e8c2e',
  };
  brightness = 1;
  skySettings = {
    turbidity: 12,
    rayleigh: 4,
    mieCoefficient: 0.0025,
    mieDirectionalG: 0.8,
    luminance: 1,
    inclination: 0.2,
    azimuth: 0.4,
    sun: true,
  };
  updateSkyAndSun = (sky, sunSphere, settings) => {
    let uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = settings.turbidity;
    uniforms['rayleigh'].value = settings.rayleigh;
    uniforms['luminance'].value = settings.luminance;
    uniforms['mieCoefficient'].value = settings.mieCoefficient;
    uniforms['mieDirectionalG'].value = settings.mieDirectionalG;

    let theta = Math.PI * (settings.inclination - 0.5);
    let phi = 2 * Math.PI * (settings.azimuth - 0.5);
    //console.log('PHI', phi);
    let distance = 7000;
    sunSphere.position.x = distance * Math.cos(phi);
    sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta);
    sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta);

    uniforms['sunPosition'].value.copy(sunSphere.position);
    this.sun = {
      x: sunSphere.position.x,
      y: sunSphere.position.y,
      z: sunSphere.position.z,
      phi,
      theta,
      distance,
    };
    return this.sun;
  };
  createSky = (settings = this.skySettings) => {
    const scene = this.scene;
    //  const controls, renderer;
    let sky, sunSphere;

    // Add Sky
    sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    this.sky = sky;
    // Add Sun
    sunSphere = new THREE.Mesh(
      new THREE.SphereBufferGeometry(20000, 16, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      })
    );
    scene.add(sunSphere);
    this.sunSphere = sunSphere;
    sunSphere.visible = settings.sun;

    const sun = this.updateSkyAndSun(sky, sunSphere, settings);
    this.setupSkyLight(sun);
    /*
          const gui = new dat.GUI();

          gui.add( settings, "turbidity", 1.0, 20.0, 0.1 ).onChange( guiChanged );
          gui.add( settings, "rayleigh", 0.0, 4, 0.001 ).onChange( guiChanged );
                  gui.add( effectController, "mieCoefficient", 0.0, 0.1, 0.001 ).onChange(
          guiChanged );
                  gui.add( effectController, "mieDirectionalG", 0.0, 1, 0.001 ).onChange( guiChanged
          );
                  gui.add( effectController, "luminance", 0.0, 2 ).onChange( guiChanged );
                  gui.add( effectController, "inclination", 0, 1, 0.0001 ).onChange( guiChanged );
                          gui.add( effectController, "azimuth", 0, 1, 0.0001 ).onChange( guiChanged
          );
          gui.add( effectController, "sun" ).onChange( guiChanged );

          guiChanged();
                    
        */
  };
  setupScene = () => {
    const { width, height, colours, o } = this;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000);
    this.timeStart = Date.now();
    this.camera = camera;
    camera.position.set(o.x, o.y, o.z);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer = renderer;
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(colours.sky);
    renderer.setSize(width, height);
    this.createAndSetupSky();

    this.createGround();

    //this.createAndSetupFog();

    this.loadAndSetupModels();
  };
  updateAmbientLightBrightness = (directBrightness, ambientBrightness) => {
    this.aLight.intensity = 0.3 * ambientBrightness;
    this.hLight.intensity = 0.4 * ambientBrightness;
    for (let lightName in this.dLights) {
      const dLight = this.dLights[lightName];
      dLight.intensity = dLight.userData.intensity * directBrightness;
    }
  };
  createAndSetupSky = () => {
    const { scene, renderer, colours, brightness } = this;

    //setup ambient light

    const aLight = new THREE.AmbientLight(colours.sky); // soft white light
    scene.add(aLight);
    this.aLight = aLight;
    const hLight = new THREE.HemisphereLight(colours.sky, colours.groundLight);
    scene.add(hLight);
    this.hLight = hLight;
    this.updateAmbientLightBrightness(brightness, brightness);
    // this.ambientLight = aLight;
    // this.hemiLight = hLight;

    //create and setup the sky and sunlight
    this.createSky();
  };
  setupSkyLight = ({ x, y, z, distance }) => {
    if (this.state.settings.load.lights) {
      const { scene, colours, brightness, renderer } = this;
      let maxTS = renderer.capabilities.maxTextureSize;
      if (maxTS >= 4096) {
        maxTS = 4096;
      } else if (maxTS >= 2048) {
        maxTS = 2048;
      } else if (maxTS >= 1024) {
        maxTS = 1024;
      } else if (maxTS >= 512) {
        maxTS = 512;
      }
      const dLightSettings = {
        colour: colours.sunlight,
        intensity: 5,
        bias: 0.00008,
        far: distance * 2 * this.scl,
        castShadow: true,
        mapSize: maxTS,
      };
      const createLightData = (
        { x, y, left, right, bottom, top },
        customData = {}
      ) => {
        return {
          ...dLightSettings,
          ...{
            offset: {
              x,
              y,
            },
            frustum: {
              left,
              right,
              bottom,
              top,
            },
          },
          ...customData,
        };
      };
      const dLights = {
        middle: createLightData(
          {
            x: 0,
            y: 0,
            left: -5,
            right: 5,
            bottom: -5,
            top: 5,
          },
          {
            intensity: 4,
          }
        ),
      };
      const createDLights = dLights => {
        this.dLights = {};
        this.dLightHelpers = {};
        for (let lightName in dLights) {
          const {
            colour,
            intensity,
            bias,
            far,
            castShadow,
            mapSize,
            offset,
            frustum: { left, right, bottom, top },
            radius,
          } = dLights[lightName];
          console.log('creating', lightName, 'directional light.', intensity);
          const dLight = new THREE.DirectionalLight(colour, intensity);
          if (radius) dLight.shadow.radius = radius;
          dLight.castShadow = castShadow;
          dLight.shadow.bias = bias;

          dLight.shadow.mapSize.width = mapSize;
          dLight.shadow.mapSize.height = mapSize;

          dLight.shadow.camera.far = far;
          dLight.shadow.camera.left = left;
          dLight.shadow.camera.right = right;
          dLight.shadow.camera.bottom = bottom;
          dLight.shadow.camera.top = top;

          dLight.userData = {
            offset,
            frustum: {
              left,
              right,
              bottom,
              top,
            },
            intensity,
          };
          scene.add(dLight);
          scene.add(dLight.target);
          this.dLights[lightName] = dLight;
          if (this.state.settings.shadowHelper) {
            const dLightHelper = new THREE.CameraHelper(dLight.shadow.camera);
            scene.add(dLightHelper);
            this.dLightHelpers[lightName] = dLightHelper;
          }
        }
      };
      createDLights(dLights);
    }
  };
  createGround = () => {
    const { scene, colours } = this;
    const plane = {
      geometry: new THREE.PlaneGeometry(3000 * this.scl, 3000 * this.scl),
      material: new THREE.MeshLambertMaterial({
        color: colours.ground,
        side: THREE.FrontSide,
      }),
    };
    plane.geometry.rotateX(-(Math.PI / 2));
    plane.entity = new THREE.Mesh(plane.geometry, plane.material);
    plane.entity.receiveShadow = true;
    this.plane = plane;
    scene.add(plane.entity);
  };
  // createAndSetupFog = () => {
  //   const fog = {
  //     color: 'rgba(255,255,230,0.1)',
  //     density: 0.001,
  //     near: 60 * this.scl,
  //     far: 2000 * this.scl,
  //   };
  //   this.scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
  // }
  lods = [];
  simplify = (modifier, mesh, amount = 0.5) => {
    // var modifier = new SimplifyModifier();
    var simplified = mesh.clone();
    console.log('simplified', simplified);
    simplified.material = mesh.material.clone();
    simplified.material.flatShading = true;
    var count = Math.floor(
      simplified.geometry.attributes.position.count * amount
    ); // number of vertices to remove
    simplified.geometry = modifier.modify(simplified.geometry, count);
    simplified.position.copy(mesh.position);
    return simplified;
  };
  loadAndSetupModels = () => {
    //importSimplifyModifier().then(SimplifyModifier => {
    //console.log(process.env.PUBLIC_URL);
    //const treeModelPath = 'models/trees/palm3/palm0.fbx';
    const palmHQ = '/static/models/trees/palm_gltf/palm0.glb';
    const palmLQ = '/static/models/trees/palm_gltf/palm0_LQ.glb';
    loadModels([
      { type: 'gltf', model: palmHQ },
      { type: 'gltf', model: palmLQ },
    ])
      .then(([objHQ, objLQ]) => {
        //define which objs have alphaShadows
        const objs = [
          {
            lodDistance: 0,
            obj: objHQ,
            alphaShadows: true,
          },
          {
            lodDistance: 400,
            obj: objLQ,
            alphaShadows: true,
          },
        ];
        //create 100 clones for the objects, with the high and low quality
        //objects
        for (let i = 0; i < 3000; i++) {
          const pos = randomPositionInCircle(3000);
          //newObj.position.set(rndInCircle.x, 0, rndInCircle.y);
          //newObj.rotation.y = Math.random() * Math.PI * 2;
          const yRot = Math.random() * Math.PI * 2;
          const lod = new THREE.LOD();
          lod.position.set(pos.x, 0, pos.y);
          lod.rotation.y = yRot;
          const r = 246 - Math.ceil(Math.random() * 60);
          const g = 256 - Math.ceil(Math.random() * 10);
          const b = 256 - Math.ceil(Math.random() * 120);
          //Create spheres with 3 levels of detail and create new LOD levels for them
          //for (var i = 0; i < 3; i++) {
          objs.forEach(({ obj, lodDistance, alphaShadows }) => {
            const myObj = obj.clone();
            myObj.traverse(o => {
              if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = true;
                if (o.material.name.includes('leaf')) {
                  //set the correct material for leaf textures
                  //including transparency, and a random base colour

                  o.material = new THREE.MeshLambertMaterial({
                    map: o.material.map,
                    alphaTest: 0.5,
                    transparent: true,
                    color: `rgb(${r},${g},${b})`,
                    dithering: true,
                  });
                  if (alphaShadows) {
                    const customDepthMaterial = new THREE.MeshDepthMaterial({
                      depthPacking: THREE.RGBADepthPacking,
                      map: o.material.map,
                      alphaTest: 0.5,
                    });
                    o.customDepthMaterial = customDepthMaterial;
                  }
                } else {
                  o.material = new THREE.MeshLambertMaterial({
                    map: o.material.map,
                  });
                }
              }
            });
            lod.addLevel(myObj, lodDistance);
          });

          // var geometry = new THREE.IcosahedronBufferGeometry(10, 3);

          // var mesh = new THREE.Mesh(
          //   geometry,
          //   new THREE.MeshBasicMaterial(0xff0000)
          // );
          //mesh.position.copy(obj.position);

          //}
          this.lods.push(lod);

          this.scene.add(lod);
        }
        //create 101 trees (1 original, 100 cloned)
        //give random positions in circles with random rotation for the 100
        //for each tree, give it shadows and correct materials

        //objLQ.scale.set(this.scl * 0.05, this.scl * 0.05, this.scl * 0.05);
        //const objOriginal = objHQ;
        //console.log('obj', objOriginal);
        //objOriginal = objOriginal[0];
        //const objs = [];
        //TODO: why are there 2 t
        // objOriginal.traverse(o => {
        //   if (o.isMesh) {
        //     o.geometry = this.simplify(o);
        //   }
        // });
        //const simplified = objOriginal; //simplify(objOriginal);
      })
      .catch(err => {
        console.error('error loading models', err);
      });
    //});
  };
  componentDidMount() {
    window.THREE = THREE;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    const scene = new THREE.Scene();
    this.scene = scene;
    this.setupScene();
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.maxPolarAngle = Math.PI * (1 / 4);
    controls.minPolarAngle = Math.PI * (1 / 8);
    controls.minDistance = 10 * this.scl;
    controls.maxDistance = 128 * this.scl;
    //controls.addEventListener( 'change', render );
    this.cameraControls = controls;
    //if(this.state.settings.enable)
    if (window.DeviceOrientationEvent) {
      importDeviceOrientationControls().then(DeviceOrientationControls => {
        const controls = new DeviceOrientationControls(this.camera);
        this.orientationControls = controls;
      });
    }
    this.mount.appendChild(this.renderer.domElement);
    this.start();
  }

  componentWillUnmount() {
    this.stop();
    this.mount.removeChild(this.renderer.domElement);
  }

  start = () => {
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  };

  stop = () => {
    cancelAnimationFrame(this.frameId);
  };
  frame = 0;
  //azimuth angle starting value
  //<0.0 and 0.5> means sun below horizon, 0.25 means sun at peak height in sky.
  aziA = 0.1;
  t0 = 0;
  daynight = {
    minutes: 5,
  };
  aziHeight = 0;
  translateShadow = () => {
    const camera = this.camera;
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2();

    center.x = 0; //rx * 2 - 1;
    center.y = 0; //ry * 2 - 1;
    const shadowSize = 30;
    const rayDistanceActual = shadowSize;
    const rayDistance = Math.max(rayDistanceActual, camera.position.y);
    raycaster.setFromCamera(center, this.camera);
    let resultPosition = new THREE.Vector3();
    let ray = raycaster.ray;
    ray.at(rayDistance, resultPosition);
    resultPosition.y = 0;

    let distXYCamToShadow = distance(
      {
        x: resultPosition.x,
        y: resultPosition.z,
      },
      {
        x: camera.position.x,
        y: camera.position.z,
      }
    );
    let distCamToShadow = resultPosition.distanceTo(camera.position);
    const middle = this.dLights.middle;
    for (let lightName in this.dLights) {
      const dLight = this.dLights[lightName];
      const offset = dLight.userData.offset;
      const frustum = dLight.userData.frustum;
      let endPosition = { ...resultPosition };
      //enable sunlight when it is above the horizon, disable it below
      if (this.sun.y > -1 * this.scl) {
        if (!dLight.visible) dLight.visible = true;
      } else {
        dLight.visible = false;
        if (this.ambiBrightness < 0) {
          this.brightness = 0.00001;
          this.ambiBrightness = 0.00001;
        }
      }

      /* set shadow size based on camera y position */
      const cy = 80; //Math.min(10, Math.max(0.5, camera.position.y / 20));
      const cz = Math.max(1, distXYCamToShadow / rayDistance + 0.5);
      //set shadow size based on dist to shadow center
      const cw = Math.max(1, distCamToShadow / (rayDistanceActual * 1.5));
      //console.log('cw', cw);
      const c = Math.min(1000 * this.scl, cy * cz * cw * this.scl);
      const cl = 4;
      const cr = 4;
      const ct = 4;
      const cb = 4;
      //console.log('cw', cw, 'cz', cz);
      //if (this.frame % 10 === 0) console.table([['xyd', cz], ['xyzd', cw]]);

      let startPosition = {
        x: this.sun.x * this.scl + endPosition.x,
        y: this.sun.y * this.scl + endPosition.y,
        z: this.sun.z * this.scl + endPosition.z,
      };
      const angle = Math.atan2(
        startPosition.z - endPosition.z,
        startPosition.x - endPosition.x
      );
      const pi = Math.PI;

      // const uv = new THREE.Vector2(this.sun.phi, this.sun.theta).divide(
      //   new THREE.Vector2(2.0 * pi, pi)
      // );
      let theta = this.sun.theta;
      let phi = this.sun.phi;
      const spct = Math.sin(phi) * Math.cos(theta);
      //not sure how this works, but this gets the distance projected onto the plane
      //for setting the frustum front and back, kissing the middle frustum.
      phi = (pi / 2 / spct) * 0.925; //(pi * 2 - this.sun.theta * this.sun.phi) / 2; //pi / uv.x / (pi * 2);
      //use angle to calculate position of side directional lights
      //TODO: refactor to reduce duplicate code
      if (offset.x < 0) {
        //left
        //e.g. -1
        const nx = Math.cos(angle + Math.PI * 0.5) * c * 2;
        const ny = Math.sin(angle + Math.PI * 0.5) * c * 2;
        endPosition.x += nx;
        endPosition.z += ny;
        startPosition.x += nx;
        startPosition.z += ny;
        dLight.shadow.camera.right = c;
        dLight.shadow.camera.left = -c * cl;
        dLight.shadow.camera.top = c * 2 + c * ct;
        dLight.shadow.camera.bottom = -c * 2 + -c * cb;
      } else if (offset.x > 0) {
        //right
        const nx = Math.cos(angle - Math.PI * 0.5) * c * 2;
        const ny = Math.sin(angle - Math.PI * 0.5) * c * 2;
        endPosition.x += nx;
        endPosition.z += ny;
        startPosition.x += nx;
        startPosition.z += ny;
        dLight.shadow.camera.right = c * cr;
        dLight.shadow.camera.left = -c;
        dLight.shadow.camera.top = c * 2 + c * ct;
        dLight.shadow.camera.bottom = -c * 2 + -c * cb;
      } else if (offset.y < 0) {
        //top
        //e.g. -1
        const nx = Math.cos(angle) * c * phi;
        const ny = Math.sin(angle) * c * phi;
        endPosition.x += nx;
        endPosition.z += ny;
        startPosition.x += nx;
        startPosition.z += ny;
        dLight.shadow.camera.right = c;
        dLight.shadow.camera.left = -c;
        dLight.shadow.camera.top = c * ct;
        dLight.shadow.camera.bottom = -c;
      } else if (offset.y > 0) {
        //bottom
        const nx = Math.cos(angle + Math.PI) * c * phi;
        const ny = Math.sin(angle + Math.PI) * c * phi;
        endPosition.x += nx;
        endPosition.z += ny;
        startPosition.x += nx;
        startPosition.z += ny;
        dLight.shadow.camera.right = c;
        dLight.shadow.camera.left = -c;
        dLight.shadow.camera.top = c;
        dLight.shadow.camera.bottom = -c * cb;
      } else {
        dLight.shadow.camera.right = c;
        dLight.shadow.camera.left = -c;
        dLight.shadow.camera.top = c;
        dLight.shadow.camera.bottom = -c;
      }
      //translate sunlight shadow cast to where the camera is pointed
      dLight.position.set(startPosition.x, startPosition.y, startPosition.z);
      dLight.target.position.copy(endPosition);

      //cam view intersects with ground plane at groundPoint
      //add groundPoint x,y,z to the directional light position and target point.

      dLight.shadow.camera.updateProjectionMatrix();
      //dLight.shadow.camera.updateProjectionMatrix();
      if (this.state.settings.shadowHelper) {
        const dLightHelper = this.dLightHelpers[lightName];
        dLightHelper.update();
      }
    }
  };
  hasDeviceOrientation = oc => {
    return oc && oc.deviceOrientation.type === 'deviceorientation';
  };
  animate = ms => {
    ms = Math.round(ms / 10);
    const enableCamShowcase = false;
    const cam = this.camera;
    const o = this.o;
    cam.position.y = Math.max(o.y, cam.position.y);
    if (
      this.state.settings.allowOrientationControls &&
      this.hasDeviceOrientation(this.orientationControls)
    ) {
      this.orientationControls.update();
    } else {
      this.cameraControls.update();
    }
    //const cube = this.cube;
    if (enableCamShowcase) {
      // cube.rotation.x += 0.01;
      // cube.rotation.y += 0.01;
      let x = Math.sin(ms / 160) * 12 * this.scl;
      let y = Math.cos(ms / 320) * 9 * this.scl + 11 * this.scl;
      let z = Math.cos(ms / 210) * 12 * this.scl;

      cam.position.set(o.x, o.y, o.z);
      y = Math.sin(ms / 220) * 5 * this.scl + 5 * this.scl;
      //const point = new THREE.Vector3(0, y, 0);

      //cam.lookAt(point);
      this.helper.update();
    }
    if (
      this.frame % this.state.settings.skyUpdateStep === 0 &&
      this.state.settings.load.lights &&
      this.sky &&
      this.sunSphere
    ) {
      //console.log(this.aziA);
      const timeSinceStart = (Date.now() - this.timeStart) / 1000 / (60 * 5);
      this.aziA = timeSinceStart;
      let azi = this.aziA % 1;
      //between 0 and 1, where 1 is highest in the sky, and 0 is the horizon.
      this.aziHeight = Math.abs((azi % 0.5) - 0.25) * 4;
      const maxMieDG = 0.9;
      let mieDG = maxMieDG;
      const mieDGRange = 0.1;
      let rayleigh = 4;
      if (azi < mieDGRange) {
        mieDG = Math.max(0.01, azi * (maxMieDG / mieDGRange));
        //0 to 0.1
        //
      }
      if (azi > 0.5 - mieDGRange) {
        //0.4 to 0.5
        mieDG = Math.max(
          0.01,
          (mieDGRange - (azi - (0.5 - mieDGRange))) * (maxMieDG / mieDGRange)
        );
        //0.4 - 0.4 + 0 * 8 == 0
        //0.4 - 0.4 + 0.1 * 8 == 0.8
      }
      // if(azi > mieDGRange/2 && azi < 0.5-(mieDGRange/2)){
      //   //between 0.05 and 0.45

      // }

      //between 2 and 4, where 2 is on the horizon, and 4 is high in the sky
      rayleigh = this.aziHeight * 2 + 2;
      //console.log('rayleigh', rayleigh);
      //console.log('angle', angle, 'azi', azi, 'day?', angle <= Math.PI);
      this.updateSkyAndSun(this.sky, this.sunSphere, {
        ...this.skySettings,
        azimuth: azi,
        mieDirectionalG: mieDG,
        rayleigh,
      });

      //update ambient light based on aziHeight

      this.aziBrightness = 1 - this.aziHeight ** 4;
      let threshold = 0.07;
      this.ambiBrightness =
        azi > 0.5 + threshold && azi < 1 - threshold
          ? 0
          : (1 - Math.abs(0.5 - ((azi + threshold) % 1) / 0.65) - 0.5) * 2;
      //Math.abs((azi % 0.5) - 0.25) * 4;
      //if (this.frame % 2 === 0) console.log(this.ambiBrightness);
      this.brightness = this.aziBrightness;
      //console.log('azih', this.aziHeight ** 4);

      // this.camera.updateProjectionMatrix();
      //-1.4, 0.6
      // const translateCamera = () => {
      //   const xd = this.rx - 0.5;
      //   o.x += xd;
      //   cam.position.x += xd;
      // };
      //TODO: refactor this out of animate function

      //translateCamera();
      //if (this.mouseDownType === this.MOUSE.left) {

      this.translateShadow();
      if (this.brightness > 0 || this.ambiBrightness > 0) {
        this.updateAmbientLightBrightness(this.brightness, this.ambiBrightness);
      }
    }
    //TODO: remove this, as it should automatically update in future THREE.js
    //versions.
    this.lods.forEach(lod => {
      lod.update(this.camera);
    });
    this.renderScene();
    //}
    //if (this.trees) this.trees.position.x = Math.sin(ms / 300) * 40;
    //this.dLight.position.set(-x * 10, y * 10, -z * 10);
    //this.dLight.shadow.camera.updateProjectionMatrix();

    this.frameId = window.requestAnimationFrame(this.animate);
    this.frame++;
  };

  renderScene = () => {
    this.renderer.render(this.scene, this.camera);
  };
  handleUpdate = settings => {
    this.setState({
      settings,
    });
  };
  render() {
    const { settings } = this.state;
    return (
      <Resize>
        {({ width, height }) => {
          this.width = window.innerWidth;
          this.height = window.innerHeight;
          //console.log(width);
          if (width && height) {
            console.log(width, height);
            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
          }
          return (
            <>
              <div
                style={{ width: '100%', height: '100%', position: 'fixed' }}
                ref={mount => {
                  this.mount = mount;
                }}
              />
              <DatGui data={settings} onUpdate={this.handleUpdate}>
                <DatNumber
                  path='skyUpdateStep'
                  label='Shadow step'
                  min={1}
                  max={32}
                  step={1}
                />
                {this.hasDeviceOrientation(this.orientationControls) && (
                  <DatBoolean
                    onClick={() => {
                      this.setState({
                        settings: {
                          allowOrientationControls: !this.state.settings
                            .allowOrientationControls,
                        },
                      });
                    }}
                  />
                )}
              </DatGui>
            </>
          );
        }}
      </Resize>
    );
  }
}

export default Scene;
