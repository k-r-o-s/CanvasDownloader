// background -> content messages
const BACKGROUND_COMMAND = {
  GET_CANVAS: 'get-canvas',
}

const CANVAS_GETTING_TYPE = {
  CURSOR: 'cursor',
  AUTO: 'auto'
}

// content -> background messages
const CONTENT_COMMAND = {
  SAVE_CANVAS: 'save-canvas',
}

const CONFIG = {
  image_name: 'canvas_image',
  /** @type {"jpeg" | "png"} */
  image_ext: 'png',
}