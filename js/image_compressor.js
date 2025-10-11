/**
 * Image Compression Utility for Shreeved
 * Reduces image file sizes by 70% while maintaining quality
 * Creates thumbnails for preview
 */

export class ImageCompressor {
    constructor(options = {}) {
        this.maxWidth = options.maxWidth || 1200;
        this.maxHeight = options.maxHeight || 1200;
        this.quality = options.quality || 0.7; // 70% quality
        this.thumbnailSize = options.thumbnailSize || 300;
    }

    /**
     * Compress an image file
     * @param {File} file - The image file to compress
     * @returns {Promise<File>} Compressed image file
     */
    async compress(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onerror = () => reject(new Error('Failed to load image'));
                
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        let { width, height } = this._calculateDimensions(img.width, img.height);
                        
                        canvas.width = width;
                        canvas.height = height;
                        
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        canvas.toBlob(
                            (blob) => {
                                if (!blob) {
                                    reject(new Error('Failed to compress image'));
                                    return;
                                }
                                
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                
                                console.log(`Original: ${(file.size / 1024).toFixed(2)}KB → Compressed: ${(compressedFile.size / 1024).toFixed(2)}KB`);
                                resolve(compressedFile);
                            },
                            'image/jpeg',
                            this.quality
                        );
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.src = e.target.result;
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * Create a thumbnail from an image file
     * @param {File} file - The image file
     * @returns {Promise<File>} Thumbnail file
     */
    async createThumbnail(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onerror = () => reject(new Error('Failed to load image'));
                
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const size = this.thumbnailSize;
                        
                        // Square thumbnail
                        canvas.width = size;
                        canvas.height = size;
                        
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        
                        // Calculate crop dimensions for square
                        const minDim = Math.min(img.width, img.height);
                        const sx = (img.width - minDim) / 2;
                        const sy = (img.height - minDim) / 2;
                        
                        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
                        
                        canvas.toBlob(
                            (blob) => {
                                if (!blob) {
                                    reject(new Error('Failed to create thumbnail'));
                                    return;
                                }
                                
                                const thumbnailFile = new File([blob], `thumb_${file.name}`, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                
                                resolve(thumbnailFile);
                            },
                            'image/jpeg',
                            0.6 // 60% quality for thumbnails
                        );
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.src = e.target.result;
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * Get a data URL for preview
     * @param {File} file - The image file
     * @returns {Promise<string>} Data URL
     */
    async getPreviewURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Validate image file
     * @param {File} file - The file to validate
     * @param {number} maxSizeMB - Maximum file size in MB
     * @returns {Object} Validation result
     */
    validateImage(file, maxSizeMB = 2) {
        const result = { valid: true, errors: [] };
        
        // Check if it's an image
        if (!file.type.startsWith('image/')) {
            result.valid = false;
            result.errors.push('File must be an image');
        }
        
        // Check file size
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            result.valid = false;
            result.errors.push(`File size must be less than ${maxSizeMB}MB`);
        }
        
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            result.valid = false;
            result.errors.push('Only JPG, PNG, and WebP images are allowed');
        }
        
        return result;
    }

    /**
     * Calculate new dimensions maintaining aspect ratio
     * @private
     */
    _calculateDimensions(width, height) {
        let newWidth = width;
        let newHeight = height;
        
        if (width > this.maxWidth) {
            newWidth = this.maxWidth;
            newHeight = (height * this.maxWidth) / width;
        }
        
        if (newHeight > this.maxHeight) {
            newHeight = this.maxHeight;
            newWidth = (width * this.maxHeight) / height;
        }
        
        return { width: Math.round(newWidth), height: Math.round(newHeight) };
    }

    /**
     * Batch compress multiple images
     * @param {File[]} files - Array of image files
     * @param {Function} onProgress - Progress callback (optional)
     * @returns {Promise<File[]>} Array of compressed files
     */
    async compressBatch(files, onProgress = null) {
        const compressed = [];
        const total = files.length;
        
        for (let i = 0; i < total; i++) {
            try {
                const compressedFile = await this.compress(files[i]);
                compressed.push(compressedFile);
                
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total,
                        percentage: Math.round(((i + 1) / total) * 100)
                    });
                }
            } catch (error) {
                console.error(`Failed to compress ${files[i].name}:`, error);
                compressed.push(null);
            }
        }
        
        return compressed.filter(f => f !== null);
    }
}

// Export default instance
export default new ImageCompressor();