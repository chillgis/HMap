import mix from '../utils/mixin'
import Layer from '../layer/Layer'
import Style from '../style/Style'
import { ol } from '../constants'
import * as utils from '../utils/utils'
class MeasureTool extends mix(Layer, Style) {
  constructor (mapInstence, params) {
    super()
    if (mapInstence && mapInstence['map'] instanceof ol.Map) {
      this.defaultParams = {
        measureLengthCursor: 'url(../asset/cur/ruler.cur), default',
        measureAreaCursor: 'url(../asset/cur/ruler.cur), default',
        endStyle: {
          fill: {
            fillColor: 'rgba(67, 110, 238, 0.4)'
          },
          stroke: {
            strokeColor: 'rgba(242,123,57,1)',
            strokeWidth: 2
          },
          circle: {
            circleRadius: 1,
            stroke: {
              strokeColor: 'rgba(255,0,0,1)',
              strokeWidth: 1
            },
            fill: {
              fillColor: 'rgba(255,255,255,1)'
            }
          }
        },
        drawStyle: {
          fill: {
            fillColor: 'rgba(67, 110, 238, 0.4)'
          },
          stroke: {
            strokeColor: 'rgba(242,123,57,1)',
            strokeWidth: 2
          }
        }
      }
      if (params && typeof params === 'object') {
        for (let key in params) {
          this.defaultParams[key] = params[key]
        }
      }
      /**
       * 地图实例
       */
      this.mapInstence = mapInstence
      /**
       * 地图对象
       * @type {ol.Map}
       */
      this.map = mapInstence['map']
      /**
       * 计算工具
       * @type {ol.Sphere}
       */
      this.wgs84Sphere = new ol.Sphere(6378137)
      /**
       * 测量类型（目前预制两种，测距和测面）
       * @type {{measureLength: string, measureArea: string}}
       */
      this.measureTypes = {
        measureLength: 'measureLength',
        measureArea: 'measureArea'
      }
      /**
       * 拖拽交互
       * @type {null}
       */
      this.dragPanInteraction = null

      /**
       * 双击交互
       * @type {null}
       */
      this.DoubleClickZoom = null
      /**
       * 是否使用地理测量方式
       * @type {boolean}
       */
      this.isGeodesic = (this.defaultParams['isGeodesic'] === false ? this.defaultParams['isGeodesic'] : true)
      /**
       * 测量工具所处图层
       * @type {*}
       */
      this.layerName = this.defaultParams['layerName'] || 'measureTool'

      /**
       * 默认鼠标样式
       */
      this.previousCursor_ = this.map.getTargetElement().style.cursor
    } else {
      throw new Error('传入的不是地图对象或者地图对象为空！')
    }
  }

  /**
   * 初始设置
   * @param params
   */
  setUp (params) {
    /**
     * 当前设置
     * @type {*}
     */
    this.options = params || {}
    /**
     * 恢复默认鼠标样式
     */
    this.map.getTargetElement().style.cursor = this.previousCursor_
    /**
     * 点击计数器
     * @type {number}
     */
    this.clickCount = ''
    /**
     * 测量结果
     * @type {null}
     */
    this.drawSketch = null
    /**
     * draw对象
     * @type {null}
     */
    if (this.draw) {
      this.map.removeInteraction(this.draw)
    }
    this.draw = null

    /**
     * 移动事件处理
     * @type {null}
     */
    if (this.beforeMeasurePointerMoveHandler) {
      ol.Observable.unByKey(this.beforeMeasurePointerMoveHandler)
    }
    this.beforeMeasurePointerMoveHandler = null
    /**
     * 处理机
     * @type {null}
     */
    if (this.listener) {
      ol.Observable.unByKey(this.listener)
    }
    this.listener = null
    /**
     * 当前所画要素
     * @type {null}
     */
    this.drawSketch = null
    /**
     * 画点事件处理
     * @type {null}
     */
    if (this.drawPointermove) {
      ol.Observable.unByKey(this.drawPointermove)
    }
    this.drawPointermove = null
    /**
     * 面积测量提示
     * @type {null}
     */
    this.measureAreaTooltip = null

    this.measureAreaTooltipElement = null

    this.removeDrawInteraion()

    /**
     * 测量提示信息
     * @type {string}
     */
    if (this.measureHelpTooltip) {
      this.map.removeOverlay(this.measureHelpTooltip)
    }
    this.measureHelpTooltip = ''
    if (this.options['measureType'] === this.measureTypes.measureLength) {
      this.measureLengthClick = this.map.on('click', eventP => {
        this.measureLengthSingleClick = this.map.on('singleclick', event => {
          if (!this.clickCount) {
            this.clickCount = utils.getuuid()
            this.drawSketch.length = '起点'
          }
          this.addMeasureOverLay(event.coordinate, this.drawSketch.length)
          this.addMeasurecircle(event.coordinate)
          ol.Observable.unByKey(this.measureLengthSingleClick)
        })
      })
      this.beforeMeasurePointerMoveHandler = this.map.on('pointermove', this.beforeDrawPointMoveHandler, this)
    } else if (this.options['measureType'] === this.measureTypes.measureArea) {
      this.beforeMeasurePointerMoveHandler = this.map.on('pointermove', this.beforeDrawPointMoveHandler, this)
    }
    this.addDrawInteraction()
    this.changeCur(this.options['measureType'])
  }

