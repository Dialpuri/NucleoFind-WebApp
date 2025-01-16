export function MapButton(props: {
    onClick: () => void;
    text: string;
    colour?: { r: number; g: number; b: number };
    status: boolean;
}) {
    return (
        <button
            className={`font-bold min-w-18 hover:scale-105 text-white align-middle justify-center items-center rounded-lg`}
            onClick={props.onClick}
            style={{
                backgroundColor:
                    props.colour !== undefined
                        ? `rgb(${props.colour.r}, ${props.colour.g}, ${props.colour.b}, ${
                            props.status ? 1 : 0.5
                        })`
                        : "#f1b256",
            }}
        >
            <p className="my-auto p-2">{props.text}</p>
        </button>
    );
}