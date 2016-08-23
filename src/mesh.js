
import {defaultExtent} from "./consts";
import * as d3 from "d3";
import {generateGoodPoints, voronoi} from "./points";

function map(h, f) {
  let newh = h.map(f);
  newh.mesh = h.mesh;
  return newh;
}

function zero(mesh) {
  let z = [];
  for (let i = 0; i < mesh.vxs.length; i++) {
    z[i] = 0;
  }
  z.mesh = mesh;
  return z;
}
function isedge(mesh, i) {
  return (mesh.adj[i].length < 3);
}
function isnearedge(mesh, i) {
  let x = mesh.vxs[i][0];
  let y = mesh.vxs[i][1];
  let w = mesh.extent.width;
  let h = mesh.extent.height;
  return x < -0.45 * w || x > 0.45 * w || y < -0.45 * h || y > 0.45 * h;
}
// function distance(mesh, i, j) {
//   let p = mesh.vxs[i];
//   let q = mesh.vxs[j];
//   return Math.sqrt((p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]));
// }

function quantile(h, q) {
  let sortedh = [];
  for (let i = 0; i < h.length; i++) {
    sortedh[i] = h[i];
  }
  sortedh.sort(d3.ascending);
  return d3.quantile(sortedh, q);
}

function makeMesh(pts, extent = defaultExtent) {
  let vor = voronoi(pts, extent);
  let vxs = [];
  let vxids = {};
  let adj = [];
  let edges = [];
  let tris = [];
  for (let i = 0; i < vor.edges.length; i++) {
    let e = vor.edges[i];
    if (!e) {
      continue;
    }
    let e0 = vxids[e[0]];
    let e1 = vxids[e[1]];
    if (!e0) {
      e0 = vxs.length;
      vxids[e[0]] = e0;
      vxs.push(e[0]);
    }
    if (!e1) {
      e1 = vxs.length;
      vxids[e[1]] = e1;
      vxs.push(e[1]);
    }
    adj[e0] = adj[e0] || [];
    adj[e0].push(e1);
    adj[e1] = adj[e1] || [];
    adj[e1].push(e0);
    edges.push([e0, e1, e.left, e.right]);
    tris[e0] = tris[e0] || [];
    if (!tris[e0].includes(e.left)) {
      tris[e0].push(e.left);
    }
    if (e.right && !tris[e0].includes(e.right)) {
      tris[e0].push(e.right);
    }
    tris[e1] = tris[e1] || [];
    if (!tris[e1].includes(e.left)) {
      tris[e1].push(e.left);
    }
    if (e.right && !tris[e1].includes(e.right)) {
      tris[e1].push(e.right);
    }
  }

  let mesh = {pts, vor, vxs, adj, tris, edges, extent};
  mesh.map = (f) => {
    let mapped = vxs.map(f);
    mapped.mesh = mesh;
    return mapped;
  };
  return mesh;
}




function normalize(h) {
  let lo = d3.min(h);
  let hi = d3.max(h);
  return map(h, (x) => (x - lo) / (hi - lo));
}

function neighbours(mesh, i) {
  let onbs = mesh.adj[i];
  let nbs = [];
  for (let i = 0; i < onbs.length; i++) {
    nbs.push(onbs[i]);
  }
  return nbs;
}

function downfrom(h, i) {
  if (isedge(h.mesh, i)) {
    return -2;
  }
  let best = -1;
  let besth = h[i];
  let nbs = neighbours(h.mesh, i);
  for (let j = 0; j < nbs.length; j++) {
    if (h[nbs[j]] < besth) {
      besth = h[nbs[j]];
      best = nbs[j];
    }
  }
  return best;
}

function downhill(h) {
  if (h.downhill) {
    return h.downhill;
  }
  let downs = [];
  for (let i = 0; i < h.length; i++) {
    downs[i] = downfrom(h, i);
  }
  h.downhill = downs;
  return downs;
}

function getFlux(h) {
  let dh = downhill(h);
  let idxs = [];
  let flux = zero(h.mesh);
  for (let i = 0; i < h.length; i++) {
    idxs[i] = i;
    flux[i] = 1 / h.length;
  }
  idxs.sort((a, b) => h[b] - h[a]);
  for (let i = 0; i < h.length; i++) {
    let j = idxs[i];
    if (dh[j] >= 0) {
      flux[dh[j]] += flux[j];
    }
  }
  return flux;
}
function trislope(h, i) {
  let nbs = neighbours(h.mesh, i);
  if (nbs.length !== 3) {
    return [0, 0];
  }
  let p0 = h.mesh.vxs[nbs[0]];
  let p1 = h.mesh.vxs[nbs[1]];
  let p2 = h.mesh.vxs[nbs[2]];

  let x1 = p1[0] - p0[0];
  let x2 = p2[0] - p0[0];
  let y1 = p1[1] - p0[1];
  let y2 = p2[1] - p0[1];

  let det = x1 * y2 - x2 * y1;
  let h1 = h[nbs[1]] - h[nbs[0]];
  let h2 = h[nbs[2]] - h[nbs[0]];

  return [(y2 * h1 - y1 * h2) / det,
    (-x2 * h1 + x1 * h2) / det];
}

function getSlope(h) {
  // let dh = downhill(h);
  let slope = zero(h.mesh);
  for (let i = 0; i < h.length; i++) {
    let s = trislope(h, i);
    slope[i] = Math.sqrt(s[0] * s[0] + s[1] * s[1]);
    continue;
    // if (dh[i] < 0) {
    //   slope[i] = 0;
    // } else {
    //   slope[i] = (h[i] - h[dh[i]]) / distance(h.mesh, i, dh[i]);
    // }
  }
  return slope;
}
function erosionRate(h) {
  let flux = getFlux(h);
  let slope = getSlope(h);
  let newh = zero(h.mesh);
  for (let i = 0; i < h.length; i++) {
    let river = Math.sqrt(flux[i]) * slope[i];
    let creep = slope[i] * slope[i];
    let total = 1000 * river + creep;
    total = total > 200 ? 200 : total;
    newh[i] = total;
  }
  return newh;
}

