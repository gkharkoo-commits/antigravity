/**
 * Media Stream Module
 */

export class Media {
    constructor() {
        this.cameraStream = null;
        this.screenStream = null;
        this.videoPreview = document.getElementById('camera-preview');
        this.screenPreview = document.getElementById('screen-preview');
    }

    async getCameraStream(constraints = {}) {
        try {
            const defaultConstraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                },
                audio: true
            };
            
            const finalConstraints = { ...defaultConstraints, ...constraints };
            this.cameraStream = await navigator.mediaDevices.getUserMedia(finalConstraints);
            this.videoPreview.srcObject = this.cameraStream;
            return this.cameraStream;
        } catch (err) {
            console.error("Error accessing camera:", err);
            throw err;
        }
    }

    async getScreenStream(constraints = {}) {
        try {
            const defaultConstraints = {
                video: {
                    cursor: "always"
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            };

            const finalConstraints = { ...defaultConstraints, ...constraints };
            this.screenStream = await navigator.mediaDevices.getDisplayMedia(finalConstraints);
            this.screenPreview.srcObject = this.screenStream;
            
            // Handle stream stop (e.g. from browser UI)
            this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                this.stopScreenStream();
            });

            return this.screenStream;
        } catch (err) {
            console.error("Error accessing screen:", err);
            throw err;
        }
    }

    stopCameraStream() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
            this.videoPreview.srcObject = null;
        }
    }

    stopScreenStream() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
            this.screenPreview.srcObject = null;
        }
    }

    getAllTracks() {
        const tracks = [];
        if (this.cameraStream) tracks.push(...this.cameraStream.getTracks());
        if (this.screenStream) tracks.push(...this.screenStream.getTracks());
        return tracks;
    }
}