  /**
   * 销毁实例
   */
  destroy () {
    try {
      window.setTimeout(() => {
        this.getDragPanInteraction().setActive(true)
        this.getDoubleClickZoomInteraction().setActive(true)
      }, 300)
      this.map.getTargetElement().style.cursor = this.previousCursor_
      this.map.removeOverlay(this.measureHelpTooltip)
      this.measureHelpTooltip = null
      this.removeDrawInteraion()
      this.changeCur()
      this.listener = null
      this.drawSketch = null
      if (this.layer && this.layer instanceof ol.layer.Vector) {
        this.map.removeLayer(this.layer)
      }
      this.mapInstence.removeOverlayByLayerName(this.layerName)
    } catch (e) {
      console.log(e)
    }
  }

  /**
   * 添加画笔交互
   */
  addDrawInteraction () {
    let [ type ] = [ '' ]
    if (this.options['measureType'] === this.measureTypes.measureLength) {
      type = 'LineString'
    } else if (this.options['measureType'] === this.measureTypes.measureArea) {
      type = 'Polygon'
    }
    this.options['create'] = true
    this.layer = this.createVectorLayer(this.layerName, this.options)
    this.mapInstence.polygonLayers.add(this.layerName)
    this.mapInstence.orderLayerZindex()
    let endStyle = this.getStyleForMeasure(this.defaultParams['endStyle'])
    let drawStyle = this.getStyleForMeasure(this.defaultParams['drawStyle'])
    this.layer.setStyle(endStyle)
    this.draw = new ol.interaction.Draw({
      source: this.layer.getSource(),
      type: type,
      style: drawStyle
    })
    this.map.addInteraction(this.draw)
    this.drawListener()
    this.getDragPanInteraction().setActive(false)
    this.getDoubleClickZoomInteraction().setActive(false)
  }
  /**
   * 移除交互工具
   */
  removeDrawInteraion () {
    if (this.draw) {
      this.map.removeInteraction(this.draw)
      this.draw = null
    }
    if (this.listener) {
      ol.Observable.unByKey(this.listener)
      this.listener = null
    }
    if (this.drawPointermove) {
      ol.Observable.unByKey(this.drawPointermove)
      this.drawPointermove = null
    }
    if (this.measureLengthClick) {
      ol.Observable.unByKey(this.measureLengthClick)
      this.measureLengthClick = null
    }
    if (this.beforeMeasurePointerMoveHandler) {
      ol.Observable.unByKey(this.beforeMeasurePointerMoveHandler)
      this.beforeMeasurePointerMoveHandler = null
    }
    if (this.measureLengthSingleClick) {
      ol.Observable.unByKey(this.measureLengthSingleClick)
      this.measureLengthSingleClick = null
    }
    this.clickCount = ''
  }

