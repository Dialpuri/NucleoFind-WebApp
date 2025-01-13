import {Provider, useDispatch} from "react-redux";
import {MoorhenReduxStore, MoorhenContainer, addMap, MoorhenMap} from "moorhen"
import {useEffect, useRef} from "react";

interface MoorhenProps {
    fileContent: null | Uint8Array,
    predictedMapsSaved: boolean,
    phosphateMap: null | Uint8Array,
    sugarMap: null | Uint8Array,
    baseMap: null | Uint8Array,

}

function MoorhenStateWrapper(props: MoorhenProps) {

    const moorhenDimensionCallback = (): [number, number] => {
        return [800, 500];
    };
    const glRef = useRef(null);
    const timeCapsuleRef = useRef(null);
    const commandCentre = useRef(null);
    const moleculesRef = useRef(null);
    const mapsRef = useRef(null);
    const dispatch = useDispatch();

    const collectedProps = {
        glRef: glRef,
        timeCapsuleRef: timeCapsuleRef,
        commandCentre: commandCentre,
        moleculesRef: moleculesRef,
        mapsRef: mapsRef,
        dispatch: dispatch
    }

    useEffect(() => {
        const loadMap = async () => {
            const newMap = new MoorhenMap(commandCentre, glRef);
            const mapMetadata = {
                F: 'FWT',
                PHI: 'PHWT',
                Fobs: 'FP',
                SigFobs: 'SIGFP',
                FreeR: 'FREE',
                isDifference: false,
                useWeight: false,
                calcStructFact: true,
            };
            if (props.fileContent === null) return;
            await newMap.loadToCootFromMtzData(
                props.fileContent,
                'map-1',
                mapMetadata
            );
            dispatch(addMap(newMap));

        }
        loadMap()

    }, [props.fileContent]);

    useEffect(() => {
        if (!props.predictedMapsSaved) return;
        const loadMap = async (map: Uint8Array, name: string) => {
            if (map === null) return;
            const newMap = new MoorhenMap(commandCentre, glRef);
            await newMap.loadToCootFromMapData(
                map,
                name,
                false
            );
            // newMap.setDefaultColour('red');
            dispatch(addMap(newMap));


        }
        if (props.phosphateMap === null) return;
        if (props.sugarMap === null) return;
        if (props.baseMap === null) return;

        loadMap(props.phosphateMap, "phosphate")
        loadMap(props.sugarMap, "sugar")
        loadMap(props.baseMap, "base")
    }, [props.predictedMapsSaved]);

    return <MoorhenContainer {...collectedProps} setMoorhenDimensions={moorhenDimensionCallback} viewOnly={false}/>
}

function MoorhenBox(props: MoorhenProps) {

    return (
        <>
            <Provider store={MoorhenReduxStore}>
                <MoorhenStateWrapper {...props}/>
            </Provider>
        </>
    )

}

export default MoorhenBox;