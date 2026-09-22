import axios from "axios";

const media_url = "https://console-origin.womancart.in/api/imageUpload";
type UploadResponse = {
  statusCode: number;
  message: string;
  data: string;
  status: number;
};

export const Uploadpdf = async (imageObject: any) => {
  const formData = new FormData();

  formData.append("file", imageObject as any);

  let headers = {
    Accept: "application/json",
    "x-portal": "user",
  };
  try {
    const res = await fetch(media_url, {
      method: "POST",
      headers,
      body: formData,
    });
    let response = await res.json();
    return response;
  } catch (error) {
    return error;
  }
};

export const UploadImageProgress = async (
  imageObject: any,
  onProgress: any
): Promise<any> => {
  const formData = new FormData();
  formData.append("file", imageObject);
  try {
    const response = await axios.post(`${media_url}`, formData, {
      headers: {
        Accept: "application/json",
        "x-portal": "USER",
      },
      onUploadProgress: (progressEvent: any) => {
        const total = progressEvent.total || 1;
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / total
        );
        if (onProgress) {
          onProgress(percentCompleted);
        }
      },
    });

    return response.data; // Return the API response
  } catch (error) {
    console.error(error, "Error uploading PDF");
    throw error; // Re-throw the error to handle it in the caller function
  }
};

export const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");

    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.addEventListener("loadedmetadata", () => {
      const seekTime = Math.min(1, video.duration / 2);
      video.currentTime = seekTime;
    });

    video.addEventListener("seeked", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(video.src);
        return reject("Failed to get canvas context");
      }

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataURL);
      } catch (err) {
        reject("Failed to generate thumbnail");
      }

      URL.revokeObjectURL(video.src);
    });

    video.addEventListener("error", (err) => {
      URL.revokeObjectURL(video.src);
      reject(err);
    });
  });
};
