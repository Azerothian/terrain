
import {voronoi as d3Voronoi} from "d3-voronoi";
import {defaultExtent} from "./consts";

function generatePoints(n, extent = defaultExtent) {
  var pts = [];
  for (var i = 0; i < n; i++) {
    pts.push([(Math.random() - 0.5) * extent.width, (Math.random() - 0.5) * extent.height]);
  }
  return pts;
}

function improvePoints(pts, n = 1, extent = defaultExtent) {
  for (var i = 0; i < n; i++) {
    pts = voronoi(pts, extent)
      .polygons(pts)
      .map(centroid);
  }
  return pts;
}

function centroid(pts) {
  var x = 0;
  var y = 0;
  for (var i = 0; i < pts.length; i++) {
    x += pts[i][0];
    y += pts[i][1];
  }
  return [x / pts.length, y / pts.length];
}

/// PUBLIC

export function runif(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

export function voronoi(pts, extent = defaultExtent) {
  var w = extent.width / 2;
  var h = extent.height / 2;
  return d3Voronoi().extent([[-w, -h], [w, h]])(pts);
}

export function generateGoodPoints(n, extent = defaultExtent) {
  var pts = generatePoints(n, extent);
  pts = pts.sort((a, b) => {
    return a[0] - b[0];
  });
  return improvePoints(pts, 1, extent);
}

var rnormZ2;
export function rnorm() {
  if (rnormZ2) {
    var tmp = rnormZ2;
    rnormZ2 = null;
    return tmp;
  }
  var x1 = 0;
  var x2 = 0;
  var w = 2.0;
  while (w >= 1) {
    x1 = runif(-1, 1);
    x2 = runif(-1, 1);
    w = x1 * x1 + x2 * x2;
  }
  w = Math.sqrt(-2 * Math.log(w) / w);
  rnormZ2 = x2 * w;
  return x1 * w;
}

export function randomVector(scale) {
  return [scale * rnorm(), scale * rnorm()];
}
