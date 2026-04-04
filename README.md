# Audio Transcoding Server

This is a simple audio transcoding application which allows to convert audio between various formats. It automatically detects the uploaded audio format and converts it to the chosen format. Currently it simply preserves any existing metadata and carries it over to the new converted files.

You can upload an entire folder, and after transcoding you can download a zip archive which will contain both the converted files and all non-audio files, so this way you can preserve the album structure.

## Running

- `npm run dev` starts a local server, which should be available at port `3000`. It requires you to have `ffmpeg` available
- `npm run test:client` runs tests specific to the client, which do not depend on anything
- `npm run test:server` runs tests specific to the server, and they do require to have a running Redis

You can run the production version using `docker compose --env-file .env.production up -d --build` command.

## Architecture

This app has 3 parts:

- client-side application to convert files
- server application to receive transcoding request
- worker which performs transcoding jobs by calling [ffmpeg](https://www.ffmpeg.org/)

You can read more about the application in [the docs](./docs).

### Client-side app

Web application is written using [Veles](https://github.com/Bloomca/veles).

### Server app

Server application receives requests to transcode files, validates and saves them, and creates a job request for each file, and allows to check on status.

- POST `/transcode` -- allows to upload a file and specify desired output. In JSON response, there is `id` property which allows to check for the status

### Worker app

The worker application is the one which actually handles the conversion and posts updates for specific job IDs.