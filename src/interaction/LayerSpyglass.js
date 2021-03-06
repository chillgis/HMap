import { ol } from '../constants'

class LayerSpyglass {
  constructor (params) {
    this.options = params || {}
    /**
     * 当前地图对象
     */
    if (this.options.map && this.options.map instanceof ol.Map) {
      this.map = this.options.map
    } else {
      throw new Error('缺少地图对象！')
    }
    /**
     * 当前地图容器
     */
    this.container = this.map.getTargetElement()
    /**
     * 当前滤镜图层
     */
    this.imagery = this.options['imagery']
    /**
     * 当前鼠标位置
     * @type {null}
     */
    this.mousePosition = null
    /**
     * 当前滤镜半径
     * @type {number}
     */
    this.radius = 0

    this.activate()
  }

  /**
   * 激活工具
   */
  activate () {
    this.container.addEventListener('mousemove', event => {
      this.mousePosition = this.map.getEventPixel(event)
      this.map.render()
    })

    this.container.addEventListener('mouseout', () => {
      this.map.render()
    })

    document.addEventListener('keydown', evt => {
      if (evt.which === 38) {
        this.radius = Math.min(this.radius + 5, 150)
        this.map.render()
        evt.preventDefault()
      } else if (evt.which === 40) {
        this.radius = Math.max(this.radius - 5, 25)
        this.map.render()
        evt.preventDefault()
      }
    })

    this.renderTool()
  }

  /**
   * 渲染工具
   */
  renderTool () {
    // 在渲染之前处理渲染图层
    this.imagery.on('precompose', event => {
      let [ctx, pixelRatio] = [event.context, event.frameState.pixelRatio]
      ctx.save()
      ctx.beginPath()
      if (this.mousePosition) {
        ctx.arc(this.mousePosition[0] * pixelRatio, this.mousePosition[1] * pixelRatio,
          this.radius * pixelRatio, 0, 2 * Math.PI)
        ctx.lineWidth = 5 * pixelRatio
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'
        ctx.stroke()
      }
      ctx.clip()
    })

    this.imagery.on('postcompose', event => {
      let ctx = event.context
      ctx.restore()
    })
  }

  /**
   * 销毁事件
   */
  destroy () {
    console.log('destroying')
  }

  /**
   * 设置当前地图对象
   * @param map
   */
  setMap (map) {
    if (map && map instanceof ol.Map) {
      this.map = map
    }
  }

  /**
   * 返回当前地图对象
   * @returns {ol.Map}
   */
  getMap () {
    return this.map
  }
}

export default LayerSpyglass
