# Client application

Client application is a very simple web application written using [Veles](https://github.com/Bloomca/veles) library for the UI.

It is responsible for accepting and managing selected files, uploading them to the server, displaying the upload progress, showing the errors, and for downloading the zipped files.

## Zip archive

The user can choose to download all transcoded files, along with all extra files as a single zip archive. The application will create a new zip archive locally and will trigger the download once it is ready.

## Architecture

The application is a typical component-based application, and all major logic is split into ViewModels for easier testability and modularity.

For simplicity, the main store (`jobStatusStore`) exists as a singleton and not injected using Context.

## Updates

There are multiple states the files can be in:

- uploading
- processing
- error
- completed

The global store is used for that. Additionally, to properly show uploading status, the `id` is derived from the file itself and not from the `jobId` returned by the server.