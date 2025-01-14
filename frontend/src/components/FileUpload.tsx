function FileSelection(props: {
  onChange: (event: any) => Promise<void>;
  allowSubmission: boolean;
}) {
  return (
    <form className="space-y-4 flex items-center transition-all duration-100">
      <label
        htmlFor="fileInput"
        className="block text-sm font-medium text-gray-700"
      ></label>
      <input
        type="file"
        id="fileInput"
        onChange={(e) => props.onChange(e)}
        disabled={!props.allowSubmission}
        className="mt-2 file:m-1 mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
             file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-nfAccent
              file:text-white hover:file:text-gray-100 hover:file:scale-105"
      />
    </form>
  );
}

function DownloadMaps(props: { onClick: () => void }) {
  return (
    <div className="flex flex-col space-y-2 items-center">
      <div className="flex space-x-2 i">
        <p className="font-md mr-2 my-auto">
          Your NucleoFind predictions are ready:
        </p>
        <button
          className="bg-nfAccent w-24 h-10 rounded-lg text-white hover:scale-105"
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
        className="text-sm font-bold hover:scale-105 text-nfSecondary hover:text-nfSecondaryAlt text-decoration-none"
      >
        Dialpuri, J. S, et al., Nucleic Acids Research, <br /> Volume 52, Issue
        17, 23 September 2024, Page e84
      </a>
    </div>
  );
}

export default function FileUpload(props: {
  onSubmit: (event: Event) => Promise<void>;
  allowSubmission: boolean;
  progress: number;
  predictedMapsSaved: boolean;
  downloadCallback: () => void;
}) {
  return (
    <div className="relative overflow-hidden w-full rounded-lg text-center items-center">
      {!props.allowSubmission ? (
        <div className="animate-rotate absolute inset-0 h-full w-full rounded-full bg-[conic-gradient(#f1b256_20deg,transparent_120deg)]"></div>
      ) : (
        <></>
      )}

      <div className="space-y-3 bg-white rounded-lg p-8 m-1 relative">
        <h1 className="text-3xl font-extrabold text-nfSecondary">
          NucleoFind Web App
        </h1>

        <h3 className="text-lg font-medium text-gray-500">
          Find nucleic acid features using deep learning
        </h3>

        {props.allowSubmission ? (
          !props.predictedMapsSaved ? (
            <FileSelection
              onChange={props.onSubmit}
              allowSubmission={props.allowSubmission}
            />
          ) : (
            <DownloadMaps onClick={props.downloadCallback} />
          )
        ) : (
          <div className="h-8 text-xl font-medium mx-auto text-gray-800 ">
            Loading model...
            <h3 className="text-sm font-medium text-gray-500 mb-6">
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
