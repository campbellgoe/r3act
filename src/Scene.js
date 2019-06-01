import React, { Component } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import Resize from './Resize';
import treeGLTF from './models/tree-1/scene.gltf';
//import treeFBX from './models/tree-1-fbx/trees1.fbx';
const getTouchesXY = ts => {
  const pos = {
    x: 0,
    y: 0,
  };
  if (ts.length === 1) {
    pos.x = ts[0].pageX;
    pos.y = ts[0].pageY;
  } else if (ts.length >= 2) {
    pos.x = (ts[0].pageX + ts[1].pageX) / 2;
    pos.y = (ts[0].pageY + ts[1].pageY) / 2;
  }
  return pos;
};
const loadModels = models => {
  if (!Array.isArray(models)) throw new Error('models must be an array');
  return Promise.all(
    models.map(({ type, model }) => {
      return new Promise((resolve, reject) => {
        switch (type) {
          case 'fbx': {
            import('three/examples/js/loaders/FBXLoader').then(() => {
              // Note : window. is required here to make it works.
              const loader = new window.THREE.FBXLoader();
              // Have fun here
              //console.log('loader:', loader);
              loader.load(
                model,
                function(obj) {
                  resolve(obj);
                  //scene.add( gltf.scene );
                },
                undefined,
                function(error) {
                  reject(error);
                }
              );
            });
            break;
          }
          case 'gltf': {
            const loader = new GLTFLoader();

            loader.load(
              model,
              function(gltf) {
                resolve(gltf.scene);
              },
              undefined,
              function(error) {
                reject(error);
              }
            );
            break;
          }
          default: {
            throw new Error('Unknown model type ' + type);
          }
        }
      });
    })
  );
};
//get the distance between 2 angles
//alpha and beta must be normalized between 0 and Math.PI*2
const angularDistance = (alpha, beta) => {
  const pi = Math.PI;
  const tau = pi * 2;
  // This is either the distance or 2pi - distance
  const phi = Math.abs(beta - alpha) % tau;
  const distance = phi > pi ? tau - phi : phi;
  return distance;
};
class Scene extends Component {
  loadModels = loadModels;
  scl = 3;
  angularDistance = angularDistance;
  //camera x,y,z offset
  o = {
    x: 0,
    y: 1,
    z: 0,
  };
  //xyz coords of the sun
  sunX = 0;
  sunY = 0;
  sunZ = 0;
  createSky = (
    settings = {
      turbidity: 10,
      rayleigh: 2,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      luminance: 1,
      inclination: 0.2,
      azimuth: 0.45,
      sun: true,
    }
  ) => {
    const scene = this.scene;
    return new Promise((resolve, reject) => {
      //  var controls, renderer;
      import('three/examples/js/objects/Sky')
        .then(() => {
          let sky, sunSphere;

          // Add Sky
          sky = new window.THREE.Sky();
          sky.scale.setScalar(450000);
          scene.add(sky);

          // Add Sun
          sunSphere = new THREE.Mesh(
            new THREE.SphereBufferGeometry(20000, 16, 8),
            new THREE.MeshBasicMaterial({
              color: 0xffffff,
            })
          );

          scene.add(sunSphere);

          let uniforms = sky.material.uniforms;
          uniforms['turbidity'].value = settings.turbidity;
          uniforms['rayleigh'].value = settings.rayleigh;
          uniforms['luminance'].value = settings.luminance;
          uniforms['mieCoefficient'].value = settings.mieCoefficient;
          uniforms['mieDirectionalG'].value = settings.mieDirectionalG;

          let theta = Math.PI * (settings.inclination - 0.5);
          let phi = 2 * Math.PI * (settings.azimuth - 0.5);
          let distance = 7000;
          sunSphere.position.x = distance * Math.cos(phi);
          sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta);
          sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta);

          sunSphere.visible = settings.sun;

          uniforms['sunPosition'].value.copy(sunSphere.position);

          /*
            var gui = new dat.GUI();

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
          resolve({
            ...sunSphere.position,
            distance,
          });
        })
        .catch(err => {
          reject(err);
        });
    });
  };
  randomPositionInCircle = radius => {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random() * radius * radius);
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
    };
  };
  distanceSquared = ({ x: ax, y: ay }, { x: bx, y: by }) => {
    const a = ax - bx;
    const b = ay - by;
    return (a ** 2 + b ** 2) ** 0.5;
  };
  MOUSE = {
    none: -1,
    left: 0,
    middle: 1,
    right: 2,
  };
  mouseDownType = -1;
  mx = 0;
  my = 0;
  componentDidMount() {
    window.THREE = THREE;

    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;
    const brightness = 1;
    const skyColour = 'rgba(35,139,255,1)'; //'#78a8bb';
    const scene = new THREE.Scene();
    this.scene = scene;
    /*const fog = {
      color: 'rgba(255,255,230,0.1)',
      density: 0.001,
      near: 60 * this.scl,
      far: 2000 * this.scl,
    };
    */
    //scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.createSky().then(({ x, y, z, distance }) => {
      const skyLightCoords = new THREE.Vector3(x, y, z);
      //skyLightCoords.setFromSphericalCoords(radius, phi, theta);
      this.sunX = skyLightCoords.x;
      this.sunY = skyLightCoords.y;
      this.sunZ = skyLightCoords.z;
      this.sunD = distance;
      var dLight = new THREE.DirectionalLight('#fafaff', 2 * brightness);
      //dLight.position.set(400 * this.scl, 1000 * this.scl, 600 * this.scl);
      dLight.castShadow = true;
      dLight.shadow.camera.zoom = 1;
      /*dLight.shadow.camera.right = 5 * this.scl;
      dLight.shadow.camera.left = -15 * this.scl;
      dLight.shadow.camera.top = 20 * this.scl;
      dLight.shadow.camera.bottom = -10 * this.scl;*/
      dLight.shadow.camera.far = this.sunD * 2 * this.scl;
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

      var dLightHelper = new THREE.CameraHelper(dLight.shadow.camera);
      this.dLightHelper = dLightHelper;
      scene.add(dLightHelper);
      scene.add(dLight);
      scene.add(dLight.target);
      this.dLight = dLight;
    });
    //Float, theta : Float )
    //cube
    // const cube = {
    //   geometry: new THREE.BoxBufferGeometry(2, 15, 0.5),
    //   material: new THREE.MeshLambertMaterial({ color: '#433F81' }),
    // };
    // cube.entity = new THREE.Mesh(cube.geometry, cube.material);
    // cube.entity.castShadow = true;
    // cube.entity.receiveShadow = true;
    // cube.entity.position.y = 5;
    // cube.entity.position.x = 8;
    // cube.entity.position.z = 6;
    //line
    // const line = {
    //   geometry: new THREE.Geometry(),
    //   material: new THREE.LineBasicMaterial({ color: '#0000ff' }),
    // };
    // const lineVerticies = [
    //   new THREE.Vector3(-10, 0, 0),
    //   new THREE.Vector3(0, 5, 0),
    //   new THREE.Vector3(10, 0, 0),
    // ];
    // line.geometry.vertices.push(...lineVerticies);
    // line.entity = new THREE.Line(line.geometry, line.material);

    // White directional light at half intensity shining from the top.

    var aLight = new THREE.AmbientLight(skyColour, 0.2 * brightness); // soft white light
    scene.add(aLight);
    const hLight = new THREE.HemisphereLight(
      skyColour,
      'rgba(88,67,35,1)',
      0.5 * brightness
    );
    scene.add(hLight);
    const plane = {
      geometry: new THREE.PlaneGeometry(3000 * this.scl, 3000 * this.scl, 1, 1),
      material: new THREE.MeshLambertMaterial({
        color: '#364823',
        side: THREE.FrontSide,
      }),
    };
    plane.geometry.rotateX(-(Math.PI / 2));
    plane.entity = new THREE.Mesh(plane.geometry, plane.material);
    plane.entity.receiveShadow = true;
    this.plane = plane;
    scene.add(plane.entity);
    //scene.add(cube.entity);
    //scene.add(line.entity);

    renderer.setClearColor(skyColour);
    renderer.setSize(width, height);
    //camera.position.set(0, 8 * this.scl, 10 * this.scl);
    //camera.lookAt(0, 4 * this.scl, 0);
    const onMove = e => {
      const w = this.width;
      const h = this.height;
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
        console.log('dry:', ry, 'mx', mx, 'my', my);
      }
      // dLight.position.set(
      //   400 * this.scl,
      //   1000 * this.scl,
      //   600 * this.scl
      // );
      // this.dLight.position.set(-x * 10, y * 10, -z * 10);
      if (this.mouseDownType === this.MOUSE.left) {
        this.orbitCamera();
      }
      //translateCamera();
      //translateShadow();
    };
    document.addEventListener('contextmenu', e => {
      //disable right click menu
      e.preventDefault();
      return false;
    });
    document.addEventListener('mousedown', onMove);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onMove);
    document.addEventListener('touchstart', onMove);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onMove);
    this.camera = camera;
    this.renderer = renderer;
    //this.cube = cube.entity;
    this.loadModels([{ type: 'gltf', model: treeGLTF }])
      .then(objOriginal => {
        objOriginal = objOriginal[0];
        const objs = [objOriginal];
        for (let i = 0; i < 200; i++) {
          const newObj = objOriginal.clone();
          const rndInCircle = this.randomPositionInCircle(500);
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

              if (o.name.includes('leaf')) {
                //this allows transparent textures such a tree leaves
                o.material.transparent = true;
                //this removes depth issues where leaves behind were blacked
                //out behind leaves in front
                o.material.alphaTest = 0.5;
                var customDepthMaterial = new THREE.MeshDepthMaterial({
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
        this.trees = objs;
        //       ((obj as THREE.Mesh).material as THREE.Material).transparent = true;
        //((obj as THREE.Mesh).material as THREE.Material).side = THREE.DoubleSide;
        //((obj as THREE.Mesh).material as THREE.Material).alphaTest = 0.5;
      })
      .catch(err => {
        console.error('error loading models', err);
      });

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
  drx = 0;
  dry = 0;
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

    const camOrbitAngle = rx * Math.PI * 2;
    //camera.position.x = ax;
    camera.position.x = Math.cos(camOrbitAngle) * zoomAbs + o.x;

    camera.position.z = Math.sin(camOrbitAngle) * zoomAbs + o.z;
    //camera.position.z = ay;
    camera.position.y = Math.max(ry, 0.05) * 80 + o.y;

    //zoom = Math.max(0.075 * this.scl, zoom);
    //zoomAbs = 40 * this.scl * zoom;
    zoom = camera.position.y / 100;
    zoomAbs = camera.position.y;
    //const sl = (w - mx) ** 0.5;
    //const sr = mx ** 0.5;
    //use camOrbitAngle to determine shadow camera left, right, top, bottom etc.
    /*
    if angle is between 0 and Math.PI/2
  */
    const sm = Math.min(Math.max(zoom, 0.7), 1.2);
    let st = 0.1;
    let sr = 0.1;
    let sb = 0.1;
    let sl = 0.1;
    //camOrbitAngle = camOrbitAngle + Math.PI;
    sb = this.angularDistance(camOrbitAngle, Math.PI / 4) / Math.PI;
    sl = this.angularDistance(camOrbitAngle, (Math.PI / 4) * 3) / Math.PI;
    st = this.angularDistance(camOrbitAngle, Math.PI / 4 + Math.PI) / Math.PI;
    sr =
      this.angularDistance(camOrbitAngle, (Math.PI / 4) * 3 + Math.PI) /
      Math.PI;
    // if (camOrbitAngle < Math.PI / 2) {
    //   console.log('btm');
    //   //
    // } else if (camOrbitAngle <= Math.PI) {
    //   console.log('lft');
    //   //((Math.PI/4)*3)
    // } else if (camOrbitAngle <= Math.PI + Math.PI / 2) {
    //   console.log('top');
    //   //(Math.PI/4)+Math.PI
    // } else {
    //   console.log('rgt');
    //   //((Math.PI/4)*3)+Math.PI
    // }
    const sarr = { st, sr, sb, sl };
    st = (sarr.st * 2 + (sarr.sl + sarr.sr)) * 1.5;
    sr = (sarr.sr * 2 + (sarr.st + sarr.sb)) * 1.5;
    sb = (sarr.sb * 2 + (sarr.sr + sarr.sl)) * 1.5;
    sl = (sarr.sl * 2 + (sarr.sb + sarr.st)) * 1.5;

    st = Math.max(0.4, st * 1.3);
    sr = Math.max(0.4, sr * 1.3);
    sb = Math.max(0.4, sb * 1.3);
    sl = Math.max(0.4, sl * 1.3);
    // st = camOrbitAngle;
    // sr = st;
    // sb = st;
    // sl = st;
    const sMax = 50 * this.scl;
    const sMin = 3 * this.scl;
    const dLight = this.dLight;
    const dLightHelper = this.dLightHelper;
    if (dLight) {
      dLight.shadow.camera.left =
        -Math.max(sMin, Math.min(sMax, zoomAbs ** sm * sl)) * this.scl;
      dLight.shadow.camera.right =
        Math.max(sMin, Math.min(sMax, zoomAbs ** sm * sr)) * this.scl;

      dLight.shadow.camera.top =
        Math.max(sMin, Math.min(sMax, zoomAbs ** sm * st)) * this.scl;
      dLight.shadow.camera.bottom =
        -Math.max(sMin, Math.min(sMax, zoomAbs ** sm * sb)) * this.scl;
      dLight.shadow.camera.updateProjectionMatrix();
      dLightHelper.update();
    }
    camera.lookAt(o.x, o.y * this.scl, o.z);
  };
  animate = ms => {
    ms = Math.round(ms / 10);
    const enableCamShowcase = false;
    const cam = this.camera;
    const o = this.o;
    //const cube = this.cube;
    if (enableCamShowcase) {
      // cube.rotation.x += 0.01;
      // cube.rotation.y += 0.01;
      let x = Math.sin(ms / 160) * 12 * this.scl;
      let y = Math.cos(ms / 320) * 9 * this.scl + 11 * this.scl;
      let z = Math.cos(ms / 210) * 12 * this.scl;

      cam.position.set(o.x, o.y, o.z);
      y = Math.sin(ms / 220) * 5 * this.scl + 5 * this.scl;
      //var point = new THREE.Vector3(0, y, 0);

      //cam.lookAt(point);
      this.helper.update();
    }

    // const translateCamera = () => {
    //   const xd = this.rx - 0.5;
    //   o.x += xd;
    //   cam.position.x += xd;
    // };
    const translateShadow = () => {
      const dLight = this.dLight;
      if (!dLight) return;
      var raycaster = new THREE.Raycaster();
      var center = new THREE.Vector2();

      center.x = 0; //rx * 2 - 1;
      center.y = 0; //ry * 2 - 1;

      raycaster.setFromCamera(center, cam);

      // calculate objects intersecting the picking ray
      var intersects = raycaster.intersectObject(this.plane.entity);
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

      if (groundPoint) {
        //cam view intersects with ground plane at groundPoint
        //add groundPoint x,y,z to the directional light position and target point.
        dLight.target.position.copy(groundPoint);
        dLight.position.set(
          this.sunX * this.scl + groundPoint.x,
          this.sunY * this.scl + groundPoint.y,
          this.sunZ * this.scl + groundPoint.z
        );
      }
      dLight.shadow.camera.updateProjectionMatrix();
    };
    //translateCamera();
    if (this.mouseDownType === this.MOUSE.left) {
      translateShadow();
    }
    //if (this.trees) this.trees.position.x = Math.sin(ms / 300) * 40;
    //this.dLight.position.set(-x * 10, y * 10, -z * 10);
    //this.dLight.shadow.camera.updateProjectionMatrix();

    this.renderScene();
    this.frameId = window.requestAnimationFrame(this.animate);
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
