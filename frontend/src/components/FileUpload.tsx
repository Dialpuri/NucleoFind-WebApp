import { useState } from "react";

function FileSelection(props: {
  onChange: (event: unknown) => Promise<void>;
  allowSubmission: boolean;
  progress: number;
}) {
  const [selectedFile, setSelectedFile] = useState<boolean>(false);
  const onChangeWrapper = (event: unknown) => {
    setSelectedFile(true);
    props.onChange(event);
  };
  return (
    <form className=" flex items-center transition-all duration-100">
      {!selectedFile ? (
        <div className="flex flex-col text-left items-center justify-center">
          <label
            htmlFor="fileInput"
            className="block m-1 mx-auto text-sm py-2 px-4
                         rounded-lg border-0 file:font-semibold
                         bg-nfAccent hover:text-gray-100 hover:scale-105 text-white"
          >
            Choose file
          </label>
          <input
            type="file"
            id="fileInput"
            onChange={(e) => onChangeWrapper(e)}
            disabled={props.progress != 0}
            accept=".mtz"
            hidden
          />
          <label className="text-sm text-slate-500">Select an MTZ file</label>
        </div>
      ) : props.progress == 0 ? (
        <>Processing file...</>
      ) : (
        <>Predicting nucleic acid features...</>
      )}
    </form>
  );
}

function DownloadMaps(props: { onClick: () => void }) {
  return (
    <div className="flex flex-col space-y-2 items-center">
      <div className="flex flex-col justify-center items-center align-middle sm:flex-row space-x-2 i">
        <p className="text-sm sm:text-md sm:mr-2 my-auto">
          Your NucleoFind predictions are ready:
        </p>
        <button
          className="bg-nfAccent w-24 h-10 rounded-lg mt-2 sm:mt-0 text-white hover:scale-105"
          onClick={props.onClick}
        >
          Download
        </button>
      </div>
      <span className="text-sm">
        If you have found NucleoFind helpful, please cite:
      </span>
      <a
        href="https://doi.org/10.1093/nar/gkae715"
        target="_blank"
        className="text-sm font-bold hover:scale-105 hover:cursor-pointer text-nfSecondary hover:text-nfSecondaryAlt text-decoration-none"
      >
        Dialpuri, J. S, et al., Nucleic Acids Research, <br /> Volume 52, Issue
        17, 23 September 2024, Page e84
      </a>
    </div>
  );
}

export default function FileUpload(props: {
  onSubmit: (event: unknown) => Promise<void>;
  allowSubmission: boolean;
  progress: number;
  predictedMapsSaved: boolean;
  downloadCallback: () => void;
}) {
  // @ts-ignore
  return (
    <div className="relative overflow-hidden w-full rounded-lg text-center items-center">
      {!props.allowSubmission ? (
        <div className="animate-rotate absolute inset-0 h-full w-full rounded-full bg-[conic-gradient(#f1b256_20deg,transparent_120deg)]"></div>
      ) : (
        <></>
      )}

      <div className="space-y-3 bg-white rounded-lg px-8 pt-8 pb-6 m-1 relative min-h-[220px]">
        <h1 className="text-3xl font-extrabold text-nfSecondary">
          NucleoFind Web App
        </h1>

        <h3 className="text-lg font-medium text-gray-500">
          Find nucleic acid features using deep learning
        </h3>

        {props.allowSubmission ? (
          !props.predictedMapsSaved ? (
            <div className="flex flex-col space-y-2 items-center">
              <FileSelection
                onChange={props.onSubmit}
                allowSubmission={props.allowSubmission}
                progress={props.progress}
              />
              <h3 className="text-sm font-medium text-gray-500">
                Files are never sent externally.
              </h3>
            </div>
          ) : (
            <DownloadMaps onClick={props.downloadCallback} />
          )
        ) : (
          <div className="text-xl font-medium mx-auto text-gray-800 mt-4">
            Loading model...
            <h3 className="text-sm text-gray-500 ">
              Subsequent loads will be faster
            </h3>
          </div>
        )}

        {props.progress < 100 ? (
          <div
            className="absolute bottom-0 left-0 h-1 bg-nfAccent transition-all duration-300"
            style={{ width: `${props.progress}%` }}
          ></div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
