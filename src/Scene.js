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
    dLight.shadow.camera.right = 15 * this.scl;
    dLight.shadow.camera.left = -15 * this.scl;
    dLight.shadow.camera.top = 20 * this.scl;
    dLight.shadow.camera.bottom = -10 * this.scl;
    dLight.shadow.camera.far = 2200 * this.scl;
    dLight.shadow.mapSize.width = 1024;
    dLight.shadow.mapSize.height = 1024;
    //var helper = new THREE.CameraHelper(dLight.shadow.camera);
    //scene.add(helper);
    scene.add(dLight);

    var aLight = new THREE.AmbientLight(0x404040, 1 * brightness); // soft white light
    scene.add(aLight);

    camera.position.z = 4;

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
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
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
    //const cube = this.cube;
    const cam = this.camera;
    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;
    let x = Math.sin(ms / 160) * 12 * this.scl;
    let y = Math.cos(ms / 320) * 9 * this.scl + 11 * this.scl;
    let z = Math.cos(ms / 210) * 12 * this.scl;
    cam.position.set(x, y, z);
    //this.dLight.position.set(-x * 10, y * 10, -z * 10);
    //this.dLight.shadow.camera.updateProjectionMatrix();
    y = Math.sin(ms / 220) * 5 * this.scl + 5 * this.scl;
    var point = new THREE.Vector3(0, y, 0);

    cam.lookAt(point);
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
