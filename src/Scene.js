import React, { Component } from 'react';
import * as THREE from 'three';
import Resize from './Resize';

class Scene extends Component {
  componentDidMount() {
    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
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
    line.mesh = new THREE.Mesh(line.geometry, line.material);
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

  animate = () => {
    const cube = this.cube;
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

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
