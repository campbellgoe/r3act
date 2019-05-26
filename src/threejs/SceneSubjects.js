import * as THREE from 'three';

export default scene => {
  var geometry = new THREE.BoxGeometry(1, 1, 1);
  var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  var cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
  function update() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
  }

  return {
    update,
  };
};
