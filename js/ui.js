/**
 * UI & Interaction Module
 */

export class UI {
    constructor() {
        this.cameraBubble = document.getElementById('camera-bubble');
        this.settingsPanel = document.getElementById('settings-panel');
        this.btnSettings = document.getElementById('btn-settings');
        this.btnCloseSettings = document.getElementById('btn-close-settings');
        this.recordingIndicator = document.getElementById('recording-indicator');
        this.timer = document.getElementById('timer');
        this.btnRecord = document.getElementById('btn-record');
        
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.initEventListeners();
    }

    initEventListeners() {
        // Draggable Camera Bubble
        this.cameraBubble.addEventListener('mousedown', (e) => this.startDragging(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDragging());

        // Mobile Dragging
        this.cameraBubble.addEventListener('touchstart', (e) => this.startDragging(e.touches[0]), { passive: false });
        document.addEventListener('touchmove', (e) => this.drag(e.touches[0]), { passive: false });
        document.addEventListener('touchend', () => this.stopDragging());

        // Settings Panel
        this.btnSettings.addEventListener('click', () => this.toggleSettings());
        this.btnCloseSettings.addEventListener('click', () => this.toggleSettings(false));

        // Close settings if clicked outside
        document.addEventListener('mousedown', (e) => {
            if (!this.settingsPanel.classList.contains('hidden') && 
                !this.settingsPanel.contains(e.target) && 
                !this.btnSettings.contains(e.target)) {
                this.toggleSettings(false);
            }
        });
    }

    startDragging(e) {
        if (e.target.closest('.drag-handle') || e.target.closest('.camera-bubble')) {
            this.isDragging = true;
            const rect = this.cameraBubble.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            this.cameraBubble.style.transition = 'none';
        }
    }

    drag(e) {
        if (!this.isDragging) return;

        const container = document.getElementById('preview-container');
        const containerRect = container.getBoundingClientRect();
        
        let x = e.clientX - containerRect.left - this.dragOffset.x;
        let y = e.clientY - containerRect.top - this.dragOffset.y;

        // Contain within preview
        const maxX = containerRect.width - this.cameraBubble.offsetWidth;
        const maxY = containerRect.height - this.cameraBubble.offsetHeight;

        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));

        // Use percentages for responsiveness
        const xPercent = (x / containerRect.width) * 100;
        const yPercent = (y / containerRect.height) * 100;

        this.cameraBubble.style.left = `${xPercent}%`;
        this.cameraBubble.style.top = `${yPercent}%`;
        this.cameraBubble.style.right = 'auto';
        this.cameraBubble.style.bottom = 'auto';
    }

    stopDragging() {
        this.isDragging = false;
        this.cameraBubble.style.transition = 'border-radius 0.4s ease';
    }

    toggleSettings(force) {
        if (force !== undefined) {
            this.settingsPanel.classList.toggle('hidden', !force);
            this.btnSettings.classList.toggle('active', force);
        } else {
            const isHidden = this.settingsPanel.classList.toggle('hidden');
            this.btnSettings.classList.toggle('active', !isHidden);
        }
    }

    updateTimer(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        this.timer.textContent = `${h}:${m}:${s}`;
    }

    setRecordingState(isRecording) {
        this.recordingIndicator.classList.toggle('active', isRecording);
        this.btnRecord.classList.toggle('recording', isRecording);
        if (!isRecording) {
            this.timer.textContent = '00:00:00';
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} glass`;
        toast.innerHTML = `
            <i class="ph-bold ${type === 'error' ? 'ph-warning-circle' : 'ph-info'}"></i>
            <span>${message}</span>
        `;
        document.getElementById('toast-container').appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 100);
    }
}