  /**
   * 点击之前的提示信息
   * @param event
   */
  beforeDrawPointMoveHandler (event) {
    if (!this.measureHelpTooltip) {
      let helpTooltipElement = document.createElement('label')
      if (this.measureTypes.measureLength === this.options['measureType']) {
        helpTooltipElement.className = 'HMapLabel hamp-js-measure-length'
        helpTooltipElement.innerHTML = '<span class="HMap_diso"><span class="HMap_disi">单击开始测量</span></span>'
      } else {
        helpTooltipElement.className = 'HMapLabel HMap_disLabel hamp-js-measure-area'
        helpTooltipElement.innerHTML = '<span class="HMap_diso"><span class="HMap_disi">单击开始测面</span></span>'
      }
      this.measureHelpTooltip = new ol.Overlay({
        element: helpTooltipElement,
        offset: [15, -10],
        positioning: 'center-center'
      })
      this.measureHelpTooltip.set('layerName', this.layerName)
      this.map.addOverlay(this.measureHelpTooltip)
    }
    this.measureHelpTooltip.setPosition(event.coordinate)
  }

  /**
   * 改变当前鼠标形状
   * @param type
   */
  changeCur (type) {
    if (type === this.measureTypes.measureLength) {
      this.map.getTargetElement().style.cursor = this.defaultParams['measureLengthCursor']
    } else if (type === this.measureTypes.measureArea) {
      this.map.getTargetElement().style.cursor = this.defaultParams['measureAreaCursor']
    } else {
      this.map.getTargetElement().style.cursor = this.previousCursor_
    }
  }

  /**
   * 点击之后的事件处理
   * @param event
   */
  drawPointerMoveHandler (event) {
    if (this.measureTypes.measureLength === this.options['measureType']) {
      if (event.dragging) {
        return
      }
      let helpTooltipElement = this.measureHelpTooltip.getElement()
      helpTooltipElement.className = ' HMapLabel HMap_disLabel move-label'
      helpTooltipElement.innerHTML = '<span>总长:<span class="HMap_disBoxDis"></span></span><br><span style="color: #7a7a7a">单击确定地点,双击结束</span>'
      this.measureHelpTooltip.setPosition(event.coordinate)
    } else if (this.measureTypes.measureArea === this.options['measureType']) {
      if (event.dragging) {
        return
      }
      let helpTooltipElement = this.measureHelpTooltip.getElement()
      helpTooltipElement.className = ' HMapLabel HMap_disLabel move-label hamp-js-measure-area'
      helpTooltipElement.innerHTML = '<span class="HMap_diso"><span class="HMap_disi">单击确定地点,双击结束</span></span>'
      this.measureHelpTooltip.setPosition(event.coordinate)
    }
  }

  /**
   * 画笔事件处理机
   */
  drawListener () {
    this.draw.on('drawstart', event => {
      this.drawSketch = event.feature
      this.drawSketch.set('uuid', utils.getuuid())
      if (this.measureTypes.measureLength === this.options['measureType']) {
        ol.Observable.unByKey(this.beforeMeasurePointerMoveHandler)
        ol.Observable.unByKey(this.listener)
        this.beforeMeasurePointerMoveHandler = null
        this.listener = null
        this.listener = this.drawSketch.getGeometry().on('change', evt => {
          let geom = evt.target
          if (geom instanceof ol.geom.LineString) {
            let output = this.formatData(geom)
            this.drawSketch.length = output
            this.measureHelpTooltip.getElement().firstElementChild.firstElementChild.innerHTML = output
          }
        })
        this.drawPointermove = this.map.on('pointermove', this.drawPointerMoveHandler, this)
      } else if (this.measureTypes.measureArea === this.options['measureType']) {
        let uuid = utils.getuuid()
        this.createMeasureAreaTooltip()
        this.drawSketch.set('uuid', uuid)
        this.measureAreaTooltip.set('uuid', uuid)
        this.listener = this.drawSketch.getGeometry().on('change', evts => {
          let geom = evts.target
          let area = this.formatData(geom)
          if (this.measureAreaTooltip) {
            this.measureAreaTooltipElement.innerHTML = '面积' + area
            this.measureAreaTooltip.setPosition(geom.getInteriorPoint().getCoordinates())
          }
        })
        this.drawPointermove = this.map.on('pointermove', this.drawPointerMoveHandler, this)
      }
    })
    this.draw.on('drawend', ev => {
      window.setTimeout(() => {
        this.getDragPanInteraction().setActive(true)
        this.getDoubleClickZoomInteraction().setActive(true)
      }, 300)
      this.map.getTargetElement().style.cursor = 'default'
      this.map.removeOverlay(this.measureHelpTooltip)
      this.measureHelpTooltip = null
      if (this.measureTypes.measureLength === this.options['measureType']) {
        this.addMeasureOverLay(ev.feature.getGeometry().getLastCoordinate(), this.drawSketch.length, '止点')
        this.addMeasurecircle(ev.feature.getGeometry().getLastCoordinate())
      } else if (this.options['measureType'] === this.measureTypes.measureArea) {
        this.addMeasureRemoveButton(ev.feature.getGeometry().getCoordinates()[0][0])
      }
      this.removeDrawInteraion()
      this.changeCur()
      this.listener = null
      this.drawSketch = null
    })
  }

