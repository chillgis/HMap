import {ol} from '../../constants'

/**
 * @classdesc
 * Layer source for the OpenStreetMap tile server.
 * @constructor
 * @extends {ol.source.XYZ}
 * @param {olx.source.OSMOptions=} optOptions Open Street Map options.
 * @api
 */
ol.source.BAIDU = function (optOptions) {
  let options = optOptions || {}
  let attributions = ''
  if (options.attributions !== undefined) {
    attributions = options.attributions
  } else {
    attributions = [ol.source.BAIDU.ATTRIBUTION]
  }
  let crossOrigin = options.crossOrigin !== undefined ? options.crossOrigin : 'anonymous'
  let url = options.url !== undefined ? options.url : 'http://online{0-3}.map.bdimg.com/onlinelabel/?qt=tile&x={x}&y={y}&z={z}&styles=pl&udt=20170607&scaler=1&p=1'
  let tileLoadFunction = options.tileLoadFunction ? options.tileLoadFunction : undefined
  if (!tileLoadFunction) {
    tileLoadFunction = function (tileCoord) {
      let url = ''
      if (tileCoord && Array.isArray(tileCoord)) {
        let [z, x, y] = [tileCoord[0], tileCoord[1], tileCoord[2]]
        if (x < 0) {
          x = 'M' + (-x)
        }
        if (y < 0) {
          y = 'M' + (-y)
        }
        url = url.replace('{z}', (z).toString()).replace('{x}', y.toString()).replace('{y}', (x).toString())
      } else if (typeof tileCoord === 'object') {
        tileCoord = tileCoord.getTileCoord()
        let [z, x, y] = [tileCoord[0], tileCoord[1], tileCoord[2]]
        if (x < 0) {
          x = 'M' + (-x)
        }
        if (y < 0) {
          y = 'M' + (-y)
        }
        url = url.replace('{z}', (z).toString()).replace('{x}', y.toString()).replace('{y}', (x).toString())
      }
      console.log(url)
      return url
    }
  }
  ol.source.XYZ.call(this, {
    attributions: attributions,
    cacheSize: options.cacheSize,
    crossOrigin: crossOrigin,
    opaque: options.opaque !== undefined ? options.opaque : true,
    maxZoom: options.maxZoom !== undefined ? options.maxZoom : 19,
    reprojectionErrorThreshold: options.reprojectionErrorThreshold,
    tileLoadFunction: tileLoadFunction,
    url: url,
    wrapX: options.wrapX
  })
}
ol.inherits(ol.source.BAIDU, ol.source.XYZ)

/**
 * The attribution containing a link to the OpenStreetMap Copyright and License
 * page.
 * @const
 * @type {ol.Attribution}
 * @api
 */
ol.source.BAIDU.ATTRIBUTION = new ol.Attribution({
  html: '&copy; ' +
  '<a href="http://map.baidu.com/">百度地图</a> ' +
  'contributors.'
})
