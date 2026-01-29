declare module 'mapbox-gl/dist/mapbox-gl-csp-worker' {
  const workerClass: new () => Worker
  export default workerClass
}