  /**
   * 测量结果格式化
   * @param geom
   * @returns {*}
   */
  formatData (geom) {
    let output = 0
    if (geom) {
      if (this.options['measureType'] === this.measureTypes.measureLength) {
        if (this.isGeodesic) {
          let [coordinates, length] = [geom.getCoordinates(), 0]
          let sourceProj = this.map.getView().getProjection()
          for (let i = 0, ii = coordinates.length - 1; i < ii; ++i) {
            let c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326')
            let c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326')
            length += this.wgs84Sphere.haversineDistance(c1, c2)
          }
          if (length > 100) {
            output = (Math.round(length / 1000 * 100) / 100) + ' ' + '公里'
          } else {
            output = (Math.round(length * 100) / 100) + ' ' + '米'
          }
        } else {
          output = Math.round(geom.getLength() * 100) / 100
        }
      } else if (this.options['measureType'] === this.measureTypes.measureArea) {
        if (this.isGeodesic) {
          let sourceProj = this.getMap().getView().getProjection()
          let geometry = /** @type {ol.geom.Polygon} */(geom.clone().transform(
            sourceProj, 'EPSG:4326'))
          let coordinates = geometry.getLinearRing(0).getCoordinates()
          let area = Math.abs(this.wgs84Sphere.geodesicArea(coordinates))
          if (area > 10000000000) {
            output = (Math.round(area / (1000 * 1000 * 10000) * 100) / 100) + ' ' + '万平方公里'
          } else if (area > 1000000 && area < 10000000000) {
            output = (Math.round(area / (1000 * 1000) * 100) / 100) + ' ' + '平方公里'
          } else {
            output = (Math.round(area * 100) / 100) + ' ' + '平方米'
          }
        } else {
          output = geom.getArea()
        }
      }
    }
    return output
  }

  /**
   * 添加点击测量时的圆圈
   * @param coordinate
   */
  addMeasurecircle (coordinate) {
    let feature = new ol.Feature({
      uuid: this.drawSketch.get('uuid'),
      geometry: new ol.geom.Point(coordinate)
    })
    this.layer.getSource().addFeature(feature)
  }

  /**
   * 添加测量结果Overlay
   * @param coordinate
   * @param length
   * @param type
   */
  addMeasureOverLay (coordinate, length, type) {
    let helpTooltipElement = document.createElement('label')
    if (type === '止点') {
      helpTooltipElement.className = 'hmap-measure-overLay HMap_disLabel'
      helpTooltipElement.innerHTML = "总长<span class='HMap_disBoxDis'>" + length + '</span>'
      this.addMeasureRemoveButton(coordinate)
    } else {
      helpTooltipElement.className = 'hmap-measure-overLay HMapLabel'
      helpTooltipElement.innerHTML = "<span class='HMap_diso'><span class='HMap_disi'>" + length + '</span></span>'
    }
    let tempMeasureTooltip = new ol.Overlay({
      element: helpTooltipElement,
      offset: [10, -10],
      positioning: 'center-center'
    })
    tempMeasureTooltip.set('layerName', this.layerName)
    this.map.addOverlay(tempMeasureTooltip)
    tempMeasureTooltip.setPosition(coordinate)
    tempMeasureTooltip.set('uuid', this.drawSketch.get('uuid'))
  }

