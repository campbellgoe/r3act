import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
//import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';

const loadModels = models => {
  if (!Array.isArray(models)) throw new Error('models must be an array');
  return Promise.all(
    models.map(({ type, model }) => {
      return new Promise((resolve, reject) => {
        switch (type) {
          //TODO: remove import('...') from within this loop, only import loaders once
          case 'fbx': {
            import('three/examples/js/loaders/FBXLoader').then(() => {
              // Note : window. is required here to make it works.
              const loader = new window.THREE.FBXLoader();
              console.log('loader fbx loaded');
              // Have fun here
              //console.log('loader:', loader);
              loader.load(
                model,
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
            const loader = new GLTFLoader();
            console.log('loading', model);
            loader.load(
              model,
              function(gltf) {
                console.log('loaded gltf model...', gltf);
                resolve(gltf.scene);
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
              model,
              function(obj) {
                console.log('Loaded .obj from', model, ';', obj);
                resolve(obj);
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
