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
  componentDidMount() {
    window.THREE = THREE;

    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;
    const brightness = 1;
    const skyColour = '#939898'; //'#78a8bb';
    const scene = new THREE.Scene();
    const fog = {
      color: skyColour,
      density: 0.009,
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
    dLight.shadow.mapSize.width = 1024;
    dLight.shadow.mapSize.height = 1024;

    var helper = new THREE.CameraHelper(dLight.shadow.camera);
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
    scene.add(plane.entity);
    //scene.add(cube.entity);
    //scene.add(line.entity);

    renderer.setClearColor(skyColour);
    renderer.setSize(width, height);
    camera.position.set(0, 8 * this.scl, 10 * this.scl);
    camera.lookAt(0, 4 * this.scl, 0);
    const onMove = e => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      let mx, my;
      if (e.type === 'mousemove') {
        mx = e.pageX;
        my = e.pageY;
      } else if (e.type === 'touchmove') {
        mx = w - e.touches[0].pageX;
        my = h - e.touches[0].pageY;
      }

      const rx = mx / w;
      const ax = rx * 80 - 40;
      camera.position.x = ax;

      const ry = my / h;
      const ay = ry * 80 - 20;
      camera.position.z = ay;
      camera.position.y = ay;

      var raycaster = new THREE.Raycaster();
      var center = new THREE.Vector2();

      center.x = 0; //rx * 2 - 1;
      center.y = 0; //ry * 2 - 1;

      raycaster.setFromCamera(center, camera);

      // calculate objects intersecting the picking ray
      var intersects = raycaster.intersectObject(plane.entity);
      let groundPoint;
      for (var i = 0; i < intersects.length; i++) {
        groundPoint = intersects[i].point;
        //intersects[i].object.material.color.set(0xff0000);
      }
      if (intersects.length > 1) {
        throw new Error('how can intersects be > 1?');
      }
      if (groundPoint) {
        //cam view intersects with ground plane at groundPoint
        //add groundPoint x,y,z to the directional light position and target point.
        dLight.target.position.copy(groundPoint);
        dLight.position.set(
          400 * this.scl + groundPoint.x,
          1000 * this.scl + groundPoint.y,
          600 * this.scl + groundPoint.z
        );
      }

      const sl = (w - mx) ** 0.5;
      const sr = mx ** 0.5;
      dLight.shadow.camera.left = -sl - 20;
      dLight.shadow.camera.right = sr + 20;

      dLight.shadow.camera.top = 10 * this.scl;
      dLight.shadow.camera.bottom = -5 * this.scl;
      // dLight.position.set(
      //   400 * this.scl,
      //   1000 * this.scl,
      //   600 * this.scl
      // );
      // this.dLight.position.set(-x * 10, y * 10, -z * 10);
      dLight.shadow.camera.updateProjectionMatrix();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove);
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    //this.cube = cube.entity;
    this.dLight = dLight;

    this.loadModels()
      .then(obj => {
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
        this.trees = obj;
        this.scene.add(obj);
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
    //const cube = this.cube;
    if (enableCamShowcase) {
      const cam = this.camera;
      // cube.rotation.x += 0.01;
      // cube.rotation.y += 0.01;
      let x = Math.sin(ms / 160) * 12 * this.scl;
      let y = Math.cos(ms / 320) * 9 * this.scl + 11 * this.scl;
      let z = Math.cos(ms / 210) * 12 * this.scl;
      cam.position.set(x, y, z);
      y = Math.sin(ms / 220) * 5 * this.scl + 5 * this.scl;
      var point = new THREE.Vector3(0, y, 0);

      cam.lookAt(point);
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
