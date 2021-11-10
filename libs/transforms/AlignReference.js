
const AlignReference = Parent => class extends Parent {
    constructor(source, reference) {
        super(reference);
        this.source = source
    }

    getMatrix() {
        const ms = this.source.invert().getMatrix();
        const mr = super.getMatrix();
        return this.source.multiplyMatrices(mr, ms);
    }

    applyTransform(matrix, ...geometries) {
        return this.source && this.source.applyTransform(matrix, ...geometries) ||
            super.applyTransform(matrix, ...geometries);
    }

    getGeometry() {
        return this.source && this.source.getGeometry() || super.getGeometry();
    }
}


module.exports = {AlignReference};