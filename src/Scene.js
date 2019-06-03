import React, { Component } from 'react';
import * as THREE from 'three';
import Resize from './Resize';
import treeGLTF from './models/tree-1/scene.gltf';
import { randomPositionInCircle, angularDistance } from './utils/geom.js';
import { getTouchesXY, mouseDownTypes } from './utils/input.js';
import loadModels from './utils/loadModels.js';
import Sky from './Sky';

const importDeviceOrientationControls = () => {
  return import('three/examples/js/controls/DeviceOrientationControls.js').then(
    () => {
      return window.THREE.DeviceOrientationControls;
    }
  );
};
//import treeFBX from './models/tree-1-fbx/trees1.fbx';

class Scene extends Component {
  //scene scale
  scl = 3;
  //camera x,y,z offset
  o = {
    x: 20,
    y: 6,
    z: 20,
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
    const { width, height, colours } = this;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000);
    this.camera = camera;
    camera.position.set(10, 10, 10);
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
  updateAmbientLightBrightness = brightness => {
    this.aLight.intensity = 0.2 * brightness;
    this.hLight.intensity = 0.5 * brightness;
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
    this.updateAmbientLightBrightness(brightness);
    // this.ambientLight = aLight;
    // this.hemiLight = hLight;

    //create and setup the sky and sunlight
    this.createSky();
  };
  setupSkyLight = ({ x, y, z, distance }) => {
    const { scene, colours, brightness, renderer } = this;
    const dLight = new THREE.DirectionalLight(colours.sunlight, 2 * brightness);
    //dLight.position.set(400 * this.scl, 1000 * this.scl, 600 * this.scl);
    dLight.castShadow = true;
    dLight.shadow.camera.zoom = 1;
    dLight.shadow.camera.right = 60 * this.scl;
    dLight.shadow.camera.left = -60 * this.scl;
    dLight.shadow.camera.top = 40 * this.scl;
    dLight.shadow.camera.bottom = -40 * this.scl;
    dLight.shadow.camera.far = distance * 2 * this.scl;
    const maxTS = renderer.capabilities.maxTextureSize;
    if (maxTS >= 4096) {
      dLight.shadow.mapSize.width = 4096;
      dLight.shadow.mapSize.height = 4096;
    } else if (maxTS >= 2048) {
      dLight.shadow.mapSize.width = 2048;
      dLight.shadow.mapSize.height = 2048;
    } else if (maxTS >= 1024) {
      dLight.shadow.mapSize.width = 1024;
      dLight.shadow.mapSize.height = 1024;
    }

    // const dLightHelper = new THREE.CameraHelper(dLight.shadow.camera);
    //this.dLightHelper = dLightHelper;
    //scene.add(dLightHelper);
    scene.add(dLight);
    scene.add(dLight.target);
    this.dLight = dLight;
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
  loadAndSetupModels = () => {
    loadModels([{ type: 'gltf', model: treeGLTF }])
      .then(objOriginal => {
        objOriginal = objOriginal[0];
        const objs = [objOriginal];
        for (let i = 0; i < 400; i++) {
          const newObj = objOriginal.clone();
          const rndInCircle = randomPositionInCircle(700);
          newObj.position.set(rndInCircle.x, 0, rndInCircle.y);
          newObj.rotation.y = Math.random() * Math.PI * 2;
          objs.push(newObj);
        }
        objs.forEach(obj => {
          obj.scale.set(0.015 * this.scl, 0.015 * this.scl, 0.015 * this.scl);
          obj.castShadow = true;
          obj.receiveShadow = true;

          obj.traverse(o => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              //TODO: will need a better way to determine what has alpha
              if (o.name.includes('leaf')) {
                //this allows transparent textures such a tree leaves
                o.material.transparent = true;
                //this removes depth issues where leaves behind were blacked
                //out behind leaves in front
                o.material.alphaTest = 0.5;
                const customDepthMaterial = new THREE.MeshDepthMaterial({
                  depthPacking: THREE.RGBADepthPacking,

                  map: o.material.map, // or, alphaMap: myAlphaMap

                  alphaTest: 0.5,
                });

                o.customDepthMaterial = customDepthMaterial;
              }
            }
          });
          this.scene.add(obj);
        });
      })
      .catch(err => {
        console.error('error loading models', err);
      });
  };
  onInput = e => {
    const w = this.width;
    const h = this.height;
    //determine mouse x,y position and mouseDownType (none, left, middle, right)
    let mx = this.mx;
    let my = this.my;
    if (e.type.startsWith('mouse')) {
      if (e.type.endsWith('down')) {
        this.mouseDownType = e.button;
        mx = e.pageX;
        my = e.pageY;
      }
      if (e.type.endsWith('move')) {
        mx = e.pageX;
        my = e.pageY;
      }
      if (e.type.endsWith('up')) {
        this.mouseDownType = this.MOUSE.none;
      }
    } else if (e.type.startsWith('touch')) {
      if (e.type.endsWith('start')) {
        if (e.touches.length === 1) {
          this.mouseDownType = this.MOUSE.left;
        } else if (e.touches.length >= 2) {
          this.mouseDownType = this.MOUSE.right;
        }
        const pos = getTouchesXY(e.touches);
        mx = pos.x;
        my = pos.y;
      }
      if (e.type.endsWith('move')) {
        const pos = getTouchesXY(e.touches);
        mx = pos.x;
        my = pos.y;
      }
      if (e.type.endsWith('end')) {
        if (e.touches.length === 0) {
          this.mouseDownType = this.MOUSE.none;
        }
      }
    }
    this.mx = mx;
    this.my = my;

    const { drx, dry, rx, ry } = this.calculatePositionsFromMouse(mx, my);
    if (e.type === 'mousedown' || e.type === 'touchstart') {
      this.drx = rx % 1;
      this.dry = ry % 1;
    }
    if (e.type === 'mouseup' || e.type === 'touchend') {
      //this.drx
      this.drx = rx % 1;
      this.dry = Math.max(0.05, ry);
      //console.log('dry:', ry, 'mx', mx, 'my', my);
    }

    if (this.mouseDownType === this.MOUSE.left) {
      this.orbitCamera();
    }
    //translateCamera();
    //translateShadow();
  };
  componentDidMount() {
    window.THREE = THREE;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    const scene = new THREE.Scene();
    this.scene = scene;
    this.setupScene();
    //disable right click menu
    document.addEventListener('contextmenu', e => e.preventDefault() || false);
    const onInput = this.onInput;
    document.addEventListener('mousedown', onInput);
    document.addEventListener('mousemove', onInput);
    document.addEventListener('mouseup', onInput);
    document.addEventListener('touchstart', onInput);
    document.addEventListener('touchmove', onInput);
    document.addEventListener('touchend', onInput);
    if (window.DeviceOrientationEvent) {
      importDeviceOrientationControls().then(DeviceOrientationControls => {
        const controls = new DeviceOrientationControls(this.camera);
        console.log(controls);
        this.orientationControls = controls;
      });
    }

    this.mount.appendChild(this.renderer.domElement);
    this.start();
  }

  componentWillUnmount() {
    document.removeEventListener(
      'contextmenu',
      e => e.preventDefault() || false
    );
    const onInput = this.onInput;
    document.removeEventListener('mousedown', onInput);
    document.removeEventListener('mousemove', onInput);
    document.removeEventListener('mouseup', onInput);
    document.removeEventListener('touchstart', onInput);
    document.removeEventListener('touchmove', onInput);
    document.removeEventListener('touchend', onInput);
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
  //rx/ry is relative x,y - between 0 and 1, where 1 is the screen width/height
  //ax and ay - absolute x,y for camera coordinates
  //zoom is determined by relative y
  //zoomAbs - absolute zoom for positioning the camera
  calculatePositionsFromMouse = (mx, my) => {
    const drx = this.drx;
    const dry = this.dry;
    const w = this.width;
    const h = this.height;
    const rx = (mx / w - drx) % 1;
    const ax = rx * 80 * this.scl - 40 * this.scl;
    const ry = Math.min(my / h - dry, 0.99) % 1;
    const ay = ry * 80 * this.scl - 20 * this.scl;
    let zoom = Math.max(0.05 * this.scl, ry);
    let zoomAbs = 40 * this.scl * zoom;
    return {
      mx,
      my,
      rx,
      ry,
      ax,
      ay,
      zoom,
      zoomAbs,
      drx,
      dry,
      w,
      h,
    };
  };
  orbitCamera = () => {
    let {
      mx,
      my,
      rx,
      ry,
      ax,
      ay,
      drx,
      dry,
      w,
      h,
      zoom,
      zoomAbs,
    } = this.calculatePositionsFromMouse(this.mx, this.my);
    const camera = this.camera;
    const o = this.o;

    let camOrbitAngle = rx * Math.PI * 2;
    //camera.position.x = ax;
    camera.position.x = Math.cos(camOrbitAngle) * zoomAbs + o.x;

    camera.position.z = Math.sin(camOrbitAngle) * zoomAbs + o.z;
    //camera.position.z = ay;
    camera.position.y = Math.max(ry, 0.05) * 80 + o.y;

    //zoom = Math.max(0.075 * this.scl, zoom);
    //zoomAbs = 40 * this.scl * zoom;
    // zoom = camera.position.y / 100;
    // zoomAbs = camera.position.y;
    //const sl = (w - mx) ** 0.5;
    //const sr = mx ** 0.5;
    //use camOrbitAngle to determine shadow camera left, right, top, bottom etc.
    /*
    if angle is between 0 and Math.PI/2
  */
    //phi is angle around y, theta is inclination/height in the sky

    // const sm = Math.min(Math.max(zoom, 0.7), 1.2);
    // let st = 0.1;
    // let sr = 0.1;
    // let sb = 0.1;
    // let sl = 0.1;
    //camOrbitAngle = camOrbitAngle - Math.PI;
    // sb = angularDistance(camOrbitAngle, Math.PI / 4) / Math.PI;
    // sl = angularDistance(camOrbitAngle, (Math.PI / 4) * 3) / Math.PI;
    // st = angularDistance(camOrbitAngle, Math.PI / 4 + Math.PI) / Math.PI;
    // sr = angularDistance(camOrbitAngle, (Math.PI / 4) * 3 + Math.PI) / Math.PI;

    // if (camOrbitAngle < Math.PI / 2) {
    //   console.log('%cbtm', 'background-color:blue;color:white;');
    //   //
    // } else if (camOrbitAngle <= Math.PI) {
    //   console.log('%clft', 'background-color:green;color:white;');
    //   //((Math.PI/4)*3)
    // } else if (camOrbitAngle <= Math.PI + Math.PI / 2) {
    //   console.log('%ctop', 'background-color:orange;color:white;');
    //   //(Math.PI/4)+Math.PI
    // } else {
    //   console.log('%crgt', 'background-color:red;color:white;');
    //   //((Math.PI/4)*3)+Math.PI
    // }

    // const sarr = { st, sr, sb, sl };
    // st = (sarr.st * 2 + (sarr.sl + sarr.sr)) * 20;
    // sr = (sarr.sr * 2 + (sarr.st + sarr.sb)) * 20;
    // sb = (sarr.sb * 2 + (sarr.sr + sarr.sl)) * 20;
    // sl = (sarr.sl * 2 + (sarr.sb + sarr.st)) * 20;
    // // st = camOrbitAngle;
    // // sr = st;
    // // sb = st;
    // // sl = st;
    // const sMax = 1000 * this.scl;
    // const sMin = 0.1 * this.scl;
    //WARN: sun is undefined...
    const { phi = 0, theta } = this.sun || {};
    const dLight = this.dLight;
    //const dLightHelper = this.dLightHelper;
    //might need to take into account the inclination of the sun
    //to set the left/right relative to the top/bottom
    //position the shadow camera so it fits nicely in the camera view
    if (dLight) {
      // console.log('phi', phi);
      // dLight.shadow.camera.left = sl;
      // dLight.shadow.camera.right = sr;

      // dLight.shadow.camera.top = st;
      // dLight.shadow.camera.bottom = sb;

      // dLight.shadow.camera.left =
      //   -Math.max(sMin, Math.min(sMax, zoomAbs ** sm * sl)) * this.scl;
      // dLight.shadow.camera.right =
      //   Math.max(sMin, Math.min(sMax, zoomAbs ** sm * sr)) * this.scl;
      // dLight.shadow.camera.top =
      //   Math.max(sMin, Math.min(sMax, zoomAbs ** sm * st)) * this.scl;
      // dLight.shadow.camera.bottom =
      //   -Math.max(sMin, Math.min(sMax, zoomAbs ** sm * sb)) * this.scl;
      dLight.shadow.camera.updateProjectionMatrix();
      //dLightHelper.update();
    }
    camera.lookAt(o.x, o.y * this.scl, o.z);
  };
  frame = 0;
  aziA = -0.01;
  frameAzi = 0;
  aziAFrames = 60 * 60; //1 min
  t0 = 0;
  lastMs = 0;
  daynight = {
    minutes: 1,
  };
  aziHeight = 0;
  animate = ms => {
    ms = Math.round(ms / 10);
    const enableCamShowcase = false;
    const cam = this.camera;
    const o = this.o;
    if (this.orientationControls) {
      this.orientationControls.update();
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
    if (this.sky && this.sunSphere) {
      //the closer to 0 and 0.5, the slower the rate of change should be..
      // let divider = 2000;
      //let angle = ((this.frame / divider) * Math.PI) % 1;
      //let azi;
      // if (angle > Math.PI) {
      //   azi = -(Math.cos(angle) * 0.25 + 0.25);
      // } else {
      //   azi = Math.cos(angle) * 0.25 + 0.25;
      // }
      //azi = angle;
      //let sazi = Math.sin(angle) * 0.5;
      //console.log(angle);
      //if (angle > 1 - 0.1) {
      //azi = (1 - sazi);
      //azi = 0.99238;
      //let sazi = Math.sin(this.frame / (divider * 0.1)) * 0.1 + 0.05;
      //console.log(sazi);
      // this.subangle += (Math.PI/2)/60;//60 frames
      //} else {
      //  this.subangle = 0;
      //}

      // var frameId;
      // var angle = 0;
      // var loop = (ms) => {
      //   console.log(1-(Math.cos(angle)*0.00762));
      //   angle += (Math.PI/2)/60;//60 frames

      //   frameId = requestAnimationFrame(loop);
      // }

      if (this.frameAzi === 0) {
        let t0 = Date.now();
        setInterval(() => {
          //console.log('elapsed', Date.now() - t0);
          this.aziA += 1 / 16 / (60 * this.daynight.minutes); //8 minutes for 1 day and night
        }, 1000 / 16);
      }

      if (this.frameAzi % 100 === 0) {
        // console.log(ms, (ms / 100) % 100);
        // this.aziA += 1 / 10000;
      }
      //console.log(this.aziA);
      this.lastMs = ms;
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
      this.brightness = 1 - this.aziHeight ** 4;

      this.frameAzi++;
      // this.dLight.shadow.camera.updateProjectionMatrix();
      // this.dLightHelper.update();
      // this.camera.updateProjectionMatrix();
    }
    // const translateCamera = () => {
    //   const xd = this.rx - 0.5;
    //   o.x += xd;
    //   cam.position.x += xd;
    // };
    const translateShadow = () => {
      const dLight = this.dLight;
      if (!dLight) return;
      const raycaster = new THREE.Raycaster();
      const center = new THREE.Vector2();

      center.x = 0; //rx * 2 - 1;
      center.y = 0; //ry * 2 - 1;

      raycaster.setFromCamera(center, cam);

      // calculate objects intersecting the picking ray
      const intersects = raycaster.intersectObject(this.plane.entity);
      let groundPoint;
      let intersection;
      if (intersects.length > 1) {
        console.warn('how can intersects a flat plane be > 1?', intersects);
        //throw new Error('how can intersects be > 1?');
      }
      if (Array.isArray(intersects) && intersects.length > 0) {
        intersection = intersects[0];
      }
      if (intersection) {
        groundPoint = intersection.point;
      }
      if (!groundPoint) {
        groundPoint = new THREE.Vector3(this.camera.position);
      }
      if (
        !intersection ||
        intersection.length === 0 ||
        groundPoint.distanceTo(this.camera.position) > 100
      ) {
        groundPoint.copy(this.camera.position);
      }

      if (groundPoint) {
        let dy = this.sun.y * this.scl + groundPoint.y;
        if (this.sun.y > -1 * this.scl) {
          if (!dLight.visible) dLight.visible = true;
        } else {
          dLight.visible = false;
          this.brightness = 0.0001;
        }
        dLight.target.position.copy(groundPoint);
        dLight.position.set(
          this.sun.x * this.scl + groundPoint.x,
          dy,
          this.sun.z * this.scl + groundPoint.z
        );
        //cam view intersects with ground plane at groundPoint
        //add groundPoint x,y,z to the directional light position and target point.
      }
      //dLight.shadow.camera.updateProjectionMatrix();
    };
    //translateCamera();
    //if (this.mouseDownType === this.MOUSE.left) {
    translateShadow();

    if (this.brightness > 0) {
      this.updateAmbientLightBrightness(this.brightness);
    }
    //}
    //if (this.trees) this.trees.position.x = Math.sin(ms / 300) * 40;
    //this.dLight.position.set(-x * 10, y * 10, -z * 10);
    //this.dLight.shadow.camera.updateProjectionMatrix();

    this.renderScene();
    this.frameId = window.requestAnimationFrame(this.animate);
    this.frame++;
  };

  renderScene = () => {
    this.renderer.render(this.scene, this.camera);
  };

  render() {
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
            <div
              style={{ width: '100%', height: '100%', position: 'fixed' }}
              ref={mount => {
                this.mount = mount;
              }}
            />
          );
        }}
      </Resize>
    );
  }
}

export default Scene;
