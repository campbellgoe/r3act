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
              gltf.scene.traverse(child => {
                if (child.isMesh && child.name.includes('leaf')) {
                  //this allows transparent textures such a tree leaves
                  child.material.transparent = true;
                  //this removes depth issues where leaves behind were blacked
                  //out behind leaves in front
                  child.material.alphaTest = 0.5;
                }
              });
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

  componentDidMount() {
    window.THREE = THREE;

    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;
    renderer.shadowMap.enabled = true;
    //cube
    const cube = {
      geometry: new THREE.BoxBufferGeometry(400, 300, 300),
      material: new THREE.MeshLambertMaterial({ color: '#433F81' }),
    };
    cube.entity = new THREE.Mesh(cube.geometry, cube.material);
    cube.entity.castShadow = true;
    cube.entity.receiveShadow = true;
    cube.entity.position.y = 400;
    //line
    const line = {
      geometry: new THREE.Geometry(),
      material: new THREE.LineBasicMaterial({ color: '#0000ff' }),
    };
    const lineVerticies = [
      new THREE.Vector3(-100, 0, 0),
      new THREE.Vector3(0, 50, 0),
      new THREE.Vector3(100, 0, 0),
    ];
    line.geometry.vertices.push(...lineVerticies);
    line.entity = new THREE.Line(line.geometry, line.material);

    // White directional light at half intensity shining from the top.
    var dLight = new THREE.DirectionalLight('#fafaff', 3);
    dLight.position.set(500, 500, 100);
    dLight.castShadow = true;
    dLight.shadowCameraVisible = true;
    scene.add(dLight);

    var aLight = new THREE.AmbientLight(0x404040, 1); // soft white light
    scene.add(aLight);

    camera.position.z = 4;

    const plane = {
      geometry: new THREE.PlaneGeometry(10000, 10000, 1, 1),
      material: new THREE.MeshLambertMaterial({
        color: 0xffff00,
        side: THREE.FrontSide,
      }),
    };
    plane.geometry.rotateX(-(Math.PI / 2));
    plane.entity = new THREE.Mesh(plane.geometry, plane.material);
    console.log('plane', plane.entity);
    plane.entity.receiveShadow = true;
    scene.add(plane.entity);
    scene.add(cube.entity);
    scene.add(line.entity);

    renderer.setClearColor('#000000');
    renderer.setSize(width, height);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.cube = cube.entity;

    this.loadModels()
      .then(obj => {
        console.log('model:', obj);
        obj.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
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
    const cube = this.cube;
    const cam = this.camera;
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    cam.position.set(
      Math.sin(ms / 160) * 300,
      Math.cos(ms / 220) * 500 + 500,
      Math.cos(ms / 300) * 800
    );
    var point = new THREE.Vector3(0, Math.sin(ms / 220) * 200 + 200, 0);

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
