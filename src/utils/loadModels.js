import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
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
const getTypeFromPath = path => {
  if (path.endsWith('.gltf') || path.endsWith('.glb')) {
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
    objs.map(({ path, ...rest }) => {
      return new Promise((resolve, reject) => {
        const type = getTypeFromPath(path);
        const doResolve = model => {
          resolve({
            model,
            type,
            ...rest,
          });
        };
        switch (type) {
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
            console.log('loading', path);
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
