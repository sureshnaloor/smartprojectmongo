import B2 from "backblaze-b2";
import dotenv from "dotenv";

dotenv.config();

const b2 = new B2({
    applicationKeyId: process.env.B2_KEY_ID || "",
    applicationKey: process.env.B2_APPLICATION_KEY || "",
});

let isAuthorized = false;
let cachedBucketId: string | undefined = process.env.B2_BUCKET_ID;
let downloadUrlBase: string = "";

async function authorize() {
    if (!isAuthorized) {
        const response = await b2.authorize();
        downloadUrlBase = response.data.downloadUrl;
        isAuthorized = true;
    }
}

async function getBucketId(): Promise<string> {
    if (cachedBucketId) return cachedBucketId;

    await authorize();
    const bucketName = process.env.B2_BUCKET_NAME;
    if (!bucketName) {
        throw new Error("B2_BUCKET_NAME is not defined in .env");
    }

    // List buckets to find the one with the matching name
    const response = await b2.listBuckets();
    const buckets = response.data.buckets;
    const bucket = buckets.find((b: any) => b.bucketName === bucketName);

    if (!bucket) {
        throw new Error(`Bucket with name "${bucketName}" not found`);
    }

    cachedBucketId = bucket.bucketId;
    return cachedBucketId!;
}

export async function uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
    info?: Record<string, string>
) {
    await authorize();
    const bucketId = await getBucketId();

    const uploadUrlResponse = await b2.getUploadUrl({ bucketId });
    const { uploadUrl, authorizationToken } = uploadUrlResponse.data;

    const uploadResponse = await b2.uploadFile({
        uploadUrl,
        uploadAuthToken: authorizationToken,
        fileName,
        data: fileBuffer,
        mime: mimeType,
        info: info, // Pass custom metadata here
    });

    return uploadResponse.data;
}

export async function deleteFile(fileId: string, fileName: string) {
    await authorize();
    const response = await b2.deleteFileVersion({
        fileId,
        fileName,
    });
    return response.data;
}

export async function listFiles(prefix: string) {
    await authorize();
    const bucketId = await getBucketId();

    const response = await b2.listFileNames({
        bucketId,
        prefix,
        maxFileCount: 1000,
    });

    return response.data.files;
}

export async function getDownloadUrl(fileName: string) {
    await authorize();
    const bucketName = process.env.B2_BUCKET_NAME;
    if (!bucketName) {
        throw new Error("B2_BUCKET_NAME is not defined in .env");
    }

    const bucketId = await getBucketId();

    // Get download authorization (valid for 1 hour)
    const downloadAuth = await b2.getDownloadAuthorization({
        bucketId,
        fileNamePrefix: fileName,
        validDurationInSeconds: 3600,
    });

    // Construct the download URL using the dynamic base URL
    // We need to encode each segment of the fileName to handle spaces and special characters,
    // but preserve the slashes.
    const encodedFileName = fileName.split('/').map(encodeURIComponent).join('/');
    const downloadUrl = `${downloadUrlBase}/file/${bucketName}/${encodedFileName}?Authorization=${downloadAuth.data.authorizationToken}`;
    return downloadUrl;
}

export async function downloadFile(fileId: string) {
    await authorize();
    const response = await b2.downloadFileById({
        fileId,
        responseType: 'arraybuffer'
    });

    // Extract info from headers
    const info = {
        contentType: response.headers['content-type'],
        fileName: response.headers['x-bz-file-name'] ? decodeURIComponent(response.headers['x-bz-file-name']) : 'download',
        ...response.headers // include all headers just in case
    };

    return {
        data: Buffer.from(response.data),
        info
    };
}

export async function getFile(fileId: string) {
    await authorize();
    const response = await b2.getFileInfo({ fileId });
    return response.data;
}
