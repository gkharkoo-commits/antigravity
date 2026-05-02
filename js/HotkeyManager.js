/**
 * HotkeyManager handles keyboard shortcuts.
 */
export class HotkeyManager {
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            // Meta/Ctrl + R: Record
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.callbacks.onRecord();
            }
            
            // Meta/Ctrl + S: Stop
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.callbacks.onStop();
            }

            // Meta/Ctrl + L: Live
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.callbacks.onStream();
            }

            // Meta/Ctrl + M: Mute
            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                this.callbacks.onMute();
            }
        });
    }
}
