"use client";

import { useState, useCallback, useEffect } from "react";
import { storageOperations } from "@/lib/storage";

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  error: string | null;
  downloadURL: string | null;
}

export function useFileUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    error: null,
    downloadURL: null,
  });

  const uploadFile = useCallback(async (userId: string, file: File) => {
    setUploadState({ status: "uploading", progress: 0, error: null, downloadURL: null });

    try {
      const { uploadPromise } = storageOperations.uploadFileWithProgress(userId, file, (progress) => {
        setUploadState((prev) => ({ ...prev, progress: progress.progress }));
      });

      const url = await uploadPromise;
      setUploadState({ status: "success", progress: 100, error: null, downloadURL: url });
      return url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setUploadState({ status: "error", progress: 0, error: message, downloadURL: null });
      throw error;
    }
  }, []);

  const uploadAvatar = useCallback(async (userId: string, file: File) => {
    setUploadState({ status: "uploading", progress: 0, error: null, downloadURL: null });
    try {
      const url = await storageOperations.uploadAvatar(userId, file);
      setUploadState({ status: "success", progress: 100, error: null, downloadURL: url });
      return url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Avatar upload failed";
      setUploadState({ status: "error", progress: 0, error: message, downloadURL: null });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setUploadState({ status: "idle", progress: 0, error: null, downloadURL: null });
  }, []);

  return {
    ...uploadState,
    uploadFile,
    uploadAvatar,
    reset,
    isUploading: uploadState.status === "uploading",
    isSuccess: uploadState.status === "success",
    isError: uploadState.status === "error",
    isIdle: uploadState.status === "idle",
  };
}

export function useFileDownload() {
  const [status, setStatus] = useState<"idle" | "downloading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const downloadFile = useCallback(async (bucket: string, filePath: string, fileName?: string) => {
    setStatus("downloading");
    setError(null);

    try {
      const url = storageOperations.getPublicUrl(bucket, filePath);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "download";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatus("success");
      return url;
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : "Download failed";
      setError(message);
      setStatus("error");
      throw downloadError;
    }
  }, []);

  const openFile = useCallback(async (bucket: string, filePath: string) => {
    setStatus("downloading");
    setError(null);

    try {
      const url = storageOperations.getPublicUrl(bucket, filePath);
      window.open(url, "_blank");
      setStatus("success");
      return url;
    } catch (openError) {
      const message = openError instanceof Error ? openError.message : "Open failed";
      setError(message);
      setStatus("error");
      throw openError;
    }
  }, []);

  return {
    status,
    error,
    downloadFile,
    openFile,
    isDownloading: status === "downloading",
    isSuccess: status === "success",
    isError: status === "error",
    isIdle: status === "idle",
  };
}

export function useFileList(userId: string) {
  const [files, setFiles] = useState<Array<{ name: string; url: string; size?: number; created_at?: string }>>([]);
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");

  const refreshFiles = useCallback(async () => {
    if (!userId) return;
    setStatus("loading");
    try {
      const fileUrls = await storageOperations.listUserFiles(userId);
      setFiles(fileUrls);
      setStatus("success");
    } catch {
      setFiles([]);
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  return {
    files,
    status,
    refreshFiles,
    isLoading: status === "loading",
    isError: status === "error",
    isSuccess: status === "success",
  };
}
