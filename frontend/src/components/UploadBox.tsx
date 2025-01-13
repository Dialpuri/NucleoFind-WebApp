function UploadBox(props: { onSubmit: (event: never) => Promise<void> }) {
    return <>
        <div className="space-y-4 bg-white shadow-lg rounded-lg p-8 max-w-xl w-full">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Find nucleic acid features with NucleoFind</h1>
            <form className="space-y-4 flex items-center">
                <label
                    htmlFor="fileInput"
                    className="block text-sm font-medium text-gray-700"
                >

                </label>
                <input
                    type="file"
                    id="fileInput"
                    onChange={props.onSubmit}
                    className="mt-2 block w-full mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
            </form>
        </div>
    </>;
}

export default UploadBox;