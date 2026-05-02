import { MediaEngine } from './MediaEngine.js';
import { SourceManager } from './SourceManager.js';
import { SceneManager } from './SceneManager.js';
import { RecorderEngine } from './RecorderEngine.js';
import { HotkeyManager } from './HotkeyManager.js';
import { StreamingModule } from './StreamingModule.js';

class LuminaApp {
    constructor() {
        this.mediaEngine = new MediaEngine();
        this.sourceManager = new SourceManager();
        this.sceneManager = null;
        this.recorderEngine = null;
        this.streamingModule = null;
        this.hotkeyManager = null;
        this.isStarting = false;

        this.init();
    }

    async init() {
        // DOM Elements
        this.canvas = document.getElementById('main-canvas');
        this.btnRecord = document.getElementById('btn-record');
        this.btnStop = document.getElementById('btn-stop');
        this.btnPause = document.getElementById('btn-pause');
        this.btnStream = document.getElementById('btn-stream');
        this.btnSettings = document.getElementById('btn-settings');
        this.btnQuickStart = document.getElementById('btn-quick-start');
        this.timerDisplay = document.getElementById('timer');
        this.fpsDisplay = document.getElementById('render-fps');
        this.emptyState = document.getElementById('empty-state');
        
        if (!this.canvas || !this.btnRecord) {
            console.error('Critical UI elements missing!');
            return;
        }
        this.emptyState = document.getElementById('empty-state');

        // Initialize Scene Manager
        this.sceneManager = new SceneManager(this.canvas, this.sourceManager);
        this.sceneManager.start();

        // Initialize Recorder Engine
        this.recorderEngine = new RecorderEngine(null);

        // Initialize Streaming Module (24 FPS for stability)
        const streamForStreaming = this.canvas.captureStream(24);
        this.streamingModule = new StreamingModule(streamForStreaming);
        
        this.isStarting = false; // Prevent double clicks
        
        // Initialize Hotkeys
        this.hotkeyManager = new HotkeyManager({
            onRecord: () => this.toggleRecording(),
            onStop: () => this.stopRecording(),
            onStream: () => this.toggleStreaming(),
            onMute: () => this.toggleMute()
        });

        this.bindEvents();
        this.startUIUpdateLoop();
        
        // Auto-load logo for recording (hidden in preview)
        this.addLogoSource();

        // Auto-load previous sources (Mic/Camera)
        this.autoLoadSources();
    }

    autoLoadSources() {
        if (localStorage.getItem('lumina_pref_camera') === 'true') {
            this.addCameraSource();
        }
        if (localStorage.getItem('lumina_pref_mic') === 'true') {
            this.addMicSource();
        }
    }

    bindEvents() {
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };

        bind('btn-record', () => this.toggleRecording());
        bind('btn-stop', () => this.stopRecording());
        bind('btn-pause', () => this.togglePause());
        bind('btn-quick-start', () => this.quickStart());
        bind('btn-stream', () => this.toggleStreaming());
        bind('btn-settings', () => {
            const modal = document.getElementById('settings-modal');
            if (modal) modal.classList.remove('hidden');
        });
        bind('btn-close-modal', () => {
            const modal = document.getElementById('settings-modal');
            if (modal) modal.classList.add('hidden');
        });
        bind('btn-save-settings', () => this.applySettings());
        bind('btn-mobile-menu', () => this.toggleMobileMenu());

