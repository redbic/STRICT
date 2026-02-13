// Tileset loader and renderer for LimeZu Modern Interiors

class TilesetManager {
    constructor() {
        this.tilesets = new Map();
        this.tileSize = 16;
        this.scale = 3; // Scale up 16px tiles to 48px for visibility
        this.loaded = false;
    }

    async loadAll() {
        // Use centralized TILESETS config if available
        if (typeof TILESETS === 'undefined') {
            console.error('TILESETS config not loaded - ensure config/tilesets.js is included before tileset.js');
            return;
        }

        const loadPromises = Object.entries(TILESETS).map(([name, config]) => {
            return this.loadTileset(name, config.path);
        });

        await Promise.all(loadPromises);
        this.loaded = true;
        console.log('All tilesets loaded:', Object.keys(TILESETS).length, 'tilesets');
    }

    loadTileset(name, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.tilesets.set(name, {
                    image: img,
                    width: img.width,
                    height: img.height,
                    tilesPerRow: Math.floor(img.width / this.tileSize),
                    tilesPerCol: Math.floor(img.height / this.tileSize)
                });
                console.log(`Loaded tileset: ${name} (${img.width}x${img.height})`);
                resolve();
            };
            img.onerror = () => {
                console.warn(`Failed to load tileset: ${name} from ${path}`);
                resolve(); // Don't reject, just continue without this tileset
            };
            img.src = path;
        });
    }

    getTileset(name) {
        return this.tilesets.get(name);
    }

    // Draw a single tile from a tileset
    // flipH: flip horizontally, flipV: flip vertically
    drawTile(ctx, tilesetName, tileX, tileY, destX, destY, scale = this.scale, flipH = false, flipV = false) {
        const tileset = this.tilesets.get(tilesetName);
        if (!tileset) return;

        const srcX = tileX * this.tileSize;
        const srcY = tileY * this.tileSize;
        const destSize = this.tileSize * scale;

        ctx.imageSmoothingEnabled = false; // Pixel-perfect scaling

        if (flipH || flipV) {
            ctx.save();
            // Move to center of tile, flip, then draw offset
            ctx.translate(destX + destSize / 2, destY + destSize / 2);
            ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
            ctx.drawImage(
                tileset.image,
                srcX, srcY, this.tileSize, this.tileSize,
                -destSize / 2, -destSize / 2, destSize, destSize
            );
            ctx.restore();
        } else {
            ctx.drawImage(
                tileset.image,
                srcX, srcY, this.tileSize, this.tileSize,
                destX, destY, destSize, destSize
            );
        }
    }

    // Draw a tile by index (left-to-right, top-to-bottom)
    drawTileByIndex(ctx, tilesetName, index, destX, destY, scale = this.scale) {
        const tileset = this.tilesets.get(tilesetName);
        if (!tileset) return;

        const tileX = index % tileset.tilesPerRow;
        const tileY = Math.floor(index / tileset.tilesPerRow);
        this.drawTile(ctx, tilesetName, tileX, tileY, destX, destY, scale);
    }

    // Get the scaled tile size
    getScaledTileSize() {
        return this.tileSize * this.scale;
    }
}

// Global tileset manager instance
let tilesetManager = null;

// Initialize tilesets
async function initTilesets() {
    tilesetManager = new TilesetManager();
    await tilesetManager.loadAll();
    return tilesetManager;
}