  /**
   * 添加移除按钮
   * @param coordinate
   */
  addMeasureRemoveButton (coordinate) {
    let pos = [coordinate[0] - 5 * this.map.getView().getResolution(), coordinate[1]]
    let btnImg = document.createElement('img')
    btnImg.src = (this.defaultParams['removeButtonSrc'] ? this.defaultParams['removeButtonSrc'] : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NEYzMzc1RDY3RDU1MTFFNUFDNDJFNjQ4NUUwMzRDRDYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NEYzMzc1RDc3RDU1MTFFNUFDNDJFNjQ4NUUwMzRDRDYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0RjMzNzVENDdENTUxMUU1QUM0MkU2NDg1RTAzNENENiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0RjMzNzVENTdENTUxMUU1QUM0MkU2NDg1RTAzNENENiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PsDx84AAAAC3SURBVHjavJIxDoMwDEV/ok5wDCbu0DvAdUBIwMLFSs/AxDXY6tZ2SCGVUikd+ifn20+2k5hHVd0AXJGmGQw+UyWMxY8KQGpbUNcB23aYHIsnuSgIy8dlAQ2DgwWSmD0YE5ReAq5pQOMIrKsDRByjKGC/dsxz2L7XQgU8JB7n4qDoY6SYF4J+p72T7/zeOXqr03SMx8XnsTUX7UgElKVCyDK3s8Tsae6sv/8ceceZ6jr1k99fAgwAsZy0Sa2HgDcAAAAASUVORK5CYII=')
    btnImg.style.cursor = 'pointer'
    btnImg.title = '清除测量结果'
    btnImg.groupId = this.drawSketch.get('uuid')
    btnImg.pos = coordinate
    btnImg.onclick = evt => {
      this.RemoveMeasure(btnImg.groupId, coordinate)
    }
    let closeBtn = new ol.Overlay({
      element: btnImg,
      offset: [0, 10],
      positioning: 'center-bottom'
    })
    closeBtn.set('layerName', this.layerName)
    this.map.addOverlay(closeBtn)
    this.map.render()
    closeBtn.setPosition(pos)
    closeBtn.set('uuid', this.drawSketch.get('uuid'))
  }

  /**
   * 面积测量结果
   */
  createMeasureAreaTooltip () {
    this.measureAreaTooltipElement = document.createElement('div')
    this.measureAreaTooltipElement.style.marginLeft = '-6.25em'
    this.measureAreaTooltipElement.className = 'measureTooltip hidden'
    this.measureAreaTooltip = new ol.Overlay({
      element: this.measureAreaTooltipElement,
      offset: [15, 0],
      positioning: 'center-left'
    })
    this.measureAreaTooltip.set('layerName', this.layerName)
    this.map.addOverlay(this.measureAreaTooltip)
  }

  /**
   * 移除测量结果
   * @param groupId
   * @param pos
   * @constructor
   */
  RemoveMeasure (groupId, pos) {
    let overlays = this.getMap().getOverlays().getArray()
    if (overlays && Array.isArray(overlays)) {
      let length = overlays.length
      // TODO 注意地图移除Overlay时数组长度会变化
      for (let j = 0, i = 0; j < length; j++) {
        i++
        if (overlays[length - i] && overlays[length - i] instanceof ol.Overlay && overlays[length - i].get('uuid') === groupId) {
          this.map.removeOverlay(overlays[length - i])
        }
      }
    }
    if (this.layer && this.layer.getSource()) {
      let source = this.layer.getSource()
      let features = source.getFeatures()
      features.forEach(function (feat) {
        let lastCoord = feat.getGeometry().getLastCoordinate()
        if ((lastCoord[0] === pos[0] && lastCoord[1] === pos[1]) || feat.get('uuid') === groupId) {
          source.removeFeature(feat)
        }
      }, this)
    }
  }

  /**
   * 获取地图拖拽漫游交互
   * @returns {ol.interaction.DragPan|*|null}
   */
  getDragPanInteraction () {
    if (!this.dragPanInteraction) {
      let items = this.getMap().getInteractions().getArray()
      items.every(item => {
        if (item && item instanceof ol.interaction.DragPan) {
          this.dragPanInteraction = item
          return false
        } else {
          return true
        }
      })
    }
    return this.dragPanInteraction
  }

  /**
   * 获取双击放大交互
   * @returns {ol.interaction.DoubleClickZoom|*|null}
   */
  getDoubleClickZoomInteraction () {
    if (!this.DoubleClickZoom) {
      let items = this.getMap().getInteractions().getArray()
      items.every(item => {
        if (item && item instanceof ol.interaction.DoubleClickZoom) {
          this.DoubleClickZoom = item
          return false
        } else {
          return true
        }
      })
    }
    return this.DoubleClickZoom
  }

  /**
   * 返回当前地图对象
   * @returns {ol.Map}
   */
  getMap () {
    return this.map
  }
}
export default MeasureTool
