const HMap = {}
HMap.version = require('../package.json').version
import {ol, proj4} from './constants'
import './scss/index'
import Map from './map/Map'
import Observable from './event/Observable'
import Layer from './layer/Layer'
import Feature from './feature/feature'
import CoordsTransform from './plugins/CoordsTransform'
import LayerSwitcher from './plugins/LayerSwitcher'
import MeasureTool from './plugins/MeasureTool'
import LayerSpyglass from './interaction/LayerSpyglass'
import MisplacesGlass from './interaction/MisplacesGlass'
import GeomCoder from './plugins/GeomCoder'
import PlotDraw from './plot/Event/PlotDraw'
import PlotEdit from './plot/Event/PlotEdit'
import CustomCircle from './plugins/CustomCircle'
import Popover from './overlay/Popover'
import Controls from './controls/index'
import * as utils from './utils/utils'

HMap.ol = ol
window.ol = ol
HMap.proj4 = proj4
window.proj4 = proj4
HMap.Map = Map
HMap.Observable = Observable
HMap.Utils = utils
HMap.PlotDraw = PlotDraw
HMap.PlotEdit = PlotEdit
HMap.Layer = Layer
HMap.Feature = Feature
HMap.Popover = Popover
HMap.CoordsTransform = CoordsTransform
HMap.CustomCircle = CustomCircle
HMap.LayerSwitcher = LayerSwitcher
HMap.MeasureTool = MeasureTool
HMap.LayerSpyglass = LayerSpyglass
HMap.MisplacesGlass = MisplacesGlass
HMap.GeomCoder = GeomCoder
HMap.Controls = Controls

/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 *
 *     function ParentClass(a, b) { }
 *     ParentClass.prototype.foo = function(a) { }
 *
 *     function ChildClass(a, b, c) {
 *       // Call parent constructor
 *       ParentClass.call(this, a, b);
 *     }
 *     HMap.inherits(ChildClass, ParentClass);
 *
 *     var child = new ChildClass('a', 'b', 'see');
 *     child.foo(); // This works.
 *
 * @param {!Function} childCtor Child constructor.
 * @param {!Function} parentCtor Parent constructor.
 * @function
 * @api
 */
HMap.inherits = function (childCtor, parentCtor) {
  childCtor.prototype = Object.create(parentCtor.prototype)
  childCtor.prototype.constructor = childCtor
}

/**
 * A reusable function, used e.g. as a default for callbacks.
 *
 * @return {undefined} Nothing.
 */
HMap.nullFunction = function () {
}

export default HMap
