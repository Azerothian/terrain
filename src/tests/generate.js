import {generateCoast} from "../";
import {defaultExtent} from "../consts";


describe("generate", () => {
  it("coast", () => {
    let mesh = generateCoast({
      extent: defaultExtent,
      npts: 16384,
    });
  });
});
