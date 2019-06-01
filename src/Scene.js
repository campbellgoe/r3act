import React, { Component } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import Resize from './Resize';
import treeGLTF from './models/tree-1/scene.gltf';
import treeFBX from './models/tree-1-fbx/trees1.fbx';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
class Scene extends Component {
  loadModels = () => {
    return new Promise((resolve, reject) => {
      const type = 'gltf';
      switch (type) {
        case 'fbx': {
          import('three/examples/js/loaders/FBXLoader').then(() => {
            // Note : window. is required here to make it works.
            const loader = new window.THREE.FBXLoader();
            // Have fun here
            console.log('loader:', loader);
            loader.load(
              treeFBX,
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
          ///*
          const loader = new GLTFLoader();

          loader.load(
            treeGLTF,
            function(gltf) {
              resolve(gltf.scene);
            },
            undefined,
            function(error) {
              reject(error);
            }
          );
          //*/
          break;
        }
        default: {
          break;
        }
      }
    });
  };
  scl = 3;
  //alpha and beta must be normalized between 0 and Math.PI*2
  angularDistance = (alpha, beta) => {
    const pi = Math.PI;
    const tau = pi * 2;
    const phi = Math.abs(beta - alpha) % tau; // This is either the distance or 360 - distance
    const distance = phi > pi ? tau - phi : phi;
    return distance;
  };
  mouseIsDown = false;
  o = {
    x: 0,
    y: 0.1,
    z: 0,
  };
  createSky = scene => {
    return new Promise((resolve, reject) => {
      //  var controls, renderer;
      import('three/examples/js/objects/Sky')
        .then(() => {
          var sky, sunSphere;

          // Add Sky
          sky = new window.THREE.Sky();
          sky.scale.setScalar(450000);
          this.sky = sky;
          scene.add(sky);

          // Add Sun Helper
          sunSphere = new THREE.Mesh(
            new THREE.SphereBufferGeometry(20000, 16, 8),
            new THREE.MeshBasicMaterial({
              color: 0xffffff,
            })
          );
          sunSphere.position.y = -7000;
          sunSphere.visible = false;
          scene.add(sunSphere);

          /// GUI

          var effectController = {
            turbidity: 10,
            rayleigh: 2,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.8,
            luminance: 1,
            inclination: 0.2, // elevation / inclination
            azimuth: 0.475, // Facing front,
            sun: true,
          };

          var distance = 7000;

          var uniforms = sky.material.uniforms;
          uniforms['turbidity'].value = effectController.turbidity;
          uniforms['rayleigh'].value = effectController.rayleigh;
          uniforms['luminance'].value = effectController.luminance;
          uniforms['mieCoefficient'].value = effectController.mieCoefficient;
          uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

          var theta = Math.PI * (effectController.inclination - 0.5);
          var phi = 2 * Math.PI * (effectController.azimuth - 0.5);

          sunSphere.position.x = distance * Math.cos(phi);
          sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta);
          sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta);

          sunSphere.visible = effectController.sun;

          uniforms['sunPosition'].value.copy(sunSphere.position);

          /*        var gui = new dat.GUI();

          gui.add( effectController, "turbidity", 1.0, 20.0, 0.1 ).onChange( guiChanged );
          gui.add( effectController, "rayleigh", 0.0, 4, 0.001 ).onChange( guiChanged );
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
  sunX = 1000;
  sunY = 100;
  sunZ = 1000;
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
  componentDidMount() {
    window.THREE = THREE;

    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;
    const brightness = 1;
    const skyColour = 'rgba(35,139,255,1)'; //'#78a8bb';
    const scene = new THREE.Scene();
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
    const cameraControls = new OrbitControls(camera, renderer.domElement);

    camera.position.set(0, 20, 100);
    // cameraControls.update();
    this.cameraControls = cameraControls;
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.createSky(scene).then(({ x, y, z, distance }) => {
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
      dLight.shadow.camera.near = this.sunD - 200;
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
    console.log('plane', plane.entity);
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
      const w = window.innerWidth;
      const h = window.innerHeight;
      let mx, my;
      if (e.type === 'mousedown') {
        this.mouseIsDown = true;
      } else if (e.type === 'mouseup') {
        this.mouseIsDown = false;
      }
      if (e.type.startsWith('mouse')) {
        mx = e.pageX;
        my = e.pageY;
      } else if (e.type === 'touchmove') {
        if (e.touches.length === 1) {
          mx = e.touches[0].pageX;
          my = h - e.touches[0].pageY;
          this.mouseIsDown = false;
        } else if (e.touches.length === 2) {
          mx = (e.touches[0].pageX + e.touches[1].pageX) / 2;
          my = (e.touches[0].pageY + e.touches[1].pageY) / 2;
          this.mouseIsDown = true;
        }
      }
      const rx = mx / w;
      this.rx = rx;
      const ax = rx * 80 * this.scl - 40 * this.scl;
      const ry = my / h;
      this.ry = ry;
      const ay = ry * 80 * this.scl - 20 * this.scl;
      const o = this.o;
      const orbitCamera = () => {
        let zoom = Math.max(0.05 * this.scl, ry);
        let zoomAbs = 40 * this.scl * zoom;
        const camOrbitAngle = rx * Math.PI * 2;
        //camera.position.x = ax;
        camera.position.x = Math.cos(camOrbitAngle) * zoomAbs + o.x;

        camera.position.z = Math.sin(camOrbitAngle) * zoomAbs + o.z;
        //camera.position.z = ay;
        camera.position.y = Math.max(ay, 3 * this.scl) + o.y;

        zoom = Math.max(0.075 * this.scl, zoom);
        zoomAbs = 40 * this.scl * zoom;

        //const sl = (w - mx) ** 0.5;
        //const sr = mx ** 0.5;
        //use camOrbitAngle to determine shadow camera left, right, top, bottom etc.
        /*
        if angle is between 0 and Math.PI/2
      */
        const sm = Math.min(Math.max(zoom + 0.5, 0.7), 1.2);
        let st = 0.1;
        let sr = 0.1;
        let sb = 0.1;
        let sl = 0.1;
        console.log('aangle:', camOrbitAngle);
        //camOrbitAngle = camOrbitAngle + Math.PI;
        sb = this.angularDistance(camOrbitAngle, Math.PI / 4) / Math.PI;
        sl = this.angularDistance(camOrbitAngle, (Math.PI / 4) * 3) / Math.PI;
        st =
          this.angularDistance(camOrbitAngle, Math.PI / 4 + Math.PI) / Math.PI;
        sr =
          this.angularDistance(camOrbitAngle, (Math.PI / 4) * 3 + Math.PI) /
          Math.PI;
        console.log('sb', sb, 'sl', sl);
        if (camOrbitAngle < Math.PI / 2) {
          console.log('btm');
          //
        } else if (camOrbitAngle <= Math.PI) {
          console.log('lft');
          //((Math.PI/4)*3)
        } else if (camOrbitAngle <= Math.PI + Math.PI / 2) {
          console.log('top');
          //(Math.PI/4)+Math.PI
        } else {
          console.log('rgt');
          //((Math.PI/4)*3)+Math.PI
        }
        const sarr = { st, sr, sb, sl };
        st = sarr.st * 2 + (sarr.sl + sarr.sr);
        sr = (sarr.sr * 2 + (sarr.st + sarr.sb)) * 1.5;
        sb = sarr.sb * 2 + (sarr.sr + sarr.sl);
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
          //dLight.shadow.camera.updateProjectionMatrix();
          //dLightHelper.update();
        }
        camera.lookAt(o.x, o.y * this.scl, o.z);
      };

      // dLight.position.set(
      //   400 * this.scl,
      //   1000 * this.scl,
      //   600 * this.scl
      // );
      // this.dLight.position.set(-x * 10, y * 10, -z * 10);
      if (this.mouseIsDown) {
        //translateCamera();
        //translateShadow();
      } else {
        //orbitCamera();
        //translateShadow();
      }
    };
    // document.addEventListener('mousedown', onMove);
    // document.addEventListener('mousemove', onMove);
    // document.addEventListener('mouseup', onMove);
    // document.addEventListener('touchmove', onMove);
    const o = this.o;
    camera.lookAt(o.x, o.y, o.z);
    cameraControls.update();
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    const onCameraChange = e => {
      console.log(e);
      if (!this.allowRender) this.allowRender = true;
    };
    cameraControls.addEventListener('change', onCameraChange);
    //console.log('quat', camera.quaternion);
    // camera.quaternion.onChangeCallback = () => {
    //   console.log('camera change..');
    //   console.log(camera);
    //   if (!this.allowRender) this.allowRender = true;
    //   if (!this.cameraQuaternionChanged) this.cameraQuaternionChanged = true;
    // };
    //this.cube = cube.entity;
    this.loadModels()
      .then(objOriginal => {
        const objs = [objOriginal];
        for (let i = 0; i < 300; i++) {
          const newObj = objOriginal.clone();
          const rndInCircle = this.randomPositionInCircle(400);
          newObj.position.set(rndInCircle.x, 0, rndInCircle.y);
          newObj.rotation.y = Math.random() * Math.PI * 2;

          objs.push(newObj);
        }
        objs.forEach(obj => {
          console.log('model:', obj);
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
                console.log('material', o.material.map);
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
  groundPoint = null;
  translateShadow = () => {
    let shadowUpdated = false;
    const cam = this.camera;
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
      if (!this.groundPoint || groundPoint.distanceTo(this.groundPoint) > 10) {
        //cam view intersects with ground plane at groundPoint
        //add groundPoint x,y,z to the directional light position and target point.
        dLight.target.position.copy(groundPoint);
        dLight.position.set(
          this.sunX * this.scl + groundPoint.x,
          this.sunY * this.scl + groundPoint.y,
          this.sunZ * this.scl + groundPoint.z
        );
        this.dLightHelper.update();
        this.groundPoint = groundPoint;
        shadowUpdated = true;
      }
      if (!this.groundPoint) this.groundPoint = groundPoint;
    }
    return shadowUpdated;
  };
  rotateShadow = () => {
    const dLight = this.dLight;
    const dLightHelper = this.dLightHelper;
    if (dLight) {
      dLight.shadow.camera.left = -10;
      dLight.shadow.camera.right = 10;

      dLight.shadow.camera.top = 10;
      dLight.shadow.camera.bottom = -10;
      dLight.shadow.camera.updateProjectionMatrix();
      // dLightHelper.update();
    }
  };
  animate = ms => {
    if (this.allowRender) {
      ms = Math.round(ms / 10);
      if (this.translateShadow()) {
        this.rotateShadow();
      }
      this.renderScene();
      this.allowRender = false;
    }
    this.frameId = window.requestAnimationFrame(this.animate);
  };

  renderScene = () => {
    this.renderer.render(this.scene, this.camera);
  };
  lastW = 0;
  lastH = 0;
  render() {
    return (
      <Resize>
        {({ width, height }) => {
          console.log(width);
          if (
            width &&
            height &&
            (width !== this.lastW || height !== this.lastH)
          ) {
            console.log(width, height);
            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.lastW = width;
            this.lastH = height;
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
