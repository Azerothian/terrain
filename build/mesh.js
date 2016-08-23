"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.add = add;
exports.generate = generate;
exports.relax = relax;
exports.peaky = peaky;
exports.slope = slope;
exports.cone = cone;
exports.mountains = mountains;
exports.fillSinks = fillSinks;
exports.doErosion = doErosion;
exports.setSeaLevel = setSeaLevel;
exports.cleanCoast = cleanCoast;

var _consts = require("./consts");

var _d = require("d3");

var d3 = _interopRequireWildcard(_d);

var _points = require("./points");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function map(h, f) {
  var newh = h.map(f);
  newh.mesh = h.mesh;
  return newh;
}

function zero(mesh) {
  var z = [];
  for (var i = 0; i < mesh.vxs.length; i++) {
    z[i] = 0;
  }
  z.mesh = mesh;
  return z;
}
function isedge(mesh, i) {
  return mesh.adj[i].length < 3;
}
function isnearedge(mesh, i) {
  var x = mesh.vxs[i][0];
  var y = mesh.vxs[i][1];
  var w = mesh.extent.width;
  var h = mesh.extent.height;
  return x < -0.45 * w || x > 0.45 * w || y < -0.45 * h || y > 0.45 * h;
}
// function distance(mesh, i, j) {
//   let p = mesh.vxs[i];
//   let q = mesh.vxs[j];
//   return Math.sqrt((p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]));
// }

function quantile(h, q) {
  var sortedh = [];
  for (var i = 0; i < h.length; i++) {
    sortedh[i] = h[i];
  }
  sortedh.sort(d3.ascending);
  return d3.quantile(sortedh, q);
}

