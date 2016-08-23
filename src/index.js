import {
  generate,
  add,
  slope,
  cone,
  mountains,
  relax,
  peaky,
  doErosion,
  setSeaLevel,
  fillSinks,
  cleanCoast,
} from "./mesh";
import {runif, randomVector} from "./points";

export function generateCoast({npts, extent}) {
  let mesh = generate(npts, extent);
  var h = add(
    slope(mesh, randomVector(4)),
    cone(mesh, runif(-1, -1)),
    mountains(mesh, 50)
  );
  for (var i = 0; i < 10; i++) {
    h = relax(h);
  }
  h = peaky(h);
  h = doErosion(h, runif(0, 0.1), 5);
  h = setSeaLevel(h, runif(0.2, 0.6));
  h = fillSinks(h);
  h = cleanCoast(h, 3);
  return h;
}

