import { Provider, useDispatch, useSelector } from "react-redux";
import {
  addMap,
  hideMap,
  MoorhenContainer,
  MoorhenMap,
  MoorhenReduxStore,
  setMapColours,
  setMapRadius,
  showMap,
} from "moorhen";
import { useEffect, useRef, useState } from "react";
import { moorhen } from "moorhen/types/moorhen";
import { MapButton } from "./MapButton.tsx";
import { MoorhenProps } from "../interface/types.ts";

function MoorhenStateWrapper(props: MoorhenProps) {
  const [dimensions, setDimensions] = useState<Record<string, number>>({
    width: 700,
    height: 400,
  });

  const dimensionRef = useRef();

  // @ts-expect-error
  dimensionRef.current = dimensions;
  useEffect(() => {
    function handleResize() {
      const size = window.innerHeight;
      if (size <= 880) {
        setDimensions({ width: 500, height: 300 });
      } else {
        setDimensions({ width: 700, height: 400 });
      }
    }
    handleResize();

    window.addEventListener("resize", handleResize);
  }, []);

  const moorhenDimensionCallback = (): [number, number] => {
    // @ts-expect-error
    return [dimensionRef.current.width, dimensionRef.current.height];
  };
  // const moorhenDimensionCallback = (): [number, number] => {
  //   return [700, 400];
  // };
  const glRef = useRef(null);
  const timeCapsuleRef = useRef(null);
  const commandCentre = useRef(null);
  const moleculesRef = useRef(null);
  const mapsRef = useRef(null);
  const dispatch = useDispatch();
  const cootInitialized = useSelector(
    (state: moorhen.State) => state.generalStates.cootInitialized,
  );
  const maps: moorhen.Map[] = useSelector((state: moorhen.State) => state.maps);
  const phosphateColor = { r: 255, g: 76, b: 48 };
  const sugarColor = { r: 241, g: 178, b: 86 };
  const baseColor = { r: 34, g: 147, b: 101 };
  const experimentalColor = { r: 76, g: 76, b: 179 };

  const [experimentalMolNo, setExperimentalMolNo] = useState<number | null>(
    null,
  );
  const [phosphateMolNo, setPhosphateMolNo] = useState<number | null>(null);
  const [sugarMolNo, setSugarMolNo] = useState<number | null>(null);
  const [baseMolNo, setBaseMolNo] = useState<number | null>(null);
  const [radius, setRadius] = useState<number>(50);
  const maxRadius = 60;

  const [experimentalMapVisible, setExperimentalMapVisible] = useState(true);
  const [phosphateMapVisible, setPhosphateMapVisible] = useState(true);
  const [sugarMapVisible, setSugarMapVisible] = useState(true);
  const [baseMapVisible, setBaseMapVisible] = useState(true);

  useEffect(() => {
    if (!cootInitialized) return;
    props.setMoorhenReady(true);
  }, [cootInitialized, props]);

  const collectedProps = {
    glRef: glRef,
    timeCapsuleRef: timeCapsuleRef,
    commandCentre: commandCentre,
    moleculesRef: moleculesRef,
    mapsRef: mapsRef,
    dispatch: dispatch,
  };

  const changeMapColour = async (
    molNo: number,
    color: { r: number; g: number; b: number },
  ) => {
    try {
      dispatch(setMapColours({ molNo: molNo, rgb: color }));
      const map = maps.find((map) => map.molNo === molNo);
      if (map === undefined) return;
      await map.fetchColourAndRedraw();
    } catch (err) {
      console.log("err", err);
    }
  };

  // Control loading MTZ and maps
  const loadMtz = async () => {
    const newMap = new MoorhenMap(commandCentre, glRef);
    const mapMetadata = {
      F: "FWT",
      PHI: "PHWT",
      Fobs: "FP",
      SigFobs: "SIGFP",
      FreeR: "FREE",
      isDifference: false,
      useWeight: false,
      calcStructFact: true,
    };
    if (props.fileContent === null) return;
    await newMap.loadToCootFromMtzData(
      props.fileContent,
      "experimental",
      mapMetadata,
    );
    setExperimentalMolNo(newMap.molNo);
    dispatch(addMap(newMap));
  };

  const loadMap = async (map: Uint8Array, name: string) => {
    if (map === null) return;
    const newMap = new MoorhenMap(commandCentre, glRef);
    await newMap.loadToCootFromMapData(map, name, false);
    return newMap;
  };

  const loadMapAndColor = async () => {
    if (props.phosphateMap === null) return;
    if (props.sugarMap === null) return;
    if (props.baseMap === null) return;

    const phosphateMap = await loadMap(props.phosphateMap, "phosphate");
    const sugarMap = await loadMap(props.sugarMap, "sugar");
    const baseMap = await loadMap(props.baseMap, "base");

    if (
      phosphateMap === undefined ||
      sugarMap === undefined ||
      baseMap === undefined
    )
      return;

    setPhosphateMolNo(phosphateMap.molNo);
    setSugarMolNo(sugarMap.molNo);
    setBaseMolNo(baseMap.molNo);

    await dispatch(addMap(phosphateMap));
    await dispatch(addMap(sugarMap));
    await dispatch(addMap(baseMap));

    await changeMapColour(phosphateMap.molNo, phosphateColor);
    await changeMapColour(sugarMap.molNo, sugarColor);
    await changeMapColour(baseMap.molNo, baseColor);
  };

  useEffect(() => {
    loadMtz();
  }, [dispatch, props.fileContent]);

  useEffect(() => {
    if (!props.predictedMapsSaved) return;
    loadMapAndColor();
  }, [
    dispatch,
    props.baseMap,
    props.phosphateMap,
    props.predictedMapsSaved,
    props.sugarMap,
  ]);

  // Control visible maps
  useEffect(() => {
    const map = maps.find((map) => map.name === "experimental");
    if (map === undefined) return;
    dispatch(
      !experimentalMapVisible
        ? hideMap({ molNo: map.molNo })
        : showMap({ molNo: map.molNo, show: true }),
    );
  }, [dispatch, experimentalMapVisible, maps]);

  useEffect(() => {
    const map = maps.find((map) => map.name === "phosphate");
    if (map === undefined) return;
    dispatch(
      !phosphateMapVisible
        ? hideMap({ molNo: map.molNo })
        : showMap({ molNo: map.molNo, show: true }),
    );
  }, [dispatch, maps, phosphateMapVisible]);

  useEffect(() => {
    const map = maps.find((map) => map.name === "sugar");
    if (map === undefined) return;
    dispatch(
      !sugarMapVisible
        ? hideMap({ molNo: map.molNo })
        : showMap({ molNo: map.molNo, show: true }),
    );
  }, [dispatch, maps, sugarMapVisible]);

  useEffect(() => {
    const map = maps.find((map) => map.name === "base");
    if (map === undefined) return;
    dispatch(
      !baseMapVisible
        ? hideMap({ molNo: map.molNo })
        : showMap({ molNo: map.molNo, show: true }),
    );
  }, [dispatch, baseMapVisible, maps]);

  // Control radius slider
  const changeMapRadius = async () => {
    if (
      experimentalMolNo == null ||
      phosphateMolNo === null ||
      sugarMolNo === null ||
      baseMolNo === null
    )
      return;
    await dispatch(setMapRadius({ molNo: experimentalMolNo, radius: radius }));
    await dispatch(setMapRadius({ molNo: phosphateMolNo, radius: radius }));
    await dispatch(setMapRadius({ molNo: sugarMolNo, radius: radius }));
    await dispatch(setMapRadius({ molNo: baseMolNo, radius: radius }));
  };

  const handleRadiusChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    setRadius(value);
  };

  useEffect(() => {
    changeMapRadius();
  }, [radius]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col mx-auto mt-10 shadow-lg rounded-lg">
        <MoorhenContainer
          {...collectedProps}
          setMoorhenDimensions={moorhenDimensionCallback}
          viewOnly={true}
        />
      </div>

      <div className="flex flex-row space-x-4 items-center justify-center">
        <span className="my-auto font-bold">Toggle Maps: </span>
        <MapButton
          text={"2mFo-DFc"}
          colour={experimentalColor}
          status={experimentalMapVisible}
          onClick={() => setExperimentalMapVisible((visible) => !visible)}
        />
        <MapButton
          text={"Phosphate"}
          colour={phosphateColor}
          status={phosphateMapVisible}
          onClick={() => setPhosphateMapVisible((visible) => !visible)}
        />
        <MapButton
          text={"Sugar"}
          colour={sugarColor}
          status={sugarMapVisible}
          onClick={() => setSugarMapVisible((visible) => !visible)}
        />
        <MapButton
          text={"Base"}
          colour={baseColor}
          status={baseMapVisible}
          onClick={() => setBaseMapVisible((visible) => !visible)}
        />

        <div className="flex flex-col items-center pl-6 2 mb-2">
          <label
            htmlFor="default-range"
            className="block mb-2 text-sm font-semibold "
          >
            Map Radius
          </label>
          <input
            id="default-range"
            type="range"
            min={0}
            max={maxRadius}
            defaultValue={13}
            onChange={handleRadiusChange}
            className="w-32 h-2 bg-white rounded-lg appearance-none accent-nfAccent cursor-pointer "
          />
          <div className="flex flex-row justify-between items-center w-full mt-2 text-xs text-center">
            <span className="text-sm">0</span>
            <span className="text-sm">{maxRadius}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MoorhenBox(props: MoorhenProps) {
  return (
    <div className="">
      <Provider store={MoorhenReduxStore}>
        <MoorhenStateWrapper {...props} />
      </Provider>
    </div>
  );
}

export default MoorhenBox;
