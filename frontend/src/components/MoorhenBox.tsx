import { Provider, useDispatch, useSelector } from "react-redux";
import {
  MoorhenReduxStore,
  MoorhenContainer,
  addMap,
  hideMap,
  showMap,
  MoorhenMap,
} from "moorhen";
import { useEffect, useRef, useState } from "react";
import { moorhen } from "moorhen/types/moorhen";

interface MoorhenProps {
  fileContent: null | Uint8Array;
  predictedMapsSaved: boolean;
  phosphateMap: null | Uint8Array;
  sugarMap: null | Uint8Array;
  baseMap: null | Uint8Array;
  setMoorhenReady: (ready: boolean) => void;
}

function MapButton(props: {
  onClick: () => void;
  text: string;
  status: boolean;
}) {
  return (
    <button
      className="bg-nfAccent font-bold min-w-18 text-white align-middle justify-center items-center rounded-lg"
      onClick={props.onClick}
    >
      <p className="my-auto p-2">{props.text}</p>
    </button>
  );
}

function MoorhenStateWrapper(props: MoorhenProps) {
  const moorhenDimensionCallback = (): [number, number] => {
    return [700, 400];
  };
  const glRef = useRef(null);
  const timeCapsuleRef = useRef(null);
  const commandCentre = useRef(null);
  const moleculesRef = useRef(null);
  const mapsRef = useRef(null);
  const dispatch = useDispatch();
  const cootInitialized = useSelector(
      (state: any) => state.generalStates.cootInitialized
  );

  useEffect(() => {
    if (!cootInitialized) return;
    props.setMoorhenReady(true)
  }, [cootInitialized]);

  const collectedProps = {
    glRef: glRef,
    timeCapsuleRef: timeCapsuleRef,
    commandCentre: commandCentre,
    moleculesRef: moleculesRef,
    mapsRef: mapsRef,
    dispatch: dispatch,
  };

  useEffect(() => {
    const loadMap = async () => {
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
      dispatch(addMap(newMap));
    };
    loadMap();
  }, [dispatch, props.fileContent]);

  useEffect(() => {
    if (!props.predictedMapsSaved) return;
    const loadMap = async (map: Uint8Array, name: string) => {
      if (map === null) return;
      const newMap = new MoorhenMap(commandCentre, glRef);
      await newMap.loadToCootFromMapData(map, name, false);
      dispatch(addMap(newMap));
    };
    if (props.phosphateMap === null) return;
    if (props.sugarMap === null) return;
    if (props.baseMap === null) return;

    loadMap(props.phosphateMap, "phosphate");
    loadMap(props.sugarMap, "sugar");
    loadMap(props.baseMap, "base");
  }, [
    dispatch,
    props.baseMap,
    props.phosphateMap,
    props.predictedMapsSaved,
    props.sugarMap,
  ]);
  const maps: moorhen.Map[] = useSelector((state: moorhen.State) => state.maps);

  const [experimentalMapVisible, setExperimentalMapVisible] = useState(true);
  const [phosphateMapVisible, setPhosphateMapVisible] = useState(true);
  const [sugarMapVisible, setSugarMapVisible] = useState(true);
  const [baseMapVisible, setBaseMapVisible] = useState(true);

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
          status={baseMapVisible}
          onClick={() => setExperimentalMapVisible((visible) => !visible)}
        />
        <MapButton
          text={"Phosphate"}
          status={phosphateMapVisible}
          onClick={() => setPhosphateMapVisible((visible) => !visible)}
        />
        <MapButton
          text={"Sugar"}
          status={sugarMapVisible}
          onClick={() => setSugarMapVisible((visible) => !visible)}
        />
        <MapButton
          text={"Base"}
          status={baseMapVisible}
          onClick={() => setBaseMapVisible((visible) => !visible)}
        />
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
