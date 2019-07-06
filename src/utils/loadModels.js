import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
//import { TextureLoader } from 'three/src/loaders/TextureLoader';
import * as THREE from 'three';
//import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

const loadFBX = (path, resolve, reject) => {
  // Note : window. is required here to make it works.
  const loader = new window.THREE.FBXLoader();

  // Have fun here
  //console.log('loader:', loader);
  loader.load(
    path,
    function(obj) {
      resolve(obj);
      //scene.add( gltf.scene );
    },
    undefined,
    function(error) {
      reject(error);
    }
  );
};
const loadSprite = (path, resolve, reject) => {
  try {
    const loader = new THREE.TextureLoader();
    loader.load(
      path,
      function(map) {
        console.log('loaded sprite png...', map);
        const spriteMaterial = new THREE.SpriteMaterial({
          map,
          color: 0x447744,
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        resolve(sprite);
      },
      undefined,
      function(err) {
        reject(err);
      }
    );
  } catch (err) {
    reject(err);
  }
};
//loadSprite
const getTypeFromPath = path => {
  if (path.endsWith('.png')) {
    return 'sprite';
  } else if (path.endsWith('.gltf') || path.endsWith('.glb')) {
    return 'gltf';
  } else if (path.endsWith('.fbx')) {
    return 'fbx';
  } else if (path.endsWith('.obj')) {
    return 'obj';
  } else {
    throw new Error('Unrecognized model format from path: ' + path);
  }
};
const loadModels = objs => {
  console.log('models to load', objs);
  if (!Array.isArray(objs)) throw new Error('objs must be an array');
  return Promise.all(
    objs.map(({ path = '', modelReference, ...rest }, index) => {
      const isReference = typeof modelReference == 'number';
      return new Promise((resolve, reject) => {
        const type = isReference ? 'reference' : getTypeFromPath(path);
        const doResolve = model => {
          resolve({
            model,
            modelReference,
            type,
            ...rest,
          });
        };
        if (isReference) {
          return doResolve(modelReference);
        }
        switch (type) {
          case 'sprite': {
            console.log('loading sprite', path);
            loadSprite(path, doResolve, reject);
            break;
          }
          //TODO: remove import('...') from within this loop, only import loaders once
          case 'fbx': {
            if (!window.THREE.FBXLoader) {
              import('three/examples/js/loaders/FBXLoader').then(() => {
                console.log('loader fbx loaded');
                loadFBX(path, doResolve, reject);
              });
            } else {
              loadFBX(path, doResolve, reject);
            }
            break;
          }
          case 'gltf': {
            const loader = new GLTFLoader();
            console.log('loading model', path);
            loader.load(
              path,
              function(gltf) {
                console.log('loaded gltf model...', gltf);
                doResolve(gltf.scene);
              },
              undefined,
              function(error) {
                reject(error);
              }
            );
            break;
          }
          case 'obj': {
            const loader = new OBJLoader();
            loader.load(
              path,
              function(obj) {
                console.log('Loaded .obj from', path, ';', obj);
                doResolve(obj);
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
export default loadModels;
