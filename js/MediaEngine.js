/**
 * MediaEngine handles all media device requests and stream management.
 */
export class MediaEngine {
    constructor() {
        this.streams = new Map();
    }

    /**
     * Request a screen capture stream.
     * @param {Object} options - Video and audio constraints.
     */
    async getScreenStream(options = { video: true, audio: true }) {
        try {
            // Try with audio first
            const stream = await navigator.mediaDevices.getDisplayMedia(options);
            this.streams.set('screen', stream);
            return stream;
        } catch (error) {
            if (options.audio) {
                console.warn('Failed with audio, retrying without audio...');
                return this.getScreenStream({ video: true, audio: false });
            }
            console.error('Failed to get screen stream:', error);
            throw error;
        }
    }

    /**
     * Request a camera capture stream.
     * @param {Object} options - Video and audio constraints.
     */
    async getCameraStream(options = { 
        video: true, 
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        } 
    }) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(options);
            this.streams.set('camera', stream);
            return stream;
        } catch (error) {
            console.error('Failed to get camera stream:', error);
            throw error;
        }
    }

    /**
     * Stop a specific stream.
     * @param {string} id - The ID of the stream (e.g., 'screen', 'camera').
     */
    stopStream(id) {
        const stream = this.streams.get(id);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            this.streams.delete(id);
        }
    }

    /**
     * Stop all active streams.
     */
    stopAll() {
        this.streams.forEach((stream, id) => this.stopStream(id));
    }
}
