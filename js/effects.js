/**
 * Effects Module - Background Segmentation & Filters
 */

export class Effects {
    constructor() {
        this.selfieSegmentation = null;
        this.isReady = false;
        this.currentEffect = 'none'; // 'none', 'blur', 'image'
        this.bgImage = null;
        
        this.initMediaPipe();
    }

    async initMediaPipe() {
        try {
            // @ts-ignore
            this.selfieSegmentation = new SelfieSegmentation({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                }
            });

            this.selfieSegmentation.setOptions({
                modelSelection: 1, // 0 for general, 1 for landscape (faster)
            });

            this.isReady = true;
            console.log("MediaPipe Selfie Segmentation Ready");
        } catch (err) {
            console.error("Failed to initialize MediaPipe:", err);
        }
    }

    async processCameraFrame(videoElement, canvasElement) {
        if (!this.isReady || this.currentEffect === 'none') {
            // Just draw direct if no effect
            const ctx = canvasElement.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            return;
        }

        await this.selfieSegmentation.send({ image: videoElement });
    }

    applyEffect(effect, options = {}) {
        this.currentEffect = effect;
        if (effect === 'image' && options.imageUrl) {
            this.bgImage = new Image();
            this.bgImage.src = options.imageUrl;
        }
    }

    // This will be called by the onResults callback from MediaPipe
    renderResults(results, canvasElement, videoElement) {
        const ctx = canvasElement.getContext('2d');
        const width = canvasElement.width;
        const height = canvasElement.height;

        ctx.save();
        ctx.clearRect(0, 0, width, height);
        
        // 1. Draw the background
        if (this.currentEffect === 'blur') {
            ctx.filter = 'blur(10px)';
            ctx.drawImage(results.image, 0, 0, width, height);
            ctx.filter = 'none';
        } else if (this.currentEffect === 'image' && this.bgImage) {
            ctx.drawImage(this.bgImage, 0, 0, width, height);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
        }

        // 2. Draw the person mask
        ctx.globalCompositeOperation = 'destination-atop';
        ctx.drawImage(results.segmentationMask, 0, 0, width, height);

        // 3. Draw the person (only where the mask is)
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(results.image, 0, 0, width, height);

        ctx.restore();
    }
}
