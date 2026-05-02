/**
 * Recorder Module - Canvas Merging & MediaRecorder
 */

export class Recorder {
    constructor(media, effects, ui) {
        this.media = media;
        this.effects = effects;
        this.ui = ui;
        
        this.canvas = document.getElementById('recorder-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.mediaRecorder = null;
        this.chunks = [];
        this.isRecording = false;
        this.animationFrameId = null;
        this.startTime = 0;
        this.timerInterval = null;
        
        this.resolution = { width: 1280, height: 720 };
    }

    setResolution(res) {
        if (res === '480') this.resolution = { width: 854, height: 480 };
        else if (res === '720') this.resolution = { width: 1280, height: 720 };
        else if (res === '1080') this.resolution = { width: 1920, height: 1080 };
        
        this.canvas.width = this.resolution.width;
        this.canvas.height = this.resolution.height;
    }

    start() {
        if (this.isRecording) return;
        
        this.setResolution(document.getElementById('select-resolution').value);
        this.chunks = [];
        
        // Prepare combined stream
        const canvasStream = this.canvas.captureStream(30); // 30 FPS
        
        // Add Audio Tracks
        const audioTracks = [];
        if (this.media.cameraStream) {
            audioTracks.push(...this.media.cameraStream.getAudioTracks());
        }
        if (this.media.screenStream) {
            audioTracks.push(...this.media.screenStream.getAudioTracks());
        }

        // Mix audio if multiple sources (simplified: just take first available for now)
        // Ideally use Web Audio API to mix
        if (audioTracks.length > 0) {
            canvasStream.addTrack(audioTracks[0]);
        }

        this.mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType: 'video/webm;codecs=vp9,opus'
        });

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.chunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => this.saveRecording();

        this.mediaRecorder.start();
        this.isRecording = true;
        this.startTime = Date.now();
        
        this.startDrawing();
        this.startTimer();
    }

    stop() {
        if (!this.isRecording) return;
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        
        cancelAnimationFrame(this.animationFrameId);
        clearInterval(this.timerInterval);
    }

    startDrawing() {
        const draw = async () => {
            if (!this.isRecording) return;

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // 1. Draw Screen (Background)
            if (this.media.screenStream) {
                this.ctx.drawImage(this.media.screenPreview, 0, 0, this.canvas.width, this.canvas.height);
            } else {
                this.ctx.fillStyle = '#020617';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }

            // 2. Draw Camera (PiP Overlay)
            if (this.media.cameraStream) {
                const bubble = document.getElementById('camera-bubble');
                const container = document.getElementById('preview-container');
                const rect = bubble.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                // Calculate relative position and scale to canvas resolution
                const xRatio = (rect.left - containerRect.left) / containerRect.width;
                const yRatio = (rect.top - containerRect.top) / containerRect.height;
                const wRatio = rect.width / containerRect.width;
                const hRatio = rect.height / containerRect.height;

                const x = xRatio * this.canvas.width;
                const y = yRatio * this.canvas.height;
                const w = wRatio * this.canvas.width;
                const h = hRatio * this.canvas.height;

                this.ctx.save();
                
                // Handle Circle Shape
                if (bubble.classList.contains('circle')) {
                    this.ctx.beginPath();
                    this.ctx.arc(x + w/2, y + h/2, w/2, 0, Math.PI * 2);
                    this.ctx.clip();
                } else {
                    // Square with rounded corners
                    const radius = 20;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + radius, y);
                    this.ctx.arcTo(x + w, y, x + w, y + h, radius);
                    this.ctx.arcTo(x + w, y + h, x, y + h, radius);
                    this.ctx.arcTo(x, y + h, x, y, radius);
                    this.ctx.arcTo(x, y, x + w, y, radius);
                    this.ctx.closePath();
                    this.ctx.clip();
                }

                // Draw Camera with Mirroring
                this.ctx.translate(x + w, y);
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(this.media.videoPreview, 0, 0, w, h);
                
                this.ctx.restore();
            }

            this.animationFrameId = requestAnimationFrame(draw);
        };

        draw();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.ui.updateTimer(elapsed);
        }, 1000);
    }

    saveRecording() {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${new Date().toISOString()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.ui.showToast('Recording saved successfully!', 'success');
    }
}
