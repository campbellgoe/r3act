import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loadModels = models => {
  if (!Array.isArray(models)) throw new Error('models must be an array');
  return Promise.all(
    models.map(({ type, model }) => {
      return new Promise((resolve, reject) => {
        switch (type) {
          case 'fbx': {
            import('three/examples/js/loaders/FBXLoader').then(() => {
              // Note : window. is required here to make it works.
              const loader = new window.THREE.FBXLoader();
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

            loader.load(
              model,
              function(gltf) {
                resolve(gltf.scene.children[0]);
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
