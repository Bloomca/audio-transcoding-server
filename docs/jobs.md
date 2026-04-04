# Jobs

Processing media is intentionally split into a separate application for multiple reasons:

- server is completely independent from it
- scaling can be done completely separately depending on the bottlenecks
- transcoding is CPU-bound, while server is I/O bound

To communicate between them, we use jobs.

## BullMQ

We use [BullMQ](https://bullmq.io/) in order to get jobs with progress and a few helpful primitives built on top of that. Internally it uses Redis, which makes it easy to start with.

## Flow

The flow is the following:

1. Server receives a `/transcode` request
2. It validates and saves a file to the provided folder
3. It queues a new job

After this, the separate application takes care of the process:

4. Worker listens to new jobs and it picks the new one
5. It starts to transcode the file
6. During transcoding, it updates the jobs progress status

Server is listening back for job updates to respond if any client is looking for updates:

7. Server passes updates to clients listening via SSE
8. Once worker finishes, it posts that the job is complete
9. Server notifies the clients that the transcoding is done

You can see that the entire communication is happening via the job interface, which can be easily changed.