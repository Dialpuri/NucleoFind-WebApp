import {Provider, useDispatch} from "react-redux";
import {MoorhenReduxStore, MoorhenContainer, addMap, MoorhenMap} from "moorhen"
import {useEffect, useRef} from "react";
import {Simulate} from "react-dom/test-utils";
import load = Simulate.load;

interface MoorhenProps {
    fileContent: null | Uint8Array,
    predictedMapsSaved: boolean,
    phosphateMap: null | Uint8Array,

}

function MoorhenStateWrapper(props: MoorhenProps) {

    const moorhenDimensionCallback = (): [number, number] => {
        return [800, 600];
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
        const loadMap = async () => {
            if (props.phosphateMap === null) return;
            const newMap = new MoorhenMap(commandCentre, glRef);
            await newMap.loadToCootFromMapData(
                props.phosphateMap,
                'map-1',
                false
            );
            dispatch(addMap(newMap));


        }
        loadMap()
    }, [props.predictedMapsSaved]);

    return <MoorhenContainer {...collectedProps} moorhenDimensionCallback={moorhenDimensionCallback} viewOnly={false}/>
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