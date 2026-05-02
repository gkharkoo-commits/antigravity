/**
 * SceneManager handles the real-time compositing of sources onto the main canvas.
 */
export class SceneManager {
    constructor(canvas, sourceManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.sourceManager = sourceManager;
        this.isRunning = false;
        this.fps = 0;
        this.lastFrameTime = 0;
        
        // Default output resolution (480p for maximum performance)
        this.width = 854;
        this.height = 480;
        
        this.dragSource = null;
        this.dragOffset = { x: 0, y: 0 };
        
        this.initCanvas();
        this.initInteraction();
    }


    initCanvas() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    setResolution(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    initInteraction() {
        const interactionLayer = document.getElementById('interaction-layer');
        interactionLayer.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', () => this.onMouseUp());

        // Mouse Wheel to Resize
        interactionLayer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const pos = this.getMousePos(e);
            const sources = this.sourceManager.getActiveSources().reverse();

            for (const source of sources) {
                if (pos.x >= source.x && pos.x <= source.x + source.width &&
                    pos.y >= source.y && pos.y <= source.y + source.height) {
                    
                    const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05;
                    const newWidth = Math.max(100, Math.min(this.canvas.width, source.width * scaleFactor));
                    const ratio = source.height / source.width;
                    
                    this.sourceManager.updateSource(source.id, {
                        width: newWidth,
                        height: newWidth * ratio
                    });
                    break;
                }
            }
        }, { passive: false });
    }

    getMousePos(e) {
        const rect = document.getElementById('interaction-layer').getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    onMouseDown(e) {
        const pos = this.getMousePos(e);
        const sources = this.sourceManager.getActiveSources().reverse(); // Top to bottom

        for (const source of sources) {
            if (source.locked) continue; // Skip locked sources (like background)
            
            if (pos.x >= source.x && pos.x <= source.x + source.width &&
                pos.y >= source.y && pos.y <= source.y + source.height) {
                this.dragSource = source.id;
                this.dragOffset = {
                    x: pos.x - source.x,
                    y: pos.y - source.y
                };
                break;
            }
        }
    }

    onMouseMove(e) {
        if (!this.dragSource) return;
        const pos = this.getMousePos(e);
        this.sourceManager.updateSource(this.dragSource, {
            x: pos.x - this.dragOffset.x,
            y: pos.y - this.dragOffset.y
        });
    }

    onMouseUp() {
        this.dragSource = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.render();
    }

    stop() {
        this.isRunning = false;
    }

    render(now = 0) {
        if (!this.isRunning) return;

        // Limit FPS to ~30 for performance
        const frameInterval = 1000 / 30;
        const deltaTime = now - this.lastFrameTime;
        
        if (deltaTime < frameInterval) {
            requestAnimationFrame((t) => this.render(t));
            return;
        }

        if (deltaTime > 0) {
            this.fps = Math.round(1000 / deltaTime);
        }
        this.lastFrameTime = now;

        const activeSources = this.sourceManager.getActiveSources();
        const isRecording = (window.app && window.app.recorderEngine && window.app.recorderEngine.status !== 'inactive');
        
        // Always clear the canvas to prevent ghosting/freezing
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (activeSources.length > 0 || isRecording) {
            activeSources.forEach(source => {
                // Logic: If source is marked 'hiddenInPreview', only draw it if we are recording
                if (source.hiddenInPreview && !isRecording) return;

                if (source.type === 'video' && source.element) {
                    this.drawVideoSource(source);
                } else if (source.type === 'image' && source.element) {
                    this.drawImageSource(source);
                }
            });
        }

        requestAnimationFrame((t) => this.render(t));
    }

    drawImageSource(source) {
        const { element, x, y, width, height, opacity } = source;
        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        this.ctx.drawImage(element, x, y, width, height);
        this.ctx.restore();
    }

    drawVideoSource(source) {
        const { element, x, y, width, height, opacity, shape } = source;
        
        if (element.readyState >= 2) { // HAVE_CURRENT_DATA
            this.ctx.save();
            this.ctx.globalAlpha = opacity;
            
            if (shape === 'circle') {
                const centerX = x + width / 2;
                const centerY = y + height / 2;
                const radius = Math.min(width, height) / 2;
                
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.clip();
            }

            if (source.beauty) {
                // Advanced Remini-style Enhancer: 
                // High Contrast + Sharpening (via double contrast) + Skin Smoothing
                this.ctx.filter = 'brightness(1.08) contrast(1.15) saturate(1.1) blur(0.4px) contrast(1.1)';
            }

            // Draw video
            this.ctx.drawImage(element, x, y, width, height);
            
            this.ctx.filter = 'none';
            this.ctx.restore();
        }
    }
}
