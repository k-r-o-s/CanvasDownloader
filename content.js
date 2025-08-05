// saveWithToBlob 和 saveWithGetImageData 两种方法都会因为被跨域污染的 Canvas 而失效

// function saveWithToBlob(canvas, filename) {
//   // 检查 Canvas 实例上的 toBlob 方法
//   const toBlobMethod = canvas.toBlob || HTMLCanvasElement.prototype.toBlob;

//   if (typeof toBlobMethod != 'function') {
//     saveWithGetImageData(canvas, filename);
//     return;
//   }
//   toBlobMethod.call(canvas, (blob) => {
//     if (blob) {
//       // 将 Blob 发送给 background.js 进行下载

//       browser.runtime.sendMessage({
//         action: "downloadBlob",
//         blob: blob,
//         filename: filename
//       });
//     } else {
//       console.error('无法生成 Blob 对象');
//     }
//   }, 'image/png');
// }
// function saveWithGetImageData(canvas, filename) {
//   try {
//     const ctx = canvas.getContext('2d');
//     if (!ctx) {
//       alert('无法获取 Canvas context');
//       return;
//     }

//     // 获取 Canvas 的像素数据
//     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//     const pixels = imageData.data.buffer;
//     const width = imageData.width;
//     const height = imageData.height;

//     // 使用 UPNG.js 将像素数据编码为 PNG
//     const pngArrayBuffer = UPNG.encode([pixels], width, height, 0);

//     // 将 ArrayBuffer 转换为 Blob
//     const blob = new Blob([pngArrayBuffer], { type: 'image/png' });

//     // 将 Blob 发送给 background.js 进行下载
//     browser.runtime.sendMessage({
//       action: "downloadBlob",
//       blob: blob,
//       filename: filename
//     });
//   } catch (e) {
//     console.error('手动编码 PNG 失败:', e);
//     alert('无法保存 Canvas，请检查控制台。');
//   }
// }

// 使用截屏的方式获取 Canvas 图像
// 这里需要获取 Canvas 的位置信息, 由 Background 线程截图, 然后根据此位置信息再裁剪
function saveWithScreenshot(canvas) {
  const rect = canvas.getBoundingClientRect();

  // 确保 Canvas 在视口中至少有部分可见
  if (rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth
    && rect.top < window.innerHeight) {

    const devicePixelRatio = window.devicePixelRatio || 1;

    // 计算 Canvas 在视口中的可见部分
    const visibleRect = {
      x: Math.max(0, rect.left),
      y: Math.max(0, rect.top),
      width: Math.min(rect.width, window.innerWidth - rect.left, rect.right),
      height: Math.min(rect.height, window.innerHeight - rect.top, rect.bottom)
    };

    // 将 CSS 像素转换为物理像素
    const visibleRectPhysical = {
      x: visibleRect.x * devicePixelRatio,
      y: visibleRect.y * devicePixelRatio,
      width: visibleRect.width * devicePixelRatio,
      height: visibleRect.height * devicePixelRatio,
    };

    // 将可见部分发送给 background.js
    browser.runtime.sendMessage({
      action: CONTENT_COMMAND.SAVE_CANVAS,
      canvasRect: visibleRectPhysical,
    });
  } else {
    alert('Canvas 不在可见区域内。');
  }
}

(function () {
  let lastMouseX = 0;
  let lastMouseY = 0;

  // 监听鼠标移动事件，实时更新鼠标位置
  document.addEventListener('mousemove', (event) => {
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  });

  // 监听来自 background.js 的消息
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action == BACKGROUND_COMMAND.GET_CANVAS) {
      // 获取 Canvas
      const canvas = ((type) => {
        let canvas;
        // 从鼠标所在位置获取
        if (type == CANVAS_GETTING_TYPE.CURSOR) {
          return document.elementFromPoint(lastMouseX, lastMouseY);
        }
        // 从全页面搜索, 找一个距离视区中心点最近的
        const canvases = document.querySelectorAll('canvas');
        if (canvases.length === 0) {
          alert('页面未找到 Canvas 元素！');
          return;
        }
        if (canvases.length === 1) {
          return canvases[0];
        }
        let minDistance = Infinity;
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;

        canvases.forEach(curCanvas => {
          const rect = curCanvas.getBoundingClientRect();
          if (rect.right <= 0 || rect.bottom <= 0
            || rect.left >= window.innerWidth || rect.top >= window.innerHeight) {
            return;
          }
          const canvasCenterX = rect.left + rect.width / 2;
          const canvasCenterY = rect.top + rect.height / 2;
          const distance = Math.sqrt(
            Math.pow(canvasCenterX - viewportCenterX, 2) +
            Math.pow(canvasCenterY - viewportCenterY, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            canvas = curCanvas;
          }
        });
        return canvas;
      })(request.type);

      if (!canvas) { return; }
      saveWithScreenshot(canvas);
    }
  });
}())
