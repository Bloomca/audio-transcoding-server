# Authorization

This application does not have any sort of authentication. To avoid a situation where files can be easily shared using this service (which is not an intended goal), there are multiple things employed.

## Filename

The output filename is different from the uploaded name and is a random UUID, which makes it very hard to brute-force. To make it completely impossible, a query parameter `id` is required, which needs to be the job ID value, which is also a UUID.
