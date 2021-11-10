
const Composite = (TargetClass, {
    ignore = []
} = {}) => {
    const Clazz = class {
        constructor(targets, matrices) {
            // console.log(targets)
            this.targets = targets?.map((target, i) => matrices ?
                new TargetClass(target, matrices[i]) :
                new TargetClass(target));
            this.geometry = targets;
            this.isComposite = true;
        }

        apply() {
            return this.targets.map(target => target.apply());
        }

        getGeometry() {
            return this.targets.map(target => target.getGeometry());
        }

        getMatrix() {
            return this.targets.map(target => target.getMatrix());
        }
    }

    // no sense to applyToTargetAnd and applyTo on composite
    // getGeometry is an end point
    // apply is an end point
    ignore.push('getGeometry', 'apply',
        'applyToTargetAnd', 'applyTo',
        'constructor', 'getMatrix');

    let proto = TargetClass.prototype;
    while (proto && proto !== Object.prototype) {
        for (let method of
            Object.getOwnPropertyNames(proto)
                .filter(x => !ignore.includes(x))) {

            const descriptor = Object.getOwnPropertyDescriptor(proto, method);
            if (descriptor?.get) {
                Object.defineProperty(Clazz.prototype, method, {
                    get: function () {
                        // console.log(method)
                        this.targets.map(target => target[method]);
                        return this;
                    }
                });
            } else if (typeof TargetClass.prototype[method] === 'function') {
                Clazz.prototype[method] = function (...args) {
                    // console.log(method)
                    // console.log(this.targets)
                    this.targets.map(target => target[method](...args));
                    return this;
                }
            }
        }
        proto = Object.getPrototypeOf(proto);
    }

    return Clazz;
}


module.exports = {Composite};