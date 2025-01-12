function UploadBox(props: { onSubmit: (event: never) => Promise<void> }) {
    return <div className="min-h-screen bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Upload Your File</h1>
            <form onSubmit={props.onSubmit} className="space-y-4">
                <div>
                    <label
                        htmlFor="fileInput"
                        className="block text-sm font-medium text-gray-700"
                    >
                        Choose a file
                    </label>
                    <input
                        type="file"
                        id="fileInput"
                        onChange={props.onSubmit}
                        className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    Upload File
                </button>
            </form>
        </div>
    </div>;
}

export default UploadBox;