function makeMesh(pts) {
  var extent = arguments.length <= 1 || arguments[1] === undefined ? _consts.defaultExtent : arguments[1];

  var vor = (0, _points.voronoi)(pts, extent);
  var vxs = [];
  var vxids = {};
  var adj = [];
  var edges = [];
  var tris = [];
  for (var i = 0; i < vor.edges.length; i++) {
    var e = vor.edges[i];
    if (!e) {
      continue;
    }
    var e0 = vxids[e[0]];
    var e1 = vxids[e[1]];
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

  var mesh = { pts: pts, vor: vor, vxs: vxs, adj: adj, tris: tris, edges: edges, extent: extent };
  mesh.map = function (f) {
    var mapped = vxs.map(f);
    mapped.mesh = mesh;
    return mapped;
  };
  return mesh;
}

function normalize(h) {
  var lo = d3.min(h);
  var hi = d3.max(h);
  return map(h, function (x) {
    return (x - lo) / (hi - lo);
  });
}

function neighbours(mesh, i) {
  var onbs = mesh.adj[i];
  var nbs = [];
  for (var _i = 0; _i < onbs.length; _i++) {
    nbs.push(onbs[_i]);
  }
  return nbs;
}

function downfrom(h, i) {
  if (isedge(h.mesh, i)) {
    return -2;
  }
  var best = -1;
  var besth = h[i];
  var nbs = neighbours(h.mesh, i);
  for (var j = 0; j < nbs.length; j++) {
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
  var downs = [];
  for (var i = 0; i < h.length; i++) {
    downs[i] = downfrom(h, i);
  }
  h.downhill = downs;
  return downs;
}

function getFlux(h) {
  var dh = downhill(h);
  var idxs = [];
  var flux = zero(h.mesh);
  for (var i = 0; i < h.length; i++) {
    idxs[i] = i;
    flux[i] = 1 / h.length;
  }
  idxs.sort(function (a, b) {
    return h[b] - h[a];
  });
  for (var _i2 = 0; _i2 < h.length; _i2++) {
    var j = idxs[_i2];
    if (dh[j] >= 0) {
      flux[dh[j]] += flux[j];
    }
  }
  return flux;
}
function trislope(h, i) {
  var nbs = neighbours(h.mesh, i);
  if (nbs.length !== 3) {
    return [0, 0];
  }
  var p0 = h.mesh.vxs[nbs[0]];
  var p1 = h.mesh.vxs[nbs[1]];
  var p2 = h.mesh.vxs[nbs[2]];

  var x1 = p1[0] - p0[0];
  var x2 = p2[0] - p0[0];
  var y1 = p1[1] - p0[1];
  var y2 = p2[1] - p0[1];

  var det = x1 * y2 - x2 * y1;
  var h1 = h[nbs[1]] - h[nbs[0]];
  var h2 = h[nbs[2]] - h[nbs[0]];

  return [(y2 * h1 - y1 * h2) / det, (-x2 * h1 + x1 * h2) / det];
}

function getSlope(h) {
  // let dh = downhill(h);
  var slope = zero(h.mesh);
  for (var i = 0; i < h.length; i++) {
    var s = trislope(h, i);
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
  var flux = getFlux(h);
  var slope = getSlope(h);
  var newh = zero(h.mesh);
  for (var i = 0; i < h.length; i++) {
    var river = Math.sqrt(flux[i]) * slope[i];
    var creep = slope[i] * slope[i];
    var total = 1000 * river + creep;
    total = total > 200 ? 200 : total;
    newh[i] = total;
  }
  return newh;
}

function erode(h, amount) {
  var er = erosionRate(h);
  var newh = zero(h.mesh);
  var maxr = d3.max(er);
  for (var i = 0; i < h.length; i++) {
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

function add() {
  var n = arguments[0].length;
  var newvals = zero(arguments[0].mesh);
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < arguments.length; j++) {
      newvals[i] += arguments[j][i];
    }
  }
  return newvals;
}

function generate(n) {
  var extent = arguments.length <= 1 || arguments[1] === undefined ? _consts.defaultExtent : arguments[1];

  var pts = (0, _points.generateGoodPoints)(n, extent);
  return makeMesh(pts, extent);
}

function relax(h) {
  var newh = zero(h.mesh);
  for (var i = 0; i < h.length; i++) {
    var nbs = neighbours(h.mesh, i);
    if (nbs.length < 3) {
      newh[i] = 0;
      continue;
    }
    newh[i] = d3.mean(nbs.map(function (j) {
      return h[j];
    }));
  }
  return newh;
}

function peaky(h) {
  return map(normalize(h), Math.sqrt);
}

function slope(mesh, direction) {
  return mesh.map(function (x) {
    return x[0] * direction[0] + x[1] * direction[1];
  });
}

function cone(mesh, slope) {
  return mesh.map(function (x) {
    return Math.pow(x[0] * x[0] + x[1] * x[1], 0.5) * slope;
  });
}

function mountains(mesh, n) {
  var r = arguments.length <= 2 || arguments[2] === undefined ? 0.05 : arguments[2];

  r = r || 0.05;
  var mounts = [];
  for (var i = 0; i < n; i++) {
    mounts.push([mesh.extent.width * (Math.random() - 0.5), mesh.extent.height * (Math.random() - 0.5)]);
  }
  var newvals = zero(mesh);
  for (var _i3 = 0; _i3 < mesh.vxs.length; _i3++) {
    var p = mesh.vxs[_i3];
    for (var j = 0; j < n; j++) {
      var m = mounts[j];
      newvals[_i3] += Math.pow(Math.exp(-((p[0] - m[0]) * (p[0] - m[0]) + (p[1] - m[1]) * (p[1] - m[1])) / (2 * r * r)), 2);
    }
  }
  return newvals;
}

function fillSinks(h) {
  var epsilon = arguments.length <= 1 || arguments[1] === undefined ? 1e-5 : arguments[1];

  var infinity = 999999;
  var newh = zero(h.mesh);
  for (var i = 0; i < h.length; i++) {
    if (isnearedge(h.mesh, i)) {
      newh[i] = h[i];
    } else {
      newh[i] = infinity;
    }
  }

  var changed = false;
  do {
    for (var _i4 = 0; _i4 < h.length; _i4++) {
      if (newh[_i4] === h[_i4]) {
        continue;
      }
      var nbs = neighbours(h.mesh, _i4);
      for (var j = 0; j < nbs.length; j++) {
        if (h[_i4] >= newh[nbs[j]] + epsilon) {
          newh[_i4] = h[_i4];
          changed = true;
          break;
        }
        var oh = newh[nbs[j]] + epsilon;
        if (newh[_i4] > oh && oh > h[_i4]) {
          newh[_i4] = oh;
          changed = true;
        }
      }
    }
  } while (!changed);
  return newh;
}

function doErosion(h, amount) {
  var n = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];

  h = fillSinks(h);
  for (var i = 0; i < n; i++) {
    h = erode(h, amount);
    h = fillSinks(h);
  }
  return h;
}
function setSeaLevel(h, q) {
  var newh = zero(h.mesh);
  var delta = quantile(h, q);
  for (var i = 0; i < h.length; i++) {
    newh[i] = h[i] - delta;
  }
  return newh;
}
function cleanCoast(h, iters) {
  for (var iter = 0; iter < iters; iter++) {
    // let changed = 0;
    var newh = zero(h.mesh);
    for (var i = 0; i < h.length; i++) {
      newh[i] = h[i];
      var nbs = neighbours(h.mesh, i);
      if (h[i] <= 0 || nbs.length !== 3) {
        continue;
      }
      var count = 0;
      var best = -999999;
      for (var j = 0; j < nbs.length; j++) {
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
    for (var _i5 = 0; _i5 < h.length; _i5++) {
      newh[_i5] = h[_i5];
      var _nbs = neighbours(h.mesh, _i5);
      if (h[_i5] > 0 || _nbs.length !== 3) {
        continue;
      }
      var _count = 0;
      var _best = 999999;
      for (var _j = 0; _j < _nbs.length; _j++) {
        if (h[_nbs[_j]] <= 0) {
          _count++;
        } else if (h[_nbs[_j]] < _best) {
          _best = h[_nbs[_j]];
        }
      }
      if (_count > 1) {
        continue;
      }
      newh[_i5] = _best / 2;
      // changed++;
    }
    h = newh;
  }
  return h;
}