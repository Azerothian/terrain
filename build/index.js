"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateCoast = generateCoast;

var _mesh = require("./mesh");

var _points = require("./points");

function generateCoast(_ref) {
  var npts = _ref.npts;
  var extent = _ref.extent;

  var mesh = (0, _mesh.generate)(npts, extent);
  var h = (0, _mesh.add)((0, _mesh.slope)(mesh, (0, _points.randomVector)(4)), (0, _mesh.cone)(mesh, (0, _points.runif)(-1, -1)), (0, _mesh.mountains)(mesh, 50));
  for (var i = 0; i < 10; i++) {
    h = (0, _mesh.relax)(h);
  }
  h = (0, _mesh.peaky)(h);
  h = (0, _mesh.doErosion)(h, (0, _points.runif)(0, 0.1), 5);
  h = (0, _mesh.setSeaLevel)(h, (0, _points.runif)(0.2, 0.6));
  h = (0, _mesh.fillSinks)(h);
  h = (0, _mesh.cleanCoast)(h, 3);
  return h;
}