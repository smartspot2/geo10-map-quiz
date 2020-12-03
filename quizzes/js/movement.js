class Movement {
  /**
   * Whether the mouse is pressed on the bound objects
   * @type {boolean}
   */
  mousedown = false;
  /**
   * Whether the user is dragging or clicking
   * @type {boolean}
   */
  dragging = false;
  /**
   * Start coordinate of mouse press
   * @type {{x: number, y: number}}
   */
  start = {};

  /**
   * Create a new movement object bound to a group of elements
   * @param {Element} boundObjects - bound objects
   */
  constructor(...boundObjects) {
    this.boundObjects = boundObjects;

    for (let obj of this.boundObjects) {
      obj.addEventListener('mousedown', this.handleMouseDown);
      obj.addEventListener('mouseup', this.handleMouseUp);
      obj.addEventListener('mousemove', this.handleMouseMove);
    }
  }

  setOnClick = (listener) => {
    this.onClick = listener;
  }

  setOnDrag = (listener) => {
    this.onDrag = listener;
  }

  setOnMouseDown = (listener) => {
    this.onMouseDown = listener;
  }

  setOnMouseUp = (listener) => {
    this.onMouseUp = listener;
  }


  onClick = () => {
  }

  onDrag = () => {
  }

  onMouseDown = () => {
  }

  onMouseUp = () => {
  }

  /**
   * Unbind listeners from items
   */
  removeListeners = () => {
    for (let obj of this.boundObjects) {
      obj.removeEventListener('mousedown', this.handleMouseDown);
      obj.removeEventListener('mouseup', this.handleMouseUp);
      obj.removeEventListener('mousemove', this.handleMouseMove);
    }
  }

  /**
   * Event listener for mousedown events
   * @param {MouseEvent} e - event object
   */
  handleMouseDown = (e) => {
    this.onMouseDown(e);
    this.mousedown = true;
    this.dragging = false;
    this.start = {x: e.pageX, y: e.pageY};
  }

  /**
   * Event listener for mouseup events
   * @param {MouseEvent} e - event object
   */
  handleMouseUp = (e) => {
    // If never started the click here, then there is no click
    if (this.mousedown && !this.dragging) {
      this.onClick(e);
    }
    if (this.mousedown) {
      this.onMouseUp(e);  // Only trigger mouseup if there was a mousedown
    }
    this.mousedown = false;
    this.dragging = false;
    this.start = {};
  }

  /**
   * Event listener for mousemove events
   * @param {MouseEvent} e - event object
   */
  handleMouseMove = (e) => {
    if (this.mousedown && !Movement.global_mousedown) {
      this.mousedown = false;
    } else if (this.mousedown) {
      this.onDrag(e);  // always call drag function
      if (Math.hypot(this.start.x - e.pageX,
          this.start.y - e.pageY) >= Movement.THRESHOLD) {
        this.dragging = true;  // not a click if we get far enough away
      }
    }
  }
}

// no static support in Safari
/**
 * Minimum euclidean distance before a click is no longer registered
 * @type {number}
 */
Movement.THRESHOLD = 20;
/**
 * Whether the mouse is pressed globally
 * @type {boolean}
 */
Movement.global_mousedown = false;

Movement.globalHandleMouseUp = () => {
  Movement.global_mousedown = false;
}

Movement.globalHandleMouseDown = () => {
  Movement.global_mousedown = true;
}


// Constants for transformSvg
let MIN_ABS_ZOOM = 150;
let MAX_ABS_ZOOM = 1000;

/**
 * Translates and scales map SVG based on mouse movements and scroll.
 * All coordinate values should be relative to the document coordinate system,
 * not the internal svg coordinate system.
 *
 * @param mouseX - x coordinate of mouse (relative to svg bounds)
 * @param mouseY - y coordinate of mouse (relative to svg bounds)
 * @param moveX - dx of mouse motion
 * @param moveY - dy of mouse motion
 * @param scrollAmt - scroll wheel direction
 */
