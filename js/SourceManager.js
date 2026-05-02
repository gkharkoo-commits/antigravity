/**
 * SourceManager manages the collection of media sources (Screen, Camera, Overlays).
 */
export class SourceManager {
    constructor() {
        this.sources = new Map();
        this.order = []; // Z-order of sources
    }

    /**
     * Add a source to the manager.
     * @param {string} id - Unique identifier for the source.
     * @param {Object} source - Source properties (stream, type, x, y, width, height, visible).
     */
    addSource(id, source) {
        const defaultProps = {
            visible: true,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            opacity: 1,
            zIndex: this.order.length,
            type: 'video' // 'video', 'image', 'text'
        };

        this.sources.set(id, { ...defaultProps, ...source });
        this.order.push(id);
        this.sortOrder();
    }

    /**
     * Update source properties.
     * @param {string} id 
     * @param {Object} props 
     */
    updateSource(id, props) {
        if (this.sources.has(id)) {
            const current = this.sources.get(id);
            this.sources.set(id, { ...current, ...props });
        }
    }

    /**
     * Toggle visibility of a source.
     * @param {string} id 
     */
    toggleVisibility(id) {
        if (this.sources.has(id)) {
            const source = this.sources.get(id);
            source.visible = !source.visible;
        }
    }

    /**
     * Remove a source.
     * @param {string} id 
     */
    removeSource(id) {
        this.sources.delete(id);
        this.order = this.order.filter(sid => sid !== id);
    }

    /**
     * Sort sources by Z-index.
     */
    sortOrder() {
        this.order.sort((a, b) => {
            return this.sources.get(a).zIndex - this.sources.get(b).zIndex;
        });
    }

    /**
     * Get all visible sources in Z-order.
     */
    getActiveSources() {
        return this.order
            .map(id => ({ id, ...this.sources.get(id) }))
            .filter(s => s.visible);
    }
}
