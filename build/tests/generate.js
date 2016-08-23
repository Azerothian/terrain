"use strict";

var _ = require("../");

var _consts = require("../consts");

describe("generate", function () {
  it("coast", function () {
    var mesh = (0, _.generateCoast)({
      extent: _consts.defaultExtent,
      npts: 16384
    });
  });
});