function transformSvg(mouseX, mouseY, moveX, moveY, scrollAmt) {
  window.SCROLL_FACTOR = 0.2;

  let mapDiv = document.getElementsByClassName('map-div').item(0);
  let mapSvg = document.getElementsByClassName('map-svg').item(0);
  let baseMap = document.getElementsByClassName('base-map').item(0);

  let divWidth = mapDiv.clientWidth;  // container div for the svg
  let divHeight = mapDiv.clientHeight;
  let svgWidth = mapSvg.clientWidth;
  let svgHeight = mapSvg.clientHeight;

  // get viewBox from svg, convert to floats
  let viewBox = mapSvg.getAttribute('viewBox');
  let [viewX, viewY, viewW, viewH] = viewBox.split(' ').map(x => parseFloat(x));

  let baseMapBB = baseMap.getBoundingClientRect();  // container svg for the map
  let baseMapWidth = baseMapBB.width;  // background map image
  let baseMapHeight = baseMapBB.height;

  let baseMapSvgWidth = parseFloat(baseMap.getAttribute('width'));
  let baseMapSvgHeight = parseFloat(baseMap.getAttribute('height'));

  MAX_ABS_ZOOM = Math.max(MAX_ABS_ZOOM, baseMapSvgHeight);
  // console.log(baseMapWidth, baseMapHeight);

  // mouseX, Y are in document coordinates; no need to convert
  let scroll_dw = svgWidth * Math.sign(scrollAmt) * SCROLL_FACTOR;
  let scroll_dh = svgHeight * Math.sign(scrollAmt) * SCROLL_FACTOR;

  // Conversion from viewBox coordinates to document coordinates
  let viewToSvgW = Math.abs(svgWidth / viewW);
  let viewToSvgH = Math.abs(svgHeight / viewH);
  let minViewToSvg = Math.min(viewToSvgW, viewToSvgH);
  viewToSvgW = minViewToSvg;
  viewToSvgH = minViewToSvg;

  // Don't scale if already at full size
  if ((baseMapSvgHeight > viewH && baseMapSvgWidth > viewW) || Math.sign(scrollAmt) < 0) {
    // TODO: change to absolute zoom in *document coordinates*; this will need
    //  some math to determine the scaling clamp *with* the mousewheel scale
    // TODO: very likely needing a full rewrite; pretty it up a little too
    //   perhaps also just use getCTM(); it's still supported in every browser
    // console.log('scaleW', viewW, '->', viewW + scroll_dw, MIN_ABS_ZOOM, MAX_ABS_ZOOM);
    // console.log('scaleH', viewH, '->', viewH + scroll_dh, MIN_ABS_ZOOM, MAX_ABS_ZOOM);
    // let newViewW = clamp(viewW + scroll_dw, MIN_ZOOM * baseMapSvgWidth, MAX_ZOOM * baseMapSvgWidth);
    // let newViewH = clamp(viewH + scroll_dh, MIN_ZOOM * baseMapSvgHeight, MAX_ZOOM * baseMapSvgHeight);
    let newViewW = clamp(viewW + scroll_dw, MIN_ABS_ZOOM, MAX_ABS_ZOOM);
    let newViewH = clamp(viewH + scroll_dh, MIN_ABS_ZOOM, MAX_ABS_ZOOM);
    if (newViewW === viewW || newViewH === viewH) {
      // console.log('set to 0')
      scroll_dw = scroll_dh = 0;  // if no change, cancel scroll
    } else {
      viewW = newViewW;  // update view width/height
      viewH = newViewH;
      mapSvg.setAttribute('viewBox', `${viewX} ${viewY} ${viewW} ${viewH}`);
      baseMapBB = baseMap.getBoundingClientRect();  // container svg for the map
      baseMapWidth = baseMapBB.width;  // background map image
      baseMapHeight = baseMapBB.height;
    }
  } else {  // cancel scrolling if no scaling
    scroll_dw = scroll_dh = 0;
  }
  // console.log(baseMapWidth, baseMapHeight);

  // if we need to adjust min/max offsets, then there is no scaling
  // Boundary of panning
  let minOffsetX = 0
  // let maxOffsetX = baseMapWidth - divWidth;
  let maxOffsetX = baseMapSvgWidth - viewW;
  if (minOffsetX > maxOffsetX) {  // make sure min <= max
    minOffsetX = maxOffsetX = 0;
  }
  let minOffsetY = 0;
  // let maxOffsetY = baseMapHeight - divHeight;
  let maxOffsetY = baseMapSvgHeight - viewH;
  if (minOffsetY > maxOffsetY) {  // make sure min <= max
    minOffsetY = maxOffsetY = 0;
  }
  // console.log(minOffsetX, maxOffsetX, minOffsetY, maxOffsetY)

  // Conversion from viewBox coordinates to document coordinates
  viewToSvgW = Math.abs(svgWidth / viewW);
  viewToSvgH = Math.abs(svgHeight / viewH);
  minViewToSvg = Math.min(viewToSvgW, viewToSvgH);
  viewToSvgW = minViewToSvg;
  viewToSvgH = minViewToSvg;

  // viewToSvgW = Math.abs(svgWidth / viewW);
  // viewToSvgH = Math.abs(svgHeight / viewH);
  // minViewToSvg = Math.min(viewToSvgW, viewToSvgH);
  // viewToSvgW = viewToSvgH = minViewToSvg;

  // position of mouse in relation to the svg width/height
  let scrollFracX = mouseX / svgWidth;
  let scrollFracY = mouseY / svgHeight;

  // console.log(viewX - moveX / viewToSvgW - scroll_dw * scrollFracX,
  //     '->', clamp(  // (original converted) - (drag) - (zoom scaled)
  //         viewX - moveX / viewToSvgW - scroll_dw * scrollFracX,
  //         minOffsetX, maxOffsetX  // limit to image bounds
  //     ), '|',
  //     (viewY * viewToSvgH - moveY - scroll_dh * scrollFracY * viewToSvgH) / viewToSvgH,
  //     '->', clamp(
  //         (viewY * viewToSvgH - moveY - scroll_dh * scrollFracY * viewToSvgH) / viewToSvgH,
  //         minOffsetY, maxOffsetY
  //     )
  // );

  viewX = clamp(  // (original converted) - (drag) - (zoom scaled)
      (viewX * viewToSvgW - moveX - scroll_dw * scrollFracX * viewToSvgW) / viewToSvgW,
      minOffsetX, maxOffsetX  // limit to image bounds
  );  // convert back to svg coordinates
  viewY = clamp(
      (viewY * viewToSvgH - moveY - scroll_dh * scrollFracY * viewToSvgH) / viewToSvgH,
      minOffsetY, maxOffsetY
  );

  // Set new viewBox values
  mapSvg.setAttribute('viewBox', `${viewX} ${viewY} ${viewW} ${viewH}`);
}

// TODO: add reset zoom button, HTML/CSS zoom buttons

window.addEventListener('load', () => {
  transformSvg(10, 10, 1, 1, 1);
  let mapDiv = document.getElementsByClassName('map-div').item(0)
  let mapMovement = new Movement(mapDiv);

  mapMovement.setOnDrag((e) => {
    transformSvg(e.offsetX, e.offsetY, e.movementX, e.movementY, 0);
  });

  mapDiv.addEventListener('mousewheel', (e) => {
    e.preventDefault();
    transformSvg(e.offsetX, e.offsetY, 0, 0, e.deltaY);
  });

})

// Add global Movement event listeners
document.addEventListener('mousedown', Movement.globalHandleMouseDown);
document.addEventListener('mouseup', Movement.globalHandleMouseUp);

/**
 * Restrict input `x` to take values from `min` to `max` inclusive;
 * returns `min` or `max` if `x` exceeds these bounds.
 * @param {number} x - value to clamp
 * @param {number} min - minimum value `x` can be
 * @param {number} max - maximum value `x` can be
 * @returns {number} the clamped value
 */
function clamp(x, min, max) {
  return (x < min) ? min : (x > max) ? max : x;
}
