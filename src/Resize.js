import { useState, useEffect } from 'react';

//example breakpoints:
/*
[
  {
    //applies >= 768 w
    minWidth: 768
  },
  {
    //applies <= 512 w
    maxWidth: 512
  },
  {
    //applies >= 320 w && <= 512 w
    minWidth: 320,
    maxWidth: 512
  },
  {
    //applies >= 320 w && >= 512 h
    minWidth: 320,
    minHeight: 512
  },
  {
    //applies <= 450 h
    maxHeight: 450,
    name: "top-header"
  }
]
*/
/*
onPassedBreakpoint is a callback function, which is called whenever
a breakpoint is passed, using the window innerWidth, innerHeight.
it passes the breakpoint or breakpoints that were passed
including any other data in the breakpoint such as name
so you can determine what to do with the breakpoint pass
such as update certain styles
*/
export const useResize = (listen = true) => {
  let [dims, setDims] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (listen) {
      let resize = () => {
        setDims({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };
      window.addEventListener('resize', resize);
      return () => {
        window.removeEventListener('resize', resize);
      };
    }
  }, [listen]);
  return dims;
};
// const useBreakpoints = (breakpoints, {onChanged, onResized}) => {
//   const [changed, setChanged] = useState(false);
//   const [appliedBreakpoints, applyBreakpoint] = useState([]);
//   const resize = () => {
//     let prevBreakpoints = appliedBreakpoints.length;
//     const w = window.innerWidth;
//     const h = window.innerHeight;
//     applyBreakpoint(breakpoints.filter(({minWidth = 0, minHeight = 0, maxWidth = Infinity, maxHeight = Infinity})=>{
//       return (w >= minWidth && h >= minHeight && w <= maxWidth && h <= maxHeight);
//     }))
//     let nextBreakpoints = appliedBreakpoints.length;
//     if(!changed && prevBreakpoints.length - nextBreakpoints !== 0){
//       setChanged(true);
//       onChanged(appliedBreakpoints);
//     } else if(changed){
//       setChanged(false);
//     }
//     onResized(w, h);
//   }
//   useEffect(()=>{
//     //call resize to check if any breakpoints apply initially
//     resize();
//     window.addEventListener('resize', ()=>resize);
//     return ()=>{
//       window.removeEventListener('resize', ()=>resize);
//     }
//   }, []);
//   return {
//     changed,
//     appliedBreakpoints
//   }
// }
function Resize({ listen, children }) {
  let resize = useResize(listen);
  return children(resize);
}
export default Resize;
