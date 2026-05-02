/**
 * LUMINA PRO - Streaming Bridge Server
 * Run this with: node server.js
 * Requires: npm install ws
 * Requires: FFmpeg installed on your system
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');

const wss = new WebSocket.Server({ port: 8080 });

console.log('Lumina Streaming Bridge running on ws://localhost:8080');

wss.on('connection', (ws) => {
    console.log('Browser connected to bridge');
    let ffmpeg = null;

    ws.on('message', (data) => {
        // Handle Config
        if (typeof data === 'string') {
            const config = JSON.parse(data);
            if (config.type === 'config') {
                const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${config.key}`;
                console.log(`Starting FFmpeg stream to: ${rtmpUrl}`);

                ffmpeg = spawn('ffmpeg', [
                    '-i', '-', // Input from stdin
                    '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
                    '-c:a', 'aac', '-b:a', '128k',
                    '-f', 'flv', rtmpUrl
                ]);

                ffmpeg.stderr.on('data', (err) => {
                    // console.log('FFmpeg:', err.toString());
                });

                ffmpeg.on('close', (code) => {
                    console.log('FFmpeg process closed with code', code);
                });
            }
            return;
        }

        // Handle Video Data
        if (ffmpeg && ffmpeg.stdin.writable) {
            ffmpeg.stdin.write(data);
        }
    });

    ws.on('close', () => {
        console.log('Browser disconnected');
        if (ffmpeg) ffmpeg.kill('SIGINT');
    });
});
