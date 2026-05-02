/**
 * StreamingModule handles the WebRTC/Websocket connection to a streaming server.
 */
export class StreamingModule {
    constructor(stream) {
        this.stream = stream;
        this.socket = null;
        this.mediaRecorder = null;
        this.isRunning = false;
    }

    start(serverUrl, streamKey) {
        if (this.isRunning) return;
        
        console.log(`Connecting to stream bridge: ${serverUrl}`);
        
        // In a real scenario, we connect to a local Node.js bridge
        this.socket = new WebSocket(serverUrl);
        
        this.socket.onopen = () => {
            this.showToast('Connected to Streaming Bridge', 'success');
            this.startRecording(streamKey);
        };

        this.socket.onerror = (err) => {
            console.error('Streaming connection failed:', err);
            window.app.showToast('Streaming Server not found. Run "node server.js" first.', 'error');
            this.stop();
        };

        this.isRunning = true;
    }

    startRecording(streamKey) {
        // Send the stream key first
        this.socket.send(JSON.stringify({ type: 'config', key: streamKey }));

        this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 3000000
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(event.data);
            }
        };

        this.mediaRecorder.start(100); // Small chunks for low latency
    }

    stop() {
        if (this.mediaRecorder) this.mediaRecorder.stop();
        if (this.socket) this.socket.close();
        this.isRunning = false;
        this.mediaRecorder = null;
        this.socket = null;
    }

    showToast(msg, type) {
        if (window.app) window.app.showToast(msg, type);
    }
}
