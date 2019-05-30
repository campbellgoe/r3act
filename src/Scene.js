import React, { Component } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import Resize from './Resize';
import treeGLTF from './models/tree-1/scene.gltf';
import treeFBX from './models/tree-1-fbx/trees1.fbx';
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
  componentDidMount() {
    window.THREE = THREE;

    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;
    const brightness = 1;
    const skyColour = '#939898'; //'#78a8bb';
    const scene = new THREE.Scene();
    const fog = {
      color: skyColour,
      density: 0.0009,
    };
    scene.fog = new THREE.FogExp2(fog.color, fog.density);
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    var dLight = new THREE.DirectionalLight('#fafaff', 0.3 * brightness);
    dLight.position.set(400 * this.scl, 1000 * this.scl, 600 * this.scl);
    dLight.castShadow = true;
    dLight.shadow.camera.zoom = 1;
    dLight.shadow.camera.right = 5 * this.scl;
    dLight.shadow.camera.left = -15 * this.scl;
    dLight.shadow.camera.top = 20 * this.scl;
    dLight.shadow.camera.bottom = -10 * this.scl;
    dLight.shadow.camera.far = 2200 * this.scl;
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

    var helper = new THREE.CameraHelper(dLight.shadow.camera);
    this.helper = helper;
    scene.add(helper);
    scene.add(dLight);
    scene.add(dLight.target);

    var aLight = new THREE.AmbientLight(0x404040, 1 * brightness); // soft white light
    scene.add(aLight);

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
        const zoom = Math.max(0.05 * this.scl, ry);
        const zoomAbs = 40 * this.scl * zoom;
        const camOrbitAngle = rx * Math.PI * 2;
        //camera.position.x = ax;
        camera.position.x = Math.cos(camOrbitAngle) * zoomAbs + o.x;

        camera.position.z = Math.sin(camOrbitAngle) * zoomAbs + o.z;
        //camera.position.z = ay;
        camera.position.y = Math.max(ay, 3 * this.scl) + o.y;

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
        const sMin = 2 * this.scl;
        dLight.shadow.camera.left =
          -Math.max(sMin, Math.min(sMax, zoomAbs ** sm * sl)) * this.scl;
        dLight.shadow.camera.right =
          Math.max(sMin, Math.min(sMax, zoomAbs ** sm * sr)) * this.scl;

        dLight.shadow.camera.top =
          Math.max(sMin, Math.min(sMax, zoomAbs ** sm * st)) * this.scl;
        dLight.shadow.camera.bottom =
          -Math.max(sMin, Math.min(sMax, zoomAbs ** sm * sb)) * this.scl;
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
        orbitCamera();
        //translateShadow();
      }
      dLight.shadow.camera.updateProjectionMatrix();
      helper.update();
    };
    document.addEventListener('mousedown', onMove);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onMove);
    document.addEventListener('touchmove', onMove);
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    //this.cube = cube.entity;
    this.dLight = dLight;

    this.loadModels()
      .then(objOriginal => {
        const objs = [objOriginal];
        for (let i = 0; i < 100; i++) {
          const newObj = objOriginal.clone();
          newObj.position.set(
            Math.random() * 800 - 400,
            0,
            Math.random() * 800 - 400
          );
          newObj.rotation.y = Math.random() * Math.PI * 2;
          objs.push(newObj);
        }
        objs.forEach(obj => {
          console.log('model:', obj);
          obj.scale.set(0.015 * this.scl, 0.015 * this.scl, 0.015 * this.scl);
          obj.castShadow = true;

          obj.traverse(o => {
            if (o.isMesh) {
              o.castShadow = true;

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

    if (this.mouseIsDown) {
      const translateCamera = () => {
        const xd = this.rx - 0.5;
        o.x += xd;
        cam.position.x += xd;
      };
      const translateShadow = () => {
        const dLight = this.dLight;
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
            1000 * this.scl + groundPoint.x,
            1000 * this.scl + groundPoint.y,
            1000 * this.scl + groundPoint.z
          );
        }
        dLight.shadow.camera.updateProjectionMatrix();
      };
      translateCamera();
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
          console.log(width);
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
