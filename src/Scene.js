import React, { Component } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import Resize from './Resize';
import tree1 from './models/tree-1/scene.gltf';

class Scene extends Component {
  loadModels = () => {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();

      loader.load(
        tree1,
        function(gltf) {
          resolve(gltf);
          //scene.add( gltf.scene );
        },
        undefined,
        function(error) {
          reject(error);
        }
      );
    });
  };
  componentDidMount() {
    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    //cube
    const cube = {
      geometry: new THREE.BoxGeometry(5, 100, 100),
      material: new THREE.MeshBasicMaterial({ color: '#433F81' }),
    };
    cube.entity = new THREE.Mesh(cube.geometry, cube.material);

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
    var dLight = new THREE.DirectionalLight('#fafaff', 10);
    dLight.position.set(0.3, 1, 0.3);
    dLight.castShadow = true;

    scene.add(dLight);

    var aLight = new THREE.AmbientLight(0x404040, 7); // soft white light
    scene.add(aLight);

    camera.position.z = 4;

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
      .then(gltf => {
        this.scene.add(gltf.scene);
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
    console.log('ms', ms);
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