function erode(h, amount) {
  let er = erosionRate(h);
  let newh = zero(h.mesh);
  let maxr = d3.max(er);
  for (let i = 0; i < h.length; i++) {
    newh[i] = h[i] - amount * (er[i] / maxr);
  }
  return newh;
}
// function findSinks(h) {
//   let dh = downhill(h);
//   let sinks = [];
//   for (let i = 0; i < dh.length; i++) {
//     let node = i;
//     while (true) {
//       if (isedge(h.mesh, node)) {
//         sinks[i] = -2;
//         break;
//       }
//       if (dh[node] == -1) {
//         sinks[i] = node;
//         break;
//       }
//       node = dh[node];
//     }
//   }
// }


/// PUBLIC

export function add() {
  let n = arguments[0].length;
  let newvals = zero(arguments[0].mesh);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < arguments.length; j++) {
      newvals[i] += arguments[j][i];
    }
  }
  return newvals;
}

export function generate(n, extent = defaultExtent) {
  let pts = generateGoodPoints(n, extent);
  return makeMesh(pts, extent);
}


export function relax(h) {
  let newh = zero(h.mesh);
  for (let i = 0; i < h.length; i++) {
    let nbs = neighbours(h.mesh, i);
    if (nbs.length < 3) {
      newh[i] = 0;
      continue;
    }
    newh[i] = d3.mean(nbs.map((j) => h[j]));
  }
  return newh;
}


export function peaky(h) {
  return map(normalize(h), Math.sqrt);
}



export function slope(mesh, direction) {
  return mesh.map((x) => {
    return x[0] * direction[0] + x[1] * direction[1];
  });
}

export function cone(mesh, slope) {
  return mesh.map((x) => {
    return Math.pow(x[0] * x[0] + x[1] * x[1], 0.5) * slope;
  });
}

export function mountains(mesh, n, r = 0.05) {
  r = r || 0.05;
  let mounts = [];
  for (let i = 0; i < n; i++) {
    mounts.push([mesh.extent.width * (Math.random() - 0.5), mesh.extent.height * (Math.random() - 0.5)]);
  }
  let newvals = zero(mesh);
  for (let i = 0; i < mesh.vxs.length; i++) {
    let p = mesh.vxs[i];
    for (let j = 0; j < n; j++) {
      let m = mounts[j];
      newvals[i] += Math.pow(Math.exp(-((p[0] - m[0]) * (p[0] - m[0]) + (p[1] - m[1]) * (p[1] - m[1])) / (2 * r * r)), 2);
    }
  }
  return newvals;
}

export function fillSinks(h, epsilon = 1e-5) {
  let infinity = 999999;
  let newh = zero(h.mesh);
  for (let i = 0; i < h.length; i++) {
    if (isnearedge(h.mesh, i)) {
      newh[i] = h[i];
    } else {
      newh[i] = infinity;
    }
  }

  let changed = false;
  do {
    for (let i = 0; i < h.length; i++) {
      if (newh[i] === h[i]) {
        continue;
      }
      let nbs = neighbours(h.mesh, i);
      for (let j = 0; j < nbs.length; j++) {
        if (h[i] >= newh[nbs[j]] + epsilon) {
          newh[i] = h[i];
          changed = true;
          break;
        }
        let oh = newh[nbs[j]] + epsilon;
        if ((newh[i] > oh) && (oh > h[i])) {
          newh[i] = oh;
          changed = true;
        }
      }
    }
  } while (!changed);
  return newh;
}

export function doErosion(h, amount, n = 1) {
  h = fillSinks(h);
  for (let i = 0; i < n; i++) {
    h = erode(h, amount);
    h = fillSinks(h);
  }
  return h;
}
export function setSeaLevel(h, q) {
  let newh = zero(h.mesh);
  let delta = quantile(h, q);
  for (let i = 0; i < h.length; i++) {
    newh[i] = h[i] - delta;
  }
  return newh;
}
export function cleanCoast(h, iters) {
  for (let iter = 0; iter < iters; iter++) {
    // let changed = 0;
    let newh = zero(h.mesh);
    for (let i = 0; i < h.length; i++) {
      newh[i] = h[i];
      let nbs = neighbours(h.mesh, i);
      if (h[i] <= 0 || nbs.length !== 3) { 
        continue;
      }
      let count = 0;
      let best = -999999;
      for (let j = 0; j < nbs.length; j++) {
        if (h[nbs[j]] > 0) {
          count++;
        } else if (h[nbs[j]] > best) {
          best = h[nbs[j]];
        }
      }
      if (count > 1) {
        continue;
      }
      newh[i] = best / 2;
      // changed++;
    }
    h = newh;
    newh = zero(h.mesh);
    for (let i = 0; i < h.length; i++) {
      newh[i] = h[i];
      let nbs = neighbours(h.mesh, i);
      if (h[i] > 0 || nbs.length !== 3) {
        continue;
      }
      let count = 0;
      let best = 999999;
      for (let j = 0; j < nbs.length; j++) {
        if (h[nbs[j]] <= 0) {
          count++;
        } else if (h[nbs[j]] < best) {
          best = h[nbs[j]];
        }
      }
      if (count > 1) {
        continue;
      }
      newh[i] = best / 2;
      // changed++;
    }
    h = newh;
  }
  return h;
}