        // Sidebar Source Clicks
        document.querySelectorAll('.source-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('button')) return; 
                this.toggleSource(item.dataset.id);
                
                // On mobile, close sidebar after selecting a source
                if (window.innerWidth <= 768) {
                    this.toggleMobileMenu(false);
                }
            });
        });

        // Specific Button Bindings with Safe Checks
        const safeBind = (selector, fn) => {
            const el = document.querySelector(selector);
            if (el) el.addEventListener('click', (e) => {
                e.stopPropagation();
                fn(e);
            });
        };

        safeBind('[data-id="screen"] .toggle-visibility', () => this.toggleSource('screen'));
        safeBind('[data-id="mic"] .toggle-visibility', () => this.toggleSource('mic'));
        
        // Camera Group
        document.querySelectorAll('.source-item[data-id="camera"] button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (btn.classList.contains('toggle-beauty')) this.toggleCameraBeauty();
                if (btn.classList.contains('toggle-shape')) this.toggleCameraShape();
                if (btn.classList.contains('toggle-visibility')) this.toggleSource('camera');
            });
        });

        // Logo Check
        safeBind('[data-id="logo"] .toggle-visibility', () => this.toggleSource('logo'));

        // Settings Buttons
        document.querySelectorAll('.source-settings').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.source-item').dataset.id;
                this.showToast(`${id.toUpperCase()} settings coming soon!`, 'info');
            });
        });

        // Close mobile sidebar on backdrop click
        document.getElementById('app').addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && e.target.id === 'app' && document.querySelector('.sidebar').classList.contains('open')) {
                this.toggleMobileMenu(false);
            }
        });
    }

    toggleMobileMenu(force) {
        const sidebar = document.querySelector('.sidebar');
        const app = document.getElementById('app');
        if (sidebar && app) {
            const isOpen = force !== undefined ? force : !sidebar.classList.contains('open');
            sidebar.classList.toggle('open', isOpen);
            app.classList.toggle('sidebar-open', isOpen);
        }
    }

    async quickStart() {
        try {
            this.showToast('Requesting screen access...', 'info');
            await this.addScreenSource();
        } catch (err) {
            console.error('QuickStart Error:', err);
            this.showToast(`Start Failed: ${err.name} - ${err.message}`, 'error');
        }
    }

    async addScreenSource() {
        const stream = await this.mediaEngine.getScreenStream();
        const video = document.getElementById('video-source-screen');
        video.srcObject = stream;
        video.play();

        // Use a timeout to ensure video dimensions are loaded
        video.onloadedmetadata = () => {
            const videoRatio = video.videoWidth / video.videoHeight;
            const canvasRatio = this.canvas.width / this.canvas.height;
            
            let drawWidth, drawHeight;
            if (videoRatio > canvasRatio) {
                drawWidth = this.canvas.width;
                drawHeight = this.canvas.width / videoRatio;
            } else {
                drawHeight = this.canvas.height;
                drawWidth = this.canvas.height * videoRatio;
            }

            this.sourceManager.addSource('screen', {
                element: video,
                type: 'video',
                width: drawWidth,
                height: drawHeight,
                x: (this.canvas.width - drawWidth) / 2,
                y: (this.canvas.height - drawHeight) / 2,
                zIndex: 0
            });
            this.showToast('Screen source added', 'success');
            this.updateEmptyState();
        };
    }

    async addCameraSource() {
        try {
            const stream = await this.mediaEngine.getCameraStream();
            const video = document.getElementById('video-source-camera');
            video.srcObject = stream;

            // Ensure video plays
            await video.play();

            this.sourceManager.addSource('camera', {
                element: video,
                type: 'video',
                width: 320,
                height: 320, 
                x: this.canvas.width - 340,
                y: this.canvas.height - 340,
                zIndex: 1000, // Top Layer
                shape: 'circle'
            });

            this.updateSourceIcon('camera');
            localStorage.setItem('lumina_pref_camera', 'true');
            this.showToast('Camera source added', 'success');
            this.updateEmptyState();
        } catch (err) {
            console.error(err);
            this.showToast('Camera access denied or error: ' + err.message, 'error');
        }
    }

    toggleSource(id) {
        if (!this.sourceManager.sources.has(id)) {
            if (id === 'screen') this.addScreenSource();
            if (id === 'camera') this.addCameraSource();
            if (id === 'mic') this.addMicSource();
            if (id === 'logo') this.addLogoSource();
        } else {
            const source = this.sourceManager.sources.get(id);
            this.sourceManager.toggleVisibility(id);
            this.updateSourceIcon(id);
            
            // Save state if it's camera or mic
            if (id === 'camera' || id === 'mic') {
                localStorage.setItem(`lumina_pref_${id}`, source.visible);
            }
        }
    }

    async addMicSource() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            const audioEl = document.createElement('audio');
            audioEl.srcObject = stream;
            audioEl.muted = true; // IMPORTANT: Prevent feedback loop
            audioEl.play();

            this.sourceManager.addSource('mic', {
                element: audioEl,
                type: 'audio',
                visible: true
            });
            this.updateSourceIcon('mic');
            localStorage.setItem('lumina_pref_mic', 'true');
            this.showToast('Microphone added', 'success');
            this.updateEmptyState();
        } catch (err) {
            this.showToast('Microphone access denied', 'error');
        }
    }

    async addLogoSource() {
        const img = new Image();
        const primarySrc = 'Black___Blue_Minimalist_Modern_Initial_Font_Logo-removebg-preview.png';
        const fallbackSrc = 'logo.png';
        
        img.src = primarySrc + '?' + new Date().getTime();
        img.crossOrigin = "anonymous";
        
        img.onload = () => {
            this.finalizeLogo(img);
        };

        img.onerror = () => {
            img.src = fallbackSrc + '?' + new Date().getTime();
            img.onload = () => this.finalizeLogo(img);
            img.onerror = () => {
                this.showToast('No logo file found (logo.png or SVG source)', 'warning');
            };
        };
    }

    finalizeLogo(imgEl) {
        const processedCanvas = this.processLogoTransparency(imgEl);
        const size = 120; // Perfect size for corner
        this.sourceManager.addSource('logo', {
            element: processedCanvas,
            type: 'image',
            width: size,
            height: size,
            x: this.canvas.width - size - 20, // Extreme Right
            y: 20, // Extreme Top
            zIndex: 1001, 
            opacity: 0.9,
            visible: true,
            locked: true,
            hiddenInPreview: false 
        });
        this.updateSourceIcon('logo');
        this.updateEmptyState();
    }

    processLogoTransparency(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            // Aggressive Removal: If any pixel is very bright (white-ish), kill it
            // This threshold (190) targets everything from white to light grey
            if (r > 190 && g > 190 && b > 190) {
                data[i+3] = 0;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }


    updateSourceIcon(id) {
        const icon = document.querySelector(`[data-id="${id}"] i.ph-eye, [data-id="${id}"] i.ph-eye-slash`);
        if (icon) {
            icon.className = this.sourceManager.sources.get(id).visible ? 'ph-bold ph-eye' : 'ph-bold ph-eye-slash';
        }
        this.updateEmptyState();
    }

    updateEmptyState() {
        // Feature removed as requested (using sidebar button instead)
    }

    async toggleRecording() {
        if (this.isStarting) return; // Prevent spamming
        
        if (this.recorderEngine.status === 'inactive') {
            try {
                this.isStarting = true;
                this.btnRecord.classList.add('loading');
                await this.startRecording();
            } catch (err) {
                this.showToast('Failed to start recording: ' + err.message, 'error');
            } finally {
                this.isStarting = false;
                this.btnRecord.classList.remove('loading');
            }
        } else {
            this.stopRecording();
        }
    }

    startRecording() {
        // Combine Canvas Video with Audio Tracks (24 FPS for stability)
        const canvasStream = this.canvas.captureStream(24);
        const audioTracks = [];

        // Collect audio tracks from active sources
        this.sourceManager.getActiveSources().forEach(source => {
            if (source.element && source.element.srcObject) {
                const tracks = source.element.srcObject.getAudioTracks();
                audioTracks.push(...tracks);
            }
        });

        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioTracks
        ]);

        this.recorderEngine.start(combinedStream);

        this.btnRecord.classList.add('active');
        this.btnRecord.querySelector('span').textContent = 'Stop';
        this.btnStop.disabled = false;
        this.btnPause.disabled = false;
        document.getElementById('recording-indicator').classList.add('active');
        this.showToast('Recording started', 'success');
    }

    stopRecording() {
        this.recorderEngine.stop();
        this.btnRecord.classList.remove('active');
        this.btnRecord.querySelector('span').textContent = 'Record';
        this.btnStop.disabled = true;
        this.btnPause.disabled = true;
        document.getElementById('recording-indicator').classList.remove('active');
        this.showToast('Recording saved', 'success');
    }

    togglePause() {
        if (this.recorderEngine.status === 'recording') {
            this.recorderEngine.pause();
            this.btnPause.querySelector('i').className = 'ph-fill ph-play';
        } else if (this.recorderEngine.status === 'paused') {
            this.recorderEngine.resume();
            this.btnPause.querySelector('i').className = 'ph-fill ph-pause';
        }
    }

    toggleCameraShape() {
        const source = this.sourceManager.sources.get('camera');
        if (source) {
            const newShape = source.shape === 'circle' ? 'square' : 'circle';
            this.sourceManager.updateSource('camera', { shape: newShape });
            
            const icon = document.querySelector('[data-id="camera"] .toggle-shape i');
            icon.className = newShape === 'circle' ? 'ph-bold ph-circle' : 'ph-bold ph-square';
            
            this.showToast(`Camera shape: ${newShape}`, 'info');
        }
    }

    toggleCameraBeauty() {
        const source = this.sourceManager.sources.get('camera');
        if (source) {
            const newState = !source.beauty;
            this.sourceManager.updateSource('camera', { beauty: newState });
            
            const btn = document.querySelector('[data-id="camera"] .toggle-beauty');
            if (newState) {
                btn.classList.add('active');
                btn.style.color = 'var(--accent)';
                this.showToast('Remini-AI Enhancement: ON ✨', 'success');
            } else {
                btn.classList.remove('active');
                btn.style.color = '';
                this.showToast('Remini-AI: OFF', 'info');
            }
        }
    }

    toggleStreaming() {
        if (!this.streamingModule.isRunning) {
            const streamKey = document.getElementById('setting-stream-key').value;
            if (!streamKey) {
                this.showToast('Please enter a Stream Key in Settings', 'error');
                document.getElementById('settings-modal').classList.remove('hidden');
                return;
            }

            this.streamingModule.start('ws://localhost:8080', streamKey);
            document.getElementById('streaming-indicator').classList.remove('hidden');
            this.btnStream.classList.add('active');
            this.btnStream.querySelector('span').textContent = 'Stop Live';
        } else {
            this.streamingModule.stop();
            document.getElementById('streaming-indicator').classList.add('hidden');
            this.btnStream.classList.remove('active');
            this.btnStream.querySelector('span').textContent = 'Go Live';
            this.showToast('Streaming stopped', 'info');
        }
    }

    toggleMute() {
        this.showToast('Microphone toggled', 'info');
    }

    applySettings() {
        const res = document.getElementById('setting-resolution').value;
        const [w, h] = res.split('x').map(Number);

        this.sceneManager.setResolution(w, h);

        // Re-init recorder with new stream if needed (simplified: just restart)
        this.showToast(`Resolution updated to ${res}`, 'success');
        document.getElementById('settings-modal').classList.add('hidden');
    }

    startUIUpdateLoop() {
        const update = () => {
            // Update Timer
            if (this.recorderEngine.status !== 'inactive') {
                const duration = this.recorderEngine.getDuration();
                this.timerDisplay.textContent = this.formatDuration(duration);
            }

            // Update FPS
            this.fpsDisplay.textContent = this.sceneManager.fps || 60;

            // Update Audio Meters (Simulated for now)
            if (this.recorderEngine.status === 'recording') {
                this.updateAudioMeters();
            } else {
                this.resetAudioMeters();
            }

            requestAnimationFrame(update);
        };
        update();
    }

    updateAudioMeters() {
        const bars = document.querySelectorAll('.vu-bar');
        bars.forEach(bar => {
            const level = Math.random() * 60 + 20; // 20% to 80% random flicker
            bar.style.width = level + '%';
        });
    }

    resetAudioMeters() {
        const bars = document.querySelectorAll('.vu-bar');
        bars.forEach(bar => {
            bar.style.width = '0%';
        });
    }

    formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} glass`;

        const icon = type === 'success' ? 'ph-check-circle' : (type === 'error' ? 'ph-x-circle' : 'ph-info');
        toast.innerHTML = `<i class="ph-bold ${icon}"></i><span>${message}</span>`;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new LuminaApp();
});
