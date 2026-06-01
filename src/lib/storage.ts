"use client";

import { supabase } from "./supabase";

// Storage buckets and paths
const storageBuckets = {
  avatars: "avatars",
  userFiles: "user-files",
};

const storagePaths = {
  userAvatar: (userId: string) => `${userId}/avatar`,
  userFiles: (userId: string, fileName: string) => `${userId}/${fileName}`,
};

// Upload progress callback type
export type UploadProgress = {
  progress: number;
  loaded: number;
  total: number;
};

// Storage operations using Supabase Storage
export const storageOperations = {
  // Upload user avatar
  async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from(storageBuckets.avatars)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true, // Replace existing avatar
        });

      if (error) {
        console.error("Error uploading avatar:", error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(storageBuckets.avatars)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      throw error;
    }
  },

  // Upload file with progress tracking (simulated for now - Supabase doesn't have built-in progress)
  uploadFileWithProgress(
    userId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): {
    uploadPromise: Promise<string>;
    abort: () => void;
  } {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = storagePaths.userFiles(userId, fileName);
    
    const abortController = new AbortController();
    
    const uploadPromise = new Promise<string>(async (resolve, reject) => {
      try {
        // Simulate progress updates (Supabase doesn't provide native progress tracking)
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 10;
          onProgress?.({
            progress: Math.min(progress, 90),
            loaded: Math.min(progress * file.size / 100, file.size * 0.9),
            total: file.size
          });
          
          if (progress >= 90) {
            clearInterval(progressInterval);
          }
        }, 100);

        const { error } = await supabase.storage
          .from(storageBuckets.userFiles)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        clearInterval(progressInterval);

        if (error) {
          throw error;
        }

        // Final progress update
        onProgress?.({
          progress: 100,
          loaded: file.size,
          total: file.size
        });

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(storageBuckets.userFiles)
          .getPublicUrl(filePath);

        resolve(publicUrl);
      } catch (error) {
        console.error("Upload error:", error);
        reject(error);
      }
    });

    return {
      uploadPromise,
      abort: () => {
        abortController.abort();
      }
    };
  },

  // Delete file
  async deleteFile(bucket: string, filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  },

  // Delete user avatar
  async deleteAvatar(userId: string): Promise<void> {
    try {
      // List all files in user's avatar folder and delete them
      const { data: files, error: listError } = await supabase.storage
        .from(storageBuckets.avatars)
        .list(userId);

      if (listError) {
        throw listError;
      }

      if (files && files.length > 0) {
        const filesToDelete = files.map(file => `${userId}/${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from(storageBuckets.avatars)
          .remove(filesToDelete);

        if (deleteError) {
          throw deleteError;
        }
      }
    } catch (error) {
      console.error("Error deleting avatar:", error);
      throw error;
    }
  },

  // List all files in a user folder
  async listUserFiles(userId: string): Promise<Array<{ name: string; url: string; size?: number; created_at?: string }>> {
    try {
      const { data: files, error } = await supabase.storage
        .from(storageBuckets.userFiles)
        .list(userId);

      if (error) {
        throw error;
      }

      const filesWithUrls = files?.map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from(storageBuckets.userFiles)
          .getPublicUrl(`${userId}/${file.name}`);

        return {
          name: file.name,
          url: publicUrl,
          size: file.metadata?.size,
          created_at: file.created_at
        };
      }) || [];

      return filesWithUrls;
    } catch (error) {
      console.error("Error listing files:", error);
      return [];
    }
  },

  // Get public URL for a file
  getPublicUrl(bucket: string, filePath: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  },

  // Create signed URL for temporary access (for private files)
  async createSignedUrl(bucket: string, filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error("Error creating signed URL:", error);
      throw error;
    }
  },
};

// Export bucket names for external use
export { storageBuckets, storagePaths };
