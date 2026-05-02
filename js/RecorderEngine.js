/**
 * RecorderEngine handles MediaRecorder logic and file generation.
 */
export class RecorderEngine {
    constructor(canvasStream) {
        this.stream = canvasStream;
        this.recorder = null;
        this.chunks = [];
        this.status = 'inactive'; // 'inactive', 'recording', 'paused'
        this.startTime = 0;
        this.pauseTime = 0;
        this.totalPausedDuration = 0;
    }

    start(stream) {
        if (this.status !== 'inactive') {
            try { this.recorder.stop(); } catch(e) {}
        }

        this.chunks = [];
        this.startTime = Date.now();
        this.totalPausedDuration = 0;

        const codecs = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ];

        let selectedCodec = codecs.find(c => MediaRecorder.isTypeSupported(c)) || '';
        
        try {
            this.recorder = new MediaRecorder(stream, {
                mimeType: selectedCodec,
                videoBitsPerSecond: 2500000 
            });

            this.recorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.chunks.push(e.data);
            };

            this.recorder.onstop = () => this.exportRecording();

            this.recorder.start(1000); 
            this.status = 'recording';
        } catch (err) {
            this.status = 'inactive';
            throw err;
        }
    }

    pause() {
        if (this.status === 'recording') {
            this.recorder.pause();
            this.status = 'paused';
            this.pauseTime = Date.now();
        }
    }

    resume() {
        if (this.status === 'paused') {
            this.recorder.resume();
            this.status = 'recording';
            this.totalPausedDuration += (Date.now() - this.pauseTime);
        }
    }

    stop() {
        if (this.status !== 'inactive') {
            this.recorder.stop();
            this.status = 'inactive';
        }
    }

    getDuration() {
        if (this.status === 'inactive') return 0;
        const current = this.status === 'paused' ? this.pauseTime : Date.now();
        return current - this.startTime - this.totalPausedDuration;
    }

    async exportRecording() {
        if (this.chunks.length === 0) {
            console.warn('No data recorded. Export cancelled.');
            return;
        }

        // Correct mimeType for better compatibility and seekability
        const exportBlob = new Blob(this.chunks, { type: 'video/webm;codecs=vp8,opus' });

        // Use modern File System Access API if available
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `lumina-capture-${new Date().getTime()}.webm`,
                    types: [{
                        description: 'Video File',
                        accept: { 'video/webm': ['.webm'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(exportBlob);
                await writable.close();
                return;
            } catch (err) {
                if (err.name === 'AbortError') return; 
                console.error('File system error:', err);
            }
        }

        // Fallback for older browsers
        const url = URL.createObjectURL(exportBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lumina-capture-${new Date().getTime()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
