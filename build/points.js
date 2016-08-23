"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runif = runif;
exports.voronoi = voronoi;
exports.generateGoodPoints = generateGoodPoints;
exports.rnorm = rnorm;
exports.randomVector = randomVector;

var _d3Voronoi = require("d3-voronoi");

var _consts = require("./consts");

function generatePoints(n) {
  var extent = arguments.length <= 1 || arguments[1] === undefined ? _consts.defaultExtent : arguments[1];

  var pts = [];
  for (var i = 0; i < n; i++) {
    pts.push([(Math.random() - 0.5) * extent.width, (Math.random() - 0.5) * extent.height]);
  }
  return pts;
}

function improvePoints(pts) {
  var n = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
  var extent = arguments.length <= 2 || arguments[2] === undefined ? _consts.defaultExtent : arguments[2];

  for (var i = 0; i < n; i++) {
    pts = voronoi(pts, extent).polygons(pts).map(centroid);
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

function runif(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

function voronoi(pts) {
  var extent = arguments.length <= 1 || arguments[1] === undefined ? _consts.defaultExtent : arguments[1];

  var w = extent.width / 2;
  var h = extent.height / 2;
  return (0, _d3Voronoi.voronoi)().extent([[-w, -h], [w, h]])(pts);
}

function generateGoodPoints(n) {
  var extent = arguments.length <= 1 || arguments[1] === undefined ? _consts.defaultExtent : arguments[1];

  var pts = generatePoints(n, extent);
  pts = pts.sort(function (a, b) {
    return a[0] - b[0];
  });
  return improvePoints(pts, 1, extent);
}

var rnormZ2;
function rnorm() {
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

function randomVector(scale) {
  return [scale * rnorm(), scale * rnorm()];
}