export const randomPositionInCircle = radius => {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.sqrt(Math.random() * radius * radius);
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
  };
};
export const distance = ({ x: ax, y: ay }, { x: bx, y: by }) => {
  const a = ax - bx;
  const b = ay - by;
  return (a ** 2 + b ** 2) ** 0.5;
};
//get the distance between 2 angles
//alpha and beta must be normalized between 0 and Math.PI*2
export const angularDistance = (alpha, beta) => {
  const pi = Math.PI;
  const tau = pi * 2;
  // This is either the distance or 2pi - distance
  const phi = Math.abs(beta - alpha) % tau;
  const distance = phi > pi ? tau - phi : phi;
  return distance;
};
const GEOM = {
  randomPositionInCircle,
  angularDistance,
  distance,
};
export default GEOM;
