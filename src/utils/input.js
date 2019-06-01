export const getTouchesXY = ts => {
  const pos = {
    x: 0,
    y: 0,
  };
  if (ts.length === 1) {
    pos.x = ts[0].pageX;
    pos.y = ts[0].pageY;
  } else if (ts.length >= 2) {
    pos.x = (ts[0].pageX + ts[1].pageX) / 2;
    pos.y = (ts[0].pageY + ts[1].pageY) / 2;
  }
  return pos;
};
export const mouseDownTypes = {
  none: -1,
  left: 0,
  middle: 1,
  right: 2,
};
const MOUSE = {
  getTouchesXY,
  mouseDownTypes,
};
export default MOUSE;
