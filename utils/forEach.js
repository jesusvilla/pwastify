const forEach = (obj, fn) => {
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
        fn(obj[i], i, i)
        }
    } else if (obj && typeof obj === 'object') {
        const arrProps = Object.keys(obj)
        for (let i = 0; i < arrProps.length; i++) {
        const prop = arrProps[i]
        fn(obj[prop], prop, i)
        }
    }
}
module.exports = forEach